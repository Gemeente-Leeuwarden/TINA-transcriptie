package queue

import "platform/internal/database/models"

func BuildPurposeInfo(purpose *models.Purpose) *PurposeInfo {
	if purpose == nil || purpose.ID == 0 {
		return nil
	}
	out := &PurposeInfo{
		ID:          purpose.ID,
		Title:       purpose.Title,
		Description: purpose.Description,
		PromptID:    purpose.PromptID,
	}
	if purpose.Limitations.ID != 0 {
		out.Limitations = &PurposeLimitations{
			InviteParticipants: purpose.Limitations.InviteParticipants,
			AllowAppRecording:  purpose.Limitations.AllowAppRecording,
		}
	}
	if purpose.RetentionPeriod.ID != 0 {
		out.Retention = &PurposeRetention{
			AudioHours:         purpose.RetentionPeriod.AudioHours,
			TranscriptionHours: purpose.RetentionPeriod.TranscriptionHours,
			PromptsHours:       purpose.RetentionPeriod.PromptsHours,
		}
	}
	return out
}

func BuildPromptInfo(prompt *models.Prompt) *PromptInfo {
	if prompt == nil || prompt.ID == 0 {
		return nil
	}
	return &PromptInfo{
		ID:      prompt.ID,
		Title:   prompt.Title,
		Content: prompt.Content,
	}
}

func BuildPurposePromptInfo(purpose *models.Purpose) (*PurposeInfo, *PromptInfo) {
	if purpose == nil {
		return nil, nil
	}
	return BuildPurposeInfo(purpose), BuildPromptInfo(&purpose.Prompt)
}
