package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"platform/internal/database/models"
	q "platform/internal/queue"
	"platform/internal/service"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type SessionPromptApplyRequest struct {
	PromptID uint `json:"prompt_id" validate:"required,gt=0"`
}

type SessionPromptSummary struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

type SessionPromptResultResponse struct {
	ID        uint                       `json:"id"`
	SessionID uint                       `json:"session_id"`
	PromptID  uint                       `json:"prompt_id"`
	Prompt    *SessionPromptSummary      `json:"prompt,omitempty"`
	Status    models.SessionPromptStatus `json:"status"`
	Result    string                     `json:"result"`
	Error     string                     `json:"error,omitempty"`
	CreatedAt string                     `json:"created_at"`
	UpdatedAt string                     `json:"updated_at"`
}

func buildSessionPromptResultResponse(result models.SessionPromptResult) SessionPromptResultResponse {
	response := SessionPromptResultResponse{
		ID:        result.ID,
		SessionID: result.SessionID,
		PromptID:  result.PromptID,
		Status:    result.Status,
		Result:    result.Result,
		Error:     result.Error,
		CreatedAt: result.CreatedAt.Format(time.RFC3339),
		UpdatedAt: result.UpdatedAt.Format(time.RFC3339),
	}
	if result.Prompt.ID != 0 {
		response.Prompt = &SessionPromptSummary{
			ID:    result.Prompt.ID,
			Title: result.Prompt.Title,
		}
	}
	return response
}

func SessionPromptResultsList(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
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

		results, err := sessionService.ListPromptResults(uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "promptresultaten laden mislukt",
			})
		}

		out := make([]SessionPromptResultResponse, 0, len(results))
		for _, result := range results {
			out = append(out, buildSessionPromptResultResponse(result))
		}

		return c.JSON(fiber.Map{
			"results": out,
		})
	}
}

func SessionPromptApply(
	authService *service.AuthService,
	sessionService *service.SessionService,
	promptService *service.PromptService,
	rabbitMQ *rabbitmq.Client,
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

		role, err := sessionService.GetUserRole(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessierol laden mislukt",
			})
		}
		if role != models.RoleOwner && role != models.RoleEditor {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen eigenaar of moderator kan prompts toevoegen",
			})
		}

		var req SessionPromptApplyRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig verzoek",
			})
		}
		if err := validate.Struct(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "prompt is verplicht",
			})
		}

		session, err := sessionService.GetByID(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if session.Status != models.StatusFinished {
			return c.Status(400).JSON(fiber.Map{
				"error": "sessie is nog niet afgerond",
			})
		}
		if session.Transcription == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "transcriptie is nog niet beschikbaar",
			})
		}

		if rabbitMQ == nil {
			return c.Status(503).JSON(fiber.Map{
				"error": "rabbitmq is niet beschikbaar",
			})
		}

		prompt, err := promptService.GetByID(req.PromptID)
		if err != nil || prompt == nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "prompt niet gevonden",
			})
		}
		if !canManagePrompt(claims, prompt) {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot prompt",
			})
		}

		result, err := sessionService.CreatePromptResult(session.ID, prompt.ID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "promptresultaat aanmaken mislukt",
			})
		}

		msg, err := json.Marshal(q.PromptApplyMessage{
			Type:           q.MessageTypePromptApply,
			PromptResultID: fmt.Sprintf("%d", result.ID),
			SessionID:      fmt.Sprintf("%d", session.ID),
			PromptID:       fmt.Sprintf("%d", prompt.ID),
			PromptTitle:    prompt.Title,
			PromptContent:  prompt.Content,
			Transcription:  session.Transcription,
		})
		if err != nil {
			logger.Logger().Error(fmt.Sprintf("prompt apply marshal failed: %v", err))
			_ = sessionService.UpdatePromptResult(result.ID, models.PromptStatusFailed, "", err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt in wachtrij zetten mislukt",
			})
		}
		if err := rabbitMQ.Publish("", "session", msg); err != nil {
			logger.Logger().Error(fmt.Sprintf("prompt apply publish failed: %v", err))
			_ = sessionService.UpdatePromptResult(result.ID, models.PromptStatusFailed, "", err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt in wachtrij zetten mislukt",
			})
		}

		return c.Status(201).JSON(fiber.Map{
			"result": buildSessionPromptResultResponse(*result),
		})
	}
}

func SessionPromptResultDelete(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
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

		resultID, err := strconv.ParseUint(c.Params("resultId"), 10, 64)
		if err != nil || resultID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig resultaat-id",
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
				"error": "alleen eigenaar of moderator kan promptresultaten verwijderen",
			})
		}

		if err := sessionService.DeletePromptResult(uint(sessionID), uint(resultID)); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{
					"error": "promptresultaat niet gevonden",
				})
			}
			return c.Status(500).JSON(fiber.Map{
				"error": "promptresultaat verwijderen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"id": resultID,
		})
	}
}
