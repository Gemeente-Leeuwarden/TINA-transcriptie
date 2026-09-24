package models

import "gorm.io/gorm"

type SessionPromptStatus string

const (
	PromptStatusQueued    SessionPromptStatus = "queued"
	PromptStatusCompleted SessionPromptStatus = "completed"
	PromptStatusFailed    SessionPromptStatus = "failed"
)

type SessionPromptResult struct {
	gorm.Model

	SessionID uint                `gorm:"index;not null"`
	PromptID  uint                `gorm:"index;not null"`
	Status    SessionPromptStatus `gorm:"not null;default:queued"`
	Result    string              `gorm:"type:text"`
	Error     string              `gorm:"type:text"`

	Session Session `gorm:"foreignKey:SessionID"`
	Prompt  Prompt  `gorm:"foreignKey:PromptID"`
}
