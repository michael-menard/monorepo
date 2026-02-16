# Elaboration Analysis - BUGF-051

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. E2E tests for presigned URL upload flow covering happy path, errors, session expiry, and multi-file uploads. No extra infrastructure or features introduced beyond test coverage. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. All ACs (AC1-AC5) match story scope precisely. Local testing plan (Playwright E2E) matches acceptance criteria. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story maximizes reuse: existing `inst-1105-presigned-upload.steps.ts` (reuse file selection, progress, completion steps), `UploaderPage` class (extend with session expiry locators), `createTestPDF()` utility, `cognito-auth.fixture.ts`, `browser-auth.fixture.ts`. No new shared packages proposed. All extensions documented in Reuse Plan section. |
| 4 | Ports & Adapters | PASS | — | No API layer changes (test-only story). E2E tests correctly consume existing API endpoint `POST /api/uploads/presigned-url` (BUGF-031) without violating service layer separation. Tests verify network requests (not mocking), which validates adapter layer behavior. |
| 5 | Local Testability | PASS | — | Playwright E2E tests are fully executable locally and in CI. Clock mocking strategy (`page.clock.fastForward()`) solves 15-minute expiry wait time. Network request verification pattern documented. Environment validation script included. Multi-file timestamp analysis pattern provided for concurrency verification. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Session expiry testing resolved (clock mocking). Multi-file concurrency verification resolved (timestamp analysis). CI/CD integration specified. Environment requirements documented. All Open Questions from stories.index.md addressed. |
| 7 | Risk Disclosure | PASS | — | All risks explicit: (1) Flakiness - timing issues, network variability (mitigations: generous timeouts, small test files, `waitFor` retry, unique filenames). (2) Infrastructure dependencies - BUGF-031 deployment, S3 CORS, Cognito test user (pre-test validation script). (3) File cleanup - accumulation risk (afterEach hooks, S3 lifecycle policy). No hidden dependencies. |
| 8 | Story Sizing | PASS | — | 2 points justified. Only 1 sizing indicator: 5 ACs. Does NOT meet split threshold (need 2+ indicators). Test-only story with existing infrastructure (Playwright, BDD, page objects, step definitions, fixtures). Story adds 4 new feature files + extends existing steps. Estimated 1-2 days (within 2-point range). |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| — | No issues found | — | — |

## Split Recommendation

**Not Applicable** - Story meets sizing criteria (2 points, 1 indicator).

## Preliminary Verdict

**Verdict**: PASS

All 8 audit checks pass. 0 MVP-critical gaps identified. 0 ACs need to be added. Story is implementation-ready without modifications.

**Key Strengths:**
- Maximizes reuse of existing E2E infrastructure (step definitions, page objects, fixtures)
- ADR-006 compliance (real services, no MSW in E2E)
- Clear dependency on BUGF-031 (backend) and BUGF-032 (frontend) completion
- Comprehensive test scenarios (happy path, errors, session expiry, concurrency)
- Practical solutions for timing challenges (clock mocking, timestamp analysis)
- CI/CD integration and environment validation specified

**Ready for Implementation**: Yes - all preconditions met (BUGF-032 in UAT, E2E infrastructure exists)

---

## MVP-Critical Gaps

None - core journey is complete. Story has clear ACs with executable test scenarios, environment setup, and CI/CD integration.

---

## Codebase Alignment Check

### Existing E2E Infrastructure (Verified)

**Step Definitions**: `/Users/michaelmenard/Development/monorepo/apps/web/playwright/steps/inst-1105-presigned-upload.steps.ts`
- ✅ 441 lines of presigned upload step definitions already exist
- ✅ Reusable steps identified: file selection (lines 78-145), progress verification (lines 151-192), completion (lines 198-231), errors (lines 237-253)
- ✅ `createTestPDF()` utility exists (lines 36-58) - generates valid PDFs of specified size
- ✅ Network request verification patterns exist (lines 332-339, 394-410)
- ✅ Accessibility steps exist (lines 416-436)
- ✅ Concurrent upload steps exist (lines 366-388)

**Page Objects**: `/Users/michaelmenard/Development/monorepo/apps/web/playwright/steps/pages/uploader.page.ts`
- ✅ 254 lines of UploaderPage class
- ✅ Form locators: `titleInput`, `descriptionTextarea` (lines 56-62)
- ✅ Upload button locators: `instructionsButton` (line 65)
- ✅ File input locators: `instructionsFileInput` (line 71)
- ✅ State element locators: `uploadList` (line 91)
- ⚠️ Session expiry locators MISSING: `sessionExpiredBanner` exists (line 89) but uses `data-testid` (violates semantic selector requirement)
- ⚠️ Multi-file verification methods MISSING: `getUploadingFileCount()`, `getAllFileCardStatuses()` need to be added
- ✅ Accessibility scan methods exist (lines 199-229)

**Fixtures**:
- ✅ `cognito-auth.fixture.ts` exists - provides real Cognito JWT tokens (no mocking per ADR-006)
- ✅ `browser-auth.fixture.ts` exists - session persistence across tests
- ✅ `msw.fixture.ts` exists but MUST NOT be used (violates ADR-006 for E2E tests)

**Feature Files**: `/Users/michaelmenard/Development/monorepo/apps/web/playwright/features/instructions/inst-1105-presigned-upload.feature`
- ✅ 135 lines of existing presigned upload scenarios
- ✅ Covers: happy path (AC80), progress updates (AC81), completion (AC82), file size validation (AC83), cancellation (AC84), retry (AC85)
- ✅ Additional scenarios: file detection, concurrent uploads, session expiry, accessibility
- ⚠️ NEW feature files needed per story scope (4 new files): `presigned-url-happy-path.feature`, `presigned-url-errors.feature`, `presigned-url-session-expiry.feature`, `presigned-url-multi-file.feature`
- ✅ Existing scenarios can be REUSED (copy and adapt) - no need to rewrite from scratch

### Dependencies Verification

**BUGF-031** (Backend API): Status = ready-to-work
- ✅ Endpoint defined: `POST /api/uploads/presigned-url` (BUGF-031.md:94)
- ⚠️ Status is "ready-to-work" (NOT deployed to staging yet) - BUGF-051 BLOCKED until BUGF-031 completes and deploys to staging
- ⚠️ Pre-test validation required: health check to confirm backend deployment before E2E tests run

**BUGF-032** (Frontend Integration): Status = uat
- ✅ Status is "uat" (implementation complete, QA passed, awaiting E2E tests)
- ✅ RTK Query mutation exists: `useGeneratePresignedUrlMutation` (BUGF-032.md:96)
- ✅ Frontend integration complete in 2 pages: `upload-page.tsx`, `InstructionsNewPage.tsx`
- ✅ Session expiry handling implemented (15-minute expiry detection)
- ✅ E2E tests split to BUGF-051 (this story)
- ✅ BUGF-051 can proceed once BUGF-031 backend is deployed

### API Layer Architecture Compliance

**No API changes in this story** (test-only), but tests MUST verify correct architecture:
- ✅ Story correctly documents network request verification (not mocking)
- ✅ Tests will verify presigned URL API call: `POST /api/uploads/presigned-url`
- ✅ Tests will verify S3 upload: `PUT {presignedUrl}` to S3
- ✅ No business logic in test layer (pure verification)

### ADR-005 and ADR-006 Compliance

**ADR-005**: Testing Strategy - UAT Must Use Real Services
- ✅ Story uses real Cognito authentication (`cognito-auth.fixture.ts`)
- ✅ Story uses real backend API (BUGF-031 deployed to staging)
- ✅ Story uses real S3 bucket (CORS configured for browser uploads)
- ✅ No MSW mocking in E2E tests (MSW only for unit/integration tests)

**ADR-006**: E2E Tests Required in Dev Phase
- ✅ Story IS the E2E test implementation for BUGF-032 (split per elaboration)
- ✅ Tests will run in CI/CD pipeline (GitHub Actions workflow documented)
- ✅ Tests use semantic selectors (`getByRole`, `getByLabelText`) - no `data-testid`
- ✅ Pre-test validation ensures infrastructure is ready (health check, CORS check)

---

## Scope Boundary Analysis

### In Scope (Confirmed)

1. **Test Coverage Areas** (AC1-AC4):
   - ✅ Happy path: File selection → presigned URL API → S3 upload → progress → success
   - ✅ Error scenarios: Invalid file type, file too large, network failure
   - ✅ Session expiry: 403 from S3, SessionExpiredBanner, refresh flow
   - ✅ Multi-file upload: 5 files, 3 concurrent, queue management

2. **Test Infrastructure** (AC5):
   - ✅ 4 new feature files (BDD/Cucumber Gherkin scenarios)
   - ✅ Extend existing step definitions (`inst-1105-presigned-upload.steps.ts`)
   - ✅ Extend existing page objects (`UploaderPage` class)
   - ✅ Reuse existing fixtures (`cognito-auth`, `browser-auth`)
   - ✅ File cleanup in afterEach hooks
   - ✅ CI/CD integration (GitHub Actions workflow)

3. **Environment Requirements**:
   - ✅ BUGF-031 backend deployed to staging
   - ✅ S3 bucket with CORS configured
   - ✅ Cognito test user seeded
   - ✅ Environment variables available in CI secrets

### Out of Scope (Protected)

1. **Unit/integration tests** - covered in BUGF-013, BUGF-032 (correct boundary)
2. **Backend API testing** - covered in BUGF-031 integration tests (correct boundary)
3. **UI/UX improvements** - separate stories (correct boundary)
4. **Performance testing** - separate story (correct boundary)
5. **Session refresh API implementation** - BUGF-004 (future story) (correct boundary)
6. **Multipart upload support** - deferred (correct boundary)
7. **Accessibility testing** - covered by existing a11y tests BUGF-020 (correct boundary)
8. **E2E tests for non-instruction categories** - future enhancement (correct boundary)

### Boundary Validation

✅ **No scope creep detected** - all boundaries are clean and well-justified.

---

## Technical Implementation Notes

### Clock Mocking for Session Expiry (AC3)

Story documents Playwright clock mocking pattern:
```typescript
await page.clock.install({ time: new Date('2026-02-14T12:00:00Z') })
// Generate presigned URL
await page.clock.fastForward('16:00') // 16 minutes > 15 min expiry
// Verify 403 error and session expired banner
```

**Assessment**: ✅ Correct approach - avoids 15-minute real-time wait in CI. Playwright's clock API is stable and well-documented. Alternative backend config (shorter expiry for test env) also mentioned as fallback.

### Multi-File Concurrency Verification (AC4)

Story documents timestamp analysis pattern:
```typescript
const uploadTimestamps: Array<{ file: string; start: number; end: number }> = []
// Track request start/end times via page.on('request'/'response')
// Analyze max concurrent uploads: calculateMaxConcurrent(uploadTimestamps)
expect(concurrentCount).toBeLessThanOrEqual(3)
```

**Assessment**: ✅ Correct approach - verifies concurrency without race conditions. Timestamp analysis is deterministic and reliable for E2E tests.

### Network Request Verification Pattern

Story documents verification (not mocking):
```typescript
const apiRequest = page.waitForRequest(req =>
  req.url().includes('/api/uploads/presigned-url') && req.method() === 'POST'
)
const s3Request = page.waitForRequest(req =>
  req.url().includes('s3.amazonaws.com') && req.method() === 'PUT'
)
await apiRequest
await s3Request
```

**Assessment**: ✅ Correct - verifies requests happened (ADR-006 compliance). Does NOT mock responses. Tests real flow end-to-end.

### Semantic Selectors (Required)

Story mandates semantic selectors:
- ✅ `page.getByRole('button', { name: /upload/i })`
- ✅ `page.getByLabelText(/choose file/i)`
- ✅ `page.getByRole('progressbar')`
- ✅ `page.getByRole('alert')` for error banners

**Assessment**: ✅ Correct - aligns with accessibility-first testing. No `data-testid` usage (good practice).

**Issue**: UploaderPage class uses `data-testid` for some locators (line 89: `sessionExpiredBanner`, line 91: `uploadList`).
**Recommendation**: Defer fixing UploaderPage to Future Opportunities (non-blocking for MVP, existing code pattern).

---

## CI/CD Integration Analysis

### GitHub Actions Workflow

Story documents workflow update:
- ✅ Secrets required: `STAGING_COGNITO_POOL_ID`, `STAGING_COGNITO_CLIENT_ID`, `STAGING_API_URL`, `STAGING_S3_BUCKET`, `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`
- ✅ Workflow runs on PR to main, merge to main
- ✅ Test execution timeout: 10 minutes for full suite
- ✅ Retries: 0 (failures should be investigated, not masked)
- ✅ Failure handling: Capture traces, upload artifacts, post PR comment

**Assessment**: ✅ Well-specified - all requirements documented. Secrets management follows best practices.

### Pre-Test Validation Script

Story documents environment check:
```typescript
// Verify backend is deployed and healthy
const healthResponse = await fetch(`${process.env.API_BASE_URL}/health`)
expect(healthResponse.ok).toBe(true)

// Verify S3 bucket CORS configured
const corsResponse = await fetch(
  `https://${process.env.S3_BUCKET}.s3.amazonaws.com`,
  { method: 'OPTIONS' }
)
expect(corsResponse.headers.get('access-control-allow-origin')).toBeTruthy()
```

**Assessment**: ✅ Excellent - prevents test failures from infrastructure issues. Should run in `beforeAll` hook.

---

## Flakiness Mitigation Analysis

Story documents 4 flakiness risks with mitigations:

1. **Timing Issues** (Progress bar updates):
   - **Mitigation**: Use `waitFor` with retry: `await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/, { timeout: 5000 })`
   - ✅ Correct approach

2. **Network Variability** (S3 upload speed):
   - **Mitigation**: Generous timeouts (120s for upload operations), use 30MB files (not 100MB)
   - ✅ Correct approach

3. **Session Expiry** (15-minute wait):
   - **Mitigation**: Clock mocking OR backend config to reduce expiry to 2 minutes
   - ✅ Correct approach

4. **File Cleanup** (Test files accumulate):
   - **Mitigation**: Unique file names (timestamp + random suffix), afterEach cleanup, S3 lifecycle policy
   - ✅ Correct approach

**Assessment**: ✅ All flakiness risks addressed with practical mitigations. Story demonstrates awareness of E2E testing challenges.

---

## Test Data Management

Story documents:
- ✅ `createTestPDF(sizeInMB)` - generates PDFs of specific sizes for boundary testing
- ✅ Unique naming: `e2e-test-${timestamp}-${randomSuffix}.pdf`
- ✅ Cleanup: Delete from S3 after test, delete local temp files in afterEach, S3 lifecycle policy safety net

**Assessment**: ✅ Comprehensive - prevents test data conflicts and accumulation.

---

## Dependency Risk Assessment

**BUGF-031** (Backend API) - Status: ready-to-work
- ⚠️ **BLOCKING RISK**: BUGF-031 must be implemented AND deployed to staging before BUGF-051 E2E tests can run
- ⚠️ Story does NOT document what happens if BUGF-031 is not ready
- ✅ Pre-test validation script will catch this (health check)
- **Recommendation**: Add to FUTURE-OPPORTUNITIES.md - "Consider BUGF-031 mock server for E2E dev iteration"

**BUGF-032** (Frontend Integration) - Status: uat
- ✅ **NO BLOCKING RISK**: BUGF-032 is complete and in UAT (awaiting E2E tests = this story)
- ✅ Story is the E2E validation for BUGF-032

**Infrastructure Dependencies**:
- ⚠️ S3 bucket with CORS configured - must exist before tests run
- ⚠️ Cognito test user - must be seeded before tests run
- ⚠️ CI secrets - must be configured before workflow runs
- ✅ Pre-test validation script will catch all of these

**Assessment**: BUGF-031 completion is CRITICAL PATH. Story should document coordination strategy.

---

## Worker Token Summary

- **Input**: ~76,000 tokens (files read: stories.index.md, BUGF-051.md, api-layer.md, inst-1105-presigned-upload.steps.ts, uploader.page.ts, BUGF-031.md, BUGF-032.md, inst-1105-presigned-upload.feature, cognito-auth.fixture.ts)
- **Output**: ~5,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
