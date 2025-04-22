package admin

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"time"

	"backend/internal/models"
	"backend/internal/services/auth"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// AdminService handles admin operations
type AdminService struct {
	db *sqlx.DB
}

// NewAdminService creates a new admin service
func NewAdminService(db *sqlx.DB) *AdminService {
	return &AdminService{
		db: db,
	}
}

// InitializeAdmin creates an admin account if none exists
func (s *AdminService) InitializeAdmin() error {
	// Check if admin account already exists
	var adminCount int
	err := s.db.Get(&adminCount, "SELECT COUNT(*) FROM users WHERE is_admin = true")
	if err != nil {
		return fmt.Errorf("failed to check for admin accounts: %w", err)
	}

	if adminCount > 0 {
		log.Println("Admin account already exists, skipping initialization")
		return nil
	}

	// Check specifically if 'admin' username is taken
	var adminExists bool
	err = s.db.Get(&adminExists, "SELECT EXISTS(SELECT 1 FROM users WHERE username = 'admin')")
	if err != nil {
		return fmt.Errorf("failed to check for admin username: %w", err)
	}

	// Generate a unique admin username if needed
	username := "admin"
	if adminExists {
		// If 'admin' is taken but not by an admin user, use a different username
		username = fmt.Sprintf("admin_%s", generateRandomString(6))
		log.Printf("Username 'admin' already taken by non-admin user. Using '%s' instead.", username)
	}

	// Generate random password
	password := generateRandomPassword(16)

	// Hash the password
	hashedPassword, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create admin user
	adminID := uuid.New().String()
	now := time.Now()

	// Insert admin user
	_, err = s.db.Exec(
		"INSERT INTO users (id, username, email, password_hash, is_admin, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		adminID, username, "admin@spartannet.com", hashedPassword, true, now, now,
	)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	// Output the admin credentials to the console
	log.Println("=========================================")
	log.Println("ADMIN ACCOUNT CREATED")
	log.Println("Username:", username)
	log.Println("Email: admin@spartannet.com")
	log.Println("Password:", password)
	log.Println("=========================================")

	return nil
}

// GenerateInviteCode creates a new invite code
func (s *AdminService) GenerateInviteCode(adminID string, expiryDays int) (*models.InviteCode, error) {
	// Generate random code
	code := generateRandomString(8)

	inviteID := uuid.New().String()
	now := time.Now()

	// Set expiry date if applicable
	var expiresAt *time.Time
	if expiryDays > 0 {
		expiry := now.AddDate(0, 0, expiryDays)
		expiresAt = &expiry
	}

	// Create invite code
	invite := models.InviteCode{
		ID:        inviteID,
		Code:      code,
		CreatedBy: adminID,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}

	// Insert into database
	_, err := s.db.Exec(
		"INSERT INTO invite_codes (id, code, created_by, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
		invite.ID, invite.Code, invite.CreatedBy, invite.ExpiresAt, invite.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create invite code: %w", err)
	}

	return &invite, nil
}

// GetInviteCodes retrieves all invite codes
func (s *AdminService) GetInviteCodes() ([]models.InviteCode, error) {
	var invites []models.InviteCode
	err := s.db.Select(&invites, `
        SELECT ic.*, 
            u.username AS used_by_username
        FROM invite_codes ic
        LEFT JOIN users u ON ic.used_by = u.id
        ORDER BY ic.created_at DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("failed to get invite codes: %w", err)
	}

	return invites, nil
}

// ValidateInviteCode checks if an invite code is valid
func (s *AdminService) ValidateInviteCode(code string) (bool, error) {
	// First, check if the code exists
	var exists bool
	err := s.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM invite_codes WHERE code = $1)", code)
	if err != nil {
		return false, fmt.Errorf("failed to check if invite code exists: %w", err)
	}

	if !exists {
		return false, nil
	}

	// Now check if it's valid (not used and not expired)
	var count int
	err = s.db.Get(&count, `
        SELECT COUNT(*) FROM invite_codes 
        WHERE code = $1 AND used_by IS NULL 
        AND (expires_at IS NULL OR expires_at > NOW())
    `, code)
	if err != nil {
		return false, fmt.Errorf("failed to validate invite code: %w", err)
	}

	return count > 0, nil
}

// MarkInviteCodeUsed marks an invite code as used
func (s *AdminService) MarkInviteCodeUsed(code string, userID string) error {
	now := time.Now()
	result, err := s.db.Exec(
		"UPDATE invite_codes SET used_by = $1, used_at = $2 WHERE code = $3 AND used_by IS NULL",
		userID, now, code,
	)
	if err != nil {
		return fmt.Errorf("failed to mark invite code as used: %w", err)
	}

	// Check if any rows were affected (the code exists and wasn't already used)
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("invite code already used or does not exist")
	}

	return nil
}

// Utility function to generate a random password
func generateRandomPassword(length int) string {
	return generateRandomString(length)
}

// Utility function to generate a random string
func generateRandomString(length int) string {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		// If random generation fails, use a timestamp-based fallback
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return base64.URLEncoding.EncodeToString(b)[:length]
}
