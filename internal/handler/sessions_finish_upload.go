package handler

import (
	"encoding/json"
	"fmt"
	"platform/internal/database/models"
	q "platform/internal/queue"
	"platform/internal/service"
	ws "platform/internal/websocket"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"
	"strconv"

	"github.com/centrifugal/centrifuge"
	"github.com/gofiber/fiber/v3"
)

func FinishUploadSession(
	authService *service.AuthService,
	sessionService *service.SessionService,
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

		role, err := sessionService.GetUserRole(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessierol laden mislukt",
			})
		}
		if role != models.RoleOwner {
			return c.Status(403).JSON(fiber.Map{
				"error": "alleen de eigenaar kan de sessie afronden",
			})
		}

		ses, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if ses.Status == models.StatusFinished {
			return c.JSON(fiber.Map{
				"session_id": ses.ID,
				"status":     ses.Status,
			})
		}

		if err := sessionService.UpdateStatus(ses, models.StatusTranscribing); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessiestatus bijwerken mislukt",
			})
		}
		if userIDs, err := sessionService.GetSessionUserIDs(ses.ID); err == nil {
			ws.PublishActiveSessionsUpdated(node, userIDs)
		}

		segments, err := sessionService.GetSegmentsBySession(ses.ID)
		if err != nil {
			logger.Logger().Error(fmt.Sprintf("Failed to load segments for session %d: %v", ses.ID, err))
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

		if rabbitMQ != nil {
			purposeInfo, promptInfo := q.BuildPurposePromptInfo(ses.Purpose)
			msg, err := json.Marshal(q.MessageUploadFinalize{
				Type:      q.MessageTypeUploadFinalize,
				SessionID: fmt.Sprintf("%d", ses.ID),
				Bucket:    minioBucket,
				Segments:  segInfos,
				Purpose:   purposeInfo,
				Prompt:    promptInfo,
			})
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("Finalize queue message marshal failed: %v", err))
			} else if err := rabbitMQ.Publish("", "session", msg); err != nil {
				logger.Logger().Error(fmt.Sprintf("Finalize queue publish failed: %v", err))
			}
		}

		return c.JSON(fiber.Map{
			"session_id": ses.ID,
			"status":     ses.Status,
		})
	}
}
