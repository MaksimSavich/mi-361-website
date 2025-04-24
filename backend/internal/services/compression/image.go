package compression

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp" // Register WebP format
)

// Maximum dimensions for compressed images
const (
	MaxWidth    = 1920
	MaxHeight   = 1080
	JpegQuality = 85
)

// CompressImage compresses an image to reduce file size
func CompressImage(data []byte, contentType string) ([]byte, error) {
	// Add format conversion for non-standard image formats
	var err error
	data, contentType, err = ConvertImageFormat(data, contentType)
	if err != nil {
		return nil, fmt.Errorf("failed to convert image format: %w", err)
	}

	// Decode image
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	// Check if resizing is needed
	var newWidth, newHeight int
	if origWidth > MaxWidth || origHeight > MaxHeight {
		// Calculate aspect ratio
		ratio := float64(origWidth) / float64(origHeight)

		if origWidth > origHeight {
			// Landscape orientation
			newWidth = MaxWidth
			newHeight = int(float64(MaxWidth) / ratio)
		} else {
			// Portrait orientation
			newHeight = MaxHeight
			newWidth = int(float64(MaxHeight) * ratio)
		}

		// Create a new image with the calculated dimensions
		dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		img = dst
	} else {
		// No resizing needed
		newWidth = origWidth
		newHeight = origHeight
	}

	// Encode image with compression
	var buf bytes.Buffer
	switch contentType {
	case "image/jpeg":
		err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: JpegQuality})
	case "image/png":
		err = png.Encode(&buf, img)
	default:
		// Default to JPEG for other formats
		err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: JpegQuality})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to encode compressed image: %w", err)
	}

	return buf.Bytes(), nil
}

// ConvertImageFormat converts non-standard image formats (like HEIC) to JPEG
func ConvertImageFormat(data []byte, contentType string) ([]byte, string, error) {
	// Check if conversion is needed
	switch contentType {
	case "image/heic", "image/heif":
		return convertHEIC(data)
	case "image/jpeg", "image/png", "image/webp":
		// Already supported formats
		return data, contentType, nil
	default:
		// Try to detect format from magic bytes
		if isHEIC(data) {
			return convertHEIC(data)
		}
		// For other unrecognized formats, try to decode and re-encode as JPEG
		img, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			// If we can't decode, return original data
			return data, contentType, nil
		}

		var buf bytes.Buffer
		err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: JpegQuality})
		if err != nil {
			return data, contentType, nil
		}

		return buf.Bytes(), "image/jpeg", nil
	}
}

// isHEIC checks if data is in HEIC format based on magic bytes
func isHEIC(data []byte) bool {
	if len(data) < 12 {
		return false
	}

	// HEIC files typically start with ftyp marker
	if bytes.Equal(data[4:8], []byte("ftyp")) {
		// Check for HEIC brand
		if bytes.Equal(data[8:12], []byte("heic")) ||
			bytes.Equal(data[8:12], []byte("heix")) ||
			bytes.Equal(data[8:12], []byte("hevc")) ||
			bytes.Equal(data[8:12], []byte("mif1")) {
			return true
		}
	}
	return false
}

// convertHEIC converts HEIC images to JPEG using external tools
func convertHEIC(data []byte) ([]byte, string, error) {
	// Create temporary directories
	tempDir, err := os.MkdirTemp("", "heic_conversion")
	if err != nil {
		return nil, "", fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Write HEIC data to temp file
	heicPath := filepath.Join(tempDir, "input.heic")
	if err := os.WriteFile(heicPath, data, 0644); err != nil {
		return nil, "", fmt.Errorf("failed to write temp HEIC file: %w", err)
	}

	// Define output JPEG path
	jpegPath := filepath.Join(tempDir, "output.jpg")

	// First try ImageMagick if available
	cmd := exec.Command("convert", heicPath, jpegPath)
	if err := cmd.Run(); err != nil {
		// If ImageMagick fails, try libheif-tools (heif-convert)
		cmd = exec.Command("heif-convert", "-q", "85", heicPath, jpegPath)
		if err := cmd.Run(); err != nil {
			// If external tools fail, try ffmpeg as a last resort
			cmd = exec.Command("ffmpeg", "-i", heicPath, "-q:v", "2", jpegPath)
			if err := cmd.Run(); err != nil {
				return nil, "", fmt.Errorf("failed to convert HEIC to JPEG: %w", err)
			}
		}
	}

	// Read the converted JPEG file
	jpegData, err := os.ReadFile(jpegPath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read converted JPEG file: %w", err)
	}

	return jpegData, "image/jpeg", nil
}
