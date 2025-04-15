package middleware

import (
	"net/http"
	"strings"

	"backend/internal/services/auth"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// AuthMiddleware enforces authentication for protected routes
func AuthMiddleware(jwtService *auth.JWTService, db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Check if the header has the "Bearer " prefix
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate token
		claims, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Check if the session is still valid
		var isValid bool
		err = db.Get(&isValid, "SELECT EXISTS(SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2 AND expires_at > NOW())", claims.SessionID, claims.UserID)
		if err != nil || !isValid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired or revoked"})
			c.Abort()
			return
		}

		// Update session last active time
		_, err = db.Exec("UPDATE sessions SET last_active = NOW() WHERE id = $1", claims.SessionID)
		if err != nil {
			// Log error but continue
			// logger.Error("Failed to update session last active time", "error", err)
		}

		// Set user ID and session ID in context
		c.Set("userID", claims.UserID)
		c.Set("sessionID", claims.SessionID)

		c.Next()
	}
}
