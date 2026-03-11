# STORY-010: MOC Parts Lists Management - Implementation Plan

## Scope Surface

- **backend/API:** yes
- **frontend/UI:** no
- **infra/config:** yes
- **notes:** This is a backend-only story migrating 7 AWS Lambda endpoints to Vercel serverless functions. Following the `@repo/gallery-core` pattern for the new `@repo/moc-parts-lists-core` package.

---

## Acceptance Criteria Checklist

### Core CRUD Operations
- [ ] AC-1: POST create parts list with title (required), returns 201 with generated id
- [ ] AC-2: POST create accepts optional `parts` array to initialize
- [ ] AC-3: GET returns all parts lists for MOC with nested `parts` array
- [ ] AC-4: PUT updates metadata fields (title, description, notes, costEstimate, actualCost), returns 200
- [ ] AC-5: DELETE removes parts list AND cascades to `moc_parts`, returns 204

### Status Updates
- [ ] AC-6: PATCH `/status` updates `built` and/or `purchased` flags, returns 200

### CSV Parsing
- [ ] AC-7: POST `/parse` accepts CSV content and parses it
- [ ] AC-8: CSV columns: Part ID, Part Name, Quantity, Color
- [ ] AC-9: Parse returns 400 for missing/invalid columns
- [ ] AC-10: Parse returns 400 if CSV exceeds 10,000 rows
- [ ] AC-11: Parse returns 400 if quantity is not a positive integer
- [ ] AC-12: Parse is atomic (transaction rollback on failure)
- [ ] AC-13: Parse uses batch insert (1,000 row chunks)

### User Summary
- [ ] AC-14: GET `/api/user/parts-lists/summary` returns aggregated stats

### Auth & Authorization
- [ ] AC-15: All endpoints require valid Cognito JWT, returns 401 if missing
- [ ] AC-16: All endpoints verify user owns MOC, returns 404 if not
- [ ] AC-17: Parts list operations verify parts list belongs to MOC, returns 404 if not

### Error Handling
- [ ] AC-18: Invalid request body returns 400 with VALIDATION_ERROR code
- [ ] AC-19: Database errors return 500 with INTERNAL_ERROR code

---

## Files To Touch (Expected)

### New Package: `packages/backend/moc-parts-lists-core/`
| File | Purpose |
|------|---------|
| `package.json` | Package config (follows gallery-core pattern) |
| `tsconfig.json` | TypeScript config |
| `vitest.config.ts` | Test config |
| `src/index.ts` | Package exports |
| `src/__types__/index.ts` | Zod schemas for all input/output types |
| `src/create-parts-list.ts` | Create parts list core function |
| `src/get-parts-lists.ts` | Get all parts lists for MOC |
| `src/update-parts-list.ts` | Update metadata |
| `src/update-parts-list-status.ts` | Update built/purchased flags |
| `src/delete-parts-list.ts` | Delete with cascade |
| `src/parse-parts-csv.ts` | Parse and import CSV |
| `src/get-user-summary.ts` | Aggregated user statistics |
| `src/__tests__/create-parts-list.test.ts` | Unit tests |
| `src/__tests__/get-parts-lists.test.ts` | Unit tests |
| `src/__tests__/update-parts-list.test.ts` | Unit tests |
| `src/__tests__/update-parts-list-status.test.ts` | Unit tests |
| `src/__tests__/delete-parts-list.test.ts` | Unit tests |
| `src/__tests__/parse-parts-csv.test.ts` | Unit tests |
| `src/__tests__/get-user-summary.test.ts` | Unit tests |

### Vercel API Routes: `apps/api/platforms/vercel/api/`
| File | Route |
|------|-------|
| `moc-instructions/[mocId]/parts-lists/index.ts` | POST/GET /api/moc-instructions/:mocId/parts-lists |
| `moc-instructions/[mocId]/parts-lists/[id].ts` | PUT/DELETE /api/moc-instructions/:mocId/parts-lists/:id |
| `moc-instructions/[mocId]/parts-lists/[id]/status.ts` | PATCH /api/.../status |
| `moc-instructions/[mocId]/parts-lists/[id]/parse.ts` | POST /api/.../parse |
| `user/parts-lists/summary.ts` | GET /api/user/parts-lists/summary |

### Infra/Config
| File | Change |
|------|--------|
| `apps/api/platforms/vercel/vercel.json` | Add 5 route rewrites |

### Seed & Test Data
| File | Purpose |
|------|---------|
| `apps/api/core/database/seeds/moc-parts-lists.ts` | New seed file |
| `apps/api/core/database/seeds/index.ts` | Import new seed |
| `apps/api/core/database/seeds/test-parts-list.csv` | Sample CSV for parse tests |

### HTTP Contract
| File | Purpose |
|------|---------|
| `__http__/moc-parts-lists.http` | HTTP test definitions |

---

## Reuse Targets

### Existing Packages to Reuse
| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging in handlers |
| `@repo/gallery-core` | **Pattern reference** for DI, result types, schema structure |
| `drizzle-orm` | Database queries (eq, and, sql, inArray) |
| `zod` | Input validation schemas |
| `csv-parser` | CSV parsing (npm package, needs install) |

### Patterns to Copy from `@repo/gallery-core`
1. **DI interface pattern**: `CreatePartsListDbClient`, `GetPartsListsDbClient`, etc.
2. **Schema interface pattern**: `CreatePartsListSchema` with table references
3. **Discriminated union result types**: `{ success: true, data } | { success: false, error, message }`
4. **Zod schema exports**: Both schemas and inferred types
5. **Package structure**: `src/`, `src/__types__/`, `src/__tests__/`

### Patterns to Copy from Existing Vercel Handlers
1. **Auth bypass pattern**: `getAuthUserId()` checking `AUTH_BYPASS` env var
2. **DB singleton pattern**: `getDb()` with lazy pool initialization
3. **Inline schema definition**: Define table schema inline in handler
4. **Method validation**: Check `req.method` at start of handler
5. **Error response format**: `{ error: string, message: string }`

---

## Architecture Notes (Ports & Adapters)

### Core Package Boundaries
```
@repo/moc-parts-lists-core (Port)
- Pure TypeScript, platform-agnostic
- Receives DB client via dependency injection
- Owns all business logic for parts list operations
- Owns CSV parsing logic (not in handlers)
- Owns validation schemas
- Returns discriminated union results
```

### Vercel Handlers (Adapters)
```
apps/api/platforms/vercel/api/.../
- HTTP request/response handling
- Auth extraction (DEV_USER_SUB or JWT)
- Route parameter extraction (mocId, id)
- Invokes core functions with injected DB
- Maps core results to HTTP status codes
```

### Database Schema (Already Exists)
```
moc_parts_lists
- id, mocId, title, description, built, purchased, notes
- costEstimate, actualCost, totalPartsCount, acquiredPartsCount

moc_parts
- id, partsListId, partId, partName, quantity, color
- CASCADE DELETE from parts_list
```

### Prohibited Patterns
- NO business logic in Vercel handlers (delegate to core)
- NO CSV parsing in handlers (must be in core)
- NO duplicating auth/ownership verification (reuse pattern)
- NO console.log (use @repo/logger)

---

## Step-by-Step Plan (Small Steps)

### Phase 1: Package Setup (2 steps)

**Step 1: Create moc-parts-lists-core package skeleton**
- Objective: Set up the new package with config files
- Files:
  - `packages/backend/moc-parts-lists-core/package.json`
  - `packages/backend/moc-parts-lists-core/tsconfig.json`
  - `packages/backend/moc-parts-lists-core/vitest.config.ts`
- Verification: `pnpm install` succeeds from monorepo root

**Step 2: Create Zod schemas and types**
- Objective: Define all input/output schemas following story spec
- Files:
  - `packages/backend/moc-parts-lists-core/src/__types__/index.ts`
- Verification: `pnpm check-types` succeeds on new package

### Phase 2: Core Functions - CRUD (5 steps)

**Step 3: Implement createPartsList core function**
- Objective: Create parts list with optional initial parts
- Files:
  - `packages/backend/moc-parts-lists-core/src/create-parts-list.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/create-parts-list.test.ts`
- Verification: `pnpm test` passes for create-parts-list.test.ts

**Step 4: Implement getPartsLists core function**
- Objective: Get all parts lists for a MOC with nested parts
- Files:
  - `packages/backend/moc-parts-lists-core/src/get-parts-lists.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/get-parts-lists.test.ts`
- Verification: `pnpm test` passes for get-parts-lists.test.ts

**Step 5: Implement updatePartsList core function**
- Objective: Update metadata fields
- Files:
  - `packages/backend/moc-parts-lists-core/src/update-parts-list.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/update-parts-list.test.ts`
- Verification: `pnpm test` passes for update-parts-list.test.ts

**Step 6: Implement updatePartsListStatus core function**
- Objective: Update built/purchased flags
- Files:
  - `packages/backend/moc-parts-lists-core/src/update-parts-list-status.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/update-parts-list-status.test.ts`
- Verification: `pnpm test` passes for update-parts-list-status.test.ts

**Step 7: Implement deletePartsList core function**
- Objective: Delete parts list with cascade verification
- Files:
  - `packages/backend/moc-parts-lists-core/src/delete-parts-list.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/delete-parts-list.test.ts`
- Verification: `pnpm test` passes for delete-parts-list.test.ts

### Phase 3: Core Functions - CSV & Summary (2 steps)

**Step 8: Implement parsePartsCsv core function**
- Objective: Parse CSV, validate, batch insert in transaction
- Files:
  - `packages/backend/moc-parts-lists-core/src/parse-parts-csv.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/parse-parts-csv.test.ts`
- Verification: `pnpm test` passes for parse-parts-csv.test.ts

**Step 9: Implement getUserSummary core function**
- Objective: Aggregate stats across all user MOCs
- Files:
  - `packages/backend/moc-parts-lists-core/src/get-user-summary.ts`
  - `packages/backend/moc-parts-lists-core/src/__tests__/get-user-summary.test.ts`
- Verification: `pnpm test` passes for get-user-summary.test.ts

### Phase 4: Package Index (1 step)

**Step 10: Create package index with exports**
- Objective: Export all functions, types, schemas
- Files:
  - `packages/backend/moc-parts-lists-core/src/index.ts`
- Verification: `pnpm build` succeeds for moc-parts-lists-core

### Phase 5: Vercel Handlers (4 steps)

**Step 11: Create POST/GET parts-lists handler**
- Objective: Create and list parts lists for a MOC
- Files:
  - `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/index.ts`
- Verification: Handler file compiles without errors

**Step 12: Create PUT/DELETE parts-list handler**
- Objective: Update and delete individual parts list
- Files:
  - `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id].ts`
- Verification: Handler file compiles without errors

**Step 13: Create PATCH status handler**
- Objective: Update built/purchased status
- Files:
  - `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/status.ts`
- Verification: Handler file compiles without errors

**Step 14: Create POST parse handler**
- Objective: Parse CSV and import parts
- Files:
  - `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/parse.ts`
- Verification: Handler file compiles without errors

**Step 15: Create GET user summary handler**
- Objective: Return aggregated user statistics
- Files:
  - `apps/api/platforms/vercel/api/user/parts-lists/summary.ts`
- Verification: Handler file compiles without errors

### Phase 6: Infra & Seed (3 steps)

**Step 16: Update vercel.json with routes**
- Objective: Add rewrites for all 5 API routes
- Files:
  - `apps/api/platforms/vercel/vercel.json`
- Verification: JSON is valid, routes are in correct order (specific before parameterized)

**Step 17: Create seed data for parts lists**
- Objective: Create deterministic test data for HTTP tests
- Files:
  - `apps/api/core/database/seeds/moc-parts-lists.ts`
  - `apps/api/core/database/seeds/test-parts-list.csv`
  - `apps/api/core/database/seeds/index.ts` (add import)
- Verification: `pnpm seed` succeeds without errors

**Step 18: Create HTTP contract tests**
- Objective: Define all required .http requests
- Files:
  - `__http__/moc-parts-lists.http`
- Verification: File is valid HTTP format

### Phase 7: Verification (1 step)

**Step 19: Full verification cycle**
- Objective: Run all quality gates
- Files: None (verification only)
- Verification:
  - `pnpm lint` (no new errors)
  - `pnpm check-types` (no new errors)
  - `pnpm test` (all new tests pass)
  - `pnpm build` (clean build)
  - All .http requests execute successfully

---

## Test Plan

### Unit Tests (Core Package)
```bash
# Run all moc-parts-lists-core tests
cd packages/backend/moc-parts-lists-core && pnpm test

# Expected: 7 test files, ~40 test cases covering:
# - Happy path for each function
# - Error cases (validation, not found, forbidden)
# - Edge cases (empty arrays, nulls)
```

### Type Checking
```bash
pnpm check-types
# Expected: No new errors in packages/backend/moc-parts-lists-core
# Expected: No new errors in apps/api/platforms/vercel
```

### Linting
```bash
pnpm lint
# Expected: No new errors
```

### HTTP Contract Tests
```bash
# Execute via REST Client extension or curl
# See __http__/moc-parts-lists.http

# Required tests:
# - createPartsList (201)
# - createPartsListWithParts (201)
# - getPartsLists (200)
# - updatePartsList (200)
# - updatePartsListStatus (200)
# - deletePartsList (204)
# - parseCsv (200)
# - parseCsvInvalid (400)
# - parseCsvOverLimit (400)
# - getUserSummary (200)
# - createPartsListUnauth (401)
# - createPartsListNotFound (404)
```

### Playwright
- **NOT APPLICABLE** - Backend-only story with no UI changes

---

## Stop Conditions / Blockers

### No Blockers Identified

The story specification is comprehensive and includes:
- All 7 endpoint definitions with paths and methods
- All acceptance criteria clearly defined
- Database schema already exists (moc_parts_lists, moc_parts tables)
- Existing AWS Lambda handlers provide reference implementation
- Clear patterns established by STORY-007 (gallery-core)

### Assumptions Made
1. **csv-parser npm package** is acceptable for CSV parsing (already used in AWS handler)
2. **Seed data** will create a test MOC owned by DEV_USER_SUB for testing
3. **CSV format** follows exact column names: "Part ID", "Part Name", "Quantity", "Color"
4. **User summary** returns simpler stats than AWS version: totalLists, totalParts, listsBuilt, listsPurchased (per story spec, not the AWS byStatus format)

### Potential Risks
1. **Vercel timeout**: Parse endpoint may timeout on large CSVs with Hobby tier (10s limit). Story notes this is acceptable.
2. **Transaction support**: Drizzle transaction API must work with Vercel's pg pool. Test with actual CSV import.
