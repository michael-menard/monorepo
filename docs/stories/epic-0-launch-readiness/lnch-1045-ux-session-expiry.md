# Story lnch-1045: Session Expiry & Re-auth UX

## Status

Draft

## Story

**As a** user whose session expires,
**I want** a graceful re-authentication flow,
**so that** I don't lose my work and can continue seamlessly.

## Epic Context

This is **Story 7 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **High** - Poor experience leads to data loss and frustration.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- lnch-1022: Cognito User Management Runbook (auth infrastructure)

## Related Stories

- lnch-1022: Cognito User Management Runbook (auth management)
- lnch-1040: Error Messages (401 error handling)

## Acceptance Criteria

1. Expired sessions show clear message (not cryptic error)
2. Users are prompted to re-login without losing context
3. Unsaved changes are preserved during re-auth (when possible)
4. Automatic token refresh prevents most expirations
5. Re-auth redirects back to original page
6. Long-running uploads handle expiration gracefully
7. "Remember me" option extends session

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Expiration Behavior** (AC: 1)
  - [ ] Test what happens when JWT expires
  - [ ] Document current error messages
  - [ ] Identify pain points

- [ ] **Task 2: Implement Clear Messaging** (AC: 1)
  - [ ] "Your session has expired"
  - [ ] Explain what to do
  - [ ] Remove technical jargon

- [ ] **Task 3: Implement Re-Auth Modal** (AC: 2)
  - [ ] Show modal instead of redirect
  - [ ] Allow login in modal
  - [ ] Close modal and continue

- [ ] **Task 4: Preserve State** (AC: 3)
  - [ ] Store form data before re-auth
  - [ ] Restore after successful login
  - [ ] Handle edge cases (long timeout)

- [ ] **Task 5: Implement Token Refresh** (AC: 4)
  - [ ] Automatic refresh before expiry
  - [ ] Refresh on API 401 response
  - [ ] Handle refresh failures

- [ ] **Task 6: Implement Return URL** (AC: 5)
  - [ ] Store current URL on expiry
  - [ ] Redirect after login
  - [ ] Handle deep links

- [ ] **Task 7: Handle Upload Expiration** (AC: 6)
  - [ ] Pause upload on expiry
  - [ ] Resume after re-auth
  - [ ] Don't lose upload progress

## Dev Notes

### Current Cognito Token Behavior
- Access token: 1 hour expiry
- Refresh token: 30 days expiry (configurable)
- ID token: 1 hour expiry

### Token Refresh Pattern
```typescript
// In RTK Query baseQuery
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    // Try to refresh
    const refreshResult = await refreshTokens()

    if (refreshResult.success) {
      // Retry original request
      result = await baseQuery(args, api, extraOptions)
    } else {
      // Show re-auth modal
      api.dispatch(showReAuthModal())
    }
  }

  return result
}
```

### Re-Auth Modal
```tsx
<Dialog open={showReAuth}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Session Expired</DialogTitle>
      <DialogDescription>
        Please log in again to continue.
      </DialogDescription>
    </DialogHeader>
    <LoginForm
      onSuccess={() => {
        setShowReAuth(false)
        // Continue where user left off
      }}
    />
  </DialogContent>
</Dialog>
```

### State Preservation
```typescript
// Before showing re-auth modal
const pendingState = {
  formData: getCurrentFormData(),
  returnUrl: window.location.href,
  timestamp: Date.now()
}
sessionStorage.setItem('pendingState', JSON.stringify(pendingState))

// After successful re-auth
const pending = sessionStorage.getItem('pendingState')
if (pending) {
  const { formData, returnUrl } = JSON.parse(pending)
  // Restore form and navigate
}
```

## Testing

### Test Requirements
- Unit: Token refresh logic
- Integration: 401 triggers re-auth
- E2E: Full re-auth flow preserves state
- E2E: Upload survives re-auth

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
