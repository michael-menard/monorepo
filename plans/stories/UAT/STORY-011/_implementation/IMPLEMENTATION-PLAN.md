# IMPLEMENTATION PLAN: STORY-011

## MOC Instructions - Read Operations

---

# Scope Surface

- **backend/API**: YES
- **frontend/UI**: NO
- **infra/config**: YES (vercel.json routes, seed data)
- **notes**: Backend-only story. Playwright NOT APPLICABLE. HTTP contract verification via `.http` file.

---

# Acceptance Criteria Checklist

- [ ] AC-1: GET /api/mocs/:id returns MOC with files, isOwner flag, ownership-aware visibility
- [ ] AC-2: GET /api/mocs returns paginated list with search/tag filter, auth required
- [ ] AC-3: GET /api/mocs/stats/by-category returns theme/tag aggregation (auth required)
- [ ] AC-4: GET /api/mocs/stats/uploads-over-time returns 12-month time-series (auth required)
- [ ] AC-5: moc-instructions-core package with getMoc, listMocs, getMocStatsByCategory, getMocUploadsOverTime
- [ ] AC-6: Seed data with 8+ MOCs, files, varied statuses/dates for testing
- [ ] AC-7: HTTP contract verification file with all endpoint requests

---

# Files To Touch (Expected)

## New Package: `packages/backend/moc-instructions-core/`

| File | Purpose |
|------|---------|
| `package.json` | Package manifest (copy from moc-parts-lists-core template) |
| `tsconfig.json` | TypeScript config (copy from moc-parts-lists-core) |
| `vitest.config.ts` | Test config (copy from moc-parts-lists-core) |
| `src/index.ts` | Package exports |
| `src/__types__/index.ts` | Zod schemas for filters, DB row shapes, results |
| `src/get-moc.ts` | Get single MOC with ownership-aware access |
| `src/list-mocs.ts` | List MOCs with pagination/search/tag filter |
| `src/get-moc-stats-by-category.ts` | Category aggregation stats |
| `src/get-moc-uploads-over-time.ts` | Time-series upload stats |
| `src/__tests__/get-moc.test.ts` | Unit tests for getMoc |
| `src/__tests__/list-mocs.test.ts` | Unit tests for listMocs |
| `src/__tests__/get-moc-stats-by-category.test.ts` | Unit tests for stats |
| `src/__tests__/get-moc-uploads-over-time.test.ts` | Unit tests for uploads-over-time |

## New Vercel Handlers: `apps/api/platforms/vercel/api/mocs/`

| File | Purpose |
|------|---------|
| `[id].ts` | GET /api/mocs/:id handler |
| `index.ts` | GET /api/mocs handler (list) |
| `stats/by-category.ts` | GET /api/mocs/stats/by-category handler |
| `stats/uploads-over-time.ts` | GET /api/mocs/stats/uploads-over-time handler |

## Modified Files

| File | Change |
|------|--------|
| `apps/api/platforms/vercel/vercel.json` | Add 4 new routes (stats before :id) |
| `apps/api/core/database/seeds/index.ts` | Import and call seedMocs |

## New Files

| File | Purpose |
|------|---------|
| `apps/api/core/database/seeds/mocs.ts` | MOC seed data |
| `__http__/mocs.http` | HTTP contract requests |

---

# Reuse Targets

| Package/Module | Reuse Purpose |
|----------------|---------------|
| `@repo/api-types/moc` | MocInstructionSchema, MocListQuerySchema, MocFileSchema, MocDetailResponse |
| `@repo/logger` | Logging in handlers |
| `packages/backend/db` | Drizzle schema (mocInstructions, mocFiles, mocGalleryImages, mocPartsLists) |
| `gallery-core DI pattern` | GetMocDbClient interface pattern for dependency injection |
| `gallery-core result types` | Discriminated union: `{ success: true, data } | { success: false, error, message }` |
| `gallery/images/search.ts` | ILIKE search pattern with `tags::text ILIKE` |
| `gallery.ts seed` | Upsert pattern with ON CONFLICT DO UPDATE |

---

# Architecture Notes (Ports & Adapters)

## Core Package (Ports)
- `packages/backend/moc-instructions-core/` contains pure business logic
- Each function accepts DB client via DI interface (e.g., `GetMocDbClient`)
- Returns discriminated union result types
- No infrastructure dependencies (S3, OpenSearch, Redis)
- Validates input with Zod, queries with Drizzle patterns

## Vercel Handlers (Adapters)
- `apps/api/platforms/vercel/api/mocs/` handles HTTP concerns
- Auth extraction via AUTH_BYPASS pattern
- Inline schema definitions (Drizzle pgTable)
- Singleton DB client pattern
- Transforms core results to HTTP responses
- CDN URLs only (no presigned URLs for MVP)

## Boundaries to Protect
- Core functions must NOT know about Vercel, HTTP, or response formatting
- Core functions must NOT import from handler code
- Handlers must NOT contain business logic beyond request/response transformation
- Anonymous access allowed for published MOCs (getMoc only)

---

# Step-by-Step Plan (Small Steps)

## Step 1: Create moc-instructions-core package scaffold

**Objective**: Establish package structure with config files

**Files**:
- `packages/backend/moc-instructions-core/package.json`
- `packages/backend/moc-instructions-core/tsconfig.json`
- `packages/backend/moc-instructions-core/vitest.config.ts`
- `packages/backend/moc-instructions-core/src/index.ts` (empty exports)
- `packages/backend/moc-instructions-core/src/__types__/index.ts` (stub)

**Verification**: `ls packages/backend/moc-instructions-core/` shows all files

---

## Step 2: Define Zod schemas in __types__/index.ts

**Objective**: Create operation-specific schemas

**Files**:
- `packages/backend/moc-instructions-core/src/__types__/index.ts`

**Schemas to define**:
- `MocRowSchema` (DB row with Date fields)
- `MocFileRowSchema` (DB row for eager loading)
- `MocDetailSchema` (API response with files, isOwner)
- `ListMocsFiltersSchema` (page, limit, search, tag)
- `ListMocsResponseSchema` (data array, pagination metadata)
- `CategoryStatSchema`, `CategoryStatsResponseSchema`
- `UploadsOverTimeSchema`, `UploadsOverTimeResponseSchema`

**Verification**: `pnpm tsc --noEmit` in package directory

---

## Step 3: Implement getMoc core function

**Objective**: Platform-agnostic get single MOC with ownership-aware access

**Files**:
- `packages/backend/moc-instructions-core/src/get-moc.ts`
- `packages/backend/moc-instructions-core/src/index.ts` (add export)

**Logic**:
1. Validate mocId is UUID (return NOT_FOUND for invalid)
2. Query MOC by ID
3. If not found, return NOT_FOUND
4. Determine isOwner (userId === moc.userId)
5. If status !== 'published' and !isOwner, return NOT_FOUND (prevent existence leak)
6. Query files (exclude soft-deleted: deletedAt IS NULL)
7. Query gallery images via mocGalleryImages join
8. Query parts lists
9. Return success with MOC + files + images + partsLists + isOwner flag

**Verification**: `pnpm vitest run src/__tests__/get-moc.test.ts`

---

## Step 4: Write unit tests for getMoc

**Objective**: Cover happy path and error cases

**Files**:
- `packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts`

**Test cases**:
- Returns MOC with files for owner (isOwner: true)
- Returns published MOC for anonymous (isOwner: false)
- Returns NOT_FOUND for non-existent ID
- Returns NOT_FOUND for invalid UUID format
- Returns NOT_FOUND for draft MOC as non-owner
- Returns NOT_FOUND for archived MOC as non-owner
- Excludes soft-deleted files (deletedAt set)
- Handles null description/tags/theme

**Verification**: `pnpm vitest run src/__tests__/get-moc.test.ts` passes

---

## Step 5: Implement listMocs core function

**Objective**: Paginated list with search and tag filter

**Files**:
- `packages/backend/moc-instructions-core/src/list-mocs.ts`
- `packages/backend/moc-instructions-core/src/index.ts` (add export)

**Logic**:
1. Parse filters (page, limit, search, tag) with defaults
2. Cap limit at 100
3. Build WHERE: userId = :userId (always filter to owner's MOCs)
4. If search: add ILIKE on title OR description
5. If tag: add tags @> [tag]::jsonb
6. Count total matching
7. Query with ORDER BY updatedAt DESC, LIMIT, OFFSET
8. Return { data: [...], page, limit, total }

**Verification**: `pnpm vitest run src/__tests__/list-mocs.test.ts`

---

## Step 6: Write unit tests for listMocs

**Objective**: Cover pagination, search, tag filter, empty results

**Files**:
- `packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts`

**Test cases**:
- Returns paginated array of user's MOCs
- Respects page/limit params
- Default page=1, limit=20
- Caps limit at 100
- Search filters by title ILIKE
- Search filters by description ILIKE
- Tag filter matches MOCs with tag
- Returns empty array when no MOCs
- Returns empty array for page beyond total
- Special chars in search handled safely (%, _)

**Verification**: `pnpm vitest run src/__tests__/list-mocs.test.ts` passes

---

## Step 7: Implement getMocStatsByCategory core function

**Objective**: Aggregate stats by theme and tags

**Files**:
- `packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts`
- `packages/backend/moc-instructions-core/src/index.ts` (add export)

**Logic**:
1. Query themes: GROUP BY theme WHERE theme IS NOT NULL, count
2. Query tags: SELECT tags WHERE tags IS NOT NULL, flatten and count
3. Combine, deduplicate (case-insensitive)
4. Sort by count DESC, take top 10
5. Return { data: [{category, count}], total }

**Verification**: `pnpm vitest run src/__tests__/get-moc-stats-by-category.test.ts`

---

## Step 8: Write unit tests for getMocStatsByCategory

**Objective**: Cover aggregation logic

**Files**:
- `packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts`

**Test cases**:
- Returns theme stats for user's MOCs
- Returns tag stats for MOCs without themes
- Combines themes and tags without duplicates
- Returns top 10 sorted by count
- Returns empty array when user has no MOCs
- Filters to only authenticated user's MOCs

**Verification**: `pnpm vitest run src/__tests__/get-moc-stats-by-category.test.ts` passes

---

## Step 9: Implement getMocUploadsOverTime core function

**Objective**: Time-series upload data for last 12 months

**Files**:
- `packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts`
- `packages/backend/moc-instructions-core/src/index.ts` (add export)

**Logic**:
1. Query: DATE_TRUNC('month', createdAt), theme, COUNT(*)
2. WHERE userId = :userId AND createdAt >= NOW() - INTERVAL '12 months'
3. GROUP BY month, theme
4. ORDER BY month ASC
5. Transform date to YYYY-MM format
6. Return { data: [{date, category, count}] }

**Verification**: `pnpm vitest run src/__tests__/get-moc-uploads-over-time.test.ts`

---

## Step 10: Write unit tests for getMocUploadsOverTime

**Objective**: Cover time-series aggregation

**Files**:
- `packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts`

**Test cases**:
- Returns time-series data grouped by month and theme
- Filters to last 12 months only
- Excludes MOCs older than 12 months
- Returns empty array when no MOCs in range
- Filters to authenticated user's MOCs only

**Verification**: `pnpm vitest run src/__tests__/get-moc-uploads-over-time.test.ts` passes

---

## Step 11: Run core package lint and build

**Objective**: Ensure package compiles and passes lint

**Files**: All core package files

**Verification**:
```bash
cd packages/backend/moc-instructions-core
pnpm eslint src --fix
pnpm tsc --noEmit
pnpm vitest run
```

---

## Step 12: Create Vercel handler for GET /api/mocs/:id

**Objective**: HTTP adapter for getMoc

**Files**:
- `apps/api/platforms/vercel/api/mocs/[id].ts`

**Logic**:
1. Only allow GET method
2. Extract userId from AUTH_BYPASS (allow null for anonymous)
3. Extract mocId from req.query.id
4. Validate UUID format (return 404 for invalid)
5. Call getMoc core function
6. Map result: success -> 200, NOT_FOUND -> 404, DB_ERROR -> 500

**Verification**: Manual test via vercel dev or .http file

---

## Step 13: Create Vercel handler for GET /api/mocs (list)

**Objective**: HTTP adapter for listMocs

**Files**:
- `apps/api/platforms/vercel/api/mocs/index.ts`

**Logic**:
1. Only allow GET method
2. Require authentication (return 401 if no userId)
3. Parse query params (page, limit, search, tag)
4. Validate pagination params (return 422 for invalid)
5. Call listMocs core function
6. Return 200 with { data, page, limit, total }

**Verification**: Manual test via vercel dev or .http file

---

## Step 14: Create Vercel handler for GET /api/mocs/stats/by-category

**Objective**: HTTP adapter for category stats

**Files**:
- `apps/api/platforms/vercel/api/mocs/stats/by-category.ts`

**Logic**:
1. Only allow GET method
2. Require authentication (return 401 if no userId)
3. Call getMocStatsByCategory core function
4. Return 200 with { success: true, data, total }

**Verification**: Manual test via vercel dev or .http file

---

## Step 15: Create Vercel handler for GET /api/mocs/stats/uploads-over-time

**Objective**: HTTP adapter for uploads time-series

**Files**:
- `apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts`

**Logic**:
1. Only allow GET method
2. Require authentication (return 401 if no userId)
3. Call getMocUploadsOverTime core function
4. Return 200 with { success: true, data }

**Verification**: Manual test via vercel dev or .http file

---

## Step 16: Update vercel.json routes

**Objective**: Add routing for new endpoints

**Files**:
- `apps/api/platforms/vercel/vercel.json`

**Routes to add** (ORDER MATTERS - stats before :id):
```json
{ "source": "/api/mocs/stats/by-category", "destination": "/api/mocs/stats/by-category.ts" },
{ "source": "/api/mocs/stats/uploads-over-time", "destination": "/api/mocs/stats/uploads-over-time.ts" },
{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" },
{ "source": "/api/mocs", "destination": "/api/mocs/index.ts" }
```

**Verification**: JSON syntax valid, routes in correct order

---

## Step 17: Create MOC seed data

**Objective**: Deterministic test data for all scenarios

**Files**:
- `apps/api/core/database/seeds/mocs.ts`

**Seed data requirements**:
- 8 MOCs with fixed UUIDs (moc-11111111-..., moc-22222222-..., etc.)
- Varied statuses: draft, published, archived, pending_review
- Varied themes and tags for stats testing
- MOC files: instructions, thumbnails, one soft-deleted
- Time-series: MOCs with createdAt 0, 3, 6, 12, 13 months ago
- Two users: dev-user, other-user

**Verification**: `pnpm seed` runs without error

---

## Step 18: Update seed index to include MOCs

**Objective**: Wire up MOC seed to seed command

**Files**:
- `apps/api/core/database/seeds/index.ts`

**Verification**: `pnpm seed` outputs MOC seed log messages

---

## Step 19: Create HTTP contract file

**Objective**: Document and test all endpoints

**Files**:
- `__http__/mocs.http`

**Requests to document**:
1. getMoc - GET /api/mocs/:id (published, owner)
2. getMoc404 - GET /api/mocs/:id (non-existent UUID)
3. getMocDraftAsOwner - GET /api/mocs/:id (draft, owner)
4. getMocDraftAsNonOwner - GET /api/mocs/:id (draft, non-owner -> 404)
5. listMocs - GET /api/mocs
6. listMocsWithPagination - GET /api/mocs?page=2&limit=5
7. listMocsWithSearch - GET /api/mocs?search=castle
8. listMocsEmpty - GET /api/mocs?search=nonexistent
9. getMocStatsByCategory - GET /api/mocs/stats/by-category
10. getMocUploadsOverTime - GET /api/mocs/stats/uploads-over-time

**Verification**: All requests return expected status codes

---

## Step 20: Final verification

**Objective**: Run all checks before marking complete

**Commands**:
```bash
# Core package checks
pnpm --filter @repo/moc-instructions-core build
pnpm --filter @repo/moc-instructions-core test

# Lint new files
pnpm eslint packages/backend/moc-instructions-core/src --fix
pnpm eslint apps/api/platforms/vercel/api/mocs --fix

# Type check
pnpm tsc --noEmit

# Seed and test endpoints
pnpm seed
# Execute __http__/mocs.http requests
```

**Verification**: All checks pass, all HTTP requests return expected responses

---

# Test Plan

## Unit Tests (Core Package)

```bash
pnpm --filter @repo/moc-instructions-core test
```

Expected: 4 test files, ~40+ test cases

## Integration Tests

```bash
# Seed database
pnpm seed

# Start Vercel dev server
cd apps/api/platforms/vercel && pnpm vercel dev
```

Execute all requests in `__http__/mocs.http`

## Type Check

```bash
pnpm check-types --filter @repo/moc-instructions-core
pnpm tsc --noEmit -p apps/api/platforms/vercel
```

## Lint

```bash
pnpm eslint packages/backend/moc-instructions-core/src --fix
pnpm eslint apps/api/platforms/vercel/api/mocs --fix
pnpm eslint apps/api/core/database/seeds/mocs.ts --fix
pnpm eslint __http__/mocs.http --fix  # if applicable
```

## Playwright

NOT APPLICABLE - Backend-only story, no UI changes.

## HTTP Contract Verification

Execute `__http__/mocs.http` and verify:
- All happy path requests return 200
- 404 requests return 404
- 401 requests return 401
- 422 requests return 422

---

# Stop Conditions / Blockers

**None identified.**

All required information is available:
- Story spec is complete with detailed AC
- AWS Lambda reference implementations exist in `apps/api/platforms/aws/endpoints/moc-instructions/`
- Database schema exists in `packages/backend/db/src/schema.ts`
- Existing patterns from gallery-core and moc-parts-lists-core provide templates
- API types exist in `@repo/api-types/moc`

Implementation can proceed without PM clarification.
