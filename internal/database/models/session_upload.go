package models

import "gorm.io/gorm"

type SessionUpload struct {
	gorm.Model

	SessionID  uint   `gorm:"index;not null"`
	FileName   string `gorm:"size:255;not null"`
	ObjectName string `gorm:"size:512;not null"`
}
