package models

import "gorm.io/gorm"

type Prompt struct {
	gorm.Model

	Title    string `gorm:"size:160;not null"`
	Content  string `gorm:"type:text;not null"`
	UserID   uint   `gorm:"not null;index"`
	User     User   `gorm:"foreignKey:UserID"`
	IsGlobal bool   `gorm:"not null;default:false"`
	Purposes []Purpose
}
