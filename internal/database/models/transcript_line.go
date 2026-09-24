package models

type TranscriptLine struct {
	ID uint `gorm:"primaryKey"`

	Text    string `gorm:"type:text;not null"`
	Speaker string `gorm:"size:64"`

	Sequence int `gorm:"not null"`
	StartMs  int64
	EndMs    int64

	SessionID uint    `gorm:"index;not null"`
	Session   Session `gorm:"foreignKey:SessionID"`
}
