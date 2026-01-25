# TEST-PLAN: STORY-004 — Wishlist Read Operations

## Overview

This test plan covers the three read-only wishlist endpoints:
- `GET /api/wishlist/list` — List wishlist items with pagination
- `GET /api/wishlist/:id` — Get single wishlist item by ID
- `GET /api/wishlist/search` — Search wishlist items (requires OpenSearch)

## Test Categories

### 1. Happy Path Tests

#### 1.1 List Wishlist Items (`GET /api/wishlist/list`)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| LIST-HP-001 | List items for authenticated user with items | 200 OK, returns paginated list with items array and pagination metadata |
| LIST-HP-002 | List items with `page=2&limit=10` params | 200 OK, returns correct page of results with proper offset |
| LIST-HP-003 | List items for user with no items | 200 OK, returns empty items array with total=0 |
| LIST-HP-004 | List items sorted by default (createdAt desc) | 200 OK, items ordered by createdAt descending |

**Evidence Required:**
- `/__http__/wishlist.http#listWishlistItems` executed with 200 response
- Response body includes: `items[]`, `pagination.page`, `pagination.limit`, `pagination.total`, `pagination.totalPages`

#### 1.2 Get Single Wishlist Item (`GET /api/wishlist/:id`)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| GET-HP-001 | Get item by valid UUID that exists and belongs to user | 200 OK, returns full wishlist item object |
| GET-HP-002 | Response includes all expected fields | Response contains: id, userId, title, store, setNumber, sourceUrl, imageUrl, price, currency, pieceCount, releaseDate, tags, priority, notes, sortOrder, createdAt, updatedAt |

**Evidence Required:**
- `/__http__/wishlist.http#getWishlistItem` executed with 200 response
- Response body matches WishlistItemSchema

#### 1.3 Search Wishlist Items (`GET /api/wishlist/search`)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| SEARCH-HP-001 | Search with query `q=millennium` | 200 OK, returns items matching "millennium" in title |
| SEARCH-HP-002 | Search with store filter `store=LEGO` | 200 OK, returns only items with store=LEGO |
| SEARCH-HP-003 | Search with combined filters | 200 OK, returns items matching all criteria |

**Evidence Required:**
- `/__http__/wishlist.http#searchWishlistItems` executed with 200 response
- Results contain only items matching search criteria

---

### 2. Error Cases

#### 2.1 Authentication Errors (All Endpoints)

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| AUTH-ERR-001 | Request without Authorization header | 401 Unauthorized |
| AUTH-ERR-002 | Request with invalid Bearer token | 401 Unauthorized |
| AUTH-ERR-003 | Request with expired token | 401 Unauthorized (with "expired" message) |

**Evidence Required:**
- `/__http__/wishlist.http#listWithoutAuth` executed with 401 response

#### 2.2 Get Item Errors

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| GET-ERR-001 | Get item with invalid UUID format | 400 Bad Request, "Invalid wishlist item ID format" |
| GET-ERR-002 | Get item that doesn't exist | 404 Not Found, "Wishlist item not found" |
| GET-ERR-003 | Get item belonging to another user | 403 Forbidden, "You do not have permission to access this item" |

**Evidence Required:**
- `/__http__/wishlist.http#getInvalidId` executed with 400 response
- `/__http__/wishlist.http#getNotFound` executed with 404 response

#### 2.3 Search Errors

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| SEARCH-ERR-001 | Search without required `q` parameter | 400 Bad Request OR empty results (implementation decision) |
| SEARCH-ERR-002 | OpenSearch unavailable | 503 Service Unavailable OR graceful fallback |

---

### 3. Edge Cases

#### 3.1 Pagination Edge Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| PAGE-EDGE-001 | Request page beyond total pages | 200 OK, empty items array |
| PAGE-EDGE-002 | Request with limit=0 | 400 Bad Request OR default to limit=20 |
| PAGE-EDGE-003 | Request with limit=1000 (above max) | Capped to max limit (100) |
| PAGE-EDGE-004 | Request with page=-1 | 400 Bad Request OR default to page=1 |

#### 3.2 Data Edge Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| DATA-EDGE-001 | Item with null optional fields | 200 OK, null fields returned as null (not omitted) |
| DATA-EDGE-002 | Item with empty tags array | 200 OK, tags returned as `[]` |
| DATA-EDGE-003 | Item with unicode title | 200 OK, unicode preserved |
| DATA-EDGE-004 | Item with price as decimal string | 200 OK, price returned as string (not number) |

#### 3.3 Search Edge Cases

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| SEARCH-EDGE-001 | Search with special characters | Results properly escaped, no injection |
| SEARCH-EDGE-002 | Search with very long query | Query truncated or rejected gracefully |
| SEARCH-EDGE-003 | Search with empty string | 400 Bad Request OR return all items |

---

## Evidence Requirements Summary

### Required `.http` Requests

All requests must be defined in `/__http__/wishlist.http`:

1. `#listWishlistItems` — Basic list call
2. `#listWishlistItemsPaginated` — List with page/limit params
3. `#getWishlistItem` — Get by valid ID
4. `#getWishlistItemInvalidId` — Get with malformed ID
5. `#getWishlistItemNotFound` — Get non-existent ID
6. `#searchWishlistItems` — Basic search
7. `#searchWishlistItemsWithFilters` — Search with store filter
8. `#listWithoutAuth` — List without auth header (401 test)

### Captured Evidence Format

For each required `.http` request, proof must include:
- HTTP status code
- Response body (JSON)
- Timestamp of execution

### Unit Test Requirements

Core business logic tests in `packages/backend/wishlist-core/src/__tests__/`:
- `list-wishlist-items.test.ts`
- `get-wishlist-item.test.ts`
- `search-wishlist-items.test.ts` (if search logic is in core)

---

## Seed Data Requirements

For tests to pass, the following seed data MUST exist:

| Entity | Requirements |
|--------|--------------|
| Wishlist Item 1 | id: known UUID, userId: DEV_USER_SUB, title: "Millennium Falcon", store: "LEGO" |
| Wishlist Item 2 | id: known UUID, userId: DEV_USER_SUB, title: "Hogwarts Castle", store: "LEGO" |
| Wishlist Item 3 | id: known UUID, userId: DEV_USER_SUB, title: "Tower Bridge", store: "Amazon" |
| Wishlist Item (other user) | id: known UUID, userId: different-user-id, title: "Test Item" |

Seed must be deterministic and idempotent (`pnpm seed` safe to run multiple times).

---

## Test Execution Commands

```bash
# Unit tests
pnpm test packages/backend/wishlist-core

# HTTP requests (requires local dev server)
# Execute via REST Client or equivalent in /__http__/wishlist.http

# Full validation
pnpm build && pnpm test:all
```

---

## Blockers Identified

- **OpenSearch dependency for search endpoint**: If OpenSearch is not available locally, search endpoint tests may need to be deferred or use a fallback strategy.
- **Seed data**: Must be created as part of this story to enable testing.
