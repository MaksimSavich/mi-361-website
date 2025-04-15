package models

import (
	"time"
)

// Post represents a user post (image or video)
type Post struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"userId" db:"user_id"`
	Username  string    `json:"username" db:"username"`
	Caption   string    `json:"caption" db:"caption"`
	MediaURL  string    `json:"mediaUrl" db:"media_url"`
	MediaType string    `json:"mediaType" db:"media_type"`
	Likes     int       `json:"likes" db:"likes"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	Comments  []Comment `json:"comments,omitempty" db:"-"`
}

// Comment represents a comment on a post
type Comment struct {
	ID        string    `json:"id" db:"id"`
	PostID    string    `json:"postId" db:"post_id"`
	UserID    string    `json:"userId" db:"user_id"`
	Username  string    `json:"username" db:"username"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}
