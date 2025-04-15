package auth

import (
	"errors"
	"fmt"
	"time"

	"backend/configs"
	"backend/internal/models"

	"github.com/golang-jwt/jwt/v4"
)

// Claims represents the JWT claims
type Claims struct {
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
	jwt.RegisteredClaims
}

// JWTService handles JWT operations
type JWTService struct {
	secret        string
	expirationMin int
}

// NewJWTService creates a new JWT service
func NewJWTService(config configs.JWTConfig) *JWTService {
	return &JWTService{
		secret:        config.Secret,
		expirationMin: config.ExpirationMin,
	}
}

// GenerateToken generates a new JWT token
func (s *JWTService) GenerateToken(user *models.User, sessionID string) (string, time.Time, error) {
	// Set expiration time
	expirationTime := time.Now().Add(time.Duration(s.expirationMin) * time.Minute)

	// Create claims
	claims := &Claims{
		UserID:    user.ID,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}

	// Create token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token
	tokenString, err := token.SignedString([]byte(s.secret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expirationTime, nil
}

// ValidateToken validates and parses a JWT token
func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	// Extract claims
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
