# Story lnch-1040: Error Message Standardization

## Status

Draft

## Story

**As a** user,
**I want** clear and helpful error messages,
**so that** I understand what went wrong and how to fix it.

## Epic Context

This is **Story 2 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **Critical** - Directly impacts user experience during failures.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1047: 404 & Error Pages (error page design)
- lnch-1042: Loading States (transition from loading to error)
- lnch-1050: Success Feedback (opposite of error states)

## Acceptance Criteria

1. All API errors map to user-friendly messages
2. Error messages explain what went wrong
3. Error messages suggest next steps when possible
4. Technical details are hidden from users (logged for debugging)
5. Error toasts/banners use consistent styling
6. Network errors have specific messaging
7. Form validation errors are inline and clear

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Error Messages** (AC: 1, 4)
  - [ ] List all API error codes
  - [ ] Document current error handling
  - [ ] Identify missing user-friendly mappings

- [ ] **Task 2: Create Error Message Mapping** (AC: 1, 2)
  - [ ] Map each API error to user message
  - [ ] Create error message constants file
  - [ ] Include severity levels

- [ ] **Task 3: Add Action Suggestions** (AC: 3)
  - [ ] "Try again" for transient errors
  - [ ] "Contact support" for persistent issues
  - [ ] Specific fixes for validation errors

- [ ] **Task 4: Standardize Toast Component** (AC: 5)
  - [ ] Error toast styling (red/destructive)
  - [ ] Warning toast styling (yellow)
  - [ ] Success toast styling (green)
  - [ ] Consistent animation/duration

- [ ] **Task 5: Handle Network Errors** (AC: 6)
  - [ ] Offline detection
  - [ ] Timeout handling
  - [ ] "Check your connection" messaging

- [ ] **Task 6: Standardize Form Errors** (AC: 7)
  - [ ] Inline error display
  - [ ] Error icon indicators
  - [ ] Clear error on input change

- [ ] **Task 7: Remove Technical Details** (AC: 4)
  - [ ] Hide stack traces from UI
  - [ ] Log full errors to console (dev)
  - [ ] Log to structured logs (prod)

## Dev Notes

### Error Message Mapping

| API Error | User Message | Action |
|-----------|--------------|--------|
| 400 - Validation | "Please check your input" | Show field errors |
| 401 - Unauthorized | "Please log in to continue" | Redirect to login |
| 403 - Forbidden | "You don't have permission" | None |
| 404 - Not Found | "We couldn't find that" | Go back |
| 409 - Conflict | "This was modified by someone else" | Refresh |
| 429 - Rate Limit | "Too many requests. Please wait." | Wait |
| 500 - Server Error | "Something went wrong. Try again." | Retry |
| Network Error | "Check your internet connection" | Retry |
| Timeout | "Request timed out. Try again." | Retry |

### Error Message Constants
```typescript
// packages/core/api-client/src/errors.ts
export const ErrorMessages = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You don\'t have permission to do this.',
  NOT_FOUND: 'We couldn\'t find what you\'re looking for.',
  CONFLICT: 'This was modified. Please refresh and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
  NETWORK_ERROR: 'Check your internet connection.',
  TIMEOUT: 'The request timed out. Please try again.',
}
```

### Toast Usage
```tsx
import { toast } from '@repo/ui'

// Error toast
toast.error({
  title: 'Upload Failed',
  description: ErrorMessages.SERVER_ERROR,
  action: { label: 'Retry', onClick: retryUpload },
})
```

## Testing

### Test Requirements
- Unit: Error mapping function tests
- Integration: API error triggers correct toast
- E2E: Various error scenarios display correctly

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
