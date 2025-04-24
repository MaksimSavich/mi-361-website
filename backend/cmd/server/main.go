// backend/cmd/server/main.go (modified)
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"time"

	"backend/configs"
	"backend/internal/api"
	"backend/internal/database"
	"backend/internal/services/admin"
	"backend/internal/storage"

	"github.com/joho/godotenv"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize configuration
	config, err := configs.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database connection
	db, err := database.Connect(config.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize database schema
	if err := database.InitSchema(db); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Initialize admin account
	adminService := admin.NewAdminService(db)
	if err := adminService.InitializeAdmin(); err != nil {
		log.Fatalf("Failed to initialize admin account: %v", err)
	}

	// Initialize S3 client
	s3Client, err := storage.NewS3Client(config.S3)
	if err != nil {
		log.Fatalf("Failed to initialize S3 client: %v", err)
	}

	// Initialize router
	router := api.SetupRouter(db, s3Client, config, adminService)

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + config.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", config.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Set up channel to listen for signals to gracefully terminate the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create a deadline for server shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Shutdown server
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}

func checkDependencies() {
	log.Println("Checking required dependencies...")

	// Check for FFmpeg
	ffmpegCmd := exec.Command("ffmpeg", "-version")
	if err := ffmpegCmd.Run(); err != nil {
		log.Println("Warning: FFmpeg not found. Video and HEIC conversion may not work properly.")
		log.Println("Please install FFmpeg: https://ffmpeg.org/download.html")
	} else {
		log.Println("✓ FFmpeg found")
	}

	// Check for ImageMagick
	convertCmd := exec.Command("convert", "-version")
	if err := convertCmd.Run(); err != nil {
		log.Println("Warning: ImageMagick not found. HEIC conversion may use fallback methods.")
		log.Println("For best results, please install ImageMagick: https://imagemagick.org/script/download.php")
	} else {
		log.Println("✓ ImageMagick found")
	}

	// Check for libheif tools
	heifCmd := exec.Command("heif-convert", "--version")
	if err := heifCmd.Run(); err != nil {
		log.Println("Info: libheif-tools not found. Alternative HEIC conversion methods will be used.")
	} else {
		log.Println("✓ libheif-tools found")
	}
}
