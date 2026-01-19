# DEV FEASIBILITY: STORY-004 — Wishlist Read Operations

## Feasibility Assessment: GREEN (Low Risk)

### Summary

STORY-004 follows the established pattern from STORY-002 (Sets Read Operations) and reuses existing infrastructure. The wishlist table schema already exists in the database. This is a straightforward port of the pattern with minimal new decisions required.

---

## Risk Analysis

### Low Risk Areas

| Area | Assessment | Notes |
|------|------------|-------|
| Database Schema | Exists | `wishlistItems` table defined in `apps/api/core/database/schema/index.ts` |
| Auth Pattern | Reusable | `@repo/vercel-adapter` provides `validateCognitoJwt` and `getJwtClaims` |
| DB Connection | Reusable | Pattern established in `apps/api/platforms/vercel/api/sets/*.ts` |
| Response Format | Reusable | Pagination structure matches sets endpoints |

### Medium Risk Areas

| Area | Assessment | Mitigation |
|------|------------|------------|
| OpenSearch Integration (Search) | New for Vercel | Defer search to follow-on story OR implement DB fallback |
| Seed Data | Required | Must create deterministic seed for wishlist items |

### Decision: OpenSearch Search Endpoint

**PM Decision:** The search endpoint (`GET /api/wishlist/search`) requires OpenSearch integration which adds complexity.

**Options:**
1. **Defer search to STORY-004a** — Ship list and get endpoints first, add search later
2. **Implement DB-only search** — Use PostgreSQL `ILIKE` as MVP, add OpenSearch later
3. **Full OpenSearch** — Implement OpenSearch client in this story

**Decision: Option 2 (DB-only search)** — Implement basic PostgreSQL text search using `ILIKE` on title field. This unblocks the story without OpenSearch dependency. OpenSearch enhancement can be a fast-follow.

---

## Change Surface Analysis

### Files to Create

| File | Purpose |
|------|---------|
| `apps/api/platforms/vercel/api/wishlist/list.ts` | List wishlist items endpoint |
| `apps/api/platforms/vercel/api/wishlist/[id].ts` | Get single wishlist item endpoint |
| `apps/api/platforms/vercel/api/wishlist/search.ts` | Search wishlist items endpoint |
| `packages/backend/wishlist-core/src/list-wishlist-items.ts` | Core business logic for list |
| `packages/backend/wishlist-core/src/get-wishlist-item.ts` | Core business logic for get |
| `packages/backend/wishlist-core/src/search-wishlist-items.ts` | Core business logic for search |
| `packages/backend/wishlist-core/src/__types__/index.ts` | Zod schemas for wishlist |
| `packages/backend/wishlist-core/src/index.ts` | Package exports |
| `packages/backend/wishlist-core/package.json` | Package manifest |
| `/__http__/wishlist.http` | HTTP test requests |
| `apps/api/core/database/seeds/wishlist.ts` | Seed data for testing |

### Files to Modify

| File | Change |
|------|--------|
| `apps/api/core/database/seeds/index.ts` | Add wishlist seed export |
| `apps/api/platforms/vercel/vercel.json` | Add wishlist route rewrites (if needed) |

### Dependencies

| Package | Required For | Already Installed |
|---------|--------------|-------------------|
| `drizzle-orm` | Database queries | Yes |
| `pg` | PostgreSQL client | Yes |
| `zod` | Schema validation | Yes |
| `@repo/logger` | Logging | Yes |
| `@vercel/node` | Vercel types | Yes |

---

## Hidden Dependencies

### 1. Database Schema Reference
The Vercel endpoint files currently inline the Drizzle table schema (see `sets/list.ts`). This is duplication but follows the established pattern. Consider extracting to shared package in future.

**Recommendation:** Follow existing pattern (inline schema) for consistency. Schema extraction is out of scope.

### 2. Seed Data Requirement
Tests require predictable data. Seed must be:
- Deterministic (same data every run)
- Idempotent (safe to run multiple times)
- User-scoped (uses `DEV_USER_SUB` from env)

**Recommendation:** Create `apps/api/core/database/seeds/wishlist.ts` with fixed UUIDs.

### 3. Auth Bypass for Local Dev
Local development uses `AUTH_BYPASS=true` which returns mock claims. This is already handled by the vercel-adapter.

---

## Missing AC Identified

1. **Pagination defaults** — What are the default `page` and `limit` values?
   - **PM Decision:** page=1, limit=20 (matching sets endpoints)

2. **Sort order** — What is the default sort for list endpoint?
   - **PM Decision:** `createdAt DESC` (most recent first)

3. **Search behavior** — Case-sensitive or case-insensitive?
   - **PM Decision:** Case-insensitive (`ILIKE`)

4. **Search fields** — Which fields does search query against?
   - **PM Decision:** `title` only (MVP). Expand to `notes`, `tags` in follow-on.

5. **Empty search query** — What happens if `q` param is empty?
   - **PM Decision:** Return 400 Bad Request with message "Search query is required"

---

## Mitigations for PM to Bake into AC

1. Add explicit pagination defaults to AC
2. Add explicit sort order to AC
3. Specify search behavior (case-insensitive, title-only)
4. Specify error response format (matches sets pattern)
5. Add seed data requirement to story scope

---

## Blockers

None identified. All dependencies exist and patterns are established.

---

## Recommendation

**PROCEED** — Story is implementable as scoped. OpenSearch deferred to DB-only search keeps scope manageable.
