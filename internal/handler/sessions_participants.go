package handler

import (
	"context"
	"strconv"

	"platform/internal/service"
	ws "platform/internal/websocket"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

type SessionParticipant struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

func SessionParticipants(
	authService *service.AuthService,
	sessionService *service.SessionService,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}

		hasAccess, err := sessionService.HasUserAccess(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessie laden mislukt",
			})
		}
		if !hasAccess {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot sessie",
			})
		}

		participants, err := ws.ListSessionParticipants(context.Background(), node, sessionService, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "deelnemers laden mislukt",
			})
		}
		out := make([]SessionParticipant, 0, len(participants))
		for _, p := range participants {
			out = append(out, SessionParticipant{
				UserID: p.UserID,
				Email:  p.Email,
				Role:   p.Role,
			})
		}

		return c.JSON(fiber.Map{
			"participants": out,
		})
	}
}
