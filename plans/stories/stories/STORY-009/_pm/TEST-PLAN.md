# STORY-009 Test Plan
## Image Uploads - Phase 1 (Simple Presign Pattern)

---

## Summary

This test plan covers the migration of five image upload endpoints from AWS Lambda to Vercel serverless functions:

1. **Sets Presign** - Generate presigned URLs for set image uploads
2. **Sets Register** - Register uploaded images in the database
3. **Sets Delete** - Delete set images (DB + S3 cleanup)
4. **Wishlist Upload** - Multipart form upload with Sharp processing
5. **Gallery Upload** - Multipart form upload with full processing pipeline

Each endpoint requires authentication, ownership validation, and proper S3 integration.

---

## Endpoints Under Test

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Sets Presign | POST | `/api/sets/:id/images/presign` | Generate S3 presigned URL for direct upload |
| Sets Register | POST | `/api/sets/:id/images` | Register image URL in `set_images` table |
| Sets Delete | DELETE | `/api/sets/:id/images/:imageId` | Delete image record and S3 objects |
| Wishlist Upload | POST | `/api/wishlist/:id/image` | Multipart upload with Sharp processing (800px, WebP) |
| Gallery Upload | POST | `/api/images` | Multipart upload with full processing (2048px, thumbnail, OpenSearch) |

---

## Happy Path Tests

### 1. Sets Presign Upload

#### HP-PRESIGN-001: Generate presigned URL for valid set

**Preconditions:**
- User is authenticated
- Set with ID `{setId}` exists and is owned by the authenticated user

**Input:**
```json
POST /api/sets/{setId}/images/presign
Content-Type: application/json

{
  "filename": "my-image.jpg",
  "contentType": "image/jpeg"
}
```

**Expected Response:**
- Status: `200 OK`
- Body:
```json
{
  "uploadUrl": "https://{bucket}.s3.{region}.amazonaws.com/sets/{setId}/{timestamp}-my-image.jpg?...",
  "imageUrl": "https://{bucket}.s3.{region}.amazonaws.com/sets/{setId}/{timestamp}-my-image.jpg",
  "key": "sets/{setId}/{timestamp}-my-image.jpg"
}
```

**Side Effects:**
- No database changes
- Presigned URL valid for 5 minutes

**Evidence Fields:**
- `uploadUrl` - Must be valid S3 presigned URL
- `imageUrl` - Must match S3 bucket/key pattern
- `key` - Must follow `sets/{setId}/{timestamp}-{sanitizedFilename}` pattern

---

### 2. Sets Register Image

#### HP-REGISTER-001: Register first image for a set

**Preconditions:**
- User is authenticated
- Set with ID `{setId}` exists and is owned by the authenticated user
- Image has been uploaded to S3 at `imageUrl`

**Input:**
```json
POST /api/sets/{setId}/images
Content-Type: application/json

{
  "imageUrl": "https://bucket.s3.us-east-1.amazonaws.com/sets/{setId}/1234567890-photo.webp",
  "key": "sets/{setId}/1234567890-photo.webp"
}
```

**Expected Response:**
- Status: `201 Created`
- Body:
```json
{
  "id": "{uuid}",
  "imageUrl": "https://bucket.s3.us-east-1.amazonaws.com/sets/{setId}/1234567890-photo.webp",
  "thumbnailUrl": null,
  "position": 0
}
```

**Side Effects:**
- New row in `set_images` table with `position: 0`

---

#### HP-REGISTER-002: Register second image (position auto-increment)

**Preconditions:**
- Set already has one image at position 0

**Input:**
```json
POST /api/sets/{setId}/images
Content-Type: application/json

{
  "imageUrl": "https://bucket.s3.us-east-1.amazonaws.com/sets/{setId}/1234567891-photo2.webp",
  "key": "sets/{setId}/1234567891-photo2.webp",
  "thumbnailUrl": "https://bucket.s3.us-east-1.amazonaws.com/sets/{setId}/thumbs/1234567891-photo2.webp"
}
```

**Expected Response:**
- Status: `201 Created`
- Body includes `"position": 1`

**Side Effects:**
- New row in `set_images` table with `position: 1`

---

### 3. Sets Delete Image

#### HP-DELETE-001: Delete existing set image

**Preconditions:**
- User is authenticated
- Set with ID `{setId}` exists and is owned by the authenticated user
- Image with ID `{imageId}` exists and belongs to the set

**Input:**
```
DELETE /api/sets/{setId}/images/{imageId}
```

**Expected Response:**
- Status: `204 No Content`
- Body: Empty

**Side Effects:**
- Row deleted from `set_images` table
- S3 objects deleted (best-effort, non-fatal if fails)

---

### 4. Wishlist Upload Image

#### HP-WISHLIST-001: Upload image for wishlist item

**Preconditions:**
- User is authenticated
- Wishlist item with ID `{itemId}` exists and is owned by the authenticated user

**Input:**
```
POST /api/wishlist/{itemId}/image
Content-Type: multipart/form-data

file: <binary image data> (JPEG, PNG, or WebP, max 5MB)
```

**Expected Response:**
- Status: `200 OK`
- Body:
```json
{
  "imageUrl": "https://bucket.s3.us-east-1.amazonaws.com/wishlist/{userId}/{itemId}.webp"
}
```

**Side Effects:**
- Image processed: resized to max 800px width, converted to WebP (80% quality)
- S3 object created at `wishlist/{userId}/{itemId}.webp`
- `wishlist_items.imageUrl` updated
- Previous image deleted from S3 (if existed)
- Redis cache invalidated for user's wishlist

---

### 5. Gallery Upload Image

#### HP-GALLERY-001: Upload gallery image with all fields

**Preconditions:**
- User is authenticated

**Input:**
```
POST /api/images
Content-Type: multipart/form-data

file: <binary image data> (JPEG, PNG, or WebP, max 10MB)
title: "My Castle Build"
description: "A medieval castle design"
tags: ["castle", "medieval", "moc"]
albumId: "{albumId}" (optional)
```

**Expected Response:**
- Status: `201 Created`
- Body:
```json
{
  "id": "{uuid}",
  "userId": "{userId}",
  "title": "My Castle Build",
  "description": "A medieval castle design",
  "tags": ["castle", "medieval", "moc"],
  "imageUrl": "https://bucket.s3.us-east-1.amazonaws.com/images/{userId}/{imageId}.webp",
  "thumbnailUrl": "https://bucket.s3.us-east-1.amazonaws.com/images/{userId}/thumbnails/{imageId}.webp",
  "albumId": "{albumId}",
  "flagged": false,
  "createdAt": "{timestamp}",
  "lastUpdatedAt": "{timestamp}"
}
```

**Side Effects:**
- Image processed: resized to max 2048px width, converted to WebP (80% quality)
- Thumbnail generated: 400px width
- Main image uploaded to S3 at `images/{userId}/{imageId}.webp`
- Thumbnail uploaded to S3 at `images/{userId}/thumbnails/{imageId}.webp`
- Row created in `gallery_images` table
- Document indexed in OpenSearch (non-fatal if fails)
- Redis cache invalidated for user's gallery lists

---

#### HP-GALLERY-002: Upload gallery image with minimal fields

**Input:**
```
POST /api/images
Content-Type: multipart/form-data

file: <binary image data>
title: "Quick Upload"
```

**Expected Response:**
- Status: `201 Created`
- Body includes:
  - `description: null`
  - `tags: []`
  - `albumId: null`

---

## Error Cases

### Authentication Errors

#### ERR-AUTH-001: Missing authentication token

**Applies to:** All endpoints

**Input:** Request without `Authorization` header

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

#### ERR-AUTH-002: Invalid authentication token

**Applies to:** All endpoints

**Input:** Request with malformed or expired JWT

**Expected Response:**
- Status: `401 Unauthorized`
- Body:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

---

### Ownership/Permission Errors

#### ERR-PERM-001: Resource owned by another user (Sets)

**Applies to:** Sets Presign, Sets Register, Sets Delete

**Preconditions:**
- Set exists but is owned by a different user

**Expected Response:**
- Status: `403 Forbidden`
- Body:
```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to modify this set"
}
```

---

#### ERR-PERM-002: Resource owned by another user (Wishlist)

**Applies to:** Wishlist Upload

**Preconditions:**
- Wishlist item exists but is owned by a different user

**Expected Response:**
- Status: `403 Forbidden`
- Body:
```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to upload images for this item"
}
```

---

### Not Found Errors

#### ERR-404-001: Set not found

**Applies to:** Sets Presign, Sets Register, Sets Delete

**Input:** Valid UUID that does not exist in `sets` table

**Expected Response:**
- Status: `404 Not Found`
- Body:
```json
{
  "error": "NOT_FOUND",
  "message": "Set not found"
}
```

---

#### ERR-404-002: Image not found for delete

**Applies to:** Sets Delete

**Preconditions:**
- Set exists and is owned by user
- Image ID does not exist or does not belong to the set

**Expected Response:**
- Status: `404 Not Found`
- Body:
```json
{
  "error": "NOT_FOUND",
  "message": "Image not found"
}
```

---

#### ERR-404-003: Wishlist item not found

**Applies to:** Wishlist Upload

**Input:** Valid UUID that does not exist in `wishlist_items` table

**Expected Response:**
- Status: `404 Not Found`
- Body:
```json
{
  "error": "NOT_FOUND",
  "message": "Wishlist item not found"
}
```

---

### Validation Errors

#### ERR-VAL-001: Invalid set ID format

**Applies to:** Sets Presign, Sets Register, Sets Delete

**Input:** Non-UUID string as set ID (e.g., `not-a-uuid`)

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "BAD_REQUEST",
  "message": "Set ID is required"
}
```

---

#### ERR-VAL-002: Missing request body (Presign)

**Applies to:** Sets Presign

**Input:** Empty request body

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "BAD_REQUEST",
  "message": "Request body is required"
}
```

---

#### ERR-VAL-003: Invalid JSON body

**Applies to:** Sets Presign, Sets Register

**Input:** Malformed JSON in request body

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "BAD_REQUEST",
  "message": "Invalid JSON in request body"
}
```

---

#### ERR-VAL-004: Missing required field - filename

**Applies to:** Sets Presign

**Input:**
```json
{
  "contentType": "image/jpeg"
}
```

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Filename is required"
}
```

---

#### ERR-VAL-005: Missing required field - contentType

**Applies to:** Sets Presign

**Input:**
```json
{
  "filename": "photo.jpg"
}
```

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Content type is required"
}
```

---

#### ERR-VAL-006: Invalid imageUrl format

**Applies to:** Sets Register

**Input:**
```json
{
  "imageUrl": "not-a-valid-url",
  "key": "sets/123/photo.jpg"
}
```

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "imageUrl must be a valid URL"
}
```

---

#### ERR-VAL-007: Missing file in multipart form

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** Multipart form without file field

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "BAD_REQUEST",
  "message": "No file uploaded"
}
```

---

#### ERR-VAL-008: Invalid file type

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** File with disallowed MIME type (e.g., `application/pdf`)

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid file type. Allowed types: image/jpeg, image/png, image/webp"
}
```

---

#### ERR-VAL-009: File too large (Wishlist)

**Applies to:** Wishlist Upload

**Input:** File larger than 5MB

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "File size exceeds maximum allowed (5MB)"
}
```

---

#### ERR-VAL-010: File too large (Gallery)

**Applies to:** Gallery Upload

**Input:** File larger than 10MB

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "File size exceeds maximum allowed (10MB)"
}
```

---

#### ERR-VAL-011: Missing title (Gallery)

**Applies to:** Gallery Upload

**Input:** Multipart form with file but without title field

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "title is required"
}
```

---

#### ERR-VAL-012: Invalid tags JSON format

**Applies to:** Gallery Upload

**Input:** Tags field with invalid JSON (e.g., `[not valid json]`)

**Expected Response:**
- Status: `400 Bad Request`
- Body:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid JSON format for tags field"
}
```

---

### Internal Server Errors

#### ERR-500-001: Missing SETS_BUCKET environment variable

**Applies to:** Sets Presign, Sets Delete

**Preconditions:**
- `SETS_BUCKET` env var is not configured

**Expected Response:**
- Status: `500 Internal Server Error`
- Body:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Image upload bucket not configured"
}
```

---

#### ERR-500-002: S3 presign failure

**Applies to:** Sets Presign

**Preconditions:**
- S3 client fails to generate presigned URL (e.g., invalid bucket, permissions)

**Expected Response:**
- Status: `500 Internal Server Error`
- Body:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Failed to generate image upload URL"
}
```

---

#### ERR-500-003: Database connection failure

**Applies to:** All endpoints

**Preconditions:**
- Database is unreachable

**Expected Response:**
- Status: `500 Internal Server Error`
- Body:
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Database error"
}
```

---

## Edge Cases

### Filename Handling

#### EDGE-FILE-001: Unicode characters in filename

**Applies to:** Sets Presign

**Input:**
```json
{
  "filename": "my-photo-with-emojis-\uD83D\uDCA5.jpg",
  "contentType": "image/jpeg"
}
```

**Expected Behavior:**
- Filename sanitized (emojis removed/replaced)
- `key` in response contains sanitized filename
- Original filename preserved in S3 metadata

---

#### EDGE-FILE-002: Path traversal attempt in filename

**Applies to:** Sets Presign

**Input:**
```json
{
  "filename": "../../../etc/passwd",
  "contentType": "image/jpeg"
}
```

**Expected Behavior:**
- Path components stripped
- Only filename portion used
- No security vulnerability

---

#### EDGE-FILE-003: Windows reserved filename

**Applies to:** Sets Presign

**Input:**
```json
{
  "filename": "CON.jpg",
  "contentType": "image/jpeg"
}
```

**Expected Behavior:**
- Reserved name prefixed with underscore (`_con.jpg`)

---

#### EDGE-FILE-004: Very long filename (>255 chars)

**Applies to:** Sets Presign

**Input:**
```json
{
  "filename": "a".repeat(300) + ".jpg",
  "contentType": "image/jpeg"
}
```

**Expected Behavior:**
- Filename truncated to max 255 characters
- Extension preserved

---

### File Size Limits

#### EDGE-SIZE-001: File at exact 5MB limit (Wishlist)

**Applies to:** Wishlist Upload

**Input:** File exactly 5,242,880 bytes

**Expected Behavior:**
- Upload succeeds (201 OK or 200 OK)

---

#### EDGE-SIZE-002: File at exact 10MB limit (Gallery)

**Applies to:** Gallery Upload

**Input:** File exactly 10,485,760 bytes

**Expected Behavior:**
- Upload succeeds (201 Created)

---

#### EDGE-SIZE-003: File 1 byte over limit

**Applies to:** Wishlist Upload (5MB+1), Gallery Upload (10MB+1)

**Expected Behavior:**
- Upload rejected (400 Bad Request)

---

### S3 Cleanup Scenarios

#### EDGE-S3-001: S3 delete fails (non-fatal)

**Applies to:** Sets Delete

**Preconditions:**
- Image record deleted from DB
- S3 delete fails (e.g., network timeout, permissions)

**Expected Behavior:**
- Endpoint returns `204 No Content`
- Error logged but not returned to client
- S3 object may remain (orphaned)

---

#### EDGE-S3-002: Delete image with thumbnail

**Applies to:** Sets Delete

**Preconditions:**
- Image has both `imageUrl` and `thumbnailUrl`

**Expected Behavior:**
- Both S3 objects deleted (best-effort)
- Single delete call with multiple keys

---

### Multipart Form Edge Cases

#### EDGE-MULTI-001: Empty file upload

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** Multipart form with 0-byte file

**Expected Behavior:**
- Rejected with `400 Bad Request`
- Message: "No file uploaded" or validation error

---

#### EDGE-MULTI-002: Malformed multipart boundary

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** Request with incorrect multipart boundary

**Expected Behavior:**
- Rejected with `400 Bad Request`
- Message: "Invalid multipart form data"

---

#### EDGE-MULTI-003: Multiple files in single request

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** Multipart form with multiple file fields

**Expected Behavior:**
- Only first file processed
- Other files ignored

---

### Concurrent Operations

#### EDGE-CONC-001: Concurrent presign requests for same set

**Applies to:** Sets Presign

**Input:** Two simultaneous presign requests

**Expected Behavior:**
- Both succeed with unique keys (different timestamps)

---

#### EDGE-CONC-002: Register while deleting same set

**Applies to:** Sets Register, Sets Delete

**Input:** Register image while set is being deleted

**Expected Behavior:**
- One operation succeeds, other fails with appropriate error
- No orphaned records

---

### Image Processing Edge Cases

#### EDGE-IMG-001: Corrupted image file

**Applies to:** Wishlist Upload, Gallery Upload

**Input:** File with valid MIME type header but corrupted image data

**Expected Behavior:**
- Sharp processing fails
- Rejected with `400 Bad Request`
- Message: "Image processing failed" or similar

---

#### EDGE-IMG-002: Image smaller than resize target

**Applies to:** Wishlist Upload (800px), Gallery Upload (2048px)

**Input:** Valid image smaller than max dimensions

**Expected Behavior:**
- Image NOT upscaled
- Original dimensions preserved

---

### Position Auto-Increment

#### EDGE-POS-001: Register image after deleting middle image

**Applies to:** Sets Register

**Preconditions:**
- Set has images at positions 0, 1, 2
- Image at position 1 deleted

**Expected Behavior:**
- New image gets position 3 (highest + 1)
- Gap in positions is allowed

---

---

## Evidence Requirements

### HTTP Request Files

All tests should be documented in `__http__/story-009-image-uploads.http` with the following sections:

```
### ============================================================
### SETS PRESIGN OPERATIONS
### ============================================================

### presignSetImage - Generate presigned URL (200)
# @name presignSetImage
POST {{baseUrl}}/api/sets/{{setId}}/images/presign
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "filename": "test-image.jpg",
  "contentType": "image/jpeg"
}

### presignSetImage401 - Missing auth (401)
...

### presignSetImage403 - Other user's set (403)
...

### presignSetImage404 - Non-existent set (404)
...

### ============================================================
### SETS REGISTER OPERATIONS
### ============================================================

...

### ============================================================
### SETS DELETE OPERATIONS
### ============================================================

...

### ============================================================
### WISHLIST UPLOAD OPERATIONS
### ============================================================

...

### ============================================================
### GALLERY UPLOAD OPERATIONS
### ============================================================

...
```

### Response Verification Checklist

For each test, verify:

| Test Type | Status Code | Required Response Fields | Side Effects |
|-----------|-------------|--------------------------|--------------|
| Presign Success | 200 | `uploadUrl`, `imageUrl`, `key` | None |
| Register Success | 201 | `id`, `imageUrl`, `position` | DB row created |
| Delete Success | 204 | Empty body | DB row deleted, S3 cleanup attempted |
| Wishlist Upload | 200 | `imageUrl` | DB updated, S3 object, cache invalidated |
| Gallery Upload | 201 | `id`, `title`, `imageUrl`, `thumbnailUrl` | DB row, 2 S3 objects, OpenSearch index, cache |
| Auth Errors | 401 | `error: "UNAUTHORIZED"` | None |
| Permission Errors | 403 | `error: "FORBIDDEN"` | None |
| Not Found | 404 | `error: "NOT_FOUND"` | None |
| Validation Errors | 400 | `error: "BAD_REQUEST"` or `"VALIDATION_ERROR"` | None |
| Server Errors | 500 | `error: "INTERNAL_ERROR"` | Logged |

### Database Verification

After register/upload operations, verify via database query:

```sql
-- Sets Images
SELECT id, set_id, image_url, thumbnail_url, position, created_at
FROM set_images
WHERE set_id = '{setId}'
ORDER BY position;

-- Wishlist Items
SELECT id, image_url, updated_at
FROM wishlist_items
WHERE id = '{itemId}';

-- Gallery Images
SELECT id, user_id, title, description, tags, image_url, thumbnail_url, album_id, flagged
FROM gallery_images
WHERE id = '{imageId}';
```

### S3 Verification

After upload operations, verify S3 objects exist:

```bash
# Sets image
aws s3 ls s3://{SETS_BUCKET}/sets/{setId}/

# Wishlist image
aws s3 ls s3://{WISHLIST_BUCKET}/wishlist/{userId}/

# Gallery images (main + thumbnail)
aws s3 ls s3://{GALLERY_BUCKET}/images/{userId}/
aws s3 ls s3://{GALLERY_BUCKET}/images/{userId}/thumbnails/
```

---

## Test Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# S3 Buckets
SETS_BUCKET=my-sets-bucket
GALLERY_BUCKET=my-gallery-bucket

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Auth (for dev/test)
AUTH_BYPASS=true
DEV_USER_SUB=dev-user-00000000-0000-0000-0000-000000000001

# Redis (for cache invalidation tests)
REDIS_URL=redis://localhost:6379

# OpenSearch (for gallery indexing tests)
OPENSEARCH_ENDPOINT=https://...
```

### Seed Data Requirements

1. **User A** (authenticated user):
   - Set with images: `{setId}` with 2+ images
   - Empty set: `{emptySetId}`
   - Wishlist item: `{wishlistItemId}`
   - Gallery album: `{albumId}`

2. **User B** (other user for permission tests):
   - Set: `{otherUserSetId}`
   - Wishlist item: `{otherUserWishlistId}`

---

## Test Execution Order

1. **Setup:** Seed database with test data
2. **Happy Path Tests:** Run all HP-* tests
3. **Error Cases:** Run all ERR-* tests
4. **Edge Cases:** Run EDGE-* tests
5. **Cleanup:** Delete test data

**Note:** Delete tests (HP-DELETE-001, etc.) should run last as they modify test data.

---

## Acceptance Criteria Traceability

| AC | Test Coverage |
|----|---------------|
| AC-1: Auth required for all endpoints | ERR-AUTH-001, ERR-AUTH-002 |
| AC-2: Ownership validation | ERR-PERM-001, ERR-PERM-002 |
| AC-3: Presign returns valid S3 URLs | HP-PRESIGN-001 |
| AC-4: Register creates DB record | HP-REGISTER-001, HP-REGISTER-002 |
| AC-5: Delete removes DB and S3 | HP-DELETE-001, EDGE-S3-001 |
| AC-6: Wishlist Sharp processing | HP-WISHLIST-001 |
| AC-7: Gallery full pipeline | HP-GALLERY-001, HP-GALLERY-002 |
| AC-8: File validation (type, size) | ERR-VAL-008, ERR-VAL-009, ERR-VAL-010 |
| AC-9: Filename sanitization | EDGE-FILE-001 through EDGE-FILE-004 |
| AC-10: Error responses match format | All ERR-* tests |
