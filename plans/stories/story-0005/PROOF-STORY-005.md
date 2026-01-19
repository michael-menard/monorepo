# PROOF-STORY-005: Wishlist - Write Operations (No Images)

**Date:** 2026-01-18
**Status:** COMPLETE

---

## Summary

Implemented wishlist write operations (create, update, delete, reorder) for the Vercel API platform. All acceptance criteria met.

### Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| Core functions | `packages/backend/wishlist-core/src/` | 4 new functions |
| Unit tests | `packages/backend/wishlist-core/src/__tests__/` | 4 new test files (38 total tests) |
| Vercel endpoints | `apps/api/platforms/vercel/api/wishlist/` | 3 files (1 new, 2 modified) |
| HTTP contracts | `__http__/wishlist.http` | Write operation tests added |
| Vercel config | `apps/api/platforms/vercel/vercel.json` | 2 new routes added |

---

## Acceptance Criteria Evidence

### AC-1: Create Wishlist Item

| Requirement | Evidence |
|-------------|----------|
| POST /api/wishlist accepts title (required) and store (required) | `{"title": "Test Create", "store": "LEGO"}` returns 201 |
| Server generates UUID for id | Response: `"id":"153a15cd-94ec-4593-91d2-1d607d65c7af"` |
| Server sets createdAt and updatedAt | Response: `"createdAt":"2026-01-19T04:08:24.721Z"` |
| Server calculates sortOrder as MAX+1 | Response: `"sortOrder":4` (user had 3 items) |
| Returns 201 Created | Status code verified |
| Returns 400 for missing fields | `{"error":"Bad Request","message":"Invalid input..."}` |

### AC-2: Update Wishlist Item

| Requirement | Evidence |
|-------------|----------|
| PUT /api/wishlist/:id accepts partial JSON | `{"title": "Updated Millennium Falcon"}` updates only title |
| updatedAt is set on update | `"updatedAt":"2026-01-19T04:08:27.316Z"` (changed) |
| createdAt is never modified | `"createdAt":"2026-01-19T03:32:12.660Z"` (unchanged) |
| Returns 200 OK | Status code verified |
| Returns 404 Not Found | `{"error":"Not Found","message":"Wishlist item not found"}` |
| Returns 403 Forbidden | `{"error":"Forbidden","message":"You do not have permission..."}` |
| Returns 400 for invalid UUID | `{"error":"Bad Request","message":"Invalid item ID format"}` |

### AC-3: Delete Wishlist Item

| Requirement | Evidence |
|-------------|----------|
| DELETE /api/wishlist/:id removes item | Created then deleted item successfully |
| Returns 200 OK with success | `{"success":true}` |
| Returns 404 Not Found | `{"error":"Not Found","message":"Wishlist item not found"}` |
| Returns 403 Forbidden | `{"error":"Forbidden","message":"You do not have permission..."}` |
| Returns 400 for invalid UUID | `{"error":"Bad Request","message":"Invalid item ID format"}` |

### AC-4: Reorder Wishlist Items

| Requirement | Evidence |
|-------------|----------|
| PATCH /api/wishlist/reorder accepts items array | `{"items": [{...}]}` accepted |
| Updates sortOrder for each item | `{"success":true,"updated":3}` |
| Returns 200 OK | Status code verified |
| Returns 400 for empty array | `{"error":"Bad Request","message":"Items array cannot be empty"}` |
| Returns 400 for invalid UUID | `{"error":"Bad Request","message":"Invalid item ID format"}` |

### AC-5: Validation Rules

All validation rules implemented via Zod schemas:
- title: Required, non-empty string
- store: Required, non-empty string
- priority: Optional integer 0-5
- All optional fields handled correctly

### AC-6: Testing & Evidence

- Unit tests: 38 passed
- API tests: 16/16 passed
- All evidence captured in this document

---

## Commands Run

### Build
```bash
cd packages/backend/wishlist-core && pnpm build
```
**Result:** PASS

### Type Check
```bash
cd packages/backend/wishlist-core && pnpm type-check
```
**Result:** PASS

### Unit Tests
```bash
cd packages/backend/wishlist-core && pnpm test
```
**Result:** 38 tests passed

### Seed
```bash
pnpm db:seed
```
**Result:** PASS (4 wishlist items upserted)

---

## API Request/Response Evidence

### CREATE - Required Fields Only
**Request:**
```http
POST /api/wishlist
Content-Type: application/json

{"title": "Test Create", "store": "LEGO"}
```

**Response (201):**
```json
{
  "id": "153a15cd-94ec-4593-91d2-1d607d65c7af",
  "userId": "dev-user-00000000-0000-0000-0000-000000000001",
  "title": "Test Create",
  "store": "LEGO",
  "setNumber": null,
  "sourceUrl": null,
  "imageUrl": null,
  "price": null,
  "currency": "USD",
  "pieceCount": null,
  "releaseDate": null,
  "tags": [],
  "priority": 0,
  "notes": null,
  "sortOrder": 4,
  "createdAt": "2026-01-19T04:08:24.721Z",
  "updatedAt": "2026-01-19T04:08:24.721Z"
}
```

### UPDATE - Single Field
**Request:**
```http
PUT /api/wishlist/11111111-1111-1111-1111-111111111001
Content-Type: application/json

{"title": "Updated Millennium Falcon"}
```

**Response (200):**
```json
{
  "id": "11111111-1111-1111-1111-111111111001",
  "title": "Updated Millennium Falcon",
  "store": "LEGO",
  "updatedAt": "2026-01-19T04:08:27.316Z"
}
```

### DELETE - Success
**Request:**
```http
DELETE /api/wishlist/346322ac-c34c-4021-aa1d-d0c8d3fbbfeb
```

**Response (200):**
```json
{"success": true}
```

### REORDER - Success
**Request:**
```http
PATCH /api/wishlist/reorder
Content-Type: application/json

{
  "items": [
    {"id": "11111111-1111-1111-1111-111111111001", "sortOrder": 2},
    {"id": "11111111-1111-1111-1111-111111111002", "sortOrder": 0},
    {"id": "11111111-1111-1111-1111-111111111003", "sortOrder": 1}
  ]
}
```

**Response (200):**
```json
{"success": true, "updated": 3}
```

---

## HTTP File Reference

All requests documented in: `/__http__/wishlist.http`

---

## Reuse & Architecture Compliance

### Packages Reused
- `@repo/logger` - Logging in all endpoints
- `drizzle-orm` - Database operations
- `zod` - Input validation
- `pg` - PostgreSQL connection

### Patterns Followed
- Ports & Adapters architecture (core functions are platform-agnostic)
- Discriminated union results for error handling
- Vercel file-based routing with method dispatch
- Auth bypass pattern for local development

### No New Packages
All capabilities from existing dependencies.

---

## Verification Summary

| Check | Status |
|-------|--------|
| Type check | PASS |
| Build | PASS |
| Unit tests | 38/38 PASS |
| Seed execution | PASS |
| API tests | 16/16 PASS |
| Port unchanged | CONFIRMED (3000) |
| Service reused | CONFIRMED |

---

## Blockers

None.

---

## Files Changed

### New Files
- `packages/backend/wishlist-core/src/create-wishlist-item.ts`
- `packages/backend/wishlist-core/src/update-wishlist-item.ts`
- `packages/backend/wishlist-core/src/delete-wishlist-item.ts`
- `packages/backend/wishlist-core/src/reorder-wishlist-items.ts`
- `packages/backend/wishlist-core/src/__tests__/create-wishlist-item.test.ts`
- `packages/backend/wishlist-core/src/__tests__/update-wishlist-item.test.ts`
- `packages/backend/wishlist-core/src/__tests__/delete-wishlist-item.test.ts`
- `packages/backend/wishlist-core/src/__tests__/reorder-wishlist-items.test.ts`
- `apps/api/platforms/vercel/api/wishlist/index.ts`
- `apps/api/platforms/vercel/api/wishlist/reorder.ts`

### Modified Files
- `packages/backend/wishlist-core/src/__types__/index.ts` (added input schemas)
- `packages/backend/wishlist-core/src/index.ts` (added exports)
- `apps/api/platforms/vercel/api/wishlist/[id].ts` (added PUT/DELETE handlers)
- `apps/api/platforms/vercel/vercel.json` (added routes)
- `__http__/wishlist.http` (added write operation tests)
