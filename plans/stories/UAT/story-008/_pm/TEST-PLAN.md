# TEST-PLAN: STORY-008 - Gallery Images Write (No Upload)

## Overview

This test plan covers write operations for gallery images without upload handling:

1. `PATCH /api/gallery/images/:id` - Update image metadata (title, description, tags, albumId)
2. `DELETE /api/gallery/images/:id` - Delete image (hard delete with best-effort S3 cleanup)

---

## PM Decisions

### D-1: Hard Delete (Not Soft Delete)

**Decision:** Implement **hard delete** (remove DB row + S3 files).

**Rationale:**
- `gallery_images` table has no `deleted_at` column
- Matches existing pattern in `delete-album.ts`
- `gallery_flags` has `ON DELETE CASCADE` configured
- `moc_gallery_images` has `ON DELETE CASCADE` configured
- Avoids migration for MVP
- S3 cleanup is best-effort (orphans acceptable)

**Implementation:**
- DELETE endpoint removes DB row directly
- S3 files (imageUrl, thumbnailUrl) deleted after DB delete
- S3 deletion is best-effort (log failure, do not fail request)

### D-2: Empty Body Handling (PATCH with {})

**Decision:** Return **200 with unchanged data** when PATCH body is empty or has no recognized fields.

**Rationale:**
- PATCH semantics = partial update; empty update is valid (no-op)
- Consistent with REST best practices
- Still updates `lastUpdatedAt` to signal the operation occurred
- Simpler client logic (no special-case 400 handling)

**Implementation:**
- If body has no updateable fields, still update `lastUpdatedAt`
- Return 200 with current image data

### D-3: Album Validation on Update

**Decision:** **Yes, validate albumId exists and belongs to user** before updating.

**Rationale:**
- Prevents orphaned references
- Maintains data integrity
- Consistent with STORY-006 album patterns

**Validation Rules:**
- If `albumId` is provided (non-null): must exist AND belong to same user
- If `albumId` is `null`: valid (move to standalone)
- If album belongs to different user: return 403 FORBIDDEN
- If album does not exist: return 400 BAD REQUEST

### D-4: S3 Deletion Strategy

**Decision:** **Best-effort S3 deletion, DB-first approach.**

**Rationale:**
- DB orphans are worse than S3 orphans (harder to reconcile)
- S3 orphans are low-impact (storage cost only)
- Matches existing pattern in `sets/images/delete/handler.ts`

**Implementation:**
1. Delete DB record (cascades flags, MOC links)
2. Attempt S3 deletion (imageUrl + thumbnailUrl)
3. Log S3 failures, do not fail request
4. Return 204 No Content

### D-5: Album Cover Handling on Image Delete

**Decision:** **Clear album coverImageId** when deleted image was album cover.

**Rationale:**
- Prevents dangling references
- Simple to implement before DB delete
- User can select new cover manually

**Implementation:**
- Before deleting image, check if it's `coverImageId` on any album
- If yes, set that album's `coverImageId = NULL`

---

## Happy Path Tests

| ID | Test | Method | Path | Expected | Evidence |
|----|------|--------|------|----------|----------|
| HP-1 | Update image title only | PATCH | `/api/gallery/images/:id` | 200, title changed, other fields unchanged | .http response |
| HP-2 | Update image description | PATCH | `/api/gallery/images/:id` | 200, description changed | .http response |
| HP-3 | Update image tags | PATCH | `/api/gallery/images/:id` | 200, tags array replaced | .http response |
| HP-4 | Update image albumId (move to album) | PATCH | `/api/gallery/images/:id` | 200, albumId set to valid album | .http response |
| HP-5 | Clear image albumId (move to standalone) | PATCH | `/api/gallery/images/:id` | 200, albumId set to null | .http response |
| HP-6 | Update multiple fields at once | PATCH | `/api/gallery/images/:id` | 200, all specified fields changed | .http response |
| HP-7 | Delete image successfully | DELETE | `/api/gallery/images/:id` | 204 No Content, image removed from DB | .http response + DB verify |

---

## Error Cases

| ID | Test | Method | Path | Expected | Evidence |
|----|------|--------|------|----------|----------|
| ERR-1 | Update without auth | PATCH | `/api/gallery/images/:id` | 401 Unauthorized | .http response |
| ERR-2 | Update non-existent image | PATCH | `/api/gallery/images/:id` | 404 NOT_FOUND | .http response |
| ERR-3 | Update other user's image | PATCH | `/api/gallery/images/:id` | 403 FORBIDDEN | .http response |
| ERR-4 | Update with invalid UUID | PATCH | `/api/gallery/images/not-a-uuid` | 400 VALIDATION_ERROR | .http response |
| ERR-5 | Update with invalid body (bad field types) | PATCH | `/api/gallery/images/:id` | 400 VALIDATION_ERROR | .http response |
| ERR-6 | Update with invalid tags (not array) | PATCH | `/api/gallery/images/:id` | 400 VALIDATION_ERROR | .http response |
| ERR-7 | Delete without auth | DELETE | `/api/gallery/images/:id` | 401 Unauthorized | .http response |
| ERR-8 | Delete non-existent image | DELETE | `/api/gallery/images/:id` | 404 NOT_FOUND | .http response |
| ERR-9 | Delete other user's image | DELETE | `/api/gallery/images/:id` | 403 FORBIDDEN | .http response |
| ERR-10 | Delete with invalid UUID | DELETE | `/api/gallery/images/not-a-uuid` | 400 VALIDATION_ERROR | .http response |

---

## Edge Cases

| ID | Test | Method | Path | Expected | Evidence |
|----|------|--------|------|----------|----------|
| EDGE-1 | Update with empty body {} | PATCH | `/api/gallery/images/:id` | 200, lastUpdatedAt changed, data unchanged | .http response |
| EDGE-2 | Update albumId to non-existent album | PATCH | `/api/gallery/images/:id` | 400 BAD REQUEST ("Album not found") | .http response |
| EDGE-3 | Update albumId to other user's album | PATCH | `/api/gallery/images/:id` | 403 FORBIDDEN ("Album belongs to another user") | .http response |
| EDGE-4 | Delete image that is album cover | DELETE | `/api/gallery/images/:id` | 204, album coverImageId cleared to null | .http + DB verify |
| EDGE-5 | Delete image with flags | DELETE | `/api/gallery/images/:id` | 204, flags cascade-deleted | .http + DB verify |
| EDGE-6 | Update title to empty string | PATCH | `/api/gallery/images/:id` | 400 VALIDATION_ERROR ("Title is required") | .http response |
| EDGE-7 | Update description to null (clear) | PATCH | `/api/gallery/images/:id` | 200, description set to null | .http response |
| EDGE-8 | Update tags to empty array [] | PATCH | `/api/gallery/images/:id` | 200, tags set to empty array | .http response |
| EDGE-9 | Update tags to null (clear) | PATCH | `/api/gallery/images/:id` | 200, tags set to null | .http response |

---

## Evidence Requirements

### Required .http Executions

All tests MUST be executed via `.http` file with captured responses:

| Request Name | File | Test ID | Required |
|--------------|------|---------|----------|
| `updateGalleryImageTitle` | `/__http__/gallery.http` | HP-1 | YES |
| `updateGalleryImageDescription` | `/__http__/gallery.http` | HP-2 | YES |
| `updateGalleryImageTags` | `/__http__/gallery.http` | HP-3 | YES |
| `updateGalleryImageAlbumId` | `/__http__/gallery.http` | HP-4 | YES |
| `updateGalleryImageClearAlbum` | `/__http__/gallery.http` | HP-5 | YES |
| `updateGalleryImageMultiple` | `/__http__/gallery.http` | HP-6 | YES |
| `deleteGalleryImage` | `/__http__/gallery.http` | HP-7 | YES |
| `updateGalleryImage404` | `/__http__/gallery.http` | ERR-2 | YES |
| `updateGalleryImage403` | `/__http__/gallery.http` | ERR-3 | YES |
| `deleteGalleryImage404` | `/__http__/gallery.http` | ERR-8 | YES |
| `deleteGalleryImage403` | `/__http__/gallery.http` | ERR-9 | YES |
| `updateGalleryImageEmptyBody` | `/__http__/gallery.http` | EDGE-1 | YES |
| `deleteAlbumCoverImage` | `/__http__/gallery.http` | EDGE-4 | YES |

### Proof Requirements

QA Verify MUST include:

1. **API Response Capture**
   - All `.http` request/response pairs for required tests
   - Response status codes, headers, and bodies
   - Timestamps showing test execution time

2. **Database Verification**
   - Query showing image row removed after HP-7
   - Query showing album `cover_image_id = NULL` after EDGE-4
   - Query showing flags removed (cascade) after EDGE-5

3. **Server Logs**
   - Local server logs showing DB queries executed (no mocks)
   - No console errors during test execution

---

## Seed Data Requirements

### New Seed Data for STORY-008

Add to existing gallery seed data:

```yaml
gallery_images:
  # STORY-008: Image for update tests
  - id: "66666666-6666-6666-6666-666666666666"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Update Test Image"
    description: "Image for testing PATCH operations"
    tags: ["test", "update"]
    imageUrl: "https://example.com/images/update-test.jpg"
    thumbnailUrl: "https://example.com/thumbs/update-test.jpg"
    albumId: null
    flagged: false

  # STORY-008: Image for delete tests
  - id: "77777777-7777-7777-7777-777777777777"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Delete Test Image"
    description: "Image for testing DELETE operations"
    tags: ["test", "delete"]
    imageUrl: "https://example.com/images/delete-test.jpg"
    thumbnailUrl: "https://example.com/thumbs/delete-test.jpg"
    albumId: null
    flagged: false

  # STORY-008: Image that is album cover (for EDGE-4)
  - id: "88888888-8888-8888-8888-888888888888"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Album Cover Image"
    description: "This image is used as album cover"
    tags: ["cover", "test"]
    imageUrl: "https://example.com/images/cover-test.jpg"
    thumbnailUrl: "https://example.com/thumbs/cover-test.jpg"
    albumId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    flagged: false

  # STORY-008: Image with flags (for EDGE-5 cascade test)
  - id: "99999999-9999-9999-9999-999999999998"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Flagged Delete Test"
    description: "Image with flags for delete cascade test"
    tags: ["flagged", "delete"]
    imageUrl: "https://example.com/images/flagged-delete.jpg"
    thumbnailUrl: "https://example.com/thumbs/flagged-delete.jpg"
    albumId: null
    flagged: true

gallery_albums:
  # STORY-008: Album for cover image delete test (EDGE-4)
  - id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Cover Test Album"
    description: "Album with cover for delete test"
    coverImageId: "88888888-8888-8888-8888-888888888888"

gallery_flags:
  # STORY-008: Flag on image for cascade delete test (EDGE-5)
  - id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
    imageId: "99999999-9999-9999-9999-999999999998"
    userId: "other-user-00000000-0000-0000-0000-000000000002"
    reason: "Flag for cascade delete test"
```

### Existing Seed Data Used

From STORY-007 seed data:

| ID | Purpose |
|----|---------|
| `11111111-...` | Happy path update test (Castle Tower Photo) |
| `55555555-...` | 403 forbidden test (other user's image) |
| `aaaaaaaa-...` | Valid album for albumId update test |
| `22222222-...-003` | Other user's album for EDGE-3 test |

---

## API Contract

### PATCH /api/gallery/images/:id

**Request:**
```http
PATCH /api/gallery/images/66666666-6666-6666-6666-666666666666
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated Title",           // Optional: string, min 1, max 200
  "description": "New description",   // Optional: string, max 2000, or null
  "tags": ["new", "tags"],            // Optional: string[], or null
  "albumId": "uuid-of-album"          // Optional: uuid, or null to clear
}
```

**Response (200):**
```json
{
  "id": "66666666-6666-6666-6666-666666666666",
  "userId": "dev-user-00000000-0000-0000-0000-000000000001",
  "title": "Updated Title",
  "description": "New description",
  "tags": ["new", "tags"],
  "imageUrl": "https://example.com/images/update-test.jpg",
  "thumbnailUrl": "https://example.com/thumbs/update-test.jpg",
  "albumId": "uuid-of-album",
  "flagged": false,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "lastUpdatedAt": "2024-01-15T12:30:00.000Z"
}
```

**Error Responses:**
- 400: `{ "error": "Bad Request", "message": "..." }`
- 401: `{ "error": "Unauthorized", "message": "..." }`
- 403: `{ "error": "Forbidden", "message": "..." }`
- 404: `{ "error": "Not Found", "message": "..." }`

### DELETE /api/gallery/images/:id

**Request:**
```http
DELETE /api/gallery/images/77777777-7777-7777-7777-777777777777
Authorization: Bearer <token>
```

**Response (204):**
No content body.

**Error Responses:**
- 400: `{ "error": "Bad Request", "message": "..." }`
- 401: `{ "error": "Unauthorized", "message": "..." }`
- 403: `{ "error": "Forbidden", "message": "..." }`
- 404: `{ "error": "Not Found", "message": "..." }`

---

## Implementation Notes

### Update Image Validation Schema

```typescript
export const UpdateImageInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
  albumId: z.string().uuid().nullable().optional(),
})
```

### Delete Operation Order

1. Verify image exists and user owns it
2. Clear `coverImageId` on any albums referencing this image
3. Retrieve `imageUrl` and `thumbnailUrl` for S3 cleanup
4. Delete DB record (cascades `gallery_flags`, `moc_gallery_images`)
5. Attempt S3 deletion (best effort, log failure)
6. Return 204 No Content

### Error Code Consistency

Follow STORY-007 error patterns:
- `Bad Request` for 400 (validation errors)
- `Not Found` for 404 (resource doesn't exist)
- `Forbidden` for 403 (ownership violation)
- `Unauthorized` for 401 (no/invalid auth)
