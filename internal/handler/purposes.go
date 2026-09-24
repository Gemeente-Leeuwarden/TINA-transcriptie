package handler

import (
	"platform/internal/service"

	"github.com/gofiber/fiber/v3"
)

func PurposesList(authService *service.AuthService, purposeService *service.PurposeService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		purposes, err := purposeService.ListForUser(claims.UserID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
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
