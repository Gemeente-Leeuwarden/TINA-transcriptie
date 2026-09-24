package handler

import (
	"platform/internal/database/models"
	"platform/internal/service"
	ws "platform/internal/websocket"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

type CreateSessionResponse struct {
	SessionID  uint                 `json:"session_id"`
	InviteCode string               `json:"invite_code"`
	Status     models.SessionStatus `json:"status"`
	Purpose    *PurposeResponse     `json:"purpose,omitempty"`
}

type CreateSessionRequest struct {
	PurposeID uint `json:"purpose_id" validate:"required,gt=0"`
}

func CreateSession(
	authService *service.AuthService,
	userService *service.UserService,
	sessionService *service.SessionService,
	purposeService *service.PurposeService,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		user, err := userService.GetByID(claims.UserID)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "niet geautoriseerd",
			})
		}

		var req CreateSessionRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig verzoek",
			})
		}
		if err := validate.Struct(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "doel is verplicht",
			})
		}

		purpose, err := purposeService.GetByIDForUser(req.PurposeID, user.ID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "doel niet gevonden",
			})
		}

		active, err := sessionService.GetActiveSessionByUser(user)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessie aanmaken mislukt",
			})
		}
		if active != nil {
			return c.Status(400).JSON(fiber.Map{
				"error":   "er is al een actieve sessie",
				"session": active.ID,
			})
		}

		ses, err := sessionService.CreateNewSession(user, purpose.ID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessie aanmaken mislukt",
			})
		}
		ws.PublishActiveSessionsUpdated(node, []uint{user.ID})

		return c.JSON(CreateSessionResponse{
			SessionID:  ses.ID,
			InviteCode: ses.InviteCode,
			Status:     ses.Status,
			Purpose:    buildPurposeResponse(purpose),
		})
	}
}
