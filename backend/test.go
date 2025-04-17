package main

import (
	"fmt"
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"), os.Getenv("DB_SSLMODE"),
	)

	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}
	defer db.Close()

	// Simple test: Can we count the columns in the sessions table?
	var columnCount int
	err = db.Get(&columnCount, "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'sessions'")
	if err != nil {
		log.Fatalf("Error counting columns: %v", err)
	}

	fmt.Printf("Sessions table exists with %d columns\n", columnCount)

	// Try to insert a test session
	fmt.Println("Testing session insertion...")

	// First get a user ID
	var userID string
	err = db.Get(&userID, "SELECT id FROM users LIMIT 1")
	if err != nil {
		log.Fatalf("Error getting user ID: %v", err)
	}

	// Delete any existing test session
	_, _ = db.Exec("DELETE FROM sessions WHERE id = 'test-session'")

	// Insert test session
	_, err = db.Exec(`
        INSERT INTO sessions (id, user_id, token, device, ip_address, last_active, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '7 days', NOW())
    `, "test-session", userID, "test-token", "test-device", "127.0.0.1")

	if err != nil {
		log.Fatalf("Error inserting test session: %v", err)
	}

	fmt.Println("Test session inserted successfully!")

	// Clean up
	_, _ = db.Exec("DELETE FROM sessions WHERE id = 'test-session'")
}
