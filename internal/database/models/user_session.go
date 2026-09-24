package models

type UserSessionRole string

const (
	RoleOwner  UserSessionRole = "owner"
	RoleEditor UserSessionRole = "editor"
	RoleViewer UserSessionRole = "viewer"
)

type UserXSession struct {
	UserID    uint            `gorm:"primaryKey"`
	SessionID uint            `gorm:"primaryKey"`
	Role      UserSessionRole `gorm:"not null"`
	User      User
	Session   Session
}

func (UserXSession) TableName() string {
	return "user_x_sessions"
}
