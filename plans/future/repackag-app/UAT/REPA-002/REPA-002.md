---
id: REPA-002
title: "Migrate Upload Client Functions to @repo/upload"
feature: repackag-app
epic: Repackage Upload Functionality
status: uat
priority: P2
story_points: 2
experiment_variant: control
created_at: "2026-02-10"
depends_on:
  - REPA-001
blocks:
  - REPA-003
  - REPA-005
tags:
  - migration
  - upload
  - package-consolidation
  - technical-debt
surfaces:
  - packages
complexity: medium
risk_level: medium
---

# REPA-002: Migrate Upload Client Functions to @repo/upload

## Context

Currently, upload client functionality is fragmented across multiple locations:
- Base XHR upload logic lives in `@repo/upload-client` (created in Story 3.1.32)
- Finalize client logic is duplicated in both `main-app` and `app-instructions-gallery` (339 lines each, EXACT DUPLICATES)
- Upload hooks are duplicated across apps (will be addressed separately in REPA-003)

This fragmentation leads to:
1. **Exact duplicate code** - The `finalizeClient.ts` file is identical in both apps (339 lines)
2. **No shared source of truth** - Changes must be made in multiple places
3. **Inconsistent package structure** - Upload logic spans multiple packages
4. **Higher maintenance burden** - Bug fixes must be applied to multiple files

After REPA-001 creates the `@repo/upload` package structure, we need to consolidate the upload client functions into a single location. The existing `@repo/upload-client` package needs to be migrated to `@repo/upload/client/`, and the duplicate `finalizeClient` implementations need to be merged into this new structure.

**Dependencies:**
- **DEPENDS ON: REPA-001** (Create @repo/upload Package Structure) - MUST be completed first
- **BLOCKS: REPA-003** (Migrate Upload Hooks)
- **BLOCKS: REPA-005** (Migrate Upload Components)

---

## Goal

Create a single source of truth for upload client functions by:
1. Moving XHR client code from `@repo/upload-client` to `@repo/upload/client/`
2. Adding finalize client functions to `@repo/upload/client/finalize.ts`
3. Updating all 52 import sites to use the new package
4. Deleting duplicate finalizeClient.ts files from app directories
5. Deprecating the old `@repo/upload-client` package

**Success criteria**: All upload functionality works identically after migration, with no duplicate code and a clear upgrade path for future consumers.

---

## Non-Goals

The following are explicitly OUT OF SCOPE for this story:

- **Creating new upload features** - This story only migrates existing code
- **Refactoring upload logic** - Keep behavior identical to current implementation
- **Removing @repo/upload-client package** - Only deprecate, don't delete (need deprecation period of 2-3 sprints)
- **Migrating upload hooks** - Covered separately in REPA-003 (useUploadManager, useUploaderSession)
- **Migrating image processing** - Covered separately in REPA-004
- **Migrating upload components** - Covered separately in REPA-005
- **Migrating @repo/upload-types** - Covered separately in REPA-006
- **Updating documentation beyond package README** - Defer to later story
- **Performance optimization** - Keep existing performance characteristics
- **Adding analytics or observability** - Defer to follow-up story (see FUTURE-RISKS.md)
- **Adding retry logic** - Defer to follow-up story (see FUTURE-RISKS.md)
- **Client-side file validation** - Defer to follow-up story (see FUTURE-RISKS.md)

---

## Scope

### Packages Touched
1. **`packages/core/upload/`** (created in REPA-001)
   - Add `client/xhr.ts` - XHR upload functions
   - Add `client/manager.ts` - Upload manager
   - Add `client/types.ts` - Upload types and schemas
   - Add `client/finalize.ts` - Finalize client functions (NEW)
   - Add `client/index.ts` - Client exports
   - Update `index.ts` - Re-export client functions

2. **`packages/core/upload-client/`** (deprecated after migration)
   - Add deprecation notice to `package.json`
   - Update `README.md` with migration instructions
   - Keep functional for rollback during deprecation period

3. **52 files importing `@repo/upload-client`**
   - Update import statements from `@repo/upload-client` to `@repo/upload`
   - Verify specific exports still available

4. **App-level finalize implementations**
   - `apps/web/main-app/src/services/api/finalizeClient.ts` - DELETE after migration
   - `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` - DELETE after migration

### Endpoints (No Changes)
**POST `/api/mocs/uploads/finalize`** - Finalize upload session
- Request/response contracts unchanged
- CSRF token handling preserved exactly
- Error responses (409, 429, 400) unchanged

### Components Touched (Import Updates Only)
1. **`apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`**
   - Change import: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
   - Verify: `finalizeSession`, `FileValidationError` still available

2. **`apps/web/app-instructions-gallery/src/pages/upload-page.tsx`**
   - Change import: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
   - Verify: `finalizeSession`, `FileValidationError` still available

---

## Acceptance Criteria

### AC-1: XHR Client Code Migrated
- [ ] `packages/core/upload/client/xhr.ts` exists with:
  - `uploadFile(file, url, options)` function
  - `uploadToPresignedUrl(file, presignedUrl, options)` function
  - XHR progress tracking logic preserved exactly
  - AbortController support for cancellation
- [ ] `packages/core/upload/client/manager.ts` exists with:
  - `createUploadManager(options)` function
  - Concurrent upload queue logic preserved exactly
  - `maxConcurrent` option respected
- [ ] `packages/core/upload/client/types.ts` exists with:
  - All Zod schemas from `@repo/upload-client/src/types.ts`
  - `UploadTask`, `UploadProgress`, `UploadError` types exported
- [ ] All existing tests migrated to `packages/core/upload/client/__tests__/`
  - `xhr.test.ts` - XHR upload function tests
  - `manager.test.ts` - Upload manager tests
  - All tests pass with no regressions
- [ ] Test coverage meets minimum 45% threshold

**Evidence**:
```bash
ls -la packages/core/upload/client/
# Expected files: xhr.ts, manager.ts, types.ts, index.ts, __tests__/
pnpm test packages/core/upload/client
# Expected: All tests pass
```

---

### AC-2: Finalize Client Functions Added
- [ ] `packages/core/upload/client/finalize.ts` created with:
  - `finalizeSession(request)` function (main entry point)
  - `FinalizeError` class with error type helpers
  - All Zod schemas:
    - `FinalizeRequestSchema`
    - `FinalizeSuccessResponseSchema`
    - `FileValidationErrorSchema`
    - `ConflictErrorDetailsSchema`
- [ ] Error handling logic preserved exactly from old `finalizeClient.ts`:
  - **409 Conflict**: Extract `suggestedSlug` from response body
  - **429 Rate Limit**: Extract `Retry-After` from response headers
  - **400 Validation Error**: Extract `fileErrors` array from response body
  - **403 Forbidden**: Handle missing/invalid CSRF token
  - **500 Server Error**: Generic error handling
  - **Network Errors**: Timeout, connection failures
- [ ] CSRF token handling preserved exactly:
  - Token included in `X-CSRF-Token` request header
  - Token validated before request sent
- [ ] Request ID tracking preserved:
  - Extract `X-Request-Id` from response headers
  - Log request ID for debugging
- [ ] Uses `@repo/logger` for all logging (no `console.log`)
- [ ] Tests created for finalize functionality:
  - Happy path (200/201 success)
  - 409 conflict with suggestedSlug extraction
  - 429 rate limit with retry-after parsing
  - 400 validation errors with fileErrors array
  - 403 CSRF token errors
  - Network errors and timeouts
  - Request cancellation via AbortController

**Evidence**:
```bash
cat packages/core/upload/client/finalize.ts | head -50
# Expected: finalizeSession function, FinalizeError class, Zod schemas
pnpm test packages/core/upload/client/__tests__/finalize.test.ts
# Expected: All finalize tests pass
```

---

### AC-3: Barrel Exports Updated
- [ ] `packages/core/upload/client/index.ts` exports all client functions:
  - `uploadFile`, `uploadToPresignedUrl` (from xhr.ts)
  - `createUploadManager` (from manager.ts)
  - `finalizeSession` (from finalize.ts)
  - All types: `UploadTask`, `UploadProgress`, `UploadError`, `FinalizeError`
  - All schemas: `FinalizeRequestSchema`, `FinalizeSuccessResponseSchema`, etc.
- [ ] `packages/core/upload/index.ts` re-exports all client functions
- [ ] Public API maintains backward compatibility:
  - All exports from old `@repo/upload-client` available from `@repo/upload`
  - TypeScript types properly exported and inferred
- [ ] No barrel file pattern violations:
  - Exports are explicit (not `export *`)
  - Each export has clear source

**Evidence**:
```typescript
// Test file to verify exports
import {
  uploadFile,
  uploadToPresignedUrl,
  createUploadManager,
  finalizeSession,
  UploadTask,
  FinalizeError
} from '@repo/upload'
// Expected: All imports resolve without errors
```

---

### AC-4: All Import Sites Updated
- [ ] **Main-app InstructionsNewPage.tsx updated**:
  - Import changed: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
  - Imports: `finalizeSession`, `FileValidationError`
  - File compiles without TypeScript errors
  - Component renders without runtime errors
- [ ] **App-instructions-gallery upload-page.tsx updated**:
  - Import changed: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
  - Imports: `finalizeSession`, `FileValidationError`
  - File compiles without TypeScript errors
  - Component renders without runtime errors
- [ ] **All 52 references to `@repo/upload-client` updated**:
  - Import changed: `from '@repo/upload-client'` → `from '@repo/upload'`
  - Specific imports verified (uploadFile, createUploadManager, types)
  - No broken imports (verified via TypeScript compilation)
- [ ] **All apps build successfully**:
  - `pnpm build` completes without errors
  - No import resolution errors
  - No TypeScript compilation errors
- [ ] **No old imports remain**:
  - `rg "@repo/upload-client" --type ts` returns no results
  - `rg "@/services/api/finalizeClient" --type ts` returns no results

**Evidence**:
```bash
pnpm build > build-output.txt 2>&1
# Expected: All apps build successfully
pnpm check-types:all > typecheck-output.txt 2>&1
# Expected: No TypeScript errors
rg "@repo/upload-client" --type ts
# Expected: No matches found
rg "@/services/api/finalizeClient" --type ts
# Expected: No matches found
```

---

### AC-5: Duplicate Files Deleted
- [ ] `apps/web/main-app/src/services/api/finalizeClient.ts` deleted
- [ ] `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` deleted
- [ ] No `finalizeClient.ts` files remain in app directories:
  - `find apps/ -name "finalizeClient.ts"` returns no results
- [ ] Apps still build successfully after deletion
- [ ] Upload flows still work after deletion (tested in AC-7)

**Evidence**:
```bash
find apps/ -name "finalizeClient.ts"
# Expected: No results
ls apps/web/main-app/src/services/api/
# Expected: finalizeClient.ts NOT present
ls apps/web/app-instructions-gallery/src/services/api/
# Expected: finalizeClient.ts NOT present
```

---

### AC-6: Old Package Deprecated (Not Removed)
- [ ] `packages/core/upload-client/package.json` updated with deprecation notice:
  ```json
  {
    "name": "@repo/upload-client",
    "deprecated": "This package is deprecated. Use @repo/upload instead.",
    "description": "DEPRECATED: Migrated to @repo/upload. See @repo/upload for the latest version."
  }
  ```
- [ ] `packages/core/upload-client/README.md` updated with migration instructions:
  - Clear notice at top: "⚠️ DEPRECATED: This package has been migrated to @repo/upload"
  - Migration guide:
    - Change imports from `@repo/upload-client` to `@repo/upload`
    - All exports available with same API
    - No breaking changes
  - Link to `@repo/upload` documentation
  - Deprecation timeline (removal in 2-3 sprints)
- [ ] Package remains functional for rollback:
  - All files intact (no deletion)
  - Tests still pass
  - Can be imported if needed for emergency rollback
- [ ] Clear migration path documented in both packages

**Evidence**:
```bash
cat packages/core/upload-client/package.json | grep deprecated
# Expected: deprecation notice present
head -20 packages/core/upload-client/README.md
# Expected: DEPRECATED notice at top with migration instructions
pnpm test packages/core/upload-client
# Expected: Tests still pass (package functional for rollback)
```

---

### AC-7: Quality Gates Pass
- [ ] **All tests pass**:
  - `pnpm test:all` completes without failures
  - No test regressions (all existing tests pass)
  - New tests added for finalize functionality pass
  - Test coverage meets 45% minimum threshold
- [ ] **TypeScript compilation succeeds**:
  - `pnpm check-types:all` completes without errors
  - All imports resolve correctly
  - All types infer correctly from Zod schemas
- [ ] **ESLint passes**:
  - `pnpm lint` completes with no errors
  - No warnings on new/changed code
  - All files use `@repo/logger` (no `console.log`)
- [ ] **All apps build successfully**:
  - `pnpm build` completes without errors
  - All workspace dependencies resolve
  - No broken imports in any app
- [ ] **Manual smoke tests pass**:
  - Upload flow works in main-app (authenticated user)
  - Upload flow works in app-instructions-gallery (anonymous user)
  - Upload progress displays correctly (0-100%)
  - Finalize completes successfully
  - Error handling works (test 409 conflict scenario)
  - No console errors in browser
  - CSRF token included in finalize requests

**Evidence**:
```bash
# Run all quality gates
pnpm test:all > test-results.txt 2>&1
pnpm check-types:all > typecheck-results.txt 2>&1
pnpm lint > lint-results.txt 2>&1
pnpm build > build-results.txt 2>&1

# Manual smoke test checklist:
# [ ] Navigate to /instructions/new in main-app
# [ ] Select and upload test file (1-2MB image)
# [ ] Observe progress bar (0-100%)
# [ ] Verify finalize completes, MOC created
# [ ] Check network tab: finalize request includes X-CSRF-Token header
# [ ] Check console: no errors or warnings
# [ ] Repeat in app-instructions-gallery (anonymous flow)
# [ ] Test error case: try creating MOC with duplicate slug (expect 409 error with suggestedSlug)
```

---

## Reuse Plan

### Packages to Reuse
1. **`@repo/upload-client`** (source package)
   - Migrate contents to `@repo/upload/client/`
   - Keep for rollback during deprecation period
   - Remove in follow-up story (2-3 sprints)

2. **`@repo/upload`** (target package, created in REPA-001)
   - Add client functions to `client/` subdirectory
   - Export from package root
   - Main consolidation point for all upload code

3. **`@repo/logger`** (logging utility)
   - Use for all logging in finalize client
   - Replace any `console.log` with `logger.info/warn/error`

4. **`zod`** (schema validation)
   - Define all types with Zod schemas
   - Use `z.infer<>` for TypeScript types
   - Validate API responses

5. **`vitest`** (testing framework)
   - Migrate existing tests
   - Add new tests for finalize functionality
   - Use MSW for API mocking

### Patterns to Reuse
1. **Discriminated union result types**:
   ```typescript
   type Result<T, E> =
     | { success: true; data: T }
     | { success: false; error: E }
   ```

2. **Zod-first type definitions**:
   ```typescript
   const FinalizeRequestSchema = z.object({...})
   type FinalizeRequest = z.infer<typeof FinalizeRequestSchema>
   ```

3. **AbortController for cancellation**:
   ```typescript
   uploadFile(file, url, { signal: abortController.signal })
   ```

4. **XHR for upload progress**:
   ```typescript
   xhr.upload.addEventListener('progress', (e) => {
     const progress = (e.loaded / e.total) * 100
     onProgress?.(progress)
   })
   ```

5. **Error-specific handling**:
   ```typescript
   if (response.status === 409) {
     const { suggestedSlug } = await response.json()
     throw new FinalizeError('CONFLICT', { suggestedSlug })
   }
   ```

### Components (None - Import Updates Only)
No new components created. Existing components updated with new imports:
- `InstructionsNewPage.tsx` - Upload flow in main-app
- `upload-page.tsx` - Upload flow in app-instructions-gallery

---

## Architecture Notes

### Package Structure (After Migration)
```
packages/core/upload/
├── client/
│   ├── xhr.ts           # XHR upload functions (from @repo/upload-client)
│   ├── manager.ts       # Upload manager (from @repo/upload-client)
│   ├── types.ts         # Upload types (from @repo/upload-client)
│   ├── finalize.ts      # Finalize client (NEW, from app-level duplicates)
│   ├── index.ts         # Client exports
│   └── __tests__/
│       ├── xhr.test.ts
│       ├── manager.test.ts
│       └── finalize.test.ts
├── index.ts             # Package root exports
├── package.json
└── README.md
```

### Migration Sequence (Critical for Success)
**Follow this order to avoid broken imports:**

1. **Verify REPA-001 completed** (check package structure exists)
2. **Create migrated client files** (copy from old locations)
3. **Update exports** (client/index.ts and root index.ts)
4. **Update dependencies** (add @repo/upload to app package.json)
5. **Update import sites** (all 52 files + 2 finalizeClient sites)
6. **Verify build and tests** (MUST pass before proceeding)
7. **Delete duplicate files** (finalizeClient.ts in apps)
8. **Deprecate old package** (update package.json and README)
9. **Final verification** (smoke tests, quality gates)

**Critical**: Do not skip steps or change order. Each step depends on the previous completing successfully.

### Import Resolution
- **Before migration**: `from '@repo/upload-client'` → `packages/core/upload-client/src/index.ts`
- **After migration**: `from '@repo/upload'` → `packages/core/upload/index.ts` → `packages/core/upload/client/index.ts`

### Type Safety
- All types defined via Zod schemas with `z.infer<>`
- No TypeScript interfaces (per CLAUDE.md)
- Runtime validation at API boundaries
- Type inference preserved across package boundary

### Error Handling Strategy
- Discriminated union results (success/error)
- Typed error codes (Zod enums)
- Error-specific handling (409, 429, 400, 403)
- Request ID tracking for debugging
- Graceful degradation (network failures)

---

## Infrastructure Notes

**No infrastructure changes required** - This is pure code migration.

### Build System
- Turborepo will rebuild dependent apps automatically
- Workspace dependencies use `workspace:*` protocol
- No changes to build scripts or configuration

### Deployment
- No deploy-time changes
- No environment variable changes
- No runtime configuration changes
- Standard deployment process applies

### Rollback Plan
If issues discovered in production:
1. Keep `@repo/upload-client` package functional during deprecation period (2-3 sprints)
2. Can temporarily revert imports from `@repo/upload` to `@repo/upload-client`
3. Old finalize client logic preserved in git history (can restore if needed)
4. No database migrations or infrastructure changes to rollback

---

## Test Plan

See: `_pm/TEST-PLAN.md` for comprehensive test coverage.

### Test Summary
1. **XHR upload functions** - Various file types, sizes, progress callbacks, cancellation, error handling
2. **Upload manager** - Concurrent uploads, queue processing, cancellation
3. **Finalize client** - Happy path, 409/429/400 errors, CSRF tokens, request ID tracking
4. **Import site updates** - Integration tests for InstructionsNewPage and upload-page

### Test Coverage Requirements
- Minimum 45% global coverage (per CLAUDE.md)
- Critical paths (happy path, error handling) must have 80%+ coverage
- All error scenarios tested (409, 429, 400, 403, network errors)
- Both authenticated and anonymous upload flows tested

### Manual Testing
- Upload flow in main-app (authenticated)
- Upload flow in app-instructions-gallery (anonymous)
- Error scenarios (conflict, rate limit, validation)
- Browser console clean (no errors or warnings)
- CSRF token handling verified (network tab)

---

## Dev Feasibility

See: `_pm/DEV-FEASIBILITY.md` and `_pm/FUTURE-RISKS.md` for detailed analysis.

### Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Estimated time**: 3-4 hours for experienced developer
- **Story points**: 2 SP (matches epic plan estimate)

### MVP-Critical Risks
1. **Broken imports** (52 files to update) - Mitigated by build verification
2. **CSRF token handling** - Mitigated by preserving exact logic
3. **Error handling regression** - Mitigated by comprehensive tests

### Non-MVP Risks
- Package removal timeline (defer to follow-up story)
- Test coverage gaps for edge cases (defer to follow-up story)
- Performance monitoring (defer to follow-up story)
- Analytics and observability (defer to follow-up story)
- Retry logic for transient failures (defer to follow-up story)

---

## Predictions

predictions:
  split_risk: 0.4
  review_cycles: 2
  token_estimate: 120000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T19:15:00Z"
  model: haiku
  wkfl_version: "007-v1"
  calculation_notes:
    split_risk_rationale: |
      Base risk from AC count (7 ACs): (7-3)*0.1 = 0.4
      No frontend + backend complexity boost (pure backend/infra = -0.1): 0.3
      Multi-file migration (52 import sites) adds complexity: +0.1 = 0.4
      No auth/security/database involvement (no additional boost)
      Final: 0.4 (medium-low risk)
    review_cycles_rationale: |
      Base cycles: 1
      Multi-file migration (52 sites): +1 = 2
      No auth/security/database: no additional cycles
      Estimated files to change: ~60 (52 imports + client files + tests)
      Final: 2 cycles (one for implementation, one for thoroughness check)
    token_estimate_rationale: |
      No similar stories available (KB search not performed, would require kb_search tool)
      Using heuristic: 7 ACs * 15K tokens/AC baseline = 105K
      Multi-file migration overhead: +15K tokens = 120K
      Fallback to conservative estimate given no historical data
      Final: 120,000 tokens
    confidence_rationale: |
      Low confidence due to:
      - No similar stories loaded (KB search not performed)
      - WKFL-006 patterns unavailable (patterns directory missing)
      - Heuristics-only mode with no historical data
      - First story in REPA epic (no domain-specific baseline)
  degradation_mode: heuristics_only
  missing_data:
    - WKFL-006 patterns file not found (plans/future/workflow-learning/patterns/)
    - KB similar stories not loaded (kb_search tool not available in this context)
    - No outcome files from similar migration stories

---

## Reality Baseline

### Existing Features (From STORY-SEED.md)
| Feature | Location | Status |
|---------|----------|--------|
| `@repo/upload-client` package | `packages/core/upload-client/` | Exists - Contains XHR upload client (manager.ts, xhr.ts, types.ts) |
| `@repo/upload-types` package | `packages/core/upload-types/` | Exists - Contains upload Zod schemas |
| finalizeClient (main-app) | `apps/web/main-app/src/services/api/finalizeClient.ts` | Exists - 339 lines |
| finalizeClient (instructions-gallery) | `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` | Exists - 339 lines (EXACT DUPLICATE) |
| useUploadManager (main-app) | `apps/web/main-app/src/hooks/useUploadManager.ts` | Exists |
| useUploadManager (instructions-gallery) | `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts` | Exists (duplicate) |
| useUploaderSession (main-app) | `apps/web/main-app/src/hooks/useUploaderSession.ts` | Exists - Has user auth handling |
| useUploaderSession (instructions-gallery) | `apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts` | Exists - Near duplicate with anonymous handling |

### Active In-Progress Work
- **REPA-001**: Listed as pending in stories.index.md (not yet started)
- **REPA-002**: Depends on REPA-001 completing first (this story)
- No active changes detected in upload-related files (per git status)

### Constraints to Respect
From CLAUDE.md and codebase patterns:
- **Zod-first types required** - All types must be defined via Zod schemas with `z.infer<>`
- **No barrel files** - Import directly from source files (exports must be explicit)
- **Use `@repo/logger`** - Never use console.log
- **Component directory structure** - Use `index.tsx`, `__tests__/`, `__types__/`, `utils/` pattern
- **Minimum 45% test coverage** - All new code must be tested
- **Workspace dependencies** - Use `workspace:*` protocol
- **Package deprecation period** - Old packages need proper deprecation before removal (2-3 sprints)

### Related Endpoints
- **POST `/api/mocs/uploads/finalize`** - Finalize upload session endpoint
  - Handles 409 (conflict with suggestedSlug), 429 (rate limit with retry-after), 400 (validation errors with fileErrors)
  - Returns MOC data with slug, status, keys
  - Requires CSRF token in X-CSRF-Token header
  - Returns X-Request-Id header for debugging

### Import Sites (52 files)
52 files across 4 apps reference `@repo/upload-client`:
- main-app
- app-instructions-gallery
- app-sets-gallery
- app-wishlist-gallery

Key consumers:
- `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx` (line 42) - Imports finalizeSession, FileValidationError
- `apps/web/app-instructions-gallery/src/pages/upload-page.tsx` (line 42) - Imports finalizeSession, FileValidationError

---

**Story REPA-002 Complete** - Ready for backlog prioritization and implementation after REPA-001 completes.

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | Notes |
|---|---------|------------|-------|
| — | No MVP-critical gaps identified | Story proceeds as-is | Core journey is complete per ANALYSIS.md |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Test coverage for edge cases | testing | Deferred to follow-up story |
| 2 | Missing retry logic for transient failures | enhancement | Deferred to follow-up story |
| 3 | Client-side file validation before upload | enhancement | Deferred to follow-up story |
| 4 | Stale upload session handling | edge-case | Deferred to follow-up story |
| 5 | No request timeout configuration | enhancement | Deferred to follow-up story |
| 6 | Error messages not i18n-ready | future-work | Defer to broader i18n effort |
| 7 | Analytics and observability | observability | High-impact, deferred (see FUTURE-RISKS.md) |
| 8 | Upload performance monitoring | performance | Deferred after analytics infrastructure |
| 9 | Resume capability for interrupted uploads | future-work | Major feature, separate epic (backend changes) |
| 10 | Parallel chunk uploads for large files | performance | Deferred after chunking infrastructure |
| 11 | Progressive image compression preview | ux-polish | UX enhancement, future iteration |
| 12 | Upload queue persistence (localStorage) | enhancement | Deferred to follow-up story |
| 13 | Bandwidth throttling for dev/testing | enhancement | Testing utility, deferred |
| 14 | Better error recovery UX (auto-retry) | ux-polish | Combines with retry logic enhancement |
| 15 | Upload history/audit log for debugging | observability | Deferred after analytics infrastructure |
| 16 | TypeScript strict mode for upload client | technical-debt | Code quality cleanup, deferred |

### Summary

- **ACs Added**: 0
- **KB Items Deferred**: 16 non-blocking findings
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS

**Conditions for Proceeding:**
1. REPA-001 must be completed first (hard dependency)
2. Verify @repo/upload package structure exists at `packages/core/upload/`
3. Follow migration sequence exactly as documented (steps 1-9)

All 8 audit checks PASSED. No MVP-critical gaps. Story is ready for implementation after dependency resolves.
