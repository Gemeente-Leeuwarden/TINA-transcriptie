package models

import "gorm.io/gorm"

type PlatformRole string

const (
	PlatformRoleUser  PlatformRole = "user"
	PlatformRoleAdmin PlatformRole = "admin"
)

type UserRole struct {
	gorm.Model

	UserID uint         `gorm:"uniqueIndex"`
	Role   PlatformRole `gorm:"not null;default:user"`
	User   User         `gorm:"foreignKey:UserID"`
}

func (UserRole) TableName() string {
	return "user_roles"
}
