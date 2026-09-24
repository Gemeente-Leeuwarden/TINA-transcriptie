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

func EndSession(
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
				"error": "alleen de eigenaar kan de sessie beeindigen",
			})
		}

		session, err := sessionService.GetByIDWithPurpose(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}
		if session.Status != models.StatusNew {
			return c.Status(400).JSON(fiber.Map{
				"error": "sessie kan niet worden beeindigd in de huidige status",
			})
		}

		if err := sessionService.UpdateStatus(session, models.StatusFinished); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessie beeindigen mislukt",
			})
		}

		if rabbitMQ != nil {
			segments, err := sessionService.GetSegmentsBySession(session.ID)
			if err != nil {
				logger.Logger().Error(fmt.Sprintf("Failed to load segments for session %d: %v", session.ID, err))
			} else {
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
				purposeInfo, promptInfo := q.BuildPurposePromptInfo(session.Purpose)
				msg, err := json.Marshal(q.MessageRecordingReady{
					Type:      q.MessageTypeRecordingReady,
					SessionID: fmt.Sprintf("%d", session.ID),
					Bucket:    minioBucket,
					Segments:  segInfos,
					Purpose:   purposeInfo,
					Prompt:    promptInfo,
				})
				if err != nil {
					logger.Logger().Error(fmt.Sprintf("Recording ready queue message marshal failed: %v", err))
				} else if err := rabbitMQ.Publish("", "session", msg); err != nil {
					logger.Logger().Error(fmt.Sprintf("Recording ready queue publish failed: %v", err))
				}
			}
		}

		if node != nil {
			ws.PublishToSession(
				node,
				session.ID,
				ws.SessionEndedNotification{
					Type:      ws.TypeSessionEnded,
					SessionID: session.ID,
				},
				"session_ended",
			)
			if userIDs, err := sessionService.GetSessionUserIDs(session.ID); err == nil {
				ws.PublishActiveSessionsUpdated(node, userIDs)
			}
		}

		return c.JSON(fiber.Map{
			"session_id": session.ID,
			"status":     session.Status,
		})
	}
}
