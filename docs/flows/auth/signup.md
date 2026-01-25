---
title: Signup Flow
description: New user registration with email verification
status: active
feature: auth
entry-points:
  - /register
related-stories: []
e2e-tests:
  - apps/web/playwright/features/auth/signup.feature
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

# Signup Flow

## Overview

New users register with name, email, and password. After successful registration, Cognito sends a verification code to the user's email. The user is then redirected to verify their email before gaining full access.

## Prerequisites

- User must not have an existing account with the same email
- User must be logged out (guestOnly route guard)

## Flow Diagram

```mermaid
flowchart TD
    A[/register page] --> B(Fill signup form)
    B --> C{Form valid?}

    C -->|No| D[Show validation errors]
    D --> B

    C -->|Yes| E([authProvider.signUp])
    E --> F{Cognito response?}

    F -->|Success| G[(Store email in sessionStorage)]
    G --> H[Show success message]
    H --> I[/auth/verify-email]

    F -->|UsernameExistsException| J[Show "email in use" error]
    J --> B

    F -->|InvalidPasswordException| K[Show password requirements]
    K --> B

    F -->|Error| L[Show error alert]
    L --> B

    I --> M[Email Verification Flow]
```

## Steps

1. User navigates to `/register`
2. User fills form:
   - Name (min 2 characters)
   - Email (valid format)
   - Password (min 8 chars, uppercase, lowercase, number)
   - Confirm password (must match)
   - Accept terms checkbox (required)
3. Frontend validates all fields with Zod schema
4. Password strength indicator shows current strength (5 levels)
5. User clicks "Create Account"
6. `authProvider.signUp({ name, email, password })` called
7. Cognito creates unconfirmed user, sends verification email
8. Email stored in `sessionStorage.pendingVerificationEmail`
9. Success message displayed with masked email
10. User redirected to `/auth/verify-email`

## Form Validation

| Field | Rules | Error Message |
|-------|-------|---------------|
| Name | Min 2 characters | "Name must be at least 2 characters" |
| Email | Valid email format | "Please enter a valid email address" |
| Password | Min 8 chars | "Password must be at least 8 characters" |
| Password | Has uppercase | "Password must contain an uppercase letter" |
| Password | Has lowercase | "Password must contain a lowercase letter" |
| Password | Has number | "Password must contain a number" |
| Confirm | Matches password | "Passwords do not match" |
| Terms | Must be checked | "You must accept the terms" |

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
| UsernameExistsException | Email already registered | "An account with this email already exists" | Login or use different email |
| InvalidPasswordException | Doesn't meet Cognito requirements | "Password does not meet requirements" | Adjust password |
| InvalidParameterException | Invalid email format | "Please enter a valid email address" | Fix email |
| LimitExceededException | Too many signups | "Too many attempts. Please try later" | Wait and retry |
| NetworkError | API unreachable | "Unable to connect. Please try again" | Check connection, retry |

## Edge Cases

- **Existing unverified account**: Cognito may resend verification code
- **AutoSignIn enabled**: After verification, user automatically signed in
- **Email case sensitivity**: Cognito normalizes to lowercase

## UX Gaps / TODOs

- [ ] No inline validation (only on submit)
- [ ] No password visibility toggle
- [ ] Social signup buttons shown but may not be fully implemented

## Related Flows

- [Email Verification](./email-verification.md) - Next step after signup
- [Login](./login.md) - For existing users

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-25 | michael | Initial documentation |
