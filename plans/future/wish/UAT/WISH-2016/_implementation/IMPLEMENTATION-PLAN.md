# Implementation Plan - WISH-2016

## Image Optimization - Automatic Resizing, Compression, and Watermarking

---

## Overview

This plan implements automatic image optimization for wishlist uploads:
- **Image Processing Service**: Sharp-based resizing, compression, WebP conversion
- **Watermark Service**: Overlay watermark on large images only
- **S3 Event Handler**: Lambda triggered by S3 uploads
- **Database Migration**: Add `image_variants` JSONB column
- **Frontend Updates**: Responsive images with picture element and srcset

---

## Phase 1: Zod Schemas and Types

### 1.1 Image Variants Schema (Shared)

**File**: `packages/core/api-client/src/schemas/wishlist.ts`

Add new schemas for image variants:

```typescript
// Image variant metadata schema
export const ImageVariantMetadataSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  format: z.enum(['jpeg', 'webp', 'png']),
  watermarked: z.boolean().optional(),
})

export type ImageVariantMetadata = z.infer<typeof ImageVariantMetadataSchema>

// Complete image variants structure
export const ImageVariantsSchema = z.object({
  original: ImageVariantMetadataSchema.optional(),
  thumbnail: ImageVariantMetadataSchema.optional(),
  medium: ImageVariantMetadataSchema.optional(),
  large: ImageVariantMetadataSchema.optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  processedAt: z.string().datetime().optional(),
})

export type ImageVariants = z.infer<typeof ImageVariantsSchema>
```

Update `WishlistItemSchema` to include `imageVariants`:

```typescript
export const WishlistItemSchema = z.object({
  // ... existing fields
  imageVariants: ImageVariantsSchema.nullable(),
})
```

---

## Phase 2: Backend - Image Processing Service

### 2.1 Directory Structure

```
apps/api/lego-api/core/image-processing/
  __tests__/
    optimizer.test.ts       # 20+ unit tests
    watermark.test.ts       # Unit tests for watermark
  __types__/
    index.ts                # Zod schemas for image processing
  optimizer.ts              # Sharp integration
  watermark.ts              # Watermark overlay
  index.ts                  # Exports
```

### 2.2 Image Processing Types

**File**: `apps/api/lego-api/core/image-processing/__types__/index.ts`

```typescript
import { z } from 'zod'

export const ImageSizeSchema = z.enum(['thumbnail', 'medium', 'large'])
export type ImageSize = z.infer<typeof ImageSizeSchema>

export const ImageSizeConfigSchema = z.object({
  name: ImageSizeSchema,
  maxWidth: z.number().int().positive(),
  maxHeight: z.number().int().positive(),
  quality: z.number().int().min(1).max(100),
  applyWatermark: z.boolean(),
})

export type ImageSizeConfig = z.infer<typeof ImageSizeConfigSchema>

export const ProcessedImageSchema = z.object({
  size: ImageSizeSchema,
  buffer: z.instanceof(Buffer),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.enum(['webp', 'jpeg']),
  sizeBytes: z.number().int().positive(),
  watermarked: z.boolean(),
})

export type ProcessedImage = z.infer<typeof ProcessedImageSchema>

export const WatermarkOptionsSchema = z.object({
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
  opacity: z.number().min(0).max(1),
  margin: z.number().int().nonnegative(),
  width: z.number().int().positive(),
})

export type WatermarkOptions = z.infer<typeof WatermarkOptionsSchema>
```

### 2.3 Image Optimizer Port and Adapter

**File**: `apps/api/lego-api/core/image-processing/optimizer.ts`

```typescript
import sharp from 'sharp'
import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ImageSize, ImageSizeConfig, ProcessedImage } from './__types__/index.js'

// Size configurations per AC1
export const SIZE_CONFIGS: Record<ImageSize, ImageSizeConfig> = {
  thumbnail: { name: 'thumbnail', maxWidth: 200, maxHeight: 200, quality: 85, applyWatermark: false },
  medium: { name: 'medium', maxWidth: 800, maxHeight: 800, quality: 85, applyWatermark: false },
  large: { name: 'large', maxWidth: 1600, maxHeight: 1600, quality: 85, applyWatermark: true },
}

// Port interface
export interface ImageOptimizerPort {
  resize(input: Buffer, config: ImageSizeConfig): Promise<ProcessedImage>
  getImageMetadata(input: Buffer): Promise<{ width: number; height: number; format: string }>
  processAllSizes(input: Buffer, watermarkBuffer?: Buffer): Promise<ProcessedImage[]>
}

// Sharp adapter implementation
export function createSharpImageOptimizer(): ImageOptimizerPort {
  return {
    async resize(input: Buffer, config: ImageSizeConfig): Promise<ProcessedImage> {
      const { maxWidth, maxHeight, quality, name } = config

      const image = sharp(input)
      const metadata = await image.metadata()

      // Calculate dimensions maintaining aspect ratio
      const { width, height } = calculateDimensions(
        metadata.width || 0,
        metadata.height || 0,
        maxWidth,
        maxHeight
      )

      // Resize and convert to WebP
      const resized = await image
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      return {
        size: name,
        buffer: resized,
        width,
        height,
        format: 'webp',
        sizeBytes: resized.length,
        watermarked: false,
      }
    },

    async getImageMetadata(input: Buffer) {
      const metadata = await sharp(input).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
      }
    },

    async processAllSizes(input: Buffer, watermarkBuffer?: Buffer): Promise<ProcessedImage[]> {
      const results: ProcessedImage[] = []

      for (const [size, config] of Object.entries(SIZE_CONFIGS)) {
        const processed = await this.resize(input, config)

        // Apply watermark to large only (AC4)
        if (config.applyWatermark && watermarkBuffer) {
          const watermarked = await applyWatermark(processed.buffer, watermarkBuffer, {
            position: 'bottom-right',
            opacity: 0.1,
            margin: 20,
            width: 100,
          })
          processed.buffer = watermarked
          processed.sizeBytes = watermarked.length
          processed.watermarked = true
        }

        results.push(processed)
      }

      return results
    },
  }
}

// Helper function to calculate dimensions
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Don't upscale images (AC: Small Image test case)
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight)
  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  }
}
```

### 2.4 Watermark Service

**File**: `apps/api/lego-api/core/image-processing/watermark.ts`

```typescript
import sharp from 'sharp'
import type { WatermarkOptions } from './__types__/index.js'

export async function applyWatermark(
  imageBuffer: Buffer,
  watermarkBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const { position, opacity, margin, width } = options

  // Get image dimensions
  const imageMetadata = await sharp(imageBuffer).metadata()
  const imageWidth = imageMetadata.width || 0
  const imageHeight = imageMetadata.height || 0

  // Resize watermark to specified width, maintaining aspect ratio
  const resizedWatermark = await sharp(watermarkBuffer)
    .resize(width, null, { fit: 'inside' })
    .toBuffer()

  const watermarkMetadata = await sharp(resizedWatermark).metadata()
  const watermarkWidth = watermarkMetadata.width || 0
  const watermarkHeight = watermarkMetadata.height || 0

  // Calculate position
  const { left, top } = calculateWatermarkPosition(
    imageWidth,
    imageHeight,
    watermarkWidth,
    watermarkHeight,
    position,
    margin
  )

  // Apply watermark with opacity
  const watermarkWithOpacity = await sharp(resizedWatermark)
    .ensureAlpha()
    .modulate({ brightness: 1 })
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .toBuffer()

  // Composite watermark onto image
  return sharp(imageBuffer)
    .composite([
      {
        input: watermarkWithOpacity,
        left,
        top,
        blend: 'over',
      },
    ])
    .toBuffer()
}

function calculateWatermarkPosition(
  imageWidth: number,
  imageHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  position: WatermarkOptions['position'],
  margin: number
): { left: number; top: number } {
  switch (position) {
    case 'bottom-right':
      return {
        left: imageWidth - watermarkWidth - margin,
        top: imageHeight - watermarkHeight - margin,
      }
    case 'bottom-left':
      return { left: margin, top: imageHeight - watermarkHeight - margin }
    case 'top-right':
      return { left: imageWidth - watermarkWidth - margin, top: margin }
    case 'top-left':
      return { left: margin, top: margin }
  }
}
```

---

## Phase 3: S3 Event Handler Lambda

### 3.1 Directory Structure

```
apps/api/lego-api/functions/image-processor/
  __tests__/
    handler.test.ts         # 15+ integration tests
  handler.ts                # S3 event Lambda handler
```

### 3.2 Lambda Handler

**File**: `apps/api/lego-api/functions/image-processor/handler.ts`

```typescript
import type { S3Event, S3Handler, Context } from 'aws-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@repo/logger'
import { createSharpImageOptimizer } from '../../core/image-processing/optimizer.js'
import { ImageVariantsSchema } from '@repo/api-client/schemas/wishlist'

const s3Client = new S3Client({})
const optimizer = createSharpImageOptimizer()

export const handler: S3Handler = async (event: S3Event, context: Context) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    // Skip if already processed (variants exist)
    if (key.includes('-thumbnail') || key.includes('-medium') || key.includes('-large')) {
      logger.info('Skipping already processed image', { key })
      continue
    }

    try {
      await processImage(bucket, key)
    } catch (error) {
      logger.error('Image processing failed', {
        bucket,
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      // Will be retried by Lambda retry policy
      throw error
    }
  }
}

async function processImage(bucket: string, key: string): Promise<void> {
  // 1. Download original image from S3
  const original = await downloadFromS3(bucket, key)

  // 2. Get watermark (if available)
  const watermarkKey = process.env.WATERMARK_S3_KEY || 'assets/watermark-logo.png'
  let watermarkBuffer: Buffer | undefined
  try {
    watermarkBuffer = await downloadFromS3(bucket, watermarkKey)
  } catch {
    logger.warn('Watermark not found, proceeding without watermark', { watermarkKey })
  }

  // 3. Process all sizes
  const processed = await optimizer.processAllSizes(original, watermarkBuffer)

  // 4. Upload variants to S3
  const variants: Record<string, object> = {}
  for (const image of processed) {
    const variantKey = generateVariantKey(key, image.size)
    await uploadToS3(bucket, variantKey, image.buffer, 'image/webp')

    variants[image.size] = {
      url: `https://${bucket}.s3.amazonaws.com/${variantKey}`,
      width: image.width,
      height: image.height,
      sizeBytes: image.sizeBytes,
      format: image.format,
      watermarked: image.watermarked,
    }
  }

  // 5. Get original metadata
  const originalMetadata = await optimizer.getImageMetadata(original)
  variants.original = {
    url: `https://${bucket}.s3.amazonaws.com/${key}`,
    width: originalMetadata.width,
    height: originalMetadata.height,
    sizeBytes: original.length,
    format: originalMetadata.format,
  }

  // 6. Update database with image_variants
  // Extract userId and imageId from key: wishlist/{userId}/{imageId}.{ext}
  const match = key.match(/wishlist\/([^/]+)\/([^.]+)/)
  if (match) {
    const [, userId, imageId] = match
    await updateDatabaseWithVariants(userId, imageId, variants)
  }

  logger.info('Image processing completed', {
    key,
    variants: Object.keys(variants),
    compressionRatio: calculateCompressionRatio(original.length, processed),
  })
}

async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3Client.send(command)
  const stream = response.Body as ReadableStream
  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

async function uploadToS3(bucket: string, key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await s3Client.send(command)
}

function generateVariantKey(originalKey: string, size: string): string {
  const lastDot = originalKey.lastIndexOf('.')
  const basePath = originalKey.substring(0, lastDot)
  return `${basePath}-${size}.webp`
}

function calculateCompressionRatio(originalSize: number, processed: Array<{ sizeBytes: number }>): number {
  const totalOptimizedSize = processed.reduce((sum, p) => sum + p.sizeBytes, 0)
  return Math.round((1 - totalOptimizedSize / originalSize) * 100)
}

async function updateDatabaseWithVariants(
  userId: string,
  imageId: string,
  variants: Record<string, object>
): Promise<void> {
  // This will use the repository to update the wishlist item
  // Implementation depends on how we access the database from Lambda
  logger.info('Database update with variants', { userId, imageId, variantCount: Object.keys(variants).length })
}
```

---

## Phase 4: Database Migration

### 4.1 Migration File

**File**: `packages/backend/database-schema/src/migrations/app/0008_add_image_variants.sql`

```sql
-- Migration: Add image_variants column to wishlist_items table
-- Story: WISH-2016 - Image Optimization

ALTER TABLE wishlist_items
  ADD COLUMN image_variants JSONB;

-- Index for querying image variants (for analytics and processing status queries)
CREATE INDEX idx_wishlist_items_image_variants_status
  ON wishlist_items USING btree ((image_variants->>'processingStatus'))
  WHERE image_variants IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN wishlist_items.image_variants IS
  'JSON structure storing original and optimized image URLs with metadata (thumbnail, medium, large). WISH-2016';
```

### 4.2 Schema Update

**File**: `packages/backend/database-schema/src/schema/index.ts`

Add `image_variants` column to the Drizzle schema:

```typescript
// In wishlistItems table definition
imageVariants: jsonb('image_variants').$type<ImageVariants>(),
```

---

## Phase 5: Frontend Updates

### 5.1 Responsive Image Component

**File**: `apps/web/app-wishlist-gallery/src/components/ResponsiveImage/index.tsx`

```typescript
import { z } from 'zod'
import type { ImageVariants } from '@repo/api-client/schemas/wishlist'

export const ResponsiveImagePropsSchema = z.object({
  variants: z.custom<ImageVariants>().nullable(),
  fallbackUrl: z.string().url().nullable(),
  alt: z.string(),
  size: z.enum(['thumbnail', 'medium', 'large']).default('medium'),
  className: z.string().optional(),
  loading: z.enum(['lazy', 'eager']).optional(),
})

export type ResponsiveImageProps = z.infer<typeof ResponsiveImagePropsSchema>

export function ResponsiveImage({
  variants,
  fallbackUrl,
  alt,
  size,
  className,
  loading = 'lazy',
}: ResponsiveImageProps) {
  // Use variant if available, fallback to original
  const variantData = variants?.[size]
  const webpUrl = variantData?.url
  const jpegUrl = variants?.original?.url || fallbackUrl

  // Fallback for legacy items (AC10)
  if (!variants && fallbackUrl) {
    console.warn(`Image variants not available for image, using fallback`)
    return (
      <img
        src={fallbackUrl}
        alt={alt}
        className={className}
        loading={loading}
      />
    )
  }

  if (!webpUrl && !jpegUrl) {
    return (
      <img
        src="/images/placeholder-lego.png"
        alt={alt}
        className={className}
        loading={loading}
      />
    )
  }

  // Use picture element for WebP with JPEG fallback (AC8, AC9)
  return (
    <picture>
      {webpUrl && <source type="image/webp" srcSet={webpUrl} />}
      <img
        src={jpegUrl || webpUrl}
        alt={alt}
        className={className}
        loading={loading}
        width={variantData?.width}
        height={variantData?.height}
      />
    </picture>
  )
}
```

### 5.2 Update WishlistCard

**File**: `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`

Update to use `ResponsiveImage`:

```typescript
// Import ResponsiveImage
import { ResponsiveImage } from '../ResponsiveImage/index.js'

// Update props schema to include imageVariants
export const WishlistCardPropsSchema = z.object({
  item: z.custom<WishlistItem>(),
  // ... existing props
})

// In component, replace GalleryCard image prop
<GalleryCard
  image={{
    render: () => (
      <ResponsiveImage
        variants={item.imageVariants}
        fallbackUrl={item.imageUrl}
        alt={item.title}
        size="thumbnail"
        loading="lazy"
      />
    ),
    aspectRatio: '4/3',
  }}
  // ... rest of props
/>
```

---

## Phase 6: Testing

### 6.1 Unit Tests for Optimizer (20+ tests)

**File**: `apps/api/lego-api/core/image-processing/__tests__/optimizer.test.ts`

Test categories:
1. **Resize Tests** (8 tests):
   - Portrait image resizing (maintains aspect ratio)
   - Landscape image resizing (maintains aspect ratio)
   - Square image resizing
   - Small image (no upscaling)
   - Large image (downscaling)
   - Edge case: 1x1 pixel image
   - Quality setting validation
   - WebP format output

2. **Dimension Calculation Tests** (6 tests):
   - Portrait to thumbnail
   - Landscape to thumbnail
   - Square to all sizes
   - Already small image
   - Aspect ratio preservation
   - Integer rounding

3. **Process All Sizes Tests** (6 tests):
   - All three sizes generated
   - Watermark applied to large only
   - No watermark when buffer missing
   - Correct metadata for each size
   - Compression ratio calculation
   - Error handling for corrupt images

### 6.2 Unit Tests for Watermark (6 tests)

**File**: `apps/api/lego-api/core/image-processing/__tests__/watermark.test.ts`

1. Bottom-right position calculation
2. Opacity at 10%
3. 100px width resize
4. 20px margin from edge
5. Graceful handling of missing watermark
6. Transparent background preservation

### 6.3 Integration Tests for Handler (15+ tests)

**File**: `apps/api/lego-api/functions/image-processor/__tests__/handler.test.ts`

Test categories:
1. **S3 Event Parsing** (3 tests):
   - Single file upload event
   - Multiple files in single event
   - URL-encoded key handling

2. **Image Processing Flow** (5 tests):
   - Full processing pipeline
   - All variants uploaded
   - Correct S3 keys generated
   - Database update called
   - Metrics emitted

3. **Error Handling** (5 tests):
   - S3 download failure
   - Sharp processing error
   - S3 upload failure
   - Database update failure
   - Retry on transient error

4. **Edge Cases** (4 tests):
   - Skip already-processed images
   - Missing watermark (proceeds without)
   - Very large image (50MB)
   - Corrupt image file

### 6.4 Frontend Tests

**File**: `apps/web/app-wishlist-gallery/src/components/ResponsiveImage/__tests__/ResponsiveImage.test.tsx`

1. Renders picture element with WebP source
2. Falls back to JPEG when no WebP
3. Falls back to original URL for legacy items
4. Shows placeholder when no image
5. Console warning for legacy items
6. Lazy loading attribute applied

---

## Phase 7: Files to Create

| File | Description |
|------|-------------|
| `apps/api/lego-api/core/image-processing/__types__/index.ts` | Zod schemas for image processing |
| `apps/api/lego-api/core/image-processing/optimizer.ts` | Sharp image optimizer |
| `apps/api/lego-api/core/image-processing/watermark.ts` | Watermark overlay |
| `apps/api/lego-api/core/image-processing/index.ts` | Module exports |
| `apps/api/lego-api/core/image-processing/__tests__/optimizer.test.ts` | Optimizer unit tests |
| `apps/api/lego-api/core/image-processing/__tests__/watermark.test.ts` | Watermark unit tests |
| `apps/api/lego-api/functions/image-processor/handler.ts` | S3 event Lambda handler |
| `apps/api/lego-api/functions/image-processor/__tests__/handler.test.ts` | Handler integration tests |
| `packages/backend/database-schema/src/migrations/app/0008_add_image_variants.sql` | Database migration |
| `apps/web/app-wishlist-gallery/src/components/ResponsiveImage/index.tsx` | Responsive image component |
| `apps/web/app-wishlist-gallery/src/components/ResponsiveImage/__tests__/ResponsiveImage.test.tsx` | Component tests |

---

## Phase 8: Files to Modify

| File | Changes |
|------|---------|
| `packages/core/api-client/src/schemas/wishlist.ts` | Add ImageVariantsSchema, update WishlistItemSchema |
| `apps/api/lego-api/domains/wishlist/types.ts` | Add imageVariants to WishlistItemSchema |
| `apps/api/lego-api/domains/wishlist/ports/index.ts` | Add updateImageVariants method |
| `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` | Implement updateImageVariants |
| `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` | Use ResponsiveImage |

---

## Verification Checklist

- [ ] All 20+ optimizer unit tests pass
- [ ] All 15+ handler integration tests pass
- [ ] Frontend component tests pass
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes with no errors
- [ ] Builds successfully (pnpm build)
- [ ] Types check passes (pnpm check-types)

---

## Risk Mitigations

1. **Sharp not available in tests**: Use mock for Sharp operations in unit tests
2. **S3 not available in tests**: Use MSW handlers for S3 mocking
3. **Large file processing**: Implement streaming where possible
4. **Watermark file missing**: Graceful degradation (process without watermark)

---

## Notes

- Sharp library requires Node.js 18.x or later
- Lambda memory should be set to 1024MB for Sharp operations
- S3 event trigger must be configured separately (infrastructure)
- Watermark PNG file must be uploaded to S3 before production use
