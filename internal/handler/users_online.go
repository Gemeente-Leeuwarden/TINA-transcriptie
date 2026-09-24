package handler

import (
	"net/http"
	"platform/internal/service"
	ws "platform/internal/websocket"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

func UsersOnline(
	authService *service.AuthService,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		_, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		ids, err := ws.ListOnlineUserIDs(node)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "online gebruikers ophalen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"user_ids": ids,
		})
	}
}
