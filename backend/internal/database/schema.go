// Add this file: backend/internal/database/schema.go

package database

import (
	"log"

	"github.com/jmoiron/sqlx"
)

// InitSchema ensures all required tables exist in the database
func InitSchema(db *sqlx.DB) error {
	log.Println("Checking and initializing database schema...")

	// Check if post_likes table exists
	var tableExists bool
	err := db.Get(&tableExists, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = 'post_likes'
		)
	`)
	if err != nil {
		return err
	}

	// If post_likes table doesn't exist, create it
	if !tableExists {
		log.Println("Creating post_likes table...")
		_, err := db.Exec(`
			CREATE TABLE post_likes (
				id VARCHAR(36) PRIMARY KEY,
				post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
				user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				created_at TIMESTAMP NOT NULL,
				UNIQUE(post_id, user_id)
			);
			
			CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
			CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
		`)
		if err != nil {
			log.Printf("Failed to create post_likes table: %v", err)
			return err
		}
		log.Println("Successfully created post_likes table")
	} else {
		log.Println("post_likes table already exists")
	}

	return nil
}
