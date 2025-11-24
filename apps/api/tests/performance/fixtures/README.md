# Performance Test Fixtures

This directory contains test fixtures used during load testing.

## Test Image

For image upload testing, you need to provide a test image file:

### Option 1: Use a Small Test Image (Recommended)

Create a small JPEG image (< 500KB) for performance testing:

```bash
# Using ImageMagick (if installed)
convert -size 800x600 xc:blue -pointsize 72 -fill white \
  -annotate +100+300 "Test Image" \
  test-image.jpg

# Or download a sample image
curl -o test-image.jpg https://via.placeholder.com/800x600.jpg
```

### Option 2: Use Your Own Image

Copy any JPEG image to this directory and name it `test-image.jpg`:

```bash
cp /path/to/your/image.jpg tests/performance/fixtures/test-image.jpg
```

## Requirements

- **File name**: `test-image.jpg`
- **Format**: JPEG
- **Size**: Recommended < 500KB (to avoid timeouts during high-load testing)
- **Dimensions**: Recommended 800x600 or 1024x768

## Validation

Before running performance tests, verify the fixture exists:

```bash
ls -lh tests/performance/fixtures/test-image.jpg
```

You should see a file with reasonable size (< 500KB recommended).
