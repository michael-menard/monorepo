# TEST-PLAN: STORY-007 — Gallery Images Read

## Overview

This test plan covers the migration of 4 gallery image read endpoints from AWS Lambda to Vercel serverless functions:

1. `GET /api/gallery/images/:id` — Get single image by ID
2. `GET /api/gallery/images` — List images with pagination/filtering
3. `GET /api/gallery/images/search` — Search images via OpenSearch (with PostgreSQL fallback)
4. `POST /api/gallery/images/flag` — Flag an image for moderation

---

## Happy Path Tests

### HP-1: Get Single Image

**Preconditions:**
- Database seeded with gallery image owned by test user
- Auth bypass enabled (`AUTH_BYPASS=true`)

**Steps:**
1. Execute `GET /api/gallery/images/:id` with valid image ID
2. Verify response status 200
3. Verify response body contains: `id`, `userId`, `title`, `imageUrl`, `thumbnailUrl`, `tags`, `flagged`, `createdAt`, `lastUpdatedAt`
4. Verify `userId` matches authenticated user

**Evidence:**
- `.http` response captured showing 200 + image object

---

### HP-2: List Images (No Album Filter)

**Preconditions:**
- Database seeded with 3+ gallery images for test user (at least 2 without album)
- Auth bypass enabled

**Steps:**
1. Execute `GET /api/gallery/images?page=1&limit=10`
2. Verify response status 200
3. Verify response contains `data` array and `pagination` object
4. Verify pagination includes: `page`, `limit`, `total`, `totalPages`
5. Verify images are sorted by `createdAt` DESC

**Evidence:**
- `.http` response captured showing 200 + paginated array

---

### HP-3: List Images (With Album Filter)

**Preconditions:**
- Database seeded with album containing at least 2 images
- Auth bypass enabled

**Steps:**
1. Execute `GET /api/gallery/images?albumId={validAlbumId}`
2. Verify response status 200
3. Verify all returned images have `albumId` matching filter
4. Verify pagination reflects filtered count

**Evidence:**
- `.http` response captured showing filtered images

---

### HP-4: Search Images

**Preconditions:**
- Database seeded with gallery images having searchable titles/tags
- Auth bypass enabled

**Steps:**
1. Execute `GET /api/gallery/images/search?search=castle&page=1&limit=10`
2. Verify response status 200
3. Verify response contains `data`, `total`, `pagination`
4. Verify returned images match search term (title, description, or tags)

**Evidence:**
- `.http` response captured showing search results

---

### HP-5: Flag Image

**Preconditions:**
- Database seeded with gallery image that is NOT already flagged by test user
- Auth bypass enabled

**Steps:**
1. Execute `POST /api/gallery/images/flag` with body: `{ "imageId": "...", "reason": "test" }`
2. Verify response status 201
3. Verify response contains `message` and `flag` object
4. Verify flag record created in database

**Evidence:**
- `.http` response captured showing 201 + flag confirmation

---

## Error Cases

### ERR-1: Get Image — Unauthorized (No Token)

**Steps:**
1. Disable auth bypass
2. Execute `GET /api/gallery/images/:id` without Authorization header
3. Verify response status 401
4. Verify response body contains `error: 'Unauthorized'`

---

### ERR-2: Get Image — Not Found

**Steps:**
1. Execute `GET /api/gallery/images/:id` with non-existent UUID
2. Verify response status 404
3. Verify response body contains `error: 'NOT_FOUND'`

---

### ERR-3: Get Image — Forbidden (Other User's Image)

**Preconditions:**
- Image exists but belongs to different user

**Steps:**
1. Execute `GET /api/gallery/images/:id` with another user's image ID
2. Verify response status 403
3. Verify response body contains `error: 'FORBIDDEN'`

---

### ERR-4: Get Image — Invalid ID Format

**Steps:**
1. Execute `GET /api/gallery/images/not-a-uuid`
2. Verify response status 400
3. Verify response body contains `error: 'VALIDATION_ERROR'`

---

### ERR-5: List Images — Invalid Pagination

**Steps:**
1. Execute `GET /api/gallery/images?page=-1&limit=200`
2. Verify response status 400
3. Verify validation error for page and/or limit

---

### ERR-6: Search Images — Empty Query

**Steps:**
1. Execute `GET /api/gallery/images/search` (no search param)
2. Verify response status 400
3. Verify validation error requiring search term

---

### ERR-7: Flag Image — Already Flagged

**Preconditions:**
- Image already flagged by same user

**Steps:**
1. Execute `POST /api/gallery/images/flag` with same imageId
2. Verify response status 409 (Conflict)
3. Verify response indicates duplicate flag

---

### ERR-8: Flag Image — Invalid Body

**Steps:**
1. Execute `POST /api/gallery/images/flag` with invalid body `{ "imageId": "not-uuid" }`
2. Verify response status 400
3. Verify validation error

---

## Edge Cases

### EDGE-1: List Images — Empty Result

**Preconditions:**
- No images exist for test user

**Steps:**
1. Execute `GET /api/gallery/images`
2. Verify response status 200
3. Verify `data` is empty array `[]`
4. Verify `pagination.total` is 0

---

### EDGE-2: Search Images — No Matches

**Steps:**
1. Execute `GET /api/gallery/images/search?search=xyznonexistent123`
2. Verify response status 200
3. Verify `data` is empty array
4. Verify `total` is 0

---

### EDGE-3: List Images — Page Beyond Total

**Preconditions:**
- 5 total images for user

**Steps:**
1. Execute `GET /api/gallery/images?page=100&limit=10`
2. Verify response status 200
3. Verify `data` is empty array (no error)
4. Verify pagination still reflects total count

---

### EDGE-4: S3 URL Generation — Image URL Validity

**Steps:**
1. Get image via `GET /api/gallery/images/:id`
2. Verify `imageUrl` is valid HTTPS URL
3. Verify `thumbnailUrl` is valid HTTPS URL (if present)

---

### EDGE-5: Flag Image — Optional Reason

**Steps:**
1. Execute `POST /api/gallery/images/flag` with body: `{ "imageId": "..." }` (no reason)
2. Verify response status 201
3. Verify flag created with `reason: null`

---

## Evidence Requirements

### Required `.http` Executions

All happy path and key error tests MUST be executed via `.http` file:

| Request Name | File | Required |
|-------------|------|----------|
| `getGalleryImage` | `/__http__/gallery.http` | YES |
| `listGalleryImages` | `/__http__/gallery.http` | YES |
| `listGalleryImagesWithAlbum` | `/__http__/gallery.http` | YES |
| `searchGalleryImages` | `/__http__/gallery.http` | YES |
| `flagGalleryImage` | `/__http__/gallery.http` | YES |
| `getGalleryImage404` | `/__http__/gallery.http` | YES |
| `flagGalleryImageConflict` | `/__http__/gallery.http` | YES |

### Proof Requirements

QA Verify MUST include:
1. `.http` request/response pairs for all required requests
2. Local server logs showing DB queries executed (no mocks)
3. Database query verification (image exists with expected fields)

---

## Seed Data Requirements

Story requires deterministic seed data:

### Gallery Images (minimum 5)

```
gallery_images:
  - id: "11111111-1111-1111-1111-111111111111"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Castle Tower Photo"
    description: "A photo of my castle tower build"
    tags: ["castle", "tower", "medieval"]
    imageUrl: "https://example.com/images/castle-tower.jpg"
    thumbnailUrl: "https://example.com/thumbnails/castle-tower.jpg"
    albumId: null
    flagged: false

  - id: "22222222-2222-2222-2222-222222222222"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Space Station Build"
    description: "Modular space station"
    tags: ["space", "modular", "scifi"]
    imageUrl: "https://example.com/images/space-station.jpg"
    albumId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"  # In album
    flagged: false

  - id: "33333333-3333-3333-3333-333333333333"
    userId: "other-user-id"  # Different user for 403 test
    title: "Private Image"
    imageUrl: "https://example.com/images/private.jpg"
    flagged: false
```

### Gallery Albums (minimum 1)

```
gallery_albums:
  - id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    title: "Space Collection"
```

### Gallery Flags (for conflict test)

```
gallery_flags:
  - imageId: "44444444-4444-4444-4444-444444444444"
    userId: "dev-user-00000000-0000-0000-0000-000000000001"
    reason: "already flagged"
```

Plus image `44444444-4444-4444-4444-444444444444` for the conflict test.

---

## Notes

1. **OpenSearch Fallback**: Search endpoint uses OpenSearch but falls back to PostgreSQL LIKE queries. Test plan covers PostgreSQL path (local dev won't have OpenSearch).

2. **Redis Caching**: AWS handlers use Redis caching. Vercel handlers will NOT use Redis for MVP (acceptable per migration scope). Caching is out of scope.

3. **S3 URLs**: Images reference S3 URLs. For local testing, URLs may be placeholder/mock URLs. Production will use real S3 presigned URLs.
