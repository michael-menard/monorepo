# Implementation Plan - WISH-2058

## Overview

Convert image compression output from JPEG to WebP format in the imageCompression utility.

## Implementation Steps

### Step 1: Update compression configuration default

**File:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Change the default fileType in `CompressionConfigSchema`:
```typescript
fileType: z.string().default('image/webp'), // Changed from 'image/jpeg'
```

### Step 2: Update compression presets

**File:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Update all three presets in `COMPRESSION_PRESETS`:
- low-bandwidth: `fileType: 'image/webp'`
- balanced: `fileType: 'image/webp'`
- high-quality: `fileType: 'image/webp'`

Update estimated sizes to reflect WebP savings:
- low-bandwidth: `~200KB` (was ~300KB, 25-35% smaller)
- balanced: `~550KB` (was ~800KB, 25-35% smaller)
- high-quality: `~1.0MB` (was ~1.5MB, 25-35% smaller)

### Step 3: Add WebP filename transformation helper

**File:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Create new function to transform any filename to .webp:
```typescript
export function transformFilenameToWebP(filename: string): string {
  return filename.replace(/\.(jpe?g|png|gif|heic|heif)$/i, '.webp')
}
```

### Step 4: Update compressImage result filename

**File:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

In `compressImage` function, ensure the result File has .webp extension:
```typescript
const webpFilename = transformFilenameToWebP(file.name)
const resultFile = new File([compressedFile], webpFilename, {
  type: config.fileType,
  lastModified: Date.now(),
})
```

### Step 5: Update HEIC conversion to output WebP

**File:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`

Update `convertHEICToJPEG` function:
- Rename to `convertHEICToWebP`
- Change `toType: 'image/webp'`
- Update filename transformation to use `.webp`

Note: Actually, we should NOT rename the function or change HEIC conversion output to WebP directly. HEIC conversion should remain as JPEG first, then the compression step converts to WebP. This maintains the pipeline:
1. HEIC -> JPEG (convertHEICToJPEG)
2. JPEG -> WebP (compressImage with WebP fileType)

### Step 6: Update unit tests

**File:** `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`

- Update `DEFAULT_COMPRESSION_CONFIG` test to expect `fileType: 'image/webp'`
- Update preset tests to expect WebP fileType
- Add test for `transformFilenameToWebP` helper
- Update compression result tests to verify WebP output

### Step 7: Update useS3Upload hook tests

**File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

- Update mocked preset settings to use `fileType: 'image/webp'`
- Verify WebP files are uploaded correctly

## Files to Modify

1. `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` - Core changes
2. `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts` - Unit tests
3. `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` - Integration tests

## Acceptance Criteria Mapping

| AC | Implementation Step |
|----|---------------------|
| AC1 | Step 1, 2 - Change fileType to 'image/webp' |
| AC2 | Step 2 - Quality 0.8 maintained (no change needed) |
| AC3 | Step 2 - WebP provides 25-35% smaller files |
| AC4 | Toast notification uses existing formatFileSize - shows "X MB -> Y MB" |
| AC5 | Step 3, 4 - transformFilenameToWebP handles extension |
| AC6 | Browser native WebP support (no code changes needed) |
| AC7 | Step 4 - File type set to 'image/webp' |
| AC8 | No backend changes needed - S3 accepts any MIME type |
| AC11 | Step 6 - Unit tests |
| AC12 | Step 7 - Integration tests |
| AC13 | Playwright E2E tests (separate file) |
| AC14 | Documentation (PROOF file) |

## Risks

- None identified. WebP is supported by browser-image-compression library and 97%+ of browsers.

## Architectural Decisions

None required. This is a simple configuration change with no architectural impact.
