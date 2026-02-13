---
title: Password Reset Rate Limiting - Implementation Guide
description: Comprehensive guide for implementing rate limiting in password reset flows
status: active
feature: auth
story: BUGF-027
created: 2026-02-11
last-verified: 2026-02-11
author: claude
tags:
  - authentication
  - rate-limiting
  - security
  - cognito
  - implementation-guide
---

# Password Reset Rate Limiting - Implementation Guide

## Overview

This guide provides comprehensive specifications for implementing rate limiting feedback in password reset flows (`forgotPassword` and `confirmResetPassword` operations). It covers Cognito's rate limiting behavior, frontend state management patterns, UI/UX requirements, component reuse strategies, architectural boundaries, and testing approaches.

**Target Audience**: Frontend engineers implementing password reset UX improvements (see [BUGF-019](../../plans/future/bug-fix/ready-to-work/BUGF-019/BUGF-019.md))

**Related Documentation**:
- [Forgot Password Flow](../flows/auth/forgot-password.md)
- [Reset Password Flow](../flows/auth/reset-password.md)
- [Authentication System Architecture](../architecture/authentication-system.md)

---

## Table of Contents

1. [Cognito Rate Limiting Behavior](#1-cognito-rate-limiting-behavior)
2. [Frontend State Management](#2-frontend-state-management)
3. [UI/UX Patterns](#3-uiux-patterns)
4. [Component Reuse Strategy](#4-component-reuse-strategy)
5. [Architectural Boundaries](#5-architectural-boundaries)
6. [Testing Strategy](#6-testing-strategy)

---

## 1. Cognito Rate Limiting Behavior

### 1.1 Overview

AWS Cognito enforces service-level rate limiting on authentication operations to prevent abuse. The application does not implement additional backend rate limiting for password reset operations, as they are managed entirely by Cognito via the Amplify SDK.

### 1.2 Rate Limit Thresholds

Cognito rate limits are **AWS-managed** and not configurable at a fine-grained level. The exact thresholds are not publicly documented, but empirical testing suggests:

| Operation | Approximate Limit | Window |
|-----------|------------------|--------|
| `forgotPassword` | ~5 requests | Per IP per minute |
| `confirmResetPassword` | ~5 attempts | Per user per minute |

**Note**: These are approximate values based on testing. Actual limits may vary by Cognito User Pool configuration and AWS service quotas.

### 1.3 Error Response Format

When rate limiting is triggered, Cognito returns a `LimitExceededException`:

```typescript
// Error structure from Amplify SDK
{
  name: "LimitExceededException",
  message: "Attempt limit exceeded, please try after some time.",
  $metadata: {
    httpStatusCode: 400,
    requestId: "...",
    // Note: NO Retry-After header provided by Cognito
  }
}
```

**Critical Difference from Backend Rate Limiting**:
- Cognito does **NOT** provide a `Retry-After` header
- Frontend must estimate cooldown duration using exponential backoff
- Backend rate limiting (see `apps/api/lego-api/middleware/rate-limit.ts`) **DOES** provide `Retry-After` header

### 1.4 Retry Behavior

Since Cognito does not indicate when to retry, the frontend must:
1. Track attempt count in sessionStorage
2. Calculate cooldown duration using exponential backoff
3. Enforce cooldown client-side before allowing retry
4. Display countdown timer to user

**Reference Implementation**: See `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` lines 23-31 for exponential backoff pattern.

---

## 2. Frontend State Management

### 2.1 SessionStorage Keys

Use the following keys to track password reset rate limiting state:

```typescript
// Key naming convention: auth:{operation}:{attribute}
const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
} as const

const CONFIRM_RESET_KEYS = {
  attempts: 'auth:confirmResetPassword:attempts',
  lastAttempt: 'auth:confirmResetPassword:lastAttempt',
  cooldownUntil: 'auth:confirmResetPassword:cooldownUntil',
} as const
```

### 2.2 Exponential Backoff Algorithm

Use exponential backoff with a maximum cap to calculate cooldown duration:

```typescript
/**
 * Calculate exponential backoff cooldown based on attempt number
 * Formula: base * 2^(attempt-1), capped at max
 * 
 * Progression: 60s → 120s → 240s → 480s → 600s (capped)
 */
const calculateCooldown = (
  attemptNumber: number,
  baseCooldown: number = 60,
  maxCooldown: number = 600,
): number => {
  if (attemptNumber <= 0) return baseCooldown
  const exponentialCooldown = baseCooldown * Math.pow(2, attemptNumber - 1)
  return Math.min(exponentialCooldown, maxCooldown)
}

// Example progression:
// Attempt 1: 60 * 2^0 = 60s (1 minute)
// Attempt 2: 60 * 2^1 = 120s (2 minutes)
// Attempt 3: 60 * 2^2 = 240s (4 minutes)
// Attempt 4: 60 * 2^3 = 480s (8 minutes)
// Attempt 5+: 600s (10 minutes - capped)
```

**Reference**: `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` lines 23-31

### 2.3 State Management Functions

#### 2.3.1 Get Cooldown Remaining

```typescript
const getCooldownRemaining = (cooldownKey: string): number => {
  const stored = sessionStorage.getItem(cooldownKey)
  if (!stored) return 0

  const expiresAt = parseInt(stored, 10)
  if (isNaN(expiresAt)) return 0

  const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
  return Math.max(0, remaining)
}
```

#### 2.3.2 Set Cooldown

```typescript
const setCooldown = (cooldownKey: string, seconds: number): void => {
  const expiresAt = Date.now() + seconds * 1000
  sessionStorage.setItem(cooldownKey, expiresAt.toString())
}
```

#### 2.3.3 Increment Attempt Count

```typescript
const incrementAttemptCount = (
  attemptKey: string,
  lastAttemptKey: string,
): number => {
  const stored = sessionStorage.getItem(attemptKey)
  const currentAttempts = stored ? parseInt(stored, 10) : 0
  const newAttempts = isNaN(currentAttempts) ? 1 : currentAttempts + 1

  sessionStorage.setItem(attemptKey, newAttempts.toString())
  sessionStorage.setItem(lastAttemptKey, Date.now().toString())

  return newAttempts
}
```

#### 2.3.4 Reset Attempts (After Successful Operation)

```typescript
const resetAttempts = (
  attemptKey: string,
  lastAttemptKey: string,
  cooldownKey: string,
): void => {
  sessionStorage.removeItem(attemptKey)
  sessionStorage.removeItem(lastAttemptKey)
  sessionStorage.removeItem(cooldownKey)
}
```

### 2.4 State Lifecycle Management

| Event | Action |
|-------|--------|
| LimitExceededException received | Increment attempts, calculate cooldown, start timer |
| Successful password reset | Reset all attempt counters and cooldown |
| Cooldown expires | Clear cooldown key, allow retry |
| Page refresh | Restore cooldown state from sessionStorage |
| Browser/tab closed | State cleared (sessionStorage ephemeral) |
| 30 minutes of inactivity | Optional: Reset attempts (see ResendCodeButton pattern) |

### 2.5 Integration with Forgot Password Page

**Target Integration Pattern for BUGF-019**

The following example shows the recommended implementation pattern for integrating rate limiting feedback into `ForgotPasswordPage.tsx`. This is the target state for BUGF-019.

**Note**: The current `ForgotPasswordPage.tsx` implementation (lines 89-125) shows basic error handling only, without the `RateLimitBanner` integration shown below.

Example integration in `ForgotPasswordPage.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/services/auth/AuthProvider'

const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
} as const

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [cooldownSeconds, setCooldownSeconds] = useState(() => 
    getCooldownRemaining(FORGOT_PASSWORD_KEYS.cooldownUntil)
  )

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      const remaining = getCooldownRemaining(FORGOT_PASSWORD_KEYS.cooldownUntil)
      setCooldownSeconds(remaining)
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const onSubmit = async (data: { email: string }) => {
    // Check cooldown before submission
    if (cooldownSeconds > 0) {
      setError('Please wait before trying again.')
      return
    }

    try {
      const result = await forgotPassword(data.email)

      if (result.success) {
        resetAttempts(
          FORGOT_PASSWORD_KEYS.attempts,
          FORGOT_PASSWORD_KEYS.lastAttempt,
          FORGOT_PASSWORD_KEYS.cooldownUntil,
        )
        setSuccess('Reset instructions sent!')
      } else if (result.error?.includes('LimitExceededException')) {
        // Handle rate limiting
        const attemptCount = incrementAttemptCount(
          FORGOT_PASSWORD_KEYS.attempts,
          FORGOT_PASSWORD_KEYS.lastAttempt,
        )
        const cooldown = calculateCooldown(attemptCount)
        setCooldown(FORGOT_PASSWORD_KEYS.cooldownUntil, cooldown)
        setCooldownSeconds(cooldown)
        setError('Too many attempts. Please wait before trying again.')
      }
    } catch (err: any) {
      if (err?.name === 'LimitExceededException') {
        const attemptCount = incrementAttemptCount(
          FORGOT_PASSWORD_KEYS.attempts,
          FORGOT_PASSWORD_KEYS.lastAttempt,
        )
        const cooldown = calculateCooldown(attemptCount)
        setCooldown(FORGOT_PASSWORD_KEYS.cooldownUntil, cooldown)
        setCooldownSeconds(cooldown)
        setError('Too many attempts. Please wait before trying again.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {cooldownSeconds > 0 && (
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={cooldownSeconds}
          onRetry={() => setCooldownSeconds(0)}
        />
      )}
      {/* Form fields */}
      <Button disabled={cooldownSeconds > 0}>
        Send Reset Instructions
      </Button>
    </form>
  )
}
```

---

## 3. UI/UX Patterns

### 3.1 When to Show RateLimitBanner vs Inline Error

| Scenario | Display Pattern | Rationale |
|----------|----------------|-----------|
| LimitExceededException on first occurrence | RateLimitBanner | Prominent, persistent, includes countdown |
| LimitExceededException on subsequent | Keep existing banner | Update countdown, avoid duplicate banners |
| Validation error (InvalidParameterException) | Inline error | Field-specific, dismissible |
| Network error | Inline Alert | Temporary, non-blocking |
| UserNotFoundException | Success message | Account enumeration prevention |

**Decision Rule**: Use `RateLimitBanner` for rate limiting errors; use inline `Alert` component for all other errors.

### 3.2 Countdown Timer Display Requirements

#### 3.2.1 Format Specification

```typescript
/**
 * Format seconds as MM:SS for countdown display
 * Examples: "2:30" (150s), "0:45" (45s), "10:00" (600s)
 */
function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Usage in component
<span>Try again in {formatCountdown(cooldownSeconds)}</span>
```

**Reference**: `packages/core/upload/src/components/RateLimitBanner/index.tsx` lines 17-21

**Note**: The actual RateLimitBanner component uses a function named `formatTime()`, but this guide defines `formatCountdown()` for clarity. Both serve the same purpose of formatting seconds as MM:SS.

#### 3.2.2 Update Frequency

- **Timer tick**: Update every 1000ms (1 second)
- **Screen reader announcement**: Every 30 seconds (avoid spam)
- **Visual update**: Every tick

### 3.3 Button Disable States During Cooldown

```typescript
<Button
  type="submit"
  disabled={cooldownSeconds > 0 || isSubmitting}
  aria-disabled={cooldownSeconds > 0 || isSubmitting}
  className={cn(
    'w-full',
    cooldownSeconds > 0 && 'cursor-not-allowed opacity-50'
  )}
>
  {cooldownSeconds > 0 
    ? `Wait ${formatCountdown(cooldownSeconds)}`
    : 'Send Reset Instructions'
  }
</Button>
```

**Requirements**:
- Set `disabled={true}` (prevents click)
- Set `aria-disabled="true"` (accessibility)
- Visual indicator: reduced opacity, cursor change
- Button text changes to show countdown

### 3.4 Accessibility Requirements

#### 3.4.1 ARIA Live Regions

```typescript
// RateLimitBanner component (reference implementation)
<div role="timer" aria-live="polite" className="sr-only">
  {canRetry
    ? 'Rate limit expired. You can now retry.'
    : `${remainingSeconds} seconds remaining until you can retry.`}
</div>
```

**Key attributes**:
- `role="timer"` - Identifies countdown semantics
- `aria-live="polite"` - Announces changes without interrupting
- `className="sr-only"` - Hidden visually, available to screen readers

**Reference**: `packages/core/upload/src/components/RateLimitBanner/index.tsx` lines 126-130

#### 3.4.2 Screen Reader Announcements

- **Initial error**: Announce immediately via `role="alert"`
- **Countdown updates**: Announce every 30 seconds (not every second)
- **Cooldown expired**: Announce "You can now retry"

Implementation pattern:

```typescript
const [lastAnnouncement, setLastAnnouncement] = useState(Date.now())

useEffect(() => {
  if (remainingSeconds > 0 && Date.now() - lastAnnouncement > 30000) {
    // Announce every 30 seconds
    setLastAnnouncement(Date.now())
  }
}, [remainingSeconds, lastAnnouncement])

// ARIA live region updates automatically when content changes
// but we throttle content changes to avoid announcement spam
const announcementText = useMemo(() => {
  if (remainingSeconds === 0) return 'You can now retry'
  // Round to nearest 30 seconds for announcements
  const roundedSeconds = Math.ceil(remainingSeconds / 30) * 30
  return `Approximately ${Math.ceil(roundedSeconds / 60)} minutes remaining`
}, [Math.floor(remainingSeconds / 30)])
```

#### 3.4.3 Prefers-Reduced-Motion Support

```typescript
// CSS for progress bar animation
<div
  className={cn(
    'h-full bg-destructive',
    'transition-all duration-1000 ease-linear',
    'motion-reduce:transition-none', // Disable animation
  )}
  style={{
    width: `${progress}%`,
  }}
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Rate limit countdown progress"
/>
```

**Requirements**:
- Countdown timer continues to function
- Progress bar animations disabled
- Smooth transitions disabled
- Static states still visible

**Reference**: `packages/core/upload/src/components/RateLimitBanner/index.tsx` lines 104-122

#### 3.4.4 Role="alert" for Error Messages

```typescript
<Alert variant="destructive" role="alert">
  <AlertCircle className="h-4 w-4" aria-hidden="true" />
  <AlertDescription>
    Too many attempts. Please try again later.
  </AlertDescription>
</Alert>
```

**Current implementation**: `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` lines 224-236

---

## 4. Component Reuse Strategy

### 4.1 Current RateLimitBanner Location

**Path**: `packages/core/upload/src/components/RateLimitBanner/index.tsx`

**Current Usage**: Upload flow rate limiting (429 responses from backend API)

**Props Contract**:
```typescript
// packages/core/upload/src/components/RateLimitBanner/__types__/index.ts
import { z } from 'zod'

export const RateLimitBannerPropsSchema = z.object({
  /** Whether the banner is visible */
  visible: z.boolean(),
  /** Seconds until retry is allowed */
  retryAfterSeconds: z.number(),
  /** Callback when retry is clicked */
  onRetry: z.any(),
  /** Callback when banner is dismissed (optional) */
  onDismiss: z.any().optional(),
})

export type RateLimitBannerProps = z.infer<typeof RateLimitBannerPropsSchema>
```

### 4.2 Recommended Move to App Component Library

**Recommendation**: Move `RateLimitBanner` to `packages/core/app-component-library/feedback/` for broader reuse across auth and upload flows.

**Rationale**:
- Currently scoped to upload package, but needed in auth flows
- Generic feedback component, not domain-specific
- Aligns with component library structure (feedback components)

**Migration Path**:
1. Copy `RateLimitBanner` to `packages/core/app-component-library/src/feedback/RateLimitBanner/`
2. Update import in upload package to use `@repo/app-component-library`
3. Add export to `packages/core/app-component-library/src/index.ts`:
   ```typescript
   export { RateLimitBanner } from './feedback/RateLimitBanner'
   export type { RateLimitBannerProps } from './feedback/RateLimitBanner/__types__'
   ```
4. Update all consumers to import from `@repo/app-component-library`
5. Remove original from upload package after migration complete

### 4.3 Adaptations Needed for Auth Flows

The existing `RateLimitBanner` is well-suited for auth flows, but consider these minor adaptations:

#### 4.3.1 Messaging Variations (Recommended Enhancement)

```typescript
// Current (upload context)
"Too many requests. Please wait {time} before retrying."

// Recommended (auth context)
"Too many password reset attempts. Please wait {time} before retrying."
```

**Note**: The current `RateLimitBanner` component (`packages/core/upload/src/components/RateLimitBanner/__types__/index.ts`) only supports 4 props: `visible`, `retryAfterSeconds`, `onRetry`, and `onDismiss`. The following is a recommended enhancement for BUGF-019:

**Proposed Enhancement for BUGF-019**: Add optional `message` and `title` props to override default text:

```typescript
// Recommended schema enhancement (not current implementation)
export const RateLimitBannerPropsSchema = z.object({
  visible: z.boolean(),
  retryAfterSeconds: z.number(),
  onRetry: z.any(),
  onDismiss: z.any().optional(),
  // Proposed: New prop for custom messaging
  message: z.string().optional(),
  // Proposed: Custom title
  title: z.string().optional().default('Rate Limit Exceeded'),
})
```

#### 4.3.2 Styling Variations

Current banner uses `variant="destructive"` (red, error tone). This is appropriate for both contexts.

**Optional Enhancement**: Add `variant` prop to support warning tone for non-critical rate limits:

```typescript
variant?: 'destructive' | 'warning'
```

#### 4.3.3 Dismiss Behavior

- **Upload flow**: Dismissible (user can continue browsing, come back later)
- **Auth flow**: Non-dismissible (user must wait to proceed with auth action)

**Implementation**: Make `onDismiss` optional (already supported):

```typescript
// Auth usage - no dismiss button
<RateLimitBanner
  visible={cooldownSeconds > 0}
  retryAfterSeconds={cooldownSeconds}
  onRetry={handleRetry}
  // onDismiss not provided = no dismiss button shown
/>

// Upload usage - dismissible
<RateLimitBanner
  visible={showBanner}
  retryAfterSeconds={cooldownSeconds}
  onRetry={handleRetry}
  onDismiss={() => setShowBanner(false)}
/>
```

### 4.4 Integration Points in Auth Pages

#### 4.4.1 ForgotPasswordPage Integration

```typescript
// apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx
import { RateLimitBanner } from '@repo/app-component-library'

export function ForgotPasswordPage() {
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  return (
    <Card>
      <CardContent>
        {/* Show banner above form when rate limited */}
        {cooldownSeconds > 0 && (
          <RateLimitBanner
            visible={true}
            retryAfterSeconds={cooldownSeconds}
            onRetry={() => {
              // Clear cooldown (will be re-enforced on submit if still limited)
              setCooldownSeconds(0)
            }}
            message="Too many password reset attempts. Please wait before retrying."
          />
        )}

        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <Button disabled={cooldownSeconds > 0}>
            Send Reset Instructions
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Placement**: Above form, below page header

#### 4.4.2 ResetPasswordPage Integration

```typescript
// apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx
import { RateLimitBanner } from '@repo/app-component-library'

export function ResetPasswordPage() {
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  return (
    <Card>
      <CardContent>
        {cooldownSeconds > 0 && (
          <RateLimitBanner
            visible={true}
            retryAfterSeconds={cooldownSeconds}
            onRetry={() => setCooldownSeconds(0)}
            message="Too many verification code attempts. Please wait before retrying."
          />
        )}

        <form onSubmit={handleSubmit}>
          {/* Email, code, password fields */}
          <Button disabled={cooldownSeconds > 0}>
            Reset Password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 4.5 Reference to shadcn Alert Primitive

`RateLimitBanner` is built on `@repo/app-component-library` `Alert` component, which wraps shadcn's Alert primitive:

```typescript
// Current import pattern (follows _primitives convention)
import { Alert, AlertDescription, AlertTitle } from '@repo/app-component-library'

// NOT this (avoid individual path imports per CLAUDE.md)
// import { Alert } from '@repo/app-component-library/_primitives/alert'
```

**Architecture**:
- `RateLimitBanner` = App-level feedback component
- `Alert` = Primitive component from shadcn
- Both exported from `@repo/app-component-library` barrel

**Reference**: `packages/core/upload/src/components/RateLimitBanner/index.tsx` line 11

---

## 5. Architectural Boundaries

### 5.1 Cognito-Managed vs Backend-Managed Rate Limiting

| Aspect | Cognito-Managed (Password Reset) | Backend-Managed (API Endpoints) |
|--------|----------------------------------|--------------------------------|
| **Enforcement Layer** | AWS Cognito service | Backend middleware (`rate-limit.ts`) |
| **Triggered By** | `forgotPassword`, `confirmResetPassword` | 401/403 responses from API |
| **Error Type** | `LimitExceededException` | `429 Too Many Requests` |
| **Retry-After Header** | ❌ No | ✅ Yes |
| **Configurable Threshold** | ❌ AWS-managed | ✅ Configurable (10 failures per 5 min) |
| **Storage** | N/A (service-level) | In-memory Map (Lambda instance) |
| **Cooldown Calculation** | Frontend estimates | Backend provides `retryAfter` |
| **Account Enumeration Risk** | Handled by frontend logic | N/A |
| **Example Implementation** | N/A (Cognito black box) | `apps/api/lego-api/middleware/rate-limit.ts` |

### 5.2 Why Backend API Endpoints Are Not Needed

Password reset operations (`forgotPassword`, `confirmResetPassword`) do **NOT** involve backend API endpoints. The flow is:

```
Frontend (Amplify SDK) → Cognito User Pool (Direct)
```

**Rationale (per ADR-004 "Cognito as Authoritative Auth Service")**:
- Cognito is the authoritative authentication service
- No backend proxy layer needed for Cognito operations
- Reduces latency and complexity
- Leverages Cognito's built-in security features

**Contrast with Backend-Managed Auth Operations**:

| Operation | Path | Rate Limiting |
|-----------|------|---------------|
| Password reset | Frontend → Cognito | Cognito-managed |
| Upload file | Frontend → Backend API | Backend-managed |
| Admin user actions | Frontend → Backend API | Backend-managed |

**Reference**:
- Backend rate limiting: `apps/api/lego-api/middleware/rate-limit.ts`
- Cognito-managed flow: `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` lines 67-106

### 5.3 ADR-004 Implications for Rate Limiting Strategy

**ADR-004: Cognito as Authoritative Auth Service** (referenced in `docs/workflow/phases.md`)

**Implications**:
1. **No Backend Proxy**: Password reset does not touch backend API
2. **Frontend Responsibility**: Frontend must handle Cognito rate limiting errors
3. **Client-Side Cooldown Tracking**: sessionStorage used for attempt tracking
4. **No Server-Side Session**: Cooldown state is ephemeral (browser session only)
5. **Security Trade-off**: Cooldown can be bypassed by clearing sessionStorage, but Cognito enforces service-level limit regardless

**Design Decision**: Client-side cooldown tracking provides UX feedback, but does not replace Cognito's enforcement. Users who bypass client-side cooldown will still be blocked by Cognito.

### 5.4 Security Considerations

#### 5.4.1 Account Enumeration Prevention

**Requirement**: Rate limit feedback must NOT leak account existence information.

**Implementation**:
```typescript
// CORRECT: Generic error message
if (result.error?.includes('LimitExceededException')) {
  setError('Too many attempts. Please wait before trying again.')
}

// WRONG: Reveals account existence
if (result.error?.includes('LimitExceededException')) {
  setError('This account has been temporarily locked due to too many reset attempts.')
}
```

**Current Implementation**: `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` lines 78-88, 112-120

- Always show success message for `UserNotFoundException`
- Generic error for rate limiting
- No indication whether email exists

**Reference**: [Forgot Password Flow - Security Considerations](../flows/auth/forgot-password.md#security-considerations)

#### 5.4.2 Rate Limit Feedback Security

| Feedback Type | Safe? | Rationale |
|--------------|-------|-----------|
| "Too many attempts" | ✅ Yes | Generic, applies to any email |
| "Wait 2:30 before retry" | ✅ Yes | Time-based, no account info |
| "Account locked for 5 minutes" | ❌ No | Implies account exists |
| "Invalid email (rate limited)" | ❌ No | Leaks validation info |

### 5.5 Amplify v6 API Examples

#### 5.5.1 forgotPassword

```typescript
import { resetPassword } from 'aws-amplify/auth'

try {
  const output = await resetPassword({ username: email })
  
  // Output structure
  const { nextStep } = output
  
  if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
    // Code sent successfully
    // Note: Amplify always returns success for security
  }
} catch (error: any) {
  if (error.name === 'LimitExceededException') {
    // Handle rate limiting
  }
}
```

**Amplify v6 Note**: `resetPassword` is the new method name (was `forgotPassword` in v5)

#### 5.5.2 confirmResetPassword

```typescript
import { confirmResetPassword } from 'aws-amplify/auth'

try {
  await confirmResetPassword({
    username: email,
    confirmationCode: code,
    newPassword: password,
  })
  
  // Success - redirect to login
} catch (error: any) {
  if (error.name === 'LimitExceededException') {
    // Handle rate limiting
  } else if (error.name === 'CodeMismatchException') {
    // Invalid code
  } else if (error.name === 'ExpiredCodeException') {
    // Code expired
  }
}
```

**Current Implementation**: `apps/web/main-app/src/services/auth/AuthProvider.tsx` wraps these Amplify v6 methods.

---

## 6. Testing Strategy

### 6.1 Unit Test Approach

#### 6.1.1 MSW Mocking of Cognito LimitExceededException

Use MSW (Mock Service Worker) to mock Cognito API responses in unit tests:

```typescript
// apps/web/main-app/src/test/handlers/auth.ts
import { http, HttpResponse } from 'msw'

export const authHandlers = [
  // Mock Cognito forgotPassword rate limit
  http.post('https://cognito-idp.us-east-1.amazonaws.com/', async ({ request }) => {
    const body = await request.json()
    
    // Check for ForgotPassword operation
    if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ForgotPassword') {
      // Simulate rate limiting after 3 attempts
      const attemptCount = sessionStorage.getItem('test_forgot_attempts')
      const attempts = attemptCount ? parseInt(attemptCount, 10) : 0
      
      if (attempts >= 3) {
        return HttpResponse.json(
          {
            __type: 'LimitExceededException',
            message: 'Attempt limit exceeded, please try after some time.',
          },
          { status: 400 }
        )
      }
      
      // Increment attempts
      sessionStorage.setItem('test_forgot_attempts', (attempts + 1).toString())
      
      // Success response
      return HttpResponse.json({
        CodeDeliveryDetails: {
          Destination: 't***@e***',
          DeliveryMedium: 'EMAIL',
        },
      })
    }
  }),
]
```

**Note**: Amplify SDK uses low-level Cognito HTTP API. MSW must intercept raw Cognito requests, not high-level Amplify calls.

#### 6.1.2 Testing SessionStorage State Tracking

```typescript
// apps/web/main-app/src/routes/pages/__tests__/ForgotPasswordPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

describe('ForgotPasswordPage - Rate Limiting', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('should track attempt count in sessionStorage', async () => {
    render(<ForgotPasswordPage />)
    
    // Initial state
    expect(sessionStorage.getItem('auth:forgotPassword:attempts')).toBeNull()
    
    // Submit form (will trigger rate limit after 3 attempts in MSW mock)
    const emailInput = screen.getByLabelText('Email Address')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    fireEvent.click(screen.getByRole('button', { name: /send reset/i }))
    
    // Verify attempt tracked
    await waitFor(() => {
      expect(sessionStorage.getItem('auth:forgotPassword:attempts')).toBe('1')
    })
  })

  it('should calculate exponential backoff cooldown', async () => {
    // Pre-set 3 attempts
    sessionStorage.setItem('auth:forgotPassword:attempts', '3')
    
    render(<ForgotPasswordPage />)
    
    // Submit (will be rate limited)
    fireEvent.click(screen.getByRole('button', { name: /send reset/i }))
    
    // Verify cooldown calculated (3rd attempt = 240 seconds)
    await waitFor(() => {
      const cooldownUntil = sessionStorage.getItem('auth:forgotPassword:cooldownUntil')
      expect(cooldownUntil).toBeTruthy()
      
      const expiresAt = parseInt(cooldownUntil!, 10)
      const cooldownSeconds = Math.ceil((expiresAt - Date.now()) / 1000)
      expect(cooldownSeconds).toBeCloseTo(240, -1) // Within 10 seconds
    })
  })

  it('should show RateLimitBanner when rate limited', async () => {
    // Trigger rate limit (4th attempt in MSW mock)
    sessionStorage.setItem('auth:forgotPassword:attempts', '3')
    
    render(<ForgotPasswordPage />)
    fireEvent.click(screen.getByRole('button', { name: /send reset/i }))
    
    // Verify banner shown
    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      expect(screen.getByRole('timer')).toBeInTheDocument()
    })
  })

  it('should disable submit button during cooldown', async () => {
    // Set active cooldown
    const cooldownUntil = Date.now() + 120000 // 2 minutes
    sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())
    
    render(<ForgotPasswordPage />)
    
    const submitButton = screen.getByRole('button', { name: /send reset/i })
    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveAttribute('aria-disabled', 'true')
  })
})
```

#### 6.1.3 Testing Cooldown Timer

```typescript
import { vi } from 'vitest'

it('should update countdown timer every second', async () => {
  vi.useFakeTimers()

  // Set cooldown to 60 seconds
  const cooldownUntil = Date.now() + 60000
  sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())

  render(<ForgotPasswordPage />)

  // Initial state: ~60 seconds
  expect(screen.getByText(/1:00/)).toBeInTheDocument()

  // Advance 1 second
  vi.advanceTimersByTime(1000)

  await waitFor(() => {
    expect(screen.getByText(/0:59/)).toBeInTheDocument()
  })

  // Advance to 30 seconds
  vi.advanceTimersByTime(29000)

  await waitFor(() => {
    expect(screen.getByText(/0:30/)).toBeInTheDocument()
  })

  vi.useRealTimers()
})
```

### 6.2 E2E Test Scenarios with Playwright

#### 6.2.1 Test Outline: Rate Limit Flow

```typescript
// apps/web/playwright/tests/auth/password-reset-rate-limit.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Password Reset Rate Limiting', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to forgot password page
    await page.goto('/forgot-password')
  })

  test('should show rate limit banner after multiple attempts', async ({ page }) => {
    const emailInput = page.getByLabel('Email Address')
    const submitButton = page.getByRole('button', { name: /send reset/i })

    // Attempt 1
    await emailInput.fill('test@example.com')
    await submitButton.click()
    await expect(page.getByText(/success/i)).toBeVisible()

    // Attempt 2 (rapid retry)
    await page.getByRole('button', { name: /try different/i }).click()
    await emailInput.fill('test2@example.com')
    await submitButton.click()

    // Attempt 3
    await page.getByRole('button', { name: /try different/i }).click()
    await emailInput.fill('test3@example.com')
    await submitButton.click()

    // Attempt 4 (rapid retry)
    await page.getByRole('button', { name: /try different/i }).click()
    await emailInput.fill('test4@example.com')
    await submitButton.click()

    // Verify rate limit banner shown
    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible()
    await expect(page.getByRole('timer')).toBeVisible()
  })

  test('should disable submit button during cooldown', async ({ page }) => {
    // Trigger rate limit (use sessionStorage to pre-set cooldown)
    await page.evaluate(() => {
      const cooldownUntil = Date.now() + 120000 // 2 minutes
      sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())
    })

    // Reload page to apply cooldown
    await page.reload()

    // Verify button disabled
    const submitButton = page.getByRole('button', { name: /send reset/i })
    await expect(submitButton).toBeDisabled()
    await expect(submitButton).toHaveAttribute('aria-disabled', 'true')
  })

  test('should countdown and re-enable after cooldown expires', async ({ page }) => {
    // Set short cooldown (5 seconds for test speed)
    await page.evaluate(() => {
      const cooldownUntil = Date.now() + 5000
      sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())
    })

    await page.reload()

    // Verify countdown visible
    await expect(page.getByText(/0:0[45]/)).toBeVisible()

    // Wait for cooldown to expire
    await page.waitForTimeout(6000)

    // Verify button re-enabled
    const submitButton = page.getByRole('button', { name: /send reset/i })
    await expect(submitButton).toBeEnabled()
  })

  test('should persist cooldown across page refresh', async ({ page }) => {
    // Set cooldown
    await page.evaluate(() => {
      const cooldownUntil = Date.now() + 60000
      sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())
    })

    // Reload page
    await page.reload()

    // Verify cooldown still active
    await expect(page.getByRole('timer')).toBeVisible()
    const submitButton = page.getByRole('button', { name: /send reset/i })
    await expect(submitButton).toBeDisabled()
  })
})
```

#### 6.2.2 How to Trigger Rate Limiting in E2E

**Method 1: Rapid API Calls**
```typescript
// Make 5+ rapid requests to trigger Cognito rate limit
for (let i = 0; i < 6; i++) {
  await page.getByLabel('Email').fill(`test${i}@example.com`)
  await page.getByRole('button', { name: /send reset/i }).click()
  await page.waitForTimeout(100) // Small delay between attempts
}
```

**Method 2: Pre-set SessionStorage (Faster)**
```typescript
// Simulate rate limit state without actual API calls
await page.evaluate(() => {
  sessionStorage.setItem('auth:forgotPassword:attempts', '5')
  const cooldownUntil = Date.now() + 240000 // 4 minutes
  sessionStorage.setItem('auth:forgotPassword:cooldownUntil', cooldownUntil.toString())
})
```

**Recommendation**: Use Method 2 for faster tests. Use Method 1 for integration test that verifies actual Cognito behavior.

### 6.3 UAT Requirements

#### 6.3.1 ADR-005 Reference: Must Use Real Cognito

**ADR-005: Testing Requirements** (referenced in `docs/workflow/phases.md`)

**Requirement**: UAT (User Acceptance Testing) must use real Cognito User Pool, not mocked services.

**Rationale**:
- Cognito rate limiting behavior may differ from mocks
- Real-world network conditions affect retry timing
- SES email delivery timing impacts user experience
- Cooldown duration estimation must be validated against actual Cognito responses

#### 6.3.2 How to Trigger Rate Limiting in UAT Environment

**Manual Testing**:
1. Navigate to `/forgot-password` in UAT environment
2. Enter valid email address
3. Click "Send Reset Instructions"
4. Immediately click "Try different email"
5. Repeat steps 3-4 rapidly 5-6 times
6. Observe rate limit banner with countdown timer

**Automated UAT Script**:
```bash
# Use Playwright against UAT environment
PLAYWRIGHT_BASE_URL=https://uat.example.com pnpm exec playwright test auth/password-reset-rate-limit.spec.ts --project=chromium-live
```

**Configuration**: Ensure `apps/web/playwright/playwright.config.ts` has UAT environment variables:
```typescript
// apps/web/playwright/playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'chromium-live',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://uat.example.com',
      },
    },
  ],
})
```

#### 6.3.3 Note: Cognito Rate Limits May Differ Between Environments

| Environment | User Pool | Rate Limit Threshold | Notes |
|------------|-----------|----------------------|-------|
| Development | dev-user-pool | ~5 requests/min | Shared pool, may be higher |
| Staging | staging-user-pool | ~5 requests/min | Isolated pool |
| Production | prod-user-pool | ~10 requests/min | Higher quota (AWS support request) |

**Implication**: UAT tests may behave differently in each environment. Document actual thresholds after empirical testing.

---

## Summary

This guide provides a comprehensive specification for implementing password reset rate limiting in the LEGO MOC Instructions application. Key takeaways:

1. **Cognito rate limiting** is service-level and does not provide Retry-After header
2. **Frontend tracks cooldown** using sessionStorage and exponential backoff (60s → 120s → 240s → 480s → 600s)
3. **RateLimitBanner component** should be moved to app-component-library for reuse
4. **Account enumeration prevention** must be maintained in all rate limit messaging
5. **Testing requires MSW for unit tests**, Playwright for E2E, and real Cognito for UAT

**Next Steps**: See [BUGF-019](../../plans/future/bug-fix/ready-to-work/BUGF-019/BUGF-019.md) for frontend implementation story.

---

## Related Documentation

- [Forgot Password Flow](../flows/auth/forgot-password.md)
- [Reset Password Flow](../flows/auth/reset-password.md)
- [Authentication System Architecture](../architecture/authentication-system.md)
- [Backend Rate Limiting Middleware](../../apps/api/lego-api/middleware/rate-limit.ts)
- [RateLimitBanner Component](../../packages/core/upload/src/components/RateLimitBanner/index.tsx)
- [ResendCodeButton Component](../../apps/web/main-app/src/components/Auth/ResendCodeButton.tsx)

---

**Document Status**: Active  
**Last Updated**: 2026-02-11  
**Story**: BUGF-027  
**Maintainer**: Engineering Team
