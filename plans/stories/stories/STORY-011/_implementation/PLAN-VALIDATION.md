# Plan Validation: STORY-011

## Summary
- Status: **VALID**
- Issues Found: 2 (minor)
- Blockers: 0

---

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1: GET /api/mocs/:id with ownership-aware access | Steps 3, 4, 12 | OK |
| AC-2: GET /api/mocs with pagination/search/filter | Steps 5, 6, 13 | OK |
| AC-3: GET /api/mocs/stats/by-category | Steps 7, 8, 14 | OK |
| AC-4: GET /api/mocs/stats/uploads-over-time | Steps 9, 10, 15 | OK |
| AC-5: moc-instructions-core package | Steps 1-11 | OK |
| AC-6: Seed data | Steps 17, 18 | OK |
| AC-7: HTTP contract verification | Step 19 | OK |

**All 7 ACs are addressed in the plan. No missing or phantom ACs.**

---

## File Path Validation

### New Package Files (Valid Pattern: `packages/backend/**`)

| File Path | Valid | Notes |
|-----------|-------|-------|
| `packages/backend/moc-instructions-core/package.json` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/tsconfig.json` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/vitest.config.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/index.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/__types__/index.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/get-moc.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/list-mocs.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/__tests__/*.test.ts` | YES | Follows existing pattern |

### New Vercel Handler Files (Valid Pattern: `apps/api/platforms/vercel/api/**`)

| File Path | Valid | Notes |
|-----------|-------|-------|
| `apps/api/platforms/vercel/api/mocs/[id].ts` | YES | Follows existing pattern |
| `apps/api/platforms/vercel/api/mocs/index.ts` | YES | Follows existing pattern |
| `apps/api/platforms/vercel/api/mocs/stats/by-category.ts` | YES | Follows existing pattern |
| `apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts` | YES | Follows existing pattern |

### Modified Files

| File Path | Valid | Notes |
|-----------|-------|-------|
| `apps/api/platforms/vercel/vercel.json` | YES | Exists at verified path |
| `apps/api/core/database/seeds/index.ts` | YES | Exists at verified path |

### New Seed and HTTP Files

| File Path | Valid | Notes |
|-----------|-------|-------|
| `apps/api/core/database/seeds/mocs.ts` | YES | Follows existing pattern |
| `__http__/mocs.http` | YES | Follows existing pattern (9 existing .http files verified) |

**Result: All 18+ file paths are valid patterns.**

---

## Reuse Target Validation

| Target | Exists | Location | Notes |
|--------|--------|----------|-------|
| `@repo/api-types/moc` | YES | `packages/shared/api-types/src/moc/index.ts` | Contains MocInstructionSchema, MocListQuerySchema, MocFileSchema |
| `@repo/logger` | YES | `packages/core/logger/` | Standard logging package |
| `packages/backend/db` | YES | `packages/backend/db/src/schema.ts` | Contains mocInstructions, mocFiles, mocGalleryImages, mocPartsLists tables |
| `gallery-core DI pattern` | YES | `packages/backend/gallery-core/src/search-images.ts` | DB client interface pattern verified |
| `gallery-core result types` | YES | `packages/backend/gallery-core/src/search-images.ts` | Discriminated union pattern verified |
| `gallery/images/search.ts` | YES | `apps/api/platforms/vercel/api/gallery/images/search.ts` | ILIKE search pattern available |
| `gallery.ts seed` | YES | `apps/api/core/database/seeds/gallery.ts` | Upsert pattern available |
| `moc-parts-lists-core template` | YES | `packages/backend/moc-parts-lists-core/` | Package scaffold template available |
| `vercel-adapter` | YES | `packages/backend/vercel-adapter/` | Request/response transformation available |
| `lambda-responses` | YES | `packages/backend/lambda-responses/` | Response helpers available |

**Result: All 10 reuse targets exist and are accessible.**

---

## AWS Lambda Reference Implementations

| Reference Handler | Exists | Location | Patterns to Reuse |
|-------------------|--------|----------|-------------------|
| `get/handler.ts` | YES | `apps/api/platforms/aws/endpoints/moc-instructions/get/handler.ts` | Ownership-aware access, soft-delete filter, isOwner flag |
| `list/handler.ts` | YES | `apps/api/platforms/aws/endpoints/moc-instructions/list/handler.ts` | Pagination, search with ILIKE, tag filtering |
| `get-stats/handler.ts` | YES | `apps/api/platforms/aws/endpoints/moc-instructions/get-stats/handler.ts` | Theme/tag aggregation, top 10 sorting |
| `get-uploads-over-time/handler.ts` | YES | `apps/api/platforms/aws/endpoints/moc-instructions/get-uploads-over-time/handler.ts` | 12-month filter, DATE_TRUNC, time-series grouping |

**Result: All reference implementations exist with complete business logic.**

---

## Step Analysis

- **Total steps**: 20
- **Steps with clear objective**: 20/20
- **Steps with files specified**: 20/20
- **Steps with verification action**: 20/20

### Step Dependencies (No Circular Dependencies)

```
Step 1 (scaffold) -> Steps 2-11 (core package)
Steps 3-10 (core functions) -> Step 11 (lint/build)
Steps 12-15 (Vercel handlers) -> Step 16 (vercel.json)
Step 17 (seed) -> Step 18 (seed index)
Step 16, 18 -> Step 19 (HTTP file)
All -> Step 20 (final verification)
```

**Result: Steps are logically ordered with no circular dependencies.**

---

## Test Plan Feasibility

### Unit Tests
- **Location**: `packages/backend/moc-instructions-core/src/__tests__/`
- **Test files**: 4 (get-moc, list-mocs, get-moc-stats-by-category, get-moc-uploads-over-time)
- **Feasibility**: YES - follows established pattern from gallery-core and moc-parts-lists-core

### HTTP Contract Tests
- **Location**: `__http__/mocs.http`
- **Requests**: 10 documented requests covering all endpoints
- **Feasibility**: YES - follows established pattern from existing .http files

### Playwright Tests
- **Applicable**: NO - backend-only story, correctly marked as NOT APPLICABLE

### pnpm Commands
| Command | Valid |
|---------|-------|
| `pnpm seed` | YES - exists |
| `pnpm vitest run` | YES - exists |
| `pnpm eslint` | YES - exists |
| `pnpm tsc --noEmit` | YES - exists |
| `pnpm --filter @repo/moc-instructions-core build` | YES - standard filter syntax |
| `pnpm --filter @repo/moc-instructions-core test` | YES - standard filter syntax |

**Result: All test plans are feasible.**

---

## Database Schema Verification

### Required Tables (All Exist)

| Table | Purpose | Verified |
|-------|---------|----------|
| `mocInstructions` | Main MOC entity | YES |
| `mocFiles` | MOC files with soft-delete | YES (has deletedAt column) |
| `mocGalleryImages` | Join table for gallery images | YES |
| `mocPartsLists` | Parts list metadata | YES |

### Required Columns for Query Logic

| Table.Column | Purpose | Verified |
|--------------|---------|----------|
| `mocInstructions.userId` | User filter | YES |
| `mocInstructions.status` | Published/draft filter | YES |
| `mocInstructions.theme` | Stats grouping | YES |
| `mocInstructions.tags` | JSONB tag filter | YES |
| `mocInstructions.title` | ILIKE search | YES |
| `mocInstructions.description` | ILIKE search | YES |
| `mocInstructions.createdAt` | Time-series grouping | YES |
| `mocInstructions.updatedAt` | Sort order | YES |
| `mocFiles.deletedAt` | Soft-delete filter | YES |

**Result: All required tables and columns exist in schema.**

---

## Minor Issues (Non-Blocking)

### Issue 1: Route Destination Syntax
**Plan Step 16** shows:
```json
{ "source": "/api/mocs/stats/by-category", "destination": "/api/mocs/stats/by-category.ts" }
```

**Existing pattern in vercel.json** uses no `.ts` extension for some routes but includes it for others. Recommend consistency - the existing pattern shows `.ts` extension is fine.

**Status**: MINOR - Will work, just note for consistency.

### Issue 2: Gallery Albums Route Missing
The plan shows routes for `/api/mocs/*` but existing vercel.json has no `/api/gallery/albums/*` routes (only images). This is consistent with the story scope - albums are handled separately.

**Status**: NOT AN ISSUE - Correctly scoped.

---

## Verdict

**PLAN VALID**

The implementation plan is comprehensive and ready for execution:

1. All 7 acceptance criteria are fully addressed
2. All file paths follow established monorepo patterns
3. All 10 reuse targets exist and are accessible
4. All 4 AWS Lambda reference implementations are available
5. All 20 steps have clear objectives, files, and verification actions
6. No circular dependencies in step ordering
7. Database schema has all required tables and columns
8. Test plan is feasible with existing tooling

The plan can proceed to implementation without PM clarification.

---

PLAN VALID
