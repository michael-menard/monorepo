# Implementation Plan - WISH-2045

## Story: HEIC/HEIF Image Format Support

## Overview

This plan details the implementation of HEIC/HEIF image format support for the wishlist gallery upload flow. The implementation builds on the existing compression workflow from WISH-2022 and WISH-2046.

## Implementation Steps

### Step 1: Install heic2any Package

**Location**: `apps/web/app-wishlist-gallery/package.json`

```bash
pnpm --filter app-wishlist-gallery add heic2any
```

This adds the `heic2any` library (MIT license, ~500KB) for client-side HEIC to JPEG conversion.

### Step 2: Add HEIC Detection Utility

**Location**: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Add the following functions:

```typescript
// HEIC MIME types
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const

// HEIC file extensions
export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const

/**
 * WISH-2045: Check if a file is HEIC/HEIF format
 * Checks both MIME type and file extension for robustness
 */
export function isHEIC(file: File): boolean {
  const mimeTypeMatch = HEIC_MIME_TYPES.includes(file.type as typeof HEIC_MIME_TYPES[number])
  const extensionMatch = HEIC_EXTENSIONS.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  )
  return mimeTypeMatch || extensionMatch
}

/**
 * WISH-2045: Transform HEIC filename to JPEG
 * Example: IMG_1234.heic -> IMG_1234.jpg
 */
export function transformHEICFilename(filename: string): string {
  return filename.replace(/\.(heic|heif)$/i, '.jpg')
}
```

### Step 3: Add HEIC Conversion Utility

**Location**: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Add HEIC conversion with heic2any:

```typescript
import heic2any from 'heic2any'

// Conversion result schema
export const HEICConversionResultSchema = z.object({
  converted: z.boolean(),
  file: z.instanceof(File),
  originalSize: z.number(),
  convertedSize: z.number(),
  error: z.string().optional(),
})

export type HEICConversionResult = z.infer<typeof HEICConversionResultSchema>

// Progress callback type
export type HEICConversionProgressCallback = (progress: number) => void

/**
 * WISH-2045: Convert HEIC file to JPEG
 * Uses heic2any library for client-side conversion
 */
export async function convertHEICToJPEG(
  file: File,
  options: {
    quality?: number
    onProgress?: HEICConversionProgressCallback
  } = {}
): Promise<HEICConversionResult> {
  const { quality = 0.9, onProgress } = options
  const originalSize = file.size

  try {
    // Signal start of conversion
    onProgress?.(0)

    // Convert HEIC to JPEG using heic2any
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    })

    // heic2any returns Blob or Blob[] - handle both cases
    const convertedBlob = Array.isArray(result) ? result[0] : result

    // Create new File with transformed filename
    const newFilename = transformHEICFilename(file.name)
    const convertedFile = new File([convertedBlob], newFilename, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    // Signal completion
    onProgress?.(100)

    return {
      converted: true,
      file: convertedFile,
      originalSize,
      convertedSize: convertedFile.size,
    }
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown HEIC conversion error'

    return {
      converted: false,
      file,
      originalSize,
      convertedSize: originalSize,
      error: errorMessage,
    }
  }
}
```

### Step 4: Update useS3Upload Hook

**Location**: `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`

#### 4.1 Update ALLOWED_MIME_TYPES

```typescript
// Add HEIC types to allowed list (will be converted before upload)
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
```

#### 4.2 Update UploadState

```typescript
export type UploadState =
  | 'idle'
  | 'converting'    // NEW: HEIC to JPEG conversion
  | 'compressing'
  | 'preparing'
  | 'uploading'
  | 'complete'
  | 'error'
```

#### 4.3 Add Conversion State

```typescript
// In hook state
const [conversionProgress, setConversionProgress] = useState(0)
const [conversionResult, setConversionResult] = useState<HEICConversionResult | null>(null)
```

#### 4.4 Update Upload Flow

```typescript
const upload = useCallback(
  async (file: File, options: UploadOptions = {}): Promise<string | null> => {
    const { skipCompression = false, preset = 'balanced' } = options

    // ... existing validation ...

    try {
      let fileToProcess = file

      // WISH-2045: Convert HEIC to JPEG if needed
      if (isHEIC(file)) {
        setState('converting')
        const convResult = await convertHEICToJPEG(file, {
          quality: 0.9,
          onProgress: setConversionProgress,
        })
        setConversionResult(convResult)

        if (!convResult.converted) {
          // Show warning but continue with original file
          // The file will be rejected if browser can't handle HEIC
        }

        fileToProcess = convResult.file

        // Check if cancelled during conversion
        if (abortControllerRef.current?.signal.aborted) {
          setState('idle')
          return null
        }
      }

      // ... rest of existing flow with fileToProcess ...
    } catch (err) {
      // ... existing error handling ...
    }
  },
  [getPresignUrl, validateFile],
)
```

#### 4.5 Update Return Value

```typescript
return {
  // ... existing returns ...
  conversionProgress,
  conversionResult,
}
```

### Step 5: Write Unit Tests for HEIC Detection

**Location**: `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`

Add tests for:
- `isHEIC()` - detection by MIME type
- `isHEIC()` - detection by file extension
- `isHEIC()` - case-insensitive extension matching
- `transformHEICFilename()` - filename transformation

### Step 6: Write Unit Tests for HEIC Conversion

**Location**: `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`

Add tests for:
- `convertHEICToJPEG()` - successful conversion
- `convertHEICToJPEG()` - handles Blob[] return type
- `convertHEICToJPEG()` - error handling
- `convertHEICToJPEG()` - progress callback

### Step 7: Write Integration Tests for Upload Flow

**Location**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

Add tests for:
- HEIC file detection triggers conversion
- Converting state transition
- Conversion progress tracking
- Conversion failure fallback
- HEIC -> JPEG -> compression workflow
- Skip compression still allows HEIC conversion

## Verification Checklist

After implementation:

1. [ ] `pnpm check-types` passes
2. [ ] `pnpm lint` passes
3. [ ] `pnpm test` passes
4. [ ] All HEIC-related tests pass
5. [ ] No regressions in existing compression tests

## Rollback Plan

If issues arise:
1. Remove heic2any from dependencies
2. Revert changes to imageCompression.ts
3. Revert changes to useS3Upload.ts
4. HEIC files will be rejected with existing validation

## Notes

### heic2any Behavior
- Returns `Blob` for single-image HEIC
- Returns `Blob[]` for multi-image HEIC (burst photos) - we take first image
- Throws on corrupted HEIC files
- Uses WebAssembly internally

### Performance Considerations
- Typical conversion: 2-5 seconds for phone photos
- Memory usage: ~2x file size during conversion
- Files > 10MB may cause memory pressure

### Browser Support
- Works in modern browsers with WebAssembly support
- Falls back gracefully on unsupported browsers
