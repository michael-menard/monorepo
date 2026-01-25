---
status: uat
---

# STORY-011: MOC Instructions - Read Operations

## 1. Title

Migrate MOC Instructions read endpoints (get, list, stats) from AWS Lambda to Vercel serverless functions.

---

## 2. Context

The Vercel migration is progressing through the API surface. STORY-007 and STORY-008 established the gallery domain migration patterns. This story migrates the MOC Instructions read operations, enabling users to browse their MOC collection, view MOC details, and access aggregate statistics.

The AWS Lambda handlers at `apps/api/platforms/aws/endpoints/moc-instructions/` implement:
- Get single MOC by ID with ownership-aware access (published MOCs visible to anyone, drafts only to owner)
- List MOCs with pagination, search (ILIKE), and tag filtering
- Get statistics by category (theme/tags aggregation)
- Get uploads over time (time-series data for last 12 months)

These must be migrated to Vercel while maintaining API contract compatibility. OpenSearch integration is deferred in favor of PostgreSQL ILIKE for the MVP.

---

## 3. Goal

Enable browsing, searching, and viewing statistics of MOC Instructions via Vercel serverless functions with identical API behavior to the existing AWS Lambda implementation.

---

## 4. Non-Goals

- **OpenSearch integration**: Search will use PostgreSQL ILIKE queries only. Full-text search via OpenSearch is deferred.
- **Redis caching**: Caching is not implemented for Vercel handlers. Performance optimization via caching is a future story.
- **Presigned S3 URLs**: MVP uses CDN URLs for all file access. Presigned URL generation for owner-only files is deferred.
- **MOC write operations**: Create, update, delete operations are separate stories (STORY-013 and beyond).
- **UI changes**: No frontend modifications. Existing RTK Query slices continue to work unchanged.
- **File uploads**: No upload operations in this story.

---

## 5. Scope

### Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/mocs/:id` | Get single MOC | Ownership-aware access with files |
| GET | `/api/mocs` | List MOCs | Paginated list with search/filter |
| GET | `/api/mocs/stats/by-category` | Category stats | Theme/tag aggregation |
| GET | `/api/mocs/stats/uploads-over-time` | Time-series stats | Monthly upload counts |

### Packages/Apps Affected

| Location | Change Type |
|----------|-------------|
| `packages/backend/moc-instructions-core/` | NEW - Core business logic package |
| `apps/api/platforms/vercel/api/mocs/` | NEW - Vercel handlers |
| `apps/api/platforms/vercel/vercel.json` | MODIFY - add routes |
| `apps/api/core/database/seeds/mocs.ts` | NEW - MOC seed data |
| `__http__/mocs.http` | NEW - HTTP contract requests |

---

## 6. Acceptance Criteria

### AC-1: Get MOC Endpoint

- [ ] `GET /api/mocs/:id` returns MOC object with files for valid ID
- [ ] Returns `isOwner: boolean` in response to indicate ownership
- [ ] Published MOCs visible to anyone (anonymous or authenticated)
- [ ] Draft/archived/pending_review MOCs return 404 for non-owners (prevent existence leak)
- [ ] Response includes eager-loaded: files (excluding soft-deleted), gallery images, parts lists
- [ ] Exclude soft-deleted files (`deletedAt IS NULL` filter)
- [ ] Returns 404 for non-existent MOC ID
- [ ] Returns 404 for invalid UUID format (same as non-existent)
- [ ] Invalid/expired JWT tokens treated as anonymous access

### AC-2: List MOCs Endpoint

- [ ] `GET /api/mocs` returns paginated array of MOCs
- [ ] Requires authentication (returns 401 without valid token)
- [ ] Returns only authenticated user's MOCs (userId filter)
- [ ] Supports `page` and `limit` query params (defaults: page=1, limit=20, max limit=100)
- [ ] Supports `search` query param for PostgreSQL ILIKE search on title/description
- [ ] Supports `tag` query param for tag filtering
- [ ] Sort by `updatedAt DESC` (most recent first)
- [ ] Response includes pagination metadata: `page`, `limit`, `total`
- [ ] Returns empty array (not error) when no MOCs exist or no matches
- [ ] Returns 422 for invalid pagination params (page<1, limit<1, limit>100)

### AC-3: Stats by Category Endpoint

- [ ] `GET /api/mocs/stats/by-category` requires authentication
- [ ] Returns stats only for authenticated user's MOCs
- [ ] Aggregates by theme (for sets) and tags (for MOCs)
- [ ] Returns top 10 categories sorted by count descending
- [ ] Response format: `{ data: [{category, count}], total }`
- [ ] Returns empty array when user has no MOCs

### AC-4: Stats Uploads Over Time Endpoint

- [ ] `GET /api/mocs/stats/uploads-over-time` requires authentication
- [ ] Returns stats only for authenticated user's MOCs
- [ ] Returns time-series data for last 12 months
- [ ] Groups by month (YYYY-MM format) and category (theme)
- [ ] Response format: `{ data: [{date, category, count}] }`
- [ ] Returns empty array when user has no MOCs in the time range

### AC-5: Create moc-instructions-core Package

- [ ] Create new package at `packages/backend/moc-instructions-core/`
- [ ] Add exports: `getMoc`, `listMocs`, `getMocStatsByCategory`, `getMocUploadsOverTime`
- [ ] Add `__types__/index.ts` with operation-specific schemas (filters, DB row shapes)
- [ ] Reuse existing schemas from `@repo/api-types/moc` where applicable
- [ ] Unit tests for all core functions with mock DB client
- [ ] Follow established patterns from `packages/backend/gallery-core/`

### AC-6: Seed Data

- [ ] `pnpm seed` creates deterministic MOC test data
- [ ] Seed includes 6+ MOCs with varied statuses (draft, published, archived, pending_review)
- [ ] Seed includes MOCs with varying themes/tags for stats testing
- [ ] Seed includes MOC files (instructions, thumbnails) for eager loading tests
- [ ] Seed includes 1+ soft-deleted file (deletedAt set) for filtering test
- [ ] Seed includes MOCs with createdAt dates spanning 12+ months for time-series tests
- [ ] Seed is idempotent (safe to run multiple times)
- [ ] Two test users: primary owner and secondary user for authorization tests

### AC-7: HTTP Contract Verification

- [ ] `__http__/mocs.http` created with all required MOC requests
- [ ] All happy path requests documented and executable
- [ ] Error case requests documented (401, 404, 422)

---

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in handlers |
| `@repo/vercel-adapter` | Request/response transformation, auth middleware |
| `@repo/api-types/moc` | Existing Zod schemas for MOC data |
| `packages/backend/db` | Drizzle schema and client |
| `packages/backend/lambda-responses` | Response helpers (ok, error patterns) |

### New Package to Create

| Package | Justification |
|---------|--------------|
| `packages/backend/moc-instructions-core` | Platform-agnostic business logic for MOC read operations. Follows established pattern from gallery-core and sets-core. |

### Prohibited Patterns

- Do NOT inline business logic in Vercel handlers (use core package)
- Do NOT duplicate Zod schemas that exist in `@repo/api-types/moc`
- Do NOT implement OpenSearch client in this story
- Do NOT add Redis/caching logic
- Do NOT implement presigned S3 URL generation (use CDN URLs)

---

## 8. Architecture Notes (Ports & Adapters)

```
+-------------------------------------------------------------+
|                    Vercel Handler (Adapter)                  |
|  apps/api/platforms/vercel/api/mocs/[id].ts                  |
|                                                              |
|  - Parse request (via @repo/vercel-adapter)                  |
|  - Extract auth (AUTH_BYPASS or JWT)                         |
|  - Call core function                                        |
|  - Transform response                                        |
+------------------------------+-------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Core Logic (Port)                         |
|  packages/backend/moc-instructions-core/src/get-moc.ts       |
|                                                              |
|  - Validate input (Zod)                                      |
|  - Query database (Drizzle)                                  |
|  - Apply business rules (ownership check)                    |
|  - Return typed result                                       |
+------------------------------+-------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Database (Infrastructure)                 |
|  packages/backend/db                                         |
|                                                              |
|  - mocInstructions table                                     |
|  - mocFiles table (with soft-delete)                         |
|  - mocGalleryImages join table                               |
|  - mocPartsLists table                                       |
+-------------------------------------------------------------+
```

---

## 9. Required Vercel / Infra Notes

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `AUTH_BYPASS` | Enable dev auth bypass (dev only) | DEV ONLY |
| `DEV_USER_SUB` | Mock user ID for bypass | DEV ONLY |

### Vercel Configuration

Add to `apps/api/platforms/vercel/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/mocs/stats/by-category", "destination": "/api/mocs/stats/by-category" },
    { "source": "/api/mocs/stats/uploads-over-time", "destination": "/api/mocs/stats/uploads-over-time" },
    { "source": "/api/mocs/:id", "destination": "/api/mocs/[id]" },
    { "source": "/api/mocs", "destination": "/api/mocs/index" }
  ]
}
```

**Note**: Stats routes must be listed before the `:id` dynamic route to prevent `/api/mocs/stats` from being interpreted as an ID.

---

## 10. HTTP Contract Plan

### Required `.http` Requests

| Request Name | Path | Method | Required |
|--------------|------|--------|----------|
| `getMoc` | `/__http__/mocs.http` | GET | YES |
| `getMoc404` | `/__http__/mocs.http` | GET | YES |
| `getMocDraftAsOwner` | `/__http__/mocs.http` | GET | YES |
| `getMocDraftAsNonOwner` | `/__http__/mocs.http` | GET | YES |
| `listMocs` | `/__http__/mocs.http` | GET | YES |
| `listMocsWithPagination` | `/__http__/mocs.http` | GET | YES |
| `listMocsWithSearch` | `/__http__/mocs.http` | GET | YES |
| `listMocsEmpty` | `/__http__/mocs.http` | GET | YES |
| `getMocStatsByCategory` | `/__http__/mocs.http` | GET | YES |
| `getMocUploadsOverTime` | `/__http__/mocs.http` | GET | YES |

### Evidence Requirements

QA Verify MUST capture:
1. Response status code
2. Response body (JSON)
3. Verify pagination metadata is correct
4. Verify ownership flag is correct for owner/non-owner scenarios

---

## 11. Seed Requirements

### Required Entities

**MOC Instructions (6 minimum):**

| ID | Owner | Status | Theme | Tags | Purpose |
|----|-------|--------|-------|------|---------|
| `moc-11111111-1111-1111-1111-111111111111` | dev-user | published | Castle | ["medieval", "castle"] | Happy path get/list |
| `moc-22222222-2222-2222-2222-222222222222` | dev-user | draft | City | ["modern"] | Owner-only access test |
| `moc-33333333-3333-3333-3333-333333333333` | dev-user | archived | Space | ["sci-fi"] | Archived visibility test |
| `moc-44444444-4444-4444-4444-444444444444` | dev-user | pending_review | Technic | [] | Pending status test |
| `moc-55555555-5555-5555-5555-555555555555` | dev-user | published | Creator | null | Nullable fields test |
| `moc-66666666-6666-6666-6666-666666666666` | other-user | published | Castle | ["medieval"] | Other user's MOC (403 test) |
| `moc-77777777-7777-7777-7777-777777777777` | other-user | draft | City | ["city"] | Other user's draft (404 test) |
| `moc-88888888-8888-8888-8888-888888888888` | dev-user | published | Pirates | ["adventure"] | Created 6 months ago |

**MOC Files (for eager loading tests):**

| File ID | MOC ID | File Type | Status |
|---------|--------|-----------|--------|
| `file-aaaa...` | moc-111... | instruction | active |
| `file-bbbb...` | moc-111... | thumbnail | active |
| `file-cccc...` | moc-111... | parts-list | soft-deleted (deletedAt set) |

**Time-Series Data:**

Seed MOCs with varying `createdAt` dates:
- Current month (2 MOCs)
- 3 months ago (1 MOC)
- 6 months ago (1 MOC)
- 12 months ago (1 MOC)
- 13 months ago (1 MOC - should NOT appear in uploads-over-time results)

### Seed Requirements

- **Deterministic**: Same IDs every run (use fixed UUIDs)
- **Idempotent**: Upsert pattern (ON CONFLICT DO UPDATE)
- **Location**: `apps/api/core/database/seeds/mocs.ts`
- **Command**: `pnpm seed` includes MOC seed

---

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Evidence |
|----|------|----------|
| HP-1 | GET /api/mocs/:id as owner returns 200 + full MOC with `isOwner: true` | `.http` response |
| HP-2 | GET /api/mocs/:id as anonymous (published MOC) returns 200 + `isOwner: false` | `.http` response |
| HP-3 | GET /api/mocs returns 200 + paginated array for authenticated user | `.http` response |
| HP-4 | GET /api/mocs with search param returns filtered results | `.http` response |
| HP-5 | GET /api/mocs with tag filter returns matching MOCs | `.http` response |
| HP-6 | GET /api/mocs/stats/by-category returns category aggregation | `.http` response |
| HP-7 | GET /api/mocs/stats/uploads-over-time returns time-series data | `.http` response |

### Error Cases

| ID | Test | Expected |
|----|------|----------|
| ERR-1 | GET /api/mocs/:id with invalid UUID | 404 Not Found |
| ERR-2 | GET /api/mocs/:id with non-existent UUID | 404 Not Found |
| ERR-3 | GET /api/mocs/:id (draft) as non-owner | 404 Not Found |
| ERR-4 | GET /api/mocs/:id (archived) as non-owner | 404 Not Found |
| ERR-5 | GET /api/mocs without auth token | 401 Unauthorized |
| ERR-6 | GET /api/mocs/stats/by-category without auth | 401 Unauthorized |
| ERR-7 | GET /api/mocs/stats/uploads-over-time without auth | 401 Unauthorized |
| ERR-8 | GET /api/mocs with page=-1 | 422 Validation Error |
| ERR-9 | GET /api/mocs with limit=200 | 422 Validation Error |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | GET /api/mocs/:id with no files | 200 + `files: []` |
| EDGE-2 | GET /api/mocs/:id with soft-deleted file | 200 + file excluded |
| EDGE-3 | GET /api/mocs/:id with null description/tags/theme | 200 + null values preserved |
| EDGE-4 | GET /api/mocs when user has none | 200 + `data: []`, `total: 0` |
| EDGE-5 | GET /api/mocs page beyond total | 200 + `data: []` |
| EDGE-6 | GET /api/mocs search with no matches | 200 + `data: []` |
| EDGE-7 | GET /api/mocs search with special chars (%, _) | 200 + safe handling |
| EDGE-8 | GET /api/mocs search case insensitivity | 200 + matches |
| EDGE-9 | Stats endpoints with no user MOCs | 200 + `data: []` |
| EDGE-10 | Uploads-over-time with 13-month-old MOC | MOC excluded from results |

### Evidence Requirements

- All HP tests must have `.http` response captured
- All ERR tests must show correct status code
- Database state verified for ownership scenarios

---

## 13. Open Questions

*None - all blocking decisions resolved.*

**Decision Log:**
- Presigned URLs: **DEFERRED** - Use CDN URLs for MVP
- OpenSearch: **DEFERRED** - Use PostgreSQL ILIKE for MVP
- Caching: **DEFERRED** - No Redis caching for initial migration

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-19 | PM | Generated story from index | `plans/stories/STORY-011/STORY-011.md` |
