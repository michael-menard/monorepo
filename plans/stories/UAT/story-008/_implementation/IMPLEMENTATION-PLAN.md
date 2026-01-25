# STORY-008: Implementation Plan

## Scope Surface

- **backend/API**: YES - gallery-core update/delete functions + Vercel handler modifications
- **frontend/UI**: NO - Backend-only story
- **infra/config**: NO - No new routes needed; `vercel.json` already routes `[id].ts` for PATCH/DELETE

**Notes**: This story extends the existing `gallery-core` package with update and delete image functions, following the established patterns from STORY-007 (read operations) and STORY-006 (album CRUD). The Vercel handler at `apps/api/platforms/vercel/api/gallery/images/[id].ts` currently only supports GET and must be extended to support PATCH and DELETE.

---

## Acceptance Criteria Checklist

### AC-1: Update Image Endpoint (PATCH)
- [ ] PATCH `/api/gallery/images/:id` accepts `{ title?, description?, tags?, albumId? }`
- [ ] Returns 200 with updated image on success
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 401 when auth bypass disabled

### AC-2: Update Field Validation
- [ ] `title` must be 1-200 chars if provided; empty string returns 400
- [ ] `description` can be null (to clear) or string up to 2000 chars
- [ ] `tags` can be null, empty array, or array of strings (max 20 tags, 50 chars each)
- [ ] `albumId` can be null (standalone) or valid UUID

### AC-3: Album Validation on Update
- [ ] When `albumId` non-null, verify album exists (400 if not)
- [ ] When `albumId` non-null, verify album belongs to same user (403 if not)

### AC-4: Empty Body Handling
- [ ] PATCH with `{}` returns 200 with unchanged data
- [ ] `lastUpdatedAt` updated even for empty body

### AC-5: Delete Image Endpoint (DELETE)
- [ ] DELETE `/api/gallery/images/:id` returns 204 on success
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID
- [ ] Returns 401 when auth bypass disabled

### AC-6: Delete Cascade Behavior
- [ ] `gallery_flags` entries cascade-deleted (automatic via FK)
- [ ] `moc_gallery_images` entries cascade-deleted (automatic via FK)
- [ ] Album `coverImageId` cleared before deletion if image is album cover

### AC-7: S3 Cleanup Behavior
- [ ] After DB deletion, attempt to delete `imageUrl` from S3
- [ ] After DB deletion, attempt to delete `thumbnailUrl` from S3 (if not null)
- [ ] S3 deletion is best-effort: log failure but do not fail request
- [ ] Returns 204 even if S3 deletion fails

### AC-8: Extend gallery-core Package
- [ ] Add `updateGalleryImage` function
- [ ] Add `deleteGalleryImage` function
- [ ] Add `UpdateImageInputSchema` to `__types__/index.ts`
- [ ] Unit tests for update and delete functions

### AC-9: Seed Data
- [ ] Add STORY-008 test images with deterministic UUIDs
- [ ] Seed includes update test image (`66666666-...`)
- [ ] Seed includes delete test image (`77777777-...`)
- [ ] Seed includes album cover image for cascade test (`88888888-...`)
- [ ] Seed includes flagged image for cascade test (`99999999-...-998`)
- [ ] Seed is idempotent

### AC-10: HTTP Contract Verification
- [ ] `__http__/gallery.http` updated with all update/delete requests
- [ ] Happy path and error case requests documented

---

## Files To Touch (Expected)

### Core Package (MODIFY)
1. `packages/backend/gallery-core/src/__types__/index.ts` - Add `UpdateImageInputSchema`
2. `packages/backend/gallery-core/src/update-image.ts` - NEW file for update logic
3. `packages/backend/gallery-core/src/delete-image.ts` - NEW file for delete logic
4. `packages/backend/gallery-core/src/index.ts` - Export new functions and types

### Core Package Tests (CREATE)
5. `packages/backend/gallery-core/src/__tests__/update-image.test.ts` - Unit tests for update
6. `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` - Unit tests for delete

### Vercel Handler (MODIFY)
7. `apps/api/platforms/vercel/api/gallery/images/[id].ts` - Add PATCH/DELETE handlers

### Seed Data (MODIFY)
8. `apps/api/core/database/seeds/gallery.ts` - Add STORY-008 test entities

### HTTP Contract (MODIFY)
9. `__http__/gallery.http` - Add update/delete endpoint requests

**Total Files: 9** (4 modify, 5 create)

---

## Reuse Targets

### Packages to Reuse
| Package | Usage |
|---------|-------|
| `packages/backend/gallery-core` | Extend with update/delete image functions |
| `@repo/logger` | Logging in handlers |
| `@aws-sdk/client-s3` | S3 deletion (already installed in apps/api) |
| `packages/backend/db` | Drizzle schema references |

### Patterns to Follow
| Source | Pattern |
|--------|---------|
| `update-album.ts` | DI pattern with `UpdateAlbumDbClient`, result types |
| `delete-album.ts` | DI pattern with `DeleteAlbumDbClient`, ownership check |
| `gallery/albums/[id].ts` | Vercel handler structure with GET/PATCH/DELETE |
| `gallery.ts` seed | Deterministic UUID seeding with upsert pattern |

---

## Architecture Notes (Ports & Adapters)

### Core Package (Port)
- `update-image.ts`: Validates input, checks ownership, validates albumId if provided, updates DB
- `delete-image.ts`: Checks ownership, clears album coverImageId if needed, deletes from DB
- **Note**: S3 cleanup belongs in the **handler** (adapter), not core, because it requires AWS SDK configuration

### Vercel Handler (Adapter)
- Parses request body
- Validates UUID format
- Calls core function
- For DELETE: handles S3 cleanup (best-effort) after core function succeeds
- Transforms response

### Boundary Protection
- Core functions do NOT handle S3 - they only manage DB state
- Core functions use DI for testability (mock DB client)
- Handler handles S3 as best-effort post-DB cleanup

---

## Step-by-Step Plan (Small Steps)

### Step 1: Add UpdateImageInputSchema to __types__
**Objective**: Define Zod schema for image update validation
**Files**: `packages/backend/gallery-core/src/__types__/index.ts`
**Verification**: `pnpm check-types --filter gallery-core`

### Step 2: Create update-image.ts core function
**Objective**: Implement `updateGalleryImage` with DI pattern, ownership check, albumId validation
**Files**: `packages/backend/gallery-core/src/update-image.ts`
**Verification**: `pnpm check-types --filter gallery-core`

### Step 3: Create update-image.test.ts unit tests
**Objective**: Test happy path, ownership errors, albumId validation, empty body
**Files**: `packages/backend/gallery-core/src/__tests__/update-image.test.ts`
**Verification**: `pnpm test --filter gallery-core`

### Step 4: Create delete-image.ts core function
**Objective**: Implement `deleteGalleryImage` with DI pattern, ownership check, clear coverImageId
**Files**: `packages/backend/gallery-core/src/delete-image.ts`
**Verification**: `pnpm check-types --filter gallery-core`

### Step 5: Create delete-image.test.ts unit tests
**Objective**: Test happy path, ownership errors, coverImageId clearing
**Files**: `packages/backend/gallery-core/src/__tests__/delete-image.test.ts`
**Verification**: `pnpm test --filter gallery-core`

### Step 6: Export new functions from index.ts
**Objective**: Add exports for updateGalleryImage, deleteGalleryImage, and types
**Files**: `packages/backend/gallery-core/src/index.ts`
**Verification**: `pnpm check-types --filter gallery-core`

### Step 7: Add STORY-008 seed data
**Objective**: Add deterministic test images for update/delete tests
**Files**: `apps/api/core/database/seeds/gallery.ts`
**Verification**: `pnpm seed` (manual verification in DB)

### Step 8: Extend [id].ts handler with PATCH method
**Objective**: Add handlePatch function with input validation, call core function
**Files**: `apps/api/platforms/vercel/api/gallery/images/[id].ts`
**Verification**: `pnpm check-types`

### Step 9: Extend [id].ts handler with DELETE method
**Objective**: Add handleDelete function with S3 cleanup (best-effort)
**Files**: `apps/api/platforms/vercel/api/gallery/images/[id].ts`
**Verification**: `pnpm check-types`

### Step 10: Add HTTP contract requests
**Objective**: Add all update/delete requests to gallery.http
**Files**: `__http__/gallery.http`
**Verification**: Execute requests manually against running dev server

### Step 11: Run full lint and test suite
**Objective**: Ensure all linting and tests pass
**Files**: All modified files
**Verification**: `pnpm lint && pnpm check-types && pnpm test --filter gallery-core`

### Step 12: Integration verification with .http file
**Objective**: Execute all .http requests and verify responses
**Files**: `__http__/gallery.http`
**Verification**: Run `vercel dev`, execute all requests, verify status codes

---

## Test Plan

### Unit Tests (Automated)
```bash
# Run gallery-core tests (includes new update-image and delete-image tests)
pnpm test --filter gallery-core

# Specific test files
pnpm test --filter gallery-core -- update-image.test.ts
pnpm test --filter gallery-core -- delete-image.test.ts
```

### Type Checking
```bash
pnpm check-types --filter gallery-core
pnpm check-types
```

### Linting
```bash
pnpm lint --filter gallery-core
pnpm lint
```

### HTTP Contract Verification (Manual)
```bash
# Start Vercel dev server
cd apps/api/platforms/vercel && vercel dev

# Execute .http requests in VS Code REST Client
# Verify all status codes match expected
```

### Playwright
**NOT APPLICABLE** - Backend-only story, no UI changes

### Seed Verification
```bash
# Reseed database
pnpm seed

# Verify STORY-008 entities exist
# SELECT * FROM gallery_images WHERE id IN ('66666666-...', '77777777-...', '88888888-...', '99999999-...-998');
```

---

## Stop Conditions / Blockers

**No blockers identified.**

All requirements are clear:
1. Story explicitly defines all field validation rules
2. S3 cleanup is explicitly best-effort (no guarantee)
3. Cascade deletes are automatic via FK constraints (`onDelete: 'cascade'`)
4. Album coverImageId clearing is explicitly required before delete
5. Existing patterns from STORY-006 and STORY-007 provide clear templates

---

## Implementation Notes

### S3 Key Extraction
The S3 key must be extracted from the full URL stored in `imageUrl`/`thumbnailUrl`:
```typescript
// URL format: https://bucket.s3.region.amazonaws.com/key
const url = new URL(imageUrl)
const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
```

### S3 Credentials for Vercel
Per story section 9, these env vars are required:
- `GALLERY_BUCKET` or `AWS_S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

If credentials unavailable, log warning and skip S3 cleanup (still return 204).

### Deterministic Seed UUIDs (STORY-008)
| ID Pattern | Purpose |
|------------|---------|
| `66666666-6666-6666-6666-666666666666` | Update test image |
| `77777777-7777-7777-7777-777777777777` | Delete test image |
| `88888888-8888-8888-8888-888888888888` | Album cover for cascade test |
| `99999999-9999-9999-9999-999999999998` | Flagged image for cascade test |
| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Cover test album |
| `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | Flag for cascade test |

### DI Interface Pattern
Each core function needs its own `*DbClient` interface for unit testing:
- `UpdateImageDbClient` - select, update operations
- `DeleteImageDbClient` - select, update (for coverImageId), delete operations
