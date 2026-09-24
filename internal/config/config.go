package config

import (
	"platform/pkg/env"
)

type DatabaseConfig struct {
	Host     string
	User     string
	Password string
	DBName   string
	Port     int
	SSLMode  bool
	TimeZone string
}

type AuthConfig struct {
	JWT   JWTConfig
	Azure AzureAuthConfig
}

type JWTConfig struct {
	Secret          string
	DurationInHours int
}

type AzureAuthConfig struct {
	EncryptionKey    string
	TenantId         string
	ClientId         string
	ClientSecret     string
	RedirectURL      string
	Scopes           string
	FrontendLoginURL string
	UserGroupName    string
	AdminGroupName   string
}

type RedisConfig struct {
	URL string
}

type MinioConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

type RabbitMQConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	VHost    string
	MgmtPort int
}

type VoskConfig struct {
	ModelPath  string
	SampleRate int
}

type WhisperConfig struct {
	CallbackToken string
}

type Config struct {
	Database     DatabaseConfig
	Auth         AuthConfig
	FeatureFlags FeatureFlagsConfig
	WebServer    WebServerConfig
	Redis        RedisConfig
	Minio        MinioConfig
	Vosk         VoskConfig
	RabbitMQ     RabbitMQConfig
	Whisper      WhisperConfig
}

type WebServerConfig struct {
	Port int
}

type FeatureFlagsConfig struct {
	LocalAuthEnabled    bool
	RegistrationEnabled bool
	AzureAuthEnabled    bool
	WebsocketEnabled    bool
}

func CreateConfig() Config {
	return Config{
		Redis: RedisConfig{
			URL: env.GetStringEnv("REDIS_URL", ""),
		},
		WebServer: WebServerConfig{
			Port: env.GetIntEnv("WEB_SERVER_PORT", 8080),
		},
		Auth: AuthConfig{
			JWT: JWTConfig{
				Secret:          env.GetStringEnv("JWT_SECRET", ""),
				DurationInHours: env.GetIntEnv("JWT_DURATION_IN_HOURS", 0),
			},
			Azure: AzureAuthConfig{
				TenantId:         env.GetStringEnv("AZURE_TENANT_ID", ""),
				ClientId:         env.GetStringEnv("AZURE_CLIENT_ID", ""),
				ClientSecret:     env.GetStringEnv("AZURE_CLIENT_SECRET", ""),
				EncryptionKey:    env.GetStringEnv("AZURE_ENCRYPTION_KEY", ""),
				RedirectURL:      env.GetStringEnv("AZURE_REDIRECT_URL", ""),
				Scopes:           env.GetStringEnv("AZURE_SCOPES", ""),
				FrontendLoginURL: env.GetStringEnv("AZURE_FRONTEND_LOGIN_URL", ""),
				UserGroupName:    env.GetStringEnv("AZURE_USER_GROUP", ""),
				AdminGroupName:   env.GetStringEnv("AZURE_ADMIN_GROUP", ""),
			},
		},
		FeatureFlags: FeatureFlagsConfig{
			LocalAuthEnabled:    env.GetBoolEnv("FEATURE_LOCAL_AUTH_ENABLED", false),
			RegistrationEnabled: env.GetBoolEnv("FEATURE_REGISTRATION_ENABLED", false),
			AzureAuthEnabled:    env.GetBoolEnv("FEATURE_AZURE_AUTH_ENABLED", false),
			WebsocketEnabled:    env.GetBoolEnv("FEATURE_WEBSOCKET_ENABLED", false),
		},
		Minio: MinioConfig{
			Endpoint:  env.GetStringEnv("MINIO_ENDPOINT", ""),
			AccessKey: env.GetStringEnv("MINIO_ACCESS_KEY", ""),
			SecretKey: env.GetStringEnv("MINIO_SECRET_KEY", ""),
			Bucket:    env.GetStringEnv("MINIO_BUCKET", ""),
			UseSSL:    env.GetBoolEnv("MINIO_USE_SSL", false),
		},
		Vosk: VoskConfig{
			ModelPath:  env.GetStringEnv("VOSK_MODEL_PATH", ""),
			SampleRate: env.GetIntEnv("VOSK_SAMPLE_RATE", 0),
		},
		RabbitMQ: RabbitMQConfig{
			Host:     env.GetStringEnv("RABBITMQ_HOST", ""),
			Port:     env.GetIntEnv("RABBITMQ_PORT", 0),
			Username: env.GetStringEnv("RABBITMQ_USERNAME", ""),
			Password: env.GetStringEnv("RABBITMQ_PASSWORD", ""),
			VHost:    env.GetStringEnv("RABBITMQ_VHOST", "/"),
			MgmtPort: env.GetIntEnv("RABBITMQ_MANAGEMENT_PORT", 0),
		},
		Whisper: WhisperConfig{
			CallbackToken: env.GetStringEnv("WHISPER_CALLBACK_TOKEN", ""),
		},
		Database: DatabaseConfig{
			Host:     env.GetStringEnv("DB_HOST", ""),
			User:     env.GetStringEnv("DB_USER", ""),
			Password: env.GetStringEnv("DB_PASSWORD", ""),
			DBName:   env.GetStringEnv("DB_NAME", ""),
			Port:     env.GetIntEnv("DB_PORT", 0),
			SSLMode:  env.GetBoolEnv("DB_SSLMODE", false),
			TimeZone: env.GetStringEnv("DB_TIMEZONE", ""),
		},
	}
}
