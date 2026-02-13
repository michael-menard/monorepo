---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: REPA-003

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists for this project. Story seed is generated based on codebase scanning and index context only.

### Relevant Existing Features

No baseline file exists, but codebase analysis reveals:

| Feature | Location | Status |
|---------|----------|--------|
| useUploadManager (main-app) | apps/web/main-app/src/hooks/useUploadManager.ts | Existing (610 lines) |
| useUploadManager (app-instructions-gallery) | apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts | Duplicate (610 lines) |
| useUploaderSession (main-app) | apps/web/main-app/src/hooks/useUploaderSession.ts | Existing (313 lines, authenticated) |
| useUploaderSession (app-instructions-gallery) | apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts | Existing (261 lines, anonymous-only) |
| @repo/upload-types | packages/core/upload-types/ | Existing (types and utilities) |
| @repo/upload-client | packages/core/upload-client/ | Existing (XHR upload client) |

### Active In-Progress Work

Based on git status, no active work directly conflicts with upload hooks. However:

| Area | Status | Relevance |
|------|--------|-----------|
| Feature flags (database-schema, api-client) | Modified + backups exist | No direct conflict |
| Wishlist gallery components | New file added | No direct conflict |

### Constraints to Respect

1. **Dependency Chain**: REPA-003 depends on REPA-002 (Migrate Upload Client Functions) which depends on REPA-001 (Create @repo/upload Package Structure). Both are pending.
2. **Package Structure**: Cannot proceed until @repo/upload package structure exists with client/ and hooks/ directories.
3. **Breaking Changes Risk**: Story index identifies "Breaking changes during upload migration" as a risk.
4. **Authenticated vs Anonymous Sessions**: The two useUploaderSession implementations differ in session management (main-app handles authenticated users with Redux, app-instructions-gallery is anonymous-only).

---

## Retrieved Context

### Related Endpoints

No direct endpoint dependencies identified. Upload hooks interact with:
- S3 presigned URLs (provided by backend, not consumed by hooks)
- Session management (localStorage-based)

### Related Components

Components that consume the upload hooks:

| Component | Location | Hooks Used |
|-----------|----------|------------|
| InstructionsNewPage | apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx | useUploadManager, useUploaderSession |
| upload-page | apps/web/app-instructions-gallery/src/pages/upload-page.tsx | useUploadManager, useUploaderSession |
| SessionProvider | apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx | useUploaderSession |
| SessionProvider | apps/web/app-instructions-gallery/src/components/Uploader/SessionProvider/index.tsx | useUploaderSession |

### Reuse Candidates

| Package/Pattern | Description | Relevance |
|----------------|-------------|-----------|
| @repo/upload-types | Existing upload type definitions (UploaderFileItem, UploadBatchState, FileCategory, etc.) | CRITICAL - types are already shared, hooks will continue to use them |
| @repo/upload-client | Existing XHR upload client (uploadToPresignedUrl, UploadError) | CRITICAL - hooks depend on this, REPA-002 will move this to @repo/upload/client |
| @repo/logger | Logging utility used by both hook implementations | Standard reuse pattern |
| @repo/app-component-library | useToast hook used by useUploaderSession | Standard reuse pattern |
| calculateBatchState utility | From @repo/upload-types | Already shared |
| Session utilities | parseSession, serializeSession, createEmptySession, getStorageKey, generateAnonSessionId, migrateSession | From @repo/upload-types |

---

## Knowledge Context

### Lessons Learned

Based on LESSONS-LEARNED.md (note: file is deprecated but contains historical context):

- **[STORY-007] Discriminated union result types**: The `{ success: true, data } | { success: false, error }` pattern is established across the codebase. Upload hooks don't return this pattern (they use callbacks), but error handling should align with codebase conventions.
  - *Applies because*: Hooks should use consistent error handling patterns even if internal to React.

- **[STORY-008] Best-effort cleanup pattern**: For operations requiring post-operation cleanup (like clearing localStorage), follow the pattern: try cleanup, catch errors, never fail on cleanup failure.
  - *Applies because*: useUploaderSession manages localStorage persistence and cleanup.

- **[Multiple Stories] Token optimization patterns**: Targeted file reads, Grep before Read, avoid reading full large files.
  - *Applies because*: Hooks are 600+ lines each, need careful review planning.

### Blockers to Avoid (from past stories)

- **Reading full large files unnecessarily**: Both useUploadManager implementations are 610 lines. Reading both in full during planning would waste ~3k tokens. Use targeted line ranges.
- **API path mismatches**: Not directly applicable (hooks don't call APIs), but upload client path handling is relevant.
- **Pre-existing failures obscure verification**: Multiple backups and modified files in git status suggest partial migrations in progress. Need scoped verification.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not directly applicable (hooks don't define paths) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks - applies to hook testing |

**Relevant constraints**:
- **ADR-005**: When testing upload hooks, E2E tests should use real localStorage, real File objects, and real AbortController behavior (no mocking of browser APIs).

### Patterns to Follow

- **Zod-first types**: All type definitions should use Zod schemas with `z.infer<>` (from CLAUDE.md)
- **No barrel files**: Import directly from source files (from CLAUDE.md)
- **@repo/logger for all logging**: Never use console.log (from CLAUDE.md)
- **Functional components only**: React hooks should use function declarations (from CLAUDE.md)

### Patterns to Avoid

- **Creating duplicate implementations**: The entire point of REPA-003 is to eliminate the duplicate useUploadManager and useUploaderSession implementations.
- **Reading full serverless.yml**: Not applicable to this story.
- **Skipping dependency tracking**: With REPA-001 and REPA-002 pending, this story CANNOT start until those are complete.

---

## Conflict Analysis

### Conflict: Blocking Dependency Chain
- **Severity**: Blocking
- **Description**: REPA-003 depends on REPA-002 (Migrate Upload Client Functions) which depends on REPA-001 (Create @repo/upload Package Structure). Neither REPA-001 nor REPA-002 has been started. The @repo/upload package does not exist yet, and the upload client has not been migrated from @repo/upload-client to @repo/upload/client. Without these foundations, there is nowhere to place the consolidated hooks.
- **Resolution Hint**: Block REPA-003 seed generation OR generate seed as "ready for elaboration but blocked from implementation". The seed can be elaborated in preparation, but dev implementation cannot begin until REPA-001 and REPA-002 are completed.
- **Source**: Story dependency graph in stories.index.md

---

## Story Seed

### Title
Migrate Upload Hooks to @repo/upload

### Description

**Context**: The monorepo currently has two duplicate implementations of useUploadManager (610 lines each in main-app and app-instructions-gallery) and two divergent implementations of useUploaderSession (313 lines authenticated in main-app, 261 lines anonymous-only in app-instructions-gallery). These hooks manage concurrent file uploads with progress tracking, cancellation, retry, session expiry detection, and localStorage persistence. The duplication creates maintenance overhead and risks divergence in upload behavior across apps.

**Problem**:
1. Two identical useUploadManager implementations must be maintained separately
2. Two useUploaderSession implementations have diverged: main-app supports both authenticated and anonymous sessions via Redux, while app-instructions-gallery only supports anonymous sessions
3. Any bug fix or feature enhancement must be applied to multiple locations
4. No single source of truth for upload management patterns

**Proposed Solution**: Consolidate upload hooks into @repo/upload/hooks with a single useUploadManager implementation and a unified useUploaderSession that supports both authenticated and anonymous sessions. The consolidated hooks will:
- Maintain all existing functionality (concurrency control, progress tracking, retry, session expiry, localStorage persistence)
- Support both authenticated (user-based) and anonymous (session-ID-based) upload sessions
- Provide a clean migration path for consuming apps with backward-compatible APIs where possible
- Include comprehensive tests covering all upload scenarios

**Dependencies**:
- REPA-001 (Create @repo/upload Package Structure) must create @repo/upload package with hooks/ directory
- REPA-002 (Migrate Upload Client Functions) must move upload client to @repo/upload/client so hooks can import from the new location

### Initial Acceptance Criteria

- [ ] AC-1: Create @repo/upload/hooks/useUploadManager with single consolidated implementation
- [ ] AC-2: useUploadManager supports all features from both existing implementations (concurrent uploads, progress, cancel, retry, session expiry detection, file handle tracking)
- [ ] AC-3: Create @repo/upload/hooks/useUploaderSession with unified implementation supporting both authenticated and anonymous sessions
- [ ] AC-4: useUploaderSession accepts isAuthenticated and userId parameters to determine session key strategy
- [ ] AC-5: useUploaderSession maintains localStorage persistence with debounced writes (300ms)
- [ ] AC-6: useUploaderSession supports session restoration with expiry checking (24 hour TTL)
- [ ] AC-7: useUploaderSession supports migration from anonymous to authenticated session keys (when user logs in mid-session)
- [ ] AC-8: All hook interfaces maintain backward compatibility with existing consumers (or provide clear migration guide)
- [ ] AC-9: Comprehensive unit tests for useUploadManager covering concurrency, error handling, retry, session expiry flows
- [ ] AC-10: Comprehensive unit tests for useUploaderSession covering authenticated/anonymous modes, persistence, restoration, migration
- [ ] AC-11: Update main-app to use @repo/upload/hooks instead of local implementations
- [ ] AC-12: Update app-instructions-gallery to use @repo/upload/hooks instead of local implementations
- [ ] AC-13: Delete duplicate hook files from both apps after successful migration
- [ ] AC-14: All existing tests for upload flows continue to pass
- [ ] AC-15: TypeScript compilation succeeds with no errors
- [ ] AC-16: Linting passes with no errors

### Non-Goals

- **Upload component migration**: Moving upload UI components (Uploader, ThumbnailUpload, etc.) is deferred to REPA-005
- **Image processing migration**: Image compression and HEIC conversion are deferred to REPA-004
- **Upload type migration**: Moving @repo/upload-types to @repo/upload/types is deferred to REPA-006
- **New upload features**: This story only consolidates existing functionality, no new features
- **Backend upload API changes**: No changes to upload session endpoints or presigned URL generation

### Reuse Plan

- **Packages**:
  - @repo/upload-types (types, utilities, session helpers)
  - @repo/upload-client (after REPA-002 migrates to @repo/upload/client)
  - @repo/logger (logging)
  - @repo/app-component-library (useToast for session restoration notifications)

- **Patterns**:
  - Debounced localStorage writes (300ms delay)
  - Session expiry buffer (30 seconds before actual expiry)
  - File handle tracking for retry-after-lost-handle detection
  - Discriminated status types (queued, uploading, success, failed, expired, canceled)
  - AbortController for upload cancellation

- **Components**:
  - Test patterns from existing useUploadManager.test.tsx and useUploaderSession.test.tsx (240+ existing tests to reference)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

1. **Reference existing tests**: Both apps have comprehensive test suites for these hooks (~100 tests each). Review existing test coverage to ensure consolidated hooks maintain same test rigor.
2. **Test authenticated vs anonymous session handling**: Critical path is ensuring useUploaderSession correctly switches between user-based and anon-based storage keys.
3. **Test session migration scenario**: When anon user logs in mid-upload, session should migrate from anon key to user key seamlessly.
4. **Test concurrency edge cases**: Existing tests cover concurrency limits, queue processing, and simultaneous failures. Ensure consolidated hook maintains this coverage.
5. **Consider E2E test for upload flow**: Per ADR-005, E2E tests should use real browser APIs (localStorage, File, AbortController).

### For UI/UX Advisor

1. **No UI changes expected**: This is a pure implementation migration with no user-facing changes.
2. **Session restoration toast**: useUploaderSession shows a toast notification when restoring session from localStorage. Ensure this behavior is preserved.
3. **Error messaging consistency**: Upload error messages should remain consistent across apps after migration.

### For Dev Feasibility

1. **Merge strategy for divergent useUploaderSession**: The main-app version (313 lines) supports Redux auth integration, while app-instructions-gallery (261 lines) is anonymous-only. The consolidated version needs to support both modes via dependency injection (pass in isAuthenticated and userId rather than directly importing from Redux).
2. **Import path updates**: After REPA-002, upload client imports change from `@repo/upload-client` to `@repo/upload/client`. If REPA-002 is incomplete, this story is blocked.
3. **Backward compatibility strategy**: Consider deprecation warnings if hook APIs must change. Apps currently import from `@/hooks/useUploadManager` - they'll need to update to `@repo/upload/hooks` after migration.
4. **Test migration**: Each app has ~100 tests for upload hooks. Consider whether to migrate tests to the package or keep them in apps as integration tests.
5. **File handle tracking complexity**: useUploadManager uses a ref to track File objects for retry scenarios. Ensure this pattern works correctly when hook is in a shared package.
6. **Session key strategy**: The getStorageKey function from @repo/upload-types needs to support both userId and anonSessionId. Review this utility to ensure it handles both cases correctly.

---

## STORY-SEED BLOCKED: REPA-001 and REPA-002 are pending

This seed is complete and ready for elaboration, but implementation is blocked until:
1. REPA-001 creates @repo/upload package structure with hooks/ directory
2. REPA-002 migrates upload client to @repo/upload/client

The story can proceed to PM generation, test plan, and elaboration phases, but dev implementation cannot begin until dependencies are satisfied.
