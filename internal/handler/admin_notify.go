package handler

import (
	"net/http"
	"platform/internal/database/models"
	"platform/internal/service"
	ws "platform/internal/websocket"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

type adminNotifyRequest struct {
	Title   string               `json:"title"`
	Message string               `json:"message"`
	Level   ws.NotificationLevel `json:"level"`
	UserIDs []uint               `json:"user_ids"`
}

func AdminSendMessage(
	authService *service.AuthService,
	userService *service.UserService,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if claims.Role != models.PlatformRoleAdmin {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "alleen admins hebben toegang",
			})
		}

		var body adminNotifyRequest
		if err := c.Bind().JSON(&body); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldige payload",
			})
		}

		if body.Title == "" || body.Message == "" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "titel en bericht zijn verplicht",
			})
		}

		if body.Level != ws.NotificationLevelGood &&
			body.Level != ws.NotificationLevelWarning &&
			body.Level != ws.NotificationLevelBad {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig level (good, warning, bad)",
			})
		}

		userIDs := body.UserIDs
		if len(userIDs) == 0 {
			userIDs, err = userService.ListAllUserIDs()
			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
					"error": "gebruikers ophalen mislukt",
				})
			}
		}

		for _, uid := range userIDs {
			ws.PublishNotificationToUser(node, uid, body.Level, body.Title, body.Message, "")
		}

		return c.JSON(fiber.Map{
			"status":     "sent",
			"recipients": len(userIDs),
		})
	}
}
