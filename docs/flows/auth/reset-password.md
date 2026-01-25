---
title: Reset Password Flow
description: Complete password reset using verification code
status: active
feature: auth
entry-points:
  - /reset-password
related-stories: []
e2e-tests: []
created: 2026-01-25
last-verified: 2026-01-25
author: michael
tags:
  - authentication
  - core-flow
  - cognito
  - security
---

# Reset Password Flow

## Overview

Users complete their password reset by entering the verification code from email and choosing a new password. The flow includes password strength validation and auto-redirects to login on success.

## Prerequisites

- User should have requested a reset code via forgot password flow
- User must be logged out (guestOnly route guard)
- Email may be pre-filled from sessionStorage

## Flow Diagram

```mermaid
flowchart TD
    A[/reset-password] --> B{Email in sessionStorage?}

    B -->|Yes| C[Pre-fill email field]
    B -->|No| C

    C --> D(Fill reset form)
    D --> E{Form valid?}

    E -->|No| F[Show validation errors]
    F --> D

    E -->|Yes| G([authProvider.confirmResetPassword])
    G --> H{Response?}

    H -->|Success| I[(Clear sessionStorage)]
    I --> J[Show success screen]
    J --> K[Wait 3 seconds]
    K --> L[/login]

    H -->|CodeMismatchException| M[Show "invalid code" error]
    M --> D

    H -->|ExpiredCodeException| N[Show "code expired" error]
    N --> O(Click "Resend Code")
    O --> P([authProvider.forgotPassword])
    P --> D

    H -->|InvalidPasswordException| Q[Show password requirements]
    Q --> D
```

## Steps

1. User navigates to `/reset-password` (usually from forgot password flow)
2. Email field pre-filled if available in sessionStorage
3. User enters:
   - Email (if not pre-filled)
   - 6-digit verification code from email
   - New password
   - Confirm new password
4. Password strength indicator updates as user types
5. Frontend validates all fields
6. User clicks "Reset Password"
7. `authProvider.confirmResetPassword(email, code, newPassword)` called
8. **On success**:
   - Clear `pendingResetEmail` from sessionStorage
   - Show success screen with checkmark
   - Auto-redirect to `/login` after 3 seconds
9. **On error**:
   - Display specific error message
   - User can retry or resend code

## Form Validation

| Field | Rules | Error Message |
|-------|-------|---------------|
| Email | Valid email format | "Please enter a valid email address" |
| Code | Exactly 6 digits | "Please enter the 6-digit code" |
| Password | Min 8 chars | "Password must be at least 8 characters" |
| Password | Has uppercase | "Password must contain an uppercase letter" |
| Password | Has lowercase | "Password must contain a lowercase letter" |
| Password | Has number | "Password must contain a number" |
| Password | Has special char | "Password must contain a special character" |
| Confirm | Matches password | "Passwords do not match" |

## Password Strength Indicator

| Level | Criteria | Color |
|-------|----------|-------|
| 1 - Weak | < 8 chars | Red |
| 2 - Fair | 8+ chars | Orange |
| 3 - Good | + uppercase + lowercase | Yellow |
| 4 - Strong | + number | Light green |
| 5 - Very Strong | + special character | Green |

## Error States

| Error | Trigger | User Message | Recovery |
|-------|---------|--------------|----------|
| CodeMismatchException | Wrong code entered | "Invalid verification code. Please check and try again." | Re-enter correct code |
| ExpiredCodeException | Code older than 24h | "This code has expired. Please request a new one." | Click resend code |
| InvalidPasswordException | Doesn't meet requirements | "Password does not meet requirements" | Adjust password |
| LimitExceededException | Too many attempts | "Too many attempts. Please try again later." | Wait and retry |
| UserNotFoundException | Account doesn't exist | "No account found with this email." | Check email or register |

## Edge Cases

- **Direct navigation**: User can access without going through forgot password
- **Code already used**: Cognito rejects, user must request new code
- **Multiple codes**: Only latest code is valid
- **Session timeout**: User can still complete if they have valid code

## UX Gaps / TODOs

- [ ] No E2E test coverage
- [ ] No inline validation (only on submit)
- [ ] No password visibility toggle
- [ ] Resend code could show cooldown timer

## Related Flows

- [Forgot Password](./forgot-password.md) - Precedes this flow
- [Login](./login.md) - Destination after success

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Initial documentation |
