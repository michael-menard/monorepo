# Plan Validation: STORY-015

## Summary
- Status: **VALID**
- Issues Found: 2 (minor)
- Blockers: 0

---

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1: POST `/api/mocs/with-files/initialize` returns 201 with mocId and presigned URLs | Step 3, 8 | OK |
| AC-2: Presigned URLs expire after configurable TTL (default 5 min) | Step 3, 8 | OK |
| AC-3: At least one instruction file required (400 if missing) | Step 3 | OK |
| AC-4: Maximum 10 instruction files (400 if exceeded) | Step 3 | OK |
| AC-5: File sizes validated against config limits (400 if exceeded) | Step 3 | OK |
| AC-6: MIME types validated against allowlist (400 if invalid) | Step 3 | OK |
| AC-7: Duplicate title for same user returns 409 CONFLICT | Step 3 | OK |
| AC-8: Rate limit checked before DB writes (429 if exceeded) | Step 3 | OK |
| AC-9: Response includes `sessionTtlSeconds` | Step 3 | OK |
| AC-10: Filenames sanitized for S3 keys | Step 3 | OK |
| AC-11: Returns 401 if not authenticated | Step 8 | OK |
| AC-12: POST `/api/mocs/:mocId/finalize` accepts `uploadedFiles` array | Step 4, 9 | OK |
| AC-13: Verifies files exist in S3 via HeadObject (400 if missing) | Step 4 | OK |
| AC-14: Validates file content via magic bytes (422 INVALID_TYPE if mismatch) | Step 4 | OK |
| AC-15: Validates parts list files (422 PARTS_VALIDATION_ERROR with per-file errors) | Step 4 | OK |
| AC-16: Sets first image as thumbnail | Step 4 | OK |
| AC-17: Updates MOC status from draft to published, sets `finalizedAt` | Step 4 | OK |
| AC-18: Returns 403 if user doesn't own the MOC | Step 4 | OK |
| AC-19: Returns 404 if MOC doesn't exist | Step 4 | OK |
| AC-20: Idempotent: already-finalized MOC returns 200 with `idempotent: true` | Step 4 | OK |
| AC-21: Two-phase lock prevents concurrent finalization | Step 4 | OK |
| AC-22: Stale locks (older than TTL) are rescued | Step 4 | OK |
| AC-23: Rate limit checked before side effects (429 if exceeded) | Step 4 | OK |
| AC-24: Returns complete MOC with files array on success | Step 4 | OK |
| AC-25: `initializeWithFiles()` function is platform-agnostic with DI | Step 3 | OK |
| AC-26: `finalizeWithFiles()` function is platform-agnostic with DI | Step 4 | OK |
| AC-27: Both functions have unit tests | Step 5, 6 | OK |
| AC-28: `MOC_BUCKET` env var documented and used | Step 8, 9 | OK |
| AC-29: `@repo/upload-config` limits respected | Step 3, 4 | OK |

**Coverage: 29/29 ACs addressed**

---

## File Path Validation

### New Files (Core Package)
| Path | Valid | Notes |
|------|-------|-------|
| `packages/backend/moc-instructions-core/src/initialize-with-files.ts` | YES | Follows existing pattern (see `get-moc.ts`, `list-mocs.ts`) |
| `packages/backend/moc-instructions-core/src/finalize-with-files.ts` | YES | Follows existing pattern |
| `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts` | YES | Tests exist in `__tests__/` directory |
| `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts` | YES | Tests exist in `__tests__/` directory |

### New Files (Vercel Handlers)
| Path | Valid | Notes |
|------|-------|-------|
| `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` | YES | New nested route |
| `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` | YES | Follows `[id]` param pattern in existing handlers |

### Modified Files
| Path | Valid | Notes |
|------|-------|-------|
| `packages/backend/moc-instructions-core/src/index.ts` | YES | Verified exists |
| `packages/backend/moc-instructions-core/src/__types__/index.ts` | YES | Verified exists |
| `apps/api/platforms/vercel/vercel.json` | YES | Verified exists, needs route additions |
| `apps/api/core/database/seeds/mocs.ts` | YES | Verified exists |
| `__http__/mocs.http` | YES | Verified exists |

**Valid paths: 11/11**
**Invalid paths: 0**

---

## Reuse Target Validation

| Target | Exists | Location | Notes |
|--------|--------|----------|-------|
| `@repo/logger` | YES | Standard workspace package | Used throughout codebase |
| `@repo/upload-config` | YES | `apps/api/core/config/upload.ts` facade | Verified exports `getUploadConfig`, `getFileSizeLimit`, `isMimeTypeAllowed` |
| `@repo/rate-limit` | YES | `packages/tools/rate-limit` | Exports `RateLimitStore`, `RateLimitResult`, `createRateLimiter`, `generateDailyKey` |
| `@repo/file-validator` | YES | `packages/backend/file-validator` | Exports `validateMagicBytes` |
| `sanitizeFilenameForS3` | YES | `apps/api/core/utils/filename-sanitizer.ts` | Verified function exists |
| `createPostgresRateLimitStore` | YES | `apps/api/core/rate-limit/postgres-store.ts` | Verified function exists |
| Parts validator registry | YES | `apps/api/platforms/aws/endpoints/moc-instructions/_shared/parts-validators/` | Contains `csv-validator.ts`, `xml-validator.ts`, `validator-registry.ts` |
| `getMoc`, `listMocs` patterns | YES | `packages/backend/moc-instructions-core/src/` | Verified DI pattern with discriminated union results |
| Vercel handler auth pattern | YES | `apps/api/platforms/vercel/api/mocs/[id].ts` | Existing handler available |
| Inline Drizzle schema pattern | YES | Various Vercel handlers | Pattern established |

**All 10 reuse targets verified**

---

## Step Analysis

| Step | Objective | Files | Verification | Has Files | Has Verification |
|------|-----------|-------|--------------|-----------|------------------|
| 1 | Add Zod schemas for Initialize/Finalize | 1 | `pnpm eslint ...` | YES | YES |
| 2 | Add dependency interface types | 1 | `pnpm check-types --filter ...` | YES | YES |
| 3 | Implement initializeWithFiles core function | 1 | `pnpm check-types --filter ...` | YES | YES |
| 4 | Implement finalizeWithFiles core function | 1 | `pnpm check-types --filter ...` | YES | YES |
| 5 | Write unit tests for initializeWithFiles | 1 | `pnpm test --filter ... -- initialize-with-files` | YES | YES |
| 6 | Write unit tests for finalizeWithFiles | 1 | `pnpm test --filter ... -- finalize-with-files` | YES | YES |
| 7 | Export new functions from package index | 1 | `pnpm build --filter ...` | YES | YES |
| 8 | Implement initialize Vercel handler | 1 | `pnpm eslint ...` | YES | YES |
| 9 | Implement finalize Vercel handler | 1 | `pnpm eslint ...` | YES | YES |
| 10 | Add routes to vercel.json | 1 | Manual review | YES | YES |
| 11 | Add seed data for STORY-015 | 1 | `pnpm seed` | YES | YES |
| 12 | Add HTTP test requests | 1 | Visual inspection | YES | YES |
| 13 | Run core package tests | N/A | `pnpm test --filter ...` | YES | YES |
| 14 | Run scoped lint | N/A | `pnpm eslint ...` | YES | YES |

- **Total steps:** 14
- **Steps with verification:** 14/14 (100%)
- **Steps with files defined:** 14/14 (100%)

**Step Dependencies:**
- Steps 1-2 must complete before 3-6 (types needed for implementation)
- Steps 3-6 must complete before 7 (functions needed for export)
- Step 7 must complete before 8-9 (exports needed for handlers)
- Steps 8-9 can run in parallel
- Steps 10-11 can run in parallel after handlers
- Steps 12-14 are verification steps

**No circular dependencies detected.**

---

## Test Plan Feasibility

### .http Files
- **Feasible:** YES
- **Location:** `__http__/mocs.http` (exists, 492 lines)
- **Can add STORY-015 section:** YES (follows existing section pattern for STORY-011, 012, 013, 14)

### Unit Tests
- **Feasible:** YES
- **Location:** `packages/backend/moc-instructions-core/src/__tests__/`
- **Existing test files:**
  - `get-moc.test.ts`
  - `list-mocs.test.ts`
  - `get-moc-stats-by-category.test.ts`
  - `get-moc-uploads-over-time.test.ts`
- **Pattern:** Vitest with mock DB clients (verified in `get-moc.test.ts`)

### Playwright Tests
- **Applicable:** NO (backend-only story per Non-Goals)

### Commands Validity
| Command | Valid |
|---------|-------|
| `pnpm eslint packages/backend/moc-instructions-core/src --fix` | YES |
| `pnpm check-types --filter @repo/moc-instructions-core` | YES |
| `pnpm test --filter @repo/moc-instructions-core` | YES |
| `pnpm build --filter @repo/moc-instructions-core` | YES |
| `pnpm seed` | YES (may have pre-existing issues per LESSONS-LEARNED) |

---

## Minor Issues Identified

### Issue 1: Route Order in vercel.json
**Concern:** The plan mentions adding routes BEFORE `/api/mocs/:id` but doesn't show exact placement.
**Impact:** Minor - plan says "Manual review of route order" which is appropriate.
**Resolution:** During implementation, ensure routes are placed in this order:
1. `/api/mocs/with-files/initialize` (more specific)
2. `/api/mocs/:mocId/finalize` (parameterized but specific path)
3. Existing `/api/mocs/:id` routes (generic catch-all)

### Issue 2: Parts Validator Inlining
**Concern:** Plan notes parts validator is in AWS Lambda endpoints, not shared package.
**Impact:** Minor - plan explicitly addresses this: "Inline basic parts validation in core. Full validator registry extraction is out of scope."
**Resolution:** Copy validation logic or create simplified inline version. This is documented as a known design decision.

---

## Pre-existing Known Issues (Documented in Plan)

The plan correctly documents pre-existing monorepo issues that should NOT block this story:
- `@repo/file-validator` - type errors (package exists, usable)
- `@repo/mock-data` - type errors
- `@repo/pii-sanitizer` - type errors
- `@repo/sets-core` - type errors
- `@repo/gallery-core` - type errors
- `@repo/upload-client` - type errors
- `@repo/app-dashboard` - build fails (design-system)
- `@repo/app-wishlist-gallery` - build fails (design-system)
- `seedSets()` - fails due to tags schema mismatch

**Workaround documented:** Use scoped verification commands (`--filter @repo/moc-instructions-core`).

---

## Verdict

**PLAN VALID**

The implementation plan:
1. Covers all 29 acceptance criteria
2. Uses valid file paths following established patterns
3. References existing, verified reuse targets
4. Has 14 well-ordered steps with clear objectives and verification
5. Includes a feasible test plan
6. Documents known pre-existing issues with appropriate workarounds

Minor issues identified (route order, parts validator inlining) are addressed in the plan notes and do not constitute blockers.

---

## Completion Signal

**PLAN VALID**

No blockers identified. Implementation can proceed.

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | dev-implement-plan-validator | Plan validation completed - VALID |
