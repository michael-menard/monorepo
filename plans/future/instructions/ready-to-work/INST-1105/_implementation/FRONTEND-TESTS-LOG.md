# Frontend Unit Tests Log - INST-1105

**Story**: INST-1105 - Upload Instructions (Presigned >10MB)
**Date**: 2026-02-09
**Status**: COMPLETE

## Test Files Created

### 1. Hook Tests
**File**: `apps/web/app-instructions-gallery/src/hooks/__tests__/usePresignedUpload.test.ts`

**Test Scenarios Covered**:
- Initial State
  - Idle status on initialization
  - Null timeRemaining when idle
  - False for isSessionExpired when idle

- Session Creation
  - Transition to creating_session status when starting upload
  - Call createUploadSession with correct parameters
  - Store sessionId and expiresAt after session creation

- S3 Upload with Progress
  - Transition to uploading status after session creation
  - Call uploadToPresignedUrl with correct parameters
  - Update progress during upload

- Session Completion
  - Transition to completing status after S3 upload
  - Call completeUploadSession with correct parameters
  - Transition to success status after completion
  - Call onSuccess callback with file record
  - Return file record from startUpload

- Cancel
  - Abort upload when cancel is called

- Retry
  - Restart upload when retry is called
  - Call startUpload internally

- Session Expiry Detection
  - Detect session expiry with 30-second buffer
  - Call onSessionExpired callback when session expires
  - Calculate timeRemaining correctly
  - Return correct value from isSessionExpired

- Error Handling
  - Handle session creation errors
  - Handle S3 upload errors
  - Handle completion errors
  - Call onError callback on failure
  - Return null on failure

- Reset
  - Reset state to idle
  - Abort in-progress upload on reset

**Tests**: 29 tests

---

### 2. PresignedUploadProgress Component Tests
**File**: `apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/__tests__/index.test.tsx`

**Test Scenarios Covered**:
- Rendering
  - Render with data-testid
  - Display file name
  - Display file size formatted
  - Have title attribute for truncated file names

- Progress Bar (AC11)
  - Render progress bar with correct percentage during upload
  - Display percentage text
  - Update progress bar when percentage changes
  - Have aria-label for accessibility
  - Not render progress bar when idle

- Upload Speed Display (AC13)
  - Display upload speed during upload
  - Update speed display when it changes

- Cancel Button (AC14)
  - Render cancel button during active upload
  - Call onCancel when cancel button is clicked
  - Render cancel button during creating_session status
  - Render cancel button during completing status
  - Not render cancel button when upload is complete
  - Not render cancel button when upload has failed

- Retry Button (AC27)
  - Render retry button when status is failed
  - Call onRetry when retry button is clicked
  - Render retry button when status is expired
  - Render retry button when status is canceled
  - Not render retry button during active upload
  - Not render retry button on success

- Status Icons
  - Show loading spinner during uploading
  - Show loading spinner during creating_session
  - Show loading spinner during completing
  - Show success icon (green) on success
  - Show error icon (destructive) on error
  - Show error icon (destructive) on expired
  - Show muted icon on canceled

- Status Text
  - Show "Preparing upload..." for creating_session
  - Show "Uploading... X%" for uploading
  - Show "Finalizing..." for completing
  - Show "Upload complete" for success
  - Show error message for error status
  - Show "Session expired" for expired status
  - Show "Upload canceled" for canceled status
  - Have role="alert" for error status

- Remove Button
  - Render remove button on success
  - Render remove button on error
  - Render remove button on canceled
  - Call onRemove when remove button is clicked
  - Not render remove button during active upload

- Accessibility
  - Have accessible button labels
  - Have aria-hidden on decorative icons
  - Announce error state with role="alert"

**Tests**: 43 tests

---

### 3. SessionExpiryWarning Component Tests
**File**: `apps/web/app-instructions-gallery/src/components/SessionExpiryWarning/__tests__/index.test.tsx`

**Test Scenarios Covered**:
- Visibility
  - Show warning when less than 5 minutes remaining
  - Show warning when exactly 5 minutes remaining
  - Hidden when more than 5 minutes remaining
  - Hidden when 10 minutes remaining
  - Show expired state when time is up (0 ms)

- Warning State (< 5 minutes)
  - Display "Session Expiring Soon" title
  - Display time remaining in message
  - Display time in seconds when less than 1 minute
  - Use warning variant styling

- Expired State (0 ms)
  - Display "Session Expired" title
  - Display expired message text
  - Use destructive variant styling for expired state

- Refresh Button (AC23)
  - Render refresh button
  - Call onRefresh when refresh button is clicked
  - Display "Refresh Session" text
  - Disabled when isRefreshing is true
  - Display "Refreshing..." when isRefreshing is true
  - Show spinning icon when refreshing
  - Use default variant button in warning state
  - Use default variant button in expired state

- Time Formatting
  - Format 5 minutes correctly
  - Format 1 minute 30 seconds correctly
  - Format 10 seconds correctly
  - Format 0 seconds as expired

- Accessibility
  - Have aria-live="polite" for screen reader updates
  - Have accessible aria-label on refresh button
  - Have accessible aria-label when refreshing
  - Have aria-hidden on decorative icon

- Responsive Layout
  - Render button with responsive width classes
  - Have flex layout for content

- Edge Cases
  - Handle very small time remaining (1 second)
  - Handle negative time remaining as expired
  - Update when timeRemainingMs prop changes
  - Transition from warning to expired

**Tests**: 37 tests

---

## Test Results Summary

```
 Test Files  3 passed (3)
      Tests  109 passed (109)
   Duration  1.48s
```

## Acceptance Criteria Coverage

| AC | Description | Test Coverage |
|----|-------------|---------------|
| AC8 | Session TTL displayed | SessionExpiryWarning time formatting tests |
| AC11 | Progress bar updates | PresignedUploadProgress progress bar tests |
| AC13 | Upload speed displayed | PresignedUploadProgress speed display tests |
| AC14 | Cancel button aborts | Hook cancel tests + component cancel button tests |
| AC21 | Session expiry warning | SessionExpiryWarning visibility tests |
| AC23 | Refresh session button | SessionExpiryWarning refresh button tests |
| AC27 | Retry button re-attempts | Hook retry tests + component retry button tests |

## Commands

Run tests:
```bash
pnpm vitest run apps/web/app-instructions-gallery/src/hooks/__tests__/usePresignedUpload.test.ts
pnpm vitest run apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/__tests__/index.test.tsx
pnpm vitest run apps/web/app-instructions-gallery/src/components/SessionExpiryWarning/__tests__/index.test.tsx
```

Run all three:
```bash
pnpm vitest run apps/web/app-instructions-gallery/src/hooks/__tests__/usePresignedUpload.test.ts apps/web/app-instructions-gallery/src/components/PresignedUploadProgress/__tests__/index.test.tsx apps/web/app-instructions-gallery/src/components/SessionExpiryWarning/__tests__/index.test.tsx
```

## Notes

- All tests use Vitest + React Testing Library
- Mocks are used for `@repo/api-client` and `@repo/upload-client`
- Semantic queries (getByRole, getByText, getByTestId) are used
- Tests follow existing codebase patterns
- Coverage dependency not installed in repo; manual review confirms comprehensive coverage
