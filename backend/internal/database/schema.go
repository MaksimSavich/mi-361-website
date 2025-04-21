// backend/internal/database/schema.go

package database

import (
	"log"
	"strings"

	"github.com/jmoiron/sqlx"
)

// InitSchema ensures all required tables exist in the database
func InitSchema(db *sqlx.DB) error {
	log.Println("Checking and initializing database schema...")

	// Create users table if it doesn't exist
	if err := ensureUsersTable(db); err != nil {
		return err
	}

	// Create sessions table if it doesn't exist
	if err := ensureSessionsTable(db); err != nil {
		return err
	}

	// Create posts table if it doesn't exist
	if err := ensurePostsTable(db); err != nil {
		return err
	}

	// Create comments table if it doesn't exist
	if err := ensureCommentsTable(db); err != nil {
		return err
	}

	// Create post_likes table if it doesn't exist
	if err := ensurePostLikesTable(db); err != nil {
		return err
	}

	log.Println("Database schema initialization complete")
	return nil
}

// Check if a table exists
func tableExists(db *sqlx.DB, tableName string) (bool, error) {
	var exists bool
	err := db.Get(&exists, `
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name = $1
		)
	`, tableName)
	return exists, err
}

// Create users table if it doesn't exist
func ensureUsersTable(db *sqlx.DB) error {
	exists, err := tableExists(db, "users")
	if err != nil {
		return err
	}

	if !exists {
		log.Println("Creating users table...")
		_, err := db.Exec(`
			CREATE TABLE users (
				id VARCHAR(36) PRIMARY KEY,
				username VARCHAR(255) NOT NULL UNIQUE,
				email VARCHAR(255) NOT NULL UNIQUE,
				password_hash VARCHAR(255) NOT NULL,
				name VARCHAR(255),
				phone_number VARCHAR(20),
				profile_picture VARCHAR(255),
				created_at TIMESTAMP NOT NULL,
				updated_at TIMESTAMP NOT NULL
			)
		`)
		if err != nil {
			// If error is just that the table already exists, continue
			if strings.Contains(err.Error(), "already exists") {
				log.Println("users table already exists (caught in error handling)")
				return nil
			}
			log.Printf("Failed to create users table: %v", err)
			return err
		}
		log.Println("Successfully created users table")
	} else {
		log.Println("users table already exists")
	}

	return nil
}

// Create sessions table if it doesn't exist
func ensureSessionsTable(db *sqlx.DB) error {
	exists, err := tableExists(db, "sessions")
	if err != nil {
		return err
	}

	if !exists {
		log.Println("Creating sessions table...")
		_, err := db.Exec(`
			CREATE TABLE sessions (
				id VARCHAR(36) PRIMARY KEY,
				user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				token TEXT,
				device VARCHAR(255),
				ip_address VARCHAR(45),
				last_active TIMESTAMP NOT NULL,
				expires_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP NOT NULL
			)
		`)
		if err != nil {
			// If error is just that the table already exists, continue
			if strings.Contains(err.Error(), "already exists") {
				log.Println("sessions table already exists (caught in error handling)")
				return nil
			}
			log.Printf("Failed to create sessions table: %v", err)
			return err
		}

		// Create index
		_, err = db.Exec(`CREATE INDEX idx_sessions_user_id ON sessions(user_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create sessions user_id index: %v", err)
		}

		log.Println("Successfully created sessions table")
	} else {
		log.Println("sessions table already exists")
	}

	return nil
}

// Create posts table if it doesn't exist
func ensurePostsTable(db *sqlx.DB) error {
	exists, err := tableExists(db, "posts")
	if err != nil {
		return err
	}

	if !exists {
		log.Println("Creating posts table...")
		_, err := db.Exec(`
			CREATE TABLE posts (
				id VARCHAR(36) PRIMARY KEY,
				user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				caption TEXT,
				media_url TEXT NOT NULL,
				media_type VARCHAR(10) NOT NULL,
				likes INT NOT NULL DEFAULT 0,
				created_at TIMESTAMP NOT NULL,
				updated_at TIMESTAMP NOT NULL
			)
		`)
		if err != nil {
			// If error is just that the table already exists, continue
			if strings.Contains(err.Error(), "already exists") {
				log.Println("posts table already exists (caught in error handling)")
				return nil
			}
			log.Printf("Failed to create posts table: %v", err)
			return err
		}

		// Create index
		_, err = db.Exec(`CREATE INDEX idx_posts_user_id ON posts(user_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create posts user_id index: %v", err)
		}

		log.Println("Successfully created posts table")
	} else {
		log.Println("posts table already exists")
	}

	return nil
}

// Create comments table if it doesn't exist
func ensureCommentsTable(db *sqlx.DB) error {
	exists, err := tableExists(db, "comments")
	if err != nil {
		return err
	}

	if !exists {
		log.Println("Creating comments table...")
		_, err := db.Exec(`
			CREATE TABLE comments (
				id VARCHAR(36) PRIMARY KEY,
				post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
				user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				content TEXT NOT NULL,
				created_at TIMESTAMP NOT NULL,
				updated_at TIMESTAMP NOT NULL
			)
		`)
		if err != nil {
			// If error is just that the table already exists, continue
			if strings.Contains(err.Error(), "already exists") {
				log.Println("comments table already exists (caught in error handling)")
				return nil
			}
			log.Printf("Failed to create comments table: %v", err)
			return err
		}

		// Create indexes
		_, err = db.Exec(`CREATE INDEX idx_comments_post_id ON comments(post_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create comments post_id index: %v", err)
		}

		_, err = db.Exec(`CREATE INDEX idx_comments_user_id ON comments(user_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create comments user_id index: %v", err)
		}

		log.Println("Successfully created comments table")
	} else {
		log.Println("comments table already exists")
	}

	return nil
}

// Create post_likes table if it doesn't exist
func ensurePostLikesTable(db *sqlx.DB) error {
	exists, err := tableExists(db, "post_likes")
	if err != nil {
		return err
	}

	if !exists {
		log.Println("Creating post_likes table...")
		_, err := db.Exec(`
			CREATE TABLE post_likes (
				id VARCHAR(36) PRIMARY KEY,
				post_id VARCHAR(36) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
				user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				created_at TIMESTAMP NOT NULL,
				UNIQUE(post_id, user_id)
			)
		`)
		if err != nil {
			// If error is just that the table already exists, continue
			if strings.Contains(err.Error(), "already exists") {
				log.Println("post_likes table already exists (caught in error handling)")
				return nil
			}
			log.Printf("Failed to create post_likes table: %v", err)
			return err
		}

		// Create indexes
		_, err = db.Exec(`CREATE INDEX idx_post_likes_post_id ON post_likes(post_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create post_likes post_id index: %v", err)
		}

		_, err = db.Exec(`CREATE INDEX idx_post_likes_user_id ON post_likes(user_id)`)
		if err != nil && !strings.Contains(err.Error(), "already exists") {
			log.Printf("Warning: Failed to create post_likes user_id index: %v", err)
		}

		log.Println("Successfully created post_likes table")
	} else {
		log.Println("post_likes table already exists")
	}

	return nil
}
