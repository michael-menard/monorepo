# Plan Validation: STORY-010

## Summary
- Status: **VALID**
- Issues Found: 1
- Blockers: 0

---

## AC Coverage

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | POST create parts list with title, returns 201 | Step 3, Step 11 | OK |
| AC-2 | POST create accepts optional `parts` array | Step 3, Step 11 | OK |
| AC-3 | GET returns all parts lists with nested `parts` | Step 4, Step 11 | OK |
| AC-4 | PUT updates metadata fields, returns 200 | Step 5, Step 12 | OK |
| AC-5 | DELETE cascades to `moc_parts`, returns 204 | Step 7, Step 12 | OK |
| AC-6 | PATCH status updates built/purchased flags | Step 6, Step 13 | OK |
| AC-7 | POST parse accepts CSV content | Step 8, Step 14 | OK |
| AC-8 | CSV columns: Part ID, Part Name, Quantity, Color | Step 8 | OK |
| AC-9 | Parse returns 400 for missing/invalid columns | Step 8 | OK |
| AC-10 | Parse returns 400 if CSV exceeds 10,000 rows | Step 8 | OK |
| AC-11 | Parse returns 400 if quantity not positive integer | Step 8 | OK |
| AC-12 | Parse is atomic (transaction rollback) | Step 8 | OK |
| AC-13 | Parse uses batch insert (1,000 row chunks) | Step 8 | OK |
| AC-14 | GET user summary returns aggregated stats | Step 9, Step 15 | OK |
| AC-15 | All endpoints require valid Cognito JWT | Steps 11-15 (handlers) | OK |
| AC-16 | All endpoints verify user owns MOC, returns 404 | Steps 11-15 (handlers) | OK |
| AC-17 | Parts list operations verify ownership | Steps 11-15 (handlers) | OK |
| AC-18 | Invalid request returns 400 VALIDATION_ERROR | Step 2 (Zod schemas) | OK |
| AC-19 | Database errors return 500 INTERNAL_ERROR | Steps 3-9 (error handling) | OK |

**Coverage: 19/19 ACs addressed (100%)**

---

## File Path Validation

### New Package: `packages/backend/moc-parts-lists-core/`

| File | Path Valid | Notes |
|------|------------|-------|
| `package.json` | Yes | Follows `packages/backend/` convention |
| `tsconfig.json` | Yes | Standard TypeScript config |
| `vitest.config.ts` | Yes | Matches `gallery-core` pattern |
| `src/index.ts` | Yes | Package entry point |
| `src/__types__/index.ts` | Yes | Matches project convention |
| `src/create-parts-list.ts` | Yes | Core function file |
| `src/get-parts-lists.ts` | Yes | Core function file |
| `src/update-parts-list.ts` | Yes | Core function file |
| `src/update-parts-list-status.ts` | Yes | Core function file |
| `src/delete-parts-list.ts` | Yes | Core function file |
| `src/parse-parts-csv.ts` | Yes | Core function file |
| `src/get-user-summary.ts` | Yes | Core function file |
| `src/__tests__/*.test.ts` | Yes | 7 test files, matches convention |

### Vercel API Routes

| File | Path Valid | Notes |
|------|------------|-------|
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/index.ts` | Yes | New nested route |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id].ts` | Yes | Dynamic segment |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/status.ts` | Yes | Nested action route |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/parse.ts` | Yes | Nested action route |
| `apps/api/platforms/vercel/api/user/parts-lists/summary.ts` | Yes | User-scoped route |

### Infra/Config

| File | Path Valid | Notes |
|------|------------|-------|
| `apps/api/platforms/vercel/vercel.json` | Yes | Existing file to modify |

### Seed & Test Data

| File | Path Valid | Notes |
|------|------------|-------|
| `apps/api/core/database/seeds/moc-parts-lists.ts` | Yes | Follows existing pattern |
| `apps/api/core/database/seeds/test-parts-list.csv` | Yes | Test data file |
| `apps/api/core/database/seeds/index.ts` | Yes | Existing file to modify |

### HTTP Contract

| File | Path Valid | Notes |
|------|------------|-------|
| `__http__/moc-parts-lists.http` | Yes | Follows existing pattern |

**Valid paths: 22/22 (100%)**
**Invalid paths: 0**

---

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `@repo/logger` | Yes | `packages/core/logger/` |
| `@repo/gallery-core` (pattern reference) | Yes | `packages/backend/gallery-core/` |
| `@repo/vercel-adapter` | Yes | `packages/backend/vercel-adapter/` |
| `@repo/file-validator` | Yes | `packages/backend/file-validator/` |
| `drizzle-orm` | Yes | npm dependency |
| `zod` | Yes | npm dependency |
| `csv-parser` | Yes | npm package available (v3.2.0) |

**All reuse targets validated: 7/7**

---

## Database Schema Validation

| Table | Exists | Location |
|-------|--------|----------|
| `moc_parts_lists` | Yes | `packages/backend/db/src/schema.ts:373` |
| `moc_parts` | Yes | `packages/backend/db/src/schema.ts:405` |
| `moc_instructions` (parent) | Yes | `packages/backend/db/src/schema.ts:84` |

**Database schema columns match story requirements:**
- `moc_parts_lists`: id, mocId, title, description, built, purchased, notes, costEstimate, actualCost, totalPartsCount, acquiredPartsCount, createdAt, updatedAt
- `moc_parts`: id, partsListId, partId, partName, quantity, color, createdAt
- CASCADE DELETE configured: `mocParts.partsListId` references `mocPartsLists.id` with `onDelete: 'cascade'`

---

## Step Analysis

- **Total steps:** 19
- **Steps with verification:** 19/19 (100%)
- **Dependency order:** Correct (package setup -> core functions -> handlers -> infra -> verification)

### Step-by-Step Validation

| Step | Objective | Files | Verification | Status |
|------|-----------|-------|--------------|--------|
| 1 | Package skeleton | 3 config files | `pnpm install` | OK |
| 2 | Zod schemas | 1 types file | `pnpm check-types` | OK |
| 3 | createPartsList | 2 files | `pnpm test` | OK |
| 4 | getPartsLists | 2 files | `pnpm test` | OK |
| 5 | updatePartsList | 2 files | `pnpm test` | OK |
| 6 | updatePartsListStatus | 2 files | `pnpm test` | OK |
| 7 | deletePartsList | 2 files | `pnpm test` | OK |
| 8 | parsePartsCsv | 2 files | `pnpm test` | OK |
| 9 | getUserSummary | 2 files | `pnpm test` | OK |
| 10 | Package index | 1 file | `pnpm build` | OK |
| 11 | POST/GET handler | 1 file | Compile check | OK |
| 12 | PUT/DELETE handler | 1 file | Compile check | OK |
| 13 | PATCH status handler | 1 file | Compile check | OK |
| 14 | POST parse handler | 1 file | Compile check | OK |
| 15 | GET user summary handler | 1 file | Compile check | OK |
| 16 | vercel.json routes | 1 file | JSON valid | OK |
| 17 | Seed data | 3 files | `pnpm seed` | OK |
| 18 | HTTP contract tests | 1 file | HTTP format valid | OK |
| 19 | Full verification | None | All quality gates | OK |

**Issues:** None

---

## Test Plan Feasibility

### .http Files
- **Feasible:** Yes
- **Location:** `__http__/moc-parts-lists.http` follows existing pattern
- **Existing examples:** `gallery.http`, `wishlist.http`, `sets.http` demonstrate the pattern
- **Required requests:** 12 requests documented in story HTTP Contract Plan

### Unit Tests
- **Feasible:** Yes
- **Pattern:** Follows `gallery-core` test structure (`src/__tests__/*.test.ts`)
- **Expected:** 7 test files with ~40 test cases

### Playwright Tests
- **Not Applicable:** Backend-only story with no UI changes (correctly noted in plan)

### pnpm Commands
- **All commands valid:**
  - `pnpm install` - Monorepo install
  - `pnpm check-types` - Type checking
  - `pnpm test` - Unit tests
  - `pnpm build` - Package build
  - `pnpm lint` - Linting
  - `pnpm seed` - Database seeding

---

## Minor Observations (Non-Blocking)

### 1. csv-parser Package Installation
The plan mentions `csv-parser` (npm) needs installation. This should be added as a dependency during Step 1 (package.json creation).

**Recommendation:** Ensure Step 1 includes `csv-parser` in the `dependencies` section of the new package.json.

---

## Verdict

**VALID**

The implementation plan is complete and well-structured:

1. **All 19 acceptance criteria** are mapped to specific implementation steps
2. **All file paths** follow the established monorepo architecture conventions
3. **All reuse targets** exist and are available
4. **Database schema** exists with correct table structures and relationships
5. **Step order** respects dependencies (package setup -> core -> handlers -> infra)
6. **Each step** has clear objectives, file lists, and verification actions
7. **Test plan** is feasible with existing patterns

The plan correctly follows the `@repo/gallery-core` pattern for ports-and-adapters architecture, with business logic in the core package and thin Vercel handlers as adapters.

---

## Completion Signal

**PLAN VALID**
