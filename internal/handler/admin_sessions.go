package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"platform/internal/database/models"
	q "platform/internal/queue"
	"platform/internal/service"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func requireAdmin(authService *service.AuthService, c fiber.Ctx) (*service.JWTClaims, error) {
	claims, err := authService.GetProfile(c)
	if err != nil {
		return nil, err
	}
	if claims.Role != models.PlatformRoleAdmin {
		return nil, fmt.Errorf("alleen admins hebben toegang")
	}
	return claims, nil
}

func AdminRetranscribeSegments(
	authService *service.AuthService,
	sessionService *service.SessionService,
	minioBucket string,
	rabbitMQ *rabbitmq.Client,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}
		if rabbitMQ == nil {
			return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "rabbitmq is niet beschikbaar",
			})
		}

		ses, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}

		purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)

		segments, err := sessionService.GetSegmentsBySession(uint(sessionID))
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "segmenten laden mislukt",
			})
		}
		if len(segments) == 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "geen segmenten gevonden",
			})
		}

		for _, seg := range segments {
			msg, err := json.Marshal(q.MessageSegmentReady{
				Type:        q.MessageTypeSegmentReady,
				SegmentID:   fmt.Sprintf("%d", seg.ID),
				SessionID:   fmt.Sprintf("%d", seg.SessionID),
				UserID:      fmt.Sprintf("%d", seg.UserID),
				Bucket:      minioBucket,
				ObjectName:  seg.ObjectName,
				ContentType: seg.ContentType,
				StartedAtMs: seg.StartedAt.UnixMilli(),
				EndedAtMs:   seg.EndedAt.UnixMilli(),
				Purpose:     purposeInfo,
				Prompt:      promptInfo,
			})
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("segment queue marshal failed: %v", err))
				continue
			}
			if err := rabbitMQ.Publish("", "session", msg); err != nil {
				logger.Logger().Error(fmt.Sprintf("segment queue publish failed: %v", err))
			}
		}

		return c.JSON(fiber.Map{
			"status":        "queued",
			"segment_count": len(segments),
		})
	}
}

func AdminRetranscribeSession(
	authService *service.AuthService,
	sessionService *service.SessionService,
	minioBucket string,
	rabbitMQ *rabbitmq.Client,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}
		if rabbitMQ == nil {
			return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "rabbitmq is niet beschikbaar",
			})
		}

		ses, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}

		purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)

		segments, err := sessionService.GetSegmentsBySession(ses.ID)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "segmenten laden mislukt",
			})
		}
		if err := sessionService.UpdateStatus(ses, models.StatusTranscribing); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "sessiestatus bijwerken mislukt",
			})
		}
		_ = sessionService.DeleteTranscriptLines(ses.ID)
		if len(segments) == 0 {
			uploads, err := sessionService.GetUploads(ses.ID)
			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
					"error": "uploads laden mislukt",
				})
			}
			if len(uploads) == 0 {
				return c.Status(http.StatusBadRequest).JSON(fiber.Map{
					"error": "geen segmenten of uploads gevonden",
				})
			}
			upload := uploads[len(uploads)-1]
			msg, err := json.Marshal(q.MessageUploadReady{
				Type:        q.MessageTypeUploadReady,
				SessionID:   fmt.Sprintf("%d", ses.ID),
				ObjectName:  upload.ObjectName,
				FileName:    upload.FileName,
				ContentType: "",
				Purpose:     purposeInfo,
				Prompt:      promptInfo,
			})
			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
					"error": "bericht maken mislukt",
				})
			}
			if err := rabbitMQ.Publish("", "session", msg); err != nil {
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
					"error": "transcriptie in wachtrij zetten mislukt",
				})
			}
			return c.JSON(fiber.Map{
				"status": "queued",
				"mode":   "upload",
			})
		}

		segInfos := make([]q.SegmentInfo, 0, len(segments))
		for _, seg := range segments {
			segInfos = append(segInfos, q.SegmentInfo{
				UserID:      fmt.Sprintf("%d", seg.UserID),
				ObjectName:  seg.ObjectName,
				ContentType: seg.ContentType,
				StartedAtMs: seg.StartedAt.UnixMilli(),
				EndedAtMs:   seg.EndedAt.UnixMilli(),
			})
		}

		msg, err := json.Marshal(q.MessageRecordingReady{
			Type:      q.MessageTypeRecordingReady,
			SessionID: fmt.Sprintf("%d", ses.ID),
			Bucket:    minioBucket,
			Segments:  segInfos,
			Purpose:   purposeInfo,
			Prompt:    promptInfo,
		})
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "bericht maken mislukt",
			})
		}
		if err := rabbitMQ.Publish("", "session", msg); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "transcriptie in wachtrij zetten mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"status":        "queued",
			"segment_count": len(segments),
		})
	}
}

func AdminRemoveSegments(
	authService *service.AuthService,
	sessionService *service.SessionService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}

		deleted, err := sessionService.DeleteSegmentsBySession(uint(sessionID))
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "segmenten verwijderen mislukt",
			})
		}

		return c.JSON(fiber.Map{
			"status":        "deleted",
			"segment_count": deleted,
		})
	}
}

func AdminRemoveTranscription(
	authService *service.AuthService,
	sessionService *service.SessionService,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if _, err := requireAdmin(authService, c); err != nil {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}

		ses, err := sessionService.GetByID(uint(sessionID))
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if err := sessionService.UpdateTranscription(ses, ""); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
				"error": "transcriptie wissen mislukt",
			})
		}
		_ = sessionService.DeleteTranscriptLines(uint(sessionID))

		return c.JSON(fiber.Map{
			"status": "cleared",
		})
	}
}
