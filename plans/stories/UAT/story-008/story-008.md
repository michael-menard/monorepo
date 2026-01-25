---
status: uat
---

# STORY-008: Gallery - Images Write (No Upload)

## 1. Title

Migrate gallery image write endpoints (update metadata, delete) from AWS Lambda to Vercel serverless functions.

---

## 2. Context

The Vercel migration continues with gallery image write operations. STORY-007 established image read operations (get, list, search, flag) in the `gallery-core` package. This story adds the ability to update image metadata and delete images entirely.

The AWS Lambda handlers at `apps/api/platforms/aws/endpoints/gallery/` implement:
- Update image metadata (title, description, tags, albumId)
- Delete image with S3 cleanup

These must be migrated to Vercel while maintaining API contract compatibility and following established patterns from STORY-006 (albums) and STORY-007 (images read).

---

## 3. Goal

Enable image metadata updates and deletion via Vercel serverless functions with identical API behavior to the existing AWS Lambda implementation.

---

## 4. Non-Goals

- **Image upload**: This story handles metadata updates only. Upload operations are STORY-009.
- **Soft delete**: No `deletedAt` column exists. This story implements hard delete.
- **S3 cleanup guarantee**: S3 deletion is best-effort. Orphan files are acceptable for MVP.
- **UI changes**: No frontend modifications. Existing RTK Query slices continue to work unchanged.
- **Undo/recovery**: No image recovery mechanism. Hard delete is permanent.

---

## 5. Scope

### Endpoints

| Method | Path | Handler |
|--------|------|---------|
| PATCH | `/api/gallery/images/:id` | Update image metadata |
| DELETE | `/api/gallery/images/:id` | Delete image (hard delete) |

### Packages/Apps Affected

| Location | Change Type |
|----------|-------------|
| `packages/backend/gallery-core/` | MODIFY — add `updateGalleryImage`, `deleteGalleryImage` functions |
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | MODIFY — add PATCH and DELETE handlers |
| `apps/api/core/database/seeds/gallery.ts` | MODIFY — add STORY-008 seed data |
| `__http__/gallery.http` | MODIFY — add update/delete endpoint requests |

**NOTE**: Per reuse-first principle, update and delete functions are added to the existing `packages/backend/gallery-core/` package alongside the read operations from STORY-007.

---

## 6. Acceptance Criteria

### AC-1: Update Image Endpoint (PATCH)

- [ ] `PATCH /api/gallery/images/:id` accepts `{ title?, description?, tags?, albumId? }` body
- [ ] Returns 200 with updated image object on success
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 401 when auth bypass is disabled and no token provided

### AC-2: Update Field Validation

- [ ] `title` must be 1-200 characters if provided; empty string returns 400
- [ ] `description` can be null (to clear) or string up to 2000 chars
- [ ] `tags` can be null (to clear), empty array, or array of strings (max 20 tags, max 50 chars each)
- [ ] `albumId` can be null (move to standalone) or valid UUID

### AC-3: Album Validation on Update

- [ ] When `albumId` is non-null, verify album exists; return 400 if not found
- [ ] When `albumId` is non-null, verify album belongs to same user; return 403 if not
- [ ] When `albumId` is null, image becomes standalone (no validation needed)

### AC-4: Empty Body Handling

- [ ] PATCH with empty body `{}` returns 200 with unchanged image data
- [ ] `lastUpdatedAt` is updated even for empty body (no-op update)

### AC-5: Delete Image Endpoint (DELETE)

- [ ] `DELETE /api/gallery/images/:id` returns 204 No Content on success
- [ ] Returns 404 for non-existent image
- [ ] Returns 403 for image owned by different user
- [ ] Returns 400 for invalid UUID format
- [ ] Returns 401 when auth bypass is disabled and no token provided

### AC-6: Delete Cascade Behavior

- [ ] When image is deleted, `gallery_flags` entries are cascade-deleted (automatic via FK)
- [ ] When image is deleted, `moc_gallery_images` entries are cascade-deleted (automatic via FK)
- [ ] When image is `coverImageId` of an album, that album's `coverImageId` is set to null before deletion

### AC-7: S3 Cleanup Behavior

- [ ] After DB deletion, attempt to delete `imageUrl` from S3
- [ ] After DB deletion, attempt to delete `thumbnailUrl` from S3 (if not null)
- [ ] S3 deletion is best-effort: log failure but do not fail the request
- [ ] Request returns 204 even if S3 deletion fails

### AC-8: Extend gallery-core Package

- [ ] Add `updateGalleryImage` function to existing package
- [ ] Add `deleteGalleryImage` function to existing package
- [ ] Add `UpdateImageInputSchema` to `__types__/index.ts`
- [ ] Unit tests for update and delete core functions
- [ ] Follow existing patterns from album and image read functions

### AC-9: Seed Data

- [ ] `pnpm seed` includes new STORY-008 test images
- [ ] Seed includes image for update tests (id: `66666666-...`)
- [ ] Seed includes image for delete tests (id: `77777777-...`)
- [ ] Seed includes image as album cover for delete cascade test (id: `88888888-...`)
- [ ] Seed includes image with flags for cascade delete test (id: `99999999-...-998`)
- [ ] Seed is idempotent (safe to run multiple times)

### AC-10: HTTP Contract Verification

- [ ] `__http__/gallery.http` updated with all required update/delete requests
- [ ] All happy path requests documented and executable
- [ ] Error case requests documented (404, 403, 400)

---

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handlers |
| `@repo/vercel-adapter` | Request/response transformation, auth middleware |
| `packages/backend/db` | Drizzle schema and client |
| `packages/backend/lambda-responses` | Response helpers (ok, error patterns) |
| `packages/backend/gallery-core` | **Existing** — extend with update/delete operations |
| `@aws-sdk/client-s3` | S3 deletion (already installed) |

### Extend Existing Package

| Package | Justification |
|---------|--------------|
| `packages/backend/gallery-core` | Already exports image read operations. Update/delete operations belong in same domain package. Reuse-first principle. |

### Prohibited Patterns

- Do NOT create a separate `gallery-images-write-core` package
- Do NOT duplicate Zod schemas between AWS and Vercel handlers
- Do NOT inline database queries in Vercel handlers (use core package)
- Do NOT modify `imageUrl`, `thumbnailUrl`, or `flagged` via PATCH (these are managed elsewhere)

---

## 8. Architecture Notes (Ports & Adapters)

```
                    Vercel Handler (Adapter)
  apps/api/platforms/vercel/api/gallery/images/[id].ts

  - Parse request (via @repo/vercel-adapter)
  - Extract auth (AUTH_BYPASS or JWT)
  - Call core function
  - Transform response
                          │
                          ▼
                    Core Logic (Port)
  packages/backend/gallery-core/src/update-image.ts
  packages/backend/gallery-core/src/delete-image.ts

  - Validate input (Zod)
  - Query database (Drizzle)
  - Apply business rules (ownership check, album validation)
  - S3 cleanup (delete-image only)
  - Return typed result
                          │
                          ▼
                    Database (Infrastructure)
  packages/backend/db

  - galleryImages table
  - galleryAlbums table
  - galleryFlags table (cascade delete)
  - mocGalleryImages table (cascade delete)
```

---

## 9. Required Vercel / Infra Notes

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `AUTH_BYPASS` | Enable dev auth bypass (dev only) | DEV ONLY |
| `DEV_USER_SUB` | Mock user ID for bypass | DEV ONLY |
| `GALLERY_BUCKET` or `AWS_S3_BUCKET` | S3 bucket for gallery images | YES (for S3 cleanup) |
| `AWS_REGION` | AWS region for S3 | YES (for S3 cleanup) |
| `AWS_ACCESS_KEY_ID` | AWS credentials | YES (for S3 cleanup) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | YES (for S3 cleanup) |

**Note:** Verify which S3 bucket env var is configured for Vercel. If S3 credentials are not available, S3 cleanup should be skipped (logged as warning).

### Vercel Configuration

The `apps/api/platforms/vercel/api/gallery/images/[id].ts` handler already exists from STORY-007. This story adds PATCH and DELETE methods to the same file. No new routes needed in `vercel.json`.

---

## 10. HTTP Contract Plan

### Required `.http` Requests

| Request Name | Path | Method | Required |
|-------------|------|--------|----------|
| `updateGalleryImageTitle` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageDescription` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageTags` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageAlbumId` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageClearAlbum` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageMultiple` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImageEmptyBody` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImage404` | `/__http__/gallery.http` | PATCH | YES |
| `updateGalleryImage403` | `/__http__/gallery.http` | PATCH | YES |
| `deleteGalleryImage` | `/__http__/gallery.http` | DELETE | YES |
| `deleteGalleryImage404` | `/__http__/gallery.http` | DELETE | YES |
| `deleteGalleryImage403` | `/__http__/gallery.http` | DELETE | YES |
| `deleteAlbumCoverImage` | `/__http__/gallery.http` | DELETE | YES |

### Evidence Requirements

QA Verify MUST capture:
1. Response status code
2. Response body (JSON)
3. Verify database state for delete operations (row removed, cascade effects)
4. Verify album coverImageId cleared when deleting cover image

---

## 11. Seed Requirements

### New Entities for STORY-008

**Gallery Images:**

| ID | Title | Purpose |
|----|-------|---------|
| `66666666-6666-6666-6666-666666666666` | Update Test Image | Happy path PATCH tests |
| `77777777-7777-7777-7777-777777777777` | Delete Test Image | Happy path DELETE tests |
| `88888888-8888-8888-8888-888888888888` | Album Cover Image | Cover image cascade test |
| `99999999-9999-9999-9999-999999999998` | Flagged Delete Test | Flag cascade delete test |

**Gallery Albums:**

| ID | Title | Purpose |
|----|-------|---------|
| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | Cover Test Album | Album with cover for delete test |

**Gallery Flags:**

| ID | Image ID | Purpose |
|----|----------|---------|
| `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | `99999999-...-998` | Cascade delete test |

### Seed Requirements

- **Deterministic**: Same IDs every run
- **Idempotent**: Upsert pattern (ON CONFLICT DO UPDATE)
- **Location**: `apps/api/core/database/seeds/gallery.ts`
- **Command**: `pnpm seed` includes gallery seed

---

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Evidence |
|----|------|----------|
| HP-1 | Update image title only | `.http` response: 200, title changed |
| HP-2 | Update image description | `.http` response: 200, description changed |
| HP-3 | Update image tags | `.http` response: 200, tags replaced |
| HP-4 | Update image albumId (move to album) | `.http` response: 200, albumId set |
| HP-5 | Clear image albumId (move to standalone) | `.http` response: 200, albumId null |
| HP-6 | Update multiple fields at once | `.http` response: 200, all fields changed |
| HP-7 | Delete image successfully | `.http` response: 204, DB verify row removed |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| ERR-1 | Update without auth (bypass disabled) | 401 Unauthorized |
| ERR-2 | Update non-existent image | 404 Not Found |
| ERR-3 | Update other user's image | 403 Forbidden |
| ERR-4 | Update with invalid UUID | 400 Bad Request |
| ERR-5 | Update with invalid body (bad types) | 400 Bad Request |
| ERR-6 | Update with invalid tags (not array) | 400 Bad Request |
| ERR-7 | Delete without auth (bypass disabled) | 401 Unauthorized |
| ERR-8 | Delete non-existent image | 404 Not Found |
| ERR-9 | Delete other user's image | 403 Forbidden |
| ERR-10 | Delete with invalid UUID | 400 Bad Request |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | Update with empty body {} | 200, lastUpdatedAt changed |
| EDGE-2 | Update albumId to non-existent album | 400 Bad Request |
| EDGE-3 | Update albumId to other user's album | 403 Forbidden |
| EDGE-4 | Delete image that is album cover | 204, album coverImageId cleared |
| EDGE-5 | Delete image with flags | 204, flags cascade-deleted |
| EDGE-6 | Update title to empty string | 400 Bad Request |
| EDGE-7 | Update description to null (clear) | 200, description null |
| EDGE-8 | Update tags to empty array | 200, tags empty array |
| EDGE-9 | Update tags to null (clear) | 200, tags null |

### Evidence Requirements

- All HP tests must have `.http` response captured
- All ERR tests must show correct status code
- Database state verified for delete operations
- Album coverImageId verified for EDGE-4

---

## 13. Open Questions

*None — all blocking decisions resolved.*

| Decision | Resolution |
|----------|------------|
| Soft vs Hard Delete | **Hard delete** — no `deletedAt` column, matches existing patterns |
| S3 Deletion | **Best-effort, DB-first** — log failures, don't fail request |
| Album Cover Handling | **Clear coverImageId** before deleting image |
| Empty Body PATCH | **200 with updated lastUpdatedAt** |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-19T00:00:00-07:00 | PM | Generated story from index | `plans/stories/story-008/story-008.md` |
