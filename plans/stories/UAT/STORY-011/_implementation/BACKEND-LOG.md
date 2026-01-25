# BACKEND-LOG: STORY-011

## Chunk 1 - Package Scaffold & Core Types

- **Objective**: Establish moc-instructions-core package structure with config files and Zod schemas (maps to AC-5)

- **Files changed**:
  - `packages/backend/moc-instructions-core/package.json` (NEW)
  - `packages/backend/moc-instructions-core/tsconfig.json` (NEW)
  - `packages/backend/moc-instructions-core/vitest.config.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/index.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/__types__/index.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/get-moc.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/list-mocs.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts` (NEW)

- **Summary of changes**:
  - Created package scaffold following moc-parts-lists-core template
  - Defined Zod schemas for MocRow, MocFileRow, MocDetail, ListMocsFilters, ListMocsResponse, CategoryStat, CategoryStatsResponse, UploadOverTime, UploadsOverTimeResponse
  - Implemented all 4 core functions with DI pattern (GetMocDbClient, ListMocsDbClient, etc.)
  - Core functions return discriminated union result types

- **Reuse compliance**:
  - Reused:
    - Package scaffold pattern from `moc-parts-lists-core`
    - DI pattern from `gallery-core`
    - Discriminated union result types from `gallery-core`
  - New:
    - `@repo/moc-instructions-core` package
    - MOC-specific Zod schemas for operations
  - Why new was necessary:
    - New package required per story spec for MOC read operations
    - MOC schemas differ from gallery (ownership-aware access, different fields)

- **Ports & adapters note**:
  - What stayed in core:
    - All business logic (ownership checks, pagination, aggregation)
    - Zod validation
    - DB interface abstractions
  - What stayed in adapters:
    - None yet (handlers created in next chunk)

- **Commands run**:
  - `pnpm install --filter @repo/moc-instructions-core` - SUCCESS
  - `pnpm tsc --noEmit` (in package dir) - SUCCESS

- **Notes / Risks**:
  - Core functions use simplified DB interfaces for testability
  - Vercel handlers will implement actual Drizzle queries
  - CDN URLs used for MVP (no presigned URLs per story non-goals)

---

## Chunk 2 - Unit Tests for Core Functions

- **Objective**: Comprehensive unit tests for all core functions (maps to AC-5)

- **Files changed**:
  - `packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts` (NEW)
  - `packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts` (NEW)

- **Summary of changes**:
  - Created 60 unit tests across 4 test files
  - getMoc: 18 tests (happy path, error cases, edge cases for ownership-aware access)
  - listMocs: 15 tests (pagination, search/tag filter, empty results)
  - getMocStatsByCategory: 15 tests (theme/tag aggregation, deduplication, top 10)
  - getMocUploadsOverTime: 12 tests (time-series, YYYY-MM format, null handling)

- **Reuse compliance**:
  - Reused:
    - Test structure pattern from `gallery-core/__tests__/`
    - Mock DB client pattern with vi.fn()
  - New:
    - MOC-specific mock helpers (createMockMocRow, createMockMocFileRow)
  - Why new was necessary:
    - Tests need MOC-specific fixtures matching MocRow/MocFileRow schemas

- **Ports & adapters note**:
  - What stayed in core: N/A (tests only)
  - What stayed in adapters: N/A (tests only)

- **Commands run**:
  - `pnpm test` (in package dir) - SUCCESS (60 tests passed)

- **Notes / Risks**:
  - Tests use mock DB clients (not real Drizzle) per gallery-core pattern
  - Integration testing will happen via .http file with seeded DB

---

## Chunk 3 - Vercel API Handlers

- **Objective**: Create Vercel serverless handlers for MOC read endpoints (maps to AC-1, AC-2, AC-3, AC-4)

- **Files changed**:
  - `apps/api/platforms/vercel/api/mocs/index.ts` (NEW)
  - `apps/api/platforms/vercel/api/mocs/[id].ts` (NEW)
  - `apps/api/platforms/vercel/api/mocs/stats/by-category.ts` (NEW)
  - `apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts` (NEW)

- **Summary of changes**:
  - GET /api/mocs: List MOCs with pagination, search, tag filter (AC-2)
    - page/limit pagination (defaults: page=1, limit=20, max=100)
    - ILIKE search on title/description
    - JSONB array containment for tag filter
    - Sort by updatedAt DESC
    - 422 for invalid pagination params
  - GET /api/mocs/:id: Get single MOC with files (AC-1)
    - Ownership-aware access control
    - Published MOCs visible to anyone
    - Draft/archived/pending_review only visible to owner
    - Returns 404 (not 403) for non-owner access to prevent existence leak
    - CDN URLs (no presigned URLs per non-goals)
  - GET /api/mocs/stats/by-category: Theme/tag aggregation (AC-3)
  - GET /api/mocs/stats/uploads-over-time: Time-series data (AC-4)

- **Reuse compliance**:
  - Reused:
    - Handler pattern from `gallery/images/search.ts` and `gallery/images/[id].ts`
    - DB singleton pattern
    - AUTH_BYPASS pattern
  - New:
    - MOC-specific handlers for new /api/mocs routes
  - Why new was necessary:
    - Different business logic (ownership-aware access, different fields)
    - Different endpoints than gallery

- **Ports & adapters note**:
  - What stayed in core:
    - N/A (handlers are adapters)
  - What stayed in adapters:
    - Vercel-specific request/response handling
    - Drizzle queries (inline for handler simplicity)
    - AUTH_BYPASS logic

- **Commands run**:
  - `pnpm tsc --noEmit` (moc-instructions-core) - SUCCESS

- **Notes / Risks**:
  - Handlers use inline schema definitions (consistent with existing gallery handlers)
  - Authentication uses AUTH_BYPASS for local dev (same as gallery)
  - CDN URLs used for MVP (no presigned URLs per story non-goals)

---

## Chunk 4 - vercel.json Routes

- **Objective**: Configure Vercel rewrites for new MOC endpoints

- **Files changed**:
  - `apps/api/platforms/vercel/vercel.json` (MODIFIED)

- **Summary of changes**:
  - Added 4 new rewrites:
    - `/api/mocs/stats/by-category` -> `/api/mocs/stats/by-category.ts`
    - `/api/mocs/stats/uploads-over-time` -> `/api/mocs/stats/uploads-over-time.ts`
    - `/api/mocs/:id` -> `/api/mocs/[id].ts`
    - `/api/mocs` -> `/api/mocs/index.ts`
  - Stats routes placed BEFORE parameterized routes to ensure proper matching

- **Reuse compliance**:
  - Reused:
    - Existing vercel.json rewrite pattern
  - New:
    - 4 new rewrite rules
  - Why new was necessary:
    - Required for routing to new endpoints

- **Ports & adapters note**:
  - What stayed in core: N/A
  - What stayed in adapters: vercel.json (platform-specific config)

- **Commands run**:
  - JSON validation via python3 - SUCCESS

- **Notes / Risks**:
  - None

---

## Chunk 5 - Seed Data & HTTP Contract

- **Objective**: Create test data and HTTP contract file for integration testing (maps to AC-6)

- **Files changed**:
  - `apps/api/core/database/seeds/mocs.ts` (NEW)
  - `apps/api/core/database/seeds/index.ts` (MODIFIED)
  - `__http__/mocs.http` (NEW)

- **Summary of changes**:
  - Created mocs.ts seed with:
    - 6 MOC records: 3 owned by dev user (published, draft, archived), 2 owned by other user, 1 set (not MOC)
    - 4 MOC file records linked to test MOCs
    - Idempotent inserts (ON CONFLICT DO NOTHING)
  - Updated seed index to include seedMocs
  - Created comprehensive HTTP contract with test cases for:
    - List with pagination, search, tag filter
    - Get detail (owner, non-owner, published, draft, archived)
    - Stats endpoints
    - Error cases (invalid params, 404s, 405s)

- **Reuse compliance**:
  - Reused:
    - Seed pattern from sets.ts
    - HTTP contract pattern from gallery.http
  - New:
    - MOC-specific seed data
    - MOC-specific HTTP contract
  - Why new was necessary:
    - Different table schema and test scenarios

- **Ports & adapters note**:
  - What stayed in core: N/A (test data)
  - What stayed in adapters: N/A (test data)

- **Commands run**:
  - `pnpm test` (moc-instructions-core) - SUCCESS (60 tests)
  - `pnpm tsc --noEmit` (moc-instructions-core) - SUCCESS

- **Notes / Risks**:
  - Seed data uses fixed UUIDs for deterministic testing
  - HTTP contract ready for manual integration testing

---

## Final Verification

- **Commands run**:
  - `pnpm test` (moc-instructions-core) - SUCCESS (60 tests passed)
  - `pnpm tsc --noEmit` (moc-instructions-core) - SUCCESS
  - JSON validation (vercel.json) - SUCCESS

- **Summary**:
  - All 60 unit tests pass
  - Type checking passes
  - vercel.json is valid JSON
  - All acceptance criteria covered:
    - AC-1: GET /api/mocs/:id with ownership-aware access
    - AC-2: GET /api/mocs with pagination, search, tag filter
    - AC-3: GET /api/mocs/stats/by-category
    - AC-4: GET /api/mocs/stats/uploads-over-time
    - AC-5: Ports & adapters architecture with moc-instructions-core package
    - AC-6: Seed data and HTTP contract for integration testing

---

BACKEND COMPLETE
