package auth

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// ErrMismatchedPassword is returned when passwords don't match
var ErrMismatchedPassword = errors.New("passwords do not match")

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// CheckPassword compares a password to a hash
func CheckPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
