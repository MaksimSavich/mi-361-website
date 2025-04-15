package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"backend/configs"
	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
	"backend/internal/services/auth"
	"backend/internal/storage"
)

// SetupRouter configures the API routes
func SetupRouter(db *sqlx.DB, s3Client *storage.S3Client, config *configs.Config) *gin.Engine {
	// Create JWT service
	jwtService := auth.NewJWTService(config.JWT)

	// Create handlers
	authHandler := handlers.NewAuthHandler(db, jwtService)
	userHandler := handlers.NewUserHandler(db)
	postHandler := handlers.NewPostHandler(db, s3Client)

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
			posts.POST("/:id/comments", middleware.AuthMiddleware(jwtService, db), postHandler.AddComment)
			posts.DELETE("/comments/:id", middleware.AuthMiddleware(jwtService, db), postHandler.Deletbackend/