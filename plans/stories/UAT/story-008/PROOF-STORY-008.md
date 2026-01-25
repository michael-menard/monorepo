# PROOF-STORY-008

## Story
**STORY-008** - Gallery - Images Write (No Upload)

Migrate gallery image write endpoints (update metadata, delete) from AWS Lambda to Vercel serverless functions.

---

## Summary

- Added `UpdateImageInputSchema` Zod schema with field validation (title 1-200 chars, description up to 2000 chars, tags max 20 items, albumId UUID)
- Implemented `updateGalleryImage` core function with ownership validation, album validation, and patch semantics
- Implemented `deleteGalleryImage` core function with ownership validation, coverImageId clearing, and S3 URL return for cleanup
- Extended Vercel handler `[id].ts` with PATCH and DELETE methods including S3 best-effort cleanup
- Added 24 new unit tests (16 for update, 8 for delete) with 100% of tests passing
- Added 4 test images, 1 test album, and 1 test flag to seed data for STORY-008 verification
- Added 22 HTTP contract requests (16 PATCH, 6 DELETE) to `gallery.http` covering happy path and error cases

---

## Acceptance Criteria - Evidence

### AC-1: Update Image Endpoint (PATCH)
- **AC**: PATCH `/api/gallery/images/:id` accepts body, returns 200/404/403/400/401 appropriately
- **Evidence**:
  - Handler: `/apps/api/platforms/vercel/api/gallery/images/[id].ts` (handlePatch function)
  - Core function: `/packages/backend/gallery-core/src/update-image.ts`
  - HTTP contracts: `__http__/gallery.http` - updateGalleryImageTitle, updateGalleryImage404, updateGalleryImage403, updateGalleryImage400InvalidUUID
  - Unit tests: `update-image.test.ts` - tests for 200, 404, 403 responses

### AC-2: Update Field Validation
- **AC**: title 1-200 chars, description up to 2000 chars nullable, tags max 20 items, albumId UUID nullable
- **Evidence**:
  - Schema: `/packages/backend/gallery-core/src/__types__/index.ts` - `UpdateImageInputSchema`
  - HTTP contracts: `updateGalleryImage400EmptyTitle` (400 for empty title)
  - Unit tests: `update-image.test.ts` - tests for clear description to null, clear tags to null, set tags to empty array

### AC-3: Album Validation on Update
- **AC**: Verify albumId exists (400) and belongs to user (403) when provided
- **Evidence**:
  - Core function: `/packages/backend/gallery-core/src/update-image.ts` - albumId validation logic
  - HTTP contracts: `updateGalleryImageAlbum404` (400), `updateGalleryImageAlbum403` (403)
  - Unit tests: `update-image.test.ts` - "returns VALIDATION_ERROR when albumId does not exist", "returns FORBIDDEN when album belongs to other user"

### AC-4: Empty Body Handling
- **AC**: PATCH with `{}` returns 200, lastUpdatedAt updated
- **Evidence**:
  - Core function: `/packages/backend/gallery-core/src/update-image.ts` - always updates lastUpdatedAt
  - HTTP contracts: `updateGalleryImageEmptyBody` (200)
  - Unit tests: `update-image.test.ts` - "updates lastUpdatedAt even with empty body"

### AC-5: Delete Image Endpoint (DELETE)
- **AC**: DELETE `/api/gallery/images/:id` returns 204/404/403/400/401 appropriately
- **Evidence**:
  - Handler: `/apps/api/platforms/vercel/api/gallery/images/[id].ts` (handleDelete function)
  - Core function: `/packages/backend/gallery-core/src/delete-image.ts`
  - HTTP contracts: `deleteGalleryImage` (204), `deleteGalleryImage404`, `deleteGalleryImage403`, `deleteGalleryImage400`
  - Unit tests: `delete-image.test.ts` - tests for 204, 404, 403 responses

### AC-6: Delete Cascade Behavior
- **AC**: gallery_flags and moc_gallery_images cascade-deleted via FK, coverImageId cleared before deletion
- **Evidence**:
  - Core function: `/packages/backend/gallery-core/src/delete-image.ts` - clears coverImageId on albums before delete
  - HTTP contracts: `deleteAlbumCoverImage` (204 - cascade test), `deleteGalleryImageWithFlags` (204 - flag cascade test)
  - Unit tests: `delete-image.test.ts` - "clears coverImageId on albums that use this image as cover", "calls update before delete (order matters)"
  - Seed: Image 88888888-8888-8888-8888-888888888888 is coverImageId of album bbbbbbbb, image 99999999-9999-9999-9999-999999999998 has flag eeeeeeee

### AC-7: S3 Cleanup Behavior
- **AC**: Best-effort S3 deletion for imageUrl and thumbnailUrl, logs failure but returns 204
- **Evidence**:
  - Handler: `/apps/api/platforms/vercel/api/gallery/images/[id].ts` - `deleteFromS3()` function with try/catch logging
  - Core function returns imageUrl/thumbnailUrl for adapter cleanup: `delete-image.ts` - `DeleteImageResult.data.imageUrl`, `data.thumbnailUrl`
  - Unit tests: `delete-image.test.ts` - "returns imageUrl and thumbnailUrl for S3 cleanup"

### AC-8: Extend gallery-core Package
- **AC**: Add updateGalleryImage, deleteGalleryImage, UpdateImageInputSchema, unit tests
- **Evidence**:
  - Types: `/packages/backend/gallery-core/src/__types__/index.ts` - UpdateImageInputSchema, UpdateImageInput
  - Core functions: `/packages/backend/gallery-core/src/update-image.ts`, `/packages/backend/gallery-core/src/delete-image.ts`
  - Exports: `/packages/backend/gallery-core/src/index.ts` - IMAGE WRITE CORE FUNCTIONS section
  - Unit tests: `/packages/backend/gallery-core/src/__tests__/update-image.test.ts` (16 tests), `/packages/backend/gallery-core/src/__tests__/delete-image.test.ts` (8 tests)

### AC-9: Seed Data
- **AC**: Add STORY-008 test images with deterministic UUIDs, idempotent
- **Evidence**:
  - Seed file: `/apps/api/core/database/seeds/gallery.ts`
  - Images: 66666666-6666-6666-6666-666666666666 (update test), 77777777-7777-7777-7777-777777777777 (delete test), 88888888-8888-8888-8888-888888888888 (album cover), 99999999-9999-9999-9999-999999999998 (flagged)
  - Album: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (cover test album)
  - Flag: eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee (cascade delete test)
  - Upsert pattern maintained (ON CONFLICT DO UPDATE)

### AC-10: HTTP Contract Verification
- **AC**: gallery.http updated with all update/delete requests, happy path and error cases
- **Evidence**:
  - HTTP file: `/__http__/gallery.http`
  - UPDATE IMAGE OPERATIONS section: 16 requests (updateGalleryImageTitle, updateGalleryImageDescription, updateGalleryImageTags, updateGalleryImageAlbumId, updateGalleryImageClearAlbum, updateGalleryImageMultiple, updateGalleryImageEmptyBody, updateGalleryImageClearDescription, updateGalleryImageClearTags, updateGalleryImageEmptyTags, updateGalleryImage404, updateGalleryImage403, updateGalleryImage400InvalidUUID, updateGalleryImage400EmptyTitle, updateGalleryImageAlbum404, updateGalleryImageAlbum403)
  - DELETE IMAGE OPERATIONS section: 6 requests (deleteGalleryImage404, deleteGalleryImage403, deleteGalleryImage400, deleteAlbumCoverImage, deleteGalleryImageWithFlags, deleteGalleryImage)

---

## Reuse & Architecture Compliance

### Reuse-First Summary

**What was reused:**
- `packages/backend/gallery-core` - Extended existing package (not new package)
- DI pattern from `update-album.ts` and `delete-album.ts`
- GalleryImageSchema and ImageRow types
- Existing seed pattern with upsert (ON CONFLICT DO UPDATE)
- Handler pattern from `albums/[id].ts`
- @aws-sdk/client-s3 (already installed in apps/api)

**What was created (and why):**
- `update-image.ts` - Required by AC-8, follows existing pattern
- `delete-image.ts` - Required by AC-8, follows existing pattern
- `UpdateImageInputSchema` - Required by AC-8 for validation
- `UpdateImageDbClient`, `DeleteImageDbClient` interfaces - Required for DI/testability
- 24 unit tests - Required by AC-8
- 4 seed images, 1 album, 1 flag - Required by AC-9

### Ports & Adapters Compliance Summary

**What stayed in core (`packages/backend/gallery-core/`):**
- Input validation (Zod schemas)
- Ownership checking (403 logic)
- Album validation for albumId updates
- Database operations (select, update, delete)
- Business rules (coverImageId clearing before delete)

**What stayed in adapters (`apps/api/platforms/vercel/`):**
- HTTP request/response handling
- UUID format validation for path params
- S3 cleanup (best-effort, infrastructure concern)
- Auth bypass / JWT handling
- Error response transformation

---

## Verification

### Decisive Commands + Outcomes

| Command | Outcome |
|---------|---------|
| `cd packages/backend/gallery-core && pnpm exec tsc --noEmit` | PASS - no output (clean) |
| `pnpm test --filter gallery-core` | PASS - 81/81 tests passing (11 files) |
| `npx eslint 'packages/backend/gallery-core/src/**/*.ts' --max-warnings 0` | PASS (after fix) |
| `npx eslint 'apps/api/platforms/vercel/api/gallery/images/[id].ts' --max-warnings 0` | PASS |

### Test Results

```
 Test Files  11 passed (11)
      Tests  81 passed (81)
   Duration  487ms

STORY-008 Specific:
 - update-image.test.ts: 16 tests PASS
 - delete-image.test.ts: 8 tests PASS
```

### Playwright
**NOT APPLICABLE** - Backend-only story, no UI changes

---

## Deviations / Notes

### Formatting Fix Applied
- Line 259 of `__types__/index.ts` required Prettier formatting fix (multi-line Zod chain)
- Fixed via `npx eslint --fix 'packages/backend/gallery-core/src/__types__/index.ts'`
- Post-fix lint: PASS

### Pre-existing Issues (Not STORY-008)
- `@repo/app-sets-gallery` build failure - Tailwind CSS / design-system exports
- `@repo/main-app` type errors - Various unrelated TypeScript errors
- `lego-api-serverless` lint errors - 216 pre-existing errors (sst globals, unused vars)

These are documented but NOT attributable to STORY-008 changes.

---

## Blockers

**None** - Implementation complete with no blockers.

---

## Files Changed (9 total)

| File | Change Type |
|------|-------------|
| `packages/backend/gallery-core/src/__types__/index.ts` | MODIFY - Added UpdateImageInputSchema |
| `packages/backend/gallery-core/src/update-image.ts` | CREATE - Update image core function |
| `packages/backend/gallery-core/src/__tests__/update-image.test.ts` | CREATE - 16 unit tests |
| `packages/backend/gallery-core/src/delete-image.ts` | CREATE - Delete image core function |
| `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` | CREATE - 8 unit tests |
| `packages/backend/gallery-core/src/index.ts` | MODIFY - Added exports |
| `apps/api/core/database/seeds/gallery.ts` | MODIFY - Added STORY-008 seed data |
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | MODIFY - Added PATCH/DELETE handlers |
| `__http__/gallery.http` | MODIFY - Added 22 update/delete requests |
