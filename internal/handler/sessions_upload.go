package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"platform/internal/database/models"
	q "platform/internal/queue"
	"platform/internal/service"
	ws "platform/internal/websocket"
	"platform/pkg/apperror"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
	"github.com/minio/minio-go/v7"
)

type UploadSessionResponse struct {
	SessionID     uint   `json:"session_id"`
	Transcription string `json:"transcription"`
	Status        string `json:"status"`
}

type UploadSessionForm struct {
	SessionID uint `form:"session_id" validate:"required,gt=0"`
}

func UploadSessionAudio(
	authService *service.AuthService,
	userService *service.UserService,
	sessionService *service.SessionService,
	minioClient *minio.Client,
	minioBucket string,
	rabbitMQ *rabbitmq.Client,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, err := authService.GetProfile(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		user, err := userService.GetByID(claims.UserID)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{
				"error": "niet geautoriseerd",
			})
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "bestand is verplicht",
			})
		}

		var form UploadSessionForm
		if err := c.Bind().Body(&form); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}
		if err := validate.Struct(&form); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}
		sessionID := uint64(form.SessionID)

		hasAccess, err := sessionService.HasUserAccess(user.ID, uint(sessionID))
		if err != nil || !hasAccess {
			return c.Status(403).JSON(fiber.Map{
				"error": "geen toegang tot sessie",
			})
		}
		role, err := sessionService.GetUserRole(user.ID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessierol laden mislukt",
			})
		}
		if role != models.RoleOwner {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen de eigenaar kan uploaden",
			})
		}

		ses, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if ses.Status != models.StatusNew {
			return c.Status(400).JSON(fiber.Map{
				"error": fmt.Sprintf("sessie is niet klaar voor uploaden (status: %s)", ses.Status),
			})
		}
		uploadFile, err := fileHeader.Open()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "kan bestand niet openen",
			})
		}
		defer uploadFile.Close()

		objectName := fmt.Sprintf("uploads/session_%d/%s", ses.ID, sanitizeFilename(fileHeader.Filename))
		if err := uploadToMinioReader(
			minioClient,
			minioBucket,
			objectName,
			uploadFile,
			fileHeader.Size,
			fileHeader.Header.Get("Content-Type"),
		); err != nil {
			_ = sessionService.UpdateStatus(ses, models.StatusError)
			publishUploadFailed(node, ses.ID, "opslaan in minio mislukt")
			return c.Status(500).JSON(fiber.Map{
				"error": "opslaan in minio mislukt",
			})
		}

		if err := sessionService.AddUpload(ses.ID, fileHeader.Filename, objectName); err != nil {
			logger.Logger().Error(fmt.Sprintf("Upload metadata save failed: %v", err))
		}

		if rabbitMQ != nil {
			purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)
			msg, err := json.Marshal(q.MessageUploadReady{
				Type:        q.MessageTypeUploadReady,
				SessionID:   fmt.Sprintf("%d", ses.ID),
				ObjectName:  objectName,
				FileName:    fileHeader.Filename,
				ContentType: fileHeader.Header.Get("Content-Type"),
				Purpose:     purposeInfo,
				Prompt:      promptInfo,
			})
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("Upload queue message marshal failed: %v", err))
				_ = sessionService.UpdateStatus(ses, models.StatusError)
				publishUploadFailed(node, ses.ID, "upload in wachtrij zetten mislukt")
				return c.Status(500).JSON(fiber.Map{
					"error": "upload in wachtrij zetten mislukt",
				})
			}
			if err := rabbitMQ.Publish("", "session", msg); err != nil {
				logger.Logger().Error(fmt.Sprintf("Upload queue publish failed: %v", err))
				_ = sessionService.UpdateStatus(ses, models.StatusError)
				publishUploadFailed(node, ses.ID, "upload in wachtrij zetten mislukt")
				return c.Status(500).JSON(fiber.Map{
					"error": "upload in wachtrij zetten mislukt",
				})
			}
		}

		return c.Status(202).JSON(UploadSessionResponse{
			SessionID:     ses.ID,
			Transcription: "",
			Status:        string(models.StatusNew),
		})
	}
}

func uploadToMinioReader(
	client *minio.Client,
	bucket,
	objectName string,
	reader io.Reader,
	size int64,
	contentType string,
) error {
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := client.PutObject(
		context.Background(),
		bucket,
		objectName,
		reader,
		size,
		minio.PutObjectOptions{ContentType: contentType},
	)
	return err
}

func sanitizeFilename(name string) string {
	base := filepath.Base(name)
	if base == "." || base == "/" || base == "" {
		return "audio"
	}
	builder := strings.Builder{}
	for _, r := range base {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			builder.WriteRune(r)
			continue
		}
		builder.WriteRune('_')
	}
	return builder.String()
}

func publishUploadFailed(node *centrifuge.Node, sessionID uint, message string) {
	if node == nil {
		return
	}
	ws.PublishToSession(
		node,
		sessionID,
		ws.UploadFailedNotification{
			Type:      ws.TypeUploadFailed,
			SessionID: sessionID,
			Error:     message,
		},
		"upload_failed",
	)
}
