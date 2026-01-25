---
doc_type: story
story_id: STORY-004
title: "Wishlist - Read Operations"
status: draft
created_at: "2026-01-18T20:14:00-07:00"
updated_at: "2026-01-18T20:14:00-07:00"
tags:
  - vercel
  - migration
  - wishlist
  - read-operations
---

# STORY-004: Wishlist - Read Operations

## 1. Title

Wishlist Gallery - Read Operations

## 2. Context

This story migrates the wishlist read operations to Vercel serverless functions as part of the AWS-to-Vercel migration. The wishlist feature allows users to track LEGO sets they want to acquire. The database schema (`wishlist_items` table) already exists and is defined in `apps/api/core/database/schema/index.ts`.

This story follows the pattern established by STORY-002 (Sets Read Operations) and reuses the same infrastructure components.

## 3. Goal

Enable read-only access to user wishlists via three Vercel serverless endpoints:
- List wishlist items with pagination
- Get a single wishlist item by ID
- Search wishlist items by title

## 4. Non-Goals

- **Write operations** — Covered in STORY-005
- **OpenSearch integration** — Search uses PostgreSQL `ILIKE` (OpenSearch enhancement deferred)
- **Full-text search** — Search limited to `title` field only
- **Frontend changes** — Backend-only story
- **Image upload handling** — Covered in STORY-009

## 5. Scope

### Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/wishlist/list` | GET | Required | List user's wishlist items with pagination |
| `/api/wishlist/:id` | GET | Required | Get single wishlist item by ID |
| `/api/wishlist/search` | GET | Required | Search wishlist items by title |

### Apps/Packages Affected

| Location | Change Type |
|----------|-------------|
| `apps/api/platforms/vercel/api/wishlist/` | Create (3 endpoint files) |
| `packages/backend/wishlist-core/` | Create (new package) |
| `apps/api/core/database/seeds/wishlist.ts` | Create (seed data) |
| `apps/api/core/database/seeds/index.ts` | Modify (add export) |
| `/__http__/wishlist.http` | Create (test requests) |

## 6. Acceptance Criteria

### 6.1 List Wishlist Items (`GET /api/wishlist/list`)

- [ ] Returns 200 OK with paginated list of wishlist items for authenticated user
- [ ] Response includes: `items[]`, `pagination.page`, `pagination.limit`, `pagination.total`, `pagination.totalPages`
- [ ] Default pagination: `page=1`, `limit=20`
- [ ] Default sort: `createdAt DESC` (most recent first)
- [ ] Maximum limit capped at 100
- [ ] Returns empty `items[]` with `total=0` for users with no wishlist items
- [ ] Returns 401 Unauthorized without valid auth token

### 6.2 Get Wishlist Item (`GET /api/wishlist/:id`)

- [ ] Returns 200 OK with full wishlist item object for valid ID owned by user
- [ ] Response includes all fields: id, userId, title, store, setNumber, sourceUrl, imageUrl, price, currency, pieceCount, releaseDate, tags, priority, notes, sortOrder, createdAt, updatedAt
- [ ] Null optional fields returned as `null` (not omitted)
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] Returns 404 Not Found for non-existent ID
- [ ] Returns 403 Forbidden for item belonging to another user
- [ ] Returns 401 Unauthorized without valid auth token

### 6.3 Search Wishlist Items (`GET /api/wishlist/search`)

- [ ] Returns 200 OK with items matching search query `q` parameter
- [ ] Search is case-insensitive (PostgreSQL `ILIKE`)
- [ ] Search queries `title` field only
- [ ] Supports pagination (`page`, `limit` params)
- [ ] Returns 400 Bad Request if `q` parameter is missing or empty
- [ ] Returns 401 Unauthorized without valid auth token

### 6.4 Core Package (`@repo/wishlist-core`)

- [ ] Platform-agnostic business logic extracted to `packages/backend/wishlist-core/`
- [ ] Functions accept database client via dependency injection
- [ ] Zod schemas define input/output types
- [ ] Unit tests cover happy path and error cases

### 6.5 Seed Data

- [ ] Seed file exists at `apps/api/core/database/seeds/wishlist.ts`
- [ ] Seed creates at least 3 wishlist items for `DEV_USER_SUB` user
- [ ] Seed is deterministic (fixed UUIDs)
- [ ] Seed is idempotent (safe to run multiple times via upsert)
- [ ] Running `pnpm seed` succeeds without errors

## 7. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/vercel-adapter` | Auth middleware (`validateCognitoJwt`), request/response transformation |
| `@repo/logger` | Structured logging |
| `drizzle-orm` | Database queries |
| `zod` | Schema validation |

### New Package to Create

| Package | Purpose |
|---------|---------|
| `@repo/wishlist-core` | Platform-agnostic wishlist business logic |

### Pattern Reference

Follow the established pattern from:
- `packages/backend/sets-core/` — Core package structure
- `apps/api/platforms/vercel/api/sets/` — Vercel endpoint structure

## 8. Architecture Notes (Ports & Adapters)

### Core Layer (`packages/backend/wishlist-core/`)

**Port Interfaces:**
- `ListWishlistItemsDbClient` — Database client interface for list queries
- `GetWishlistItemDbClient` — Database client interface for single item queries
- `SearchWishlistItemsDbClient` — Database client interface for search queries

**Core Functions:**
- `listWishlistItems(db, schema, userId, filters)` — Returns paginated list
- `getWishlistItemById(db, schema, userId, itemId)` — Returns single item or error
- `searchWishlistItems(db, schema, userId, query, filters)` — Returns search results

### Adapter Layer (`apps/api/platforms/vercel/api/wishlist/`)

**Vercel Adapters:**
- `list.ts` — Adapts HTTP request to core function, returns HTTP response
- `[id].ts` — Adapts dynamic route param to core function
- `search.ts` — Adapts query params to core search function

### Data Flow

```
HTTP Request → Vercel Handler → Auth Middleware → Core Function → Drizzle Query → PostgreSQL
                                                       ↓
HTTP Response ← Vercel Handler ← Core Result ←────────┘
```

## 9. Required Vercel / Infra Notes

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `COGNITO_USER_POOL_ID` | Yes* | Cognito user pool ID |
| `COGNITO_CLIENT_ID` | Yes* | Cognito client ID |
| `AUTH_BYPASS` | Dev only | Set to `true` to bypass auth in development |
| `DEV_USER_SUB` | Dev only | Mock user ID when auth bypassed |

*Not required if `AUTH_BYPASS=true`

### Vercel Configuration

Routes should auto-discover via file-based routing:
- `/api/wishlist/list` → `api/wishlist/list.ts`
- `/api/wishlist/search` → `api/wishlist/search.ts`
- `/api/wishlist/:id` → `api/wishlist/[id].ts`

## 10. HTTP Contract Plan

### Required `.http` Requests

All requests defined in `/__http__/wishlist.http`:

| Request Name | Method | Path | Purpose |
|--------------|--------|------|---------|
| `#listWishlistItems` | GET | `/api/wishlist/list` | Basic list call |
| `#listWishlistItemsPaginated` | GET | `/api/wishlist/list?page=2&limit=10` | Pagination test |
| `#getWishlistItem` | GET | `/api/wishlist/{id}` | Get by valid ID |
| `#getWishlistItemInvalidId` | GET | `/api/wishlist/not-a-uuid` | Invalid ID format |
| `#getWishlistItemNotFound` | GET | `/api/wishlist/{non-existent-uuid}` | 404 test |
| `#searchWishlistItems` | GET | `/api/wishlist/search?q=millennium` | Basic search |
| `#searchWishlistItemsEmpty` | GET | `/api/wishlist/search?q=` | Empty query test |
| `#listWithoutAuth` | GET | `/api/wishlist/list` (no auth) | 401 test |

### Evidence Requirements

For QA verification, proof must capture:
- `.http` request execution with response status + body
- Responses saved to `plans/stories/story-004/proof/`

## 11. Seed Requirements

### Required Entities

| Entity | Fields | Notes |
|--------|--------|-------|
| Wishlist Item 1 | `id: fixed-uuid-1`, `userId: DEV_USER_SUB`, `title: "Millennium Falcon"`, `store: "LEGO"`, `setNumber: "75192"`, `price: "849.99"`, `priority: 5` | High priority item |
| Wishlist Item 2 | `id: fixed-uuid-2`, `userId: DEV_USER_SUB`, `title: "Hogwarts Castle"`, `store: "LEGO"`, `setNumber: "71043"`, `price: "469.99"`, `priority: 4` | Medium priority |
| Wishlist Item 3 | `id: fixed-uuid-3`, `userId: DEV_USER_SUB`, `title: "Tower Bridge"`, `store: "Amazon"`, `setNumber: "10214"`, `price: "299.99"`, `priority: 2` | Different store |
| Wishlist Item 4 | `id: fixed-uuid-4`, `userId: other-user-id`, `title: "Other User Item"`, `store: "LEGO"` | For 403 test |

### Requirements

- **Deterministic:** Use fixed UUIDs (e.g., `11111111-1111-1111-1111-111111111001`)
- **Idempotent:** Use `ON CONFLICT DO UPDATE` for safe re-runs
- **Location:** `apps/api/core/database/seeds/wishlist.ts`
- **Execution:** `pnpm seed` runs without error

## 12. Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| Test ID | Endpoint | Description | Expected |
|---------|----------|-------------|----------|
| LIST-HP-001 | List | List items for user with items | 200, items array with pagination |
| LIST-HP-002 | List | List with pagination params | 200, correct page offset |
| GET-HP-001 | Get | Get item by valid ID | 200, full item object |
| SEARCH-HP-001 | Search | Search with query | 200, matching items |

### Error Cases

| Test ID | Endpoint | Description | Expected |
|---------|----------|-------------|----------|
| AUTH-ERR-001 | All | No Authorization header | 401 Unauthorized |
| GET-ERR-001 | Get | Invalid UUID format | 400 Bad Request |
| GET-ERR-002 | Get | Non-existent ID | 404 Not Found |
| GET-ERR-003 | Get | Item owned by other user | 403 Forbidden |
| SEARCH-ERR-001 | Search | Empty `q` parameter | 400 Bad Request |

### Edge Cases

| Test ID | Endpoint | Description | Expected |
|---------|----------|-------------|----------|
| PAGE-EDGE-001 | List | Page beyond total | 200, empty items |
| PAGE-EDGE-002 | List | Limit > 100 | Capped to 100 |
| DATA-EDGE-001 | Get | Item with null optional fields | Nulls preserved |
| SEARCH-EDGE-001 | Search | Query with special chars | Escaped safely |

### Evidence Expectations

- All `.http` requests executed and responses captured
- Unit tests pass: `pnpm test packages/backend/wishlist-core`
- Build succeeds: `pnpm build`
- Seed runs: `pnpm seed`

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|----------------------------|-------|--------|---------|
| 2026-01-18T20:14:00-07:00 | PM | Generated story from index | `plans/stories/story-004/story.20260118-2014.md` |
