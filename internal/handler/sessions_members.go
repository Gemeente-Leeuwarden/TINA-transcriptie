package handler

import (
	"fmt"
	ws "platform/internal/websocket"
	"strconv"

	"platform/internal/database/models"
	"platform/internal/service"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

type SessionMember struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

func SessionMembers(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
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

		members, err := sessionService.GetSessionMembers(uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "leden laden mislukt",
			})
		}
		out := make([]SessionMember, 0, len(members))
		for _, m := range members {
			out = append(out, SessionMember{
				UserID: m.UserID,
				Email:  m.Email,
				Role:   string(m.Role),
			})
		}

		return c.JSON(fiber.Map{
			"members": out,
		})
	}
}

func RemoveSessionMember(
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

		targetUserID, err := strconv.ParseUint(c.Params("userId"), 10, 64)
		if err != nil || targetUserID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig gebruiker-id",
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

		role, err := sessionService.GetUserRole(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessierol laden mislukt",
			})
		}
		if role != models.RoleOwner && role != models.RoleEditor {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen de eigenaar en moderators kunnen deelnemers verwijderen",
			})
		}

		targetUserRole, err := sessionService.GetUserRole(uint(targetUserID), uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "deelnemer niet gevonden",
			})
		}

		if targetUserRole == models.RoleOwner {
			return c.Status(400).JSON(fiber.Map{
				"error": "de eigenaar kan niet worden verwijderd",
			})
		}

		if err := sessionService.RemoveUserFromSession(uint(targetUserID), uint(sessionID)); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "deelnemer verwijderen mislukt",
			})
		}

		ws.NotifyUserRemovalOfSession(node, uint(targetUserID), uint(sessionID))
		ws.PublishNotificationToUser(
			node,
			uint(targetUserID),
			ws.NotificationLevelWarning,
			"Verwijdert van sessie",
			fmt.Sprintf("Je bent van sessie %d verwijdert.", sessionID),
			"",
		)

		return c.JSON(fiber.Map{
			"user_id": targetUserID,
		})
	}
}
