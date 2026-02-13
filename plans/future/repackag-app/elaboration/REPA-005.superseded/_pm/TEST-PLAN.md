# Test Plan: REPA-005 - Migrate Upload Components

## Scope Summary

**Endpoints Touched**: None (frontend component migration only)

**UI Touched**: Yes (9 upload components)

**Data/Storage Touched**: No (components use existing hooks, no new storage)

**Packages Modified**:
- @repo/upload/components/ (new components)
- apps/web/main-app (import updates)
- apps/web/app-instructions-gallery (import updates)

---

## Happy Path Tests

### Test 1: ConflictModal Renders with Suggested Slug
**Setup**:
- Component imported from @repo/upload/components/ConflictModal
- Pass props: open=true, conflictError with suggested_slug="my-moc-v2"

**Action**:
- Render ConflictModal component
- Check focus is on suggested slug input

**Expected Outcome**:
- Modal displays with suggested slug pre-filled
- Focus management works (input receives focus)
- ARIA attributes present (role="dialog", aria-labelledby)

**Evidence**:
- Vitest unit test passes
- Focus trap verified with keyboard navigation test

### Test 2: RateLimitBanner Countdown Timer Works
**Setup**:
- Component imported from @repo/upload/components/RateLimitBanner
- Pass props: isOpen=true, retryAfter=30 (30 seconds)

**Action**:
- Render RateLimitBanner
- Wait 5 seconds

**Expected Outcome**:
- Initial display: "00:30" countdown
- After 5 seconds: "00:25" countdown
- Progress bar decreases proportionally
- Reduced-motion support enabled (no animations if prefers-reduced-motion)

**Evidence**:
- Vitest test with fake timers
- Countdown reaches 00:00 and enables retry button
- Progress bar visual assertion

### Test 3: SessionProvider Provides Context with Auth (Redux)
**Setup**:
- Component imported from @repo/upload/components/SessionProvider
- Pass props: isAuthenticated=true, userId="user-123"
- Wrap child component consuming context

**Action**:
- Render SessionProvider with auth props
- Child component accesses context

**Expected Outcome**:
- Context provides session state
- useUploaderSession hook (REPA-003) called with auth data
- useUnsavedChangesPrompt hook active

**Evidence**:
- Vitest integration test
- Context values available to children
- Auth state passed correctly (no Redux direct import)

### Test 4: SessionProvider Provides Context without Auth (Anonymous)
**Setup**:
- Component imported from @repo/upload/components/SessionProvider
- No auth props passed (isAuthenticated=undefined, userId=undefined)
- Wrap child component consuming context

**Action**:
- Render SessionProvider in anonymous mode
- Child component accesses context

**Expected Outcome**:
- Context provides anonymous session state
- useUploaderSession hook called without auth
- useUnsavedChangesPrompt hook active

**Evidence**:
- Vitest integration test
- Anonymous mode works correctly
- app-instructions-gallery pattern verified

### Test 5: UploaderFileItem Displays File Progress
**Setup**:
- Component imported from @repo/upload/components/UploaderFileItem
- Pass props: file with status="uploading", progress=0.65

**Action**:
- Render UploaderFileItem

**Expected Outcome**:
- File name displayed
- Progress bar shows 65%
- Status badge shows "Uploading"
- Cancel button present

**Evidence**:
- Vitest snapshot test
- Progress bar aria-valuenow="65"
- File type icon rendered

### Test 6: ThumbnailUpload Drag-and-Drop Works
**Setup**:
- Component imported from @repo/upload/components/ThumbnailUpload
- Render with onUpload callback

**Action**:
- Simulate drag-and-drop of image file
- Check validation passes

**Expected Outcome**:
- Drag zone accepts image
- Client-side validation passes (file type, size)
- Preview displays with metadata
- onUpload callback fired with validated file

**Evidence**:
- Vitest test with file drop simulation
- FileValidationResult schema validation
- Preview rendering verified

### Test 7: InstructionsUpload Sequential Processing
**Setup**:
- Component imported from @repo/upload/components/InstructionsUpload
- Render with multiple PDF files queued

**Action**:
- Add 3 PDF files to queue
- Start upload

**Expected Outcome**:
- Files upload sequentially (not parallel)
- Progress tracking shows current file + queue position
- Each file completes before next starts
- Queue UI updates correctly

**Evidence**:
- Vitest integration test with mocked upload
- Sequential behavior verified (file 2 starts only after file 1 completes)
- Queue position displayed correctly

---

## Error Cases

### Error 1: ConflictModal Handles Missing Suggested Slug
**Setup**:
- ConflictModal with conflictError but no suggested_slug

**Action**:
- Render component

**Expected**:
- Modal renders without pre-filled slug
- Input is empty but functional
- User can type custom slug

**Evidence**:
- Vitest test for null/undefined suggested_slug
- No crash, graceful degradation

### Error 2: RateLimitBanner Handles Invalid retryAfter
**Setup**:
- RateLimitBanner with retryAfter=0 or negative value

**Action**:
- Render component

**Expected**:
- Component does not crash
- Retry button enabled immediately
- No countdown shown (or shows 00:00)

**Evidence**:
- Vitest test for edge case
- Prop validation via Zod schema

### Error 3: SessionProvider Handles Hook Dependency Failure
**Setup**:
- SessionProvider rendered but useUploaderSession hook throws error

**Action**:
- Render with child consuming context

**Expected**:
- Error boundary catches issue OR
- Component renders with degraded state
- Child component does not crash

**Evidence**:
- Vitest test with mocked hook throwing error
- Error boundary or try-catch pattern verified

### Error 4: ThumbnailUpload Rejects Invalid File Type
**Setup**:
- ThumbnailUpload with PDF file dropped (not image)

**Action**:
- Simulate drop of invalid file

**Expected**:
- Validation fails
- Error message displayed: "Only image files allowed"
- onUpload callback NOT fired
- User can retry with valid file

**Evidence**:
- Vitest test with invalid file type
- FileValidationResult.success = false
- Error message rendered

### Error 5: InstructionsUpload Handles Upload Failure Mid-Queue
**Setup**:
- InstructionsUpload with 3 files queued
- Second file upload fails (network error)

**Action**:
- Start upload
- Mock second file to fail

**Expected**:
- First file completes successfully
- Second file shows error state with retry button
- Third file NOT attempted (queue paused)
- User can retry failed file or remove it

**Evidence**:
- Vitest test with mocked network failure
- Queue pauses on error
- Retry/remove actions functional

---

## Edge Cases (Reasonable)

### Edge 1: UnsavedChangesDialog on Page Unload
**Setup**:
- UnsavedChangesDialog with unsaved changes present
- User navigates away or closes tab

**Action**:
- Trigger browser beforeunload event

**Expected**:
- Browser shows confirmation dialog
- User can cancel navigation
- Changes preserved if canceled

**Evidence**:
- Vitest test simulating beforeunload
- useUnsavedChangesPrompt hook prevents navigation

### Edge 2: SessionExpiredBanner Auto-Dismisses After Refresh
**Setup**:
- SessionExpiredBanner shown (401 error)
- User clicks "Refresh Session" button

**Action**:
- Click refresh button
- Mock successful token refresh

**Expected**:
- Banner dismisses
- Upload can resume
- No page reload required

**Evidence**:
- Vitest integration test
- Token refresh callback invoked
- Banner closes gracefully

### Edge 3: UploaderList with Empty File Queue
**Setup**:
- UploaderList with files=[]

**Action**:
- Render component

**Expected**:
- Empty state displayed: "No files in queue"
- No crash or layout issues
- Add file button still functional

**Evidence**:
- Vitest snapshot test
- Empty state UI rendered

### Edge 4: ThumbnailUpload with Large Image (10MB)
**Setup**:
- ThumbnailUpload with 10MB image file

**Action**:
- Drop or select large image

**Expected**:
- Client-side validation checks file size
- If exceeds limit (e.g., 5MB): show error message
- If within limit: proceed with resize/compression
- Preview displays correctly after processing

**Evidence**:
- Vitest test with large file mock
- FileValidationResult includes size check
- Compression logic applied (from REPA-004)

### Edge 5: ConflictModal with Very Long Suggested Slug
**Setup**:
- ConflictModal with suggested_slug exceeding 100 characters

**Action**:
- Render component

**Expected**:
- Input displays full slug
- Input scrolls horizontally if needed
- No layout overflow or text cutoff
- Truncation with ellipsis if UI design requires

**Evidence**:
- Vitest visual test
- Tailwind overflow handling verified

### Edge 6: RateLimitBanner with Large retryAfter (3600 seconds = 1 hour)
**Setup**:
- RateLimitBanner with retryAfter=3600

**Action**:
- Render component

**Expected**:
- Countdown displays "60:00" (MM:SS format)
- Progress bar works correctly over long duration
- Component does not degrade performance (efficient timer updates)

**Evidence**:
- Vitest test with long countdown
- Timer cleanup verified (no memory leaks)
- Reduced-motion respected

---

## Required Tooling Evidence

### Backend Evidence
**N/A** - No backend changes in this story. Components consume existing hooks (REPA-003) and client functions (REPA-002).

### Frontend Evidence (Vitest Unit/Integration Tests)

**For @repo/upload package tests**:
```bash
pnpm test --filter=@repo/upload
```

**Required test files**:
- `packages/core/upload/src/components/ConflictModal/__tests__/ConflictModal.test.tsx`
- `packages/core/upload/src/components/RateLimitBanner/__tests__/RateLimitBanner.test.tsx`
- `packages/core/upload/src/components/SessionExpiredBanner/__tests__/SessionExpiredBanner.test.tsx`
- `packages/core/upload/src/components/UnsavedChangesDialog/__tests__/UnsavedChangesDialog.test.tsx`
- `packages/core/upload/src/components/UploaderFileItem/__tests__/UploaderFileItem.test.tsx`
- `packages/core/upload/src/components/UploaderList/__tests__/UploaderList.test.tsx`
- `packages/core/upload/src/components/SessionProvider/__tests__/SessionProvider.test.tsx` (both auth modes)
- `packages/core/upload/src/components/ThumbnailUpload/__tests__/ThumbnailUpload.test.tsx`
- `packages/core/upload/src/components/InstructionsUpload/__tests__/InstructionsUpload.test.tsx`

**Coverage target**: 80%+ per component (exceeds global 45% minimum)

**Assertions required**:
- Semantic queries: getByRole, getByLabelText (per CLAUDE.md)
- ARIA attribute presence (aria-labelledby, aria-describedby, role)
- Focus management (focus trap in modals)
- Keyboard navigation (Tab, Escape, Enter)
- Prop validation via Zod schemas

**For app-level tests after migration**:
```bash
pnpm test --filter=main-app
pnpm test --filter=app-instructions-gallery
```

**Required checks**:
- All existing upload tests pass with new imports
- No regressions in upload flows
- SessionProvider Redux integration works (main-app)
- SessionProvider anonymous mode works (app-instructions-gallery)

### Playwright E2E Evidence

**Critical upload flows**:
1. **Instruction Upload Flow** (main-app and app-instructions-gallery):
   ```bash
   pnpm playwright test --grep="upload.*instruction"
   ```
   - Navigate to upload page
   - Add multiple PDF files
   - Verify sequential processing
   - Check success state
   - Verify new instructions appear in gallery

2. **Thumbnail Upload Flow** (app-instructions-gallery):
   ```bash
   pnpm playwright test --grep="upload.*thumbnail"
   ```
   - Navigate to MOC creation page
   - Drag-and-drop image to ThumbnailUpload
   - Verify preview displays
   - Submit form
   - Check thumbnail saved

3. **Rate Limit Error Handling**:
   - Mock 429 response from upload API
   - Verify RateLimitBanner appears
   - Check countdown timer works
   - Wait for countdown to complete
   - Verify retry button enables

4. **Conflict Error Handling**:
   - Upload instruction with duplicate slug
   - Verify ConflictModal appears
   - Check suggested slug pre-filled
   - Retry with suggested slug
   - Verify success

**Artifacts**:
- Video recordings of upload flows
- Network traces showing 429/409 responses
- Screenshots of error states (rate limit banner, conflict modal)

---

## Risks to Call Out

### Risk 1: REPA-003 Dependency Incomplete
**Issue**: SessionProvider depends on useUploaderSession hook from REPA-003, which is currently "ready-to-work" status.

**Impact**: If REPA-003 is not completed before REPA-005 starts, SessionProvider migration will be blocked.

**Mitigation**: Verify REPA-003 completion before starting REPA-005 AC-7 (SessionProvider migration). Consider splitting SessionProvider to separate follow-up story if REPA-003 is delayed.

### Risk 2: Component Duplication Verification
**Issue**: Seed assumes ConflictModal and RateLimitBanner are EXACT duplicates across apps. If implementations have diverged, migration will require reconciliation.

**Impact**: Unknown edge cases or app-specific logic may be lost during consolidation.

**Mitigation**: Run file diffs on all 7 Uploader sub-components before migration. Document any differences in implementation notes. If significant divergence found, add reconciliation AC.

### Risk 3: Test Migration Completeness
**Issue**: Migrating tests from apps to package requires updating all import paths and MSW mocks.

**Impact**: Tests may pass locally but fail in CI due to missing mock setup in package.

**Mitigation**: Run package tests in isolation before app migration. Ensure `src/test/setup.ts` in @repo/upload has all necessary MSW handlers.

### Risk 4: Auth Injection Pattern Fragility
**Issue**: SessionProvider auth injection (Redux vs anonymous) introduces new prop dependency that apps must provide correctly.

**Impact**: If main-app does not pass isAuthenticated/userId correctly, SessionProvider will fail silently or behave incorrectly.

**Mitigation**: Add Zod prop validation to SessionProvider. Unit test both auth modes explicitly. Include integration test in main-app verifying Redux state flows correctly.

### Risk 5: Large Scope (9 Components + 2 Apps)
**Issue**: Story migrates 9 components with tests across 2 apps (~1945 LOC total). Risk of mid-implementation split or extended review cycles.

**Impact**: Story may exceed original estimate (8 SP warning in seed) or require split into REPA-005a/b.

**Mitigation**: Prioritize core Uploader sub-components (AC-1 to AC-7) first. Domain-specific components (ThumbnailUpload, InstructionsUpload) can be split to follow-up if needed. Track progress in _implementation/PROGRESS.md.

---

## Test Execution Order

1. **Phase 1: Package tests in isolation**
   - Migrate component code to @repo/upload
   - Migrate tests to package
   - Run `pnpm test --filter=@repo/upload` until 80%+ coverage achieved

2. **Phase 2: App integration tests**
   - Update imports in main-app
   - Run `pnpm test --filter=main-app` to catch regressions
   - Update imports in app-instructions-gallery
   - Run `pnpm test --filter=app-instructions-gallery` to catch regressions

3. **Phase 3: E2E smoke tests**
   - Run Playwright upload flows
   - Verify no visual regressions
   - Check error handling flows (rate limit, conflict)

4. **Phase 4: Full test suite**
   - `pnpm test:all` (all changed files)
   - `pnpm check-types:all` (all changed files)
   - `pnpm lint:all` (all changed files)

---

## Blocking Conditions

Tests CANNOT proceed until:
1. ✅ REPA-003 (useUploaderSession hook) is completed and merged
2. ✅ REPA-004 (image processing) is completed (currently in UAT)
3. ✅ @repo/upload package structure exists (REPA-001, completed)
4. ✅ Component duplication verified (file diffs show exact/near-exact matches)
