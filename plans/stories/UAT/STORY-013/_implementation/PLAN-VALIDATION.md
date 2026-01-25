# Plan Validation: STORY-013

## Summary
- Status: **VALID**
- Issues Found: 2
- Blockers: 0

---

## AC Coverage

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | Authentication Required | Step 3 | OK |
| AC-2 | Ownership Validation | Step 3 | OK |
| AC-3 | Request Validation | Step 2, 4 | OK |
| AC-4 | Slug Conflict Handling | Step 5 | OK |
| AC-5 | Successful Updates | Step 6 | OK |
| AC-6 | Error Response Format | Step 7 | OK |
| AC-7 | HTTP Contract Verification | Step 9, 10 | OK |

**All 7 Acceptance Criteria are addressed in the implementation plan.**

---

## File Path Validation

| File Path | Action | Valid | Notes |
|-----------|--------|-------|-------|
| `apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | CREATE | YES | Parent directory `[id]/` exists with `gallery-images/` subdirectory |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | YES | File exists at expected location |
| `__http__/mocs.http` | MODIFY | YES | File exists with STORY-011/012 requests |

**Valid paths: 3/3**
**Invalid paths: 0**

---

## Reuse Target Validation

| Target | Exists | Location | Notes |
|--------|--------|----------|-------|
| `@repo/logger` | YES | `packages/core/logger/` | Package exists with exports |
| `@repo/upload-types` | YES | `packages/core/upload-types/` | Package exists |
| `findAvailableSlug` function | YES | `packages/core/upload-types/src/slug.ts:95` | Function verified, accepts `(baseSlug, existingSlugs[])` |
| `pg` + `drizzle-orm/node-postgres` | YES | External dependencies | Used in existing handlers |
| `gallery-images/index.ts` (handler template) | YES | `apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` | 329 lines, includes auth bypass, DB singleton, error patterns |
| AWS Lambda edit handler (reference) | YES | `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` | 325 lines, has `PatchMocRequestSchema` and slug conflict logic |

**All reuse targets verified to exist.**

---

## Step Analysis

| Step | Has Objective | Has Files | Has Verification | Issues |
|------|---------------|-----------|------------------|--------|
| 1 | YES | YES | YES (TypeScript compilation) | None |
| 2 | YES | YES | YES (eslint) | None |
| 3 | YES | YES | YES (check-types filter) | Minor issue: filter syntax |
| 4 | YES | YES | YES (TypeScript compilation) | None |
| 5 | YES | YES | YES (eslint) | None |
| 6 | YES | YES | YES (TypeScript compilation) | None |
| 7 | YES | YES | YES (eslint) | None |
| 8 | YES | YES | YES (node -e JSON parse) | None |
| 9 | YES | YES | YES (file syntax) | None |
| 10 | YES | YES | YES (file syntax) | None |
| 11 | YES | YES | YES (multiple commands) | Minor issue: filter syntax |
| 12 | YES | YES | YES (manual HTTP testing) | None |

- **Total steps: 12**
- **Steps with verification: 12/12**

### Minor Issues

1. **Step 3 & 11 filter syntax**: The plan uses `--filter "@repo/api-vercel..."` but there is no `@repo/api-vercel` package. The Vercel platform does not have its own package.json.
   - **Impact**: LOW - This is a verification command, not a blocker
   - **Recommendation**: Use `pnpm check-types` in the monorepo root which will catch type errors in Vercel files, or use direct tsc invocation

---

## Test Plan Feasibility

### .http Files
- **Feasible**: YES
- **Location**: `__http__/mocs.http` (exists)
- **Requests planned**: 12 PATCH requests (5 happy path, 7 error cases)
- **Notes**: File already has STORY-011/012 requests, adding PATCH requests follows established pattern

### Playwright Tests
- **NOT APPLICABLE**: This is a backend-only story with no UI changes

### Commands Listed
| Command | Valid | Notes |
|---------|-------|-------|
| `pnpm eslint <file> --fix` | YES | Standard monorepo command |
| `pnpm check-types` | YES | Root command works |
| `pnpm check-types --filter "@repo/api-vercel..."` | NO | Package does not exist |
| `node -e "require('./apps/api/platforms/vercel/vercel.json')"` | YES | Valid JSON validation |
| `pnpm vercel dev --listen 3001` | YES | Standard Vercel dev command |

---

## Architecture Compliance

### Directory Rules
- `apps/api/platforms/vercel/` - Correct location for Vercel serverless handlers
- No core package extraction - Aligns with STORY-011/012 pattern (correct)

### Pattern Consistency
- Handler structure matches existing `gallery-images/index.ts` pattern
- Auth bypass pattern matches existing handlers
- DB singleton pattern matches existing handlers
- Error response format matches existing handlers

### Boundaries
- OpenSearch integration correctly marked as SKIP
- No status updates (separate operation) - correct
- No file operations - correct

---

## Seed Data Verification

The plan correctly identifies that existing seed data from STORY-011 is sufficient:

| MOC ID | Owner | Slug | Test Purpose |
|--------|-------|------|--------------|
| `dddddddd-dddd-dddd-dddd-dddddddd0001` | dev-user | `kings-castle` | Happy path edit |
| `dddddddd-dddd-dddd-dddd-dddddddd0002` | dev-user | `space-station` | Draft MOC edit, slug conflict source |
| `dddddddd-dddd-dddd-dddd-dddddddd0004` | other-user | `technic-supercar` | 403 test |

**Slug conflict test**: Edit MOC `0002` with slug `kings-castle` -> should return 409 with `suggestedSlug: kings-castle-2`

---

## Verdict

**VALID**

The implementation plan is comprehensive and well-structured. All acceptance criteria are mapped to specific steps. All reuse targets exist and are verified. The step-by-step plan follows logical dependencies.

**Minor non-blocking issues:**
1. Filter command `--filter "@repo/api-vercel..."` references a non-existent package. Recommend using `pnpm check-types` without filter or using direct TypeScript compiler invocation.

These issues do not block implementation and can be addressed during execution.

---

## Completion Signal

**PLAN VALID**
