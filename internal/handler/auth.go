package handler

import (
	"platform/internal/service"

	"github.com/gofiber/fiber/v3"
)

func RefreshToken(authService *service.AuthService, userService *service.UserService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Fetch user to get updated data
		fetchedUser, err := userService.GetByEmail(claims.Email)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "user not found",
			})
		}

		role, err := userService.GetPlatformRole(fetchedUser.ID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "rol laden mislukt",
			})
		}

		// Generate new JWT token
		token, err := authService.GenerateJWT(fetchedUser.ID, fetchedUser.Email, role)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		return c.Status(200).JSON(fiber.Map{
			"token": token,
			"data": fiber.Map{
				"user": fetchedUser,
			},
		})
	}
}
