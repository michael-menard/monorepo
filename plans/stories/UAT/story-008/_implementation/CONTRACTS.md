# STORY-008 Contracts Documentation

**Story**: STORY-008 - Gallery Images Write (No Upload)
**Date**: 2026-01-19
**Agent**: dev-implement-contracts

---

## Swagger Updates

### File(s) updated
- No Swagger/OpenAPI files were updated for this story

### Summary of changes
The existing OpenAPI documentation files in this repository:
- `/openapi.yaml` - Documents `/api/sets/list` endpoint only (STORY-000 proof-of-concept)
- `/apps/api/__docs__/swagger.yaml` - Documents AWS Lambda API (legacy), references path files that are not part of Vercel migration

**Note**: The Vercel serverless migration (STORY-006, STORY-007, STORY-008) does not currently have its own OpenAPI spec. The HTTP contract files (`__http__/gallery.http`) serve as the primary contract documentation for the Vercel gallery endpoints.

### Notes about versioning or breaking changes
- No breaking changes. PATCH and DELETE methods added to existing `/api/gallery/images/:id` endpoint
- API contract is backward compatible with STORY-007 (GET method unchanged)

---

## HTTP Files

### Added/updated .http file paths
- `__http__/gallery.http` - Updated with STORY-008 update/delete requests

### Requests by category

#### UPDATE IMAGE OPERATIONS (PATCH /api/gallery/images/:id)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `updateGalleryImageTitle` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Update image title only | 200 |
| `updateGalleryImageDescription` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Update image description | 200 |
| `updateGalleryImageTags` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Update image tags | 200 |
| `updateGalleryImageAlbumId` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Move image to album | 200 |
| `updateGalleryImageClearAlbum` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Clear albumId (standalone) | 200 |
| `updateGalleryImageMultiple` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Update multiple fields at once | 200 |
| `updateGalleryImageEmptyBody` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Empty body per AC-4 | 200 |
| `updateGalleryImageClearDescription` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Clear description to null | 200 |
| `updateGalleryImageClearTags` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Clear tags to null | 200 |
| `updateGalleryImageEmptyTags` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Set tags to empty array | 200 |
| `updateGalleryImage404` | PATCH | `/api/gallery/images/99999999-9999-9999-9999-999999999999` | Non-existent image | 404 |
| `updateGalleryImage403` | PATCH | `/api/gallery/images/55555555-5555-5555-5555-555555555555` | Other user's image | 403 |
| `updateGalleryImage400InvalidUUID` | PATCH | `/api/gallery/images/not-a-uuid` | Invalid UUID format | 400 |
| `updateGalleryImage400EmptyTitle` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Empty title string | 400 |
| `updateGalleryImageAlbum404` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Non-existent albumId | 400 |
| `updateGalleryImageAlbum403` | PATCH | `/api/gallery/images/66666666-6666-6666-6666-666666666666` | Other user's albumId | 403 |

#### DELETE IMAGE OPERATIONS (DELETE /api/gallery/images/:id)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `deleteGalleryImage404` | DELETE | `/api/gallery/images/99999999-9999-9999-9999-999999999999` | Non-existent image | 404 |
| `deleteGalleryImage403` | DELETE | `/api/gallery/images/55555555-5555-5555-5555-555555555555` | Other user's image | 403 |
| `deleteGalleryImage400` | DELETE | `/api/gallery/images/not-a-uuid` | Invalid UUID format | 400 |
| `deleteAlbumCoverImage` | DELETE | `/api/gallery/images/88888888-8888-8888-8888-888888888888` | Image as album cover (cascade test) | 204 |
| `deleteGalleryImageWithFlags` | DELETE | `/api/gallery/images/99999999-9999-9999-9999-999999999998` | Image with flags (cascade test) | 204 |
| `deleteGalleryImage` | DELETE | `/api/gallery/images/77777777-7777-7777-7777-777777777777` | Happy path delete | 204 |

---

## API Contract Summary

### PATCH /api/gallery/images/:id

**Purpose**: Update image metadata (title, description, tags, albumId)

**Request Body Schema** (all fields optional):
```typescript
{
  title?: string        // 1-200 chars, empty string invalid
  description?: string | null  // max 2000 chars, null clears
  tags?: string[] | null      // max 20 tags, 50 chars each, null clears
  albumId?: string | null     // UUID format, null removes from album
}
```

**Response Codes**:
| Code | Condition |
|------|-----------|
| 200 | Success - returns updated image object |
| 400 | Invalid UUID, validation error, album not found |
| 401 | Auth bypass disabled and no token |
| 403 | Image owned by different user, album owned by different user |
| 404 | Image not found |

**Response Body** (200):
```typescript
{
  id: string           // UUID
  userId: string
  title: string
  description: string | null
  tags: string[] | null
  imageUrl: string
  thumbnailUrl: string | null
  albumId: string | null
  flagged: boolean
  createdAt: string    // ISO8601
  lastUpdatedAt: string // ISO8601
}
```

**Special Behaviors**:
- Empty body `{}` returns 200 with `lastUpdatedAt` updated (per AC-4)
- Setting `albumId` validates album exists and belongs to same user
- Setting `albumId: null` moves image to standalone

### DELETE /api/gallery/images/:id

**Purpose**: Hard delete image with S3 cleanup

**Request Body**: None

**Response Codes**:
| Code | Condition |
|------|-----------|
| 204 | Success - no content |
| 400 | Invalid UUID format |
| 401 | Auth bypass disabled and no token |
| 403 | Image owned by different user |
| 404 | Image not found |

**Cascade Behaviors** (per AC-6):
- `gallery_flags` entries are cascade-deleted (FK constraint)
- `moc_gallery_images` entries are cascade-deleted (FK constraint)
- If image is `coverImageId` of an album, that album's `coverImageId` is set to null before deletion

**S3 Cleanup** (per AC-7):
- After DB deletion, attempts to delete `imageUrl` from S3
- After DB deletion, attempts to delete `thumbnailUrl` from S3 (if not null)
- S3 deletion is best-effort: logs failure but does not fail the request
- Request returns 204 even if S3 deletion fails

---

## Executed HTTP Evidence

**Note**: Per agent instructions, HTTP request execution is deferred to QA verification phase. The HTTP requests documented above have been added to `__http__/gallery.http` and are ready for execution.

The QA verification agent will:
1. Run `pnpm seed` to ensure test data exists
2. Execute all HTTP requests using VS Code REST Client or equivalent
3. Capture response status codes and bodies
4. Verify database state for delete operations
5. Document evidence in `QA-VERIFY-STORY-008.md`

---

## Notes

### Discrepancies Resolved
- None identified. Implementation matches story requirements.

### Implementation Details
- **Handler File**: `apps/api/platforms/vercel/api/gallery/images/[id].ts`
- **Core Functions**: `packages/backend/gallery-core/src/update-image.ts`, `packages/backend/gallery-core/src/delete-image.ts`
- **Seed Data**: `apps/api/core/database/seeds/gallery.ts` includes STORY-008 test entities
- **Unit Tests**: 24 new tests (16 for update, 8 for delete) in gallery-core package

### Blockers
- None. Implementation complete and ready for QA verification.
