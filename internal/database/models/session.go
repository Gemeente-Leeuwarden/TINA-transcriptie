package models

import "gorm.io/gorm"

type SessionStatus string

const (
	StatusNew          SessionStatus = "new"
	StatusRecording    SessionStatus = "recording"
	StatusTranscribing SessionStatus = "transcribing"
	StatusFinished     SessionStatus = "finished"
	StatusError        SessionStatus = "error"
)

type Session struct {
	gorm.Model
	Status        SessionStatus `gorm:"not null;default:new" json:"status"`
	InviteCode    string        `gorm:"size:12;uniqueIndex" json:"invite_code"`
	PurposeID     *uint         `gorm:"not null" json:"purpose_id,omitempty"`
	Purpose       *Purpose
	Transcription string `gorm:"type:text" json:"transcription"`
	SpeakerNames  string `gorm:"type:text" json:"speaker_names"`
	Uploads       []SessionUpload
}
