package models

import "gorm.io/gorm"

type Purpose struct {
	gorm.Model

	Title       string `gorm:"not null"`
	Description string `gorm:"not null"`
	PromptID    uint   `gorm:"not null;index"`
	Prompt      Prompt

	RetentionPeriod PurposeRetentionPeriod `gorm:"constraint:OnDelete:CASCADE;"`
	Limitations     PurposeLimitations     `gorm:"constraint:OnDelete:CASCADE;"`
	Session         Session                `gorm:"constraint:OnDelete:SET NULL;"`
}

type PurposeRetentionPeriod struct {
	gorm.Model
	PurposeID uint `gorm:"uniqueIndex;not null"`

	AudioHours         uint `gorm:"not null;default:0"`
	TranscriptionHours uint `gorm:"not null;default:0"`
	PromptsHours       uint `gorm:"not null;default:0"`
}

type PurposeLimitations struct {
	gorm.Model
	PurposeID uint `gorm:"uniqueIndex;not null"`

	InviteParticipants bool `json:"InviteParticipants"`
	AllowAppRecording  bool `json:"AllowAppRecording"`
}
