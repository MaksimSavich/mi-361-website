package models

import (
	"database/sql"
	"time"
)

// User represents a user in the system
type User struct {
	ID             string         `json:"id" db:"id"`
	Username       string         `json:"username" db:"username"`
	Email          string         `json:"email" db:"email"`
	PasswordHash   string         `json:"-" db:"password_hash"`
	Name           sql.NullString `json:"name,omitempty" db:"name"`
	PhoneNumber    sql.NullString `json:"phoneNumber,omitempty" db:"phone_number"`
	ProfilePicture sql.NullString `json:"profilePicture,omitempty" db:"profile_picture"`
	CreatedAt      time.Time      `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time      `json:"updatedAt" db:"updated_at"`
}

// UserResponse is the public representation of a user
type UserResponse struct {
	ID             string    `json:"id"`
	Username       string    `json:"username"`
	Email          string    `json:"email"`
	Name           string    `json:"name,omitempty"`
	PhoneNumber    string    `json:"phoneNumber,omitempty"`
	ProfilePicture string    `json:"profilePicture,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

// Session represents a user session
type Session struct {
	ID         string    `json:"id" db:"id"`
	UserID     string    `json:"userId" db:"user_id"`
	Token      string    `json:"-" db:"token"`
	Device     string    `json:"device" db:"device"`
	IPAddress  string    `json:"ipAddress" db:"ip_address"`
	LastActive time.Time `json:"lastActive" db:"last_active"`
	ExpiresAt  time.Time `json:"expiresAt" db:"expires_at"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	IsCurrent  bool      `json:"isCurrent" db:"-"`
}
