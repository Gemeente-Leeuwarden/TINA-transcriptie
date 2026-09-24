package main

import (
	"fmt"
	"os"
	"platform/internal"
	"platform/internal/websocket"
	"strings"

	"platform/internal/config"
	"platform/internal/database"
	queuehandler "platform/internal/queue/handler"
	"platform/internal/service"
	"platform/pkg/apperror"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/joho/godotenv"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
	// LOGGER
	err := logger.InitLogger()
	apperror.Check(err)

	// ENVIRONMENT VARIABLES
	err = godotenv.Load()
	if err != nil {
		logger.Logger().Info("Error loading .env file")
	}

	// CONFIG
	conf := config.CreateConfig()

	// Centrifuge
	node, err := centrifuge.New(centrifuge.Config{})
	apperror.Check(err)
	redisShard, err := centrifuge.NewRedisShard(node, centrifuge.RedisShardConfig{
		Address: conf.Redis.URL,
	})
	apperror.Check(err)

	redisBroker, err := centrifuge.NewRedisBroker(node, centrifuge.RedisBrokerConfig{
		Shards: []*centrifuge.RedisShard{redisShard},
	})
	apperror.Check(err)

	redisPresence, err := centrifuge.NewRedisPresenceManager(node, centrifuge.RedisPresenceManagerConfig{
		Shards: []*centrifuge.RedisShard{redisShard},
	})
	apperror.Check(err)
	node.SetBroker(redisBroker)
	node.SetPresenceManager(redisPresence)

	err = node.Run()
	apperror.Check(err)

	// DATABASE
	db := database.CreateDatabase(conf.Database)
	err = db.RunMigrations()
	apperror.Check(err)

	// MINIO CLIENT
	minioClient, err := minio.New(conf.Minio.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(conf.Minio.AccessKey, conf.Minio.SecretKey, ""),
		Secure: conf.Minio.UseSSL,
	})
	apperror.Check(err)

	// RabbitMQ
	rmq, err := rabbitmq.NewClient(conf.RabbitMQ.Host, conf.RabbitMQ.Port, conf.RabbitMQ.Username, conf.RabbitMQ.Password, conf.RabbitMQ.VHost)
	apperror.Check(err)
	defer rmq.Close()

	q, err := rmq.DeclareQueue("session")
	apperror.Check(err)
	logger.Logger().Info(fmt.Sprintf("Rabbit channel created %s with %d consumers", q.Name, q.Consumers))

	q, err = rmq.DeclareQueue("transcription")
	apperror.Check(err)
	logger.Logger().Info(fmt.Sprintf("Rabbit channel created %s with %d consumers", q.Name, q.Consumers))

	// SERVICES
	userService := service.NewUserService(db.Connection)
	sessionService := service.NewSessionService(db.Connection)
	promptService := service.NewPromptService(db.Connection)
	purposeService := service.NewPurposeService(db.Connection)
	authService := service.NewAuthService(
		userService,
		conf.Auth.JWT.Secret,
		conf.Auth.JWT.DurationInHours,
		conf.Auth.Azure.EncryptionKey,
	)

	wsdeps := &websocket.Deps{
		AuthService:    authService,
		UserService:    userService,
		SessionService: sessionService,
		PurposeService: purposeService,
		Node:           node,
		RabbitMQ:       rmq,
		MinioBucket:    conf.Minio.Bucket,
	}

	websocket.SetupNode(node, wsdeps)
	wsHandler := centrifuge.NewWebsocketHandler(
		node,
		centrifuge.WebsocketConfig{},
	)
	_ = wsHandler

	// WEBSERVER
	app := fiber.New(fiber.Config{
		TrustProxy:       true,
		TrustProxyConfig: fiber.TrustProxyConfig{Proxies: []string{"127.0.0.1"}},
		BodyLimit:        2 * 1024 * 1024 * 1024,
	})

	app.Get("/ws-test", func(c fiber.Ctx) error {
		return c.SendString("OK")
	})

	//app.Get("/ws", func(c fiber.Ctx) error {
	//	return c.SendString("WS route gevonden")
	//})

	app.Get("/ws", adaptor.HTTPHandler(wsHandler))

	router := internal.NewRouter(&conf, promptService, purposeService, sessionService, authService, userService, minioClient, rmq, node)
	router.Register(app)

	if err := rmq.Subscribe("transcription", func(body []byte) {
		queuehandler.HandleTranscriptionMessage(body, sessionService, rmq, node)
	}); err != nil {
		logger.Logger().Error(fmt.Sprintf("transcription queue subscribe failed: %v", err))
	}

	// FRONTEND (SPA)
	app.Use("/", static.New("", static.Config{
		FS: os.DirFS("frontend/dist"),
	}))
	apiPrefixes := []string{"/api", "/auth", "/sessions", "/prompts", "/users", "/health", "/ws"}
	app.Get("/*", func(c fiber.Ctx) error {
		path := c.Path()
		for _, prefix := range apiPrefixes {
			if path == prefix || strings.HasPrefix(path, prefix+"/") {
				return c.Status(fiber.StatusNotFound).SendString("Not Found")
			}
		}
		return c.SendFile("frontend/dist/index.html")
	})

	err = app.Listen(fmt.Sprintf(":%d", conf.WebServer.Port))
	logger.Logger().Error(err.Error())
}
