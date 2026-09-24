package service

import (
	"errors"
	"platform/internal/database/models"

	"gorm.io/gorm"
)

type PurposeService struct {
	db *gorm.DB
}

func NewPurposeService(db *gorm.DB) *PurposeService {
	return &PurposeService{db: db}
}

func (s *PurposeService) ListForUser(userID uint) ([]models.Purpose, error) {
	var purposes []models.Purpose
	q := s.db.
		Preload("Prompt").
		Preload("Limitations").
		Preload("RetentionPeriod").
		Joins("JOIN prompts ON prompts.id = purposes.prompt_id").
		Where("prompts.user_id = ? OR prompts.is_global = ?", userID, true).
		Order("purposes.updated_at desc").
		Order("purposes.id desc")

	if err := q.Find(&purposes).Error; err != nil {
		return nil, err
	}
	return purposes, nil
}

func (s *PurposeService) ListAll() ([]models.Purpose, error) {
	var purposes []models.Purpose
	q := s.db.
		Preload("Prompt").
		Preload("Limitations").
		Preload("RetentionPeriod").
		Order("purposes.updated_at desc").
		Order("purposes.id desc")

	if err := q.Find(&purposes).Error; err != nil {
		return nil, err
	}
	return purposes, nil
}

func (s *PurposeService) GetByIDForUser(id uint, userID uint) (*models.Purpose, error) {
	var purpose models.Purpose
	q := s.db.
		Preload("Prompt").
		Preload("Limitations").
		Preload("RetentionPeriod").
		Joins("JOIN prompts ON prompts.id = purposes.prompt_id").
		Where("purposes.id = ? AND (prompts.user_id = ? OR prompts.is_global = ?)", id, userID, true)

	if err := q.First(&purpose).Error; err != nil {
		return nil, err
	}
	return &purpose, nil
}

func (s *PurposeService) Create(
	purpose *models.Purpose,
	limitations *models.PurposeLimitations,
	retention *models.PurposeRetentionPeriod,
) (*models.Purpose, error) {
	if purpose == nil {
		return nil, nil
	}
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(purpose).Error; err != nil {
			return err
		}
		if limitations != nil {
			limitations.PurposeID = purpose.ID
			if err := tx.Create(limitations).Error; err != nil {
				return err
			}
		}
		if retention != nil {
			retention.PurposeID = purpose.ID
			if err := tx.Create(retention).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	if err := s.db.
		Preload("Prompt").
		Preload("Limitations").
		Preload("RetentionPeriod").
		First(purpose, purpose.ID).Error; err != nil {
		return nil, err
	}
	return purpose, nil
}

func (s *PurposeService) Update(
	id uint,
	updates *models.Purpose,
	limitations *models.PurposeLimitations,
	retention *models.PurposeRetentionPeriod,
) (*models.Purpose, error) {
	if updates == nil {
		return nil, nil
	}

	var purpose models.Purpose
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&purpose, id).Error; err != nil {
			return err
		}
		purpose.Title = updates.Title
		purpose.Description = updates.Description
		purpose.PromptID = updates.PromptID
		if err := tx.Save(&purpose).Error; err != nil {
			return err
		}

		if limitations != nil {
			var existing models.PurposeLimitations
			if err := tx.Where("purpose_id = ?", id).First(&existing).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					limitations.PurposeID = id
					if err := tx.Create(limitations).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				existing.InviteParticipants = limitations.InviteParticipants
				existing.AllowAppRecording = limitations.AllowAppRecording
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
			}
		}

		if retention != nil {
			var existing models.PurposeRetentionPeriod
			if err := tx.Where("purpose_id = ?", id).First(&existing).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					retention.PurposeID = id
					if err := tx.Create(retention).Error; err != nil {
						return err
					}
				} else {
					return err
				}
			} else {
				existing.AudioHours = retention.AudioHours
				existing.TranscriptionHours = retention.TranscriptionHours
				existing.PromptsHours = retention.PromptsHours
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	if err := s.db.
		Preload("Prompt").
		Preload("Limitations").
		Preload("RetentionPeriod").
		First(&purpose, id).Error; err != nil {
		return nil, err
	}
	return &purpose, nil
}

func (s *PurposeService) Delete(id uint) (bool, error) {
	deleted := false
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("purpose_id = ?", id).Delete(&models.PurposeLimitations{}).Error; err != nil {
			return err
		}
		if err := tx.Where("purpose_id = ?", id).Delete(&models.PurposeRetentionPeriod{}).Error; err != nil {
			return err
		}
		res := tx.Delete(&models.Purpose{}, id)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		deleted = true
		return nil
	}); err != nil {
		return false, err
	}
	return deleted, nil
}
