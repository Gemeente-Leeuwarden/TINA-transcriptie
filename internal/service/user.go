package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"platform/internal/database/models"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

type ManagedUser struct {
	ID        uint
	Email     string
	Source    models.UserSource
	Role      models.PlatformRole
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func (u *UserService) Create(user *models.User) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user.Password = string(hashedPassword)
	if err := u.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (u *UserService) CreateExternalUser(email string, source models.UserSource) (*models.User, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	hashedPassword, err := bcrypt.GenerateFromPassword(randomBytes, bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:    email,
		Password: string(hashedPassword),
		Source:   source,
	}
	if err := u.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (u *UserService) GetByID(id uint) (*models.User, error) {
	var user models.User
	if err := u.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UserService) GetByEmail(email string) (*models.User, error) {
	var user models.User
	if err := u.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (u *UserService) ListManagedUsersPaged(page int, pageSize int, source *models.UserSource, search string) ([]ManagedUser, int64, error) {
	baseQuery := u.db.Model(&models.User{})
	if source != nil {
		baseQuery = baseQuery.Where("source = ?", *source)
	}
	if search != "" {
		baseQuery = baseQuery.Where("email ILIKE ?", "%"+search+"%")
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	query := u.db.Order("created_at desc").Order("id desc")
	if source != nil {
		query = query.Where("source = ?", *source)
	}
	if search != "" {
		query = query.Where("email ILIKE ?", "%"+search+"%")
	}

	var users []models.User
	if err := query.
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&users).Error; err != nil {
		return nil, 0, err
	}
	if len(users) == 0 {
		return []ManagedUser{}, total, nil
	}

	ids := make([]uint, 0, len(users))
	for _, row := range users {
		ids = append(ids, row.ID)
	}

	var roles []models.UserRole
	if err := u.db.Where("user_id IN ?", ids).Find(&roles).Error; err != nil {
		return nil, 0, err
	}
	roleByUser := make(map[uint]models.PlatformRole, len(roles))
	for _, row := range roles {
		if row.Role == "" {
			roleByUser[row.UserID] = models.PlatformRoleUser
			continue
		}
		roleByUser[row.UserID] = row.Role
	}

	out := make([]ManagedUser, 0, len(users))
	for _, row := range users {
		role, ok := roleByUser[row.ID]
		if !ok || role == "" {
			role = models.PlatformRoleUser
		}
		out = append(out, ManagedUser{
			ID:        row.ID,
			Email:     row.Email,
			Source:    row.Source,
			Role:      role,
			CreatedAt: row.CreatedAt,
			UpdatedAt: row.UpdatedAt,
		})
	}

	return out, total, nil
}

func (u *UserService) GetPlatformRole(userID uint) (models.PlatformRole, error) {
	var role models.UserRole
	if err := u.db.Where("user_id = ?", userID).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.PlatformRoleUser, nil
		}
		return models.PlatformRoleUser, err
	}
	if role.Role == "" {
		return models.PlatformRoleUser, nil
	}
	return role.Role, nil
}

func (u *UserService) SetPlatformRole(userID uint, role models.PlatformRole) error {
	if role == "" {
		role = models.PlatformRoleUser
	}
	entry := models.UserRole{
		UserID: userID,
		Role:   role,
	}
	return u.db.Where("user_id = ?", userID).Assign(models.UserRole{Role: role}).FirstOrCreate(&entry).Error
}

func (u *UserService) GetRedisMessageChannel(user *models.User) string {
	return fmt.Sprintf("user-message-%d", user.ID)
}

func (u *UserService) ListAllUserIDs() ([]uint, error) {
	var ids []uint
	if err := u.db.Model(&models.User{}).Pluck("id", &ids).Error; err != nil {
		return nil, err
	}
	return ids, nil
}

func (u *UserService) Update(user *models.User) (*models.User, error) {
	if err := u.db.Save(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}
