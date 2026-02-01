# Frontend Implementation Log - WISH-2045

## Story: HEIC/HEIF Image Format Support

## Changes Made

### 1. New Dependency Added

**File**: `apps/web/app-wishlist-gallery/package.json`

- Added `heic2any` package for client-side HEIC to JPEG conversion
- Version: Latest (via `pnpm --filter app-wishlist-gallery add heic2any`)
- License: MIT

### 2. Image Compression Utility Updates

**File**: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

#### New Imports
```typescript
import heic2any from 'heic2any'
```

#### New Constants
```typescript
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const
export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const
```

#### New Types
```typescript
export const HEICConversionResultSchema = z.object({
  converted: z.boolean(),
  file: z.custom<File>(val => val instanceof File),
  originalSize: z.number(),
  convertedSize: z.number(),
  error: z.string().optional(),
})

export type HEICConversionResult = z.infer<typeof HEICConversionResultSchema>
export type HEICConversionProgressCallback = (progress: number) => void
```

#### New Functions
1. **`isHEIC(file: File): boolean`**
   - Detects HEIC/HEIF files by MIME type or file extension
   - Case-insensitive extension matching
   - Handles `application/octet-stream` MIME type with HEIC extension

2. **`transformHEICFilename(filename: string): string`**
   - Transforms `.heic` or `.heif` extension to `.jpg`
   - Preserves rest of filename

3. **`convertHEICToJPEG(file, options): Promise<HEICConversionResult>`**
   - Converts HEIC file to JPEG using heic2any
   - Handles both Blob and Blob[] return types (multi-image HEIC)
   - Default quality: 0.9
   - Returns original file on error with error message

### 3. Upload Hook Updates

**File**: `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`

#### Updated Imports
```typescript
import {
  // ... existing imports ...
  isHEIC,
  convertHEICToJPEG,
  type HEICConversionResult,
} from '../utils/imageCompression'
```

#### Updated ALLOWED_MIME_TYPES
```typescript
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',  // NEW
  'image/heif',  // NEW
] as const
```

#### Updated UploadState
```typescript
export type UploadState =
  | 'idle'
  | 'converting'  // NEW - HEIC to JPEG conversion
  | 'compressing'
  | 'preparing'
  | 'uploading'
  | 'complete'
  | 'error'
```

#### New State Variables
```typescript
const [conversionProgress, setConversionProgress] = useState(0)
const [conversionResult, setConversionResult] = useState<HEICConversionResult | null>(null)
```

#### Updated UseS3UploadResult Interface
```typescript
export interface UseS3UploadResult {
  // ... existing properties ...
  conversionProgress: number
  conversionResult: HEICConversionResult | null
}
```

#### Updated validateFile Function
- Now also accepts HEIC files by extension (handles `application/octet-stream`)
- Updated error message to include HEIC in allowed types

#### Updated upload Function
1. Added HEIC conversion step before compression
2. Conversion happens even if `skipCompression: true`
3. Falls back to original file if conversion fails
4. Stores conversion result for consumer access

#### Updated cancel/reset Functions
- Now also resets `conversionProgress` and `conversionResult`

### 4. Test File Updates

**File**: `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`

Added comprehensive tests for:
- `HEIC_MIME_TYPES` and `HEIC_EXTENSIONS` constants
- `isHEIC()` function (MIME type detection, extension detection, case-insensitivity)
- `transformHEICFilename()` function (extension transformation)
- `convertHEICToJPEG()` function (success, error, progress, Blob[] handling)

**File**: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

Added comprehensive tests for:
- ALLOWED_MIME_TYPES includes HEIC types
- HEIC conversion before compression
- `converting` state transition
- Conversion progress tracking
- Conversion failure fallback
- Skip compression still converts HEIC
- Cancel/reset clears conversion state
- Initial conversion state values
- HEIC validation by extension

## Workflow Summary

The new upload workflow for HEIC files:

```
1. User selects HEIC file
2. validateFile() passes (HEIC is now allowed)
3. isHEIC() returns true
4. State -> 'converting'
5. convertHEICToJPEG() called
   - heic2any converts to JPEG
   - Progress callback updates conversionProgress
   - Result stored in conversionResult
6. If conversion successful:
   - Proceed with converted JPEG file
7. If conversion fails:
   - Store error in conversionResult
   - Proceed with original HEIC (fallback)
8. State -> 'compressing' (unless skipCompression)
9. compressImage() called with file
10. State -> 'preparing' -> 'uploading' -> 'complete'
```

## Breaking Changes

None. All changes are additive:
- New MIME types added to allowed list
- New state values are backward compatible
- Existing compression workflow unchanged for non-HEIC files
