package handler

import (
	"strings"
	"time"

	"platform/internal/database/models"
	"platform/internal/service"

	"github.com/gofiber/fiber/v3"
)

type ActiveSessionSummary struct {
	SessionID  uint                   `json:"session_id"`
	Status     models.SessionStatus   `json:"status"`
	Role       models.UserSessionRole `json:"role"`
	InviteCode string                 `json:"invite_code,omitempty"`
	UpdatedAt  string                 `json:"updated_at"`
	Purpose    *PurposeResponse       `json:"purpose,omitempty"`
}

type PastSessionSummary struct {
	SessionID uint                   `json:"session_id"`
	Status    models.SessionStatus   `json:"status"`
	Role      models.UserSessionRole `json:"role"`
	CreatedAt string                 `json:"created_at"`
	UpdatedAt string                 `json:"updated_at"`
}

func ActiveSessions(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		links, err := sessionService.GetActiveSessionsByUser(claims.UserID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to load sessions",
			})
		}

		summaries := make([]ActiveSessionSummary, 0, len(links))
		for _, link := range links {
			summaries = append(summaries, ActiveSessionSummary{
				SessionID:  link.Session.ID,
				Status:     link.Session.Status,
				Role:       link.Role,
				InviteCode: link.Session.InviteCode,
				UpdatedAt:  link.Session.UpdatedAt.Format(time.RFC3339),
				Purpose:    buildPurposeResponse(link.Session.Purpose),
			})
		}

		return c.JSON(fiber.Map{
			"sessions": summaries,
		})
	}
}

func parseRoleQuery(c fiber.Ctx) *models.UserSessionRole {
	raw := strings.TrimSpace(strings.ToLower(c.Query("role")))
	switch raw {
	case "owner":
		role := models.RoleOwner
		return &role
	case "guest":
		role := models.RoleViewer
		return &role
	default:
		return nil
	}
}

func PastSessions(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		page := parseIntQuery(c, "page", 1, 1, 1000000)
		pageSize := parseIntQuery(c, "page_size", 20, 1, 100)
		role := parseRoleQuery(c)

		links, total, err := sessionService.GetPastSessionsByUserPaged(claims.UserID, page, pageSize, role)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to load sessions",
			})
		}

		totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

		summaries := make([]PastSessionSummary, 0, len(links))
		for _, link := range links {
			summaries = append(summaries, PastSessionSummary{
				SessionID: link.Session.ID,
				Status:    link.Session.Status,
				Role:      link.Role,
				CreatedAt: link.Session.CreatedAt.Format(time.RFC3339),
				UpdatedAt: link.Session.UpdatedAt.Format(time.RFC3339),
			})
		}

		return c.JSON(fiber.Map{
			"sessions": summaries,
			"pagination": fiber.Map{
				"page":        page,
				"page_size":   pageSize,
				"total":       total,
				"total_pages": totalPages,
			},
		})
	}
}
