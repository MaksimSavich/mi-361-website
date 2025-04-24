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

	if userID, exists := c.Get("userID"); exists {
		// Check which posts the user has liked
		for i := range posts {
			var liked bool
			err := h.db.Get(&liked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", posts[i].ID, userID)
			if err == nil {
				posts[i].Liked = liked
			}
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

	// Similarly in GetPost method, after fetching the post
	if userID, exists := c.Get("userID"); exists {
		var liked bool
		err := h.db.Get(&liked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", post.ID, userID)
		if err == nil {
			post.Liked = liked
		}
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

	// Determine content type and handle iOS specific formats
	contentType := file.Header.Get("Content-Type")

	// If content type is missing or generic, try to detect from file extension
	if contentType == "" || contentType == "application/octet-stream" {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		switch ext {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".webp":
			contentType = "image/webp"
		case ".heic", ".heif":
			contentType = "image/heic"
		case ".mp4":
			contentType = "video/mp4"
		case ".webm":
			contentType = "video/webm"
		case ".mov":
			contentType = "video/quicktime"
		}
	}

	// Determine media type (image or video)
	mediaType := "image"
	if strings.HasPrefix(contentType, "video/") {
		mediaType = "video"

		// Handle iOS video formats like MOV
		if contentType == "video/quicktime" || contentType == "video/mov" || !compression.CheckVideoCompatibility(fileData, contentType) {
			// Convert to MP4
			var convertError error
			fileData, contentType, convertError = compression.CompressVideo(fileData, contentType)
			if convertError != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to convert video format. Please use MP4 or WebM."})
				return
			}
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
	} else {
		// Compress and possibly convert the image
		compressedData, err := CompressImage(fileData, contentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process image: " + err.Error()})
			return
		}
		fileData = compressedData
		contentType = "image/jpeg" // CompressImage now always returns JPEG
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

// LikePost adds a like to a post
func (h *PostHandler) LikePost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")
	log.Printf("LikePost: Processing like for postID=%s, userID=%s", postID, userID)

	// Check if post exists
	var postExists bool
	err := h.db.Get(&postExists, "SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)", postID)
	if err != nil {
		log.Printf("LikePost: Database error checking if post exists: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	if !postExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
		return
	}

	// Start a transaction
	tx, err := h.db.Beginx()
	if err != nil {
		log.Printf("LikePost: Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Check if user already liked the post
	var alreadyLiked bool
	err = tx.Get(&alreadyLiked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", postID, userID)
	if err != nil {
		log.Printf("LikePost: Failed to check if user already liked post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking like status"})
		return
	}
	log.Printf("LikePost: User has already liked post: %t", alreadyLiked)

	// If user hasn't liked the post, add the like
	if !alreadyLiked {
		// Create new like record
		likeID := uuid.New().String()
		now := time.Now()

		_, err = tx.Exec(
			"INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES ($1, $2, $3, $4)",
			likeID, postID, userID, now,
		)
		if err != nil {
			log.Printf("LikePost: Failed to insert like record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to like post"})
			return
		}

		// Increment post likes count
		_, err = tx.Exec("UPDATE posts SET likes = likes + 1 WHERE id = $1", postID)
		if err != nil {
			log.Printf("LikePost: Failed to update post like count: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update like count"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("LikePost: Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Get updated like count
	var likeCount int
	err = h.db.Get(&likeCount, "SELECT likes FROM posts WHERE id = $1", postID)
	if err != nil {
		log.Printf("LikePost: Failed to get updated like count: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get like count"})
		return
	}

	log.Printf("LikePost: Successfully processed like. New count: %d", likeCount)

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"message": "Post liked successfully",
		"likes":   likeCount,
		"liked":   true,
	})
}

// UnlikePost removes a like from a post
func (h *PostHandler) UnlikePost(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")
	log.Printf("UnlikePost: Processing unlike for postID=%s, userID=%s", postID, userID)

	// Start a transaction
	tx, err := h.db.Beginx()
	if err != nil {
		log.Printf("UnlikePost: Failed to begin transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer tx.Rollback()

	// Check if user has liked the post
	var alreadyLiked bool
	err = tx.Get(&alreadyLiked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", postID, userID)
	if err != nil {
		log.Printf("UnlikePost: Failed to check if user liked post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking like status"})
		return
	}
	log.Printf("UnlikePost: User has liked post: %t", alreadyLiked)

	// If user has liked the post, remove the like
	if alreadyLiked {
		// Delete like record
		_, err = tx.Exec("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", postID, userID)
		if err != nil {
			log.Printf("UnlikePost: Failed to delete like record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlike post"})
			return
		}

		// Decrement post likes count
		_, err = tx.Exec("UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1", postID)
		if err != nil {
			log.Printf("UnlikePost: Failed to update post like count: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update like count"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("UnlikePost: Failed to commit transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Get updated like count
	var likeCount int
	err = h.db.Get(&likeCount, "SELECT likes FROM posts WHERE id = $1", postID)
	if err != nil {
		log.Printf("UnlikePost: Failed to get updated like count: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get like count"})
		return
	}

	log.Printf("UnlikePost: Successfully processed unlike. New count: %d", likeCount)

	// Return success
	c.JSON(http.StatusOK, gin.H{
		"message": "Post unliked successfully",
		"likes":   likeCount,
		"liked":   false,
	})
}

// GetLikeStatus returns whether a user has liked a post
func (h *PostHandler) GetLikeStatus(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	postID := c.Param("id")
	log.Printf("GetLikeStatus: Checking like status for postID=%s, userID=%s", postID, userID)

	// Check if user has liked the post
	var liked bool
	err := h.db.Get(&liked, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2)", postID, userID)
	if err != nil {
		log.Printf("GetLikeStatus: Failed to check if user liked post: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error checking like status"})
		return
	}

	// Get like count
	var likeCount int
	err = h.db.Get(&likeCount, "SELECT likes FROM posts WHERE id = $1", postID)
	if err != nil {
		log.Printf("GetLikeStatus: Failed to get like count: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get like count"})
		return
	}

	log.Printf("GetLikeStatus: Like status: liked=%t, count=%d", liked, likeCount)

	// Return response
	c.JSON(http.StatusOK, gin.H{
		"liked": liked,
		"likes": likeCount,
	})
}
