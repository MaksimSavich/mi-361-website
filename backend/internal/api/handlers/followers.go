package handlers

import (
	"net/http"
	"time"

	"backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// FollowerHandler handles follower-related requests
type FollowerHandler struct {
	db *sqlx.DB
}

// NewFollowerHandler creates a new follower handler
func NewFollowerHandler(db *sqlx.DB) *FollowerHandler {
	return &FollowerHandler{
		db: db,
	}
}

// FollowUser handles a request to follow a user
func (h *FollowerHandler) FollowUser(c *gin.Context) {
	// Get follower ID from context (current user)
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Get user ID to follow from URL
	followedID := c.Param("id")

	// Check if user exists
	var userExists bool
	err := h.db.Get(&userExists, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", followedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !userExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Can't follow yourself
	if followerID == followedID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot follow yourself"})
		return
	}

	// Check if already following
	var alreadyFollowing bool
	err = h.db.Get(&alreadyFollowing, "SELECT EXISTS(SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2)", followerID, followedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// If already following, just return success
	if alreadyFollowing {
		c.JSON(http.StatusOK, gin.H{"message": "Already following user"})
		return
	}

	// Create follow relationship
	followID := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(
		"INSERT INTO followers (id, follower_id, followed_id, created_at) VALUES ($1, $2, $3, $4)",
		followID, followerID, followedID, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow user"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"message":     "Successfully followed user",
		"isFollowing": true,
	})
}

// UnfollowUser handles a request to unfollow a user
func (h *FollowerHandler) UnfollowUser(c *gin.Context) {
	// Get follower ID from context (current user)
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Get user ID to unfollow from URL
	followedID := c.Param("id")

	// Delete follow relationship
	result, err := h.db.Exec(
		"DELETE FROM followers WHERE follower_id = $1 AND followed_id = $2",
		followerID, followedID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfollow user"})
		return
	}

	// Check if relationship existed
	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message":     "Wasn't following user",
			"isFollowing": false,
		})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"message":     "Successfully unfollowed user",
		"isFollowing": false,
	})
}

// GetFollowStatus checks if the current user is following a specific user
func (h *FollowerHandler) GetFollowStatus(c *gin.Context) {
	// Get follower ID from context (current user)
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Get user ID to check from URL
	followedID := c.Param("id")

	// Check if following
	var isFollowing bool
	err := h.db.Get(&isFollowing, "SELECT EXISTS(SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2)", followerID, followedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Return follow status
	c.JSON(http.StatusOK, models.FollowStatus{
		IsFollowing: isFollowing,
	})
}

// GetFollowers returns users who follow a specific user
func (h *FollowerHandler) GetFollowers(c *gin.Context) {
	// Get user ID from URL
	userID := c.Param("id")

	// Check if user exists
	var userExists bool
	err := h.db.Get(&userExists, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !userExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get current user if authenticated
	var currentUserID *string
	if userIDValue, exists := c.Get("userID"); exists {
		userIDStr := userIDValue.(string)
		currentUserID = &userIDStr
	}

	// Get followers with their follow status relative to current user
	type FollowerWithStatus struct {
		ID             string `json:"id" db:"id"`
		Username       string `json:"username" db:"username"`
		Name           string `json:"name" db:"name"`
		ProfilePicture string `json:"profilePicture" db:"profile_picture"`
		IsFollowing    bool   `json:"isFollowing" db:"is_following"`
		IsFollowedBy   bool   `json:"isFollowedBy" db:"is_followed_by"`
	}

	var followers []FollowerWithStatus
	var query string
	var args []interface{}

	if currentUserID != nil {
		// With authentication, include follow status
		query = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name, 
				COALESCE(u.profile_picture, '') as profile_picture,
				EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND followed_id = u.id) as is_following,
				EXISTS(SELECT 1 FROM followers WHERE follower_id = u.id AND followed_id = $2) as is_followed_by
			FROM 
				users u
			JOIN 
				followers f ON u.id = f.follower_id 
			WHERE 
				f.followed_id = $1
			ORDER BY 
				f.created_at DESC
		`
		args = []interface{}{userID, *currentUserID}
	} else {
		// Without authentication, no follow status
		query = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name, 
				COALESCE(u.profile_picture, '') as profile_picture,
				false as is_following,
				false as is_followed_by
			FROM 
				users u
			JOIN 
				followers f ON u.id = f.follower_id 
			WHERE 
				f.followed_id = $1
			ORDER BY 
				f.created_at DESC
		`
		args = []interface{}{userID}
	}

	err = h.db.Select(&followers, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get followers"})
		return
	}

	// Return followers
	c.JSON(http.StatusOK, followers)
}

// GetFollowing returns users followed by a specific user
func (h *FollowerHandler) GetFollowing(c *gin.Context) {
	// Get user ID from URL
	userID := c.Param("id")

	// Check if user exists
	var userExists bool
	err := h.db.Get(&userExists, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !userExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get current user if authenticated
	var currentUserID *string
	if userIDValue, exists := c.Get("userID"); exists {
		userIDStr := userIDValue.(string)
		currentUserID = &userIDStr
	}

	// Get following with their follow status relative to current user
	type FollowingWithStatus struct {
		ID             string `json:"id" db:"id"`
		Username       string `json:"username" db:"username"`
		Name           string `json:"name" db:"name"`
		ProfilePicture string `json:"profilePicture" db:"profile_picture"`
		IsFollowing    bool   `json:"isFollowing" db:"is_following"`
		IsFollowedBy   bool   `json:"isFollowedBy" db:"is_followed_by"`
	}

	var following []FollowingWithStatus
	var query string
	var args []interface{}

	if currentUserID != nil {
		// With authentication, include follow status
		query = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name, 
				COALESCE(u.profile_picture, '') as profile_picture,
				EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND followed_id = u.id) as is_following,
				EXISTS(SELECT 1 FROM followers WHERE follower_id = u.id AND followed_id = $2) as is_followed_by
			FROM 
				users u
			JOIN 
				followers f ON u.id = f.followed_id 
			WHERE 
				f.follower_id = $1
			ORDER BY 
				f.created_at DESC
		`
		args = []interface{}{userID, *currentUserID}
	} else {
		// Without authentication, no follow status
		query = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name, 
				COALESCE(u.profile_picture, '') as profile_picture,
				false as is_following,
				false as is_followed_by
			FROM 
				users u
			JOIN 
				followers f ON u.id = f.followed_id 
			WHERE 
				f.follower_id = $1
			ORDER BY 
				f.created_at DESC
		`
		args = []interface{}{userID}
	}

	err = h.db.Select(&following, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get following"})
		return
	}

	// Return following
	c.JSON(http.StatusOK, following)
}

// SearchUsers searches for users by username or name
func (h *FollowerHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	// Get current user if authenticated
	var currentUserID *string
	if userIDValue, exists := c.Get("userID"); exists {
		userIDStr := userIDValue.(string)
		currentUserID = &userIDStr
	}

	// Search users
	type UserSearchResult struct {
		ID             string `json:"id" db:"id"`
		Username       string `json:"username" db:"username"`
		Name           string `json:"name" db:"name"`
		ProfilePicture string `json:"profilePicture" db:"profile_picture"`
		IsFollowing    bool   `json:"isFollowing" db:"is_following"`
		FollowerCount  int    `json:"followerCount" db:"follower_count"`
		FollowingCount int    `json:"followingCount" db:"following_count"`
	}

	var users []UserSearchResult
	var sqlQuery string
	var args []interface{}

	// Search pattern with ILIKE for case-insensitive search
	searchPattern := "%" + query + "%"

	if currentUserID != nil {
		// With authentication, include follow status
		sqlQuery = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name,
				COALESCE(u.profile_picture, '') as profile_picture,
				EXISTS(SELECT 1 FROM followers WHERE follower_id = $2 AND followed_id = u.id) as is_following,
				(SELECT COUNT(*) FROM followers WHERE followed_id = u.id) as follower_count,
				(SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
			FROM 
				users u
			WHERE 
				u.username ILIKE $1 OR u.name ILIKE $1
			ORDER BY 
				u.username ASC
			LIMIT 20
		`
		args = []interface{}{searchPattern, *currentUserID}
	} else {
		// Without authentication, no follow status
		sqlQuery = `
			SELECT 
				u.id, 
				u.username, 
				COALESCE(u.name, '') as name,
				COALESCE(u.profile_picture, '') as profile_picture,
				false as is_following,
				(SELECT COUNT(*) FROM followers WHERE followed_id = u.id) as follower_count,
				(SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
			FROM 
				users u
			WHERE 
				u.username ILIKE $1 OR u.name ILIKE $1
			ORDER BY 
				u.username ASC
			LIMIT 20
		`
		args = []interface{}{searchPattern}
	}

	err := h.db.Select(&users, sqlQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search users"})
		return
	}

	// Return search results
	c.JSON(http.StatusOK, users)
}

// GetFollowingPostsFeed returns posts from users the current user follows
func (h *FollowerHandler) GetFollowingPostsFeed(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Get posts from followed users
	var posts []models.Post
	err := h.db.Select(
		&posts,
		`SELECT p.*, u.username 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.user_id IN (
			SELECT followed_id 
			FROM followers 
			WHERE follower_id = $1
		)
		ORDER BY p.created_at DESC 
		LIMIT 50`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get posts"})
		return
	}

	// Check which posts the user has liked
	for i := range posts {
		var liked bool
		err := h.db.Get(&liked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", posts[i].ID, userID)
		if err == nil {
			posts[i].Liked = liked
		}
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
