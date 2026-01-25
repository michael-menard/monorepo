# STORY-007 Contracts Documentation

---

## Swagger/OpenAPI Updates

### File(s) Reviewed

| File | Status |
|------|--------|
| `apps/api/__docs__/swagger.yaml` | **No update required** |
| `openapi.yaml` (root) | **No update required** |

### Summary

The existing OpenAPI specifications document the **AWS Lambda** API surface (the legacy system being migrated from). STORY-007 implements **Vercel serverless endpoints** at a different path structure (`/api/gallery/images/*`). These specifications:

1. **`apps/api/__docs__/swagger.yaml`**: Documents the original AWS Lambda API with paths like `/api/images`, `/api/albums`, `/api/gallery`, `/api/flag`. This is the legacy specification for the AWS deployment.

2. **`openapi.yaml`**: Documents the Sets Gallery API (`/api/sets/list`) which is a separate feature from the gallery images.

### Decision

Per the Vercel migration strategy, the new Vercel endpoints are documented via:
- `.http` contract test files (primary contract documentation)
- Inline Zod schemas in the core package (runtime type safety)

The AWS Lambda swagger files remain unchanged as they document the legacy system. A consolidated OpenAPI specification for Vercel endpoints is **deferred** to a future story when the migration is complete.

### Notes About Versioning or Breaking Changes

- No breaking changes to existing AWS Lambda API
- Vercel endpoints are additive (new deployment target)
- API contract is identical between AWS and Vercel handlers

---

## HTTP Files

### Added/Updated .http File Paths

| File Path | Status | Story |
|-----------|--------|-------|
| `__http__/gallery.http` | **UPDATED** | STORY-007 |

### Request Inventory

The following 20 HTTP requests were added for STORY-007 gallery images API:

#### GET Image Operations (4 requests)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `getGalleryImage` | GET | `/api/gallery/images/11111111-1111-1111-1111-111111111111` | Happy path - get existing image by ID | 200 |
| `getGalleryImage404` | GET | `/api/gallery/images/99999999-9999-9999-9999-999999999999` | Error case - non-existent image | 404 |
| `getGalleryImage403` | GET | `/api/gallery/images/55555555-5555-5555-5555-555555555555` | Error case - other user's image | 403 |
| `getGalleryImage400` | GET | `/api/gallery/images/not-a-uuid` | Error case - invalid UUID format | 400 |

#### LIST Images Operations (5 requests)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `listGalleryImages` | GET | `/api/gallery/images` | Happy path - list standalone images | 200 |
| `listGalleryImagesWithAlbum` | GET | `/api/gallery/images?albumId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Happy path - filter by album | 200 |
| `listGalleryImagesPagination` | GET | `/api/gallery/images?page=1&limit=5` | Happy path - custom pagination | 200 |
| `listGalleryImagesEmpty` | GET | `/api/gallery/images?page=999` | Edge case - page beyond total | 200 |
| `listGalleryImagesInvalidAlbum` | GET | `/api/gallery/images?albumId=not-a-uuid` | Error case - invalid albumId | 400 |

#### SEARCH Images Operations (6 requests)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `searchGalleryImages` | GET | `/api/gallery/images/search?search=medieval` | Happy path - search matching term | 200 |
| `searchGalleryImagesCastle` | GET | `/api/gallery/images/search?search=castle` | Happy path - search for castle | 200 |
| `searchGalleryImagesNoMatch` | GET | `/api/gallery/images/search?search=xyznonexistent` | Edge case - no results | 200 |
| `searchGalleryImagesPagination` | GET | `/api/gallery/images/search?search=castle&page=1&limit=5` | Happy path - search with pagination | 200 |
| `searchGalleryImagesMissing` | GET | `/api/gallery/images/search` | Error case - missing search param | 400 |
| `searchGalleryImagesEmpty` | GET | `/api/gallery/images/search?search=` | Error case - empty search param | 400 |

#### FLAG Image Operations (5 requests)

| Request Name | Method | Path | Purpose | Expected Status |
|--------------|--------|------|---------|-----------------|
| `flagGalleryImage` | POST | `/api/gallery/images/flag` | Happy path - flag with reason | 201 |
| `flagGalleryImageNoReason` | POST | `/api/gallery/images/flag` | Happy path - flag without reason | 201 |
| `flagGalleryImageConflict` | POST | `/api/gallery/images/flag` | Error case - already flagged | 409 |
| `flagGalleryImage400` | POST | `/api/gallery/images/flag` | Error case - invalid imageId | 400 |
| `flagGalleryImage404` | POST | `/api/gallery/images/flag` | Error case - non-existent image | 404 |

---

## API Contract Specifications

### Endpoint 1: GET /api/gallery/images/:id

**Purpose**: Retrieve a single gallery image by ID

**Request**:
```
GET /api/gallery/images/{id}
```

**Path Parameters**:
| Parameter | Type | Required | Validation |
|-----------|------|----------|------------|
| `id` | string | Yes | Must be valid UUID v4 |

**Response Schema (200)**:
```typescript
{
  id: string           // UUID
  userId: string       // Owner's user ID
  albumId: string | null
  title: string
  description: string | null
  imageUrl: string     // Full-size image URL
  thumbnailUrl: string | null
  tags: string[]
  createdAt: string    // ISO 8601 datetime
  updatedAt: string    // ISO 8601 datetime
}
```

**Error Responses**:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | Invalid UUID format |
| 401 | UNAUTHORIZED | Missing authentication (when AUTH_BYPASS disabled) |
| 403 | FORBIDDEN | Image belongs to different user |
| 404 | NOT_FOUND | Image ID does not exist |

---

### Endpoint 2: GET /api/gallery/images

**Purpose**: List gallery images with pagination and optional album filter

**Request**:
```
GET /api/gallery/images?page=1&limit=20&albumId={albumId}
```

**Query Parameters**:
| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| `page` | integer | No | 1 | Must be >= 1 |
| `limit` | integer | No | 20 | Must be 1-100 |
| `albumId` | string | No | null | Must be valid UUID if provided |

**Behavior**:
- When `albumId` is provided: Returns images in that album
- When `albumId` is omitted: Returns standalone images (albumId IS NULL)
- Results sorted by `createdAt` DESC

**Response Schema (200)**:
```typescript
{
  data: Array<{
    id: string
    userId: string
    albumId: string | null
    title: string
    description: string | null
    imageUrl: string
    thumbnailUrl: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
  }>
  page: number
  limit: number
  total: number
  totalPages: number
}
```

**Error Responses**:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | Invalid albumId format or pagination params |
| 401 | UNAUTHORIZED | Missing authentication |

---

### Endpoint 3: GET /api/gallery/images/search

**Purpose**: Search gallery images by title, description, and tags

**Request**:
```
GET /api/gallery/images/search?search={term}&page=1&limit=20
```

**Query Parameters**:
| Parameter | Type | Required | Default | Validation |
|-----------|------|----------|---------|------------|
| `search` | string | **Yes** | - | Must be non-empty |
| `page` | integer | No | 1 | Must be >= 1 |
| `limit` | integer | No | 20 | Must be 1-100 |

**Behavior**:
- Searches across `title`, `description`, and `tags` fields
- Uses PostgreSQL ILIKE for case-insensitive partial matching
- Returns empty array (not error) when no matches found
- Only searches current user's images

**Response Schema (200)**:
```typescript
{
  data: Array<{
    id: string
    userId: string
    albumId: string | null
    title: string
    description: string | null
    imageUrl: string
    thumbnailUrl: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
  }>
  page: number
  limit: number
  total: number
  totalPages: number
}
```

**Error Responses**:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | Missing or empty search param |
| 401 | UNAUTHORIZED | Missing authentication |

---

### Endpoint 4: POST /api/gallery/images/flag

**Purpose**: Flag an image for moderation review

**Request**:
```
POST /api/gallery/images/flag
Content-Type: application/json

{
  "imageId": "uuid",
  "reason": "optional string"
}
```

**Request Body**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `imageId` | string | **Yes** | Must be valid UUID |
| `reason` | string | No | Optional moderation reason |

**Response Schema (201)**:
```typescript
{
  id: string           // Flag record UUID
  imageId: string
  userId: string       // User who flagged
  reason: string | null
  createdAt: string    // ISO 8601 datetime
}
```

**Error Responses**:
| Status | Code | Condition |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | Invalid imageId format |
| 401 | UNAUTHORIZED | Missing authentication |
| 404 | NOT_FOUND | Image ID does not exist |
| 409 | CONFLICT | User has already flagged this image |

---

## Executed HTTP Evidence

**Status**: NOT EXECUTED

HTTP requests have not been executed because the local development server is not running. The `.http` file contracts are documented and ready for execution during QA verification phase.

**To execute manually**:
1. Start the local server: `pnpm dev` (from apps/api/platforms/vercel)
2. Ensure database is seeded: `pnpm seed`
3. Execute requests via VS Code REST Client extension or equivalent

---

## Vercel Configuration

The following routes were added to `apps/api/platforms/vercel/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/gallery/images/search", "destination": "/api/gallery/images/search" },
    { "source": "/api/gallery/images/flag", "destination": "/api/gallery/images/flag" },
    { "source": "/api/gallery/images/:id", "destination": "/api/gallery/images/[id]" },
    { "source": "/api/gallery/images", "destination": "/api/gallery/images/index" }
  ]
}
```

**Route Order Note**: Specific routes (`/search`, `/flag`) are listed before the parameterized route (`/:id`) to ensure correct matching.

---

## Notes

### Discrepancies

No discrepancies found between:
- Story requirements (STORY-007.md)
- Implementation (handlers + core functions)
- HTTP contract tests (gallery.http)

### Seed Data Alignment

The `.http` file uses deterministic UUIDs that match the seed data in `apps/api/core/database/seeds/gallery.ts`:

| UUID Pattern | Entity | Purpose |
|--------------|--------|---------|
| `11111111-...-111111111111` | Castle Tower Photo | Happy path GET |
| `22222222-...-222222222222` | Space Station Build | Album filter test |
| `33333333-...-333333333333` | Medieval Knight | Search test |
| `44444444-...-444444444444` | Already Flagged | 409 conflict test |
| `55555555-...-555555555555` | Private Image | 403 forbidden test |
| `aaaaaaaa-...-aaaaaaaaaaaa` | Space Collection album | Album filter test |

### Type Safety

All request/response types are defined as Zod schemas in `packages/backend/gallery-core/src/__types__/index.ts`:

- `ListImagesFiltersSchema` - pagination + albumId filter
- `SearchImagesFiltersSchema` - pagination + search term
- `FlagImageInputSchema` - imageId + optional reason
- `ImageListResponseSchema` - paginated image list response
- `FlagResultSchema` - flag creation response

---

## Contract Verification Checklist

| Item | Status |
|------|--------|
| Swagger files reviewed | Done |
| HTTP file updated with all requests | Done |
| All 4 endpoints documented | Done |
| Happy path requests added | Done |
| Error case requests added (400, 403, 404, 409) | Done |
| Seed data aligned with test UUIDs | Done |
| Vercel routes configured | Done |
| No blocking discrepancies | Done |

---

**Generated**: 2026-01-19
**Story**: STORY-007 - Gallery Images Read
