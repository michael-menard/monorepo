# @monorepo/image-processing

Image processing utilities using Sharp for resizing, optimization, and format conversion.

## Installation

```bash
npm install @monorepo/image-processing
```

## Features

- Image resizing with aspect ratio preservation
- Format conversion (WebP, JPEG, PNG)
- Quality optimization
- Thumbnail generation
- Image validation
- Metadata extraction

## Usage

### processImage()

Process an image with resizing, optimization, and format conversion.

```typescript
import { processImage } from '@monorepo/image-processing'
import fs from 'fs/promises'

// Read image file
const buffer = await fs.readFile('photo.jpg')

// Process with default options (max 2048px width, 80% quality, WebP format)
const result = await processImage(buffer)
console.log(result)
// {
//   buffer: Buffer,
//   width: 1920,
//   height: 1080,
//   format: 'webp',
//   size: 245678
// }

// Custom processing options
const customResult = await processImage(buffer, {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 90,
  format: 'jpeg'
})

// Save processed image
await fs.writeFile('output.jpg', customResult.buffer)
```

### generateThumbnail()

Generate a thumbnail from an image buffer.

```typescript
import { generateThumbnail } from '@monorepo/image-processing'
import fs from 'fs/promises'

const buffer = await fs.readFile('photo.jpg')

// Generate thumbnail with default 400px width
const thumbnail = await generateThumbnail(buffer)
console.log(thumbnail)
// {
//   buffer: Buffer,
//   width: 400,
//   height: 225,
//   format: 'webp',
//   size: 12345
// }

// Custom thumbnail width
const largeThumbnail = await generateThumbnail(buffer, 800)

// Save thumbnail
await fs.writeFile('thumbnail.webp', thumbnail.buffer)
```

### validateImageBuffer()

Validate if a buffer contains a valid image.

```typescript
import { validateImageBuffer } from '@monorepo/image-processing'
import fs from 'fs/promises'

const imageBuffer = await fs.readFile('photo.jpg')
const textBuffer = await fs.readFile('document.txt')

const isValidImage = await validateImageBuffer(imageBuffer)
console.log(isValidImage) // true

const isValidText = await validateImageBuffer(textBuffer)
console.log(isValidText) // false

// Use in upload validation
async function validateUpload(buffer: Buffer) {
  if (!await validateImageBuffer(buffer)) {
    throw new Error('Invalid image file')
  }
  return processImage(buffer)
}
```

### getImageMetadata()

Extract metadata from an image without processing it.

```typescript
import { getImageMetadata } from '@monorepo/image-processing'
import fs from 'fs/promises'

const buffer = await fs.readFile('photo.png')

const metadata = await getImageMetadata(buffer)
console.log(metadata)
// {
//   width: 1920,
//   height: 1080,
//   format: 'png',
//   size: 567890,
//   hasAlpha: true
// }

// Check image dimensions before processing
if (metadata.width > 4000 || metadata.height > 4000) {
  console.log('Image is very large, processing may take longer')
}
```

## API Reference

### Types

#### `ProcessedImage`

```typescript
interface ProcessedImage {
  buffer: Buffer       // Processed image data
  width: number        // Image width in pixels
  height: number       // Image height in pixels
  format: string       // Image format (webp, jpeg, png)
  size: number         // Buffer size in bytes
}
```

#### `ImageProcessingOptions`

```typescript
interface ImageProcessingOptions {
  maxWidth?: number                    // Maximum width (default: 2048)
  maxHeight?: number                   // Maximum height (optional)
  quality?: number                     // Quality 1-100 (default: 80)
  format?: 'webp' | 'jpeg' | 'png'    // Output format (default: 'webp')
}
```

### Functions

#### `processImage(buffer: Buffer, options?: ImageProcessingOptions): Promise<ProcessedImage>`

Process an image with resizing, optimization, and format conversion.

- Maintains aspect ratio when resizing
- Does not upscale images smaller than maxWidth/maxHeight
- Throws error if processing fails

#### `generateThumbnail(buffer: Buffer, width?: number): Promise<ProcessedImage>`

Generate a thumbnail with specified width (default: 400px).

- Always outputs WebP format at 80% quality
- Maintains aspect ratio

#### `validateImageBuffer(buffer: Buffer): Promise<boolean>`

Check if a buffer contains a valid image.

- Returns `true` for valid images
- Returns `false` for invalid or corrupted data

#### `getImageMetadata(buffer: Buffer): Promise<Metadata>`

Extract image metadata without processing.

Returns:
```typescript
{
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
}
```

## Examples

### Lambda Handler for Image Upload

```typescript
import { processImage, generateThumbnail, validateImageBuffer } from '@monorepo/image-processing'
import { APIGatewayProxyHandler } from 'aws-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({})

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse uploaded image from base64
    const buffer = Buffer.from(event.body || '', 'base64')

    // Validate image
    if (!await validateImageBuffer(buffer)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid image file' })
      }
    }

    // Process full image
    const processed = await processImage(buffer, {
      maxWidth: 2048,
      quality: 85,
      format: 'webp'
    })

    // Generate thumbnail
    const thumbnail = await generateThumbnail(buffer, 400)

    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: 'my-bucket',
      Key: 'images/full.webp',
      Body: processed.buffer,
      ContentType: 'image/webp'
    }))

    await s3.send(new PutObjectCommand({
      Bucket: 'my-bucket',
      Key: 'images/thumb.webp',
      Body: thumbnail.buffer,
      ContentType: 'image/webp'
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({
        image: {
          width: processed.width,
          height: processed.height,
          size: processed.size
        },
        thumbnail: {
          width: thumbnail.width,
          height: thumbnail.height,
          size: thumbnail.size
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Image processing failed' })
    }
  }
}
```

### Multiple Size Variants

```typescript
import { processImage } from '@monorepo/image-processing'
import fs from 'fs/promises'

async function createImageVariants(inputPath: string) {
  const buffer = await fs.readFile(inputPath)

  const sizes = [
    { name: 'large', maxWidth: 2048, quality: 85 },
    { name: 'medium', maxWidth: 1024, quality: 80 },
    { name: 'small', maxWidth: 640, quality: 75 },
    { name: 'thumb', maxWidth: 300, quality: 70 }
  ]

  const results = await Promise.all(
    sizes.map(async ({ name, maxWidth, quality }) => {
      const processed = await processImage(buffer, {
        maxWidth,
        quality,
        format: 'webp'
      })

      await fs.writeFile(`output-${name}.webp`, processed.buffer)

      return { name, ...processed }
    })
  )

  return results
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run type-check

# Run tests
npm test

# Clean dist
npm run clean
```

## License

MIT
