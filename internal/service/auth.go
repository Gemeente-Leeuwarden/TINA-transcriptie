package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"platform/internal/database/models"
	"platform/pkg/logger"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type JWTClaims struct {
	UserID uint                `json:"user_id"`
	Email  string              `json:"email"`
	Role   models.PlatformRole `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userService *UserService

	jwtSecret   []byte
	jwtDuration time.Duration
	azureSecret []byte
}

func NewAuthService(userService *UserService, jwtSecret string, jwtDurationInHours int, azureEncryptionKey string) *AuthService {
	azureKey, err := base64.StdEncoding.DecodeString(azureEncryptionKey)
	if err != nil {
		panic(err)
	}

	return &AuthService{
		userService: userService,
		jwtSecret:   []byte(jwtSecret),
		jwtDuration: time.Duration(jwtDurationInHours) * time.Hour,
		azureSecret: azureKey,
	}
}

func (a *AuthService) EncryptState(data map[string]interface{}) (string, error) {
	block, err := aes.NewCipher(a.azureSecret)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	plaintext, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, plaintext, nil)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}
func (a *AuthService) DecryptState(encryptedState string) (map[string]interface{}, error) {
	ciphertext, err := base64.URLEncoding.DecodeString(encryptedState)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(a.azureSecret)
	if err != nil {
		return nil, err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(plaintext, &data); err != nil {
		return nil, err
	}

	return data, nil
}

func (a *AuthService) WSAuthMiddleware(userService *UserService, sessionService *SessionService) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Query("token")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "token query parameter required",
			})
		}

		claims, err := a.ValidateJWT(token)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		u, err := userService.GetByID(claims.UserID)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "user not found",
			})
		}

		sess, err := sessionService.GetActiveSessionByUser(u)
		if err != nil {
			logger.Logger().Error(fmt.Sprintf("[USER:%d] > error: %s", u.ID, err.Error()))
		}

		c.Locals("session", sess)
		c.Locals("user", u)
		return c.Next()
	}
}

func (a *AuthService) JWTMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "authorization header required",
			})
		}

		// Expected format: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{
				"error": "invalid authorization header format",
			})
		}

		tokenString := parts[1]
		claims, err := a.ValidateJWT(tokenString)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		// Store user information in context for handlers to use
		c.Locals("jwt", claims)
		return c.Next()
	}
}
func (a *AuthService) GetProfile(c fiber.Ctx) (*JWTClaims, error) {
	claimsVal := c.Locals("jwt")
	if claimsVal == nil {
		return nil, fmt.Errorf("user ID not found in context")
	}
	claims, ok := claimsVal.(*JWTClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}

	return claims, nil
}

func (a *AuthService) GenerateJWT(userID uint, email string, role models.PlatformRole) (string, error) {
	if role == "" {
		role = models.PlatformRoleUser
	}
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(a.jwtDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.jwtSecret)
}
func (a *AuthService) ValidateJWT(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {

		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (a *AuthService) LoginByEmailAndPassword(email string, password string) (*models.User, error) {
	ube, err := a.userService.GetByEmail(email)
	if err != nil {
		return nil, err
	}

	err = bcrypt.CompareHashAndPassword([]byte(ube.Password), []byte(password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	return ube, nil
}
func (a *AuthService) ChangePassword(user *models.User, newPassword string) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.Password = string(hashedPassword)
	return a.userService.Update(user)
}
