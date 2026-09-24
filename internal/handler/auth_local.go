package handler

import (
	"platform/internal/database/models"
	"platform/internal/service"
	"platform/pkg/apperror"
	"platform/pkg/logger"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginResponse struct {
	User  interface{} `json:"user"`
	Token string      `json:"token"`
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required,min=6"`
	NewPassword     string `json:"new_password" validate:"required,min=6"`
}

var validate = validator.New()

func LocalLogin(authService *service.AuthService, userService *service.UserService) fiber.Handler {
	return func(c fiber.Ctx) error {
		var loginRequest LoginRequest
		if err := c.Bind().JSON(&loginRequest); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		if err := validate.Struct(&loginRequest); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		fUser, err := authService.LoginByEmailAndPassword(loginRequest.Email, loginRequest.Password)
		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		role, err := userService.GetPlatformRole(fUser.ID)
		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "rol laden mislukt",
			})
		}

		// Generate JWT token
		token, err := authService.GenerateJWT(fUser.ID, fUser.Email, role)
		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to generate token",
			})
		}

		return c.Status(200).JSON(LoginResponse{
			User:  fUser,
			Token: token,
		})
	}
}

func LocalRegister(authService *service.AuthService, userService *service.UserService, registrationEnabled bool) fiber.Handler {
	return func(c fiber.Ctx) error {
		if !registrationEnabled {
			authHeader := c.Get("Authorization")
			if authHeader == "" {
				return c.Status(403).JSON(fiber.Map{
					"error": "registratie is uitgeschakeld",
				})
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				return c.Status(401).JSON(fiber.Map{
					"error": "invalid authorization header format",
				})
			}
			claims, err := authService.ValidateJWT(parts[1])
			if err != nil {
				return c.Status(401).JSON(fiber.Map{
					"error": "invalid or expired token",
				})
			}
			if claims.Role != models.PlatformRoleAdmin {
				return c.Status(403).JSON(fiber.Map{
					"error": "registratie is uitgeschakeld",
				})
			}
		}

		var registerRequest RegisterRequest
		if err := c.Bind().JSON(&registerRequest); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		if err := validate.Struct(&registerRequest); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		pUser, err := userService.Create(&models.User{
			Email:    registerRequest.Email,
			Password: registerRequest.Password,
			Source:   models.SourceLocal,
		})

		if err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseDatabaseError(err),
			})
		}

		return c.Status(200).JSON(fiber.Map{
			"data": fiber.Map{
				"user": pUser,
			},
		})
	}
}

func ChangePassword(authService *service.AuthService, userService *service.UserService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var req ChangePasswordRequest
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

		if req.CurrentPassword == req.NewPassword {
			return c.Status(400).JSON(fiber.Map{
				"error": "nieuw wachtwoord moet verschillen van het huidige wachtwoord",
			})
		}

		user, err := userService.GetByID(claims.UserID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "gebruiker niet gevonden",
			})
		}
		if user.Source != models.SourceLocal {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen lokale accounts mogen een wachtwoord wijzigen",
			})
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "huidig wachtwoord is onjuist",
			})
		}

		if _, err := authService.ChangePassword(user, req.NewPassword); err != nil {
			logger.Logger().Info(err.Error())
			return c.Status(500).JSON(fiber.Map{
				"error": "wachtwoord wijzigen mislukt",
			})
		}

		return c.Status(200).JSON(fiber.Map{
			"message": "wachtwoord gewijzigd",
		})
	}
}

func Profile(authService *service.AuthService, userService *service.UserService) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		u, err := userService.GetByEmail(claims.Email)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		role, err := userService.GetPlatformRole(u.ID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "rol laden mislukt",
			})
		}

		return c.Status(200).JSON(fiber.Map{
			"user": u,
			"role": role,
		})
	}
}
