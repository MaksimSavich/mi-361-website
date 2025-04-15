package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimitMiddleware configures rate limiting for the API
func RateLimitMiddleware() gin.HandlerFunc {
	// Create a rate limiter with 100 requests per minute
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  100,
	}

	// Create a memory store for rate limiter
	store := memory.NewStore()

	// Create the rate limiter middleware
	middleware := mgin.NewMiddleware(limiter.New(store, rate))

	return func(c *gin.Context) {
		// Skip rate limiting for some routes if needed
		if c.Request.URL.Path == "/api/health" {
			c.Next()
			return
		}

		// Apply rate limiting
		middleware(c)
	}
}
