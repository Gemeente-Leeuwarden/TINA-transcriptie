package service

import (
	"platform/internal/database/models"

	"gorm.io/gorm"
)

type PromptService struct {
	db *gorm.DB
}

func NewPromptService(db *gorm.DB) *PromptService {
	return &PromptService{db: db}
}

func (s *PromptService) ListForUser(userID uint) ([]models.Prompt, error) {
	var prompts []models.Prompt
	q := s.db.Preload("User").Order("is_global desc").Order("updated_at desc")
	if err := q.Where("user_id = ? OR is_global = ?", userID, true).Find(&prompts).Error; err != nil {
		return nil, err
	}
	return prompts, nil
}

func (s *PromptService) ListAllPaged(page int, pageSize int) ([]models.Prompt, int64, error) {
	var total int64
	if err := s.db.Model(&models.Prompt{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	var prompts []models.Prompt
	if err := s.db.
		Preload("User").
		Order("is_global desc").
		Order("updated_at desc").
		Order("id desc").
		Limit(pageSize).
		Offset(offset).
		Find(&prompts).Error; err != nil {
		return nil, 0, err
	}

	return prompts, total, nil
}

func (s *PromptService) GetByID(id uint) (*models.Prompt, error) {
	var prompt models.Prompt
	if err := s.db.Preload("User").First(&prompt, id).Error; err != nil {
		return nil, err
	}
	return &prompt, nil
}

func (s *PromptService) Create(prompt *models.Prompt) (*models.Prompt, error) {
	if err := s.db.Create(prompt).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("User").First(prompt, prompt.ID).Error; err != nil {
		return nil, err
	}
	return prompt, nil
}

func (s *PromptService) Update(prompt *models.Prompt) (*models.Prompt, error) {
	if err := s.db.Save(prompt).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("User").First(prompt, prompt.ID).Error; err != nil {
		return nil, err
	}
	return prompt, nil
}

func (s *PromptService) Delete(id uint) error {
	return s.db.Delete(&models.Prompt{}, id).Error
}
