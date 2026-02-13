---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-002

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists. This seed is based on codebase scanning and the REPA epic plan.

**WARNING:** Proceeding without baseline reality context. This seed relies on direct codebase scanning and may miss active work or constraints from ongoing stories.

### Relevant Existing Features

Based on codebase scanning, the following upload-related packages and files exist:

| Feature | Location | Status |
|---------|----------|--------|
| `@repo/upload-client` package | `/packages/core/upload-client/` | Exists - Contains XHR upload client (manager.ts, xhr.ts, types.ts) |
| `@repo/upload-types` package | `/packages/core/upload-types/` | Exists - Contains upload Zod schemas |
| finalizeClient (main-app) | `/apps/web/main-app/src/services/api/finalizeClient.ts` | Exists - 339 lines |
| finalizeClient (instructions-gallery) | `/apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` | Exists - 339 lines (EXACT DUPLICATE) |
| useUploadManager (main-app) | `/apps/web/main-app/src/hooks/useUploadManager.ts` | Exists |
| useUploadManager (instructions-gallery) | `/apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts` | Exists (duplicate) |
| useUploaderSession (main-app) | `/apps/web/main-app/src/hooks/useUploaderSession.ts` | Exists - Has user auth handling |
| useUploaderSession (instructions-gallery) | `/apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts` | Exists - Near duplicate with anonymous handling |

### Active In-Progress Work

**WARNING:** Cannot determine active in-progress work without baseline file.

Based on git status:
- No active changes detected in upload-related files
- REPA-001 is listed as pending in stories.index.md (not yet started)
- REPA-002 depends on REPA-001 completing first

### Constraints to Respect

From CLAUDE.md and codebase patterns:
- **Zod-first types required** - All types must be defined via Zod schemas with `z.infer<>`
- **No barrel files** - Import directly from source files
- **Use `@repo/logger`** - Never use console.log
- **Component directory structure** - Use `index.tsx`, `__tests__/`, `__types__/`, `utils/` pattern
- **Minimum 45% test coverage** - All new code must be tested
- **Workspace dependencies** - Use `workspace:*` protocol
- **Package deprecation period** - Old packages need proper deprecation before removal

---

## Retrieved Context

### Related Packages

**Existing Upload Packages:**
1. **`@repo/upload-client`** (`packages/core/upload-client/`)
   - `src/xhr.ts` - XHR upload functions (uploadFile, uploadToPresignedUrl)
   - `src/manager.ts` - createUploadManager for concurrent uploads
   - `src/types.ts` - Zod schemas for upload progress, errors, tasks
   - `src/index.ts` - Barrel exports
   - Tests: `__tests__/manager.test.ts`, `__tests__/xhr.test.ts`

2. **`@repo/upload-types`** (`packages/core/upload-types/`)
   - `src/upload.ts` - Upload session schemas
   - `src/session.ts` - Session management schemas
   - `src/slug.ts` - Slug schemas
   - `src/edit.ts` - Edit schemas
   - Tests in `__tests__/` directory

**Target Package (To Be Created in REPA-001):**
- **`@repo/upload`** (`packages/core/upload/`)
   - Structure: `client/`, `hooks/`, `image/`, `components/`, `types/`
   - Will consolidate all upload-related code

### Related Endpoints

From finalizeClient.ts analysis:
- **POST `/api/mocs/uploads/finalize`** - Finalize upload session endpoint
  - Handles 409 (conflict), 429 (rate limit), 400 (validation errors)
  - Returns MOC data with slug, status, keys

### Related Components

**Import Sites for finalizeClient:**
1. `/apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx` (line 42)
   - Imports: `finalizeSession`, `FileValidationError`
2. `/apps/web/app-instructions-gallery/src/pages/upload-page.tsx` (line 42)
   - Imports: `finalizeSession`, `FileValidationError`

**Import Sites for @repo/upload-client:**
- 52 files reference `@repo/upload-client` (from grep results)
- Key consumers: main-app, app-instructions-gallery, app-sets-gallery, app-wishlist-gallery

### Reuse Candidates

**From `@repo/upload-client`:**
- XHR upload functions (uploadFile, uploadToPresignedUrl) - Keep as-is
- Upload manager (createUploadManager) - Keep as-is
- Upload types and schemas - Keep as-is
- Tests - Migrate to new package structure

**From app-level implementations:**
- finalizeClient.ts logic - Move to `@repo/upload/client/finalize.ts`
- Finalize schemas (FinalizeRequest, FinalizeSuccessResponse, FileValidationError, etc.)

---

## Knowledge Context

### Lessons Learned

**WARNING:** No lessons loaded from knowledge base (requires kb_search tool which was not available).

### Blockers to Avoid (from past stories)

Based on similar package migration patterns:
- Ensure all import sites are updated before deleting old files
- Test both authenticated and anonymous use cases
- Handle edge cases in error handling (network errors, timeouts, rate limits)
- Verify CSRF token handling is preserved

### Architecture Decisions (ADRs)

**WARNING:** ADR-LOG.md was not read. No ADR constraints have been validated.

Common ADR constraints that may apply:
- API path schema (frontend vs backend paths)
- Testing strategy (unit, integration, UAT requirements)
- Authentication patterns (cookie-based, CSRF tokens)

### Patterns to Follow

From existing upload-client package:
- **XHR for upload progress** - Use XMLHttpRequest instead of fetch for progress tracking
- **AbortController for cancellation** - Support cancellable uploads
- **Discriminated union results** - Use `{ success: true, data }` / `{ success: false, error }` pattern
- **Typed error codes** - Use Zod enums for error code types
- **Progress callbacks** - Provide onProgress callbacks for UI updates

From finalizeClient.ts:
- **Error-specific handling** - Separate logic for 409 (conflict), 429 (rate limit), 400 (validation)
- **Request ID tracking** - Extract `X-Request-Id` header for debugging
- **Retry-After parsing** - Extract retry delay from headers for rate limiting
- **Zod validation** - Validate API responses with Zod schemas

### Patterns to Avoid

- **Console.log usage** - Use `@repo/logger` instead
- **Barrel file re-exports** - Import directly from source files
- **TypeScript interfaces** - Use Zod schemas with z.infer<>
- **Hardcoded API URLs** - Use environment variables (VITE_API_BASE_URL)

---

## Conflict Analysis

No conflicts detected based on available information.

**Note:** Without baseline reality file, potential conflicts with active work cannot be verified.

---

## Story Seed

### Title
**Migrate Upload Client Functions to @repo/upload**

### Description

**Context:**
Currently, upload client functionality is fragmented across multiple locations:
- Base XHR upload logic lives in `@repo/upload-client` (created in Story 3.1.32)
- Finalize client logic is duplicated in both `main-app` and `app-instructions-gallery` (339 lines each)
- Upload hooks are duplicated across apps (covered separately in REPA-003)

This fragmentation leads to:
1. **Exact duplicate code** - The finalizeClient.ts file is identical in both apps
2. **No shared source of truth** - Changes must be made in multiple places
3. **Inconsistent package structure** - Upload logic spans multiple packages

**Problem:**
After REPA-001 creates the `@repo/upload` package structure, we need to consolidate the upload client functions into a single location. The existing `@repo/upload-client` package needs to be migrated to `@repo/upload/client/`, and the duplicate finalizeClient implementations need to be merged into this new structure.

**Solution Direction:**
1. **Move XHR client code** from `@repo/upload-client` to `@repo/upload/client/`
   - Migrate `xhr.ts`, `manager.ts`, `types.ts` to new location
   - Preserve all existing functionality and tests
   - Update exports to maintain public API

2. **Add finalize client functions** to `@repo/upload/client/finalize.ts`
   - Take the finalizeClient.ts implementation (339 lines)
   - Create `@repo/upload/client/finalize.ts` with all finalize logic
   - Include all schemas: FinalizeRequest, FinalizeSuccessResponse, FileValidationError, etc.
   - Preserve error handling for 409, 429, 400 cases

3. **Update all import sites**
   - Change imports from `@repo/upload-client` to `@repo/upload`
   - Change imports from `@/services/api/finalizeClient` to `@repo/upload`
   - Update InstructionsNewPage.tsx in main-app
   - Update upload-page.tsx in app-instructions-gallery

4. **Delete duplicate files**
   - Remove `apps/web/main-app/src/services/api/finalizeClient.ts`
   - Remove `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts`

5. **Deprecate old package**
   - Add deprecation notice to `@repo/upload-client/package.json`
   - Update README to point to `@repo/upload`
   - Plan removal in future story (after deprecation period)

### Initial Acceptance Criteria

- [ ] **AC-1: XHR client code migrated**
  - `@repo/upload/client/xhr.ts` exists with uploadFile and uploadToPresignedUrl
  - `@repo/upload/client/manager.ts` exists with createUploadManager
  - `@repo/upload/client/types.ts` exists with all upload schemas
  - All existing tests migrated to `@repo/upload/client/__tests__/`
  - Tests pass in new location

- [ ] **AC-2: Finalize client functions added**
  - `@repo/upload/client/finalize.ts` created with finalizeSession function
  - FinalizeError class included with all error type helpers
  - All Zod schemas included: FinalizeRequest, FinalizeSuccessResponse, FileValidationError, ConflictErrorDetails
  - Handles 409 (conflict with suggestedSlug), 429 (rate limit with retry-after), 400 (file validation errors)
  - Uses `@repo/logger` for all logging (no console.log)
  - Tests created for finalize functionality

- [ ] **AC-3: Barrel exports updated**
  - `@repo/upload/index.ts` exports all client functions
  - Public API maintains backward compatibility where possible
  - TypeScript types are properly exported

- [ ] **AC-4: All import sites updated**
  - main-app InstructionsNewPage.tsx imports from `@repo/upload`
  - app-instructions-gallery upload-page.tsx imports from `@repo/upload`
  - All 52 references to `@repo/upload-client` updated to `@repo/upload`
  - No broken imports (TypeScript compilation succeeds)

- [ ] **AC-5: Duplicate files deleted**
  - `apps/web/main-app/src/services/api/finalizeClient.ts` removed
  - `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts` removed
  - No finalizeClient.ts files remain in app directories

- [ ] **AC-6: Old package deprecated**
  - `@repo/upload-client/package.json` has deprecation notice
  - `@repo/upload-client/README.md` points to `@repo/upload`
  - Package remains functional for deprecation period
  - Clear migration path documented

- [ ] **AC-7: Quality gates pass**
  - All tests pass (unit tests for client functions)
  - TypeScript compilation succeeds
  - ESLint passes with no errors
  - Test coverage meets 45% minimum threshold

### Non-Goals

- **Creating new upload features** - This story only migrates existing code
- **Refactoring upload logic** - Keep behavior identical to current implementation
- **Removing @repo/upload-client package** - Only deprecate, don't delete (need deprecation period)
- **Migrating upload hooks** - Covered separately in REPA-003
- **Migrating image processing** - Covered separately in REPA-004
- **Migrating upload components** - Covered separately in REPA-005
- **Migrating @repo/upload-types** - Covered separately in REPA-006
- **Updating documentation beyond package README** - Defer to later story
- **Performance optimization** - Keep existing performance characteristics

### Reuse Plan

**Packages:**
- `@repo/upload-client` - Source package (migrate from)
- `@repo/upload` - Target package (migrate to, created in REPA-001)
- `@repo/logger` - Use for all logging
- `zod` - Schema validation
- `vitest` - Testing framework

**Patterns:**
- Discriminated union result types: `{ success: true/false, data/error }`
- Zod-first type definitions with `z.infer<>`
- AbortController for cancellable operations
- XHR for upload progress tracking
- Error-specific handling (409, 429, 400)

**Components:**
- None (this story focuses on client functions only)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Critical testing areas:**
1. **XHR upload functions**
   - Test uploadFile with various file types and sizes
   - Test uploadToPresignedUrl for S3 uploads
   - Test progress callbacks
   - Test cancellation via AbortController
   - Test error handling (network errors, timeouts, HTTP errors)

2. **Upload manager**
   - Test concurrent upload limits (maxConcurrent)
   - Test queue processing
   - Test file cancellation (single and all)
   - Test completion callbacks

3. **Finalize client**
   - Test successful finalize (200/201)
   - Test 409 conflict with suggestedSlug extraction
   - Test 429 rate limit with retry-after parsing
   - Test 400 with file validation errors
   - Test network errors and timeouts
   - Test request cancellation
   - Test CSRF token handling
   - Test request ID tracking

4. **Import site updates**
   - Integration test: Verify InstructionsNewPage.tsx still works
   - Integration test: Verify upload-page.tsx still works
   - Test both authenticated and anonymous upload flows

**Test data:**
- Use MSW for mocking API responses
- Mock presigned URLs for S3 upload tests
- Mock various error scenarios (409, 429, 400, 500)

### For UI/UX Advisor

**No UI/UX work required** - This story is purely backend/infrastructure migration.

**Note:** UI components that use these client functions should continue to work identically. No visual or interaction changes expected.

### For Dev Feasibility

**Implementation considerations:**

1. **Migration sequence** (critical for avoiding broken imports):
   - Step 1: Create `@repo/upload/client/` with all migrated code
   - Step 2: Export from `@repo/upload/index.ts`
   - Step 3: Update all 52 import sites to use `@repo/upload`
   - Step 4: Verify all apps build and tests pass
   - Step 5: Delete duplicate finalizeClient.ts files
   - Step 6: Add deprecation notice to `@repo/upload-client`

2. **Import path updates** (52 files):
   - Use global find-replace: `from '@repo/upload-client'` → `from '@repo/upload'`
   - Verify each file individually (some may need specific exports)
   - Watch for `@/services/api/finalizeClient` imports (2 files)

3. **Package.json updates:**
   - Add `@repo/upload` as dependency to all consuming apps
   - Keep `@repo/upload-client` temporarily for deprecation period
   - Ensure `zod` dependency is in `@repo/upload`

4. **Test migration:**
   - Copy test files from `@repo/upload-client/__tests__/` to `@repo/upload/client/__tests__/`
   - Create new tests for finalize functionality
   - Update test imports to new package paths
   - Ensure MSW mocks are available

5. **Type safety:**
   - Preserve all existing type exports
   - Ensure `z.infer<>` is used for all types
   - Export error classes (UploadError, FinalizeError)

6. **Deprecation notice format:**
   ```json
   {
     "name": "@repo/upload-client",
     "deprecated": "This package is deprecated. Use @repo/upload instead.",
     "description": "DEPRECATED: Migrated to @repo/upload. See @repo/upload for the latest version."
   }
   ```

7. **Rollback plan:**
   - Keep `@repo/upload-client` functional during deprecation period
   - If issues arise, can temporarily revert imports to old package
   - All code changes are non-breaking (only moving files)

8. **Risk areas:**
   - 52 import sites to update (high risk of missing one)
   - CSRF token handling must be preserved exactly
   - Error handling logic must remain identical
   - Progress callback behavior must not change

**Dependencies:**
- **BLOCKS:** REPA-003 (upload hooks migration)
- **BLOCKS:** REPA-005 (upload components migration)
- **DEPENDS ON:** REPA-001 (package structure creation) - MUST be completed first

---

## Metadata

**Story Sizing:**
- **Estimated Story Points:** 2 SP (from epic plan)
- **Complexity:** Medium
  - Code migration is straightforward
  - 52 import sites to update is tedious but not complex
  - No new functionality, just moving code

**Risk Level:** Medium
- **High risk:** Missing an import site among 52 files
- **Medium risk:** Breaking error handling behavior
- **Low risk:** Test migration (tests are well-structured)

**Verification Approach:**
1. Run full monorepo build: `pnpm build`
2. Run all tests: `pnpm test:all`
3. Run type check: `pnpm check-types:all`
4. Manually test InstructionsNewPage.tsx upload flow
5. Manually test upload-page.tsx upload flow

---

**STORY-SEED COMPLETE WITH WARNINGS: 2 warnings**

**Warnings:**
1. No baseline reality file available - cannot verify conflicts with active work
2. No ADR-LOG.md validation - cannot verify architecture constraint compliance

