---
title: Email Verification Flow
description: Verify email address after signup using 6-digit code
status: active
feature: auth
entry-points:
  - /auth/verify-email
related-stories: []
e2e-tests:
  - apps/web/playwright/features/auth/email-verification.feature
  - apps/web/playwright/features/auth/account-creation-e2e.feature
created: 2026-01-25
last-verified: 2026-01-25
author: michael
tags:
  - authentication
  - core-flow
  - cognito
  - onboarding
---

# Email Verification Flow

## Overview

After signup, users must verify their email by entering a 6-digit code sent to their inbox. The flow includes resend functionality with exponential backoff to prevent abuse. Successful verification triggers auto-signin and redirects to the dashboard.

## Prerequisites

- User must have just signed up (email in sessionStorage)
- User must be logged out (guestOnly route guard)
- Verification code must be sent to email

## Flow Diagram

```mermaid
flowchart TD
    A[/auth/verify-email] --> B{Email in sessionStorage?}

    B -->|No| C[/register]

    B -->|Yes| D[Display masked email]
    D --> E(Enter 6-digit code)

    E --> F([authProvider.confirmSignUp])
    F --> G{Response?}

    G -->|Success| H{AutoSignIn?}
    H -->|Success| I[(Update auth state)]
    I --> J[/dashboard]

    H -->|Failure| K[Show success message]
    K --> L[Wait 3 seconds]
    L --> M[/login]

    G -->|CodeMismatchException| N[Show "invalid code" error]
    N --> E

    G -->|ExpiredCodeException| O[Show "code expired" error]
    O --> P(Click resend)

    P --> Q{Cooldown active?}
    Q -->|Yes| R[Show countdown timer]
    R --> P

    Q -->|No| S([authProvider.resendCode])
    S --> T[Reset cooldown]
    T --> E
```

## Steps

1. User arrives at `/auth/verify-email` after signup
2. System checks for `pendingVerificationEmail` in sessionStorage
3. If no email found, redirect to `/register`
4. Email displayed in masked format (e.g., `m***l@example.com`)
5. User enters 6-digit code from email into OTP input
6. `authProvider.confirmSignUp(email, code)` called
7. **On success**:
   - Clear `pendingVerificationEmail` from sessionStorage
   - Attempt auto-signin
   - If auto-signin succeeds: redirect to `/dashboard`
   - If auto-signin fails: show success, redirect to `/login` after 3s
8. **On error**:
   - Display error message
   - User can retry or resend code

## OTP Input Behavior

| Action | Behavior |
|--------|----------|
| Type digit | Move to next input |
| Paste code | Fill all inputs, submit if complete |
| Backspace | Clear current, move to previous |
| Arrow keys | Navigate between inputs |
| Non-digit | Ignored |

## Resend Code Logic

Exponential backoff prevents abuse:

| Attempt | Cooldown |
|---------|----------|
| 1 | 60 seconds |
| 2 | 120 seconds |
| 3 | 240 seconds |
| 4 | 480 seconds |
| 5+ | 600 seconds (max) |

- Attempts reset after 30 minutes of inactivity
- Cooldown stored in sessionStorage: `auth_resend_cooldown`
- Attempt count stored: `auth_resend_attempts`

## Error States

| Error | Trigger | User Message | Recovery |
|-------|---------|--------------|----------|
| CodeMismatchException | Wrong code entered | "Invalid verification code. Please try again." | Re-enter correct code |
| ExpiredCodeException | Code older than 24h | "This code has expired. Please request a new one." | Click resend |
| LimitExceededException | Too many attempts | "Too many attempts. Please try again later." | Wait and retry |
| UserNotFoundException | Account deleted | "No account found with this email." | Re-register |

## Edge Cases

- **User refreshes page**: Email preserved in sessionStorage
- **User navigates away**: Can return if email still in sessionStorage
- **Multiple tabs**: Only one verification needed, others will sync
- **Code already used**: Cognito rejects duplicate confirmations

## UX Gaps / TODOs

- [ ] No visual feedback during code submission
- [ ] No "check spam folder" hint
- [ ] Resend button could show remaining attempts

## Related Flows

- [Signup](./signup.md) - Precedes this flow
- [Login](./login.md) - Fallback if auto-signin fails

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Initial documentation |
