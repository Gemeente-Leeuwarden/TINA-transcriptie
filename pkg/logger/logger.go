package logger

import (
	"github.com/sirupsen/logrus"
)

var l *logrus.Logger

// InitLogger initializes the global logger
func InitLogger() error {
	l = logrus.New()
	l.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
	l.SetLevel(logrus.InfoLevel)
	return nil
}

// Logger returns the global logger instance
func Logger() *logrus.Logger {
	if l == nil {
		panic("logger not initialized - call InitLogger first")
	}
	return l
}
