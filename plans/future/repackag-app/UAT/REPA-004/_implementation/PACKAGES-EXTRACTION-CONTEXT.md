# REPA-004 Packages Extraction Context

## Mission
Extract image compression, HEIC conversion, and upload orchestration from wishlist gallery into @repo/upload package.

## Source Files to Extract From
1. `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/utils/imageCompression.ts` (411 lines)
2. `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts` (396 lines)

## Target Package
`/Users/michaelmenard/Development/monorepo/packages/core/upload/`

## Dependencies Already Added
- browser-image-compression@^2.0.2
- heic2any@0.0.4

## Steps to Complete (from PLAN.yaml)

### Step 2: Image Presets Module
Create `packages/core/upload/src/image/presets/`:
- `index.ts` - Export COMPRESSION_PRESETS, getPresetByName, isValidPresetName
- `__types__/index.ts` - Zod schemas: CompressionPresetSchema, CompressionPresetNameSchema
- `__tests__/presets.test.ts` - Unit tests for preset utilities (80%+ coverage)

Extract from imageCompression.ts lines 28-107.

### Step 3: Image Compression Module  
Create `packages/core/upload/src/image/compression/`:
- `index.ts` - Export compressImage, shouldSkipCompression, getImageDimensions, formatFileSize, transformFilenameToWebP
- `__types__/index.ts` - Zod schemas: CompressionConfigSchema, CompressionResult (interface -> Zod)
- `__tests__/compression.test.ts` - Unit tests with 80%+ coverage

Extract from imageCompression.ts lines 16-286.
IMPORTANT: CompressionResult is currently an interface - must convert to Zod schema per CLAUDE.md.

### Step 4: HEIC Conversion Module
Create `packages/core/upload/src/image/heic/`:
- `index.ts` - Export isHEIC, convertHEICToJPEG, transformHEICFilename, HEIC_MIME_TYPES, HEIC_EXTENSIONS
- `__types__/index.ts` - Zod schemas: HEICConversionResultSchema (already exists), HEICConversionOptions
- `__tests__/heic.test.ts` - Unit tests for detection and conversion

Extract from imageCompression.ts lines 288-410.

### Step 5: Generalized useUpload Hook
Create `packages/core/upload/src/hooks/useUpload.ts`:
- Generic upload hook with presigned URL injection pattern
- Takes `getPresignedUrl` function as parameter instead of hard-coding RTK mutation
- Preserve all phases: converting, compressing, preparing, uploading, complete, error
- Import from image/compression and image/heic modules

Also create `packages/core/upload/src/hooks/__types__/index.ts`:
- Zod schemas: PresignedUrlResponse, UploadState, UploadOptions, UseUploadResult
- UploadState currently a type union - convert to Zod enum

And `packages/core/upload/src/hooks/__tests__/useUpload.test.tsx`:
- React Testing Library tests for hook

Extract from useS3Upload.ts, generalizing the presigned URL pattern.

### Step 6: Update Package Exports
Update `/Users/michaelmenard/Development/monorepo/packages/core/upload/package.json`:
- Add exports for "./image/presets", "./image/compression", "./image/heic"
- Add exports for "./hooks/useUpload"

Update `/Users/michaelmenard/Development/monorepo/packages/core/upload/src/index.ts`:
- Export from new modules (note: no barrel files per CLAUDE.md, but index.ts is the main entry point)

### Step 10: Verify Presigned URL Schema Compatibility
Check `/Users/michaelmenard/Development/monorepo/packages/core/api-client/src/rtk/wishlist-gallery-api.ts`:
- Find getWishlistImagePresignUrl mutation
- Ensure response shape matches PresignedUrlResponse schema
- The existing schema is: { presignedUrl: string, key: string, expiresIn: number }

## Critical Constraints

1. **Zod-first types** (CLAUDE.md): All types must use Zod schemas
   - CompressionResult: interface -> Zod schema
   - UploadState: type union -> Zod enum
   - All other types need Zod schemas

2. **No barrel files** (CLAUDE.md): Import directly from source files
   - Except index.ts which is the main entry point

3. **Use @repo/logger** instead of console.log

4. **80%+ test coverage** for all modules (AC-1, AC-2, AC-3, AC-7)

5. **Preserve existing behavior** (story non-goal):
   - HEIC conversion before compression
   - Progress tracking with phases
   - WebP fallback behavior
   - Skip compression logic

6. **Progress callback signature**: `onProgress(percent: number, phase?: string)`

## Verification Commands

After all code is created:
```bash
pnpm build --filter=@repo/upload
pnpm test --filter=@repo/upload  
pnpm check-types --filter=@repo/upload
```

All must pass before frontend migration.

## Output Format

Create a log file at:
`/Users/michaelmenard/Development/monorepo/plans/future/repackag-app/in-progress/REPA-004/_implementation/PACKAGES-LOG.md`

Include:
- Files created/modified
- Test results and coverage
- Any issues encountered
- Completion signal: PACKAGES COMPLETE or PACKAGES BLOCKED: reason
