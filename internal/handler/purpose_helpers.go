package handler

import "platform/internal/database/models"

type PurposeLimitationsResponse struct {
	InviteParticipants bool `json:"invite_participants"`
	AllowAppRecording  bool `json:"allow_app_recording"`
}

type PurposeRetentionResponse struct {
	AudioHours         uint `json:"audio_hours"`
	TranscriptionHours uint `json:"transcription_hours"`
	PromptsHours       uint `json:"prompts_hours"`
}

type PurposePromptResponse struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

type PurposeResponse struct {
	ID          uint                        `json:"id"`
	Title       string                      `json:"title"`
	Description string                      `json:"description"`
	PromptID    uint                        `json:"prompt_id"`
	Prompt      *PurposePromptResponse      `json:"prompt,omitempty"`
	Limitations *PurposeLimitationsResponse `json:"limitations,omitempty"`
	Retention   *PurposeRetentionResponse   `json:"retention,omitempty"`
}

func buildPurposeResponse(purpose *models.Purpose) *PurposeResponse {
	if purpose == nil || purpose.ID == 0 {
		return nil
	}
	resp := &PurposeResponse{
		ID:          purpose.ID,
		Title:       purpose.Title,
		Description: purpose.Description,
		PromptID:    purpose.PromptID,
	}
	if purpose.Prompt.ID != 0 {
		resp.Prompt = &PurposePromptResponse{
			ID:    purpose.Prompt.ID,
			Title: purpose.Prompt.Title,
		}
	}
	if purpose.Limitations.ID != 0 {
		resp.Limitations = &PurposeLimitationsResponse{
			InviteParticipants: purpose.Limitations.InviteParticipants,
			AllowAppRecording:  purpose.Limitations.AllowAppRecording,
		}
	}
	if purpose.RetentionPeriod.ID != 0 {
		resp.Retention = &PurposeRetentionResponse{
			AudioHours:         purpose.RetentionPeriod.AudioHours,
			TranscriptionHours: purpose.RetentionPeriod.TranscriptionHours,
			PromptsHours:       purpose.RetentionPeriod.PromptsHours,
		}
	}
	return resp
}
