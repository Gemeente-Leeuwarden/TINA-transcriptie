package apperror

import "platform/pkg/logger"

func Check(err error) {
	if err != nil {
		logger.Logger().Fatal(err)
	}
}
