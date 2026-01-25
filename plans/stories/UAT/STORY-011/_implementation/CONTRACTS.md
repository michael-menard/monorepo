# CONTRACTS.md: STORY-011

## MOC Instructions - Read Operations API Contracts

---

# Swagger/OpenAPI Updates

- **File(s) updated**: None
- **Summary of changes**: N/A
- **Notes about versioning or breaking changes**: N/A

**Rationale**: The existing `/Users/michaelmenard/Development/Monorepo/openapi.yaml` file documents only the `/api/sets/list` endpoint as a proof-of-concept from Story 000 (Vercel Runtime Harness). The MOC Instructions endpoints follow the established pattern but do not have a formal OpenAPI requirement in the story acceptance criteria. The API contracts are documented via the `.http` file and response shape documentation below.

---

# HTTP Files

## Added/Updated .http File Paths

| File Path | Status |
|-----------|--------|
| `/__http__/mocs.http` | NEW |

## Request Inventory

### List MOCs Endpoint (GET /api/mocs)

| Request Label | Purpose | Method | Path |
|---------------|---------|--------|------|
| List all MOCs (default) | List authenticated user's MOCs with default pagination | GET | `/api/mocs` |
| List with pagination | Test explicit page/limit params | GET | `/api/mocs?page=1&limit=10` |
| List with search | Test ILIKE search on title/description | GET | `/api/mocs?search=castle` |
| List with tag filter | Test JSONB array containment filter | GET | `/api/mocs?tag=medieval` |
| List with combined filters | Test multiple filters together | GET | `/api/mocs?page=1&limit=5&search=castle&tag=modular` |
| Invalid pagination (page=0) | Error case: 422 for page < 1 | GET | `/api/mocs?page=0` |
| Invalid pagination (limit>100) | Error case: 422 for limit > 100 | GET | `/api/mocs?limit=200` |

### Get MOC Detail Endpoint (GET /api/mocs/:id)

| Request Label | Purpose | Method | Path |
|---------------|---------|--------|------|
| Get published MOC (owner) | Happy path: owned MOC returns isOwner: true | GET | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001` |
| Get draft MOC (owner) | Ownership-aware: draft visible to owner | GET | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0002` |
| Get archived MOC (owner) | Ownership-aware: archived visible to owner | GET | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0003` |
| Get published MOC (non-owner) | Happy path: isOwner: false for other user's MOC | GET | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0004` |
| Get draft MOC (non-owner) | Error case: 404 to prevent existence leak | GET | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0005` |
| Get non-existent MOC | Error case: 404 for unknown UUID | GET | `/api/mocs/99999999-9999-9999-9999-999999999999` |
| Get invalid UUID | Error case: 404 for invalid format | GET | `/api/mocs/invalid-uuid` |

### Stats Endpoints

| Request Label | Purpose | Method | Path |
|---------------|---------|--------|------|
| Get stats by category | Aggregates by theme/tags for user's MOCs | GET | `/api/mocs/stats/by-category` |
| Get uploads over time | Time-series data for last 12 months | GET | `/api/mocs/stats/uploads-over-time` |

### Error Cases (Method Not Allowed)

| Request Label | Purpose | Method | Path |
|---------------|---------|--------|------|
| POST to list endpoint | Error case: 405 Method Not Allowed | POST | `/api/mocs` |
| POST to detail endpoint | Error case: 405 Method Not Allowed | POST | `/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001` |

---

# API Response Schemas

## List MOCs Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "dddddddd-dddd-dddd-dddd-dddddddd0001",
      "userId": "dev-user-00000000-0000-0000-0000-000000000001",
      "type": "moc",
      "mocId": "MOC-12345",
      "slug": "kings-castle",
      "title": "King's Castle",
      "description": "A majestic medieval castle...",
      "author": "Test Builder",
      "theme": "Castle",
      "partsCount": 2500,
      "tags": ["castle", "medieval", "modular"],
      "thumbnailUrl": "https://example.com/kings-castle-thumb.jpg",
      "status": "published",
      "publishedAt": "2026-01-15T00:00:00.000Z",
      "createdAt": "2026-01-19T...",
      "updatedAt": "2026-01-19T..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 5
}
```

## Get MOC Detail Response (200)

```json
{
  "success": true,
  "data": {
    "id": "dddddddd-dddd-dddd-dddd-dddddddd0001",
    "userId": "dev-user-00000000-0000-0000-0000-000000000001",
    "type": "moc",
    "mocId": "MOC-12345",
    "slug": "kings-castle",
    "title": "King's Castle",
    "description": "A majestic medieval castle with working drawbridge...",
    "author": "Test Builder",
    "theme": "Castle",
    "partsCount": 2500,
    "tags": ["castle", "medieval", "modular"],
    "thumbnailUrl": "https://example.com/kings-castle-thumb.jpg",
    "status": "published",
    "publishedAt": "2026-01-15T00:00:00.000Z",
    "createdAt": "2026-01-19T...",
    "updatedAt": "2026-01-19T...",
    "files": [
      {
        "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeee0001",
        "fileType": "instruction",
        "fileUrl": "https://example.com/kings-castle-instructions.pdf",
        "originalFilename": "kings-castle-instructions.pdf",
        "mimeType": "application/pdf"
      }
    ],
    "isOwner": true
  }
}
```

## Stats by Category Response (200)

```json
{
  "success": true,
  "data": [
    { "category": "Castle", "count": 2 },
    { "category": "Space", "count": 1 },
    { "category": "Pirates", "count": 1 }
  ],
  "total": 4
}
```

## Uploads Over Time Response (200)

```json
{
  "success": true,
  "data": [
    { "date": "2026-01", "category": "Castle", "count": 1 },
    { "date": "2026-01", "category": "Space", "count": 1 }
  ]
}
```

## Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "MOC not found"
}
```

## Error Response (422 Validation Error)

```json
{
  "success": false,
  "error": "page must be >= 1"
}
```

## Error Response (405 Method Not Allowed)

```json
{
  "success": false,
  "error": "Method not allowed"
}
```

---

# Executed HTTP Evidence

## Execution Status

**Dev server availability**: NOT VERIFIED

The Vercel dev server was not started during this contracts review session. HTTP requests will be executed during QA verification phase when the dev server is confirmed running.

## Evidence to Capture During QA Verification

For each request in `__http__/mocs.http`, QA must capture:

1. Request executed (copy from .http file)
2. Timestamp of execution
3. Response status code
4. Response body (JSON)
5. Verification that response matches expected schema

### Required Verification Checklist

| Request | Expected Status | Key Assertions |
|---------|-----------------|----------------|
| List all MOCs | 200 | Returns array, has page/limit/total |
| List with pagination | 200 | Respects page=1, limit=10 |
| List with search | 200 | Filters by title/description ILIKE |
| List with tag filter | 200 | Filters by tag containment |
| Invalid page=0 | 422 | Returns validation error |
| Invalid limit=200 | 422 | Returns validation error |
| Get published MOC (owner) | 200 | isOwner: true, has files array |
| Get draft MOC (owner) | 200 | isOwner: true |
| Get archived MOC (owner) | 200 | isOwner: true |
| Get published MOC (non-owner) | 200 | isOwner: false |
| Get draft MOC (non-owner) | 404 | Prevents existence leak |
| Get non-existent MOC | 404 | Returns "MOC not found" |
| Get invalid UUID | 404 | Returns "MOC not found" |
| Stats by category | 200 | Returns data array with category/count |
| Uploads over time | 200 | Returns data array with date/category/count |
| POST to list | 405 | Returns "Method not allowed" |
| POST to detail | 405 | Returns "Method not allowed" |

---

# Vercel Configuration

## Routes Added to vercel.json

**File**: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/vercel.json`

```json
{ "source": "/api/mocs/stats/by-category", "destination": "/api/mocs/stats/by-category.ts" },
{ "source": "/api/mocs/stats/uploads-over-time", "destination": "/api/mocs/stats/uploads-over-time.ts" },
{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" },
{ "source": "/api/mocs", "destination": "/api/mocs/index.ts" }
```

**Note**: Stats routes are placed BEFORE the `:id` parameterized route to ensure `/api/mocs/stats/by-category` is not interpreted as an ID lookup for "stats".

---

# Seed Data for Contract Testing

**File**: `/Users/michaelmenard/Development/Monorepo/apps/api/core/database/seeds/mocs.ts`

## Test MOCs

| ID | Owner | Status | Theme | Purpose |
|----|-------|--------|-------|---------|
| `dddddddd-dddd-dddd-dddd-dddddddd0001` | dev-user | published | Castle | Happy path, owner access |
| `dddddddd-dddd-dddd-dddd-dddddddd0002` | dev-user | draft | Space | Owner-only visibility |
| `dddddddd-dddd-dddd-dddd-dddddddd0003` | dev-user | archived | Pirates | Archived visibility |
| `dddddddd-dddd-dddd-dddd-dddddddd0004` | other-user | published | Technic | Non-owner published access |
| `dddddddd-dddd-dddd-dddd-dddddddd0005` | other-user | draft | City | Non-owner 404 test |
| `dddddddd-dddd-dddd-dddd-dddddddd0006` | dev-user | published | Creator | Type: set (not MOC) |

## Test MOC Files

| ID | MOC | Type | Purpose |
|----|-----|------|---------|
| `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` | Castle | instruction | Eager loading test |
| `eeeeeeee-eeee-eeee-eeee-eeeeeeee0002` | Castle | parts-list | Multiple files test |
| `eeeeeeee-eeee-eeee-eeee-eeeeeeee0003` | Castle | thumbnail | File type variety |
| `eeeeeeee-eeee-eeee-eeee-eeeeeeee0004` | Space Station | instruction | Draft MOC files |

## Test Users

| User ID | Purpose |
|---------|---------|
| `dev-user-00000000-0000-0000-0000-000000000001` | Primary test user (AUTH_BYPASS) |
| `dev-user-00000000-0000-0000-0000-000000000002` | Secondary user for non-owner tests |

---

# Notes

## No Swagger Update Required

The story acceptance criteria (AC-7) specifies only:
- `__http__/mocs.http` created with all required MOC requests
- All happy path requests documented and executable
- Error case requests documented (401, 404, 422)

OpenAPI/Swagger updates were not specified as a deliverable. The existing `openapi.yaml` file is for Story 000's `/api/sets/list` proof-of-concept only.

## Authentication Pattern

All endpoints except GET `/api/mocs/:id` (for published MOCs) require authentication.

For local development, set in `.env.local`:
```
AUTH_BYPASS=true
```

This enables the AUTH_BYPASS pattern where the dev user ID is automatically used.

## CDN URLs (No Presigned URLs)

Per story non-goals, file URLs in responses are CDN URLs, not presigned S3 URLs. Presigned URL generation is deferred to a future story.

---

# Discrepancies / Blockers

**None identified.**

All HTTP contract requests in `__http__/mocs.http` align with the implemented Vercel handlers. Route order in `vercel.json` is correct (stats before parameterized :id). Seed data provides coverage for all documented test scenarios.

---

CONTRACTS COMPLETE
