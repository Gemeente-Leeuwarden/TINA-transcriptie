package apperror

import (
	"github.com/go-playground/validator/v10"
)

// ValidationErrorResponse represents a structured validation error response
type ValidationErrorResponse struct {
	Message string            `json:"message"`
	Code    string            `json:"code"`
	Fields  map[string]string `json:"fields"`
}

// ParseValidationError converts validator errors into a structured error response
func ParseValidationError(err error) ValidationErrorResponse {
	fieldErrors := make(map[string]string)

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			switch fieldError.Tag() {
			case "required":
				fieldErrors[field] = field + " is required"
			case "email":
				fieldErrors[field] = "Invalid email format"
			case "min":
				fieldErrors[field] = field + " must be at least " + fieldError.Param() + " characters"
			case "max":
				fieldErrors[field] = field + " must be at most " + fieldError.Param() + " characters"
			case "len":
				fieldErrors[field] = field + " must be exactly " + fieldError.Param() + " characters"
			case "gt":
				fieldErrors[field] = field + " must be greater than " + fieldError.Param()
			case "gte":
				fieldErrors[field] = field + " must be greater than or equal to " + fieldError.Param()
			case "lt":
				fieldErrors[field] = field + " must be less than " + fieldError.Param()
			case "lte":
				fieldErrors[field] = field + " must be less than or equal to " + fieldError.Param()
			default:
				fieldErrors[field] = field + " is invalid"
			}
		}
	} else {
		fieldErrors["general"] = err.Error()
	}

	return ValidationErrorResponse{
		Message: "Validation failed",
		Code:    "VALIDATION_ERROR",
		Fields:  fieldErrors,
	}
}
