# Test Plan: REPA-003 - Migrate Upload Hooks

## Scope Summary

**Packages touched:**
- `@repo/upload/hooks` (new - create useUploadManager, useUploaderSession)
- `apps/web/main-app` (migrate imports, delete old hooks)
- `apps/web/app-instructions-gallery` (migrate imports, delete old hooks)

**UI touched:** No (pure hook migration, no UI changes)

**Data/storage touched:** Yes
- localStorage (session persistence with debounced writes)
- Session keys: user-based (`uploader-session:{userId}`) and anon-based (`uploader-session-anon:{sessionId}`)

**Dependencies:**
- REPA-001 must create `@repo/upload` package structure with `/hooks` directory
- REPA-002 must migrate upload client to `@repo/upload/client`

---

## Test Strategy

### Existing Test Coverage Baseline

**Current state:**
- `main-app/hooks/__tests__/useUploadManager.test.tsx`: 34 test cases, 859 lines
- `main-app/hooks/__tests__/useUploaderSession.test.tsx`: 8 test cases, 269 lines
- `app-instructions-gallery` has similar test coverage (not counted here but exists)

**Coverage includes:**
- Initialization, adding files, concurrency control
- Upload progress tracking, cancellation, retry logic
- 401/expiry detection and handling
- Session restoration from localStorage
- File handle tracking for resume scenarios

**Goal:** Maintain or exceed existing test rigor in consolidated hooks.

---

## Happy Path Tests

### HP-1: useUploadManager - Concurrent Upload Flow
**Setup:**
- Initialize useUploadManager with concurrency: 3
- Prepare 5 mock files with presigned URLs
- Mock uploadToPresignedUrl to succeed with 100ms delay

**Action:**
1. Call addFiles with all 5 files
2. Observe upload processing

**Expected:**
- First 3 files start uploading immediately (status: 'uploading')
- Remaining 2 files stay queued (status: 'queued')
- As uploads complete, queued files begin uploading
- isUploading: true until all complete
- isComplete: true when all files succeed
- All files have status: 'success' and progress: 100

**Evidence:**
- Unit test assertions on state.files array
- Verify concurrency never exceeded
- Verify onProgress callbacks fired with correct data

---

### HP-2: useUploaderSession - Authenticated Session Management
**Setup:**
- Initialize useUploaderSession with isAuthenticated: true, userId: 'user-123'
- Mock localStorage

**Action:**
1. Update session with title: "My MOC", description: "Test description"
2. Add files to session
3. Wait 300ms (debounce period)
4. Check localStorage

**Expected:**
- Session persisted to localStorage with key: `uploader-session:user-123`
- isDirty: true after changes
- Debounced write occurs after 300ms delay
- Session includes version, title, description, files, timestamp

**Evidence:**
- Unit test: verify localStorage.setItem called with correct key
- Assert session structure matches UploaderSessionSchema
- Verify debounce timing

---

### HP-3: useUploaderSession - Anonymous Session Management
**Setup:**
- Initialize useUploaderSession with isAuthenticated: false
- Mock localStorage and generateAnonSessionId

**Action:**
1. Update session with title: "Anonymous MOC"
2. Wait for persistence
3. Check localStorage key

**Expected:**
- Session persisted with key: `uploader-session-anon:{generatedId}`
- Anonymous session ID generated on first write
- All session features work identically to authenticated mode

**Evidence:**
- Unit test: verify anon key format
- Assert generateAnonSessionId called
- Session restoration works with anon key

---

### HP-4: Session Restoration from localStorage
**Setup:**
- Pre-populate localStorage with valid session (24 hours old)
- Initialize useUploaderSession with matching userId

**Action:**
- Render hook
- Check wasRestored flag and session state

**Expected:**
- wasRestored: true
- Session data matches localStorage
- Toast notification shown: "Previous session restored"
- Files array restored from persisted state

**Evidence:**
- Unit test: assert wasRestored flag
- Verify useToast called with restoration message
- Session state matches saved data

---

### HP-5: Session Migration (Anon → Authenticated)
**Setup:**
- Initialize with isAuthenticated: false (anon session active)
- Add files and persist to anon key
- Simulate user login: update to isAuthenticated: true, userId: 'user-456'

**Action:**
- Hook detects auth state change
- Trigger session key migration

**Expected:**
- Old anon key removed from localStorage
- Session migrated to user key: `uploader-session:user-456`
- All session data preserved
- No data loss during migration

**Evidence:**
- Unit test: verify both localStorage.removeItem and setItem calls
- Assert session data identical before/after migration
- Check migrateSession utility called

---

## Error Cases

### ERR-1: Upload 401 Unauthorized (Session Expired)
**Setup:**
- Initialize useUploadManager
- Mock uploadToPresignedUrl to throw UploadError with httpStatus: 401

**Action:**
- Add file and start upload
- Upload client returns 401

**Expected:**
- File status changes to 'expired'
- onSessionExpired callback invoked
- Error logged: "Upload expired (401)"
- User shown session expired UI (handled by consumer)

**Evidence:**
- Unit test: assert file.status === 'expired'
- Verify onSessionExpired callback received
- Logger.error called with 401 details

---

### ERR-2: Upload Network Failure
**Setup:**
- Mock uploadToPresignedUrl to throw network error (no httpStatus)

**Action:**
- Add file, upload fails

**Expected:**
- File status: 'failed'
- Error message stored in file.error
- onComplete callback fired with failed files
- User can retry failed file

**Evidence:**
- Assert file.status === 'failed'
- Verify error prop populated
- Retry flow restores file to 'queued' status

---

### ERR-3: Restore Expired Session
**Setup:**
- Pre-populate localStorage with session older than 24 hours
- Initialize useUploaderSession

**Action:**
- Hook attempts restoration
- Expiry check fails

**Expected:**
- wasRestored: false
- Session NOT restored (starts fresh)
- Expired session removed from localStorage
- Logger.info: "Session expired, starting fresh"

**Evidence:**
- Unit test: assert wasRestored === false
- Verify localStorage.removeItem called
- Session state is empty/default

---

### ERR-4: Invalid Session Data in localStorage
**Setup:**
- Pre-populate localStorage with malformed JSON

**Action:**
- Initialize useUploaderSession
- Parse attempt fails

**Expected:**
- Graceful fallback: start with empty session
- Error logged: "Failed to parse session"
- Invalid data removed from localStorage
- No crash, hook remains functional

**Evidence:**
- Unit test: assert no throw on invalid JSON
- Verify logger.error called
- Hook state is default/empty

---

## Edge Cases

### EDGE-1: Concurrency Boundary (Upload All Files Simultaneously)
**Setup:**
- Set concurrency: 10
- Add exactly 10 files

**Action:**
- All files should start uploading immediately

**Expected:**
- All 10 files status: 'uploading' simultaneously
- No files remain queued
- Queue processing works correctly at boundary

**Evidence:**
- Unit test: assert state.uploadingCount === 10
- Verify no files in 'queued' status

---

### EDGE-2: Cancel Upload Mid-Progress
**Setup:**
- Add files, start upload
- Mock uploadToPresignedUrl to simulate slow upload (multi-second)

**Action:**
- Start upload
- Call cancelFile(fileId) mid-upload
- Verify AbortController triggered

**Expected:**
- File status changes to 'canceled'
- Upload XHR aborted via AbortController
- File removed from active uploads
- Next queued file starts if available

**Evidence:**
- Unit test: assert file.status === 'canceled'
- Verify AbortController.abort() called
- Queue processing continues

---

### EDGE-3: Retry File After Lost Handle
**Setup:**
- Add file, upload succeeds
- User navigates away (file handle lost)
- User returns, attempts retry

**Action:**
- Call retryFile(fileId)
- useUploadManager detects lost file handle

**Expected:**
- Hook recognizes file object no longer valid
- Error message: "File not available for retry"
- User prompted to re-select file

**Evidence:**
- Unit test: mock File handle lost scenario
- Assert file handle tracking ref updated
- Verify error handling for missing handle

---

### EDGE-4: Double-Submit Prevention (Debounce)
**Setup:**
- Initialize useUploaderSession
- Rapidly call updateSession 10 times within 100ms

**Action:**
- Multiple rapid updates

**Expected:**
- Only ONE localStorage write occurs (after 300ms debounce)
- Final state reflects last update
- No intermediate writes

**Evidence:**
- Unit test with fake timers
- Assert localStorage.setItem called ONCE
- Verify debounce logic via timing assertions

---

### EDGE-5: Empty Session Cleanup
**Setup:**
- Create session, persist to localStorage
- User clears all files, leaves title empty
- Session becomes "empty"

**Action:**
- Call clearSession or navigate away

**Expected:**
- Empty session removed from localStorage (no stale data)
- Best-effort cleanup (never fail on cleanup error)
- Logger: "Cleared empty session"

**Evidence:**
- Unit test: assert localStorage.removeItem called
- Verify cleanup errors caught and logged (don't throw)

---

## Required Tooling Evidence

### Backend
**Not applicable** - no backend changes. Upload hooks interact with presigned URLs provided by existing backend, which is out of scope for this story.

### Frontend

**Unit Tests (Vitest + React Testing Library):**
- Location: `packages/core/upload/hooks/__tests__/`
- Files:
  - `useUploadManager.test.tsx` (maintain 30+ test cases from baseline)
  - `useUploaderSession.test.tsx` (maintain 8+ test cases from baseline)
- Assertions:
  - Hook state changes (status, progress, counts)
  - Callback invocations (onProgress, onComplete, onSessionExpired)
  - localStorage interactions (read, write, delete)
  - Debounce timing (use vi.useFakeTimers)
  - AbortController usage
  - File handle tracking

**Integration Tests (App-Level):**
- Location: Keep existing tests in `apps/web/main-app/src/hooks/__tests__/` as integration smoke tests
- Purpose: Verify app-level imports work after migration
- Scope: Simplified versions of unit tests, focus on import path correctness

**E2E Tests (Playwright) - OPTIONAL:**
- Per ADR-005: E2E tests should use real browser APIs
- Test: Full upload flow in InstructionsNewPage
- Assertions:
  - Real File objects selected via file input
  - Real localStorage persistence observed in browser DevTools
  - Real AbortController behavior on cancel
- Evidence: Video recording, trace artifacts
- Location: `apps/web/playwright/tests/upload-flow.spec.ts`

---

## Migration Verification Checklist

**Before Migration:**
- [ ] REPA-001 completed: @repo/upload package exists with /hooks directory
- [ ] REPA-002 completed: @repo/upload/client available (import path verified)
- [ ] Existing tests pass: run `pnpm test --filter=main-app` and verify upload hook tests green

**After Migration:**
- [ ] New tests pass: `pnpm test --filter=@repo/upload`
- [ ] Apps import from @repo/upload/hooks successfully
- [ ] TypeScript compilation: `pnpm check-types:all` passes
- [ ] Linting: `pnpm lint:all` passes
- [ ] App-level upload tests still pass (integration smoke tests)
- [ ] Playwright E2E upload test passes (if implemented)
- [ ] Duplicate hook files deleted from apps

---

## Risks to Call Out

1. **Test Migration Decision Pending:** Should existing tests move to @repo/upload or stay in apps as integration tests? Recommendation: Move core tests to package, keep minimal smoke tests in apps.

2. **File Handle Tracking in Shared Package:** useUploadManager uses a ref to track File objects for retry scenarios. Need to verify this pattern works correctly when hook is in a shared package (not app-local). Consider: File objects from different apps might behave differently if apps use different upload flows.

3. **localStorage Mocking Fragility:** Tests rely heavily on localStorage mocking. If test setup changes (e.g., Vitest config updates), localStorage tests might break. Ensure setup.ts correctly mocks Storage prototype.

4. **Session Migration Testing:** Anon → Authenticated migration is critical but hard to test in isolation. May require E2E test or manual verification in staging environment.

5. **REPA-002 Incomplete Blocks Testing:** If REPA-002 is not fully complete, imports from @repo/upload/client will fail, blocking all tests. Verify REPA-002 completion before starting REPA-003.

---

## Test Execution Plan

**Phase 1: Unit Tests (Blocking)**
1. Create `@repo/upload/hooks/__tests__/` directory
2. Port useUploadManager tests from main-app (adapt for new package)
3. Port useUploaderSession tests from main-app (adapt for new package)
4. Add new tests for authenticated/anonymous session handling
5. Add new tests for session migration scenario
6. Run: `pnpm test --filter=@repo/upload --coverage`
7. **Gate:** All tests pass, coverage >= 45%

**Phase 2: Integration Tests (Blocking)**
1. Update main-app imports to use @repo/upload/hooks
2. Run existing app-level tests: `pnpm test --filter=main-app`
3. Fix any import-related failures
4. Update app-instructions-gallery imports
5. Run: `pnpm test --filter=app-instructions-gallery`
6. **Gate:** All app tests pass

**Phase 3: E2E Tests (Optional, Recommended)**
1. Implement Playwright test for upload flow in InstructionsNewPage
2. Run: `pnpm test:e2e --filter=playwright`
3. Capture video/trace artifacts
4. **Gate:** E2E test passes, no regressions

**Phase 4: Cleanup Verification**
1. Delete duplicate hook files from apps
2. Run full test suite: `pnpm test:all`
3. Run type check: `pnpm check-types:all`
4. Run lint: `pnpm lint:all`
5. **Gate:** All checks pass, no references to deleted files
