# IMPLEMENTATION PLAN: STORY-004

**Story:** Wishlist - Read Operations
**Started:** 2026-01-18T20:35:00-07:00
**Status:** In Progress

---

## Scope Surface

| Area | Impacted | Notes |
|------|----------|-------|
| Backend/API | **YES** | 3 Vercel endpoints + core package |
| Frontend/UI | NO | Backend-only story |
| Infra/Config | YES | vercel.json rewrites, seed data |

---

## Acceptance Criteria Checklist

### AC 6.1 List Wishlist Items (`GET /api/wishlist/list`)
- [ ] Returns 200 OK with paginated list
- [ ] Response includes: `items[]`, `pagination.page`, `pagination.limit`, `pagination.total`, `pagination.totalPages`
- [ ] Default pagination: `page=1`, `limit=20`
- [ ] Default sort: `createdAt DESC`
- [ ] Maximum limit capped at 100
- [ ] Returns empty `items[]` with `total=0` for users with no items
- [ ] Returns 401 Unauthorized without valid auth token

### AC 6.2 Get Wishlist Item (`GET /api/wishlist/:id`)
- [ ] Returns 200 OK with full wishlist item object
- [ ] Response includes all fields (id, userId, title, store, etc.)
- [ ] Null optional fields returned as `null`
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] Returns 404 Not Found for non-existent ID
- [ ] Returns 403 Forbidden for item belonging to another user
- [ ] Returns 401 Unauthorized without valid auth token

### AC 6.3 Search Wishlist Items (`GET /api/wishlist/search`)
- [ ] Returns 200 OK with matching items
- [ ] Search is case-insensitive (PostgreSQL `ILIKE`)
- [ ] Search queries `title` field only
- [ ] Supports pagination
- [ ] Returns 400 Bad Request if `q` parameter missing or empty
- [ ] Returns 401 Unauthorized without valid auth token

### AC 6.4 Core Package
- [ ] `packages/backend/wishlist-core/` created
- [ ] Functions accept DB client via dependency injection
- [ ] Zod schemas define input/output types
- [ ] Unit tests cover happy path and error cases

### AC 6.5 Seed Data
- [ ] Seed file at `apps/api/core/database/seeds/wishlist.ts`
- [ ] Creates at least 3 items for DEV_USER_SUB
- [ ] Deterministic (fixed UUIDs)
- [ ] Idempotent (upsert)
- [ ] `pnpm seed` succeeds

---

## Files to Touch

### Create

| File | Purpose |
|------|---------|
| `packages/backend/wishlist-core/package.json` | Package manifest |
| `packages/backend/wishlist-core/tsconfig.json` | TypeScript config |
| `packages/backend/wishlist-core/vitest.config.ts` | Test config |
| `packages/backend/wishlist-core/src/index.ts` | Package exports |
| `packages/backend/wishlist-core/src/__types__/index.ts` | Zod schemas |
| `packages/backend/wishlist-core/src/list-wishlist-items.ts` | List core logic |
| `packages/backend/wishlist-core/src/get-wishlist-item.ts` | Get core logic |
| `packages/backend/wishlist-core/src/search-wishlist-items.ts` | Search core logic |
| `packages/backend/wishlist-core/src/__tests__/list-wishlist-items.test.ts` | List tests |
| `packages/backend/wishlist-core/src/__tests__/get-wishlist-item.test.ts` | Get tests |
| `packages/backend/wishlist-core/src/__tests__/search-wishlist-items.test.ts` | Search tests |
| `apps/api/platforms/vercel/api/wishlist/list.ts` | List endpoint |
| `apps/api/platforms/vercel/api/wishlist/[id].ts` | Get endpoint |
| `apps/api/platforms/vercel/api/wishlist/search.ts` | Search endpoint |
| `apps/api/core/database/seeds/wishlist.ts` | Seed data |
| `/__http__/wishlist.http` | HTTP test file |

### Modify

| File | Change |
|------|--------|
| `apps/api/core/database/seeds/index.ts` | Import and call `seedWishlist` |
| `apps/api/platforms/vercel/vercel.json` | Add wishlist routes |

---

## Reuse Targets

| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging |
| `drizzle-orm` | Database queries |
| `zod` | Schema validation |
| `pg` | PostgreSQL client |

---

## Ports & Adapters Boundaries

### Core Layer (Transport-Agnostic)
- `packages/backend/wishlist-core/`
- Functions: `listWishlistItems`, `getWishlistItemById`, `searchWishlistItems`
- Accept: DB client, schema references, userId, filters
- Return: Typed results or error discriminated unions

### Adapter Layer (Vercel-Specific)
- `apps/api/platforms/vercel/api/wishlist/*.ts`
- Handle HTTP request/response
- Auth extraction
- Query param parsing
- Error mapping to HTTP status codes

---

## Step-by-Step Plan

### Chunk 1: Create wishlist-core package scaffolding
1. Create package.json
2. Create tsconfig.json
3. Create vitest.config.ts
4. Create __types__/index.ts with Zod schemas

### Chunk 2: Implement core functions
1. Create list-wishlist-items.ts
2. Create get-wishlist-item.ts
3. Create search-wishlist-items.ts
4. Create index.ts exports

### Chunk 3: Add unit tests for core
1. Create list-wishlist-items.test.ts
2. Create get-wishlist-item.test.ts
3. Create search-wishlist-items.test.ts

### Chunk 4: Create Vercel endpoints
1. Create api/wishlist/list.ts
2. Create api/wishlist/[id].ts
3. Create api/wishlist/search.ts
4. Update vercel.json with routes

### Chunk 5: Create seed data
1. Create seeds/wishlist.ts with 4 deterministic items
2. Update seeds/index.ts to call seedWishlist

### Chunk 6: Create HTTP test file
1. Create /__http__/wishlist.http with all test requests

---

## Test Plan

### Commands to Run

```bash
# Build
pnpm build

# Type check
pnpm check-types

# Lint touched files
pnpm lint packages/backend/wishlist-core apps/api/platforms/vercel/api/wishlist

# Unit tests
pnpm test packages/backend/wishlist-core

# Seed
pnpm seed
```

### HTTP Tests to Execute
- #listWishlistItems → 200
- #listWishlistItemsPaginated → 200
- #getWishlistItem → 200
- #getWishlistItemInvalidId → 400
- #getWishlistItemNotFound → 404
- #searchWishlistItems → 200
- #searchWishlistItemsEmpty → 400
- #listWithoutAuth → 401 (if AUTH_BYPASS=false)

---

## Stop Conditions

1. If any port configuration is required → STOP
2. If database schema changes are needed → STOP
3. If OpenSearch is required (per story, deferred) → Use DB-only search
4. If tests cannot run → Document in BLOCKERS.md

---

## Architecture Compliance

- Core logic in `packages/backend/wishlist-core/` ✓
- Adapters in `apps/api/platforms/vercel/api/wishlist/` ✓
- No per-story one-off utilities ✓
- Follows sets-core pattern exactly ✓
