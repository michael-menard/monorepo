---
id: BUGF-051
title: "E2E Tests for Presigned URL Upload Flow"
status: ready-to-work
split_from: BUGF-032
priority: P2
phase: 5
epic: bug-fix
story_type: test
created_at: 2026-02-12
updated_at: 2026-02-12T03:30:00Z
points: 2
tags:
  - e2e-testing
  - playwright
  - uploads
  - presigned-url
depends_on:
  - BUGF-032
  - BUGF-031
blocks: []
related:
  - BUGF-028
  - BUGF-030
surfaces:
  backend: false
  frontend: true
  database: false
  infrastructure: false
---

# BUGF-051: E2E Tests for Presigned URL Upload Flow

## Split Context

Split from BUGF-032 to allow frontend integration to proceed without blocking on E2E test infrastructure.

- **Original Story:** BUGF-032 - Frontend Integration for Presigned URL Upload
- **Split Reason:** E2E tests require a live backend (BUGF-031) to be deployed and configured. Splitting allows BUGF-032 to complete with unit tests while E2E validation happens separately.
- **Dependencies:** BUGF-032 (frontend integration), BUGF-031 (backend API)

## Context

BUGF-032 implemented the frontend integration for presigned URL uploads:
- RTK Query mutation (`useGeneratePresignedUrlMutation`) in `@repo/api-client`
- Presigned URL API wired into `upload-page.tsx` and `InstructionsNewPage.tsx`
- Session refresh handler for expired presigned URLs
- Error handling, loading states, API error banners
- 16 unit tests for schemas (all passing)

This story adds Playwright E2E tests to verify the complete upload flow works end-to-end with a live backend.

## Goal

Validate the complete presigned URL upload flow works end-to-end using Playwright tests against a live backend, covering happy path, error scenarios, and session expiry.

## Non-Goals

- Frontend code changes (completed in BUGF-032)
- Backend changes (completed in BUGF-031)
- Unit or integration tests (completed in BUGF-032)

## Scope

### E2E Test Files (Created)

**apps/web/playwright/tests/upload-flow.spec.ts**
- Happy path: Select PDF, upload completes, progress updates
- Invalid file type: Client-side rejection
- File too large: 413 error handling
- Session expired: 403 from S3, SessionExpiredBanner shown
- Multi-file upload: Multiple presigned URLs, independent progress
- Network failure: Retry option appears

**apps/web/playwright/tests/upload-session-refresh.spec.ts**
- Session refresh: Expired URLs regenerated via API
- Upload retry after refresh: Files upload with new URLs
- Error during refresh: Graceful error handling

## Acceptance Criteria

### AC1: Happy Path Upload E2E
**Given** user is on `/instructions/new` page with live backend
**When** they select a PDF file and the upload completes
**Then** Playwright verifies:
- API call to `/api/uploads/presigned-url` is made
- PUT request to S3 presigned URL is made
- Progress bar updates from 0% to 100%
- File card shows success status

### AC2: Error Handling E2E
**Given** user attempts various error scenarios
**When** file is too large, type is invalid, or network fails
**Then** appropriate error messages are shown to the user

### AC3: Session Expiry E2E
**Given** a presigned URL has expired
**When** user clicks "Refresh Session"
**Then** new presigned URLs are generated and uploads retry

## Test Plan

### Prerequisites
- BUGF-031 backend deployed and healthy
- S3 bucket configured with CORS
- Authenticated user session fixture
- Test PDF file available

### E2E Test Cases

1. **Happy Path: Complete Upload Flow**
   - Navigate to `/instructions/new`
   - Select 2MB PDF file
   - Verify presigned URL API call (network trace)
   - Verify PUT to S3 presigned URL
   - Verify progress bar updates (0% -> 100%)
   - Verify success message

2. **Error: Invalid File Type**
   - Attempt to select .exe file
   - Verify no API call made
   - Verify error message shown

3. **Error: File Too Large**
   - Select 150MB PDF file
   - Verify 413 error from API
   - Verify error message: "File too large"

4. **Error: Session Expired**
   - Mock expired presigned URL
   - Attempt upload
   - Verify 403 from S3
   - Verify SessionExpiredBanner appears

5. **Multi-File Upload**
   - Select 3 PDF files
   - Verify each gets presigned URL
   - Verify all progress bars update independently

6. **Network Failure**
   - Start upload, simulate network interruption
   - Verify retry option appears

7. **Session Refresh Flow**
   - Generate presigned URL, wait for expiry
   - Click refresh, verify new URLs requested
   - Verify uploads retry with new URLs

### Network Tracing
- Enable Playwright network logging
- Verify API request to `/api/uploads/presigned-url`
- Verify PUT to S3 presigned URL
- Verify no sensitive data in logs

### Accessibility Checks
- Screen reader announces upload start
- Progress updates announced
- Success/error states announced
- Keyboard navigation works

## Dev Feasibility

**Feasible:** Yes
**Change Surface:** ~200 LOC (Playwright test files only)
**Risk Level:** Low (test-only changes, no production code)

**Risks:**
1. Backend not deployed - blocks all E2E tests
2. CORS misconfiguration - blocks browser uploads
3. E2E test flakiness - use Playwright retries and explicit waits

## Reality Baseline

**Existing Infrastructure:**
- Playwright configured in `apps/web/playwright/`
- Auth fixture available for authenticated tests
- Network tracing available via Playwright API

**Related Stories:**
- BUGF-030: Comprehensive E2E test suite (broader scope)
- BUGF-028: MSW mocking infrastructure (for unit/integration tests)
