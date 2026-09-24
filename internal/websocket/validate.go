package websocket

import "github.com/go-playground/validator/v10"

var requestValidator = validator.New()

func validateRequest(req any) error {
	return requestValidator.Struct(req)
}
