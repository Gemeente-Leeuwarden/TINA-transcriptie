package queuehandler

import (
	"encoding/json"
	"fmt"
	"platform/internal/database/models"
	"platform/internal/queue"
	"platform/internal/service"
	ws "platform/internal/websocket"
	"platform/pkg/logger"
	"platform/pkg/rabbitmq"
	"strconv"
	"strings"

	"github.com/centrifugal/centrifuge"
)

func handleSegmentTranscription(payload queue.TranscriptionMessage, sessionService *service.SessionService, node *centrifuge.Node) {
	if payload.Payload.SegmentID == "" {
		logger.Logger().Error("transcription queue missing segment_id")
		return
	}
	segmentID, err := strconv.ParseUint(payload.Payload.SegmentID, 10, 64)
	if err != nil || segmentID == 0 {
		logger.Logger().Error(fmt.Sprintf("transcription queue invalid segment_id: %s", payload.Payload.SegmentID))
		return
	}
	if err := sessionService.UpdateSegmentResult(uint(segmentID), payload.Transcript, payload.Summary); err != nil {
		logger.Logger().Error(fmt.Sprintf("segment transcription update failed: %v", err))
		return
	}
	segment, err := sessionService.GetSegmentByID(uint(segmentID))
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("segment fetch failed: %v", err))
		return
	}

	ws.PublishToSession(
		node,
		segment.SessionID,
		ws.SegmentSummaryNotification{
			Type:        ws.TypeSegmentSummary,
			SessionID:   segment.SessionID,
			SegmentID:   segment.ID,
			UserID:      segment.UserID,
			Sequence:    segment.Sequence,
			Transcript:  payload.Transcript,
			Summary:     payload.Summary,
			StartedAtMs: segment.StartedAt.UnixMilli(),
			EndedAtMs:   segment.EndedAt.UnixMilli(),
		},
		"segment_summary",
	)
}

func buildTranscriptLines(sessionID uint, segments []queue.TranscriptionSegment) []models.TranscriptLine {
	speakerOrder := make(map[string]int)
	nextLabel := 1

	lines := make([]models.TranscriptLine, 0, len(segments))
	for i, seg := range segments {
		speaker := ""
		if seg.Speaker != nil && *seg.Speaker != "" {
			raw := *seg.Speaker
			if _, ok := speakerOrder[raw]; !ok {
				speakerOrder[raw] = nextLabel
				nextLabel++
			}
			speaker = fmt.Sprintf("Speaker %d", speakerOrder[raw])
		}
		lines = append(lines, models.TranscriptLine{
			SessionID: sessionID,
			Sequence:  i + 1,
			Speaker:   speaker,
			StartMs:   seg.StartMs,
			EndMs:     seg.EndMs,
			Text:      seg.Text,
		})
	}
	return lines
}

func handleSessionTranscription(payload queue.TranscriptionMessage, sessionService *service.SessionService, rabbitMQ *rabbitmq.Client, node *centrifuge.Node) {
	if payload.Payload.SessionID == "" {
		logger.Logger().Error("transcription queue missing session_id")
		return
	}
	sessionID, err := strconv.ParseUint(payload.Payload.SessionID, 10, 64)
	if err != nil || sessionID == 0 {
		logger.Logger().Error(fmt.Sprintf("transcription queue invalid session_id: %s", payload.Payload.SessionID))
		return
	}
	session, err := sessionService.GetByIDWithPurpose(uint(sessionID))
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("session fetch failed: %v", err))
		return
	}
	if err := sessionService.UpdateTranscription(session, payload.Transcript); err != nil {
		logger.Logger().Error(fmt.Sprintf("session transcription update failed: %v", err))
		return
	}

	if len(payload.Segments) > 0 {
		lines := buildTranscriptLines(uint(sessionID), payload.Segments)
		if err := sessionService.SaveTranscriptLines(uint(sessionID), lines); err != nil {
			logger.Logger().Error(fmt.Sprintf("saving transcript lines failed: %v", err))
		}
	}
	ws.PublishToSession(
		node,
		uint(sessionID),
		ws.UploadCompletedNotification{
			Type:          ws.TypeUploadCompleted,
			SessionID:     uint(sessionID),
			Transcription: payload.Transcript,
		},
		"upload_completed",
	)

	queuePurposePrompt(payload.Transcript, session, sessionService, rabbitMQ)

	members, err := sessionService.GetSessionMembers(uint(sessionID))
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("session fetch failed: %v", err))
	}

	if len(members) > 0 {
		for _, member := range members {
			ws.PublishToUser(
				node,
				member.UserID,
				ws.NotificationMessage{
					Type:    ws.TypeNotification,
					Level:   ws.NotificationLevelGood,
					Title:   fmt.Sprintf("sessie %d", uint(sessionID)),
					Message: "Transcriptie is klaar",
					Link:    fmt.Sprintf("/session/%d", uint(sessionID)),
					ID:      "transcription",
				},
				"transcription",
			)
		}
	}
}

func queuePurposePrompt(transcription string, session *models.Session, sessionService *service.SessionService, rabbitMQ *rabbitmq.Client) {
	if rabbitMQ == nil {
		return
	}
	if session == nil || session.Purpose == nil || session.Purpose.Prompt.ID == 0 {
		return
	}
	if strings.TrimSpace(transcription) == "" {
		return
	}

	result, err := sessionService.CreatePromptResult(session.ID, session.Purpose.Prompt.ID)
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("prompt result create failed: %v", err))
		return
	}

	msg, err := json.Marshal(queue.PromptApplyMessage{
		Type:           queue.MessageTypePromptApply,
		PromptResultID: fmt.Sprintf("%d", result.ID),
		SessionID:      fmt.Sprintf("%d", session.ID),
		PromptID:       fmt.Sprintf("%d", session.Purpose.Prompt.ID),
		PromptTitle:    session.Purpose.Prompt.Title,
		PromptContent:  session.Purpose.Prompt.Content,
		Transcription:  transcription,
	})
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("prompt apply marshal failed: %v", err))
		_ = sessionService.UpdatePromptResult(result.ID, models.PromptStatusFailed, "", err.Error())
		return
	}
	if err := rabbitMQ.Publish("", "session", msg); err != nil {
		logger.Logger().Error(fmt.Sprintf("prompt apply publish failed: %v", err))
		_ = sessionService.UpdatePromptResult(result.ID, models.PromptStatusFailed, "", err.Error())
	}
}

func handlePromptApplied(payload queue.PromptAppliedMessage, sessionService *service.SessionService, node *centrifuge.Node) {
	if payload.PromptResultID == "" {
		logger.Logger().Error("prompt applied missing prompt_result_id")
		return
	}
	resultID, err := strconv.ParseUint(payload.PromptResultID, 10, 64)
	if err != nil || resultID == 0 {
		logger.Logger().Error(fmt.Sprintf("prompt applied invalid prompt_result_id: %s", payload.PromptResultID))
		return
	}
	status := models.PromptStatusCompleted
	if strings.TrimSpace(payload.Error) != "" {
		status = models.PromptStatusFailed
	}
	if err := sessionService.UpdatePromptResult(uint(resultID), status, payload.Result, payload.Error); err != nil {
		logger.Logger().Error(fmt.Sprintf("prompt result update failed: %v", err))
	}

	sessionID, err := strconv.ParseUint(payload.SessionID, 10, 64)
	if err != nil || sessionID == 0 || node == nil {
		return
	}

	members, err := sessionService.GetSessionMembers(uint(sessionID))
	if err != nil {
		logger.Logger().Error(fmt.Sprintf("session members fetch failed: %v", err))
		return
	}

	title := "Prompt afgerond"
	message := "De prompt is verwerkt."
	level := ws.NotificationLevelGood
	if strings.TrimSpace(payload.PromptTitle) != "" {
		message = fmt.Sprintf("Prompt '%s' is verwerkt.", payload.PromptTitle)
	}
	if strings.TrimSpace(payload.Error) != "" {
		title = "Prompt mislukt"
		message = payload.Error
		level = ws.NotificationLevelBad
	}

	for _, member := range members {
		ws.PublishToUser(
			node,
			member.UserID,
			ws.NotificationMessage{
				Type:    ws.TypeNotification,
				Level:   level,
				Title:   title,
				Message: message,
				Link:    fmt.Sprintf("/session/%d", uint(sessionID)),
				ID:      fmt.Sprintf("prompt-%d", resultID),
			},
			"notification",
		)
	}
}

func HandleTranscriptionMessage(message []byte, sessionService *service.SessionService, rabbitMQ *rabbitmq.Client, node *centrifuge.Node) {
	var base struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(message, &base); err != nil {
		logger.Logger().Error(fmt.Sprintf("transcription queue unmarshal failed: %v", err))
		return
	}

	if base.Type == queue.MessageTypePromptApplied {
		var promptPayload queue.PromptAppliedMessage
		if err := json.Unmarshal(message, &promptPayload); err != nil {
			logger.Logger().Error(fmt.Sprintf("prompt applied unmarshal failed: %v", err))
			return
		}
		handlePromptApplied(promptPayload, sessionService, node)
		return
	}

	var payload queue.TranscriptionMessage
	if err := json.Unmarshal(message, &payload); err != nil {
		logger.Logger().Error(fmt.Sprintf("transcription queue unmarshal failed: %v", err))
		return
	}

	switch payload.Type {
	case "segment_transcribed":
		handleSegmentTranscription(payload, sessionService, node)
	case "session_transcribed", "upload_transcribed":
		handleSessionTranscription(payload, sessionService, rabbitMQ, node)
	default:
		logger.Logger().Info(fmt.Sprintf("transcription queue ignoring type: %s", payload.Type))
	}
}
