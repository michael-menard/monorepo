# STORY-008 Backend Implementation Log

## Overview
Migrating gallery image write endpoints (update metadata, delete) from AWS Lambda to Vercel serverless functions.

---

## Chunk 1 — Add UpdateImageInputSchema to __types__
- **Objective (maps to AC-2, AC-8)**: Define Zod schema for image update validation with all field constraints
- **Files changed**:
  - `packages/backend/gallery-core/src/__types__/index.ts`
- **Summary of changes**:
  - Added `UpdateImageInputSchema` with:
    - `title`: Optional string, 1-200 chars (empty string invalid)
    - `description`: Optional, nullable string up to 2000 chars
    - `tags`: Optional, nullable array of strings (max 20 tags, 50 chars each)
    - `albumId`: Optional, nullable UUID
  - Exported `UpdateImageInput` type
- **Reuse compliance**:
  - Reused: Existing `uuidRegex` pattern, follows `UpdateAlbumInputSchema` pattern
  - New: `UpdateImageInputSchema` schema
  - Why new was necessary: Story requirement AC-8 requires this new schema
- **Ports & adapters note**:
  - What stayed in core: Validation schema is transport-agnostic
  - What stayed in adapters: N/A for this chunk
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core)
- **Notes / Risks**: None

---

## Chunk 2 — Create update-image.ts core function
- **Objective (maps to AC-1, AC-3, AC-4, AC-8)**: Implement `updateGalleryImage` with DI pattern, ownership check, albumId validation
- **Files changed**:
  - `packages/backend/gallery-core/src/update-image.ts` (NEW)
- **Summary of changes**:
  - Created `UpdateImageDbClient` interface for dependency injection
  - Created `UpdateImageSchema` interface for table references
  - Created `UpdateImageResult` discriminated union type
  - Implemented `updateGalleryImage` function with:
    - Ownership validation (403 if wrong user)
    - NOT_FOUND check (404 if image doesn't exist)
    - Album validation when albumId is provided and non-null (400 if album doesn't exist, 403 if album belongs to other user)
    - Always updates lastUpdatedAt (even for empty body per AC-4)
    - Patch semantics (only updates provided fields)
    - Returns updated image via GalleryImageSchema.parse
- **Reuse compliance**:
  - Reused: DI pattern from `update-album.ts`, GalleryImageSchema, ImageRow, UpdateImageInput
  - New: `update-image.ts` file
  - Why new was necessary: Story requirement AC-8 mandates this function
- **Ports & adapters note**:
  - What stayed in core: All business logic (ownership, validation, DB operations)
  - What stayed in adapters: N/A for this chunk
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core) - PASSED
- **Notes / Risks**: None

---

## Chunk 3 — Create update-image.test.ts unit tests
- **Objective (maps to AC-8)**: Test happy path, ownership errors, albumId validation, empty body
- **Files changed**:
  - `packages/backend/gallery-core/src/__tests__/update-image.test.ts` (NEW)
- **Summary of changes**:
  - Created 16 unit tests covering:
    - Update title, description, tags (happy path)
    - Clear description/tags to null
    - Set tags to empty array
    - Update albumId to move image to album
    - Clear albumId to make standalone
    - Empty body updates lastUpdatedAt (AC-4)
    - NOT_FOUND when image doesn't exist
    - FORBIDDEN when image belongs to other user
    - VALIDATION_ERROR when albumId doesn't exist
    - FORBIDDEN when albumId belongs to other user
    - Update only provided fields (patch semantics)
    - Update multiple fields at once
    - Database error handling
- **Reuse compliance**:
  - Reused: Test patterns from `update-album.test.ts`
  - New: `update-image.test.ts` file
  - Why new was necessary: Story requirement AC-8 mandates unit tests
- **Ports & adapters note**:
  - What stayed in core: Test logic
  - What stayed in adapters: N/A
- **Commands run**: `pnpm test --filter gallery-core -- update-image.test.ts` - 16 tests PASSED
- **Notes / Risks**: None

---

## Chunk 4 — Create delete-image.ts core function
- **Objective (maps to AC-5, AC-6, AC-7, AC-8)**: Implement `deleteGalleryImage` with DI pattern, ownership check, cover image clearing
- **Files changed**:
  - `packages/backend/gallery-core/src/delete-image.ts` (NEW)
- **Summary of changes**:
  - Created `DeleteImageDbClient` interface for dependency injection
  - Created `DeleteImageSchema` interface for table references
  - Created `DeleteImageResult` discriminated union type (includes imageUrl/thumbnailUrl for S3 cleanup)
  - Implemented `deleteGalleryImage` function with:
    - Ownership validation (403 if wrong user)
    - NOT_FOUND check (404 if image doesn't exist)
    - Clears coverImageId on albums using this image before deletion (AC-6)
    - Returns imageUrl and thumbnailUrl for adapter S3 cleanup (AC-7)
    - Cascade deletes handled by FK constraints (gallery_flags, moc_gallery_images)
- **Reuse compliance**:
  - Reused: DI pattern from `delete-album.ts`, ImageRow type
  - New: `delete-image.ts` file
  - Why new was necessary: Story requirement AC-8 mandates this function
- **Ports & adapters note**:
  - What stayed in core: DB deletion, ownership check, coverImageId clearing
  - What stayed in adapters: S3 cleanup (best-effort, handled by handler)
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core) - PASSED
- **Notes / Risks**: S3 cleanup intentionally NOT in core (per architecture notes in implementation plan)

---

## Chunk 5 — Create delete-image.test.ts unit tests
- **Objective (maps to AC-8)**: Test happy path, ownership errors, coverImageId clearing, operation order
- **Files changed**:
  - `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` (NEW)
- **Summary of changes**:
  - Created 8 unit tests covering:
    - Delete success returns imageUrl and thumbnailUrl
    - Returns null thumbnailUrl when image has no thumbnail
    - Clears coverImageId on albums before deleting (AC-6)
    - NOT_FOUND when image doesn't exist
    - FORBIDDEN when image belongs to other user
    - DB_ERROR when delete fails
    - DB_ERROR when update (coverImageId clear) fails
    - Verifies update called before delete (order matters for FK)
- **Reuse compliance**:
  - Reused: Test patterns from `delete-album.test.ts`
  - New: `delete-image.test.ts` file
  - Why new was necessary: Story requirement AC-8 mandates unit tests
- **Ports & adapters note**:
  - What stayed in core: Test logic
  - What stayed in adapters: N/A
- **Commands run**: `pnpm test --filter gallery-core -- delete-image.test.ts` - 8 tests PASSED
- **Notes / Risks**: None

---

## Chunk 6 — Export new functions from index.ts
- **Objective (maps to AC-8)**: Add exports for updateGalleryImage, deleteGalleryImage, and types
- **Files changed**:
  - `packages/backend/gallery-core/src/index.ts`
- **Summary of changes**:
  - Added IMAGE WRITE CORE FUNCTIONS section with:
    - `updateGalleryImage` function export
    - `UpdateImageDbClient`, `UpdateImageSchema`, `UpdateImageResult` type exports
    - `deleteGalleryImage` function export
    - `DeleteImageDbClient`, `DeleteImageSchema`, `DeleteImageResult` type exports
  - Added IMAGE WRITE TYPES section with:
    - `UpdateImageInput` type export
    - `UpdateImageInputSchema` schema export
- **Reuse compliance**:
  - Reused: Existing export pattern from index.ts
  - New: New export sections
  - Why new was necessary: Story requirement AC-8 requires package exports
- **Ports & adapters note**:
  - What stayed in core: All exports
  - What stayed in adapters: N/A
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core) - PASSED
- **Notes / Risks**: None

---

## Chunk 7 — Add STORY-008 seed data
- **Objective (maps to AC-9)**: Add deterministic test images for update/delete tests
- **Files changed**:
  - `apps/api/core/database/seeds/gallery.ts`
- **Summary of changes**:
  - Added 4 new gallery images:
    - `66666666-...` - Update Test Image (PATCH happy path)
    - `77777777-...` - Delete Test Image (DELETE happy path)
    - `88888888-...` - Album Cover Image (DELETE cascade test - cover of album bbbbbbbb)
    - `99999999-...-998` - Flagged Delete Test Image (DELETE flag cascade test)
  - Added 1 new gallery album:
    - `bbbbbbbb-...` - Cover Test Album (has 88888888 as coverImageId)
  - Added 1 new gallery flag:
    - `eeeeeeee-...` - Flag on image 99999999-...-998 for cascade delete test
  - Updated header comments to document STORY-008 test scenarios
- **Reuse compliance**:
  - Reused: Existing seed pattern, upsert via ON CONFLICT DO UPDATE
  - New: New seed entities
  - Why new was necessary: Story requirement AC-9 mandates seed data
- **Ports & adapters note**:
  - What stayed in core: N/A (seed is infrastructure)
  - What stayed in adapters: N/A
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core) - PASSED
- **Notes / Risks**: Fixed unused import in delete-image.ts (ImageRow)

---

## Chunk 8 — Extend [id].ts handler with PATCH and DELETE methods
- **Objective (maps to AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7)**: Add PATCH/DELETE handlers to existing [id].ts
- **Files changed**:
  - `apps/api/platforms/vercel/api/gallery/images/[id].ts`
- **Summary of changes**:
  - Updated file header to document GET/PATCH/DELETE operations
  - Added imports: `z` from zod, `S3Client`, `DeleteObjectCommand` from @aws-sdk/client-s3
  - Added `UpdateImageInputSchema` Zod schema for PATCH validation
  - Added `galleryAlbums` table reference for albumId validation
  - Added S3 client functions:
    - `getS3Client()` - lazy init with AWS credentials
    - `getS3Bucket()` - reads GALLERY_BUCKET or AWS_S3_BUCKET
    - `extractS3Key()` - parses S3 key from URL
    - `deleteFromS3()` - best-effort deletion, logs errors but doesn't throw
  - Refactored GET into `handleGet()` function
  - Added `handlePatch()` function:
    - Validates body with UpdateImageInputSchema
    - Checks image ownership (403)
    - Validates albumId if provided (400/403)
    - Updates lastUpdatedAt even for empty body (AC-4)
    - Returns 200 with updated image
  - Added `handleDelete()` function:
    - Checks image ownership (403)
    - Clears coverImageId on albums (AC-6)
    - Deletes image (FK cascades handle flags/moc_gallery_images)
    - Calls deleteFromS3 (best-effort, AC-7)
    - Returns 204 No Content
  - Updated main handler to route GET/PATCH/DELETE
- **Reuse compliance**:
  - Reused: Handler pattern from `albums/[id].ts`, Zod validation pattern
  - New: S3 cleanup logic, UpdateImageInputSchema
  - Why new was necessary: Story requirement (endpoints must exist)
- **Ports & adapters note**:
  - What stayed in core: N/A (handler is adapter)
  - What stayed in adapters: All HTTP handling, S3 cleanup
- **Commands run**: `pnpm exec tsc --noEmit` (in gallery-core) - PASSED
- **Notes / Risks**: S3 cleanup is best-effort per AC-7 - logs failures but returns 204

---

## Chunk 9 — Add HTTP contract requests to gallery.http
- **Objective (maps to AC-10)**: Add all update/delete requests to gallery.http
- **Files changed**:
  - `__http__/gallery.http`
- **Summary of changes**:
  - Added UPDATE IMAGE OPERATIONS section with 16 requests:
    - `updateGalleryImageTitle` - Update title only (200)
    - `updateGalleryImageDescription` - Update description (200)
    - `updateGalleryImageTags` - Update tags (200)
    - `updateGalleryImageAlbumId` - Move to album (200)
    - `updateGalleryImageClearAlbum` - Clear albumId (200)
    - `updateGalleryImageMultiple` - Multiple fields (200)
    - `updateGalleryImageEmptyBody` - Empty body per AC-4 (200)
    - `updateGalleryImageClearDescription` - Clear to null (200)
    - `updateGalleryImageClearTags` - Clear to null (200)
    - `updateGalleryImageEmptyTags` - Empty array (200)
    - `updateGalleryImage404` - Non-existent image (404)
    - `updateGalleryImage403` - Other user's image (403)
    - `updateGalleryImage400InvalidUUID` - Invalid UUID (400)
    - `updateGalleryImage400EmptyTitle` - Empty title (400)
    - `updateGalleryImageAlbum404` - Album not found (400)
    - `updateGalleryImageAlbum403` - Album other user (403)
  - Added DELETE IMAGE OPERATIONS section with 6 requests:
    - `deleteGalleryImage404` - Non-existent image (404)
    - `deleteGalleryImage403` - Other user's image (403)
    - `deleteGalleryImage400` - Invalid UUID (400)
    - `deleteAlbumCoverImage` - Image as album cover (204, cascade test)
    - `deleteGalleryImageWithFlags` - Image with flags (204, cascade test)
    - `deleteGalleryImage` - Happy path delete (204)
- **Reuse compliance**:
  - Reused: Existing .http file format and patterns
  - New: STORY-008 request sections
  - Why new was necessary: Story requirement AC-10 mandates HTTP documentation
- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: N/A (HTTP file is contract documentation)
- **Commands run**: `pnpm test --filter gallery-core` - 81 tests PASSED (all 11 test files)
- **Notes / Risks**: None

---

## Final Verification

### Tests Summary
- **gallery-core unit tests**: 81 tests passing (11 files)
  - update-image.test.ts: 16 tests
  - delete-image.test.ts: 8 tests
  - All existing tests continue to pass

### Files Changed (Total: 9)
1. `packages/backend/gallery-core/src/__types__/index.ts` - Added UpdateImageInputSchema
2. `packages/backend/gallery-core/src/update-image.ts` - NEW (update image core function)
3. `packages/backend/gallery-core/src/__tests__/update-image.test.ts` - NEW (16 tests)
4. `packages/backend/gallery-core/src/delete-image.ts` - NEW (delete image core function)
5. `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` - NEW (8 tests)
6. `packages/backend/gallery-core/src/index.ts` - Added exports
7. `apps/api/core/database/seeds/gallery.ts` - Added STORY-008 seed data
8. `apps/api/platforms/vercel/api/gallery/images/[id].ts` - Added PATCH/DELETE handlers
9. `__http__/gallery.http` - Added update/delete requests

---

**BACKEND COMPLETE**

