# IMPLEMENTATION-PLAN.md - WISH-2022: Client-side Image Compression

## Overview

Implement client-side image compression for wishlist image uploads using the `browser-image-compression` library. Compression occurs before S3 upload to reduce upload time and storage costs.

## Implementation Steps

### Step 1: Install browser-image-compression Package

**Action**: Add browser-image-compression to app-wishlist-gallery dependencies

```bash
cd apps/web/app-wishlist-gallery && pnpm add browser-image-compression
```

**Verification**: Package appears in package.json dependencies

---

### Step 2: Create imageCompression Utility

**File**: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

**Implementation**:

```typescript
/**
 * Image Compression Utility
 *
 * Client-side image compression before S3 upload.
 * Uses browser-image-compression library.
 *
 * Story WISH-2022: Client-side Image Compression
 */

import imageCompression, { type Options } from 'browser-image-compression'
import { z } from 'zod'

// Compression configuration schema
export const CompressionConfigSchema = z.object({
  maxSizeMB: z.number().default(1),
  maxWidthOrHeight: z.number().default(1920),
  useWebWorker: z.boolean().default(true),
  fileType: z.string().default('image/jpeg'),
  initialQuality: z.number().min(0).max(1).default(0.8),
})

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>

// Default compression settings per story AC
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
}

// Threshold for skipping compression (500KB)
export const SKIP_COMPRESSION_SIZE_THRESHOLD = 500 * 1024

// Progress callback type
export type CompressionProgressCallback = (progress: number) => void

/**
 * Result of compression operation
 */
export interface CompressionResult {
  /** Whether compression was performed */
  compressed: boolean
  /** The resulting file (compressed or original) */
  file: File
  /** Original file size in bytes */
  originalSize: number
  /** Final file size in bytes */
  finalSize: number
  /** Compression ratio (0-1, where lower is better) */
  ratio: number
  /** Error message if compression failed */
  error?: string
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for dimension check'))
    }

    img.src = url
  })
}

/**
 * Determine if compression should be skipped
 */
export async function shouldSkipCompression(
  file: File,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG,
): Promise<boolean> {
  // Skip if file is already small enough
  if (file.size < SKIP_COMPRESSION_SIZE_THRESHOLD) {
    try {
      const dimensions = await getImageDimensions(file)
      // Only skip if dimensions are also within limits
      if (
        dimensions.width <= config.maxWidthOrHeight &&
        dimensions.height <= config.maxWidthOrHeight
      ) {
        return true
      }
    } catch {
      // If we can't check dimensions, don't skip
      return false
    }
  }

  return false
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: {
    config?: CompressionConfig
    onProgress?: CompressionProgressCallback
    skipCompressionCheck?: boolean
  } = {},
): Promise<CompressionResult> {
  const {
    config = DEFAULT_COMPRESSION_CONFIG,
    onProgress,
    skipCompressionCheck = false,
  } = options

  const originalSize = file.size

  // Check if we should skip compression
  if (!skipCompressionCheck && await shouldSkipCompression(file, config)) {
    return {
      compressed: false,
      file,
      originalSize,
      finalSize: originalSize,
      ratio: 1,
    }
  }

  try {
    // Build compression options
    const compressionOptions: Options = {
      maxSizeMB: config.maxSizeMB,
      maxWidthOrHeight: config.maxWidthOrHeight,
      useWebWorker: config.useWebWorker,
      fileType: config.fileType as Options['fileType'],
      initialQuality: config.initialQuality,
      onProgress: onProgress ? (progress: number) => onProgress(progress) : undefined,
    }

    const compressedFile = await imageCompression(file, compressionOptions)

    // Check if compression actually helped
    if (compressedFile.size >= originalSize) {
      // Compression made file larger, use original
      return {
        compressed: false,
        file,
        originalSize,
        finalSize: originalSize,
        ratio: 1,
      }
    }

    // Create new File with original name to preserve filename
    const resultFile = new File([compressedFile], file.name, {
      type: config.fileType,
      lastModified: Date.now(),
    })

    return {
      compressed: true,
      file: resultFile,
      originalSize,
      finalSize: resultFile.size,
      ratio: resultFile.size / originalSize,
    }
  } catch (error) {
    // Compression failed, return original file
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'

    return {
      compressed: false,
      file,
      originalSize,
      finalSize: originalSize,
      ratio: 1,
      error: errorMessage,
    }
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
```

**Verification**: File compiles without TypeScript errors

---

### Step 3: Create imageCompression Tests

**File**: `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`

**Implementation**: Unit tests for:
- `shouldSkipCompression()` with various file sizes
- `compressImage()` happy path
- `compressImage()` error handling
- `formatFileSize()` formatting
- Skip logic when already small

---

### Step 4: Modify useS3Upload Hook

**File**: `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`

**Changes**:

1. Add new state type:
```typescript
export type UploadState = 'idle' | 'compressing' | 'preparing' | 'uploading' | 'complete' | 'error'
```

2. Add compression-related state:
```typescript
const [compressionProgress, setCompressionProgress] = useState(0)
const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null)
```

3. Add compression options to upload function:
```typescript
upload: (file: File, options?: { skipCompression?: boolean }) => Promise<string | null>
```

4. Integrate compression before presigned URL request:
```typescript
// In upload function:
if (!options?.skipCompression) {
  setState('compressing')
  const result = await compressImage(file, {
    onProgress: setCompressionProgress,
  })
  setCompressionResult(result)
  file = result.file
}
```

5. Export compression result in hook return:
```typescript
return {
  // existing...
  compressionProgress,
  compressionResult,
}
```

---

### Step 5: Update useS3Upload Tests

**File**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

**Add tests for**:
- Compression flow happy path
- Skip compression for small files
- Compression failure fallback
- Compression progress tracking
- Skip compression option

---

### Step 6: Modify WishlistForm Component

**File**: `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`

**Changes**:

1. Add imports:
```typescript
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { toast } from 'sonner'
import { formatFileSize } from '../../utils/imageCompression'
```

2. Add preference state:
```typescript
const [highQualityMode, setHighQualityMode] = useLocalStorage(
  'wishlist:preferences:imageCompression',
  false // Default: compression enabled
)
```

3. Add checkbox UI in Image Upload section:
```tsx
<div className="flex items-center gap-2 mt-2">
  <Checkbox
    id="highQuality"
    checked={highQualityMode}
    onCheckedChange={(checked) => setHighQualityMode(checked === true)}
    disabled={isDisabled}
  />
  <Label htmlFor="highQuality" className="text-sm font-normal cursor-pointer">
    High quality (skip compression)
  </Label>
</div>
```

4. Update handleFileSelect to pass compression option:
```typescript
await upload(file, { skipCompression: highQualityMode })
```

5. Update progress display for compression state:
```typescript
{uploadState === 'compressing' && (
  <span>Compressing image... {compressionProgress}%</span>
)}
```

6. Add toast notification after compression:
```typescript
useEffect(() => {
  if (compressionResult?.compressed) {
    toast.success(
      `Image compressed: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.finalSize)}`
    )
  } else if (compressionResult?.error) {
    toast.warning('Compression failed, using original image')
  }
}, [compressionResult])
```

---

### Step 7: Add Checkbox Component (if needed)

**Check**: Verify `Checkbox` is exported from `@repo/app-component-library`

If not available, add the shadcn checkbox primitive.

---

### Step 8: Create Playwright E2E Tests

**File**: `apps/web/playwright/tests/wishlist-compression.spec.ts`

**Test scenarios**:
1. Happy path: Upload large image, verify compression
2. Small image: Verify compression is skipped
3. User preference: Toggle high quality, verify no compression
4. Compression failure: Mock failure, verify fallback

---

## Validation Checklist

- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Compression reduces file size for large images
- [ ] Small images skip compression
- [ ] User preference persists in localStorage
- [ ] Toast notifications display correctly
- [ ] Preview updates with compressed image
- [ ] Original filename preserved
- [ ] Fallback works on compression failure

## Rollback Plan

If issues arise:
1. Remove compression integration from useS3Upload
2. Remove preference checkbox from WishlistForm
3. Keep imageCompression utility for future use
4. Deploy with compression disabled

## Dependencies

- `browser-image-compression` - MIT license, 150KB gzipped
- Existing: `sonner`, `useLocalStorage`, `@repo/app-component-library`
