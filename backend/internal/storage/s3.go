package storage

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"backend/configs"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// S3Client handles file operations with AWS S3
type S3Client struct {
	client *s3.Client
	bucket string
}

// NewS3Client creates a new S3 client
func NewS3Client(config configs.S3Config) (*S3Client, error) {
	// Load AWS configuration options
	var options []func(*awsconfig.LoadOptions) error

	// Add region
	options = append(options, awsconfig.WithRegion(config.Region))

	// Add credentials
	options = append(options, awsconfig.WithCredentialsProvider(
		credentials.NewStaticCredentialsProvider(
			config.AccessKey,
			config.SecretKey,
			"",
		),
	))

	// Configure custom endpoint if provided
	if config.Endpoint != "" {
		customResolver := aws.EndpointResolverFunc(func(service, region string) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           config.Endpoint,
				SigningRegion: region,
			}, nil
		})
		options = append(options, awsconfig.WithEndpointResolver(customResolver))
	}

	// Load configuration
	cfg, err := awsconfig.LoadDefaultConfig(context.TODO(), options...)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// S3 client options
	s3Options := func(o *s3.Options) {
		if config.UsePathStyle {
			o.UsePathStyle = true
		}
	}

	// Create S3 client with options
	s3Client := s3.NewFromConfig(cfg, s3Options)

	return &S3Client{
		client: s3Client,
		bucket: config.Bucket,
	}, nil
}

// UploadFile uploads a file to S3
func (s *S3Client) UploadFile(ctx context.Context, fileData []byte, fileName string, contentType string) (string, error) {
	// Generate unique file name
	ext := filepath.Ext(fileName)
	uniqueFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Set folder based on content type
	var folder string
	if contentType == "image/jpeg" || contentType == "image/png" || contentType == "image/gif" {
		folder = "images/"
	} else if contentType == "video/mp4" || contentType == "video/webm" {
		folder = "videos/"
	} else {
		folder = "files/"
	}

	// Full path in S3
	s3Path := folder + uniqueFileName

	// Upload to S3
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(s3Path),
		Body:        bytes.NewReader(fileData),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file to S3: %w", err)
	}

	// Return public URL
	return s.GetPublicURL(s3Path), nil
}

// GetPublicURL returns a public URL for a file
func (s *S3Client) GetPublicURL(s3Path string) string {
	// For custom endpoints
	if s.client.Options().BaseEndpoint != nil {
		return fmt.Sprintf("%s/%s/%s", *s.client.Options().BaseEndpoint, s.bucket, url.PathEscape(s3Path))
	}

	// Standard S3 URL format
	return fmt.Sprintf("https://%s.s3.amazonaws.com/%s", s.bucket, url.PathEscape(s3Path))
}

// GetPresignedURL gets a presigned URL for a file
func (s *S3Client) GetPresignedURL(ctx context.Context, s3Path string, duration time.Duration) (string, error) {
	presignClient := s3.NewPresignClient(s.client)

	request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s3Path),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = duration
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return request.URL, nil
}

// DeleteFile deletes a file from S3
func (s *S3Client) DeleteFile(ctx context.Context, s3Path string) error {
	// Log the deletion attempt for debugging
	log.Printf("Attempting to delete file from S3: bucket=%s, key=%s", s.bucket, s3Path)

	// If s3Path is a full URL, extract just the path component
	if strings.HasPrefix(s3Path, "http://") || strings.HasPrefix(s3Path, "https://") {
		parsedURL, err := url.Parse(s3Path)
		if err != nil {
			return fmt.Errorf("invalid URL format for S3 path: %w", err)
		}

		// Extract path from URL
		path := parsedURL.Path
		if strings.HasPrefix(path, "/") {
			path = path[1:] // Remove leading slash
		}

		// Check if path contains bucket name as prefix
		if strings.HasPrefix(path, s.bucket+"/") {
			path = strings.TrimPrefix(path, s.bucket+"/")
			s3Path = path
		} else {
			s3Path = path
		}
	}

	// Check if we're missing the folder prefix for media files
	if !strings.HasPrefix(s3Path, "images/") &&
		!strings.HasPrefix(s3Path, "videos/") &&
		!strings.HasPrefix(s3Path, "files/") {

		// Check file extension to determine folder
		ext := strings.ToLower(filepath.Ext(s3Path))
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" {
			s3Path = "images/" + s3Path
		} else if ext == ".mp4" || ext == ".webm" || ext == ".mov" {
			s3Path = "videos/" + s3Path
		} else {
			s3Path = "files/" + s3Path
		}
	}

	log.Printf("Final S3 path for deletion: bucket=%s, key=%s", s.bucket, s3Path)

	// Execute the delete operation
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s3Path),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	// Log success
	log.Printf("Successfully deleted file from S3: bucket=%s, key=%s", s.bucket, s3Path)
	return nil
}
