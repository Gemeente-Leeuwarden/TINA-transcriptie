package websocket

import "platform/internal/database/models"

func buildPurposeInfo(purpose *models.Purpose) *PurposeInfo {
	if purpose == nil || purpose.ID == 0 {
		return nil
	}
	resp := &PurposeInfo{
		ID:          purpose.ID,
		Title:       purpose.Title,
		Description: purpose.Description,
		PromptID:    purpose.PromptID,
	}
	if purpose.Prompt.ID != 0 {
		resp.Prompt = &PurposePromptInfo{
			ID:    purpose.Prompt.ID,
			Title: purpose.Prompt.Title,
		}
	}
	if purpose.Limitations.ID != 0 {
		resp.Limitations = &PurposeLimitationsInfo{
			InviteParticipants: purpose.Limitations.InviteParticipants,
			AllowAppRecording:  purpose.Limitations.AllowAppRecording,
		}
	}
	if purpose.RetentionPeriod.ID != 0 {
		resp.Retention = &PurposeRetentionInfo{
			AudioHours:         purpose.RetentionPeriod.AudioHours,
			TranscriptionHours: purpose.RetentionPeriod.TranscriptionHours,
			PromptsHours:       purpose.RetentionPeriod.PromptsHours,
		}
	}
	return resp
}
