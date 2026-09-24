package database

import (
	"fmt"
	"platform/internal/config"
	"platform/internal/database/models"
	"platform/pkg/logger"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Database struct {
	Connection *gorm.DB
}

func CreateDatabase(databaseConfig config.DatabaseConfig) *Database {
	logger.Logger().Info(fmt.Sprintf("Connecting to database: host=%s user=%s database=%s", databaseConfig.Host, databaseConfig.User, databaseConfig.DBName))

	sslMode := "disable"
	if databaseConfig.SSLMode {
		sslMode = "enable"
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s TimeZone=%s",
		databaseConfig.Host,
		databaseConfig.User,
		databaseConfig.Password,
		databaseConfig.DBName,
		databaseConfig.Port,
		sslMode,
		databaseConfig.TimeZone,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	return &Database{
		Connection: db,
	}
}

func (d *Database) RunMigrations() error {
	err := d.Connection.AutoMigrate(
		&models.User{},
		&models.UserRole{},
		&models.Prompt{},
		&models.Purpose{},
		&models.PurposeRetentionPeriod{},
		&models.PurposeLimitations{},
		&models.Session{},
		&models.SessionUpload{},
		&models.SessionSegment{},
		&models.UserXSession{},
		&models.SessionPromptResult{},
		&models.TranscriptLine{},
	)
	if err != nil {
		return err
	}

	// Data fix: memberships written while the role constants were still empty
	// strings ("") predate real role values; those rows are all session
	// creators, so promote them to owner. Idempotent by the WHERE clause.
	return d.Connection.
		Exec("UPDATE user_x_sessions SET role = ? WHERE role = ''", models.RoleOwner).
		Error
}
