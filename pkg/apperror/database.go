package apperror

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type DatabaseErrorResponse struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

func ParseDatabaseError(err error) DatabaseErrorResponse {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return DatabaseErrorResponse{
			Message: "This record already exists",
			Code:    "DUPLICATE_ENTRY",
		}
	}

	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return DatabaseErrorResponse{
			Message: "Related record not found",
			Code:    "FOREIGN_KEY_VIOLATION",
		}
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505":
			return DatabaseErrorResponse{
				Message: "This record already exists",
				Code:    "DUPLICATE_ENTRY",
			}
		case "23503":
			return DatabaseErrorResponse{
				Message: "Related record not found",
				Code:    "FOREIGN_KEY_VIOLATION",
			}
		case "23502":
			return DatabaseErrorResponse{
				Message: "Required field is missing",
				Code:    "NOT_NULL_VIOLATION",
			}
		}
	}

	return DatabaseErrorResponse{
		Message: "An error occurred while processing your request",
		Code:    "DATABASE_ERROR",
	}
}
