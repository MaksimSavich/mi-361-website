package compression

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/google/uuid"
)

// CompressVideo compresses a video to reduce file size using FFmpeg
// Note: This is a simplified example. In a real application, you'd want to
// use a more sophisticated approach, possibly with a queue system for background processing.
func CompressVideo(data []byte, contentType string) ([]byte, error) {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "video_compression")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Determine file extension
	var ext string
	switch contentType {
	case "video/mp4":
		ext = ".mp4"
	case "video/webm":
		ext = ".webm"
	default:
		return nil, errors.New("unsupported video format")
	}

	// Create input file
	inputPath := filepath.Join(tempDir, uuid.New().String()+ext)
	if err := os.WriteFile(inputPath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write input file: %w", err)
	}

	// Create output file
	outputPath := filepath.Join(tempDir, uuid.New().String()+ext)

	// Compress video using FFmpeg
	cmd := exec.Command(
		"ffmpeg",
		"-i", inputPath,
		"-c:v", "libx264",
		"-crf", "23",
		"-preset", "medium",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart",
		"-vf", "scale=trunc(min(1920,iw)/2)*2:trunc(min(1080,ih)/2)*2",
		outputPath,
	)

	// Run compression
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg compression failed: %w", err)
	}

	// Read compressed file
	compressedData, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read compressed file: %w", err)
	}

	return compressedData, nil
}

func CheckVideoCompatibility(fileData []byte, contentType string) bool {
	// Basic check based on content type
	if contentType == "video/mp4" || contentType == "video/webm" {
		return true
	}

	// For simplicity, just check the content type
	// In a more sophisticated implementation, you could check the codec
	// using ffprobe or other tools
	return false
}
