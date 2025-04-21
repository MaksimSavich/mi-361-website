package handlers

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/models"
	"backend/internal/services/compression"
	"backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// PostHandler handles post-related requests
type PostHandler struct {
	db       *sqlx.DB
	s3Client *storage.S3Client
}

// NewPostHandler creates a new post handler
func NewPostHandler(db *sqlx.DB, s3Client *storage.S3Client) *PostHandler {
	return &PostHandler{
		db:       db,
		s3Client: s3Client,
	}
}

// GetPosts returns all posts
func (h *PostHandler) GetPosts(c *gin.Context) {
	// Get posts
	var posts []models.Post
	err := h.db.Select(
		&posts,
		`SELECT p.*, u.username 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		ORDER BY p.created_at DESC 
		LIMIT 50`,
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

// GetPost returns a specific post
func (h *PostHandler) GetPost(c *gin.Context) {
	postID := c.Param("id")

	// Get post
	var post models.Post
	err := h.db.Get(
		&post,
		`SELECT p.*, u.username 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.id = $1`,
		postID,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Get comments
	err = h.db.Select(
		&post.Comments,
		`SELECT c.*, u.username 
		FROM comments c 
		JOIN users u ON c.user_id = u.id 
		WHERE c.post_id = $1 
		ORDER BY c.created_at ASC`,
		postID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get comments"})
		return
	}

	// Return post
	c.JSON(http.StatusOK, post)
}

// CreatePost creates a new post
// CreatePost creates a new post
func (h *PostHandler) CreatePost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	// Parse form data
	caption := c.PostForm("caption")
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	// Read file into memory
	fileData := make([]byte, file.Size)
	_, err = src.Read(fileData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Determine content type
	contentType := file.Header.Get("Content-Type")
	mediaType := "image"
	if contentType == "video/mp4" || contentType == "video/webm" {
		mediaType = "video"

		// Check video compatibility
		if !compression.CheckVideoCompatibility(fileData, contentType) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Video format not supported by web browsers. Please use MP4 (H.264) or WebM format."})
			return
		}

		// Create temporary directory for processing
		tempDir, err := os.MkdirTemp("", "video_thumbnail")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp directory"})
			return
		}
		defer os.RemoveAll(tempDir)

		// Write video file to temp directory
		inputPath := filepath.Join(tempDir, file.Filename)
		if err := os.WriteFile(inputPath, fileData, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write temp file"})
			return
		}

		// Generate thumbnail
		thumbnailPath := filepath.Join(tempDir, "thumbnail.jpg")
		thumbnailCmd := exec.Command(
			"ffmpeg",
			"-i", inputPath,
			"-ss", "00:00:01", // Extract frame at 1 second
			"-vframes", "1",
			"-f", "image2",
			thumbnailPath,
		)

		if err := thumbnailCmd.Run(); err != nil {
			// Log error but continue with upload
			log.Printf("Failed to generate thumbnail: %v", err)
		} else {
			// Read the thumbnail
			thumbnailData, err := os.ReadFile(thumbnailPath)
			if err == nil {
				// Upload thumbnail to S3
				thumbnailURL, err := h.s3Client.UploadFile(
					c.Request.Context(),
					thumbnailData,
					"thumbnail_"+file.Filename+".jpg",
					"image/jpeg",
				)

				if err == nil {
					// Store thumbnail URL in database alongside the video
					// This will require adding a thumbnail_url field to your posts table
					// For now, just log it
					log.Printf("Generated thumbnail at: %s", thumbnailURL)
				}
			}
		}
	}

	// Compress file if needed
	if mediaType == "image" {
		fileData, err = compression.CompressImage(fileData, contentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compress image"})
			return
		}
	} else if mediaType == "video" {
		// For simplicity, we're not implementing video compression in this example
		// In a real application, you'd want to use FFmpeg or similar tools
		// fileData, err = compression.CompressVideo(fileData, contentType)
	}

	// Upload to S3
	mediaURL, err := h.s3Client.UploadFile(c.Request.Context(), fileData, file.Filename, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Create post
	postID := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(
		"INSERT INTO posts (id, user_id, caption, media_url, media_type, likes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		postID, userID, caption, mediaURL, mediaType, 0, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create post"})
		return
	}

	// Get username
	var username string
	err = h.db.Get(&username, "SELECT username FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get username"})
		return
	}

	// Create post response
	post := models.Post{
		ID:        postID,
		UserID:    userID.(string),
		Username:  username,
		Caption:   caption,
		MediaURL:  mediaURL,
		MediaType: mediaType,
		Likes:     0,
		CreatedAt: now,
		UpdatedAt: now,
		Comments:  []models.Comment{},
	}

	// Return success
	c.JSON(http.StatusCreated, post)
}

// DeletePost deletes a post
func (h *PostHandler) DeletePost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")

	// Check if post exists and belongs to user
	var postExists bool
	err := h.db.Get(&postExists, "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND user_id = $2)", postID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !postExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to delete it"})
		return
	}

	// Get media URL for deletion from S3
	var mediaURL string
	err = h.db.Get(&mediaURL, "SELECT media_url FROM posts WHERE id = $1", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get media URL"})
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

	// Delete media from S3
	// Parse the URL to extract the S3 object key
	var s3Path string
	parsedURL, err := url.Parse(mediaURL)
	if err == nil {
		// Extract path from the URL (removing the leading slash if present)
		path := parsedURL.Path
		if strings.HasPrefix(path, "/") {
			path = path[1:]
		}

		// If the URL contains bucket name in the path (like s3.amazonaws.com/bucket-name/path)
		if strings.Contains(parsedURL.Host, "s3.amazonaws.com") {
			parts := strings.SplitN(path, "/", 2)
			if len(parts) > 1 {
				s3Path = parts[1] // Skip the bucket name in the path
			} else {
				s3Path = path
			}
		} else {
			// For custom endpoints or path-style URLs
			s3Path = path
		}

		// Try to delete the file
		err = h.s3Client.DeleteFile(c.Request.Context(), s3Path)
		if err != nil {
			// Log the error but continue (don't fail the API call just because S3 deletion failed)
			log.Printf("Failed to delete file from S3: %v, path: %s", err, s3Path)
		} else {
			log.Printf("Successfully deleted file from S3: %s", s3Path)
		}
	} else {
		log.Printf("Failed to parse media URL for S3 deletion: %v, URL: %s", err, mediaURL)
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Post deleted successfully"})
}

// AddComment adds a comment to a post
func (h *PostHandler) AddComment(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")

	// Parse request
	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if post exists
	var postExists bool // Fixed: renamed 'exists' to 'postExists'
	err := h.db.Get(&postExists, "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)", postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !postExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Create comment
	commentID := uuid.New().String()
	now := time.Now()

	_, err = h.db.Exec(
		"INSERT INTO comments (id, post_id, user_id, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
		commentID, postID, userID, req.Content, now, now,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// Get username
	var username string
	err = h.db.Get(&username, "SELECT username FROM users WHERE id = $1", userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get username"})
		return
	}

	// Create comment response
	comment := models.Comment{
		ID:        commentID,
		PostID:    postID,
		UserID:    userID.(string),
		Username:  username,
		Content:   req.Content,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Return success
	c.JSON(http.StatusCreated, comment)
}

// DeleteComment deletes a comment
func (h *PostHandler) DeleteComment(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	commentID := c.Param("id")

	// Check if comment exists and belongs to user
	var commentExists bool
	err := h.db.Get(&commentExists, "SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1 AND user_id = $2)", commentID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !commentExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found or you don't have permission to delete it"})
		return
	}

	// Delete comment
	_, err = h.db.Exec("DELETE FROM comments WHERE id = $1", commentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete comment"})
		return
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully"})
}

// UpdateComment updates a comment's content
func (h *PostHandler) UpdateComment(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	commentID := c.Param("id")

	// Parse request
	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if comment exists and belongs to user
	var commentExists bool
	err := h.db.Get(&commentExists, "SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1 AND user_id = $2)", commentID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !commentExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found or you don't have permission to edit it"})
		return
	}

	// Update comment
	now := time.Now()
	_, err = h.db.Exec(
		"UPDATE comments SET content = $1, updated_at = $2 WHERE id = $3",
		req.Content, now, commentID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update comment"})
		return
	}

	// Get updated comment
	var comment models.Comment
	err = h.db.Get(
		&comment,
		`SELECT c.*, u.username 
		FROM comments c 
		JOIN users u ON c.user_id = u.id 
		WHERE c.id = $1`,
		commentID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated comment"})
		return
	}

	// Return updated comment
	c.JSON(http.StatusOK, comment)
}

func (h *PostHandler) UpdatePost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")

	// Parse request
	var req struct {
		Caption string `json:"caption" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Check if post exists and belongs to user
	var postExists bool
	err := h.db.Get(&postExists, "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND user_id = $2)", postID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !postExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found or you don't have permission to edit it"})
		return
	}

	// Update post
	now := time.Now()
	_, err = h.db.Exec(
		"UPDATE posts SET caption = $1, updated_at = $2 WHERE id = $3",
		req.Caption, now, postID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post"})
		return
	}

	// Get updated post
	var post models.Post
	err = h.db.Get(
		&post,
		`SELECT p.*, u.username 
		FROM posts p 
		JOIN users u ON p.user_id = u.id 
		WHERE p.id = $1`,
		postID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated post"})
		return
	}

	// Get comments for the post
	err = h.db.Select(
		&post.Comments,
		`SELECT c.*, u.username 
		FROM comments c 
		JOIN users u ON c.user_id = u.id 
		WHERE c.post_id = $1  
		ORDER BY c.created_at ASC`,
		postID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get comments"})
		return
	}

	// Return updated post with comments
	c.JSON(http.StatusOK, post)
}
