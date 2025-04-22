// backend/internal/api/handlers/admin.go (new file)
package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"backend/internal/services/admin"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// AdminHandler handles admin-specific requests
type AdminHandler struct {
	db           *sqlx.DB
	adminService *admin.AdminService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(db *sqlx.DB, adminService *admin.AdminService) *AdminHandler {
	return &AdminHandler{
		db:           db,
		adminService: adminService,
	}
}

// GenerateInviteCode generates a new invite code
func (h *AdminHandler) GenerateInviteCode(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Parse request
	var req struct {
		ExpiryDays int `json:"expiryDays"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Generate invite code
	invite, err := h.adminService.GenerateInviteCode(userID.(string), req.ExpiryDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate invite code"})
		return
	}

	// Return invite code
	c.JSON(http.StatusCreated, invite)
}

// GetInviteCodes returns all invite codes
func (h *AdminHandler) GetInviteCodes(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get invite codes
	invites, err := h.adminService.GetInviteCodes()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invite codes"})
		return
	}

	// Return invite codes
	c.JSON(http.StatusOK, invites)
}

// DeleteUser allows an admin to delete any user
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	// Get admin ID from context
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", adminID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get target user ID from URL
	targetUserID := c.Param("id")

	// Check if target user is an admin
	var targetIsAdmin bool
	err = h.db.Get(&targetIsAdmin, "SELECT is_admin FROM users WHERE id = $1", targetUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if targetIsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin users"})
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
	_, err = tx.Exec("DELETE FROM sessions WHERE user_id = $1", targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sessions"})
		return
	}

	// Delete user's comments
	_, err = tx.Exec("DELETE FROM comments WHERE user_id = $1", targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comments"})
		return
	}

	// Get user's posts
	var postIDs []string
	err = tx.Select(&postIDs, "SELECT id FROM posts WHERE user_id = $1", targetUserID)
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
	_, err = tx.Exec("DELETE FROM posts WHERE user_id = $1", targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete posts"})
		return
	}

	// Mark invite code as unused if this user used one
	_, err = tx.Exec("UPDATE invite_codes SET used_by = NULL, used_at = NULL WHERE used_by = $1", targetUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invite codes"})
		return
	}

	// Delete user
	_, err = tx.Exec("DELETE FROM users WHERE id = $1", targetUserID)
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

// GetAllUsers returns all users for admin view
func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get users
	type UserWithStats struct {
		ID           string         `json:"id" db:"id"`
		Username     string         `json:"username" db:"username"`
		Email        string         `json:"email" db:"email"`
		Name         sql.NullString `json:"name" db:"name"`
		IsAdmin      bool           `json:"isAdmin" db:"is_admin"`
		PostCount    int            `json:"postCount" db:"post_count"`
		CommentCount int            `json:"commentCount" db:"comment_count"`
		CreatedAt    time.Time      `json:"createdAt" db:"created_at"`
		LastLogin    *time.Time     `json:"lastLogin" db:"last_login"`
	}

	var users []UserWithStats
	err = h.db.Select(&users, `
		SELECT 
			u.id, u.username, u.email, u.name, u.is_admin, u.created_at,
			(SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
			(SELECT COUNT(*) FROM comments WHERE user_id = u.id) AS comment_count,
			(SELECT MAX(last_active) FROM sessions WHERE user_id = u.id) AS last_login
		FROM users u
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	// Return users
	c.JSON(http.StatusOK, users)
}

// DeletePost allows an admin to delete any post
func (h *AdminHandler) DeletePost(c *gin.Context) {
	// Get admin ID from context
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", adminID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get post ID from URL
	postID := c.Param("id")

	// Check if post exists
	var postExists bool
	err = h.db.Get(&postExists, "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !postExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Start transaction
	tx, err := h.db.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Delete comments
	_, err = tx.Exec("DELETE FROM comments WHERE post_id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comments"})
		return
	}

	// Delete post
	_, err = tx.Exec("DELETE FROM posts WHERE id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete post"})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully by admin"})
}

// DeleteComment allows an admin to delete any comment
func (h *AdminHandler) DeleteComment(c *gin.Context) {
	// Get admin ID from context
	adminID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Verify user is an admin
	var isAdmin bool
	err := h.db.Get(&isAdmin, "SELECT is_admin FROM users WHERE id = $1", adminID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin status"})
		return
	}
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get comment ID from URL
	commentID := c.Param("id")

	// Check if comment exists
	var commentExists bool
	err = h.db.Get(&commentExists, "SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1)", commentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !commentExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	// Delete comment
	_, err = h.db.Exec("DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully by admin"})
}
