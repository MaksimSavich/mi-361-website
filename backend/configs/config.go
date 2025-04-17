package configs

import (
	"context"
	"errors"
	"os"
	"strconv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	S3       S3Config
	JWT      JWTConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port         string
	AllowOrigins []string
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// S3Config holds AWS S3 configuration
type S3Config struct {
	AccessKey    string
	SecretKey    string
	Region       string
	Bucket       string
	Endpoint     string
	UsePathStyle bool
}

func (s S3Config) LoadDefaultConfig(context context.Context, param any, param3 any, param4 any) (any, any) {
	panic("unimplemented")
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret        string
	ExpirationMin int
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load server config
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}

	allowOrigins := []string{"http://localhost:3000"} // Default origins
	if origins := os.Getenv("ALLOW_ORIGINS"); origins != "" {
		allowOrigins = []string{origins}
	}

	// Load database config
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	if dbHost == "" || dbPort == "" || dbUser == "" || dbPassword == "" || dbName == "" {
		return nil, errors.New("database configuration is incomplete")
	}

	// Load S3 config
	s3AccessKey := os.Getenv("S3_ACCESS_KEY")
	s3SecretKey := os.Getenv("S3_SECRET_KEY")
	s3Region := os.Getenv("S3_REGION")
	s3Bucket := os.Getenv("S3_BUCKET")
	s3Endpoint := os.Getenv("S3_ENDPOINT")
	s3UsePathStyle, _ := strconv.ParseBool(os.Getenv("S3_USE_PATH_STYLE"))

	if s3AccessKey == "" || s3SecretKey == "" || s3Region == "" || s3Bucket == "" {
		return nil, errors.New("S3 configuration is incomplete")
	}

	// Load JWT config
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("JWT secret is required")
	}

	jwtExpirationMin, err := strconv.Atoi(os.Getenv("JWT_EXPIRATION_MIN"))
	if err != nil {
		jwtExpirationMin = 60 * 24 * 7 // 7 days
	}

	return &Config{
		Server: ServerConfig{
			Port:         port,
			AllowOrigins: allowOrigins,
		},
		Database: DatabaseConfig{
			Host:     dbHost,
			Port:     dbPort,
			User:     dbUser,
			Password: dbPassword,
			DBName:   dbName,
			SSLMode:  dbSSLMode,
		},
		S3: S3Config{
			AccessKey:    s3AccessKey,
			SecretKey:    s3SecretKey,
			Region:       s3Region,
			Bucket:       s3Bucket,
			Endpoint:     s3Endpoint,
			UsePathStyle: s3UsePathStyle,
		},
		JWT: JWTConfig{
			Secret:        jwtSecret,
			ExpirationMin: jwtExpirationMin,
		},
	}, nil
}
