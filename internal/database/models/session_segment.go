package models

import (
	"time"

	"gorm.io/gorm"
)

type SessionSegment struct {
	gorm.Model

	SessionID   uint   `gorm:"index;not null;uniqueIndex:idx_segment"`
	UserID      uint   `gorm:"index;not null;uniqueIndex:idx_segment"`
	Sequence    int    `gorm:"not null;uniqueIndex:idx_segment"`
	ObjectName  string `gorm:"size:512;not null"`
	ContentType string `gorm:"size:128;not null"`
	StartedAt   time.Time
	EndedAt     time.Time
	Transcript  string `gorm:"type:text"`
	Summary     string `gorm:"type:text"`

	User    User    `gorm:"foreignKey:UserID"`
	Session Session `gorm:"foreignKey:SessionID"`
}
