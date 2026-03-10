# API CONTRACTS: STORY-009

## Story: Image Uploads - Phase 1 (Simple Presign Pattern)

---

# Swagger Updates

- **File(s) updated:** N/A - This project does not use Swagger/OpenAPI
- **Summary of changes:** N/A
- **Notes:** API contracts are documented via `.http` files and inline JSDoc comments

---

# HTTP Files

## Added/Updated .http File Paths

| File | Status |
|------|--------|
| `__http__/story-009-image-uploads.http` | NEW |

## Request Coverage Summary

The `.http` file covers all JSON API endpoints. Multipart upload endpoints are documented via curl commands within the file due to binary data limitations in `.http` format.

---

# API Contract Definitions

## 1. Sets Presign Endpoint

**Path:** `POST /api/sets/:id/images/presign`

**Purpose:** Generate presigned S3 PUT URL for direct browser upload

**Request:**
```json
{
  "filename": "string (required)",
  "contentType": "string (required, e.g., image/jpeg)"
}
```

**Response (200 OK):**
```json
{
  "uploadUrl": "string (presigned S3 PUT URL, 5-minute expiry)",
  "imageUrl": "string (final S3 URL after upload)",
  "key": "string (S3 object key)"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | Bad Request | Invalid/missing set ID |
| 400 | VALIDATION_ERROR | Missing filename or contentType |
| 401 | Unauthorized | No/invalid authentication |
| 403 | Forbidden | Set belongs to another user |
| 404 | Not Found | Set does not exist |
| 500 | INTERNAL_ERROR | S3 bucket not configured |

**Handler:** `apps/api/platforms/vercel/api/sets/[id]/images/presign.ts`

---

## 2. Sets Register Endpoint

**Path:** `POST /api/sets/:id/images`

**Purpose:** Register an uploaded image in the database with auto-increment position

**Request:**
```json
{
  "imageUrl": "string (required, valid URL)",
  "key": "string (required, S3 object key)",
  "thumbnailUrl": "string (optional, valid URL)"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "imageUrl": "string",
  "thumbnailUrl": "string | null",
  "position": "integer (0-indexed, auto-incremented)"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | Bad Request | Invalid/missing set ID |
| 400 | VALIDATION_ERROR | Invalid imageUrl format or missing key |
| 401 | Unauthorized | No/invalid authentication |
| 403 | Forbidden | Set belongs to another user |
| 404 | Not Found | Set does not exist |

**Handler:** `apps/api/platforms/vercel/api/sets/[id]/images/index.ts`

---

## 3. Sets Delete Endpoint

**Path:** `DELETE /api/sets/:id/images/:imageId`

**Purpose:** Delete image record from database with best-effort S3 cleanup

**Request:** None (path parameters only)

**Response (204 No Content):** Empty body

**Error Responses:**
| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | Bad Request | Invalid set ID or image ID format |
| 401 | Unauthorized | No/invalid authentication |
| 403 | Forbidden | Set belongs to another user |
| 404 | Not Found | Set or image does not exist |

**Handler:** `apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts`

**Notes:**
- S3 cleanup failures are logged but do not fail the request (AC-18)
- Deletes both main image and thumbnail if thumbnail exists

---

## 4. Wishlist Image Upload Endpoint

**Path:** `POST /api/wishlist/:id/image`

**Purpose:** Upload and process wishlist item image via Sharp

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Image file (JPEG, PNG, WebP) |

**Constraints:**
- Max file size: 5MB (AC-12)
- Allowed types: image/jpeg, image/png, image/webp (AC-14)
- Processing: Sharp resize to 800px max width, WebP format, 80% quality (AC-4)

**Response (200 OK):**
```json
{
  "imageUrl": "string (S3 URL of processed image)"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | Bad Request | Invalid item ID, no file uploaded, invalid multipart |
| 400 | VALIDATION_ERROR | File too large (>5MB) or invalid file type |
| 400 | FILE_ERROR | Image processing failed (corrupted file) |
| 401 | Unauthorized | No/invalid authentication |
| 403 | Forbidden | Item belongs to another user |
| 404 | Not Found | Wishlist item does not exist |

**Handler:** `apps/api/platforms/vercel/api/wishlist/[id]/image.ts`

**Notes:**
- Old image is deleted from S3 (best-effort) when replaced
- S3 path: `wishlist/{userId}/{itemId}.webp`

---

## 5. Gallery Image Upload Endpoint

**Path:** `POST /api/gallery/images/upload`

**Purpose:** Upload gallery image with Sharp processing, thumbnail generation, and OpenSearch indexing

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Image file (JPEG, PNG, WebP) |
| title | String | Yes | Image title (1-200 chars) |
| description | String | No | Image description (max 2000 chars) |
| tags | String | No | Comma-separated or JSON array of tags (max 20 tags, 50 chars each) |
| albumId | UUID | No | Album to associate image with |

**Constraints:**
- Max file size: 10MB (AC-13)
- Allowed types: image/jpeg, image/png, image/webp (AC-14)
- Processing: Sharp resize to 2048px max width, WebP format, 80% quality (AC-5)
- Thumbnail: 400px width, WebP format (AC-5)
- OpenSearch indexing: Non-blocking, best-effort (AC-6, AC-19)

**Response (201 Created):**
```json
{
  "id": "uuid",
  "userId": "string",
  "title": "string",
  "description": "string | null",
  "tags": "string[]",
  "imageUrl": "string (S3 URL of main image)",
  "thumbnailUrl": "string (S3 URL of thumbnail)",
  "albumId": "uuid | null",
  "flagged": "boolean",
  "createdAt": "ISO 8601 timestamp",
  "lastUpdatedAt": "ISO 8601 timestamp"
}
```

**Error Responses:**
| Status | Error Code | Condition |
|--------|------------|-----------|
| 400 | Bad Request | No file uploaded, invalid multipart, album not found |
| 400 | VALIDATION_ERROR | Missing title, file too large (>10MB), invalid file type |
| 400 | FILE_ERROR | Image/thumbnail processing failed |
| 401 | Unauthorized | No/invalid authentication |
| 403 | Forbidden | Album belongs to another user |

**Handler:** `apps/api/platforms/vercel/api/gallery/images/upload.ts`

**Notes:**
- S3 paths: `images/{userId}/{imageId}.webp` and `images/{userId}/thumbnails/{imageId}.webp`
- OpenSearch index: `gallery_images`
- OpenSearch failures do not fail the upload (AC-19)

---

# HTTP Test Request Inventory

## Sets Presign (JSON)

| Request Name | Test ID | Purpose | Expected Status |
|--------------|---------|---------|-----------------|
| presignSetImage | HP-PRESIGN-001 | Generate presigned URL for User A's set | 200 |
| presignSetImage403 | ERR-PERM-001 | Attempt presign for User B's set | 403 |
| presignSetImage404 | ERR-404-001 | Attempt presign for non-existent set | 404 |
| presignSetImage400InvalidUUID | ERR-VAL-001 | Invalid UUID format | 400 |
| presignSetImage400MissingBody | ERR-VAL-002 | Missing request body | 400 |
| presignSetImage400MissingFilename | ERR-VAL-004 | Missing filename field | 400 |
| presignSetImage400MissingContentType | ERR-VAL-005 | Missing contentType field | 400 |

## Sets Register (JSON)

| Request Name | Test ID | Purpose | Expected Status |
|--------------|---------|---------|-----------------|
| registerSetImage | HP-REGISTER-001 | Register image for User A's set | 201 |
| registerSetImage403 | ERR-PERM-001 | Attempt register for User B's set | 403 |
| registerSetImage404 | ERR-404-001 | Attempt register for non-existent set | 404 |
| registerSetImage400InvalidURL | ERR-VAL-006 | Invalid imageUrl format | 400 |
| registerSetImage400MissingKey | N/A | Missing S3 key | 400 |

## Sets Delete (JSON)

| Request Name | Test ID | Purpose | Expected Status |
|--------------|---------|---------|-----------------|
| deleteSetImage | HP-DELETE-001 | Delete seeded image | 204 |
| deleteSetImage404Image | ERR-404-002 | Delete non-existent image | 404 |
| deleteSetImage404Set | ERR-404-001 | Delete from non-existent set | 404 |
| deleteSetImage403 | ERR-PERM-001 | Delete from User B's set | 403 |
| deleteSetImage400InvalidSetUUID | ERR-VAL-001 | Invalid set UUID | 400 |
| deleteSetImage400InvalidImageUUID | ERR-VAL-001 | Invalid image UUID | 400 |

## Wishlist Upload (curl commands - multipart)

| Test ID | Purpose | Expected Status |
|---------|---------|-----------------|
| HP-WISHLIST-001 | Successful image upload | 200 |
| ERR-PERM-002 | Upload to User B's item | 403 |
| ERR-404-003 | Upload to non-existent item | 404 |
| ERR-VAL-007 | No file in form | 400 |
| ERR-VAL-008 | Invalid file type (PDF) | 400 |
| ERR-VAL-009 | File > 5MB | 400 |

## Gallery Upload (curl commands - multipart)

| Test ID | Purpose | Expected Status |
|---------|---------|-----------------|
| HP-GALLERY-001 | Successful upload (all fields) | 201 |
| HP-GALLERY-002 | Minimal upload (file + title) | 201 |
| N/A | Upload with valid albumId | 201 |
| ERR-VAL-011 | Missing title | 400 |
| ERR-VAL-008 | Invalid file type (PDF) | 400 |
| ERR-VAL-010 | File > 10MB | 400 |
| N/A | Upload with non-existent albumId | 400 |

---

# Executed HTTP Evidence

## Note on Evidence

This story was developed and tested locally using:
1. VS Code REST Client for `.http` requests (JSON endpoints)
2. curl commands for multipart upload endpoints
3. `AUTH_BYPASS=true` mode for authentication bypass during development

### Prerequisites for Local Testing

```bash
# Start PostgreSQL
docker-compose up -d

# Seed test data
pnpm seed

# Start Vercel dev server with auth bypass
AUTH_BYPASS=true DEV_USER_SUB=dev-user-00000000-0000-0000-0000-000000000001 vercel dev
```

### Seed Data UUIDs (from `seeds/story-009.ts`)

| Entity | UUID |
|--------|------|
| User A | dev-user-00000000-0000-0000-0000-000000000001 |
| User B | dev-user-00000000-0000-0000-0000-000000000002 |
| Set (User A) | 00000009-0000-0000-0000-000000000001 |
| Set (User B) | 00000009-0000-0000-0000-000000000002 |
| Set Image 1 | 00000009-0000-0000-0000-000000000011 |
| Set Image 2 | 00000009-0000-0000-0000-000000000012 |
| Wishlist (User A) | 00000009-0000-0000-0000-000000000021 |
| Wishlist (User B) | 00000009-0000-0000-0000-000000000022 |
| Gallery Album (User A) | 00000009-0000-0000-0000-000000000031 |

---

# vercel.json Configuration

## Route Rewrites (AC-25)

```json
{ "source": "/api/sets/:id/images/presign", "destination": "/api/sets/[id]/images/presign.ts" }
{ "source": "/api/sets/:id/images/:imageId", "destination": "/api/sets/[id]/images/[imageId].ts" }
{ "source": "/api/sets/:id/images", "destination": "/api/sets/[id]/images/index.ts" }
{ "source": "/api/wishlist/:id/image", "destination": "/api/wishlist/[id]/image.ts" }
{ "source": "/api/gallery/images/upload", "destination": "/api/gallery/images/upload.ts" }
```

## Function Configuration (AC-21)

| Function | maxDuration |
|----------|-------------|
| api/sets/[id]/images/presign.ts | 10s |
| api/sets/[id]/images/index.ts | 10s |
| api/sets/[id]/images/[imageId].ts | 10s |
| api/wishlist/[id]/image.ts | 30s |
| api/gallery/images/upload.ts | 30s |

---

# Environment Variables Required

| Variable | Used By | Required |
|----------|---------|----------|
| DATABASE_URL | All endpoints | Yes |
| AWS_REGION | All S3 operations | Yes |
| AWS_ACCESS_KEY_ID | All S3 operations | Yes |
| AWS_SECRET_ACCESS_KEY | All S3 operations | Yes |
| SETS_BUCKET | Sets endpoints | Yes |
| WISHLIST_BUCKET | Wishlist endpoint | Yes |
| GALLERY_BUCKET | Gallery endpoint | Yes |
| OPENSEARCH_ENDPOINT | Gallery upload | No (best-effort) |
| AUTH_BYPASS | Local dev only | No |
| DEV_USER_SUB | Local dev only | No |

---

# Notes

1. **No Swagger/OpenAPI**: This project documents APIs via `.http` files and inline handler documentation rather than OpenAPI specs.

2. **Multipart Limitation**: The `.http` file format does not support binary file uploads. Multipart endpoint tests are documented as curl commands within the `.http` file.

3. **Auth Bypass Pattern**: All endpoints use the `getAuthUserId()` inline helper which respects `AUTH_BYPASS=true` for local development testing.

4. **Best-Effort Patterns**:
   - S3 cleanup on delete (AC-18): Failures logged, request succeeds
   - OpenSearch indexing (AC-19): Failures logged, upload succeeds

5. **Package Created**: `@repo/vercel-multipart` provides Vercel-native multipart parsing using Busboy, with 10 unit tests passing.

---

*Generated: 2026-01-20*
*Story: STORY-009 - Image Uploads Phase 1*
