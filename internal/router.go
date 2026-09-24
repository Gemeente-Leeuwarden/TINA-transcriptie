package internal

import (
	"platform/internal/config"
	"platform/internal/handler"
	"platform/internal/service"
	"platform/pkg/rabbitmq"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/minio/minio-go/v7"
)

type Router struct {
	authService    *service.AuthService
	userService    *service.UserService
	sessionService *service.SessionService
	promptService  *service.PromptService
	purposeService *service.PurposeService

	minioClient *minio.Client
	rmq         *rabbitmq.Client
	node        *centrifuge.Node

	config *config.Config

	allowedOrigins []string
	allowedHeaders []string
	allowedMethods []string
}

func NewRouter(
	config *config.Config,
	promptService *service.PromptService,
	purposeService *service.PurposeService,
	sessionService *service.SessionService,
	authService *service.AuthService,
	userService *service.UserService,
	minioClient *minio.Client,
	rmq *rabbitmq.Client,
	node *centrifuge.Node,
) *Router {
	return &Router{
		authService:    authService,
		userService:    userService,
		sessionService: sessionService,
		promptService:  promptService,
		purposeService: purposeService,

		minioClient: minioClient,
		rmq:         rmq,
		node:        node,

		config:         config,
		allowedOrigins: []string{"https://mtml.nl", "https://www.mtml.nl", "http://localhost:5173", "http://127.0.0.1:5173"},
		allowedHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		allowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	}
}

func (router *Router) ConfigureCors(app *fiber.App) {
	app.Use(cors.New(cors.Config{
		AllowOrigins: router.AllowedOrigins(),
		AllowHeaders: router.AllowedHeaders(),
		AllowMethods: router.AllowedMethods(),
	}))
}

func (router *Router) userRoutes(userRouter fiber.Router) {
	userRouter.Get("/online", router.authService.JWTMiddleware(), handler.UsersOnline(router.authService, router.node))
}
func (router *Router) adminRoutes(adminRouter fiber.Router) {
	adminRouter.Get("/rabbitmq/queues", router.authService.JWTMiddleware(), handler.AdminRabbitMQQueues(router.authService, router.config.RabbitMQ))
	adminRouter.Post("/rabbitmq/queues/:name/messages", router.authService.JWTMiddleware(), handler.AdminRabbitMQQueueMessages(router.authService, router.config.RabbitMQ))
	adminRouter.Post("/notify", router.authService.JWTMiddleware(), handler.AdminSendMessage(router.authService, router.userService, router.node))

	// User admin routes
	adminRouter.Get("/users", router.authService.JWTMiddleware(), handler.UsersList(router.authService, router.userService))
	adminRouter.Put("/users/:id/role", router.authService.JWTMiddleware(), handler.UsersUpdateRole(router.authService, router.userService))

	// Purpose admin routes
	adminRouter.Get("/purposes", router.authService.JWTMiddleware(), handler.AdminPurposesList(router.authService, router.purposeService))
	adminRouter.Post("/purposes", router.authService.JWTMiddleware(), handler.AdminPurposesCreate(router.authService, router.purposeService, router.promptService))
	adminRouter.Put("/purposes/:id", router.authService.JWTMiddleware(), handler.AdminPurposesUpdate(router.authService, router.purposeService, router.promptService))
	adminRouter.Delete("/purposes/:id", router.authService.JWTMiddleware(), handler.AdminPurposesDelete(router.authService, router.purposeService, router.sessionService))

	// Session admin routes
	auth := router.authService.JWTMiddleware()
	adminRouter.Post("/sessions/:id/retranscribe-segments", auth, handler.AdminRetranscribeSegments(router.authService, router.sessionService, router.config.Minio.Bucket, router.rmq))
	adminRouter.Post("/sessions/:id/retranscribe-session", auth, handler.AdminRetranscribeSession(router.authService, router.sessionService, router.config.Minio.Bucket, router.rmq))
	adminRouter.Delete("/sessions/:id/segments", auth, handler.AdminRemoveSegments(router.authService, router.sessionService))
	adminRouter.Delete("/sessions/:id/transcription", auth, handler.AdminRemoveTranscription(router.authService, router.sessionService))
}
func (router *Router) authRoutes(authRouter fiber.Router) {
	auth := router.authService.JWTMiddleware()

	authRouter.Get("/methods", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"local":        router.config.FeatureFlags.LocalAuthEnabled,
			"azure":        router.config.FeatureFlags.AzureAuthEnabled,
			"registration": router.config.FeatureFlags.RegistrationEnabled,
		})
	})

	authRouter.Get("/me", auth, handler.Profile(router.authService, router.userService))
	authRouter.Get("/refresh", auth, handler.RefreshToken(router.authService, router.userService))

	if router.config.FeatureFlags.LocalAuthEnabled {
		authLocalRouter := authRouter.Group("/local")
		authLocalRouter.Post("/login", handler.LocalLogin(router.authService, router.userService))
		authLocalRouter.Post("/register", handler.LocalRegister(router.authService, router.userService, router.config.FeatureFlags.RegistrationEnabled))
		authLocalRouter.Post("/change-password", router.authService.JWTMiddleware(), handler.ChangePassword(router.authService, router.userService))
	}
	if router.config.FeatureFlags.AzureAuthEnabled {
		authAzureRouter := authRouter.Group("/azure")
		authAzureRouter.Get("/providers", handler.AzureProviders(router.config.Auth.Azure))
		authAzureRouter.Get("/login/:name", handler.AzureLogin(router.authService, router.config.Auth.Azure))
		authAzureRouter.Get("/call-back/:name", handler.AzureCallback(router.authService, router.userService, router.config.Auth.Azure))
		authAzureRouter.Post("/call-back/:name", handler.AzureCallback(router.authService, router.userService, router.config.Auth.Azure))
		authAzureRouter.Get("/logout", handler.AzureLogout)
	}
}
func (router *Router) promptRoutes(promptRouter fiber.Router) {
	promptRouter.Get("/", router.authService.JWTMiddleware(), handler.PromptsList(router.authService, router.promptService))
	promptRouter.Get("/admin", router.authService.JWTMiddleware(), handler.PromptsAdminList(router.authService, router.promptService))
	promptRouter.Post("/", router.authService.JWTMiddleware(), handler.PromptsCreate(router.authService, router.promptService))
	promptRouter.Put("/:id", router.authService.JWTMiddleware(), handler.PromptsUpdate(router.authService, router.promptService))
	promptRouter.Delete("/:id", router.authService.JWTMiddleware(), handler.PromptsDelete(router.authService, router.promptService))
}
func (router *Router) purposeRoutes(purposeRouter fiber.Router) {
	purposeRouter.Get("/", router.authService.JWTMiddleware(), handler.PurposesList(router.authService, router.purposeService))
}
func (router *Router) sessionRoutes(sessionRouter fiber.Router) {
	auth := router.authService.JWTMiddleware()

	sessionRouter.Post("/", auth, handler.CreateSession(router.authService, router.userService, router.sessionService, router.purposeService, router.node))
	sessionRouter.Post("/upload", auth, handler.UploadSessionAudio(router.authService, router.userService, router.sessionService, router.minioClient, router.config.Minio.Bucket, router.rmq, router.node))

	sessionRouter.Get("/active", auth, handler.ActiveSessions(router.authService, router.sessionService))
	sessionRouter.Get("/history", auth, handler.PastSessions(router.authService, router.sessionService))

	sessionRouter.Get("/:id", auth, handler.GetSessionDetail(router.authService, router.sessionService))
	sessionRouter.Get("/:id/prompts", auth, handler.SessionPromptResultsList(router.authService, router.sessionService))
	sessionRouter.Post("/:id/prompts", auth, handler.SessionPromptApply(router.authService, router.sessionService, router.promptService, router.rmq))
	sessionRouter.Delete("/:id/prompts/:resultId", auth, handler.SessionPromptResultDelete(router.authService, router.sessionService))
	sessionRouter.Get("/:id/members", auth, handler.SessionMembers(router.authService, router.sessionService))
	sessionRouter.Delete("/:id/members/:userId", auth, handler.RemoveSessionMember(router.authService, router.sessionService, router.node))
	sessionRouter.Get("/:id/participants", auth, handler.SessionParticipants(router.authService, router.sessionService, router.node))

	sessionRouter.Post("/:id/end", auth, handler.EndSession(router.authService, router.sessionService, router.config.Minio.Bucket, router.rmq, router.node))
	sessionRouter.Post("/:id/finish", auth, handler.FinishUploadSession(router.authService, router.sessionService, router.config.Minio.Bucket, router.rmq, router.node))

	sessionRouter.Post("/:id/segments", auth, handler.UploadSessionSegment(router.authService, router.sessionService, router.minioClient, router.config.Minio.Bucket, router.rmq, router.node))
	sessionRouter.Get("/:id/segments", auth, handler.ListSessionSegments(router.authService, router.sessionService))
	sessionRouter.Post("/:id/segments/:segmentId/result", handler.SegmentResult(router.config.Whisper.CallbackToken, router.sessionService, router.node))

	sessionRouter.Put("/:id/speakers", auth, handler.UpdateSpeakerNames(router.authService, router.sessionService))
}

func (router *Router) AllowedOrigins() []string {
	return router.allowedOrigins
}
func (router *Router) AllowedMethods() []string {
	return router.allowedMethods
}
func (router *Router) AllowedHeaders() []string {
	return router.allowedHeaders
}

func (router *Router) healthRoutes(app *fiber.App) {
	app.Get("/health", func(c fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
}

func (router *Router) Register(app *fiber.App) {
	router.ConfigureCors(app)
	router.healthRoutes(app)

	apiRouter := app.Group("/api")
	router.authRoutes(apiRouter.Group("/auth"))

	apiV1Router := apiRouter.Group("/v1")
	router.sessionRoutes(apiV1Router.Group("/sessions"))
	router.promptRoutes(apiV1Router.Group("/prompts"))
	router.purposeRoutes(apiV1Router.Group("/purposes"))
	router.adminRoutes(apiV1Router.Group("/admin"))
	router.userRoutes(apiV1Router.Group("/users"))
}
