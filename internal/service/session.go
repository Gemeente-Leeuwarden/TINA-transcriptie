package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"platform/internal/database/models"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SessionService struct {
	db *gorm.DB
}

func NewSessionService(db *gorm.DB) *SessionService {
	return &SessionService{db: db}
}

const inviteCodeLength = 8

var inviteAlphabet = []byte("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

func randomInviteCode(length int) (string, error) {
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i := range buf {
		buf[i] = inviteAlphabet[int(buf[i])%len(inviteAlphabet)]
	}
	return string(buf), nil
}

func (s *SessionService) generateUniqueInviteCode() (string, error) {
	for i := 0; i < 8; i++ {
		code, err := randomInviteCode(inviteCodeLength)
		if err != nil {
			return "", err
		}
		var count int64
		if err := s.db.Model(&models.Session{}).Where("invite_code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return code, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique invite code")
}

func (s *SessionService) CreateNewSession(user *models.User, purposeID uint) (*models.Session, error) {
	var session models.Session
	err := s.db.Transaction(func(tx *gorm.DB) error {
		code, err := s.generateUniqueInviteCode()
		if err != nil {
			return err
		}
		session = models.Session{
			Status:     models.StatusNew,
			InviteCode: code,
			PurposeID:  &purposeID,
		}
		if err := tx.Create(&session).Error; err != nil {
			return err
		}

		link := models.UserXSession{
			UserID:    user.ID,
			SessionID: session.ID,
			Role:      models.RoleOwner,
		}
		return tx.Create(&link).Error
	})
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) IsPurposeAssigned(purposeID uint) (bool, error) {
	var count int64
	if err := s.db.Model(&models.Session{}).Where("purpose_id = ?", purposeID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *SessionService) GetByID(sessionID uint) (*models.Session, error) {
	var session models.Session
	err := s.db.First(&session, sessionID).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetByIDWithUploads(sessionID uint) (*models.Session, error) {
	var session models.Session
	err := s.db.
		Preload("Uploads").
		Preload("Purpose").
		Preload("Purpose.Limitations").
		Preload("Purpose.RetentionPeriod").
		Preload("Purpose.Prompt").
		First(&session, sessionID).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetByIDWithPurpose(sessionID uint) (*models.Session, error) {
	var session models.Session
	err := s.db.
		Preload("Purpose").
		Preload("Purpose.Limitations").
		Preload("Purpose.RetentionPeriod").
		Preload("Purpose.Prompt").
		First(&session, sessionID).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetActiveSessionByInviteCode(inviteCode string) (*models.Session, error) {
	var session models.Session
	err := s.db.
		Where("invite_code = ? AND status IN ?", inviteCode, []models.SessionStatus{models.StatusNew, models.StatusRecording}).
		First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetByUser(user *models.User) (*models.Session, error) {
	var session models.Session
	err := s.db.
		Joins("JOIN user_x_sessions ON user_x_sessions.session_id = sessions.id").
		Where("user_x_sessions.user_id = ?", user.ID).
		First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetActiveSessionByUser(user *models.User) (*models.Session, error) {
	var session models.Session
	err := s.db.
		Joins("JOIN user_x_sessions ON user_x_sessions.session_id = sessions.id").
		Where("user_x_sessions.user_id = ? AND sessions.status IN ?", user.ID, []models.SessionStatus{models.StatusNew, models.StatusRecording}).
		First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &session, nil
}

func (s *SessionService) GetActiveSessionsByUser(userID uint) ([]models.UserXSession, error) {
	var links []models.UserXSession
	err := s.db.
		Preload("Session").
		Preload("Session.Purpose").
		Preload("Session.Purpose.Limitations").
		Preload("Session.Purpose.RetentionPeriod").
		Preload("Session.Purpose.Prompt").
		Joins("JOIN sessions ON sessions.id = user_x_sessions.session_id").
		Where("user_x_sessions.user_id = ? AND sessions.status IN ?", userID, []models.SessionStatus{models.StatusNew, models.StatusRecording}).
		Find(&links).Error
	if err != nil {
		return nil, err
	}
	return links, nil
}

func (s *SessionService) GetPastSessionsByUser(userID uint) ([]models.UserXSession, error) {
	var links []models.UserXSession
	err := s.db.
		Preload("Session").
		Joins("JOIN sessions ON sessions.id = user_x_sessions.session_id").
		Where("user_x_sessions.user_id = ? AND sessions.status NOT IN ?", userID, []models.SessionStatus{models.StatusNew, models.StatusRecording}).
		Order("sessions.updated_at desc").
		Find(&links).Error
	if err != nil {
		return nil, err
	}
	return links, nil
}

func (s *SessionService) GetPastSessionsByUserPaged(userID uint, page, pageSize int, role *models.UserSessionRole) ([]models.UserXSession, int64, error) {
	base := s.db.Model(&models.UserXSession{}).
		Joins("JOIN sessions ON sessions.id = user_x_sessions.session_id").
		Where("user_x_sessions.user_id = ? AND sessions.status NOT IN ?", userID, []models.SessionStatus{models.StatusNew, models.StatusRecording})

	if role != nil {
		if *role == models.RoleOwner {
			base = base.Where("user_x_sessions.role = ?", models.RoleOwner)
		} else {
			base = base.Where("user_x_sessions.role != ?", models.RoleOwner)
		}
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var links []models.UserXSession
	err := base.
		Preload("Session").
		Order("sessions.updated_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&links).Error
	if err != nil {
		return nil, 0, err
	}
	return links, total, nil
}

func (s *SessionService) AddUpload(sessionID uint, fileName, objectName string) error {
	upload := models.SessionUpload{
		SessionID:  sessionID,
		FileName:   fileName,
		ObjectName: objectName,
	}
	return s.db.Create(&upload).Error
}

func (s *SessionService) GetUploads(sessionID uint) ([]models.SessionUpload, error) {
	var uploads []models.SessionUpload
	if err := s.db.Where("session_id = ?", sessionID).Order("created_at asc").Find(&uploads).Error; err != nil {
		return nil, err
	}
	return uploads, nil
}

func (s *SessionService) UpdateStatus(session *models.Session, status models.SessionStatus) error {
	return s.db.Model(session).Update("status", status).Error
}

func (s *SessionService) UpdateTranscription(session *models.Session, transcription string) error {
	return s.db.Model(session).Updates(map[string]any{
		"transcription": transcription,
		"status":        models.StatusFinished,
	}).Error
}

func (s *SessionService) SaveTranscriptLines(sessionID uint, lines []models.TranscriptLine) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("session_id = ?", sessionID).Delete(&models.TranscriptLine{}).Error; err != nil {
			return err
		}
		if len(lines) == 0 {
			return nil
		}
		return tx.Create(&lines).Error
	})
}

func (s *SessionService) GetTranscriptLines(sessionID uint) ([]models.TranscriptLine, error) {
	var lines []models.TranscriptLine
	if err := s.db.Where("session_id = ?", sessionID).Order("sequence asc").Find(&lines).Error; err != nil {
		return nil, err
	}
	return lines, nil
}

func (s *SessionService) CreatePromptResult(sessionID, promptID uint) (*models.SessionPromptResult, error) {
	result := models.SessionPromptResult{
		SessionID: sessionID,
		PromptID:  promptID,
		Status:    models.PromptStatusQueued,
	}
	if err := s.db.Create(&result).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("Prompt").First(&result, result.ID).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *SessionService) ListPromptResults(sessionID uint) ([]models.SessionPromptResult, error) {
	var results []models.SessionPromptResult
	if err := s.db.
		Preload("Prompt").
		Where("session_id = ?", sessionID).
		Order("created_at desc").
		Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (s *SessionService) UpdatePromptResult(resultID uint, status models.SessionPromptStatus, result, errorMessage string) error {
	return s.db.Model(&models.SessionPromptResult{}).
		Where("id = ?", resultID).
		Updates(map[string]any{
			"status": status,
			"result": result,
			"error":  errorMessage,
		}).Error
}

func (s *SessionService) DeletePromptResult(sessionID, resultID uint) error {
	res := s.db.Where("id = ? AND session_id = ?", resultID, sessionID).Delete(&models.SessionPromptResult{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *SessionService) UpdateSpeakerNames(session *models.Session, speakerNames string) error {
	return s.db.Model(session).Update("speaker_names", speakerNames).Error
}

func (s *SessionService) DeleteTranscriptLines(sessionID uint) error {
	return s.db.Where("session_id = ?", sessionID).Delete(&models.TranscriptLine{}).Error
}

func (s *SessionService) AddUserToSession(userID, sessionID uint, role models.UserSessionRole) error {
	link := models.UserXSession{
		UserID:    userID,
		SessionID: sessionID,
		Role:      role,
	}
	return s.db.Create(&link).Error
}

func (s *SessionService) HasUserAccess(userID, sessionID uint) (bool, error) {
	var count int64
	err := s.db.Model(&models.UserXSession{}).
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *SessionService) GetUserRole(userID, sessionID uint) (models.UserSessionRole, error) {
	var link models.UserXSession
	err := s.db.
		Where("user_id = ? AND session_id = ?", userID, sessionID).
		First(&link).Error
	if err != nil {
		return "", err
	}
	return link.Role, nil
}

func (s *SessionService) GetSessionUserIDs(sessionID uint) ([]uint, error) {
	var rows []models.UserXSession
	if err := s.db.Where("session_id = ?", sessionID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]uint, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.UserID)
	}
	return out, nil
}

type SessionMember struct {
	UserID uint
	Email  string
	Role   models.UserSessionRole
}

func (s *SessionService) GetSessionMembers(sessionID uint) ([]SessionMember, error) {
	var rows []models.UserXSession
	if err := s.db.Preload("User").Where("session_id = ?", sessionID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]SessionMember, 0, len(rows))
	for _, row := range rows {
		out = append(out, SessionMember{
			UserID: row.UserID,
			Email:  row.User.Email,
			Role:   row.Role,
		})
	}
	return out, nil
}

func (s *SessionService) RemoveUserFromSession(userID, sessionID uint) error {
	return s.db.Where("user_id = ? AND session_id = ?", userID, sessionID).
		Delete(&models.UserXSession{}).Error
}

func (s *SessionService) GetQueueChannelName(channel string) string {
	return fmt.Sprintf("session-%s", channel)
}

func (s *SessionService) UpsertSegment(segment *models.SessionSegment) error {
	return s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "session_id"},
			{Name: "user_id"},
			{Name: "sequence"},
		},
		DoUpdates: clause.AssignmentColumns([]string{
			"object_name",
			"content_type",
			"started_at",
			"ended_at",
			"updated_at",
		}),
	}).Create(segment).Error
}

func (s *SessionService) GetSegmentByID(segmentID uint) (*models.SessionSegment, error) {
	var segment models.SessionSegment
	if err := s.db.First(&segment, segmentID).Error; err != nil {
		return nil, err
	}
	return &segment, nil
}

func (s *SessionService) UpdateSegmentResult(segmentID uint, transcript, summary string) error {
	return s.db.Model(&models.SessionSegment{}).
		Where("id = ?", segmentID).
		Updates(map[string]interface{}{
			"transcript": transcript,
			"summary":    summary,
			"updated_at": time.Now(),
		}).Error
}

func (s *SessionService) GetSegmentByKey(sessionID, userID uint, sequence int) (*models.SessionSegment, error) {
	var segment models.SessionSegment
	if err := s.db.Where("session_id = ? AND user_id = ? AND sequence = ?", sessionID, userID, sequence).
		First(&segment).Error; err != nil {
		return nil, err
	}
	return &segment, nil
}

func (s *SessionService) GetSegmentsBySession(sessionID uint) ([]models.SessionSegment, error) {
	var segments []models.SessionSegment
	if err := s.db.
		Where("session_id = ?", sessionID).
		Order("sequence asc").
		Find(&segments).Error; err != nil {
		return nil, err
	}
	return segments, nil
}

func (s *SessionService) DeleteSegmentsBySession(sessionID uint) (int64, error) {
	result := s.db.Where("session_id = ?", sessionID).Delete(&models.SessionSegment{})
	if result.Error != nil {
		return 0, result.Error
	}
	return result.RowsAffected, nil
}
