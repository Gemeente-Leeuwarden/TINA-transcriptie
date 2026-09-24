package handler

import (
	"errors"
	"platform/internal/database/models"
	"platform/internal/service"
	"platform/pkg/apperror"
	"platform/pkg/logger"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type promptRequest struct {
	Title    string `json:"title" validate:"required,max=160"`
	Content  string `json:"content" validate:"required,max=8000"`
	IsGlobal bool   `json:"is_global"`
}

type promptResponse struct {
	ID         uint      `json:"id"`
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	UserID     uint      `json:"user_id"`
	OwnerEmail string    `json:"owner_email"`
	IsGlobal   bool      `json:"is_global"`
	IsOwner    bool      `json:"is_owner"`
	CanManage  bool      `json:"can_manage"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func toPromptResponse(claims *service.JWTClaims, prompt *models.Prompt) promptResponse {
	canManage := canManagePrompt(claims, prompt)
	return promptResponse{
		ID:         prompt.ID,
		Title:      prompt.Title,
		Content:    prompt.Content,
		UserID:     prompt.UserID,
		OwnerEmail: prompt.User.Email,
		IsGlobal:   prompt.IsGlobal,
		IsOwner:    prompt.UserID == claims.UserID,
		CanManage:  canManage,
		CreatedAt:  prompt.CreatedAt,
		UpdatedAt:  prompt.UpdatedAt,
	}
}

func canManagePrompt(claims *service.JWTClaims, prompt *models.Prompt) bool {
	if prompt.IsGlobal {
		return claims.Role == models.PlatformRoleAdmin
	}
	return prompt.UserID == claims.UserID
}

func parsePromptID(c fiber.Ctx) (uint, error) {
	promptID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || promptID == 0 {
		return 0, errors.New("ongeldig prompt-id")
	}
	return uint(promptID), nil
}

func parseIntQuery(c fiber.Ctx, key string, fallback int, min int, max int) int {
	raw := c.Query(key)
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	if value < min {
		return fallback
	}
	if value > max {
		return max
	}
	return value
}

func PromptsList(authService *service.AuthService, promptService *service.PromptService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		prompts, err := promptService.ListForUser(claims.UserID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "prompts laden mislukt",
			})
		}

		out := make([]promptResponse, 0, len(prompts))
		for i := range prompts {
			out = append(out, toPromptResponse(claims, &prompts[i]))
		}

		return c.JSON(fiber.Map{
			"prompts": out,
		})
	}
}

func PromptsAdminList(authService *service.AuthService, promptService *service.PromptService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if claims.Role != models.PlatformRoleAdmin {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen admins hebben toegang",
			})
		}

		page := parseIntQuery(c, "page", 1, 1, 1000000)
		pageSize := parseIntQuery(c, "page_size", 10, 1, 100)

		prompts, total, err := promptService.ListAllPaged(page, pageSize)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "prompts laden mislukt",
			})
		}

		totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
		out := make([]promptResponse, 0, len(prompts))
		for i := range prompts {
			out = append(out, toPromptResponse(claims, &prompts[i]))
		}

		return c.JSON(fiber.Map{
			"prompts": out,
			"pagination": fiber.Map{
				"page":        page,
				"page_size":   pageSize,
				"total":       total,
				"total_pages": totalPages,
			},
		})
	}
}

func PromptsCreate(authService *service.AuthService, promptService *service.PromptService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var req promptRequest
		if err := c.Bind().JSON(&req); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}
		if err := validate.Struct(&req); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		isGlobal := req.IsGlobal
		if claims.Role != models.PlatformRoleAdmin && isGlobal {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen admins kunnen globale prompts beheren",
			})
		}

		prompt := &models.Prompt{
			Title:    req.Title,
			Content:  req.Content,
			UserID:   claims.UserID,
			IsGlobal: isGlobal,
		}

		created, err := promptService.Create(prompt)
		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt aanmaken mislukt",
			})
		}

		return c.Status(201).JSON(fiber.Map{
			"prompt": toPromptResponse(claims, created),
		})
	}
}

func PromptsUpdate(authService *service.AuthService, promptService *service.PromptService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		promptID, err := parsePromptID(c)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var req promptRequest
		if err := c.Bind().JSON(&req); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}
		if err := validate.Struct(&req); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		prompt, err := promptService.GetByID(promptID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{
					"error": "prompt niet gevonden",
				})
			}
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt laden mislukt",
			})
		}
		if !canManagePrompt(claims, prompt) {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot prompt",
			})
		}

		if claims.Role != models.PlatformRoleAdmin && req.IsGlobal != prompt.IsGlobal {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen admins kunnen globale prompts beheren",
			})
		}

		prompt.Title = req.Title
		prompt.Content = req.Content
		if claims.Role == models.PlatformRoleAdmin {
			prompt.IsGlobal = req.IsGlobal
		}

		updated, err := promptService.Update(prompt)
		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt bijwerken mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"prompt": toPromptResponse(claims, updated),
		})
	}
}

func PromptsDelete(authService *service.AuthService, promptService *service.PromptService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		promptID, err := parsePromptID(c)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		prompt, err := promptService.GetByID(promptID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{
					"error": "prompt niet gevonden",
				})
			}
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt laden mislukt",
			})
		}
		if !canManagePrompt(claims, prompt) {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot prompt",
			})
		}

		if err := promptService.Delete(prompt.ID); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "prompt verwijderen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"id": prompt.ID,
		})
	}
}
