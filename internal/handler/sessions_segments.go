package handler

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

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

type SegmentUploadResponse struct {
	SegmentID uint   `json:"segment_id"`
	SessionID uint   `json:"session_id"`
	Status    string `json:"status"`
}

type SegmentResultRequest struct {
	Transcript string `json:"transcript" validate:"required_without=Summary"`
	Summary    string `json:"summary" validate:"required_without=Transcript"`
}

type SegmentUploadForm struct {
	Sequence    int   `form:"sequence" validate:"required,gt=0"`
	StartedAtMs int64 `form:"started_at_ms" validate:"required,gt=0"`
	EndedAtMs   int64 `form:"ended_at_ms" validate:"required,gt=0,gtfield=StartedAtMs"`
}

func UploadSessionSegment(
	authService *service.AuthService,
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

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}

		var form SegmentUploadForm
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

		ses, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if ses.Status != models.StatusRecording {
			return c.Status(400).JSON(fiber.Map{
				"error": "sessie is niet aan het opnemen",
			})
		}

		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "bestand is verplicht",
			})
		}
		file, err := fileHeader.Open()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "kan bestand niet openen",
			})
		}
		defer file.Close()

		objectName := fmt.Sprintf(
			"segments/session_%d/user_%d/segment_%06d.pcm",
			sessionID,
			claims.UserID,
			form.Sequence,
		)
		contentType := fileHeader.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "audio/pcm"
		}

		if err := uploadToMinioReader(
			minioClient,
			minioBucket,
			objectName,
			file,
			fileHeader.Size,
			contentType,
		); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "opslaan in minio mislukt",
			})
		}

		segment := &models.SessionSegment{
			SessionID:   uint(sessionID),
			UserID:      claims.UserID,
			Sequence:    form.Sequence,
			ObjectName:  objectName,
			ContentType: contentType,
			StartedAt:   time.Unix(0, form.StartedAtMs*int64(time.Millisecond)),
			EndedAt:     time.Unix(0, form.EndedAtMs*int64(time.Millisecond)),
		}

		if err := sessionService.UpsertSegment(segment); err != nil {
			logger.Logger().Error(fmt.Sprintf("segment upsert failed: %v", err))
			return c.Status(500).JSON(fiber.Map{
				"error": "segment opslaan mislukt",
			})
		}

		segment, err = sessionService.GetSegmentByKey(uint(sessionID), claims.UserID, form.Sequence)
		if err != nil {
			logger.Logger().Error(fmt.Sprintf("segment fetch failed: %v", err))
			return c.Status(500).JSON(fiber.Map{
				"error": "segment opslaan mislukt",
			})
		}

		if rabbitMQ != nil {
			purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)
			msg, err := json.Marshal(q.MessageSegmentReady{
				Type:        q.MessageTypeSegmentReady,
				SegmentID:   fmt.Sprintf("%d", segment.ID),
				SessionID:   fmt.Sprintf("%d", sessionID),
				UserID:      fmt.Sprintf("%d", claims.UserID),
				Bucket:      minioBucket,
				ObjectName:  objectName,
				ContentType: contentType,
				StartedAtMs: form.StartedAtMs,
				EndedAtMs:   form.EndedAtMs,
				Purpose:     purposeInfo,
				Prompt:      promptInfo,
			})
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("segment queue marshal failed: %v", err))
				return c.Status(500).JSON(fiber.Map{
					"error": "segment in wachtrij zetten mislukt",
				})
			}
			// todo make this a reference
			if err := rabbitMQ.Publish("", "session", msg); err != nil {
				logger.Logger().Error(fmt.Sprintf("segment queue publish failed: %v", err))
				return c.Status(500).JSON(fiber.Map{
					"error": "segment in wachtrij zetten mislukt",
				})
			}
		}

		return c.Status(202).JSON(SegmentUploadResponse{
			SegmentID: segment.ID,
			SessionID: uint(sessionID),
			Status:    "queued",
		})
	}
}

type SegmentTimelineItem struct {
	SegmentID   uint   `json:"segment_id"`
	SessionID   uint   `json:"session_id"`
	UserID      uint   `json:"user_id"`
	Sequence    int    `json:"sequence"`
	Transcript  string `json:"transcript"`
	Summary     string `json:"summary"`
	StartedAtMs int64  `json:"started_at_ms"`
	EndedAtMs   int64  `json:"ended_at_ms"`
}

func ListSessionSegments(
	authService *service.AuthService,
	sessionService *service.SessionService,
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

		segments, err := sessionService.GetSegmentsBySession(uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "segmenten laden mislukt",
			})
		}

		items := make([]SegmentTimelineItem, 0, len(segments))
		for _, segment := range segments {
			items = append(items, SegmentTimelineItem{
				SegmentID:   segment.ID,
				SessionID:   segment.SessionID,
				UserID:      segment.UserID,
				Sequence:    segment.Sequence,
				Transcript:  segment.Transcript,
				Summary:     segment.Summary,
				StartedAtMs: segment.StartedAt.UnixMilli(),
				EndedAtMs:   segment.EndedAt.UnixMilli(),
			})
		}

		return c.JSON(fiber.Map{
			"segments": items,
		})
	}
}

func SegmentResult(
	callbackToken string,
	sessionService *service.SessionService,
	node *centrifuge.Node,
) fiber.Handler {
	return func(c fiber.Ctx) error {
		if callbackToken != "" {
			token := c.Get("X-Whisper-Token")
			if token == "" {
				token = c.Get("Authorization")
			}
			if token != callbackToken && token != fmt.Sprintf("Bearer %s", callbackToken) {
				return c.Status(401).JSON(fiber.Map{
					"error": "niet geautoriseerd",
				})
			}
		}

		sessionID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil || sessionID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig sessie-id",
			})
		}
		segmentID, err := strconv.ParseUint(c.Params("segmentId"), 10, 64)
		if err != nil || segmentID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldig segment-id",
			})
		}

		var req SegmentResultRequest
		if err := c.Bind().JSON(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "ongeldige payload",
			})
		}
		if err := validate.Struct(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": apperror.ParseValidationError(err),
			})
		}

		if err := sessionService.UpdateSegmentResult(uint(segmentID), req.Transcript, req.Summary); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "segment bijwerken mislukt",
			})
		}

		segment, err := sessionService.GetSegmentByID(uint(segmentID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "segment laden mislukt",
			})
		}

		if segment.SessionID != uint(sessionID) {
			return c.Status(400).JSON(fiber.Map{
				"error": "segment hoort niet bij deze sessie",
			})
		}

		if node != nil {
			ws.PublishToSession(
				node,
				uint(sessionID),
				ws.SegmentSummaryNotification{
					Type:        ws.TypeSegmentSummary,
					SessionID:   uint(sessionID),
					SegmentID:   segment.ID,
					UserID:      segment.UserID,
					Sequence:    segment.Sequence,
					Transcript:  req.Transcript,
					Summary:     req.Summary,
					StartedAtMs: segment.StartedAt.UnixMilli(),
					EndedAtMs:   segment.EndedAt.UnixMilli(),
				},
				"segment_summary",
			)
		}

		return c.JSON(fiber.Map{
			"segment_id": segment.ID,
			"status":     "updated",
		})
	}
}
