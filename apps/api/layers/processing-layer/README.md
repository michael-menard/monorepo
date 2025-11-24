# Processing Lambda Layer

## Overview

The processing layer contains specialized dependencies for image and file processing operations. This layer is used by only ~7 Lambda functions that handle file uploads, image transformations, and parts list parsing. By separating these heavy dependencies, we keep the standard layer smaller and improve cold starts for non-processing functions.

## Contents

### Dependencies

- **sharp** (0.34.5) - High-performance image processing (WebP conversion, resizing, thumbnails)
- **csv-parser** (3.2.0) - CSV file parsing for parts lists
- **xmldom** (0.6.0) - XML document parsing for LEGO parts list formats

### Monorepo Packages

- `@monorepo/image-processing` - Image validation, processing, and thumbnail generation
- `@monorepo/file-validator` - File upload validation (magic bytes, MIME types, size limits)

## Used By

### Lambda Functions (Minimal + Standard + Processing)

**Gallery (1 function):**

- GalleryUploadImage - Processes uploaded images with Sharp, generates thumbnails

**Wishlist (1 function):**

- WishlistUploadImage - Image processing for wishlist items

**MOC Instructions (3 functions):**

- MocInstructionsUploadFile - File validation and processing
- MocInstructionsInitializeWithFiles - Multi-file upload initialization
- MocInstructionsFinalizeWithFiles - Finalizes MOC with processed files

**MOC Parts Lists (1 function):**

- MocPartsListsParse - Parses CSV/XML parts lists from Rebrickable and BrickLink

**Total: ~7 Lambda functions**

## Size Estimate

- ~60MB zipped
- ~180MB unzipped
- **Sharp alone:** ~45MB (largest dependency due to native bindings)

## How to Update Dependencies

### 1. Update package.json

Edit `package.json` and update the version number.

**IMPORTANT for Sharp:** Sharp uses native bindings compiled for specific platforms. Always install using:

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/layers/processing-layer
pnpm install --prod --platform=linux --arch=x64
```

### 2. Test Image Processing Locally

Test with actual image files before deploying:

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api
pnpm test:integration -- upload-image
```

### 3. Rebuild the Layer

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/layers
./build-and-deploy-layers.sh [stage] [region]
```

### 4. Deploy Affected Lambdas

Only ~7 functions use this layer:

```bash
node scripts/get-affected-lambdas.js --layer processing
```

## Build Process

### Directory Structure

```
processing-layer/
├── nodejs/
│   └── node_modules/
│       ├── sharp/          # Native bindings for Linux x64
│       ├── csv-parser/
│       └── xmldom/
├── package.json
└── processing-layer.zip
```

### Sharp Native Bindings

Sharp requires special handling because it includes native code:

1. **Platform-specific:** Must be built for Linux x64 (Lambda runtime)
2. **Not portable:** macOS/Windows builds won't work in Lambda
3. **Build in Docker** (optional) for guaranteed compatibility:
   ```bash
   docker run --rm -v "$PWD":/var/task lambci/lambda:build-nodejs20.x \
     npm install --production --platform=linux --arch=x64
   ```

## Local Development

During `sst dev`:

1. Uses local Sharp installation (built for your OS)
2. Dependencies from main `apps/api/package.json`
3. Image processing works locally without the layer

## Performance Characteristics

### Cold Start Impact

- Adds ~300-600ms to cold starts (Sharp is heavy)
- Total cold start for upload functions: 2-3 seconds
- Acceptable for user-initiated upload operations

### Memory Requirements

- Sharp requires at least 512MB Lambda memory
- Recommend 1024MB for large images (>5MB)
- Configure in sst.config.ts:
  ```typescript
  new sst.aws.Function('GalleryUploadImage', {
    memory: '1024 MB',
    // ...
  })
  ```

### Image Processing Performance

- WebP conversion: ~200-500ms for 2-5MB images
- Thumbnail generation: ~100-200ms
- Runs in parallel when possible

## Troubleshooting

### "Cannot find module 'sharp'" in deployed Lambda

1. Verify Sharp was installed with correct platform flags:
   ```bash
   cd nodejs/node_modules/sharp
   ls -la lib  # Should show Linux x64 binaries
   ```
2. Rebuild layer with `--platform=linux --arch=x64`
3. Consider using Docker build for guaranteed compatibility

### "sharp: Installation error" during layer build

1. Sharp requires Python and build tools
2. Install build dependencies:

   ```bash
   # macOS
   brew install python3 vips

   # Linux
   apt-get install python3 libvips-dev
   ```

3. Or use Docker build method (recommended for CI/CD)

### Image processing fails with "Input buffer contains unsupported image format"

1. Verify file validation accepts the image type
2. Check magic bytes validation in @monorepo/file-validator
3. Sharp supports: JPEG, PNG, WebP, AVIF, GIF, SVG, TIFF

### Out of memory errors during image processing

1. Increase Lambda memory allocation (minimum 512MB, recommend 1024MB)
2. Add image size validation (reject files >10MB)
3. Process images in chunks for very large files

### CSV parsing errors for parts lists

1. Check CSV file encoding (should be UTF-8)
2. Verify CSV structure matches expected format
3. Add error handling for malformed CSV rows

### Layer size exceeds limits

1. Sharp is the largest dependency (~45MB)
2. Cannot reduce much without removing functionality
3. Ensure other dependencies are minimal
4. Current size (~60MB zipped) is well within 250MB limit

## Image Formats Supported

### Input Formats (Sharp)

- JPEG/JPG
- PNG
- WebP
- AVIF
- GIF (first frame only)
- SVG
- TIFF

### Output Formats

- WebP (default) - Best compression/quality balance
- JPEG - For compatibility
- PNG - For images requiring transparency

## Parts List Formats Supported

### CSV

- Rebrickable format
- BrickLink format
- Custom CSV with headers: `part_num,quantity,color,name`

### XML

- BrickLink XML export format
- LEGO Digital Designer (LDD) XML
