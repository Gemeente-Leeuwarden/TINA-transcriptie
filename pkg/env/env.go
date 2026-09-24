package env

import (
	"os"
	"strconv"
)

func GetStringEnv(key string, fallback string) string {
	v := os.Getenv(key)
	// check if v is empty
	if v == "" {
		return fallback
	}
	return v
}

func GetIntEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

func GetBoolEnv(key string, fallback bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}

	return b
}
