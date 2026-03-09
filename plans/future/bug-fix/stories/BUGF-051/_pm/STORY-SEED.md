---
generated: "2026-02-14"
baseline_used: "/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-051

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Knowledge Base unavailable (no lessons learned or ADR context loaded)

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| Playwright E2E Test Suite | `apps/web/playwright/` | Active | Foundation for new E2E tests |
| Presigned Upload Steps | `apps/web/playwright/steps/inst-1105-presigned-upload.steps.ts` | Active | Pattern for presigned URL upload E2E testing |
| Uploader Page Object | `apps/web/playwright/steps/pages/uploader.page.ts` | Active | Page object pattern for upload interactions |
| BDD/Cucumber Integration | `apps/web/playwright/playwright.config.ts` | Active | Test infrastructure using playwright-bdd |
| Auth Fixtures | `apps/web/playwright/fixtures/cognito-auth.fixture.ts` | Active | Real Cognito authentication for E2E |
| MSW Fixtures | `apps/web/playwright/fixtures/msw.fixture.ts` | Available | Mock service worker for API mocking (ADR-006: not for E2E) |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| BUGF-031 | ready-to-work | Medium | Backend API dependency - must be deployed for E2E |
| BUGF-032 | uat | High | Frontend integration - BUGF-051 tests this implementation |
| BUGF-030 | backlog | Low | Comprehensive E2E suite consolidation (future) |

### Constraints to Respect

**From Baseline:**
- All E2E tests must use real services (no mocks per ADR-006)
- Playwright uses BDD/Cucumber feature files + step definitions
- Test timeout: 30s default, 120s for upload operations
- Auth via real Cognito (no mock auth in E2E)
- Tests run sequentially (workers: 1) for upload flow reliability

**From BUGF-032:**
- Frontend integration completed - presigned URL API wired into upload pages
- `useGeneratePresignedUrlMutation` RTK hook available
- Upload manager hook (`useUploadManager`) handles S3 uploads via XHR
- Session expiry detection implemented (403 error + local TTL check)
- Multi-file upload support exists (concurrency limit: 3)

**From BUGF-031:**
- Backend endpoint: `POST /api/uploads/presigned-url`
- 15-minute presigned URL expiry (900 seconds)
- File size limit: 100MB for instruction category
- Allowed MIME types: `application/pdf` for instruction category
- S3 bucket CORS must be configured for browser uploads

---

## Retrieved Context

### Related Endpoints

**Presigned URL Generation:**
- `POST /api/uploads/presigned-url` (from BUGF-031)
  - Request: `{ fileName, fileSize, contentType, category }`
  - Response: `{ presignedUrl, key, expiresIn, fileId }`
  - Auth: JWT Bearer token required
  - Errors: 401, 400, 413, 500

**S3 Upload:**
- `PUT {presignedUrl}` (S3 direct upload)
  - Content-Type header from presigned URL
  - Body: file bytes
  - Success: 200 OK with ETag
  - Errors: 403 (expired), network errors

### Related Components

**Frontend Upload Pages:**
- `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
  - Uses `useGeneratePresignedUrlMutation`
  - Integrates with `useUploadManager` hook
  - Renders UploaderList, progress bars, error banners

- `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
  - Same upload flow as app-instructions-gallery
  - Uses same hooks and components

**Upload Infrastructure:**
- `packages/core/upload/src/hooks/useUploadManager.ts`
  - Manages upload queue, progress, retry, cancellation
  - Detects session expiry (403 + local TTL)
  - Supports multi-file uploads with concurrency limit (3)

- `packages/core/upload/src/client/uploadToPresignedUrl.ts`
  - XHR-based S3 upload with progress events
  - AbortController for cancellation
  - Error mapping (network, S3, expiry)

### Reuse Candidates

**E2E Test Patterns:**
- `apps/web/playwright/steps/inst-1105-presigned-upload.steps.ts`
  - Existing presigned upload E2E steps (50+ steps defined)
  - File generation utilities (`createTestPDF`)
  - Progress bar verification steps
  - Session expiry steps (basic)
  - Network error simulation steps

**Page Objects:**
- `apps/web/playwright/steps/pages/uploader.page.ts`
  - Locators for upload form elements
  - Upload helper methods (`uploadPdfInstruction`)
  - Wait utilities (`waitForUploadComplete`)
  - A11y scan integration

**Fixtures:**
- `apps/web/playwright/fixtures/cognito-auth.fixture.ts`
  - Real Cognito authentication
  - Test user seeding

- `apps/web/playwright/fixtures/browser-auth.fixture.ts`
  - Browser auth state persistence

---

## Knowledge Context

### Lessons Learned

**Knowledge Base Status:** Unavailable - no lessons loaded

**Inferred from Codebase:**
1. **Presigned upload E2E exists** (inst-1105-presigned-upload.steps.ts)
   - Applies because: Similar E2E patterns already implemented
   - Pattern: BDD step definitions with real S3 uploads
   - Anti-pattern: None observed

2. **ADR-006: E2E tests use real services**
   - Applies because: E2E tests must not use MSW mocks
   - Constraint: All API calls and S3 uploads must use live backend
   - Verification: Network request tracing in Playwright

3. **Upload manager hook handles session expiry**
   - Applies because: Session expiry detection already implemented
   - Pattern: 403 error detection + local TTL check (30s buffer)
   - Callback: `onSessionExpired` for UI updates

### Blockers to Avoid

From story analysis:

1. **BUGF-031 not deployed** - E2E tests require live backend API
   - Mitigation: Story dependency documented, verify deployment before E2E

2. **S3 bucket CORS misconfiguration** - Browser uploads will fail
   - Mitigation: BUGF-031 includes CORS validation

3. **Test flakiness from network timing** - Upload timing varies
   - Mitigation: Use Playwright explicit waits, avoid hard timeouts

4. **File cleanup not handled** - Test PDF files accumulate
   - Mitigation: Cleanup utilities in existing presigned upload steps

### Architecture Decisions (ADRs)

**Note:** ADR-LOG.md not available in baseline. Inferred from codebase:

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT tests must use real services, not mocks |
| ADR-006 | E2E Testing | No MSW mocking in E2E - use real backend and S3 |

### Patterns to Follow

**From Existing E2E Tests:**
- BDD/Cucumber feature files + step definitions
- Page object pattern for UI interactions
- Semantic selectors (`getByRole`, `getByLabelText`)
- Real Cognito auth with test users
- Explicit waits for async operations (progress, network requests)
- Network request interception for verification (not mocking)
- File generation utilities for consistent test data

**From Upload Implementation:**
- XHR-based uploads with progress tracking
- AbortController for cancellation
- Error mapping to user-friendly messages
- Session expiry detection (403 + TTL)

### Patterns to Avoid

**From E2E Best Practices:**
- Hard-coded timeouts (use `waitFor` with conditions)
- `data-testid` selectors (use semantic queries)
- Mocking in E2E (violates ADR-006)
- Ignoring network errors (must verify retry logic)
- Skipping cleanup (test files accumulate)

---

## Conflict Analysis

**No conflicts detected.**

### Analysis

1. **BUGF-032 Dependency:** UAT status indicates frontend integration complete. No conflict - E2E tests will validate completed work.

2. **BUGF-031 Dependency:** ready-to-work status. Risk: Backend may not be deployed when E2E runs. Resolution: Story explicitly depends on BUGF-031, must verify deployment before E2E execution.

3. **Existing E2E Steps:** inst-1105-presigned-upload.steps.ts already has some presigned URL E2E logic. No conflict - this story adds comprehensive coverage not just step definitions.

4. **BUGF-030 Consolidation:** Future comprehensive E2E suite. No conflict - BUGF-051 is focused on presigned URL flow only.

---

## Story Seed

### Title

E2E Tests for Presigned URL Upload Flow

### Description

**Context:**
The presigned URL upload flow (BUGF-031 backend + BUGF-032 frontend) is now implemented but lacks comprehensive end-to-end testing. While unit and integration tests exist, we need E2E validation that the complete user journey works with a live backend and real S3 bucket.

Existing E2E infrastructure includes Playwright with BDD/Cucumber, real Cognito auth, and some presigned upload step definitions (`inst-1105-presigned-upload.steps.ts`), but comprehensive test coverage is missing.

**Problem:**
Without E2E tests, we cannot verify:
- The complete upload flow from file selection → presigned URL API → S3 upload → success
- Error handling for invalid file types, oversized files, network failures
- Session expiry detection and refresh behavior
- Multi-file upload concurrency and queueing

**Solution:**
Create comprehensive Playwright E2E tests that validate the presigned URL upload flow end-to-end using real services (ADR-006). Tests will cover:
1. Happy path: File selection → presigned URL generation → S3 upload → progress tracking → success
2. Error scenarios: Invalid file type, file too large, network failure
3. Session expiry: 403 from S3 after 15min expiry, session refresh flow
4. Multi-file upload: Concurrency limits, queue management, all files complete

Tests will use existing E2E infrastructure (BDD/Cucumber, page objects, Cognito auth) and follow established patterns from `inst-1105-presigned-upload.steps.ts`.

### Initial Acceptance Criteria

- [ ] **AC1:** Happy path upload E2E test passes
  - User navigates to `/instructions/new` page
  - User selects valid PDF file (<100MB)
  - Frontend requests presigned URL from API (verify request)
  - Frontend uploads file to S3 using presigned URL (verify PUT request)
  - Progress bar updates during upload (verify aria-valuenow increases)
  - File card shows "success" status on completion
  - Success toast/message appears

- [ ] **AC2:** Error handling E2E tests pass
  - **AC2a:** File too large error
    - User selects 150MB PDF file
    - API returns 413 Payload Too Large
    - Error message displays: "File too large (max 100MB)"
    - No S3 upload occurs
  - **AC2b:** Invalid file type error
    - User attempts to select non-PDF file (e.g., .exe)
    - Client-side validation rejects or API returns 400
    - Error message displays: "Invalid file type"
    - No presigned URL generated
  - **AC2c:** Network failure during upload
    - Simulate network interruption (Playwright network conditions)
    - Upload manager detects network error
    - Retry option appears
    - User can retry upload successfully

- [ ] **AC3:** Session expiry E2E test passes
  - User generates presigned URL (15min expiry)
  - Wait/mock time to expire session (>15min or mock clock)
  - User attempts S3 upload with expired URL
  - S3 returns 403 Forbidden
  - Upload manager detects EXPIRED_SESSION error
  - SessionExpiredBanner appears with message: "Session expired, please refresh"
  - User can refresh session and retry upload successfully

- [ ] **AC4:** Multi-file upload E2E test passes
  - User selects 5 PDF files (<100MB each)
  - Frontend requests presigned URLs for all files
  - Maximum 3 files upload concurrently (concurrency limit)
  - Remaining files wait in queue
  - All progress bars update independently
  - All 5 files eventually complete successfully
  - All file cards show "success" status

- [ ] **AC5:** Test infrastructure is production-ready
  - All E2E tests use real Cognito authentication (no mocks)
  - All E2E tests use real backend API (BUGF-031 deployed)
  - All E2E tests use real S3 bucket (CORS configured)
  - Network request verification confirms API and S3 calls
  - Test PDF files are cleaned up after each test
  - Tests run in CI/CD pipeline without flakiness

### Non-Goals

**Explicitly Out of Scope:**
- Unit/integration tests for upload components (covered in BUGF-013, BUGF-032)
- Backend API testing (covered in BUGF-031 integration tests)
- UI/UX improvements to upload flow (separate stories)
- Performance testing of upload speed (separate story)
- Session refresh API implementation (BUGF-004 - future story)
- Multipart upload support (deferred)
- Accessibility testing (covered by existing a11y tests)

**Protected Features:**
- Existing E2E test infrastructure (Playwright, BDD/Cucumber)
- Existing presigned upload step definitions (reuse, don't rewrite)
- Page object pattern (follow established structure)

**Deferred:**
- Session auto-refresh testing (BUGF-004 not implemented yet)
- Upload resume after page refresh (future enhancement)
- Virus scanning validation (future story)

### Reuse Plan

**E2E Test Patterns:**
- Reuse BDD step definitions from `inst-1105-presigned-upload.steps.ts`:
  - File selection steps (`I select a 30MB PDF file for presigned upload`)
  - Progress verification steps (`I should see a progress bar`)
  - Upload completion steps (`the upload completes`)
  - Error handling steps (`I should see an error`)
- Extend with new steps for session expiry and multi-file scenarios

**Page Objects:**
- Reuse `UploaderPage` class from `steps/pages/uploader.page.ts`:
  - Form locators (`titleInput`, `descriptionTextarea`)
  - Upload button locators (`instructionsButton`)
  - File input locators (`instructionsFileInput`)
  - State element locators (`sessionExpiredBanner`, `uploadList`)
- Add session expiry banner verification methods if missing

**Fixtures:**
- Reuse `cognito-auth.fixture.ts` for real authentication
- Reuse `browser-auth.fixture.ts` for session persistence
- Do NOT use `msw.fixture.ts` (violates ADR-006)

**Utilities:**
- Reuse `createTestPDF` function for generating test files
- Reuse file cleanup pattern from existing tests
- Reuse network request waiting patterns (`page.waitForRequest`)

**Test Structure:**
- Follow existing BDD/Cucumber feature file structure
- Use `.feature` files for test scenarios
- Use `.steps.ts` files for step implementations
- Use page objects for UI interactions

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Considerations:**
1. **Deployment Dependency:** Tests require BUGF-031 backend deployed and S3 bucket configured. Test plan must include pre-test verification steps.

2. **Real Services Requirement:** All tests must use real Cognito auth, real API, real S3 (ADR-006). Document required environment variables and infrastructure.

3. **Timing Sensitivity:** Upload progress and session expiry tests are timing-sensitive. Use Playwright's `waitFor` with conditions, avoid hard timeouts.

4. **Cleanup Strategy:** Test PDF files accumulate (~30MB+ per test). Document cleanup utilities and ensure teardown runs.

5. **Network Conditions:** Error scenario tests require network simulation. Use Playwright's `route` API for network failures, not MSW.

6. **CI/CD Integration:** Tests must run in CI pipeline with real backend (staging environment). Document required secrets and environment setup.

**Test Priorities:**
- Critical: AC1 (happy path) - validates core user journey
- Critical: AC2a (file too large) - validates validation logic
- High: AC3 (session expiry) - validates error recovery
- Medium: AC2c (network failure) - validates retry logic
- Medium: AC4 (multi-file) - validates concurrency

**Flakiness Risks:**
- Progress bar updates (timing-dependent) - use polling with retry
- Network timing (S3 upload speed varies) - use generous timeouts
- Session expiry (time-based) - use clock mocking or reduced expiry for tests

### For UI/UX Advisor

**Not Applicable** - This is a test-only story. No UI/UX changes.

**UX Validation Needed:**
- Verify error messages match UX spec from BUGF-032
- Verify SessionExpiredBanner displays correctly
- Verify progress bars update smoothly (no jumps)

### For Dev Feasibility

**Implementation Complexity:**
- Low to Medium - reusing existing E2E infrastructure
- High dependency on BUGF-031/BUGF-032 completion and deployment
- Network timing may require retry logic in tests

**Key Risks:**
1. **BUGF-031 not deployed** - Blocks all E2E tests
   - Mitigation: Document deployment requirement, verify in pre-test setup

2. **S3 bucket CORS misconfiguration** - Browser uploads fail
   - Mitigation: BUGF-031 includes CORS validation, retest before E2E

3. **Test environment setup complexity** - Real Cognito + S3 + API required
   - Mitigation: Document required environment variables, provide setup script

4. **Session expiry testing** - 15min wait is too long for CI
   - Mitigation: Use Playwright clock mocking or reduce expiry for tests

5. **File size tests** - Large file generation slows tests
   - Mitigation: Use minimum sizes for boundary tests (100MB + 1 byte for "too large")

**Change Surface Estimate:**
- New feature file(s): ~200 LOC (BDD scenarios)
- New step definitions: ~300 LOC (extending inst-1105-presigned-upload.steps.ts)
- Page object updates: ~100 LOC (session expiry banner methods)
- CI/CD config updates: ~50 LOC (environment setup)
- **Total:** ~650 LOC

**Test Execution Time:**
- Happy path: ~30s (file upload + progress tracking)
- Error scenarios: ~15s each (validation errors, no S3 upload)
- Session expiry: ~20s (with clock mocking)
- Multi-file: ~90s (5 files, concurrency 3)
- **Total suite:** ~3-4 minutes

**Infrastructure Requirements:**
- Deployed backend API (BUGF-031)
- S3 bucket with CORS configured
- Cognito user pool with test users
- Staging environment with secrets configured
- CI runner with network access to S3
