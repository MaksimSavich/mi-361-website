package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"backend/internal/models"
	"backend/internal/services/auth"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	db         *sqlx.DB
	jwtService *auth.JWTService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db *sqlx.DB, jwtService *auth.JWTService) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtService: jwtService,
	}
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	// Parse request
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Find user
	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE username = $1", req.Username)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Check password
	if err := auth.CheckPassword(req.Password, user.PasswordHash); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Create session
	sessionID := uuid.New().String()
	userAgent := c.GetHeader("User-Agent")
	clientIP := c.ClientIP()
	expiresAt := time.Now().Add(time.Duration(24*7) * time.Hour) // 1 week

	_, err = h.db.Exec(
		"INSERT INTO sessions (id, user_id, token, device, ip_address, last_active, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		sessionID, user.ID, "", userAgent, clientIP, time.Now(), expiresAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	// Generate JWT token
	token, _, err := h.jwtService.GenerateToken(&user, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Update session with token
	_, err = h.db.Exec("UPDATE sessions SET token = $1 WHERE id = $2", token, sessionID)
	if err != nil {
		// Log error but continue
		// logger.Error("Failed to update session token", "error", err)
	}

	// Create user response without sensitive information
	userResponse := models.UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Name:           user.Name,
		PhoneNumber:    user.PhoneNumber,
		ProfilePicture: user.ProfilePicture,
		CreatedAt:      user.CreatedAt,
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  userResponse,
	})
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	// Parse request
	var req struct {
		Username    string `json:"username" binding:"required"`
		Email       string `json:"email" binding:"required,email"`
		Password    string `json:"password" binding:"required,min=8"`
		Name        string `json:"name"`
		PhoneNumber string `json:"phoneNumber"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if username already exists
	var exists bool
	err := h.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", req.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Check if email already exists
	err = h.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	userID := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(
		"INSERT INTO users (id, username, email, password_hash, name, phone_number, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		userID, req.Username, req.Email, hashedPassword, req.Name, req.PhoneNumber, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create user response
	user := models.UserResponse{
		ID:          userID,
		Username:    req.Username,
		Email:       req.Email,
		Name:        req.Name,
		PhoneNumber: req.PhoneNumber,
		CreatedAt:   now,
	}

	// Return success
	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,
	})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get session ID from context
	sessionID, exists := c.Get("sessionID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Delete session
	_, err := h.db.Exec("DELETE FROM sessions WHERE id = $1", sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// GetSessions returns all active sessions for the user
func (h *AuthHandler) GetSessions(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	currentSessionID, _ := c.Get("sessionID")

	// Get sessions
	var sessions []models.Session
	err := h.db.Select(&sessions, "SELECT id, user_id, device, ip_address, last_active, expires_at, created_at FROM sessions WHERE user_id = $1 AND expires_at > NOW()", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get sessions"})
		return
	}

	// Mark current session
	for i := range sessions {
		if sessions[i].ID == currentSessionID {
			sessions[i].IsCurrent = true
		}
	}

	// Return sessions
	c.JSON(http.StatusOK, sessions)
}

// RevokeSession revokes a specific session
func (h *AuthHandler) RevokeSession(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse request
	var req struct {
		SessionID string `json:"sessionId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Delete session
	result, err := h.db.Exec("DELETE FROM sessions WHERE id = $1 AND user_id = $2", req.SessionID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke session"})
		return
	}

	// Check if session was deleted
	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found or already revoked"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Session revoked successfully"})
}

// RevokeAllSessions revokes all sessions except the current one
func (h *AuthHandler) RevokeAllSessions(c *gin.Context) {
	// Get user ID and session ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	sessionID, exists := c.Get("sessionID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Delete all sessions except current one
	_, err := h.db.Exec("DELETE FROM sessions WHERE user_id = $1 AND id != $2", userID, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke sessions"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "All other sbackend