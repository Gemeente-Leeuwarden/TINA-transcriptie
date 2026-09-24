package handler

import (
	"errors"
	"fmt"
	"net/http"
	"platform/internal/database/models"
	"platform/internal/service"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type PurposeLimitationsRequest struct {
	InviteParticipants bool `json:"invite_participants"`
	AllowAppRecording  bool `json:"allow_app_recording"`
}

type PurposeRetentionRequest struct {
	AudioHours         uint `json:"audio_hours"`
	TranscriptionHours uint `json:"transcription_hours"`
	PromptsHours       uint `json:"prompts_hours"`
}

type PurposeCreateRequest struct {
	Title       string                     `json:"title" validate:"required"`
	Description string                     `json:"description" validate:"required"`
	PromptID    uint                       `json:"prompt_id" validate:"required,gt=0"`
	Limitations *PurposeLimitationsRequest `json:"limitations" validate:"required"`
	Retention   *PurposeRetentionRequest   `json:"retention" validate:"required"`
}

type PurposeUpdateRequest struct {
	Title       string                     `json:"title" validate:"required"`
	Description string                     `json:"description" validate:"required"`
	PromptID    uint                       `json:"prompt_id" validate:"required,gt=0"`
	Limitations *PurposeLimitationsRequest `json:"limitations" validate:"required"`
	Retention   *PurposeRetentionRequest   `json:"retention" validate:"required"`
}

func parsePurposeID(c fiber.Ctx) (uint, error) {
	purposeID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || purposeID == 0 {
		return 0, fmt.Errorf("ongeldig doel-id")
	}
	return uint(purposeID), nil
}

func AdminPurposesList(
	authService *service.AuthService,
	purposeService *service.PurposeService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		purposes, err := purposeService.ListAll()
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "doelen laden mislukt",
			})
		}

		out := make([]*PurposeResponse, 0, len(purposes))
		for i := range purposes {
			out = append(out, buildPurposeResponse(&purposes[i]))
		}

		return c.JSON(fiber.Map{
			"purposes": out,
		})
	}
}

func AdminPurposesCreate(
	authService *service.AuthService,
	purposeService *service.PurposeService,
	promptService *service.PromptService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var req PurposeCreateRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig verzoek",
			})
		}
		req.Title = strings.TrimSpace(req.Title)
		req.Description = strings.TrimSpace(req.Description)
		if err := validate.Struct(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "titel, omschrijving en prompt zijn verplicht",
			})
		}
		if req.Limitations == nil || req.Retention == nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "beperkingen en retentie zijn verplicht",
			})
		}

		if _, err := promptService.GetByID(req.PromptID); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "prompt niet gevonden",
			})
		}

		purpose := &models.Purpose{
			Title:       req.Title,
			Description: req.Description,
			PromptID:    req.PromptID,
		}
		limitations := &models.PurposeLimitations{
			InviteParticipants: req.Limitations.InviteParticipants,
			AllowAppRecording:  req.Limitations.AllowAppRecording,
		}
		retention := &models.PurposeRetentionPeriod{
			AudioHours:         req.Retention.AudioHours,
			TranscriptionHours: req.Retention.TranscriptionHours,
			PromptsHours:       req.Retention.PromptsHours,
		}

		created, err := purposeService.Create(purpose, limitations, retention)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "doel aanmaken mislukt",
			})
		}

		return c.Status(http.StatusCreated).JSON(fiber.Map{
			"purpose": buildPurposeResponse(created),
		})
	}
}

func AdminPurposesUpdate(
	authService *service.AuthService,
	purposeService *service.PurposeService,
	promptService *service.PromptService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		purposeID, err := parsePurposeID(c)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var req PurposeUpdateRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig verzoek",
			})
		}
		req.Title = strings.TrimSpace(req.Title)
		req.Description = strings.TrimSpace(req.Description)
		if err := validate.Struct(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "titel, omschrijving en prompt zijn verplicht",
			})
		}
		if req.Limitations == nil || req.Retention == nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "beperkingen en retentie zijn verplicht",
			})
		}

		if _, err := promptService.GetByID(req.PromptID); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "prompt niet gevonden",
			})
		}

		purpose := &models.Purpose{
			Title:       req.Title,
			Description: req.Description,
			PromptID:    req.PromptID,
		}
		limitations := &models.PurposeLimitations{
			InviteParticipants: req.Limitations.InviteParticipants,
			AllowAppRecording:  req.Limitations.AllowAppRecording,
		}
		retention := &models.PurposeRetentionPeriod{
			AudioHours:         req.Retention.AudioHours,
			TranscriptionHours: req.Retention.TranscriptionHours,
			PromptsHours:       req.Retention.PromptsHours,
		}

		updated, err := purposeService.Update(purposeID, purpose, limitations, retention)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(http.StatusNotFound).JSON(fiber.Map{
					"error": "doel niet gevonden",
				})
			}
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "doel bijwerken mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"purpose": buildPurposeResponse(updated),
		})
	}
}

func AdminPurposesDelete(
	authService *service.AuthService,
	purposeService *service.PurposeService,
	sessionService *service.SessionService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		purposeID, err := parsePurposeID(c)
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		if _, err := purposeService.Delete(purposeID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(http.StatusNotFound).JSON(fiber.Map{
					"error": "doel niet gevonden",
				})
			}
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "doel verwijderen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"status": "deleted",
		})
	}
}
