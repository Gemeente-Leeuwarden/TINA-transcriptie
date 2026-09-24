package handler

import (
	"encoding/json"
	"strconv"
	"time"

	"platform/internal/database/models"
	"platform/internal/service"

	"github.com/gofiber/fiber/v3"
)

type TranscriptLineResponse struct {
	Sequence int    `json:"sequence"`
	Speaker  string `json:"speaker"`
	StartMs  int64  `json:"start_ms"`
	EndMs    int64  `json:"end_ms"`
	Text     string `json:"text"`
}

type SessionDetailResponse struct {
	SessionID       uint                     `json:"session_id"`
	Status          models.SessionStatus     `json:"status"`
	Role            models.UserSessionRole   `json:"role"`
	Transcription   string                   `json:"transcription"`
	TranscriptLines []TranscriptLineResponse `json:"transcript_lines"`
	SpeakerNames    map[string]string        `json:"speaker_names"`
	CreatedAt       string                   `json:"created_at"`
	UpdatedAt       string                   `json:"updated_at"`
	Files           []string                 `json:"files,omitempty"`
	Purpose         *PurposeResponse         `json:"purpose,omitempty"`
}

func GetSessionDetail(authService *service.AuthService, sessionService *service.SessionService) fiber.Handler {
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

		session, err := sessionService.GetByIDWithUploads(uint(sessionID))
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "sessie niet gevonden",
			})
		}

		role, err := sessionService.GetUserRole(claims.UserID, uint(sessionID))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "sessierol laden mislukt",
			})
		}

		files := make([]string, 0, len(session.Uploads))
		for _, upload := range session.Uploads {
			files = append(files, upload.FileName)
		}

		lines, _ := sessionService.GetTranscriptLines(uint(sessionID))
		lineResponses := make([]TranscriptLineResponse, 0, len(lines))
		for _, line := range lines {
			lineResponses = append(lineResponses, TranscriptLineResponse{
				Sequence: line.Sequence,
				Speaker:  line.Speaker,
				StartMs:  line.StartMs,
				EndMs:    line.EndMs,
				Text:     line.Text,
			})
		}

		speakerNames := make(map[string]string)
		if session.SpeakerNames != "" {
			_ = json.Unmarshal([]byte(session.SpeakerNames), &speakerNames)
		}

		return c.JSON(SessionDetailResponse{
			SessionID:       session.ID,
			Status:          session.Status,
			Role:            role,
			Transcription:   session.Transcription,
			TranscriptLines: lineResponses,
			SpeakerNames:    speakerNames,
			CreatedAt:       session.CreatedAt.Format(time.RFC3339),
			UpdatedAt:       session.UpdatedAt.Format(time.RFC3339),
			Files:           files,
			Purpose:         buildPurposeResponse(session.Purpose),
		})
	}
}
