---
id: BUGF-013
title: "Add Test Coverage for Instructions Gallery Upload Components"
status: ready-to-work
phase: 3
priority: P2
story_type: test
points: 5
experiment_variant: control
created_at: "2026-02-11T00:00:00Z"
epic: bug-fix
feature_area: app-instructions-gallery
depends_on: []
blocks: []
touches_frontend: true
touches_backend: false
touches_database: false
touches_infra: false
---

# BUGF-013: Add Test Coverage for Instructions Gallery Upload Components

## Context

The app-instructions-gallery upload flow was recently integrated with the presigned URL API (BUGF-032), but several critical components lack test coverage. Current test coverage is approximately 36%, below the 45% minimum threshold. The shared @repo/upload package has comprehensive test coverage (18 test files), but app-specific integration points are untested.

**Current Coverage Status:**
- Total source files in app-instructions-gallery: 50 files
- Total test files: 18 test files
- Approximate coverage: ~36% (below 45% minimum threshold)

**Recent Related Work:**
- BUGF-032 (ready-for-qa): Frontend integration for presigned URL upload complete with RTK Query mutation, session refresh handling, 16 unit tests passing
- BUGF-031 (ready-to-work): Backend API endpoint POST /api/uploads/presigned-url for generating presigned S3 URLs
- @repo/upload package: Comprehensive test coverage with 18 test files for hooks, components, types

**Problem:**

The following high-value components have zero test coverage:

1. **Upload Flow Components** - SessionProvider, UploaderFileItem, UploaderList (thin wrappers around @repo/upload)
2. **Error Handling Components** - ConflictModal, RateLimitBanner, SessionExpiredBanner
3. **Main Upload Page** - upload-page.tsx (789 lines, presigned URL integration, finalize flow)
4. **Edit Form Components** - EditForm.tsx, SlugField.tsx, TagInput.tsx (Zod validation)

Without tests, regressions in upload state management, error handling, and form validation can go undetected. The presigned URL integration (BUGF-032) added complex error scenarios (409 conflict, 429 rate limit, per-file validation) that need test coverage.

## Goal

Create comprehensive unit tests for untested upload components in app-instructions-gallery, focusing on integration points with @repo/upload package, presigned URL API mocking with MSW, and critical error handling scenarios. Achieve minimum 45% test coverage threshold.

## Non-Goals

**Out of Scope:**
- E2E testing of upload flow (split to BUGF-051)
- Backend API implementation (already complete in BUGF-031)
- Testing @repo/upload package components (already have 18 test files)
- Testing MocDetailDashboard display components (low priority, deferred)
- Real S3 upload testing (use MSW mocks per ADR-005)
- Session refresh API testing (API not implemented, blocked by BUGF-004)

**Protected Features:**
- Do NOT modify @repo/upload package tests (already comprehensive)
- Do NOT modify existing BUGF-032 tests (passing, ready for QA)

**Deferred Work:**
- MocDetailDashboard component tests (CoverCard, GalleryCard, etc.) - visual components, low test value
- Edit page route integration tests - covered by existing edit-page.test.tsx

## Scope

**App:** apps/web/app-instructions-gallery

**Components to Test:**

### Upload Flow Components (Medium Priority)
- `src/components/Uploader/SessionProvider/index.tsx` - Context provider for upload session state
- `src/components/Uploader/UploaderFileItem/index.tsx` - Individual file item with progress, retry, cancel
- `src/components/Uploader/UploaderList/index.tsx` - Grouped file list with aggregate progress

### Error Handling Components (High Priority)
- `src/components/Uploader/ConflictModal/index.tsx` - 409 conflict resolution dialog
- `src/components/Uploader/RateLimitBanner/index.tsx` - 429 rate limit countdown display
- `src/components/Uploader/SessionExpiredBanner/index.tsx` - Session expiry warning with refresh

### Upload Page Integration (High Priority)
- `src/pages/upload-page.tsx` - Main upload page with presigned URL integration (789 lines)

### Form Validation (Medium Priority)
- `src/components/MocEdit/EditForm.tsx` - MOC edit form with Zod validation (270 lines)
- `src/components/MocEdit/SlugField.tsx` - Slug generation and validation field
- `src/components/MocEdit/TagInput.tsx` - Tag input component

**Test Files to Create:**
- `src/components/Uploader/SessionProvider/__tests__/SessionProvider.test.tsx`
- `src/components/Uploader/UploaderFileItem/__tests__/UploaderFileItem.test.tsx`
- `src/components/Uploader/UploaderList/__tests__/UploaderList.test.tsx`
- `src/components/Uploader/ConflictModal/__tests__/ConflictModal.test.tsx`
- `src/components/Uploader/RateLimitBanner/__tests__/RateLimitBanner.test.tsx`
- `src/components/Uploader/SessionExpiredBanner/__tests__/SessionExpiredBanner.test.tsx`
- `src/pages/__tests__/upload-page.test.tsx`
- `src/components/MocEdit/__tests__/SlugField.test.tsx` (EditForm.test.tsx already exists from BUGF-032)
- `src/components/MocEdit/__tests__/TagInput.test.tsx`

**API Endpoints (for MSW Mocking):**
- `POST /api/v2/uploads/presigned-url` - Generate presigned S3 URL (from BUGF-031)
- `PUT https://s3.mock.com/bucket/*` - Mock S3 upload
- `POST /api/instructions/finalize` - Finalize upload session

## Acceptance Criteria

### Upload Flow Components

**AC-1: SessionProvider context provides session state correctly**
- GIVEN SessionProvider wraps a component tree
- WHEN the component tree renders
- THEN session state (files, status, progress) is accessible via context
- AND persisted session is restored on mount

**AC-2: SessionProvider restores persisted session on mount**
- GIVEN a persisted session exists in localStorage
- WHEN SessionProvider mounts
- THEN session state is restored from localStorage
- AND file upload progress is resumed

**AC-3: UploaderFileItem renders file info, progress, and status correctly**
- GIVEN a file upload in progress
- WHEN UploaderFileItem renders
- THEN file name, size, and MIME type are displayed
- AND progress bar shows upload percentage
- AND status icon indicates upload state (pending, uploading, complete, error)

**AC-4: UploaderFileItem handles cancel, retry, remove actions**
- GIVEN a file upload in various states
- WHEN user clicks cancel button
- THEN upload is cancelled and file status is updated
- WHEN user clicks retry button on failed upload
- THEN upload restarts from beginning
- WHEN user clicks remove button
- THEN file is removed from upload list

**AC-5: UploaderList groups files by category and shows aggregate progress**
- GIVEN multiple files in upload session
- WHEN UploaderList renders
- THEN files are grouped by category (instructions, thumbnails, covers)
- AND aggregate progress shows total upload percentage
- AND category sections are collapsible

### Error Handling Components

**AC-6: ConflictModal displays current title and allows new title input**
- GIVEN a 409 conflict response from finalize API
- WHEN ConflictModal renders
- THEN current title is displayed with conflict message
- AND new title input field is available
- AND submit button is disabled until new title differs from original

**AC-7: ConflictModal validates new title differs from original**
- GIVEN ConflictModal is open with original title
- WHEN user enters same title as original
- THEN validation error is displayed
- AND submit button remains disabled
- WHEN user enters different title
- THEN validation error clears
- AND submit button becomes enabled

**AC-8: RateLimitBanner displays countdown timer and retry button**
- GIVEN a 429 rate limit response with retryAfterSeconds
- WHEN RateLimitBanner renders
- THEN countdown timer displays remaining seconds
- AND retry button is disabled during countdown
- WHEN countdown reaches zero
- THEN retry button becomes enabled
- AND user can retry the upload

**AC-9: SessionExpiredBanner displays expired count and refresh action**
- GIVEN presigned URLs have expired (401/403 response)
- WHEN SessionExpiredBanner renders
- THEN count of expired files is displayed
- AND refresh button is available
- WHEN user clicks refresh
- THEN presigned URL API is called for expired files
- AND upload retries with new URLs

### Upload Page Integration

**AC-10: upload-page.tsx renders form with file upload buttons**
- GIVEN upload page loads
- WHEN page renders
- THEN file upload buttons for each category are displayed (instructions, thumbnails, cover)
- AND form fields for metadata are visible
- AND submit button is present

**AC-11: upload-page.tsx calls presigned URL API when files selected**
- GIVEN user selects files for upload
- WHEN files are added to upload manager
- THEN presigned URL API is called for each file with correct parameters (fileName, mimeType, fileSize, category)
- AND MSW mock returns presigned URL response
- AND file upload to S3 begins with presigned URL

**AC-12: upload-page.tsx handles presigned URL API errors (mocked with MSW)**
- GIVEN presigned URL API returns error (400, 500, network failure)
- WHEN upload is attempted
- THEN error message is displayed to user
- AND file status is updated to error state
- AND retry option is available

**AC-13: upload-page.tsx handles session expiry and refresh flow**
- GIVEN presigned URLs expire during upload
- WHEN S3 PUT returns 401/403
- THEN SessionExpiredBanner is displayed
- AND refresh action generates new presigned URLs
- AND upload retries with new URLs

**AC-14: upload-page.tsx handles finalize flow with 409/429 errors**
- GIVEN all files uploaded successfully
- WHEN user submits finalize request
- AND finalize API returns 409 conflict
- THEN ConflictModal is displayed with resolution options
- WHEN finalize API returns 429 rate limit
- THEN RateLimitBanner is displayed with countdown

### Form Validation

**AC-15: EditForm validates title (required, 3-120 chars)**
- GIVEN EditForm is rendered
- WHEN title field is empty
- THEN validation error "Title is required" is displayed
- WHEN title is < 3 chars
- THEN validation error "Title must be at least 3 characters" is displayed
- WHEN title is > 120 chars
- THEN validation error "Title must be at most 120 characters" is displayed

**AC-16: EditForm validates description (required, 10-2000 chars)**
- GIVEN EditForm is rendered
- WHEN description field is empty
- THEN validation error "Description is required" is displayed
- WHEN description is < 10 chars
- THEN validation error "Description must be at least 10 characters" is displayed
- WHEN description is > 2000 chars
- THEN validation error "Description must be at most 2000 characters" is displayed

**AC-17: EditForm detects form changes and enables save button**
- GIVEN EditForm is rendered with initial values
- WHEN user modifies any field
- THEN form dirty state is detected
- AND save button becomes enabled
- WHEN form is reset to original values
- THEN save button becomes disabled

**AC-18: SlugField validates slug format and uniqueness**
- GIVEN SlugField is rendered
- WHEN slug contains invalid characters (spaces, special chars)
- THEN validation error "Slug must contain only lowercase letters, numbers, and hyphens" is displayed
- WHEN slug format is valid
- THEN validation passes
- AND slug is accepted

**AC-19: TagInput validates tag count (max 10) and length (max 30 chars)**
- GIVEN TagInput is rendered
- WHEN user attempts to add 11th tag
- THEN validation error "Maximum 10 tags allowed" is displayed
- AND tag is not added
- WHEN tag length exceeds 30 chars
- THEN validation error "Tag must be at most 30 characters" is displayed
- AND tag is not added

### Accessibility

**AC-20: All upload components have proper ARIA labels and roles**
- GIVEN upload components render
- WHEN tested with screen reader
- THEN all buttons have aria-label attributes
- AND all form inputs have associated labels
- AND all interactive elements have proper roles

**AC-21: Error messages linked to inputs with aria-describedby**
- GIVEN form validation errors are present
- WHEN error messages render
- THEN error messages are linked to inputs via aria-describedby
- AND screen readers announce errors when inputs are focused

**AC-22: Upload progress announced to screen readers (aria-live)**
- GIVEN file upload is in progress
- WHEN upload progress updates
- THEN progress changes are announced via aria-live="polite"
- AND screen reader users receive progress updates without focus change

## Reuse Plan

### Components from @repo/upload

**Hooks (already tested in @repo/upload):**
- `useUploaderSession` - Session state management and persistence
- `useUploadManager` - Upload lifecycle and S3 integration
- `UnsavedChangesDialog` - Dialog for unsaved changes warning

**Components (already tested in @repo/upload):**
- ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog, UploaderFileItem, UploaderList

**Note:** App-specific components are thin wrappers around @repo/upload components. Tests should focus on integration points, not re-testing @repo/upload behavior.

### Test Patterns from @repo/upload

**MSW Setup:**
- Reuse MSW handlers from `packages/core/upload/src/__tests__/setup.ts`
- Mock presigned URL API responses (success + error cases)
- Mock S3 PUT requests (simulate upload to S3)

**File Upload State Mocking:**
- Reuse file upload simulation helpers from @repo/upload tests
- Mock File objects with correct MIME types and sizes
- Session restoration test patterns

**Error Scenario Testing:**
- 409 conflict response mocking
- 429 rate limit with retryAfterSeconds
- Per-file validation errors array
- Session expiry simulation (401/403 on S3 PUT)

### Test Patterns from BUGF-032

**RTK Query Mutation Testing:**
- Mock presigned URL API with MSW in EditForm.test.tsx
- Error handling test cases for status codes: 409, 429, 400, 500
- Mutation state assertions (isLoading, isError, isSuccess)

**Existing Test Setup:**
- Reuse test setup from `apps/web/app-inspiration-gallery/src/test/setup.ts`
- Standard MSW + DOM mocking configuration
- @repo/logger mocking (already configured)
- TanStack Router mocking (already configured)

## Architecture Notes

### Test Infrastructure

**Testing Framework:** Vitest + React Testing Library

**MSW Configuration:**
- Mock handlers for presigned URL API (`POST /api/v2/uploads/presigned-url`)
- Mock handlers for S3 PUT requests (`PUT https://s3.mock.com/bucket/*`)
- Mock handlers for finalize API (`POST /api/instructions/finalize`)

**Test File Structure:**
```
Component/
  index.tsx
  __tests__/
    Component.test.tsx
```

### Architecture Constraints (ADR-005)

**Unit Tests:**
- MUST use MSW for API mocking
- MUST mock S3 PUT requests (no real S3)
- MUST mock presigned URL API responses

**UAT Tests:**
- MUST use real services (no MSW mocking)
- MUST test against real S3 and backend

**E2E Tests:**
- Recommended but not required during dev phase
- E2E tests for upload flow split to BUGF-051

### Testing Strategy

**High Priority (Test First):**
1. upload-page.tsx integration tests - Core upload flow with presigned URL API, error handling, finalize
2. Error handling components - ConflictModal, RateLimitBanner, SessionExpiredBanner (complex error scenarios)

**Medium Priority:**
1. SessionProvider context tests - State management, persistence, restoration
2. Form validation tests - EditForm, SlugField, TagInput (Zod schema testing)

**Low Priority:**
1. UploaderFileItem/UploaderList tests - Thin wrappers around @repo/upload, low complexity

**Coverage Gaps (Deferred):**
- Session refresh flow (blocked by BUGF-004 - API not implemented)
- Real S3 interaction (intentionally excluded per ADR-005)
- MocDetailDashboard display components (low test value)

## Test Plan

### Test Setup

**MSW Request Handlers:**

```typescript
// Mock presigned URL generation
http.post('/api/v2/uploads/presigned-url', async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json({
    presignedUrl: `https://s3.mock.com/bucket/${body.fileName}`,
    key: `uploads/user-123/${body.fileName}`,
    expiresAt: Date.now() + 3600000,
  })
})

// Mock S3 PUT upload (success)
http.put('https://s3.mock.com/bucket/*', () => {
  return new HttpResponse(null, { status: 200 })
})

// Mock S3 PUT upload (expired URL - 403)
http.put('https://s3.mock.com/bucket/expired/*', () => {
  return new HttpResponse(null, { status: 403 })
})

// Mock finalize API (success)
http.post('/api/instructions/finalize', () => {
  return HttpResponse.json({ success: true })
})

// Mock finalize API (409 conflict)
http.post('/api/instructions/finalize', () => {
  return HttpResponse.json(
    { error: 'Conflict', message: 'Title already exists' },
    { status: 409 }
  )
})

// Mock finalize API (429 rate limit)
http.post('/api/instructions/finalize', () => {
  return HttpResponse.json(
    { error: 'Rate limit exceeded', retryAfterSeconds: 60 },
    { status: 429 }
  )
})
```

**Mock File Creation:**

```typescript
function createMockFile(
  name: string,
  type: string,
  size: number
): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

const mockPdfFile = createMockFile('instructions.pdf', 'application/pdf', 1024 * 1024)
const mockImageFile = createMockFile('cover.jpg', 'image/jpeg', 512 * 1024)
```

### Test Suites

**1. SessionProvider Tests** (`SessionProvider.test.tsx`)
- Test: Provides session state via context
- Test: Restores persisted session from localStorage on mount
- Test: Updates session state when files are added
- Test: Persists session to localStorage on state changes
- Test: Clears session on reset action

**2. UploaderFileItem Tests** (`UploaderFileItem.test.tsx`)
- Test: Renders file name, size, and MIME type
- Test: Shows progress bar with correct percentage
- Test: Displays status icon for each upload state (pending, uploading, complete, error)
- Test: Cancel button stops upload and updates status
- Test: Retry button restarts failed upload
- Test: Remove button removes file from list
- Test: ARIA labels present for all interactive elements

**3. UploaderList Tests** (`UploaderList.test.tsx`)
- Test: Groups files by category (instructions, thumbnails, covers)
- Test: Shows aggregate progress for all files
- Test: Category sections are collapsible
- Test: Empty state message when no files
- Test: Renders correct number of UploaderFileItem components

**4. ConflictModal Tests** (`ConflictModal.test.tsx`)
- Test: Displays current title in conflict message
- Test: New title input field is rendered
- Test: Submit button disabled when new title matches original
- Test: Validation error shown when new title matches original
- Test: Submit button enabled when new title differs from original
- Test: Calls onResolve callback with new title on submit
- Test: Calls onCancel callback when cancel button clicked
- Test: ARIA labels present for form inputs

**5. RateLimitBanner Tests** (`RateLimitBanner.test.tsx`)
- Test: Displays countdown timer with retryAfterSeconds
- Test: Countdown decrements every second (use vi.useFakeTimers)
- Test: Retry button disabled during countdown
- Test: Retry button enabled when countdown reaches zero
- Test: Calls onRetry callback when retry button clicked
- Test: ARIA live region announces countdown updates

**6. SessionExpiredBanner Tests** (`SessionExpiredBanner.test.tsx`)
- Test: Displays count of expired files
- Test: Refresh button is rendered
- Test: Calls onRefresh callback when refresh button clicked
- Test: Shows loading state during refresh
- Test: ARIA labels present for refresh button

**7. upload-page.tsx Tests** (`upload-page.test.tsx`)
- Test: Renders file upload buttons for each category
- Test: Renders form fields for metadata (title, description, tags)
- Test: Calls presigned URL API when files selected (MSW mock)
- Test: Initiates S3 upload with presigned URL
- Test: Displays error message when presigned URL API fails
- Test: Shows SessionExpiredBanner when S3 PUT returns 403
- Test: Calls finalize API when all files uploaded
- Test: Shows ConflictModal when finalize returns 409
- Test: Shows RateLimitBanner when finalize returns 429
- Test: ARIA labels present for all form inputs

**8. EditForm Tests** (existing file - add additional tests)
- Test: Validates title length (3-120 chars)
- Test: Validates description length (10-2000 chars)
- Test: Detects form changes and enables save button
- Test: Displays character count for title and description
- Test: Shows validation errors with aria-describedby

**9. SlugField Tests** (`SlugField.test.tsx`)
- Test: Validates slug format (lowercase, numbers, hyphens only)
- Test: Shows validation error for invalid characters
- Test: Auto-generates slug from title
- Test: Allows manual slug editing
- Test: ARIA labels present for slug input

**10. TagInput Tests** (`TagInput.test.tsx`)
- Test: Validates max 10 tags
- Test: Shows validation error when adding 11th tag
- Test: Validates tag length (max 30 chars)
- Test: Shows validation error for tag > 30 chars
- Test: Allows tag removal
- Test: Displays tag chips with remove buttons
- Test: ARIA labels present for tag input and remove buttons

### Accessibility Testing

**Screen Reader Announcements:**
- Upload progress changes announced via `aria-live="polite"`
- Error messages linked to inputs via `aria-describedby`
- Form validation errors announced when input focused

**Keyboard Navigation:**
- All interactive elements accessible via keyboard
- Tab order follows visual flow
- Enter key submits forms
- Escape key closes modals

**ARIA Attributes:**
- All buttons have `aria-label` attributes
- All form inputs have associated `<label>` elements
- Error messages use `role="alert"` or `aria-live`
- Progress bars use `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

### Error Scenario Testing

**409 Conflict:**
- Mock finalize API with 409 status
- Verify ConflictModal renders with current title
- Test resolution flow (new title input, submit)

**429 Rate Limit:**
- Mock finalize API with 429 status and retryAfterSeconds
- Verify RateLimitBanner renders with countdown
- Test countdown timer (use vi.useFakeTimers)
- Test retry button becomes enabled after countdown

**Session Expiry:**
- Mock S3 PUT with 403 status
- Verify SessionExpiredBanner renders
- Test refresh flow (calls presigned URL API, retries upload)

**Per-File Validation Errors:**
- Mock finalize API with fileErrors array
- Verify error messages displayed for affected files
- Test file-specific error handling

**Network Failures:**
- Mock presigned URL API with network error
- Mock S3 PUT with network error
- Verify error messages displayed
- Test retry functionality

### Coverage Goals

**Target Coverage:**
- Minimum 45% global coverage (per CLAUDE.md)
- Upload components: 70%+ coverage (high priority)
- Form components: 60%+ coverage (medium priority)
- Error handling components: 80%+ coverage (complex error scenarios)

**Coverage Report:**
- Run `pnpm test:coverage` to generate coverage report
- Check coverage for app-instructions-gallery specifically
- Identify remaining untested code paths

## UI/UX Notes

### Accessibility Requirements

**Form Validation Feedback:**
- Real-time validation feedback for all form fields
- Character count displays for title (120 chars max) and description (2000 chars max)
- Validation errors appear below inputs with clear messaging
- Error messages linked to inputs via `aria-describedby`

**Upload Progress Feedback:**
- Visual progress bars for individual files and aggregate progress
- Status icons for each upload state (pending, uploading, complete, error)
- Screen reader announcements for progress changes via `aria-live="polite"`
- Accessible labels for all upload actions (cancel, retry, remove)

**Error State Messaging:**
- ConflictModal: Clear explanation of conflict with current title displayed
- RateLimitBanner: Countdown timer with minutes:seconds format
- SessionExpiredBanner: Count of expired files and clear refresh action
- All error states include recovery actions (retry, refresh, resolve)

**Keyboard Navigation:**
- All file upload buttons accessible via keyboard
- Tab order follows visual flow: file upload buttons → form fields → submit button
- Modal dialogs trap focus (ConflictModal, UnsavedChangesDialog)
- Escape key closes modals
- Enter key submits forms

**Disabled State Messaging:**
- Submit button disabled states include clear messaging:
  - "No changes" when form is pristine
  - "Fix errors" when validation errors present
  - "Uploading..." when upload in progress
- Retry button in RateLimitBanner shows countdown instead of generic "disabled"

### Upload UX Patterns

**File Upload Buttons:**
- Clear labels for each category: "Upload Instructions (PDF)", "Upload Thumbnails (Images)", "Upload Cover Image"
- File type restrictions enforced at file picker level (accept attribute)
- Multiple file upload supported for instructions and thumbnails
- Single file upload for cover image

**Progress Display:**
- Individual file progress bars with percentage
- Aggregate progress bar showing total upload percentage
- File size displayed in human-readable format (KB, MB)
- Upload speed and estimated time remaining (optional enhancement)

**Error Recovery:**
- Retry button for failed uploads
- Cancel button to stop in-progress uploads
- Remove button to remove files from upload list
- Session restoration on page reload (resume interrupted uploads)

### Form UX Patterns

**Character Count Indicators:**
- Live character count for title and description fields
- Color coding: green (valid), yellow (approaching limit), red (over limit)
- Count format: "45 / 120 characters"

**Slug Field:**
- Auto-generates slug from title (lowercase, hyphens)
- Allows manual editing with format validation
- Real-time validation feedback for invalid characters

**Tag Input:**
- Chip-based tag display with remove buttons
- Input field for adding new tags
- Tag count indicator: "3 / 10 tags"
- Validation for tag length and count

## Dev Feasibility

### Technical Constraints

**MSW Mocking Required (ADR-005):**
- Presigned URL API calls must be mocked in unit tests
- S3 PUT requests must be mocked (no real S3 interaction)
- Finalize API calls must be mocked with error scenarios (409, 429)
- UAT tests use real services (not in scope for this story)

**Session Refresh Testing Blocked:**
- BUGF-004 (Session Refresh API) not yet implemented
- Session refresh tests deferred until API is available
- SessionExpiredBanner can test UI rendering without API integration

**E2E Tests Out of Scope:**
- E2E tests for upload flow split to BUGF-051
- Unit tests only in this story (per ADR-006, E2E optional for test stories)

### Implementation Notes

**Reuse @repo/upload Test Patterns:**
- MSW setup already configured in @repo/upload package
- File upload state mocking utilities available
- Session restoration test patterns can be reused
- Avoid reinventing mocks - focus on integration points

**Focus on Integration Points:**
- Test how app components integrate with @repo/upload hooks
- Test presigned URL API call parameters (fileName, mimeType, fileSize, category)
- Test error propagation from @repo/upload to app components
- Don't re-test @repo/upload behavior (already covered by 18 test files)

**Test Error Scenarios Thoroughly:**
- 409 conflict most critical (user needs resolution path)
- 429 rate limit second priority (countdown timer logic)
- Session expiry third priority (refresh flow)
- Per-file validation errors fourth priority (detailed error messaging)

**Use Existing Test Setup:**
- Reuse test setup from app-inspiration-gallery as template
- MSW + DOM mocking already configured
- @repo/logger mocking already configured
- TanStack Router mocking already configured

### Estimated Complexity

**Upload Page Integration: High**
- Complex flow with multiple API calls
- Multiple error paths to test (presigned URL, S3, finalize)
- Session state management integration
- Estimated effort: 3-4 hours

**Error Components: Medium**
- UI logic with countdown timers (RateLimitBanner)
- Form validation (ConflictModal)
- Refresh flow (SessionExpiredBanner)
- Estimated effort: 2-3 hours

**Form Validation: Medium**
- Zod schema testing with react-hook-form
- Character count validation
- Slug format validation
- Tag input validation
- Estimated effort: 2-3 hours

**SessionProvider: Low**
- Thin wrapper around @repo/upload hook
- Context provider testing pattern
- Session persistence testing
- Estimated effort: 1-2 hours

**UploaderFileItem/List: Low**
- Thin wrappers around @repo/upload components
- Mostly rendering tests
- Estimated effort: 1-2 hours

**Total Estimated Effort: 9-14 hours (approximately 2-3 days)**

### Risk Areas

**MSW Handler Configuration:**
- Multi-step flow (generate URL → upload to S3) requires careful MSW setup
- Need to mock both presigned URL API and S3 PUT requests
- Risk: MSW handlers not matching actual API contract
- Mitigation: Reference BUGF-032 test implementation for correct patterns

**File Upload Simulation:**
- Creating mock File objects with correct MIME types and sizes
- Simulating upload progress events
- Risk: Mock files don't match real file behavior
- Mitigation: Use @repo/upload test utilities for file mocking

**Timer Testing:**
- RateLimitBanner countdown requires vi.useFakeTimers
- Need to advance timers correctly in tests
- Risk: Flaky tests due to timer timing issues
- Mitigation: Use vi.useFakeTimers() and vi.advanceTimersByTime() correctly

**Session Persistence:**
- Testing localStorage interaction for session restoration
- Need to mock localStorage in test environment
- Risk: localStorage mocking doesn't match browser behavior
- Mitigation: Use existing test setup from @repo/upload for localStorage mocking

**Form Validation:**
- react-hook-form integration with Zod schemas
- Need to trigger validation correctly in tests
- Risk: Validation not triggered in test environment
- Mitigation: Use waitFor() and userEvent.type() to trigger validation properly

### Dependencies

**Internal Dependencies:**
- @repo/upload package (already exists with comprehensive tests)
- @repo/api-client RTK Query mutations (already tested in BUGF-032)
- @repo/logger (mocking already configured)

**External Dependencies:**
- Vitest (already configured)
- React Testing Library (already configured)
- MSW (already configured)
- @testing-library/user-event (for user interactions)

**Blocked By:**
- BUGF-004 (Session Refresh API) - Session refresh tests deferred
- No other blockers

**Blocks:**
- No stories blocked by this story

## Reality Baseline

**Baseline Date:** 2026-02-11

**Baseline Source:** Story seed generated from codebase scanning and ADR analysis. No baseline reality file exists at expected path.

### Current State

**Test Coverage:**
- app-instructions-gallery: ~36% coverage (18 test files for 50 source files)
- @repo/upload: Comprehensive coverage (18 test files)
- BUGF-032 tests: 16 unit tests passing (RTK Query mutation tests)

**Untested Components:**
- Upload flow: SessionProvider, UploaderFileItem, UploaderList
- Error handling: ConflictModal, RateLimitBanner, SessionExpiredBanner
- Main page: upload-page.tsx (789 lines)
- Forms: SlugField, TagInput (EditForm partially tested from BUGF-032)

**Test Infrastructure:**
- MSW configured in @repo/upload package
- Standard test setup in app-inspiration-gallery (reusable template)
- @repo/logger mocking configured
- TanStack Router mocking configured

### Related Work

**BUGF-032 (ready-for-qa):**
- Frontend integration for presigned URL upload complete
- RTK Query mutation implemented and tested (16 unit tests)
- Error handling for 409, 429, 400, 500 status codes
- Session refresh handler implemented

**BUGF-031 (ready-to-work):**
- Backend API endpoint POST /api/uploads/presigned-url
- Generates presigned S3 URLs for file uploads
- Not yet implemented (ready-to-work status)

**BUGF-004 (backlog):**
- Session refresh API endpoint POST /api/uploads/refresh-session
- Required for session refresh flow testing
- Blocks session refresh tests (deferred in this story)

**BUGF-051 (ready-to-work):**
- E2E tests for presigned URL upload flow
- Playwright tests for happy path and error scenarios
- Split from BUGF-032 (E2E testing separate from unit testing)

### Architecture Decisions

**ADR-005: Testing Strategy - UAT Must Use Real Services**
- Unit tests MUST use MSW mocking for API calls
- Unit tests MUST NOT use real S3 or backend services
- UAT tests MUST use real services (not in scope for this story)

**ADR-006: E2E Tests Required in Dev Phase**
- E2E tests recommended but not required for test stories
- E2E tests for upload flow split to BUGF-051

**ADR-001: API Path Schema**
- Frontend uses /api/v2/uploads/* paths
- Backend uses /uploads/* paths
- Vite proxy rewrites /api/v2 → backend API

### Constraints

**Code Quality:**
- Minimum 45% global test coverage (per CLAUDE.md)
- Use semantic queries: getByRole, getByLabelText (not getByTestId)
- Component tests follow structure: Component/__tests__/Component.test.tsx

**MSW Mocking:**
- Presigned URL API mocked with MSW
- S3 PUT requests mocked with MSW
- Finalize API mocked with error scenarios (409, 429)

**Protected Features:**
- Do NOT modify @repo/upload package tests
- Do NOT modify existing BUGF-032 tests

**Deferred Work:**
- Session refresh tests (blocked by BUGF-004)
- E2E tests (split to BUGF-051)
- MocDetailDashboard component tests (low priority)

### Success Criteria

**Test Coverage:**
- app-instructions-gallery coverage ≥ 45%
- Upload components coverage ≥ 70%
- Error handling components coverage ≥ 80%
- Form components coverage ≥ 60%

**Quality Gates:**
- All 22 acceptance criteria pass
- All tests use semantic queries (no getByTestId)
- All tests use MSW for API mocking (no real services)
- Lint and type-check pass
- Coverage threshold met

**Deliverables:**
- 9 new test files created
- Minimum 100 test cases across all components
- Coverage report showing ≥45% for app-instructions-gallery
- All tests passing in CI

---

**Story Points:** 5 (estimated 9-14 hours / 2-3 days)

**Experiment Variant:** control

**Generated:** 2026-02-11T00:00:00Z

**Predictions:**
- split_risk: 0.3 (medium complexity, well-defined scope, reuse patterns available)
- review_cycles: 2 (test coverage stories typically require 1-2 review iterations)
- token_estimate: 120K (comprehensive test suite, multiple components, MSW setup)
- confidence: low (heuristics-only mode - no historical data available)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved
| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps found | N/A | 0 |

**Rationale**: All 22 ACs comprehensively cover the core testing journey. Test coverage strategy is MVP-complete for achieving 45% minimum threshold.

### Non-Blocking Items (Logged to KB)
| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | File path inconsistency: upload-page.tsx vs UploadPage.tsx | documentation | Clarify during implementation (15-min fix) |
| 2 | useUploadManager hook location ambiguity | documentation | Update AC-11 reference to @repo/upload during implementation |
| 3 | finalizeClient path ambiguity | documentation | Update AC-14 reference to @repo/upload during implementation |
| 4 | EditForm test coverage clarification (new vs existing tests) | scope-clarification | Verify existing EditForm tests and focus on new cases (5-min verification) |
| 5 | Test count estimate (100 vs 120-140 cases) | estimation | Non-blocking; actual count determined during implementation |
| 6 | Session refresh API testing blocked by BUGF-004 | future-opportunity | Create BUGF-013-A once BUGF-004 API is implemented (2 points) |
| 7 | E2E tests split to BUGF-051 | scope-boundary | Correct scoping decision; E2E tracked separately per ADR-006 |
| 8 | MocDetailDashboard component tests deferred | deferred | Low test value; defer until higher-priority coverage complete |
| 9 | Edit page route integration tests (existing coverage sufficient) | existing-coverage | Existing edit-page.test.tsx provides adequate coverage |
| 10 | Real S3 upload testing intentionally excluded | architectural-constraint | Correct per ADR-005; S3 testing belongs in UAT, not unit tests |
| 11 | Upload speed/time remaining display (optional enhancement) | future-opportunity | Create BUGF-013-B for visual regression (3 points) |
| 12 | Per-file validation error display testing limited | future-opportunity | Add explicit tests if finalize API returns detailed fileErrors |
| 13 | Visual regression testing enhancement | future-opportunity | Create BUGF-013-B (3 points) for Percy/Chromatic visual tests |
| 14 | Performance testing enhancement | future-opportunity | Create BUGF-013-C (3 points) for large file/stress testing |
| 15 | Real screen reader accessibility testing | future-opportunity | Create BUGF-013-D (2 points) for NVDA/JAWS/VoiceOver validation |
| 16 | Network error recovery testing | future-opportunity | Low priority; useful for mobile but not MVP-blocking |
| 17 | Character validation edge cases (emoji, Unicode) | future-opportunity | Low priority; basic length validation sufficient for MVP |
| 18 | Slug debouncing, MIME type, cancellation edge cases, form persistence, keyboard shortcuts (batch) | future-opportunity | Pool of low-priority enhancements for future iterations |

### Summary
- **ACs added**: 0
- **ACs modified**: 0
- **KB entries created**: 18
- **MVP-critical gaps**: 0
- **Non-blocking gaps**: 6
- **Enhancement opportunities**: 10
- **Out-of-scope items**: 5
- **Mode**: autonomous
- **Verdict**: PASS - Story ready for implementation without PM modifications
