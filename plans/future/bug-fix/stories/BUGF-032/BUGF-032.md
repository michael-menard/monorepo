---
id: BUGF-032
title: "Frontend Integration for Presigned URL Upload"
status: uat
split_from: BUGF-001
split_part: 2 of 2
priority: P1
phase: 1
epic: bug-fix
story_type: feature
experiment_variant: control
created_at: 2026-02-11
updated_at: 2026-02-11T20:00:00Z
points: 3
tags:
  - frontend
  - uploads
  - rtk-query
  - e2e-testing
depends_on:
  - BUGF-031
blocks: []
related:
  - BUGF-004
  - BUGF-028
surfaces:
  backend: false
  frontend: true
  database: false
  infrastructure: false
---

# BUGF-032: Frontend Integration for Presigned URL Upload

## Split Context

This story is part of a split from BUGF-001.

- **Original Story:** BUGF-001 - Implement Presigned URL API for Upload Functionality
- **Split Reason:** Story exceeded 5/6 sizing indicators (>8 AC, frontend+backend, infrastructure, 4+ packages, 3+ test types). Natural split exists between backend API creation and frontend integration.
- **This Part:** 2 of 2 (Frontend)
- **Dependency:** Depends on BUGF-031 (Backend API + Infrastructure)

## Context

The backend API endpoint for presigned URL generation is now available (BUGF-031). The frontend has a complete upload infrastructure (`@repo/upload` package) with XHR-based upload client, progress tracking, session management, and expiry handling, but it needs to be wired into the actual presigned URL API.

**Existing Frontend Infrastructure:**
- `@repo/upload` package with `useUploadManager` hook
- `uploadToPresignedUrl` XHR function ready for S3 uploads
- Upload UI components (UploaderList, SessionExpiredBanner, RateLimitBanner)
- RTK Query uploads-api slice with types (created in BUGF-031)

**The Gap:**
Frontend upload pages (`app-instructions-gallery/upload-page.tsx` and `main-app/InstructionsNewPage.tsx`) still use mock/stub implementations. This story integrates the real API.

## Goal

Enable users to upload PDF instruction files to S3 via presigned URLs by integrating the backend API (BUGF-031) into frontend upload pages and validating the full E2E upload flow.

**Success Criteria:**
- User can select PDF file in upload UI
- Frontend requests presigned URL from API
- User's file uploads directly to S3
- Upload progress tracked in real-time
- Session expiry detected and handled gracefully
- E2E tests verify complete upload flow

## Non-Goals

- Backend API changes (completed in BUGF-031)
- Infrastructure setup (completed in BUGF-031)
- Session refresh API (BUGF-004)
- Multipart upload support
- Upload manager hook changes (use as-is)

**Protected Features:**
- `useUploadManager` hook interface (must not change API)
- `uploadToPresignedUrl` function signature (already tested and used)
- Upload component props (UploaderList, SessionExpiredBanner)

## Scope

### Frontend Pages (Modified)

**app-instructions-gallery/src/pages/upload-page.tsx**
- Wire `useGeneratePresignedUrlMutation` from RTK Query
- Replace mock presigned URL generation with real API call
- Pass presigned URL to `useUploadManager` hook
- Handle API errors (400, 401, 413, 500)

**main-app/src/routes/pages/InstructionsNewPage.tsx**
- Wire `useGeneratePresignedUrlMutation` from RTK Query
- Replace mock presigned URL generation with real API call
- Pass presigned URL to `useUploadManager` hook
- Handle API errors

### Packages (Modified)

**packages/core/api-client/src/rtk/uploads-api.ts**
- Add mutation implementation (types already exist from BUGF-031)
- Export `useGeneratePresignedUrlMutation` hook
- Configure cache invalidation

**packages/core/api-client/src/config/endpoints.ts**
- Verify endpoint constant exists (should be added in BUGF-031)

### Packages (Reused - No Changes)

**packages/core/upload/**
- `useUploadManager` hook - Use as-is
- `uploadToPresignedUrl` function - Use as-is
- Upload components - Use as-is

**@repo/app-component-library**
- UploaderList - Use as-is
- SessionExpiredBanner - Use as-is
- RateLimitBanner - Use as-is

## Acceptance Criteria

### AC3: End-to-End Upload Flow in UI
**Given** user is on `/instructions/new` page
**When** they select a PDF file and click "Start Upload"
**Then** frontend requests presigned URL from API
**And** frontend uploads file to S3 using presigned URL
**And** progress bar updates during upload
**And** file card shows "success" status on completion

### AC7: Handle Expired Presigned URL
**Given** a presigned URL generated 16 minutes ago
**When** user attempts to PUT file to expired URL
**Then** S3 returns 403 Forbidden
**And** upload manager detects EXPIRED_SESSION error
**And** UI shows "Session expired" banner

## Reuse Plan

### Frontend Reuse

**Hook:** `useUploadManager` from `@repo/upload/hooks`
- Use without modification
- Wire into presigned URL API call
- Leverage existing session expiry detection

**RTK Pattern:** Wishlist API (`packages/core/api-client/src/rtk/wishlist-gallery-api.ts`)
- Copy mutation pattern for uploads-api slice
- Adapt endpoint and schemas (types from BUGF-031)
- Maintain cache invalidation approach

**Components:** Full reuse from `@repo/app-component-library`
- UploaderList - No changes
- SessionExpiredBanner - No changes
- RateLimitBanner - No changes
- ConflictModal - No changes

## Architecture Notes

### Frontend Integration Flow
```
1. User selects file in UI
2. Frontend validates file (type, size) client-side
3. Frontend calls useGeneratePresignedUrlMutation with file metadata
4. Backend returns presigned URL + metadata (BUGF-031)
5. Frontend passes presigned URL to useUploadManager
6. useUploadManager calls uploadToPresignedUrl
7. XHR PUT to S3 with progress events
8. Frontend updates UI with progress
9. On success: Mark upload complete
10. On error: Handle error (expiry, network, etc.)
```

### Error Handling Integration
- **Client-side pre-validation:** File type, size before API call
- **API errors:** Map to user-friendly messages
  - 401: Show "Please sign in" message
  - 400: Show "Invalid file type or size" message
  - 413: Show "File too large (max 100MB)" message
  - 500: Show "Upload service unavailable, try again later"
- **S3 errors:** Handle via upload manager
  - 403 (expired): Show SessionExpiredBanner
  - Network errors: Show retry option

### Session Expiry Integration
- Backend returns `expiresIn: 900` (15 minutes)
- Frontend tracks expiry locally with 30-second buffer
- Upload manager detects 403 errors as EXPIRED_SESSION
- For MVP: Show "Session expired, refresh page" message
- Future: Trigger session refresh flow (BUGF-004)

## Test Plan

### Frontend Integration Tests
- **RTK Query Mutation** (`packages/core/api-client/src/rtk/uploads-api.ts`)
  - Test mutation hook returns correct request structure
  - Test mutation success updates cache
  - Test mutation error handling (401, 400, 413, 500)
  - Mock API responses with MSW

- **Upload Page Integration** (`app-instructions-gallery/src/pages/upload-page.tsx`)
  - Test presigned URL request on file selection
  - Test upload manager receives presigned URL
  - Test progress updates during upload
  - Test success state rendering
  - Test error state rendering (API errors, S3 errors)
  - Mock API with MSW (BUGF-028)

- **Main App Page Integration** (`main-app/src/routes/pages/InstructionsNewPage.tsx`)
  - Same tests as upload-page.tsx
  - Verify both pages use same pattern

### E2E Tests (Playwright)

**Test Suite:** Upload Flow E2E

**Setup:**
- Authenticated user session
- Backend API deployed (BUGF-031)
- S3 bucket configured
- Test PDF file available

**Test Cases:**

1. **Happy Path: Complete Upload Flow**
   - Navigate to `/instructions/new`
   - Select PDF file (2MB)
   - Click "Start Upload"
   - Verify progress bar appears
   - Verify progress updates (0% → 100%)
   - Verify success message
   - Verify file card shows "Uploaded" status
   - Verify S3 object exists (via backend API)

2. **Error: Invalid File Type**
   - Navigate to `/instructions/new`
   - Attempt to select .exe file
   - Verify file picker rejects or client-side validation shows error
   - Verify no API call made

3. **Error: File Too Large**
   - Navigate to `/instructions/new`
   - Select 150MB PDF file
   - Click "Start Upload"
   - Verify 413 error from API
   - Verify error message: "File too large (max 100MB)"

4. **Error: Session Expired**
   - Generate presigned URL
   - Wait 16 minutes (or mock system time)
   - Attempt upload
   - Verify 403 from S3
   - Verify SessionExpiredBanner appears
   - Verify message: "Session expired, please refresh"

5. **Error: Network Failure**
   - Navigate to `/instructions/new`
   - Select PDF file
   - Start upload
   - Simulate network interruption (Playwright network conditions)
   - Verify upload manager detects network error
   - Verify retry option appears

6. **Multi-File Upload**
   - Navigate to `/instructions/new`
   - Select 3 PDF files
   - Start upload
   - Verify each file gets presigned URL
   - Verify uploads run sequentially or in parallel (per design)
   - Verify all progress bars update independently
   - Verify all success states

**Network Tracing:**
- Enable Playwright network logging
- Verify API request to `/api/uploads/presigned-url`
- Verify PUT to S3 presigned URL
- Verify no sensitive data in logs

**Accessibility Checks:**
- Verify screen reader announces upload start
- Verify progress updates announced
- Verify success/error states announced
- Verify keyboard navigation works

## UI/UX Notes

**Verdict:** PASS-WITH-NOTES

**Summary:**
- No new components required - full reuse of existing upload UI
- Minor wiring changes in upload pages to call presigned URL API
- Accessibility requirements met by existing components
- Playwright tests required for E2E upload flow

**Error Message Guidelines:**

| Error Code | User-Facing Message | Action |
|------------|---------------------|--------|
| 401 | "Please sign in to upload files" | Redirect to sign-in |
| 400 | "Invalid file type. Only PDF files are allowed." | None |
| 413 | "File is too large. Maximum size is 100MB." | None |
| 500 | "Upload service is temporarily unavailable. Please try again later." | Retry button |
| 403 (S3) | "Your session has expired. Please refresh the page." | Refresh button |
| Network | "Network error. Check your connection and try again." | Retry button |

**Loading States:**
- Use existing UploaderList progress bars
- Show spinner during presigned URL request (before upload starts)

**Success States:**
- Use existing file card "success" status
- Optional: Add success animation (future enhancement)

## Dev Feasibility

**Feasible:** Yes (High confidence)

**Change Surface:** ~350 LOC
- RTK Query mutation implementation: ~100 LOC
- Upload page integration (2 pages): ~100 LOC
- Error handling and mapping: ~50 LOC
- E2E tests: ~100 LOC

**Dependencies:**
- BUGF-031 must be deployed and verified (backend API)
- S3 bucket must be configured and accessible
- CORS must be set up correctly

**Risks:**
1. **BUGF-031 not deployed** - Blocks all frontend work
   - Mitigation: Can develop against local backend or mock API
2. **CORS misconfiguration** - Blocks browser uploads
   - Mitigation: BUGF-031 includes CORS testing
3. **E2E test flakiness** - Network timing issues
   - Mitigation: Use Playwright retries and explicit waits

**Testing Strategy:**
- Unit tests with MSW mocking (BUGF-028)
- Integration tests with real backend (staging env)
- E2E tests with Playwright (full flow)

## Reality Baseline

**Codebase State:**
- `@repo/upload` package complete and tested
- `useUploadManager` hook supports presigned URL flow
- `uploadToPresignedUrl` XHR function ready
- Upload UI components production-ready
- RTK Query uploads-api slice exists with types (from BUGF-031)
- Upload pages currently use mock presigned URLs

**Established Patterns:**
- RTK Query mutations: `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`
- Upload session management: `packages/core/upload/src/hooks/useUploaderSession.ts`
- Error handling: Existing error mapping patterns in upload components

**Constraints:**
- Must not change `useUploadManager` hook API
- Must not change upload component props
- Must reuse existing UI components
- E2E tests must run in CI/CD pipeline

**Active Dependencies:**
- Depends on BUGF-031 (Backend API + Infrastructure)
- Related to BUGF-004 (Session Refresh API - future)
- Related to BUGF-028 (MSW Mocking for Tests)

**Relevant Packages:**
- `@repo/upload` (frontend upload infrastructure)
- `@repo/api-client` (RTK Query integration)
- `@repo/app-component-library` (upload UI components)
- `apps/web/app-instructions-gallery` (upload page)
- `apps/web/main-app` (instructions new page)

---

**Estimated Effort:** 3 points (2-3 days)
- RTK Query mutation implementation: 0.5 days
- Upload page integration (both pages): 1 day
- E2E test suite: 1 day
- Error handling and edge cases: 0.5 days
- Code review and QA: 0.5 days

**Risk Level:** Low (straightforward integration, all infrastructure ready)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps | All addressed in story | — |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Session refresh flow not implemented | integration | FUTURE-OPPORTUNITIES.md |
| 2 | No retry-after countdown timer in RateLimitBanner | ux-enhancement | FUTURE-OPPORTUNITIES.md |
| 3 | No upload progress persistence | performance | FUTURE-OPPORTUNITIES.md |
| 4 | Duplicate file detection not implemented | edge-case | FUTURE-OPPORTUNITIES.md |
| 5 | No client-side pre-validation UI | ux-enhancement | FUTURE-OPPORTUNITIES.md |
| 6 | No batch upload optimization | performance | FUTURE-OPPORTUNITIES.md |
| 7 | No upload analytics | observability | FUTURE-OPPORTUNITIES.md |
| 8 | Network quality detection missing | ux-enhancement | FUTURE-OPPORTUNITIES.md |
| 9 | No upload cancellation confirmation | edge-case | FUTURE-OPPORTUNITIES.md |
| 10 | Missing upload queue visualization | observability | FUTURE-OPPORTUNITIES.md |

### Enhancement Opportunities (20 tracked)

| # | Finding | Category | Priority |
|---|---------|----------|----------|
| 1 | Success animation | ux-polish | Quick Win |
| 2 | Drag-and-drop file selection | ux-polish | Next Quarter |
| 3 | Image preview before upload | ux-polish | Quick Win |
| 4 | Upload speed indicator | ux-polish | Quick Win |
| 5 | Automatic retry on network recovery | resilience | Next Quarter |
| 6 | Upload history/recent files | ux-polish | Next Quarter |
| 7 | Multipart upload support | performance | Future Roadmap |
| 8 | Progressive image optimization | performance | Future Roadmap |
| 9 | Camera/photo capture integration | integration | Future |
| 10 | Accessibility: Upload progress announcements | a11y | Quick Win |
| 11 | Offline queue | resilience | Future Roadmap |
| 12 | Upload templates/presets | productivity | Next Quarter |
| 13 | Bulk file operations | ux-enhancement | Next Quarter |
| 14 | Upload verification | data-integrity | Next Quarter |
| 15 | Upload resumption after refresh | resilience | Future Roadmap |
| 16 | Custom error messages per file category | ux-polish | Quick Win |
| 17 | Upload conflict resolution | edge-case | Future |
| 18 | Upload size estimation | ux-polish | Quick Win |
| 19 | Upload to CDN edge locations | performance | Future Roadmap |
| 20 | Virus scanning integration | security | Future Roadmap |

### Summary

- **ACs added**: 0
- **KB entries created**: 0 (KB unavailable)
- **Non-blocking gaps**: 10
- **Enhancement opportunities**: 20
- **Mode**: autonomous
- **Audit status**: All 8 checks PASS
- **Proceed to implementation**: YES
