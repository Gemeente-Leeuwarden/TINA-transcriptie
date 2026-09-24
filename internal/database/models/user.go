package models

import "gorm.io/gorm"

type UserSource string

const (
	SourceLocal UserSource = ""
	SourceAzure UserSource = ""
)

type User struct {
	gorm.Model

	Email    string     `gorm:"uniqueIndex:idx_email"`
	Password string     `json:"-"`
	Source   UserSource `gorm:"not null;default:local"`
}
