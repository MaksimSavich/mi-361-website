package api

import (
	"backend/configs"
	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
	"backend/internal/services/admin"
	"backend/internal/services/auth"
	"backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// SetupRouter configures the API routes
func SetupRouter(db *sqlx.DB, s3Client *storage.S3Client, config *configs.Config, adminService *admin.AdminService) *gin.Engine {
	// Create JWT service
	jwtService := auth.NewJWTService(config.JWT)

	// Create handlers
	authHandler := handlers.NewAuthHandler(db, jwtService)
	userHandler := handlers.NewUserHandler(db)
	postHandler := handlers.NewPostHandler(db, s3Client)
	adminHandler := handlers.NewAdminHandler(db, adminService)
	followerHandler := handlers.NewFollowerHandler(db)

	// Create router
	router := gin.Default()

	// Apply middlewares
	router.Use(middleware.CorsMiddleware(config.Server))
	router.Use(middleware.RateLimitMiddleware())

	// API routes
	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status": "ok",
			})
		})

		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.POST("/logout", middleware.AuthMiddleware(jwtService, db), authHandler.Logout)
			auth.GET("/sessions", middleware.AuthMiddleware(jwtService, db), authHandler.GetSessions)
			auth.POST("/revoke-session", middleware.AuthMiddleware(jwtService, db), authHandler.RevokeSession)
			auth.POST("/revoke-all-sessions", middleware.AuthMiddleware(jwtService, db), authHandler.RevokeAllSessions)
			auth.POST("/refresh-token", middleware.AuthMiddleware(jwtService, db), authHandler.RefreshToken)
		}

		// User routes
		users := api.Group("/users")
		{
			users.GET("/me", middleware.AuthMiddleware(jwtService, db), userHandler.GetCurrentUser)
			users.PUT("/me", middleware.AuthMiddleware(jwtService, db), userHandler.UpdateUser)
			users.PUT("/me/password", middleware.AuthMiddleware(jwtService, db), userHandler.UpdatePassword)
			users.DELETE("/me", middleware.AuthMiddleware(jwtService, db), userHandler.DeleteUser)
			users.GET("/:id/posts", userHandler.GetUserPosts)
		}

		// Post routes
		posts := api.Group("/posts")
		{
			posts.GET("", postHandler.GetPosts)
			posts.GET("/:id", postHandler.GetPost)
			posts.POST("", middleware.AuthMiddleware(jwtService, db), postHandler.CreatePost)
			posts.DELETE("/:id", middleware.AuthMiddleware(jwtService, db), postHandler.DeletePost)
			posts.PUT("/:id", middleware.AuthMiddleware(jwtService, db), postHandler.UpdatePost)
			posts.POST("/:id/comments", middleware.AuthMiddleware(jwtService, db), postHandler.AddComment)
			posts.DELETE("/comments/:id", middleware.AuthMiddleware(jwtService, db), postHandler.DeleteComment)
			posts.PUT("/comments/:id", middleware.AuthMiddleware(jwtService, db), postHandler.UpdateComment)

			// Add these new routes for likes
			posts.POST("/:id/like", middleware.AuthMiddleware(jwtService, db), postHandler.LikePost)
			posts.DELETE("/:id/like", middleware.AuthMiddleware(jwtService, db), postHandler.UnlikePost)
			posts.GET("/:id/like", middleware.AuthMiddleware(jwtService, db), postHandler.GetLikeStatus)
		}

		// Admin routes
		adminRoutes := api.Group("/admin")
		adminRoutes.Use(middleware.AuthMiddleware(jwtService, db))
		adminRoutes.Use(middleware.AdminMiddleware(db))
		{
			// Invite code management
			adminRoutes.POST("/invite-codes", adminHandler.GenerateInviteCode)
			adminRoutes.GET("/invite-codes", adminHandler.GetInviteCodes)
			adminRoutes.DELETE("/invite-codes/:id", adminHandler.DeleteInviteCode)

			// User management
			adminRoutes.GET("/users", adminHandler.GetAllUsers)
			adminRoutes.DELETE("/users/:id", adminHandler.DeleteUser)

			// Content moderation
			adminRoutes.DELETE("/posts/:id", adminHandler.DeletePost)
			adminRoutes.DELETE("/comments/:id", adminHandler.DeleteComment)
			adminRoutes.GET("/comments", adminHandler.GetAllComments)
		}

		// User profile with follower counts
		users.GET("/:id/profile", userHandler.GetUserProfile)

		follow := api.Group("/follow")
		{
			// Protected routes (require authentication)
			follow.POST("/:id", middleware.AuthMiddleware(jwtService, db), followerHandler.FollowUser)
			follow.DELETE("/:id", middleware.AuthMiddleware(jwtService, db), followerHandler.UnfollowUser)
			follow.GET("/:id/status", middleware.AuthMiddleware(jwtService, db), followerHandler.GetFollowStatus)

			// Public routes (no authentication required, but enhanced if authenticated)
			follow.GET("/:id/followers", followerHandler.GetFollowers)
			follow.GET("/:id/following", followerHandler.GetFollowing)

			// Following feed (requires authentication)
			follow.GET("/feed", middleware.AuthMiddleware(jwtService, db), followerHandler.GetFollowingPostsFeed)
		}

		// User search route (public but enhanced if authenticated)
		api.GET("/users/search", followerHandler.SearchUsers)

	}

	return router
}
