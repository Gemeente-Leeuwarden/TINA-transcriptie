package handler

import (
	"errors"
	"platform/internal/database/models"
	"platform/internal/service"
	"platform/pkg/apperror"
	"platform/pkg/logger"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
)

type userRoleUpdateRequest struct {
	Role models.PlatformRole `json:"role" validate:"required,oneof=user admin"`
}

type managedUserResponse struct {
	ID            uint                `json:"id"`
	Email         string              `json:"email"`
	Source        models.UserSource   `json:"source"`
	Role          models.PlatformRole `json:"role"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
	IsCurrentUser bool                `json:"is_current_user"`
}

func toManagedUserResponse(claims *service.JWTClaims, user service.ManagedUser) managedUserResponse {
	return managedUserResponse{
		ID:            user.ID,
		Email:         user.Email,
		Source:        user.Source,
		Role:          user.Role,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
		IsCurrentUser: user.ID == claims.UserID,
	}
}

func parseUserIDParam(c fiber.Ctx) (uint, error) {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || userID == 0 {
		return 0, errors.New("ongeldig gebruiker-id")
	}
	return uint(userID), nil
}

func parseUserSourceQuery(c fiber.Ctx) (*models.UserSource, error) {
	source := strings.TrimSpace(strings.ToLower(c.Query("source")))
	if source == "" || source == "all" {
		return nil, nil
	}
	if source == string(models.SourceLocal) {
		value := models.SourceLocal
		return &value, nil
	}
	if source == string(models.SourceAzure) {
		value := models.SourceAzure
		return &value, nil
	}
	return nil, errors.New("ongeldige source filter")
}

func parseUsersIntQuery(c fiber.Ctx, key string, fallback int, min int, max int) int {
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

func UsersList(authService *service.AuthService, userService *service.UserService) fiber.Handler {
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

		page := parseUsersIntQuery(c, "page", 1, 1, 1000000)
		pageSize := parseUsersIntQuery(c, "page_size", 10, 1, 100)

		source, err := parseUserSourceQuery(c)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		search := strings.TrimSpace(c.Query("search"))

		users, total, err := userService.ListManagedUsersPaged(page, pageSize, source, search)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "gebruikers laden mislukt",
			})
		}
		totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

		out := make([]managedUserResponse, 0, len(users))
		for _, row := range users {
			out = append(out, toManagedUserResponse(claims, row))
		}

		return c.JSON(fiber.Map{
			"users": out,
			"pagination": fiber.Map{
				"page":        page,
				"page_size":   pageSize,
				"total":       total,
				"total_pages": totalPages,
			},
		})
	}
}

func UsersUpdateRole(authService *service.AuthService, userService *service.UserService) fiber.Handler {
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

		targetUserID, err := parseUserIDParam(c)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if targetUserID == claims.UserID {
			return c.Status(400).JSON(fiber.Map{
				"error": "je kunt je eigen rol niet wijzigen",
			})
		}

		var req userRoleUpdateRequest
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

		targetUser, err := userService.GetByID(targetUserID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "gebruiker niet gevonden",
			})
		}
		if targetUser.Source == models.SourceAzure {
			return c.Status(400).JSON(fiber.Map{
				"error": "rol van azure accounts wordt via Azure groepen bepaald",
			})
		}

		if err := userService.SetPlatformRole(targetUserID, req.Role); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "rol wijzigen mislukt",
			})
		}

		role, err := userService.GetPlatformRole(targetUserID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "rol laden mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"user": managedUserResponse{
				ID:            targetUser.ID,
				Email:         targetUser.Email,
				Source:        targetUser.Source,
				Role:          role,
				CreatedAt:     targetUser.CreatedAt,
				UpdatedAt:     targetUser.UpdatedAt,
				IsCurrentUser: targetUser.ID == claims.UserID,
			},
		})
	}
}
