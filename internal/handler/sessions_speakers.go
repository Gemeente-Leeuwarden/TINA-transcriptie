package handler

import (
	"encoding/json"
	"strconv"

	"platform/internal/database/models"
	"platform/internal/service"

	"github.com/gofiber/fiber/v3"
)

type UpdateSpeakerNamesRequest struct {
	SpeakerNames map[string]string `json:"speaker_names"`
}

func UpdateSpeakerNames(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
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

		role, err := sessionService.GetUserRole(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot sessie",
			})
		}
		if role != models.RoleOwner && role != models.RoleEditor {
			return c.Status(403).JSON(fiber.Map{
				"error": "onvoldoende rechten",
			})
		}

		var req UpdateSpeakerNamesRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldige request body",
			})
		}

		jsonBytes, err := json.Marshal(req.SpeakerNames)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "json encoding mislukt",
			})
		}

		session, err := sessionService.GetByID(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}

		if err := sessionService.UpdateSpeakerNames(session, string(jsonBytes)); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "speaker namen opslaan mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"status":        "updated",
			"speaker_names": req.SpeakerNames,
		})
	}
}
