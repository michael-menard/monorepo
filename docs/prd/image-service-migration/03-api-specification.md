# Image Service Migration - API Specification

**Document:** 03-api-specification.md
**Version:** 1.0

---

## API Overview

**Base URL:** `https://images.lego-api.com`
**Protocol:** HTTPS only (TLS 1.2+)
**Authentication:** JWT Bearer token (AWS Cognito)
**Content Type:** `application/json` (except uploads: `multipart/form-data`)

---

## Authentication

All endpoints require JWT authentication via `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JWT Claims:**

- `sub` - User ID (used for ownership verification)
- `exp` - Token expiration
- `aud` - Client ID

**Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

---

## Endpoints

### 1. Upload Image

**Endpoint:** `POST /images`
**Purpose:** Upload and process new image

**Request Headers:**

```http
POST /images HTTP/1.1
Host: images.lego-api.com
Authorization: Bearer <token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
```

**Request Body (multipart/form-data):**

```typescript
interface UploadImageRequest {
  file: File // Required: Image file
  albumId?: string // Optional: Album association
  title?: string // Optional: Image title
  description?: string // Optional: Image description
  altText?: string // Optional: Accessibility text
  tags?: string[] // Optional: Search tags
}
```

**Example cURL:**

```bash
curl -X POST https://images.lego-api.com/images \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "albumId=album-123" \
  -F "title=My LEGO Castle" \
  -F "tags[]=castle" \
  -F "tags[]=medieval"
```

**Response (201 Created):**

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "userId": "user-456",
  "albumId": "album-123",
  "originalFilename": "IMG_1234.jpg",
  "mimeType": "image/webp",
  "fileSize": 524288,
  "processedSize": 245760,
  "width": 1920,
  "height": 1080,
  "aspectRatio": 1.778,
  "s3Key": "images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "s3Bucket": "images-lego-moc-prod",
  "thumbnailKey": "images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "imageUrl": "https://d123xyz.cloudfront.net/images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "thumbnailUrl": "https://d123xyz.cloudfront.net/images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "processingStatus": "completed",
  "format": "webp",
  "quality": 85,
  "title": "My LEGO Castle",
  "tags": ["castle", "medieval"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "uploadedAt": "2025-01-15T10:30:00Z",
  "version": 1
}
```

**Error Responses:**

**400 Bad Request - Invalid file type:**

```json
{
  "error": "ValidationError",
  "message": "Only JPEG, PNG, and WebP images are supported",
  "code": "INVALID_FILE_TYPE"
}
```

**413 Payload Too Large:**

```json
{
  "error": "PayloadTooLarge",
  "message": "File size exceeds 10MB limit",
  "code": "FILE_TOO_LARGE"
}
```

**500 Internal Server Error:**

```json
{
  "error": "ProcessingError",
  "message": "Failed to process image",
  "code": "IMAGE_PROCESSING_FAILED"
}
```

**Validation Rules:**

- **File size:** 10 MB max
- **File types:** JPEG, PNG, WebP
- **Dimensions:** Min 100x100px, Max 8000x8000px
- **Magic number validation:** Verify actual file type (not just extension)

---

### 2. Get Image by ID

**Endpoint:** `GET /images/:id`
**Purpose:** Retrieve single image metadata

**Request:**

```http
GET /images/01ARZ3NDEKTSV4RRFFQ69G5FAV HTTP/1.1
Host: images.lego-api.com
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "userId": "user-456",
  "albumId": "album-123",
  "originalFilename": "IMG_1234.jpg",
  "mimeType": "image/webp",
  "fileSize": 524288,
  "processedSize": 245760,
  "width": 1920,
  "height": 1080,
  "aspectRatio": 1.778,
  "s3Key": "images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "thumbnailKey": "images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "imageUrl": "https://d123xyz.cloudfront.net/images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "thumbnailUrl": "https://d123xyz.cloudfront.net/images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
  "processingStatus": "completed",
  "format": "webp",
  "quality": 85,
  "title": "My LEGO Castle",
  "description": "A medieval castle built with 5000+ pieces",
  "altText": "LEGO castle with towers and drawbridge",
  "tags": ["castle", "medieval"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "uploadedAt": "2025-01-15T10:30:00Z",
  "version": 1
}
```

**Error Responses:**

**404 Not Found:**

```json
{
  "error": "NotFound",
  "message": "Image not found",
  "code": "IMAGE_NOT_FOUND"
}
```

**403 Forbidden (not owner):**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this image",
  "code": "NOT_AUTHORIZED"
}
```

---

### 3. List User Images

**Endpoint:** `GET /images`
**Purpose:** List user's images with pagination and filters

**Request:**

```http
GET /images?limit=20&cursor=eyJQSyI6IklNQUdFIzAxQVJaM05ERUtUU1Y0UlJGRlE2OUc1RkFWIiwiU0siOiJNRVRBREFUQSJ9 HTTP/1.1
Host: images.lego-api.com
Authorization: Bearer <token>
```

**Query Parameters:**

```typescript
interface ListImagesQuery {
  limit?: number // Optional: Page size (default: 20, max: 100)
  cursor?: string // Optional: Pagination cursor (base64-encoded LastEvaluatedKey)
  albumId?: string // Optional: Filter by album
  sortOrder?: 'asc' | 'desc' // Optional: Sort order (default: 'desc')
}
```

**Response (200 OK):**

```json
{
  "images": [
    {
      "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "userId": "user-456",
      "thumbnailUrl": "https://d123xyz.cloudfront.net/images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
      "imageUrl": "https://d123xyz.cloudfront.net/images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAV.webp",
      "title": "My LEGO Castle",
      "width": 1920,
      "height": 1080,
      "tags": ["castle", "medieval"],
      "uploadedAt": "2025-01-15T10:30:00Z"
    },
    {
      "id": "01ARZ3NDEKTSV4RRFFQ69G5FAA",
      "userId": "user-456",
      "thumbnailUrl": "https://d123xyz.cloudfront.net/images/user-456/thumbnails/01ARZ3NDEKTSV4RRFFQ69G5FAA.webp",
      "imageUrl": "https://d123xyz.cloudfront.net/images/user-456/01ARZ3NDEKTSV4RRFFQ69G5FAA.webp",
      "title": "Pirate Ship",
      "width": 2560,
      "height": 1440,
      "tags": ["pirates", "ship"],
      "uploadedAt": "2025-01-14T15:20:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "eyJQSyI6IklNQUdFIzAxQVJaM05ERUtUU1Y0UlJGRlE2OUc1RkFBIiwiU0siOiJNRVRBREFUQSJ9"
  },
  "totalCount": 142
}
```

**Error Responses:**

**400 Bad Request - Invalid cursor:**

```json
{
  "error": "ValidationError",
  "message": "Invalid pagination cursor",
  "code": "INVALID_CURSOR"
}
```

---

### 4. Update Image Metadata

**Endpoint:** `PATCH /images/:id`
**Purpose:** Update image title, description, tags, etc.

**Request:**

```http
PATCH /images/01ARZ3NDEKTSV4RRFFQ69G5FAV HTTP/1.1
Host: images.lego-api.com
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "New description",
  "tags": ["castle", "medieval", "knights"],
  "version": 1
}
```

**Request Body:**

```typescript
interface UpdateImageRequest {
  title?: string // Optional: Update title
  description?: string // Optional: Update description
  altText?: string // Optional: Update alt text
  tags?: string[] // Optional: Update tags (replaces existing)
  version: number // Required: Optimistic locking version
}
```

**Response (200 OK):**

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "userId": "user-456",
  "title": "Updated Title",
  "description": "New description",
  "tags": ["castle", "medieval", "knights"],
  "updatedAt": "2025-01-15T11:00:00Z",
  "version": 2
}
```

**Error Responses:**

**409 Conflict - Version mismatch:**

```json
{
  "error": "ConflictError",
  "message": "Image has been modified by another request",
  "code": "VERSION_MISMATCH",
  "currentVersion": 2
}
```

**403 Forbidden:**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to update this image",
  "code": "NOT_AUTHORIZED"
}
```

---

### 5. Delete Image

**Endpoint:** `DELETE /images/:id`
**Purpose:** Delete image and all associated files

**Request:**

```http
DELETE /images/01ARZ3NDEKTSV4RRFFQ69G5FAV HTTP/1.1
Host: images.lego-api.com
Authorization: Bearer <token>
```

**Response (204 No Content):**

```http
HTTP/1.1 204 No Content
```

**Error Responses:**

**404 Not Found:**

```json
{
  "error": "NotFound",
  "message": "Image not found",
  "code": "IMAGE_NOT_FOUND"
}
```

**403 Forbidden:**

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to delete this image",
  "code": "NOT_AUTHORIZED"
}
```

**500 Internal Server Error - S3 deletion failed:**

```json
{
  "error": "DeletionError",
  "message": "Failed to delete image files from storage",
  "code": "S3_DELETE_FAILED"
}
```

---

## Error Response Format

All errors follow consistent structure:

```typescript
interface ErrorResponse {
  error: string // Error type (e.g., "ValidationError")
  message: string // Human-readable message
  code: string // Machine-readable code (e.g., "INVALID_FILE_TYPE")
  details?: any // Optional: Additional context
  requestId?: string // Optional: AWS request ID for debugging
}
```

---

## HTTP Status Codes

| Status Code                   | Meaning                   | Use Case                   |
| ----------------------------- | ------------------------- | -------------------------- |
| **200 OK**                    | Success                   | GET, PATCH requests        |
| **201 Created**               | Resource created          | POST /images               |
| **204 No Content**            | Success, no response body | DELETE requests            |
| **400 Bad Request**           | Invalid input             | Validation errors          |
| **401 Unauthorized**          | Missing/invalid token     | Authentication failure     |
| **403 Forbidden**             | Not authorized            | Ownership check failed     |
| **404 Not Found**             | Resource not found        | Image doesn't exist        |
| **409 Conflict**              | Version mismatch          | Optimistic locking failure |
| **413 Payload Too Large**     | File too big              | Image >10MB                |
| **429 Too Many Requests**     | Rate limit exceeded       | >1000 req/sec              |
| **500 Internal Server Error** | Server error              | Unexpected failures        |
| **503 Service Unavailable**   | Temporary outage          | DynamoDB throttling        |

---

## Rate Limiting

**Per-user limits:**

- **Uploads:** 10 requests/minute, 100 requests/hour
- **Reads:** 1000 requests/second (API Gateway limit)
- **Deletes:** 50 requests/minute

**Rate limit headers:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642248000
```

**Error Response (429 Too Many Requests):**

```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Retry after 60 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## CORS Configuration

**Allowed Origins:**

- `https://lego-moc.com`
- `https://*.lego-moc.com` (subdomains)
- `http://localhost:3002` (development only)

**Allowed Methods:**

```http
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
```

**Allowed Headers:**

```http
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With
```

**Max Age:**

```http
Access-Control-Max-Age: 86400
```

---

## API Versioning

**Strategy:** URL path versioning (future-proof)

**Current Version:** v1 (implicit, no version in URL yet)

**Future Migration:**

- When breaking changes needed, introduce `v2`:
  - `https://images.lego-api.com/v2/images`
- Keep `v1` available for 12 months after `v2` launch

---

## Request/Response Examples

### Example 1: Upload Image with Fetch API

```typescript
const uploadImage = async (file: File, albumId?: string) => {
  const formData = new FormData()
  formData.append('file', file)
  if (albumId) {
    formData.append('albumId', albumId)
  }
  formData.append('title', 'My LEGO MOC')
  formData.append('tags', JSON.stringify(['castle', 'medieval']))

  const response = await fetch('https://images.lego-api.com/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return response.json()
}
```

---

### Example 2: List Images with Pagination

```typescript
const listImages = async (cursor?: string) => {
  const params = new URLSearchParams({
    limit: '20',
    ...(cursor && { cursor }),
  })

  const response = await fetch(`https://images.lego-api.com/images?${params}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })

  return response.json()
}
```

---

### Example 3: Update Image with Optimistic Locking

```typescript
const updateImage = async (imageId: string, updates: Partial<Image>) => {
  // 1. Fetch current version
  const current = await fetch(`https://images.lego-api.com/images/${imageId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(r => r.json())

  // 2. Update with version
  const response = await fetch(`https://images.lego-api.com/images/${imageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...updates,
      version: current.version, // Optimistic locking
    }),
  })

  if (response.status === 409) {
    // Version conflict - retry with fresh version
    return updateImage(imageId, updates)
  }

  return response.json()
}
```

---

### Example 4: Delete Image

```typescript
const deleteImage = async (imageId: string) => {
  const response = await fetch(`https://images.lego-api.com/images/${imageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return true // 204 No Content
}
```

---

## Testing Endpoints

### Health Check (No Auth Required)

**Endpoint:** `GET /health`

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "dynamodb": "up",
    "s3": "up",
    "cloudfront": "up",
    "redis": "up"
  }
}
```

---

### Metrics Endpoint (No Auth Required)

**Endpoint:** `GET /metrics`

**Response (200 OK):**

```json
{
  "totalImages": 145678,
  "imagesUploadedToday": 234,
  "totalStorageUsed": "45.6 GB",
  "averageUploadLatency": "847ms",
  "cacheHitRate": 0.87
}
```

---

## OpenAPI Specification

Full OpenAPI 3.0 spec available at:
`https://images.lego-api.com/api-docs`

**Swagger UI:**
`https://images.lego-api.com/swagger`

---

## SDK Support

**Official SDKs:**

- TypeScript/JavaScript (planned)
- Python (future)

**Community SDKs:**

- None yet

---

## Migration Path from Main API

### Current Main API Endpoint

```http
POST /api/images HTTP/1.1
Host: api.lego-moc.com
```

### New Image Service Endpoint

```http
POST /images HTTP/1.1
Host: images.lego-api.com
```

**Migration Strategy:**

1. **Phase 1:** Dual-write to both APIs
2. **Phase 2:** Migrate reads to new API
3. **Phase 3:** Deprecate old endpoint (12 months)
4. **Phase 4:** Remove old endpoint

---

## Next Steps

1. Review [04-infrastructure.md](04-infrastructure.md) - SST configuration
2. Review [05-migration-strategy.md](05-migration-strategy.md) - API migration plan
3. Review [07-security.md](07-security.md) - Security requirements

---

[← Back to Data Model](02-data-model.md) | [Next: Infrastructure →](04-infrastructure.md)
