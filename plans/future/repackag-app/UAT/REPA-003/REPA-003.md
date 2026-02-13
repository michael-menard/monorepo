---
id: REPA-003
title: "Migrate Upload Hooks to @repo/upload"
status: in-qa
priority: P2
epic: repackag-app
story_type: tech_debt
points: 5
experiment_variant: control
created_at: "2026-02-10"
depends_on: ["REPA-002"]
blocks: ["REPA-005"]
surfaces:
  frontend: true
  backend: false
  database: false
  infra: false
tags:
  - hook-migration
  - consolidation
  - upload
  - auth-refactor
predictions:
  split_risk: 0.5
  review_cycles: 3
  token_estimate: 120000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
elaborated_at: "2026-02-10T00:00:00Z"
elaboration_verdict: "CONDITIONAL PASS"
---

# REPA-003: Migrate Upload Hooks to @repo/upload

## Context

The monorepo currently has **two duplicate implementations** of `useUploadManager` (610 lines each in main-app and app-instructions-gallery) and **two divergent implementations** of `useUploaderSession` (313 lines authenticated in main-app, 261 lines anonymous-only in app-instructions-gallery).

These hooks manage critical upload functionality:
- **Concurrent file uploads** with configurable concurrency limits
- **Progress tracking** for individual files and overall batch
- **Cancellation** via AbortController
- **Retry logic** with file handle tracking
- **Session expiry detection** (401 handling)
- **Auto-refresh** when session expires
- **localStorage persistence** with debounced writes (300ms)
- **Session restoration** with expiry checking (24-hour TTL)

**The Problem:**
1. Two identical `useUploadManager` implementations must be maintained separately
2. Two `useUploaderSession` implementations have **diverged**:
   - `main-app` (313 lines): Supports both authenticated and anonymous sessions via Redux integration
   - `app-instructions-gallery` (261 lines): Anonymous-only, no Redux dependency
3. Any bug fix or feature enhancement must be applied to multiple locations
4. No single source of truth for upload management patterns
5. Risk of behavior divergence over time

**Reality Baseline (from STORY-SEED.md):**
- **Existing implementations identified:**
  - `apps/web/main-app/src/hooks/useUploadManager.ts` (610 lines, 34 tests)
  - `apps/web/main-app/src/hooks/useUploaderSession.ts` (313 lines, 8 tests)
  - `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts` (610 lines, exact duplicate)
  - `apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts` (261 lines, anonymous-only variant)
- **Shared packages already in use:**
  - `@repo/upload-types` (types, utilities, session helpers)
  - `@repo/upload-client` (XHR upload client - **will be migrated to @repo/upload/client by REPA-002**)
  - `@repo/logger` (logging)
  - `@repo/app-component-library` (useToast for session restoration)
- **Consuming components:**
  - `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
  - `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
  - SessionProvider components in both apps
- **Test coverage baseline:** 1128 total lines of tests across both apps (34 tests for useUploadManager, 8 tests for useUploaderSession)

---

## Goal

Eliminate duplicate upload hook implementations across apps by consolidating into `@repo/upload/hooks` with:
- Single `useUploadManager` implementation maintaining all existing functionality
- Unified `useUploaderSession` supporting **both authenticated and anonymous sessions** via dependency injection
- Comprehensive test coverage migrated to the shared package
- Clear migration path for consuming apps with backward-compatible APIs where possible

---

## Non-Goals

**Explicitly Out of Scope:**
- **Upload component migration:** Moving upload UI components (Uploader, ThumbnailUpload, etc.) is deferred to **REPA-005**
- **Image processing migration:** Image compression and HEIC conversion are deferred to **REPA-004**
- **Upload type migration:** Moving @repo/upload-types to @repo/upload/types is deferred to **REPA-006**
- **New upload features:** This story only consolidates existing functionality, no new features
- **Backend upload API changes:** No changes to upload session endpoints or presigned URL generation

---

## Scope

### Packages Touched
- **@repo/upload** (new package, created by REPA-001)
  - `/hooks/useUploadManager.ts` (create)
  - `/hooks/useUploaderSession.ts` (create)
  - `/hooks/index.ts` (create barrel export)
  - `/hooks/__tests__/useUploadManager.test.tsx` (create)
  - `/hooks/__tests__/useUploaderSession.test.tsx` (create)

### Apps Updated
- **apps/web/main-app**
  - Update imports in: `InstructionsNewPage.tsx`, `SessionProvider/index.tsx`
  - Pass `isAuthenticated` and `userId` props to `useUploaderSession`
  - Delete: `src/hooks/useUploadManager.ts`, `src/hooks/useUploaderSession.ts`
  - Delete or simplify: `src/hooks/__tests__/useUploadManager.test.tsx`, `src/hooks/__tests__/useUploaderSession.test.tsx`

- **apps/web/app-instructions-gallery**
  - Update imports in: `upload-page.tsx`, `SessionProvider/index.tsx`
  - No auth props needed (defaults to anonymous)
  - Delete: `src/hooks/useUploadManager.ts`, `src/hooks/useUploaderSession.ts`
  - Delete or simplify: corresponding test files

---

## Acceptance Criteria

### Hook Implementation
- [ ] **AC-1:** Create `@repo/upload/hooks/useUploadManager.ts` with single consolidated implementation
- [ ] **AC-2:** `useUploadManager` supports all features from both existing implementations:
  - Concurrent uploads with configurable concurrency (default: 3)
  - Progress tracking per file (0-100%) and batch-level aggregation
  - Cancel uploads via AbortController
  - Retry failed uploads with file handle tracking
  - Session expiry detection (401 → status: 'expired', onSessionExpired callback)
  - File status tracking (queued, uploading, success, failed, expired, canceled)
- [ ] **AC-3:** Create `@repo/upload/hooks/useUploaderSession.ts` with unified implementation supporting both authenticated and anonymous sessions
- [ ] **AC-4:** `useUploaderSession` accepts `isAuthenticated` and `userId` parameters to determine session key strategy:
  - Authenticated: `uploader-session:{userId}`
  - Anonymous: `uploader-session-anon:{generatedSessionId}`
- [ ] **AC-5:** `useUploaderSession` maintains localStorage persistence with debounced writes (300ms delay)
- [ ] **AC-6:** `useUploaderSession` supports session restoration with expiry checking:
  - Sessions older than 24 hours are discarded
  - Valid sessions trigger toast notification: "Previous session restored"
  - Expiry buffer: 30 seconds before actual expiry
- [ ] **AC-7:** `useUploaderSession` supports migration from anonymous to authenticated session keys:
  - When `isAuthenticated` changes from false → true, migrate session data
  - Old anonymous key removed from localStorage
  - Session data preserved under new user key
  - No data loss during migration
- [ ] **AC-8:** Hook interfaces maintain backward compatibility OR provide clear migration guide:
  - `useUploadManager`: API unchanged (no breaking changes)
  - `useUploaderSession`: **Breaking change** - requires `isAuthenticated` and `userId` props (migration guide in story completion comment)

### Testing
- [ ] **AC-9:** Comprehensive unit tests for `useUploadManager` covering:
  - Initialization and file addition
  - Concurrency control (never exceed max concurrent uploads)
  - Progress tracking and status transitions
  - Cancel operation (AbortController.abort() called)
  - Retry operation (file re-queued)
  - Session expiry detection (401 → status: 'expired', onSessionExpired invoked)
  - Error handling (network failures, upload errors)
  - File handle tracking for retry scenarios
- [ ] **AC-10:** Comprehensive unit tests for `useUploaderSession` covering:
  - Authenticated mode: correct storage key format (`uploader-session:{userId}`)
  - Anonymous mode: correct storage key format (`uploader-session-anon:{sessionId}`)
  - Debounced localStorage writes (300ms delay verified via fake timers)
  - Session restoration (valid session → wasRestored: true, toast shown)
  - Expired session handling (>24 hours → not restored, removed from storage)
  - Session migration (anon → authenticated: data preserved, keys updated)
  - Invalid localStorage data (malformed JSON → graceful fallback, no crash)
- [ ] **AC-11:** All unit tests pass: `pnpm test --filter=@repo/upload`
- [ ] **AC-12:** Test coverage >= 45% for @repo/upload package

### App Migration
- [ ] **AC-13:** Update main-app to use `@repo/upload/hooks` instead of local implementations:
  - Import from `@repo/upload/hooks`
  - Pass `isAuthenticated` and `userId` to `useUploaderSession`
- [ ] **AC-14:** Update app-instructions-gallery to use `@repo/upload/hooks` instead of local implementations:
  - Import from `@repo/upload/hooks`
  - Use default anonymous mode (no auth props)
- [ ] **AC-15:** Delete duplicate hook files from both apps after successful migration:
  - `main-app/src/hooks/useUploadManager.ts`
  - `main-app/src/hooks/useUploaderSession.ts`
  - `app-instructions-gallery/src/hooks/useUploadManager.ts`
  - `app-instructions-gallery/src/hooks/useUploaderSession.ts`
- [ ] **AC-16:** All existing tests for upload flows continue to pass:
  - `pnpm test --filter=main-app`
  - `pnpm test --filter=app-instructions-gallery`

### Quality Gates
- [ ] **AC-17:** TypeScript compilation succeeds with no errors: `pnpm check-types:all`
- [ ] **AC-18:** Linting passes with no errors: `pnpm lint:all`
- [ ] **AC-19:** No lingering imports to old hook locations: `grep -r "from '@/hooks/useUpload" apps/web` returns nothing

### Implementation Clarifications
- [ ] **AC-20:** Explicitly document upload client import path migration:
  - main-app currently uses `@/services/api/uploadClient` (app-local implementation)
  - app-instructions-gallery uses `@repo/upload-client`
  - After REPA-002 completion, both must import from `@repo/upload/client`
  - Delete `apps/web/main-app/src/services/api/uploadClient.ts` after migration
  _Added by autonomous elaboration_

- [ ] **AC-21:** Use existing storage key format to preserve user sessions:
  - VERIFIED: @repo/upload-types uses `uploader:{route}:{userId}` format (not `uploader-session:{userId}`)
  - Update AC-4, AC-10, and Architecture Notes to match existing format
  - This prevents breaking existing user sessions with in-progress uploads
  - Authenticated: `uploader:{route}:{userId}` (e.g., `uploader:/instructions/new:user-123`)
  - Anonymous: `uploader:{route}:anon:{sessionId}` (e.g., `uploader:/upload:anon:abc123`)
  _Added by autonomous elaboration_

- [ ] **AC-22:** Implement localStorage key migration logic for anonymous-to-authenticated transition:
  - Story references `migrateSession(oldKey, newKey)` utility which does NOT exist in @repo/upload-types
  - Existing `migrateSession` in @repo/upload-types is for schema version migration only
  - Must inline localStorage key migration logic in useUploaderSession useEffect
  - Migration logic: copy session data from old anon key to new user key, delete old key
  - Alternative: defer to REPA-006 to implement missing utility function
  _Added by autonomous elaboration_

---

## Reuse Plan

### Packages
| Package | Usage | Status |
|---------|-------|--------|
| `@repo/upload-types` | Types (UploaderFileItem, UploadBatchState, FileCategory), session utilities (parseSession, serializeSession, createEmptySession, getStorageKey, generateAnonSessionId, migrateSession) | ✅ Available |
| `@repo/upload/client` | Upload client functions (uploadToPresignedUrl, UploadError) | ⏸️ Blocked by REPA-002 |
| `@repo/logger` | Logging utility (no console.log per CLAUDE.md) | ✅ Available |
| `@repo/app-component-library` | useToast hook for session restoration notifications | ✅ Available |

### Patterns
- **Debounced localStorage writes:** 300ms delay, best-effort cleanup on errors (from LESSONS-LEARNED STORY-008)
- **Discriminated union status types:** `status: 'queued' | 'uploading' | 'success' | 'failed' | 'expired' | 'canceled'`
- **File handle tracking:** useRef to store File objects for retry scenarios
- **Session expiry buffer:** Check expiry 30 seconds before actual TTL to give user time to save
- **AbortController for cancellation:** Standard pattern for XHR abort

---

## Architecture Notes

### Dependency Injection for Auth State

**Problem:** `main-app` implementation is tightly coupled to Redux:
```typescript
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slices/authSlice'

const { isAuthenticated, user } = useAppSelector(selectAuth)
```

**Solution:** Accept auth state as hook parameters instead of importing from Redux:

```typescript
export interface UseUploaderSessionOptions {
  route: string
  isAuthenticated?: boolean  // NEW: Optional, defaults to false
  userId?: string            // NEW: Optional, undefined if anonymous
  onRestore?: (session: UploaderSession) => void
}

export function useUploaderSession(options: UseUploaderSessionOptions) {
  const { route, isAuthenticated = false, userId, onRestore } = options

  // Use provided auth state instead of Redux
  const storageKey = useMemo(() => {
    const anonId = !isAuthenticated ? getAnonSessionId() : undefined
    return getStorageKey(route, userId, anonId)
  }, [route, isAuthenticated, userId])

  // Rest of implementation unchanged
}
```

**Benefits:**
- Decouples hook from Redux (can use with any state management)
- `app-instructions-gallery` can use without auth infrastructure
- `main-app` explicitly passes auth state (clearer dependency)

**Migration Impact:**
- **Breaking change** for `useUploaderSession` API
- Apps must update call sites to pass `isAuthenticated` and `userId`
- Clear migration guide will be provided in story completion comment

---

### Session Key Strategy

**Storage Keys:**
- **Authenticated:** `uploader-session:{userId}` (e.g., `uploader-session:user-123`)
- **Anonymous:** `uploader-session-anon:{sessionId}` (e.g., `uploader-session-anon:anon-abc123`)

**Key Generation:**
```typescript
const storageKey = useMemo(() => {
  const anonId = !isAuthenticated ? getAnonSessionId() : undefined
  return getStorageKey(route, userId, anonId)
}, [route, isAuthenticated, userId])
```

**Session Migration (Anon → Authenticated):**
When user logs in mid-session, migrate data from anon key to user key:
```typescript
useEffect(() => {
  if (isAuthenticated && wasAnonymous) {
    migrateSession(oldAnonKey, newUserKey)
    // Old anon key removed, data preserved under user key
  }
}, [isAuthenticated, userId])
```

**Utility Functions (from @repo/upload-types):**
- `getStorageKey(route, userId?, anonId?)` - Generate correct storage key
- `generateAnonSessionId()` - Create unique anon ID (localStorage persisted)
- `migrateSession(oldKey, newKey)` - Move session data between keys

---

### File Handle Tracking

**Pattern:**
```typescript
const fileHandlesRef = useRef<Map<string, File>>(new Map())

// On addFiles:
fileHandlesRef.current.set(fileId, file)

// On retryFile:
const fileHandle = fileHandlesRef.current.get(fileId)
if (!fileHandle) {
  logger.error('File handle lost, cannot retry', { fileId })
  return { success: false, error: 'File not available for retry' }
}
```

**Why Needed:**
- Browser loses File object references after page refresh or navigation
- Retry requires original File object to re-upload
- If file handle lost, user must re-select file

**Edge Case Handling:**
- If retry called but file handle missing → show error message
- User prompted to re-select file via file input
- No automatic re-upload attempt (prevents infinite loops)

---

## Test Plan

**See:** `plans/future/repackag-app/REPA-003/_pm/TEST-PLAN.md` for full test plan.

**Summary:**
- **Unit Tests:** 42+ test cases covering all hook functionality
  - `useUploadManager.test.tsx`: 34 tests (concurrency, progress, cancel, retry, expiry, errors)
  - `useUploaderSession.test.tsx`: 8 tests (auth/anon modes, persistence, restoration, migration)
- **Integration Tests:** Minimal smoke tests in apps to verify import paths work
- **E2E Tests (Optional):** Playwright test for full upload flow in InstructionsNewPage

**Key Test Scenarios:**
1. **Concurrent upload flow:** 5 files, concurrency: 3 → verify 3 active at a time
2. **Authenticated session management:** Persist to user key, restore on reload
3. **Anonymous session management:** Persist to anon key, restore on reload
4. **Session migration:** Anon user logs in → session data migrated to user key
5. **Session expiry detection:** 401 response → status: 'expired', onSessionExpired called
6. **Cancel mid-upload:** AbortController.abort() called, status: 'canceled'
7. **Retry after file handle lost:** Error message shown, user prompted to re-select

**Verification Checklist:**
- [ ] All unit tests pass: `pnpm test --filter=@repo/upload`
- [ ] All app tests pass: `pnpm test:all`
- [ ] TypeScript compiles: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] Manual verification: Upload flows work in both apps
- [ ] Session restoration toast appears after page refresh
- [ ] Upload progress bars update smoothly
- [ ] Cancel button stops uploads immediately
- [ ] Retry button re-queues failed files

---

## UI/UX Notes

**See:** `plans/future/repackag-app/REPA-003/_pm/UIUX-NOTES.md` for full UI/UX analysis.

**Summary:**
- **User-Facing Changes:** NONE
- This is a pure implementation migration with **zero user-facing changes**
- All upload behaviors, error messages, and visual feedback remain identical

**Behaviors to Preserve:**
1. **Session restoration toast:** "Previous session restored" (blue info toast)
2. **Upload progress indicators:** Progress bars (0-100%), status badges, file size/name
3. **Error messaging:** Identical error text for network failures, 401 expiry, rate limiting
4. **Session expiry UI flow:** Upload stops, status: "Expired", SessionExpiredBanner appears
5. **Concurrent upload visual feedback:** Max 3 files show "Uploading" at once, rest show "Queued"
6. **Cancel/Retry button interactions:** Immediate stop on cancel, re-upload on retry

**Manual Testing Required:**
- [ ] Start upload, refresh page → session restoration toast appears
- [ ] Upload multiple files → progress bars update smoothly
- [ ] Cancel file mid-upload → status changes to "Canceled" immediately
- [ ] Trigger 401 error → SessionExpiredBanner appears
- [ ] Upload fails → error message matches existing text
- [ ] Retry failed file → re-upload starts correctly
- [ ] Upload exceeds concurrency → files queue correctly
- [ ] Mobile viewport → upload UI remains functional

**Test in Apps:**
- [ ] main-app: /instructions/new page
- [ ] app-instructions-gallery: /upload page

**Test in Browsers:**
- [ ] Chrome (primary)
- [ ] Safari (secondary)
- [ ] Mobile Safari (iOS)

---

## Dev Feasibility

**See:** `plans/future/repackag-app/REPA-003/_pm/DEV-FEASIBILITY.md` for full feasibility analysis.

**Summary:**
- **Feasibility:** MEDIUM (blocked by dependencies, moderate technical complexity)
- **Blocking Dependencies:** REPA-001 (package structure), REPA-002 (upload client migration)
- **Estimated Story Points:** 5 SP
- **Estimated Implementation Time:** 2-3 days (after dependencies resolved)

**Key Technical Challenges:**

1. **Merge Divergent useUploaderSession Implementations:**
   - main-app: Redux-integrated (313 lines)
   - app-instructions-gallery: Anonymous-only (261 lines)
   - Solution: Dependency injection (accept `isAuthenticated`, `userId` as props)

2. **Import Path Updates:**
   - From: `import { useUploadManager } from '@/hooks/useUploadManager'`
   - To: `import { useUploadManager } from '@repo/upload/hooks'`
   - Verify with: `grep -r "from '@/hooks/useUpload" apps/web` (should return nothing)

3. **Test Migration Strategy:**
   - Recommendation: Move tests to `@repo/upload/hooks/__tests__/`
   - Adapt Redux mocks → direct prop mocks
   - Keep 2-3 minimal smoke tests in apps for integration verification

4. **File Handle Tracking Complexity:**
   - useRef pattern works identically in shared packages (no issues expected)
   - Verify with unit test: add file, retry, check ref stores correctly

5. **Session Key Strategy Verification:**
   - `getStorageKey` utility already handles both userId and anonSessionId
   - Add unit tests for session migration scenario (anon → authenticated)

**Implementation Sequence:**
1. **Phase 1:** Create consolidated hooks in @repo/upload/hooks (4 hours)
2. **Phase 2:** Migrate tests to package (3 hours)
3. **Phase 3:** Update apps (import paths, pass auth props) (2 hours)
4. **Phase 4:** Cleanup & verification (delete old files, run checks) (1 hour)

**Total:** 10 hours (2-3 days with QA and manual testing)

**Risk Assessment:**
- **High Risks:** Dependency chain blocker, breaking changes in useUploaderSession API
- **Medium Risks:** Test migration complexity, session migration edge cases
- **Low Risks:** File handle tracking in shared package

---

## Risks & Blockers

### Blocking Dependencies
- **REPA-001** (Create @repo/upload Package Structure) - **REQUIRED before work can start**
  - Need: `@repo/upload/hooks/` directory exists
  - Need: package.json configured with dependencies
  - Need: Vitest, TypeScript, ESLint configs
- **REPA-002** (Migrate Upload Client Functions) - **REQUIRED for correct import paths**
  - Need: Upload client moved from `@repo/upload-client` to `@repo/upload/client`
  - Impact: Hooks import from wrong path if REPA-002 incomplete

### Breaking Changes
- **useUploaderSession API change:** Apps must pass `isAuthenticated` and `userId` props
  - Mitigation: Provide clear migration guide in story completion comment
  - Impact: 1-2 hours of app-level refactoring

### Test Migration Complexity
- **1128 lines of existing tests** must be adapted:
  - Remove Redux Provider wrappers
  - Mock auth props directly
  - Verify all test scenarios still covered
  - Mitigation: Port tests incrementally, run after each change

### Session Migration Edge Cases
- **Anon → Authenticated migration** has subtle timing issues:
  - If user logs in mid-upload, session must migrate without data loss
  - Mitigation: Add dedicated unit test, manual E2E verification

---

## Dependencies

**Depends On:**
- **REPA-001** (Create @repo/upload Package Structure) - Package must exist before creating hooks
- **REPA-002** (Migrate Upload Client Functions) - Hooks import from @repo/upload/client

**Blocks:**
- **REPA-005** (Migrate Upload Components) - Upload components depend on consolidated hooks

---

## Success Criteria

**Story is complete when:**
1. ✅ Single `useUploadManager` implementation exists in `@repo/upload/hooks`
2. ✅ Single `useUploaderSession` implementation supports both authenticated and anonymous sessions
3. ✅ All unit tests pass in @repo/upload package (coverage >= 45%)
4. ✅ Both apps import from `@repo/upload/hooks` successfully
5. ✅ All app-level upload tests pass
6. ✅ Old hook files deleted from both apps
7. ✅ TypeScript compilation succeeds: `pnpm check-types:all`
8. ✅ Linting passes: `pnpm lint:all`
9. ✅ Manual verification: Upload flows work identically in both apps
10. ✅ No lingering imports to old hook locations

**User-Visible Success:**
- Upload flows in main-app and app-instructions-gallery work exactly as before
- Session restoration toast appears after page refresh
- No regressions in upload progress, cancellation, retry, or error handling

---

## Implementation Notes

### Migration Guide for Apps

**main-app (authenticated mode):**
```typescript
// Before:
import { useUploaderSession } from '@/hooks/useUploaderSession'

const uploaderSession = useUploaderSession({
  route: '/instructions/new',
})

// After:
import { useUploaderSession } from '@repo/upload/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slices/authSlice'

const { isAuthenticated, user } = useAppSelector(selectAuth)

const uploaderSession = useUploaderSession({
  route: '/instructions/new',
  isAuthenticated,        // NEW: Pass auth state explicitly
  userId: user?.id,       // NEW: Pass user ID explicitly
})
```

**app-instructions-gallery (anonymous mode):**
```typescript
// Before:
import { useUploaderSession } from '@/hooks/useUploaderSession'

const uploaderSession = useUploaderSession({
  route: '/upload',
})

// After:
import { useUploaderSession } from '@repo/upload/hooks'

const uploaderSession = useUploaderSession({
  route: '/upload',
  // isAuthenticated and userId omitted (defaults to anonymous mode)
})
```

### Verification Commands

```bash
# After implementation, verify no lingering imports:
grep -r "from '@/hooks/useUpload" apps/web/main-app/src
grep -r "from '@/hooks/useUpload" apps/web/app-instructions-gallery/src
# Should return no results

# Run all checks:
pnpm test --filter=@repo/upload           # Unit tests in package
pnpm test --filter=main-app               # Integration tests in main-app
pnpm test --filter=app-instructions-gallery  # Integration tests in gallery
pnpm check-types:all                      # TypeScript compilation
pnpm lint:all                             # Linting

# Manual verification:
# 1. Start main-app: pnpm dev --filter=main-app
# 2. Navigate to /instructions/new
# 3. Upload files, verify progress bars work
# 4. Refresh page, verify session restoration toast
# 5. Repeat for app-instructions-gallery at /upload
```

---

## Story Seed Reference

**Generated:** 2026-02-10
**Seed File:** `plans/future/repackag-app/REPA-003/_pm/STORY-SEED.md`

**Key Constraints from Seed:**
- REPA-003 is **BLOCKED** by REPA-001 and REPA-002 (both pending)
- useUploadManager: 610 lines each in both apps (exact duplicates)
- useUploaderSession: 313 lines (main-app) vs 261 lines (gallery) - diverged implementations
- Test coverage: 1128 total lines across both apps (34 + 8 tests)
- Redux integration in main-app requires dependency injection refactor
- File handle tracking uses useRef (works identically in shared packages)

**Recommendations from Seed:**
- Wait for REPA-001 and REPA-002 completion before starting
- Allocate extra time for Redux-to-DI refactoring (2-3 hours)
- Consider splitting test migration into separate subtask if timeline is tight
- Manual verification critical: test upload flows in both apps post-migration

---

## Completion Checklist

**Before Starting:**
- [ ] REPA-001 complete: `@repo/upload` package structure exists
- [ ] REPA-002 complete: `@repo/upload/client` available
- [ ] All existing upload tests passing in both apps

**Implementation:**
- [ ] Create `@repo/upload/hooks/useUploadManager.ts`
- [ ] Create `@repo/upload/hooks/useUploaderSession.ts`
- [ ] Create `@repo/upload/hooks/index.ts` (barrel export)
- [ ] Create unit tests in `@repo/upload/hooks/__tests__/`
- [ ] Update main-app imports and pass auth props
- [ ] Update app-instructions-gallery imports
- [ ] Delete old hook files from both apps
- [ ] Delete old test files (or keep as minimal smoke tests)

**Verification:**
- [ ] All unit tests pass: `pnpm test --filter=@repo/upload`
- [ ] All app tests pass: `pnpm test:all`
- [ ] TypeScript compiles: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] No lingering imports: `grep -r "from '@/hooks/useUpload" apps/web` returns nothing

**Manual Testing:**
- [ ] Upload flow works in main-app
- [ ] Upload flow works in app-instructions-gallery
- [ ] Session restoration works (refresh page, toast appears)
- [ ] Authenticated vs anonymous modes work correctly
- [ ] Cancel button stops uploads immediately
- [ ] Retry button re-queues failed files
- [ ] 401 expiry triggers SessionExpiredBanner

**Documentation:**
- [ ] Migration guide in story completion comment
- [ ] Update any relevant package READMEs (if they exist)
- [ ] Log completion in REPA stories index

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Upload client import path migration not explicitly documented | Add as AC for clear migration instructions | AC 20 |
| 2 | Storage key format mismatch will break existing sessions | Add as AC to use existing format and preserve sessions | AC 21 |
| 3 | Story references non-existent migrateSession utility | Add as AC for localStorage key migration implementation | AC 22 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | useToast import path inconsistency | integration | KB-logged |
| 2 | No TypeScript type-only imports | code-style | KB-logged |
| 3 | No Zod schema migration for hook options | code-style | KB-logged |
| 4 | Missing hook deprecation warnings | edge-case | KB-logged |
| 5 | No performance benchmarks for debounced localStorage writes | performance | KB-logged |
| 6 | File handle tracking uses Map without size limits | memory-management | KB-logged |
| 7 | Session migration (anon → auth) not covered by E2E tests | test-coverage | KB-logged |
| 8 | No instrumentation for upload analytics | analytics | KB-logged |
| 10 | Hook composability enhancement opportunity | enhancement | KB-logged |

### Summary

- **ACs added**: 3 (AC-20, AC-21, AC-22 for MVP-critical gaps)
- **KB entries created**: 18 (non-blocking findings + enhancement opportunities)
- **Audit checks passed**: 8/8 (100%)
- **Mode**: autonomous
- **Story ready for development**: YES (after REPA-001 and REPA-002 completion)
