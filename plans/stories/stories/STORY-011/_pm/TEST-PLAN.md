# STORY-011: Test Plan

## Overview

This test plan covers the migration of MOC Instructions read endpoints from AWS Lambda to Vercel serverless functions. The tests validate endpoint behavior, authentication/authorization, data integrity, and edge cases.

---

## Endpoints Under Test

| # | Endpoint | Method | Description | Auth Required |
|---|----------|--------|-------------|---------------|
| 1 | `/api/mocs/:id` | GET | Get single MOC by ID | Optional (supports anonymous) |
| 2 | `/api/mocs` | GET | List MOCs with pagination and search | Required |
| 3 | `/api/mocs/stats/by-category` | GET | Get MOC statistics grouped by category | Required |
| 4 | `/api/mocs/stats/uploads-over-time` | GET | Get time-series upload data (last 12 months) | Required |

---

## Happy Path Tests

| ID | Endpoint | Test Description | Expected Outcome | Evidence |
|----|----------|------------------|------------------|----------|
| HP-1 | `GET /api/mocs/:id` | Owner fetches their published MOC | 200 OK with `isOwner: true`, presigned URLs for files, full MOC detail | `.http` response showing complete data structure |
| HP-2 | `GET /api/mocs/:id` | Owner fetches their draft MOC | 200 OK with `isOwner: true`, status: 'draft', presigned URLs | `.http` response |
| HP-3 | `GET /api/mocs/:id` | Anonymous user fetches published MOC | 200 OK with `isOwner: false`, CDN URLs (not presigned) | `.http` response showing public URL format |
| HP-4 | `GET /api/mocs/:id` | Authenticated non-owner fetches published MOC | 200 OK with `isOwner: false`, CDN URLs | `.http` response |
| HP-5 | `GET /api/mocs` | User lists their MOCs with default pagination | 200 OK with `page: 1`, `limit: 20`, `data[]`, `total` | `.http` response showing pagination metadata |
| HP-6 | `GET /api/mocs` | User lists MOCs with custom pagination (page=2, limit=10) | 200 OK with `page: 2`, `limit: 10`, correct data slice | `.http` response |
| HP-7 | `GET /api/mocs` | User searches MOCs by title | 200 OK with filtered results matching search term | `.http` response showing ILIKE match |
| HP-8 | `GET /api/mocs` | User filters MOCs by tag | 200 OK with results containing specified tag | `.http` response |
| HP-9 | `GET /api/mocs/stats/by-category` | User requests category stats | 200 OK with `data[]` containing `{category, count}` sorted by count desc | `.http` response |
| HP-10 | `GET /api/mocs/stats/uploads-over-time` | User requests time-series data | 200 OK with `data[]` containing `{date, category, count}` in YYYY-MM format | `.http` response |

---

## Error Cases

| ID | Endpoint | Test Description | Expected Status | Expected Error |
|----|----------|------------------|-----------------|----------------|
| ERR-1 | `GET /api/mocs/:id` | Invalid UUID format for MOC ID | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-2 | `GET /api/mocs/:id` | Non-existent MOC ID (valid UUID) | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-3 | `GET /api/mocs/:id` | Anonymous access to draft MOC | 404 | `NOT_FOUND` - "MOC not found" (prevents existence leak) |
| ERR-4 | `GET /api/mocs/:id` | Non-owner access to draft MOC | 404 | `NOT_FOUND` - "MOC not found" (prevents existence leak) |
| ERR-5 | `GET /api/mocs/:id` | Non-owner access to archived MOC | 404 | `NOT_FOUND` - "MOC not found" |
| ERR-6 | `GET /api/mocs/:id` | Missing MOC ID path parameter | 404 | `NOT_FOUND` - "MOC ID is required" |
| ERR-7 | `GET /api/mocs` | Missing authentication token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-8 | `GET /api/mocs` | Invalid/expired JWT token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-9 | `GET /api/mocs` | Malformed JWT token | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-10 | `GET /api/mocs` | Invalid pagination: page=-1 | 422 | `VALIDATION_ERROR` - Invalid query parameters |
| ERR-11 | `GET /api/mocs` | Invalid pagination: limit=200 (exceeds max 100) | 422 | `VALIDATION_ERROR` - Invalid query parameters |
| ERR-12 | `GET /api/mocs` | Invalid pagination: page=0 | 422 | `VALIDATION_ERROR` - Invalid query parameters |
| ERR-13 | `GET /api/mocs` | Invalid pagination: non-numeric page | 422 | `VALIDATION_ERROR` - Invalid query parameters |
| ERR-14 | `GET /api/mocs/stats/by-category` | Missing authentication | 401 | `UNAUTHORIZED` - "Authentication required" |
| ERR-15 | `GET /api/mocs/stats/uploads-over-time` | Missing authentication | 401 | `UNAUTHORIZED` - "Authentication required" |

---

## Edge Cases

| ID | Endpoint | Test Description | Expected Outcome |
|----|----------|------------------|------------------|
| EDGE-1 | `GET /api/mocs/:id` | MOC with no associated files | 200 OK with `files: []` |
| EDGE-2 | `GET /api/mocs/:id` | MOC with soft-deleted files (deletedAt set) | 200 OK, soft-deleted files NOT included in response |
| EDGE-3 | `GET /api/mocs/:id` | MOC with nullable fields (null description, tags, theme, slug) | 200 OK with null values preserved |
| EDGE-4 | `GET /api/mocs` | User has no MOCs | 200 OK with `data: []`, `total: 0` |
| EDGE-5 | `GET /api/mocs` | Pagination beyond total (page=100 when total=5) | 200 OK with `data: []`, `total: 5`, `page: 100` |
| EDGE-6 | `GET /api/mocs` | Search with no matches | 200 OK with `data: []`, `total: 0` |
| EDGE-7 | `GET /api/mocs` | Search with special characters (%, _, SQL injection attempt) | 200 OK, safe handling, no SQL errors |
| EDGE-8 | `GET /api/mocs` | Search with Unicode/emoji characters | 200 OK, matches if data contains Unicode |
| EDGE-9 | `GET /api/mocs` | Search case insensitivity (CASTLE vs castle) | 200 OK with matches regardless of case |
| EDGE-10 | `GET /api/mocs` | Tag filter with non-existent tag | 200 OK with `data: []`, `total: 0` |
| EDGE-11 | `GET /api/mocs/stats/by-category` | User has no MOCs | 200 OK with `data: []`, `total: 0` |
| EDGE-12 | `GET /api/mocs/stats/by-category` | MOCs have no themes (all null) | 200 OK with tag-based stats only |
| EDGE-13 | `GET /api/mocs/stats/by-category` | MOCs have no tags (all null) | 200 OK with theme-based stats only |
| EDGE-14 | `GET /api/mocs/stats/uploads-over-time` | User has no MOCs in last 12 months | 200 OK with `data: []` |
| EDGE-15 | `GET /api/mocs/stats/uploads-over-time` | MOCs spread across multiple months | 200 OK with correct monthly aggregation |
| EDGE-16 | `GET /api/mocs/:id` | Access to pending_review status MOC (non-owner) | 404 NOT_FOUND (only published visible to non-owners) |

---

## Authorization Matrix

| Scenario | Get Published | Get Draft | Get Archived | Get Pending Review | List | Stats |
|----------|---------------|-----------|--------------|-------------------|------|-------|
| Anonymous | 200 (CDN URLs) | 404 | 404 | 404 | 401 | 401 |
| Authenticated (Owner) | 200 (Presigned) | 200 (Presigned) | 200 (Presigned) | 200 (Presigned) | 200 | 200 |
| Authenticated (Non-Owner) | 200 (CDN URLs) | 404 | 404 | 404 | 200* | 200* |
| Invalid Token | 200 (CDN URLs)** | 404 | 404 | 404 | 401 | 401 |

*User only sees their own data (userId filter)
**Invalid tokens treated as anonymous for the GET detail endpoint

---

## Status Filtering Tests

| ID | Status | Owner Access | Non-Owner Access | Anonymous Access |
|----|--------|--------------|------------------|------------------|
| SF-1 | `draft` | 200 OK | 404 | 404 |
| SF-2 | `published` | 200 OK | 200 OK | 200 OK |
| SF-3 | `archived` | 200 OK | 404 | 404 |
| SF-4 | `pending_review` | 200 OK | 404 | 404 |

---

## Response Structure Validation

### GET /api/mocs/:id Response Schema

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "description": "string | null",
    "slug": "string | null",
    "tags": ["string"] | null,
    "theme": "string | null",
    "status": "draft | published | archived | pending_review",
    "createdAt": "ISO 8601 datetime",
    "updatedAt": "ISO 8601 datetime",
    "publishedAt": "ISO 8601 datetime | null",
    "files": [
      {
        "id": "uuid",
        "category": "instruction | parts-list | thumbnail | gallery-image",
        "filename": "string",
        "size": "number | undefined",
        "mimeType": "string | null",
        "url": "string (presigned or CDN)",
        "uploadedAt": "ISO 8601 datetime"
      }
    ],
    "isOwner": "boolean"
  }
}
```

### GET /api/mocs Response Schema

```json
{
  "success": true,
  "data": [/* MocInstruction[] */],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

### GET /api/mocs/stats/by-category Response Schema

```json
{
  "success": true,
  "data": [
    { "category": "string", "count": "number" }
  ],
  "total": "number"
}
```

### GET /api/mocs/stats/uploads-over-time Response Schema

```json
{
  "success": true,
  "data": [
    { "date": "YYYY-MM", "category": "string", "count": "number" }
  ]
}
```

---

## Evidence Requirements

QA must capture the following for each test:

1. **HTTP Request**: Full request including URL, method, headers (redacted auth tokens)
2. **HTTP Response**: Full response including status code, headers, body
3. **Database State**: Relevant seed data or query results (for data verification)
4. **Screenshots**: (if UI tests) Console output or Vercel logs for errors

### Evidence File Format

Store evidence in `__http__/story-011/` directory:
- `mocs-get-{test-id}.http` - Request/response pairs
- `mocs-list-{test-id}.http` - Request/response pairs
- `mocs-stats-{test-id}.http` - Request/response pairs

---

## Database State Requirements

### Seed Data for Testing

The following seed data must exist in the database for comprehensive test coverage:

#### Users

| User ID | Description |
|---------|-------------|
| `user-owner-001` | Primary test user (owns test MOCs) |
| `user-other-002` | Secondary user (non-owner scenarios) |

#### MOC Instructions

| MOC ID | Owner | Status | Theme | Tags | Description |
|--------|-------|--------|-------|------|-------------|
| `moc-published-001` | user-owner-001 | published | Castle | ["medieval", "castle"] | Published MOC with files |
| `moc-draft-002` | user-owner-001 | draft | City | ["modern", "city"] | Draft MOC |
| `moc-archived-003` | user-owner-001 | archived | Space | ["space", "sci-fi"] | Archived MOC |
| `moc-pending-004` | user-owner-001 | pending_review | Technic | ["mechanical"] | Pending review MOC |
| `moc-nofiles-005` | user-owner-001 | published | Creator | [] | Published MOC without files |
| `moc-nulls-006` | user-owner-001 | published | null | null | MOC with nullable fields |
| `moc-other-007` | user-other-002 | published | Castle | ["castle"] | Other user's MOC |
| `moc-other-draft-008` | user-other-002 | draft | City | ["city"] | Other user's draft (shouldn't be visible) |

#### MOC Files

| File ID | MOC ID | File Type | Status |
|---------|--------|-----------|--------|
| `file-001` | moc-published-001 | instruction | active |
| `file-002` | moc-published-001 | thumbnail | active |
| `file-003` | moc-published-001 | parts-list | soft-deleted (deletedAt set) |

#### Time-Series Data (for stats/uploads-over-time)

Seed MOCs with varying `createdAt` dates spanning:
- Current month
- Previous month
- 6 months ago
- 12 months ago
- 13 months ago (should NOT appear in results)

---

## Test Execution Order

1. **Setup**: Run seed script to populate test data
2. **Authentication Tests**: ERR-7, ERR-8, ERR-9, ERR-14, ERR-15
3. **Authorization Tests**: ERR-3, ERR-4, ERR-5, SF-1 through SF-4
4. **Happy Path Tests**: HP-1 through HP-10
5. **Edge Cases**: EDGE-1 through EDGE-16
6. **Input Validation**: ERR-1, ERR-2, ERR-6, ERR-10 through ERR-13
7. **Cleanup**: Reset database to known state

---

## Performance Considerations

| Endpoint | Expected Response Time | Notes |
|----------|------------------------|-------|
| GET /api/mocs/:id | < 500ms | Single record fetch with files join |
| GET /api/mocs | < 1000ms | Paginated list with ILIKE search |
| GET /api/mocs/stats/by-category | < 1000ms | Aggregation query |
| GET /api/mocs/stats/uploads-over-time | < 1000ms | Time-series aggregation (12 month window) |

---

## Notes

1. **Authentication**: Uses Cognito JWT verification. Invalid tokens are treated as anonymous for the GET detail endpoint (graceful degradation).

2. **URL Types**:
   - Owner access: Presigned S3 URLs (24h TTL)
   - Non-owner/anonymous: CDN URLs (public S3 URLs until CloudFront configured)

3. **Existence Leak Prevention**: Non-published MOCs return 404 (not 403) to non-owners to prevent discovering that a MOC exists.

4. **Search Implementation**: MVP uses PostgreSQL ILIKE. OpenSearch integration is deferred.

5. **Caching**: Redis caching is deferred for MVP. All requests hit database directly.

6. **Stats Aggregation**:
   - by-category: Returns top 10 categories sorted by count
   - uploads-over-time: Returns last 12 months grouped by month and theme
