---
id: BUGF-051
title: "E2E Tests for Presigned URL Upload Flow"
status: ready-to-work
priority: P2
phase: 5
story_type: test
points: 2
experiment_variant: control
created_at: "2026-02-14T21:54:00Z"
depends_on:
  - BUGF-031
  - BUGF-032
split_from: BUGF-032
epic: bug-fix
tags:
  - e2e-testing
  - playwright
  - upload-flow
  - presigned-url
predictions:
  split_risk: 0.1
  review_cycles: 1
  token_estimate: 80000
  confidence: medium
  rationale: "Test-only story with existing E2E infrastructure and patterns. Low implementation complexity, reusing established Playwright/BDD patterns. Dependencies on BUGF-031/032 completion add minor coordination risk but no technical complexity."
---

# BUGF-051: E2E Tests for Presigned URL Upload Flow

## Context

The presigned URL upload flow (BUGF-031 backend + BUGF-032 frontend) is now implemented but lacks comprehensive end-to-end testing. While unit and integration tests exist, we need E2E validation that the complete user journey works with a live backend and real S3 bucket.

**Current State:**
- BUGF-031 (ready-to-work): Backend API endpoint `POST /api/uploads/presigned-url` for generating secure, time-limited presigned S3 URLs
- BUGF-032 (uat): Frontend integration complete with RTK Query mutation, upload manager hook, session expiry handling
- Existing E2E infrastructure: Playwright with BDD/Cucumber, real Cognito auth, presigned upload step definitions (`inst-1105-presigned-upload.steps.ts`)

**Problem:**
Without E2E tests, we cannot verify:
1. The complete upload flow from file selection → presigned URL API → S3 upload → success
2. Error handling for invalid file types, oversized files, network failures
3. Session expiry detection and refresh behavior (15-minute presigned URL expiry)
4. Multi-file upload concurrency and queueing (3 concurrent uploads)

**Solution:**
Create comprehensive Playwright E2E tests that validate the presigned URL upload flow end-to-end using real services (ADR-006). Tests will cover:
- Happy path: File selection → presigned URL generation → S3 upload → progress tracking → success
- Error scenarios: Invalid file type, file too large, network failure
- Session expiry: 403 from S3 after expiry, session refresh flow
- Multi-file upload: Concurrency limits, queue management, all files complete

Tests will use existing E2E infrastructure (BDD/Cucumber, page objects, Cognito auth) and follow established patterns from `inst-1105-presigned-upload.steps.ts`.

## Goal

Ensure the presigned URL upload flow works end-to-end across the full stack (frontend → API → S3) with comprehensive test coverage for happy path and error scenarios.

## Non-Goals

**Explicitly Out of Scope:**
- Unit/integration tests for upload components (covered in BUGF-013, BUGF-032)
- Backend API testing (covered in BUGF-031 integration tests)
- UI/UX improvements to upload flow (separate stories)
- Performance testing of upload speed (separate story)
- Session refresh API implementation (BUGF-004 - future story)
- Multipart upload support (deferred)
- Accessibility testing (covered by existing a11y tests - BUGF-020)
- E2E tests for non-instruction categories (future enhancement)

**Protected Features:**
- Existing E2E test infrastructure (Playwright, BDD/Cucumber)
- Existing presigned upload step definitions in `inst-1105-presigned-upload.steps.ts` (reuse, don't rewrite)
- Page object pattern (`UploaderPage` class)
- Real Cognito authentication flow (no mocks per ADR-006)

**Deferred:**
- Session auto-refresh testing (BUGF-004 not implemented yet)
- Upload resume after page refresh (future enhancement)
- Virus scanning validation E2E (future story)

## Scope

### Test Coverage Areas

**1. Happy Path Upload Flow**
- Pages: `/instructions/new` (app-instructions-gallery)
- Components: Upload form, file input, progress bar, success message
- API: `POST /api/uploads/presigned-url` → `PUT {presignedUrl}` (S3)
- Verification: Request interception, progress updates, success state

**2. Error Handling Scenarios**
- File validation errors (too large, invalid type)
- Network failures during upload
- API errors (413, 400, 500)
- S3 upload errors

**3. Session Expiry Flow**
- Presigned URL expiry (15 minutes)
- 403 error detection
- SessionExpiredBanner display
- Session refresh and retry

**4. Multi-File Upload**
- 5 concurrent files
- Concurrency limit (3 simultaneous uploads)
- Queue management
- Individual progress tracking
- All files complete successfully

### Test Infrastructure

**Feature Files** (BDD/Cucumber):
- `features/upload/presigned-url-happy-path.feature`
- `features/upload/presigned-url-errors.feature`
- `features/upload/presigned-url-session-expiry.feature`
- `features/upload/presigned-url-multi-file.feature`

**Step Definitions** (extend existing):
- Extend `inst-1105-presigned-upload.steps.ts` with new scenarios
- Reuse existing steps: file selection, progress verification, upload completion
- Add new steps: session expiry banner, multi-file queue verification

**Page Objects** (extend existing):
- Extend `UploaderPage` class in `steps/pages/uploader.page.ts`
- Add session expiry banner locators if missing
- Add multi-file upload verification methods

**Fixtures**:
- `cognito-auth.fixture.ts` - real Cognito authentication
- `browser-auth.fixture.ts` - session persistence
- Do NOT use `msw.fixture.ts` (violates ADR-006)

**Utilities**:
- Reuse `createTestPDF` for test file generation
- Network request interception for verification (not mocking)
- File cleanup in teardown

### Environment Requirements

**Backend Dependencies:**
- BUGF-031 deployed to staging environment
- S3 bucket configured with CORS for browser uploads
- Presigned URL endpoint accessible: `POST /api/uploads/presigned-url`

**Authentication:**
- Real Cognito user pool with test users
- JWT tokens for authenticated requests

**Infrastructure:**
- Staging environment with all secrets configured
- CI runner with network access to S3

## Acceptance Criteria

### AC1: Happy Path Upload E2E Test Passes

**Given** a user is authenticated and on `/instructions/new` page
**When** user selects a valid PDF file (<100MB)
**Then:**
- Frontend requests presigned URL from `POST /api/uploads/presigned-url` (verify network request)
- API returns `{ presignedUrl, key, expiresIn, fileId }`
- Frontend uploads file to S3 using `PUT {presignedUrl}` (verify network request)
- Progress bar displays and updates during upload (aria-valuenow increases)
- File card shows "success" status on completion
- Success toast/message appears

**Verification:**
- Network request logs show both API call and S3 PUT
- Progress bar `aria-valuenow` attribute updates from 0 to 100
- Success status visible in DOM (semantic query, no data-testid)

### AC2: Error Handling E2E Tests Pass

#### AC2a: File Too Large Error

**Given** a user is authenticated and on upload page
**When** user selects a 150MB PDF file
**Then:**
- API returns 413 Payload Too Large error
- Error message displays: "File too large (max 100MB)" (or similar)
- No S3 upload occurs (verify no S3 PUT request)
- File card shows error state

**Verification:**
- Network logs confirm API 413 response
- Network logs confirm no S3 PUT request
- Error message visible and accessible (semantic query)

#### AC2b: Invalid File Type Error

**Given** a user is authenticated and on upload page
**When** user attempts to select a non-PDF file (e.g., .txt, .exe)
**Then:**
- Client-side validation rejects file OR API returns 400 error
- Error message displays: "Invalid file type" (or similar)
- No presigned URL generated (no API request OR API returns error)
- File card shows error state

**Verification:**
- Either no API request OR API returns 400 error
- Error message visible and accurate
- No S3 upload attempt

#### AC2c: Network Failure During Upload

**Given** a user has started an upload
**When** network is interrupted (Playwright network conditions)
**Then:**
- Upload manager detects network error
- Error message displays (network failure or similar)
- Retry option appears (button or UI affordance)

**And When** user retries upload
**Then:**
- Upload completes successfully

**Verification:**
- Network simulation causes upload to fail
- Retry mechanism works
- Second attempt succeeds

### AC3: Session Expiry E2E Test Passes

**Given** a user has generated a presigned URL (15min expiry)
**When** presigned URL expires (use Playwright clock mocking OR wait)
**And** user attempts S3 upload with expired URL
**Then:**
- S3 returns 403 Forbidden
- Upload manager detects EXPIRED_SESSION error
- SessionExpiredBanner appears with message: "Session expired, please refresh" (or similar)

**And When** user refreshes session
**Then:**
- New presigned URL generated
- Upload retries successfully
- Success state achieved

**Verification:**
- 403 response from S3 (network logs)
- SessionExpiredBanner visible (semantic query)
- Session refresh generates new presigned URL (verify new API request)
- Retry with new URL succeeds

**Note:** Use Playwright's `page.clock.install()` and `page.clock.fastForward()` to simulate time passing instead of waiting 15 minutes in real time.

### AC4: Multi-File Upload E2E Test Passes

**Given** a user is authenticated and on upload page
**When** user selects 5 PDF files (<100MB each)
**Then:**
- Frontend requests presigned URLs for all 5 files (verify 5 API requests)
- Maximum 3 files upload to S3 concurrently (verify S3 request timing)
- Remaining 2 files wait in queue
- All 5 progress bars update independently
- All 5 files eventually complete successfully
- All 5 file cards show "success" status

**Verification:**
- Network logs show 5 presigned URL API requests
- Network logs show S3 uploads with max 3 concurrent (timestamp analysis)
- All 5 file cards in success state
- No upload failures

### AC5: Test Infrastructure is Production-Ready

**Then:**
- All E2E tests use real Cognito authentication (no mocks)
- All E2E tests use real backend API (BUGF-031 deployed)
- All E2E tests use real S3 bucket (CORS configured)
- Network request verification confirms API and S3 calls (not mocked)
- Test PDF files are cleaned up after each test (no accumulation)
- Tests run in CI/CD pipeline without flakiness (3 consecutive runs pass)
- Test execution time is reasonable (<5 minutes for full suite)

**Verification:**
- Review test code: no MSW mocking, no stub services
- Review CI logs: tests pass on staging environment
- Review test artifacts: cleanup runs successfully
- Review CI metrics: 3 consecutive runs with 0 flakes

## Reuse Plan

### E2E Test Patterns (High Reuse)

**Step Definitions from `inst-1105-presigned-upload.steps.ts`:**
- File selection steps:
  - `I select a {size}MB PDF file for presigned upload`
  - `I select {count} PDF files for presigned upload`
- Progress verification steps:
  - `I should see a progress bar`
  - `the progress bar should update`
- Upload completion steps:
  - `the upload completes`
  - `I should see a success message`
- Error handling steps:
  - `I should see an error`
  - `the error message should contain {text}`

**Extend with New Steps:**
- Session expiry steps:
  - `Given the presigned URL has expired`
  - `Then I should see a session expired banner`
  - `When I refresh the session`
- Multi-file verification steps:
  - `Then {count} files should be uploading concurrently`
  - `And {count} files should be queued`
  - `And all {count} files should complete successfully`

### Page Objects

**Reuse `UploaderPage` from `steps/pages/uploader.page.ts`:**
- Form locators: `titleInput`, `descriptionTextarea`
- Upload button locators: `instructionsButton`
- File input locators: `instructionsFileInput`
- State element locators: `uploadList`

**Add Session Expiry Locators (if missing):**
```typescript
get sessionExpiredBanner() {
  return this.page.getByRole('alert').filter({ hasText: /session expired/i })
}

get refreshSessionButton() {
  return this.page.getByRole('button', { name: /refresh|try again/i })
}
```

**Add Multi-File Verification Methods:**
```typescript
async getUploadingFileCount() {
  const uploading = await this.page.getByRole('progressbar').count()
  return uploading
}

async getAllFileCardStatuses() {
  const cards = await this.page.getByRole('article').filter({ hasText: /\.pdf/i }).all()
  return Promise.all(cards.map(card => card.getAttribute('data-status')))
}
```

### Fixtures

**Reuse Authentication Fixtures:**
- `cognito-auth.fixture.ts` - Real Cognito authentication
  - Provides authenticated context
  - Handles test user creation/cleanup
- `browser-auth.fixture.ts` - Browser auth state persistence
  - Maintains session across tests

**Do NOT Use:**
- `msw.fixture.ts` - Violates ADR-006 (E2E tests use real services)

### Utilities

**Reuse Test File Generation:**
- `createTestPDF(sizeInMB: number)` function from existing steps
- Generates PDF files of specified size for boundary testing
- Usage: `createTestPDF(30)` for 30MB file, `createTestPDF(150)` for oversized file

**Reuse Network Request Waiting:**
- `page.waitForRequest(url => url.includes('/presigned-url'))` pattern
- `page.waitForResponse(url => url.includes('s3.amazonaws.com'))` pattern
- Verify requests happened (not mocking)

**Reuse File Cleanup Pattern:**
```typescript
test.afterEach(async () => {
  // Cleanup test files from S3 if needed
  // Cleanup local temp files
})
```

### Test Structure (BDD/Cucumber)

**Feature File Structure:**
```gherkin
Feature: Presigned URL Upload - Happy Path
  As a user
  I want to upload PDF instructions via presigned URLs
  So that my files are securely stored in S3

  Background:
    Given I am authenticated as a test user
    And I am on the "/instructions/new" page

  Scenario: Upload a single PDF file successfully
    When I select a 30MB PDF file for presigned upload
    Then I should see a progress bar
    And the upload should complete successfully
    And I should see a success message
```

**Step Implementation Pattern:**
```typescript
Given('I am on the {string} page', async ({ page }, url: string) => {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
})

When('I select a {int}MB PDF file for presigned upload', async ({ page }, size: number) => {
  const file = await createTestPDF(size)
  const fileInput = page.getByLabelText(/upload|choose file/i)
  await fileInput.setInputFiles(file)
})
```

## Architecture Notes

### Test Architecture

**E2E Test Philosophy (ADR-006):**
- E2E tests MUST use real services (no MSW, no stubs)
- Purpose: Validate entire user journey across real infrastructure
- Authentication: Real Cognito user pool
- Backend: Real API deployed to staging
- Storage: Real S3 bucket with CORS

**Test Infrastructure:**
- Framework: Playwright with BDD/Cucumber integration (`playwright-bdd`)
- Feature files: Gherkin scenarios (`.feature` files)
- Step definitions: TypeScript implementations (`.steps.ts` files)
- Page objects: Reusable UI interaction classes
- Fixtures: Shared test context (auth, browser state)

**Test Execution:**
- Workers: 1 (sequential execution for upload flow reliability)
- Timeouts: 30s default, 120s for upload operations
- Retries: 0 (real service failures should not be masked)
- Cleanup: File cleanup in afterEach hooks

### Network Request Verification

**Pattern: Intercept and Verify (Not Mock)**
```typescript
// Wait for presigned URL API call
const apiRequest = page.waitForRequest(req =>
  req.url().includes('/api/uploads/presigned-url') &&
  req.method() === 'POST'
)

// Wait for S3 upload
const s3Request = page.waitForRequest(req =>
  req.url().includes('s3.amazonaws.com') &&
  req.method() === 'PUT'
)

// Verify requests happened
await apiRequest
await s3Request
```

**Do NOT:**
- Mock responses with Playwright's `route.fulfill()`
- Use MSW to intercept requests
- Stub S3 or backend API

### Session Expiry Testing Strategy

**Challenge:** Real presigned URLs expire after 15 minutes - too long for CI.

**Solution: Clock Mocking**
```typescript
import { test } from '@playwright/test'

test('session expiry flow', async ({ page }) => {
  // Install clock before navigation
  await page.clock.install({ time: new Date('2026-02-14T12:00:00Z') })

  // User generates presigned URL
  await uploadPage.selectFile(testPDF)
  const presignedUrl = await getPresignedUrlFromUI() // helper to extract from network

  // Fast-forward 16 minutes (past 15min expiry)
  await page.clock.fastForward('16:00')

  // Attempt upload with expired URL
  await uploadPage.startUpload()

  // Verify 403 error and session expired banner
  await expect(uploadPage.sessionExpiredBanner).toBeVisible()
})
```

**Alternative:** Configure shorter expiry for test environment (e.g., 2 minutes) via backend environment variable.

### Multi-File Concurrency Verification

**Challenge:** Verify max 3 concurrent uploads without race conditions.

**Solution: Timestamp Analysis**
```typescript
const uploadTimestamps: Array<{ file: string; start: number; end: number }> = []

page.on('request', req => {
  if (req.url().includes('s3.amazonaws.com') && req.method() === 'PUT') {
    const fileName = extractFileNameFromRequest(req)
    uploadTimestamps.push({ file: fileName, start: Date.now(), end: 0 })
  }
})

page.on('response', res => {
  if (res.url().includes('s3.amazonaws.com') && res.request().method() === 'PUT') {
    const fileName = extractFileNameFromRequest(res.request())
    const record = uploadTimestamps.find(r => r.file === fileName)
    if (record) record.end = Date.now()
  }
})

// After uploads complete, analyze concurrency
const concurrentCount = calculateMaxConcurrent(uploadTimestamps)
expect(concurrentCount).toBeLessThanOrEqual(3)
```

### Semantic Selectors (Required)

**Use:**
- `page.getByRole('button', { name: /upload/i })`
- `page.getByLabelText(/choose file/i)`
- `page.getByRole('progressbar')`
- `page.getByRole('alert')` for error banners

**Do NOT Use:**
- `data-testid` selectors
- CSS class selectors
- XPath selectors

## Infrastructure Notes

### CI/CD Integration

**GitHub Actions Workflow Update:**
```yaml
# .github/workflows/e2e-tests.yml (or existing workflow)
jobs:
  e2e-upload-flow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Run Playwright E2E Tests - Upload Flow
        env:
          COGNITO_USER_POOL_ID: ${{ secrets.STAGING_COGNITO_POOL_ID }}
          COGNITO_CLIENT_ID: ${{ secrets.STAGING_COGNITO_CLIENT_ID }}
          API_BASE_URL: ${{ secrets.STAGING_API_URL }}
          S3_BUCKET: ${{ secrets.STAGING_S3_BUCKET }}
          TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
        run: |
          cd apps/web/playwright
          pnpm test:e2e --grep "presigned.*upload"

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-upload-flow-results
          path: apps/web/playwright/test-results/
```

**Required Secrets:**
- `STAGING_COGNITO_POOL_ID` - Cognito user pool for test environment
- `STAGING_COGNITO_CLIENT_ID` - Cognito app client ID
- `STAGING_API_URL` - Base URL for staging API (e.g., https://api-staging.example.com)
- `STAGING_S3_BUCKET` - S3 bucket name for test uploads
- `E2E_TEST_USER_EMAIL` - Test user email
- `E2E_TEST_USER_PASSWORD` - Test user password

### Environment Setup

**Pre-Test Validation Script:**
```typescript
// apps/web/playwright/setup/verify-environment.ts
import { test, expect } from '@playwright/test'

test.beforeAll(async () => {
  // Verify backend is deployed and healthy
  const healthResponse = await fetch(`${process.env.API_BASE_URL}/health`)
  expect(healthResponse.ok).toBe(true)

  // Verify S3 bucket exists (via API)
  const configResponse = await fetch(`${process.env.API_BASE_URL}/api/config`)
  const config = await configResponse.json()
  expect(config.uploadEnabled).toBe(true)

  // Verify CORS is configured (OPTIONS request to S3)
  const corsResponse = await fetch(
    `https://${process.env.S3_BUCKET}.s3.amazonaws.com`,
    { method: 'OPTIONS' }
  )
  expect(corsResponse.headers.get('access-control-allow-origin')).toBeTruthy()

  console.log('✅ E2E environment validated')
})
```

**File Cleanup Strategy:**
```typescript
// apps/web/playwright/utils/cleanup.ts
export async function cleanupTestFiles(s3Client: S3Client, bucket: string) {
  const prefix = 'e2e-test-uploads/'
  const objects = await s3Client.listObjectsV2({ Bucket: bucket, Prefix: prefix })

  if (objects.Contents && objects.Contents.length > 0) {
    await s3Client.deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: objects.Contents.map(obj => ({ Key: obj.Key! }))
      }
    })
  }
}
```

### Staging Environment Requirements

**Backend (BUGF-031):**
- Deployed to staging with environment variables:
  - `S3_BUCKET` - S3 bucket for uploads
  - `AWS_REGION` - AWS region
  - `PRESIGNED_URL_EXPIRY` - Set to 900 (15min) OR lower for tests (e.g., 120 for 2min)
  - `MAX_FILE_SIZE` - Set to 104857600 (100MB)
  - `ALLOWED_MIME_TYPES` - Set to `application/pdf`

**S3 Bucket:**
- CORS configuration:
  ```json
  [
    {
      "AllowedOrigins": ["https://staging.example.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
  ```
- Lifecycle policy: Delete objects in `e2e-test-uploads/` prefix after 1 day

**Cognito:**
- Test user pool with at least one test user
- User credentials stored in CI secrets

## Test Plan

### Pre-Test Validation

**Environment Check:**
1. Verify BUGF-031 backend deployed to staging (health check endpoint)
2. Verify S3 bucket exists and CORS configured (OPTIONS request test)
3. Verify Cognito test user exists and can authenticate (pre-test login)
4. Verify environment variables available in CI (assertions in setup script)

**Infrastructure Dependencies:**
- Backend API: BUGF-031 deployed and healthy
- S3 bucket: CORS configured, accessible from CI runner
- Cognito: Test user seeded, credentials in secrets
- Network: CI runner has outbound access to S3 and API

### Test Execution Strategy

**Test Priorities:**
1. **Critical (Must Pass):**
   - AC1: Happy path upload
   - AC2a: File too large error
   - AC5: Infrastructure production-ready

2. **High (Should Pass):**
   - AC3: Session expiry flow
   - AC2b: Invalid file type error

3. **Medium (Nice to Have):**
   - AC2c: Network failure retry
   - AC4: Multi-file upload concurrency

**Execution Order:**
1. Run infrastructure validation (AC5 subset)
2. Run happy path (AC1) - establishes baseline
3. Run error scenarios (AC2a, AC2b, AC2c) - isolated tests
4. Run session expiry (AC3) - timing-sensitive
5. Run multi-file (AC4) - most complex

**Parallel vs Sequential:**
- Tests run sequentially (workers: 1) to avoid S3 rate limiting
- File cleanup runs after each test to prevent conflicts

### Flakiness Mitigation

**Timing Issues:**
- **Problem:** Progress bar updates are timing-dependent
- **Solution:** Use `waitFor` with retry:
  ```typescript
  await expect(progressBar).toHaveAttribute('aria-valuenow', /[1-9]/, { timeout: 5000 })
  ```

**Network Variability:**
- **Problem:** S3 upload speed varies
- **Solution:** Generous timeouts (120s for upload operations)
- **Solution:** Use small files for tests (30MB baseline, not 100MB)

**Session Expiry:**
- **Problem:** 15-minute wait is too long for CI
- **Solution:** Use Playwright clock mocking OR backend config to reduce expiry to 2 minutes for test environment

**File Cleanup:**
- **Problem:** Test files accumulate, causing conflicts
- **Solution:** Use unique file names per test run (timestamp + random suffix)
- **Solution:** afterEach cleanup hook to delete S3 objects

### Test Data Management

**Test File Generation:**
```typescript
// Create PDF files of specific sizes for boundary testing
const smallFile = await createTestPDF(30) // 30MB - within limit
const largeFile = await createTestPDF(150) // 150MB - exceeds 100MB limit
const invalidFile = await createTestFile('test.txt') // Not a PDF
```

**Unique Naming:**
```typescript
const timestamp = Date.now()
const randomSuffix = Math.random().toString(36).substring(7)
const fileName = `e2e-test-${timestamp}-${randomSuffix}.pdf`
```

**Cleanup:**
- Delete from S3 after test completion
- Delete local temp files in afterEach hook
- Use S3 lifecycle policy for safety net (delete after 24 hours)

### CI/CD Execution

**GitHub Actions:**
- Trigger: On PR to main, on merge to main
- Environment: Staging
- Timeout: 10 minutes for full suite
- Retries: 0 (failures should be investigated, not masked)

**Failure Handling:**
- Capture Playwright traces on failure
- Upload test artifacts (screenshots, videos, traces)
- Post failure comment on PR with trace viewer link

**Success Criteria:**
- 3 consecutive CI runs pass without flakes
- Test execution time <5 minutes
- All 5 ACs verified

### Manual Verification

**QA Checklist:**
1. Review test code: No MSW mocking, real services only
2. Review CI logs: Tests run on staging environment
3. Review network logs: Verify API and S3 requests
4. Review test artifacts: Cleanup successful
5. Review test coverage: All ACs have corresponding tests

## Reality Baseline

**Baseline Date:** 2026-02-13
**Baseline File:** `/Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md`

**Key Context Used:**
- Existing E2E infrastructure: Playwright + BDD/Cucumber + real Cognito auth
- Existing presigned upload steps: `inst-1105-presigned-upload.steps.ts`
- Page object pattern: `UploaderPage` class
- ADR-006: E2E tests use real services (no MSW)
- BUGF-031 backend endpoint: `POST /api/uploads/presigned-url`
- BUGF-032 frontend integration: RTK mutation, upload manager hook, session expiry detection

**Dependencies:**
- BUGF-031 (ready-to-work): Backend API must be deployed to staging
- BUGF-032 (uat): Frontend integration complete (tests this work)

**Constraints:**
- All E2E tests must use real Cognito, real API, real S3 (ADR-006)
- Test timeout: 30s default, 120s for upload operations
- Tests run sequentially (workers: 1) for upload flow reliability
- Presigned URL expiry: 15 minutes (900 seconds) - use clock mocking or reduce for tests
- File size limit: 100MB for instruction category
- Allowed MIME types: `application/pdf`
- Multi-file concurrency limit: 3 simultaneous uploads

**Protected Features:**
- Existing E2E test infrastructure (do not rewrite)
- Existing presigned upload step definitions (extend, don't replace)
- Page object pattern (follow established structure)

---

**Story generated:** 2026-02-14T21:54:00Z
**Experiment variant:** control
**Baseline:** /Users/michaelmenard/Development/monorepo/plans/baselines/BASELINE-REALITY-2026-02-13.md

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-14_

### MVP Gaps Resolved

| # | Finding | Resolution | Category |
|---|---------|------------|----------|
| None | All audit checks PASS - 0 MVP-critical gaps found | Story implementation-ready | — |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry | Impact |
|---|---------|----------|----------|--------|
| 1 | UploaderPage uses data-testid for some locators | UX polish | kb:BUGF-051:gap-001 | Low |
| 2 | Multi-file verification methods missing from UploaderPage | UX polish | kb:BUGF-051:gap-002 | Low |
| 3 | No BUGF-031 mock server for E2E dev iteration | Integration | kb:BUGF-051:gap-003 | Medium |
| 4 | Session expiry clock mocking not tested in isolation | Edge case | kb:BUGF-051:gap-004 | Low |
| 5 | Network failure simulation uses random retry logic | Edge case | kb:BUGF-051:gap-005 | Low |
| 6 | File cleanup relies on afterEach hooks without verification | Observability | kb:BUGF-051:gap-006 | Low |
| 7 | Pre-test validation script not integrated into test suite | Observability | kb:BUGF-051:gap-007 | Medium |
| 8 | No visual regression testing for upload flow UI | UX polish | kb:BUGF-051:gap-008 | Low |
| 9 | No test coverage for upload cancellation mid-S3-upload | Edge case | kb:BUGF-051:gap-009 | Medium |
| 10 | Timestamp analysis for concurrency verification has race condition potential | Edge case | kb:BUGF-051:gap-010 | Low |

### Enhancement Opportunities (Logged to KB)

| # | Finding | Category | KB Entry | Impact | Priority |
|---|---------|----------|----------|--------|----------|
| 1 | Extend E2E tests to cover non-instruction categories | Integration | kb:BUGF-051:enh-001 | Medium | — |
| 2 | Add performance monitoring to E2E tests | Performance | kb:BUGF-051:enh-002 | Medium | — |
| 3 | Add video recording for failing E2E tests | Observability | kb:BUGF-051:enh-003 | High | ⭐ HIGH |
| 4 | Add E2E test for resume upload after page refresh | UX polish | kb:BUGF-051:enh-004 | High | Deferred |
| 5 | Add E2E test for virus scanning validation | Integration | kb:BUGF-051:enh-005 | Medium | Deferred |
| 6 | Add E2E test for CDN integration | Integration | kb:BUGF-051:enh-006 | Low | — |
| 7 | Add E2E test for rate limiting on presigned URL API | Integration | kb:BUGF-051:enh-007 | Low | — |
| 8 | Add E2E test for concurrent multi-category uploads | Integration | kb:BUGF-051:enh-008 | Medium | — |
| 9 | Add E2E test matrix for different file sizes | Edge case | kb:BUGF-051:enh-009 | Medium | — |
| 10 | Add E2E test for session refresh API (BUGF-004) | Integration | kb:BUGF-051:enh-010 | High | ⭐ HIGH |
| 11 | Add Lighthouse performance audit integration | Observability | kb:BUGF-051:enh-011 | Low | — |
| 12 | Add E2E test for multiple users uploading concurrently | Performance | kb:BUGF-051:enh-012 | Low | — |
| 13 | Add E2E test for upload with slow network simulation | Edge case | kb:BUGF-051:enh-013 | Medium | — |
| 14 | Add E2E test for S3 CORS error handling | Edge case | kb:BUGF-051:enh-014 | Medium | — |
| 15 | Add E2E test for presigned URL expiry BEFORE upload starts | Edge case | kb:BUGF-051:enh-015 | Medium | — |

### Summary

- **ACs added**: 0 (all audit checks PASS - no MVP-critical gaps)
- **KB entries created**: 25 (10 gaps + 15 enhancements, all non-blocking)
- **Mode**: autonomous
- **Verdict**: PASS - story proceeds to implementation without modifications

**High-Priority Future Items:**
1. `kb:BUGF-051:gap-007` - Integrate pre-test validation script into beforeAll hook
2. `kb:BUGF-051:enh-003` - Add video recording for failing E2E tests (low effort, high impact)
3. `kb:BUGF-051:enh-010` - Add E2E test for session refresh API (after BUGF-004 completes)
