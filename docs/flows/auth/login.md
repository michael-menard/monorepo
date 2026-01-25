---
title: Login Flow
description: User authentication via email and password with MFA support
status: active
feature: auth
entry-points:
  - /login
related-stories: []
e2e-tests:
  - apps/web/playwright/features/auth/login.feature
created: 2026-01-25
last-verified: 2026-01-25
author: michael
tags:
  - authentication
  - core-flow
  - cognito
---

# Login Flow

## Overview

Users authenticate via email and password using AWS Cognito. The flow supports MFA challenges (SMS, Email, TOTP) and handles forced password changes. Successful login redirects to the dashboard or a specified return URL.

## Prerequisites

- User must have an existing, verified account
- User must be logged out (guestOnly route guard)

## Flow Diagram

```mermaid
flowchart TD
    A[/login page] --> B(Enter email & password)
    B --> C([authProvider.signIn])
    C --> D{Response?}

    D -->|isSignedIn=true| E[(checkAuthState)]
    E --> F[(Update Redux + tokens)]
    F --> G{Redirect param?}
    G -->|Yes| H[/redirect URL]
    G -->|No| I[/dashboard]

    D -->|MFA Challenge| J{Challenge type?}
    J -->|SMS/Email/TOTP| K[/auth/otp-verification]
    J -->|New password| L[/auth/new-password]

    D -->|Error| M[Show error alert]
    M --> B

    K --> N(Enter 6-digit code)
    N --> O([authProvider.confirmSignIn])
    O --> P{Valid?}
    P -->|Yes| E
    P -->|No| Q[Show error]
    Q --> N

    L --> R(Enter new password)
    R --> S([authProvider.confirmSignIn])
    S --> E
```

## Steps

1. User navigates to `/login` (may have `?redirect=` or `?expired=1` params)
2. If `expired` param present, toast notification shown: "Session expired"
3. User enters email and password
4. Frontend validates: email format, password min 8 chars
5. User clicks "Sign In"
6. `authProvider.signIn({ email, password })` called
7. **On success (isSignedIn=true)**:
   - `checkAuthState()` retrieves user data
   - Redux state updated with user and tokens
   - Token manager initialized for auto-refresh
   - Redirect to `redirect` param or `/dashboard`
8. **On MFA challenge**:
   - Challenge stored in AuthProvider state
   - Redirect to `/auth/otp-verification` or `/auth/new-password`
9. **On error**:
   - Error displayed in alert component
   - User can retry

## Error States

| Error | Trigger | User Message | Recovery |
|-------|---------|--------------|----------|
| NotAuthorizedException | Wrong email/password | "Incorrect username or password" | Re-enter credentials |
| UserNotFoundException | Account doesn't exist | "Incorrect username or password" | Register or check email |
| UserNotConfirmedException | Email not verified | "Please verify your email" | Redirect to verify-email |
| LimitExceededException | Too many attempts | "Too many attempts. Please try later" | Wait and retry |
| NetworkError | API unreachable | "Unable to connect. Please try again" | Check connection, retry |

## Edge Cases

- **Session expired redirect**: Protected routes set `?expired=1` when token refresh fails
- **Social sign-in**: Google, Facebook, Apple buttons trigger OAuth flows (separate implementation)
- **Remember me**: Checkbox present but not yet implemented
- **Cross-tab sync**: Amplify Hub syncs auth state across browser tabs

## UX Gaps / TODOs

- [ ] Remember me functionality not implemented
- [ ] No account lockout messaging (Cognito handles silently)
- [ ] Social sign-in flows need documentation

## Related Flows

- [Signup](./signup.md) - New user registration
- [Forgot Password](./forgot-password.md) - Password recovery
- [Email Verification](./email-verification.md) - Post-signup verification

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Initial documentation |
