package storage

import (
	"bytes"
	"context"
	"fmt"
	"net/url"
	"path/filepath"
	"time"

	"backend/configs"

	"github.com/aws/aws-sdk-go-v2/aws"
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
	// Create custom resolver if endpoint is provided
	var resolver aws.EndpointResolverWithOptions
	if config.Endpoint != "" {
		resolver = aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:               config.Endpoint,
				SigningRegion:     region,
				HostnameImmutable: true,
			}, nil
		})
	}

	// Configure AWS SDK
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(config.Region),
		config.WithEndpointResolverWithOptions(resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			config.AccessKey,
			config.SecretKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create S3 client with options
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		if config.UsePathStyle {
			o.UsePathStyle = true
		}
	})

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
	// If using a custom endpoint
	endpoint := ""
	if s3endpoint := s.client.Options().EndpointResolver; s3endpoint != nil {
		// You would need to adapt this based on your actual endpoint configuration
		endpoint = fmt.Sprintf("https://%s.%s/%s", s.bucket, "your-s3-endpoint", url.PathEscape(s3Path))
		return endpoint
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
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s3Path),
	})
	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	return nil
}
