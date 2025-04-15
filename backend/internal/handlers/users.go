package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/yourusername/photoshare/internal/models"
	"github.com/yourusername/photoshare/internal/services/auth"
)

// UserHandler handles user-related requests
type UserHandler struct {
	db *sqlx.DB
}

// NewUserHandler creates a new user handler
func NewUserHandler(db *sqlx.DB) *UserHandler {
	return &UserHandler{
		db: db,
	}
}

// GetCurrentUser returns the current user's profile
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Get user
	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	// Create user response
	userResponse := models.UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Name:           user.Name,
		PhoneNumber:    user.PhoneNumber,
		ProfilePicture: user.ProfilePicture,
		CreatedAt:      user.CreatedAt,
	}

	// Return user
	c.JSON(http.StatusOK, userResponse)
}

// UpdateUser updates the current user's profile
func (h *UserHandler) UpdateUser(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse request
	var req struct {
		Name        string `json:"name"`
		Email       string `json:"email" binding:"omitempty,email"`
		PhoneNumber string `json:"phoneNumber"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if email is already taken
	if req.Email != "" {
		var exists bool
		err := h.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)", req.Email, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		if exists {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}
	}

	// Update user
	_, err := h.db.Exec(
		"UPDATE users SET name = $1, email = $2, phone_number = $3, updated_at = $4 WHERE id = $5",
		req.Name, req.Email, req.PhoneNumber, time.Now(), userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Get updated user
	var user models.User
	err = h.db.Get(&user, "SELECT * FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated user"})
		return
	}

	// Create user response
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
		"message": "User updated successfully",
		"user":    userResponse,
	})
}

// UpdatePassword updates the current user's password
func (h *UserHandler) UpdatePassword(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse request
	var req struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get user
	var user models.User
	err := h.db.Get(&user, "SELECT * FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	// Check current password
	if err := auth.CheckPassword(req.CurrentPassword, user.PasswordHash); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	_, err = h.db.Exec(
		"UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
		hashedPassword, time.Now(), userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// DeleteUser deletes the current user
func (h *UserHandler) DeleteUser(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Start transaction
	tx, err := h.db.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Delete user's sessions
	_, err = tx.Exec("DELETE FROM sessions WHERE user_id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sessions"})
		return
	}

	// Delete user's comments
	_, err = tx.Exec("DELETE FROM comments WHERE user_id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comments"})
		return
	}

	// Get user's posts
	var postIDs []string
	err = tx.Select(&postIDs, "SELECT id FROM posts WHERE user_id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get posts"})
		return
	}

	// Delete comments on user's posts
	for _, postID := range postIDs {
		_, err = tx.Exec("DELETE FROM comments WHERE post_id = $1", postID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete post comments"})
			return
		}
	}

	// Delete user's posts
	_, err = tx.Exec("DELETE FROM posts WHERE user_id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete posts"})
		return
	}

	// Delete user
	_, err = tx.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// GetUserPosts returns posts by a specific user
func (h *UserHandler) GetUserPosts(c *gin.Context) {
	userID := c.Param("id")

	// Get posts
	var posts []models.Post
	err := h.db.Select(
		&posts,
		`SELECT p.*, u.username 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.user_id = $1 
		ORDER BY p.created_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get posts"})
		return
	}

	// Get comments for each post
	for i := range posts {
		err := h.db.Select(
			&posts[i].Comments,
			`SELECT c.*, u.username 
			FROM comments c 
			JOIN users u ON c.user_id = u.id 
			WHERE c.post_id = $1 
			ORDER BY c.created_at ASC`,
			posts[i].ID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get comments"})
			return
		}
	}

	// Return posts
	c.JSON(http.StatusOK, posts)
}
