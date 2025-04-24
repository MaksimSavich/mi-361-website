package compression

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/google/uuid"
)

// CompressVideo compresses a video to reduce file size using FFmpeg
// Also handles format conversion for wider compatibility
func CompressVideo(data []byte, contentType string) ([]byte, string, error) {
	// Create temporary directory
	tempDir, err := os.MkdirTemp("", "video_compression")
	if err != nil {
		return nil, "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Determine file extension
	var ext string
	outputContentType := "video/mp4" // Default to MP4 for best compatibility

	switch contentType {
	case "video/mp4":
		ext = ".mp4"
	case "video/webm":
		ext = ".webm"
	case "video/quicktime", "video/mov":
		ext = ".mov"
	case "video/3gpp":
		ext = ".3gp"
	default:
		ext = ".unknown"
	}

	// Create input file
	inputPath := filepath.Join(tempDir, uuid.New().String()+ext)
	if err := os.WriteFile(inputPath, data, 0644); err != nil {
		return nil, "", fmt.Errorf("failed to write input file: %w", err)
	}

	// Create output file (always MP4 for best compatibility)
	outputPath := filepath.Join(tempDir, uuid.New().String()+".mp4")

	// Compress and convert video using FFmpeg
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
		return nil, "", fmt.Errorf("ffmpeg compression failed: %w", err)
	}

	// Read compressed file
	compressedData, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read compressed file: %w", err)
	}

	return compressedData, outputContentType, nil
}

// CheckVideoCompatibility checks if a video format is supported by web browsers
// or needs conversion
func CheckVideoCompatibility(fileData []byte, contentType string) bool {
	// MP4 and WebM are broadly supported
	if contentType == "video/mp4" || contentType == "video/webm" {
		return true
	}

	// For other formats, we need to convert them
	return false
}
