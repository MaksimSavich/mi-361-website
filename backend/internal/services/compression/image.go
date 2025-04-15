package compression

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"

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
	// Decode image
	img, format, err := image.Decode(bytes.NewReader(data))
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
