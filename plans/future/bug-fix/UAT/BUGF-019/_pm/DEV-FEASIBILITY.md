# Dev Feasibility Review: BUGF-019

## Story Context

**Title**: Implement Password Reset Rate Limiting and UX Improvements
**Story ID**: BUGF-019
**Epic**: bug-fix
**Phase**: 3 (Test Coverage & Quality)
**Points**: 2 (9-14 hours estimated)

---

## Feasibility Assessment

**Overall Verdict**: ✅ **FEASIBLE** - Low to moderate risk. Straightforward implementation with proven patterns.

**Key Factors**:
1. ✅ RateLimitBanner component already exists and works in upload flows
2. ✅ ResendCodeButton provides battle-tested exponential backoff pattern
3. ✅ Password strength logic is simple extraction (no complex dependencies)
4. ✅ SessionStorage patterns well-established
5. ✅ No backend API changes needed (Cognito-managed)
6. ⚠️ Moderate complexity: Multiple component files, auth flow integration

---

## Implementation Phases

### Phase 1: RateLimitBanner Move to @repo/app-component-library

**Estimated Time**: 1-2 hours
**Risk**: Low
**Complexity**: ⭐ (Simple)

**Tasks**:
1. Copy component from `packages/core/upload/src/components/RateLimitBanner/` to `packages/core/app-component-library/src/feedback/RateLimitBanner/`
2. Copy `__types__/index.ts` to maintain Zod props schema
3. Add optional `message` and `title` props (recommended enhancement from BUGF-027)
4. Update barrel export in `packages/core/app-component-library/src/index.ts`
5. Update import in `packages/core/upload/` to use `@repo/app-component-library`
6. Run tests: `pnpm test packages/core/upload` to ensure no breakage

**Files Modified**:
- NEW: `packages/core/app-component-library/src/feedback/RateLimitBanner/index.tsx`
- NEW: `packages/core/app-component-library/src/feedback/RateLimitBanner/__types__/index.ts`
- MODIFIED: `packages/core/app-component-library/src/index.ts`
- MODIFIED: `packages/core/upload/src/components/Uploader/UploaderList/index.tsx` (update import)

**Zod Schema Enhancement** (optional):

```typescript
// Add to RateLimitBannerPropsSchema
export const RateLimitBannerPropsSchema = z.object({
  visible: z.boolean(),
  retryAfterSeconds: z.number(),
  onRetry: z.any(),
  onDismiss: z.any().optional(),
  message: z.string().optional(), // NEW: Custom message
  title: z.string().optional().default('Rate Limit Exceeded'), // NEW: Custom title
})
```

**Dependencies**:
- `zod` (already installed)
- `@repo/app-component-library` primitives (Alert, Button)

**Reference**: Seed section 2.5 Phase 1, BUGF-027 guide section 4.2

---

### Phase 2: ForgotPasswordPage Countdown Timer

**Estimated Time**: 2-3 hours
**Risk**: Moderate
**Complexity**: ⭐⭐ (Moderate)

**Tasks**:
1. Add sessionStorage state management hooks
2. Hook into existing `LimitExceededException` handling (lines 89-94, 123-124)
3. Calculate cooldown using exponential backoff (pattern from ResendCodeButton)
4. Add countdown timer effect (update every second)
5. Update button text during cooldown
6. Integrate RateLimitBanner above form
7. Add ARIA attributes for accessibility

**Files Modified**:
- `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx`

**Code Pattern** (from BUGF-027 section 2.5):

```typescript
import { useState, useEffect } from 'react'
import { RateLimitBanner } from '@repo/app-component-library'

const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
} as const

// Exponential backoff (from ResendCodeButton pattern)
const calculateCooldown = (attemptNumber: number): number => {
  const baseCooldown = 60 // seconds
  const maxCooldown = 600 // 10 minutes
  if (attemptNumber <= 0) return baseCooldown
  const exponentialCooldown = baseCooldown * Math.pow(2, attemptNumber - 1)
  return Math.min(exponentialCooldown, maxCooldown)
}

// State management utilities
const getCooldownRemaining = (cooldownKey: string): number => {
  const stored = sessionStorage.getItem(cooldownKey)
  if (!stored) return 0
  const expiresAt = parseInt(stored, 10)
  if (isNaN(expiresAt)) return 0
  const remaining = Math.ceil((expiresAt - Date.now()) / 1000)
  return Math.max(0, remaining)
}

const setCooldown = (cooldownKey: string, seconds: number): void => {
  const expiresAt = Date.now() + seconds * 1000
  sessionStorage.setItem(cooldownKey, expiresAt.toString())
}

const incrementAttemptCount = (attemptKey: string, lastAttemptKey: string): number => {
  const stored = sessionStorage.getItem(attemptKey)
  const currentAttempts = stored ? parseInt(stored, 10) : 0
  const newAttempts = isNaN(currentAttempts) ? 1 : currentAttempts + 1
  sessionStorage.setItem(attemptKey, newAttempts.toString())
  sessionStorage.setItem(lastAttemptKey, Date.now().toString())
  return newAttempts
}

// In component
const [cooldownSeconds, setCooldownSeconds] = useState(() =>
  getCooldownRemaining(FORGOT_PASSWORD_KEYS.cooldownUntil)
)

// Countdown timer effect
useEffect(() => {
  if (cooldownSeconds <= 0) return

  const timer = setInterval(() => {
    const remaining = getCooldownRemaining(FORGOT_PASSWORD_KEYS.cooldownUntil)
    setCooldownSeconds(remaining)
  }, 1000)

  return () => clearInterval(timer)
}, [cooldownSeconds])

// In onSubmit error handler
if (error?.name === 'LimitExceededException') {
  const attemptCount = incrementAttemptCount(
    FORGOT_PASSWORD_KEYS.attempts,
    FORGOT_PASSWORD_KEYS.lastAttempt
  )
  const cooldown = calculateCooldown(attemptCount)
  setCooldown(FORGOT_PASSWORD_KEYS.cooldownUntil, cooldown)
  setCooldownSeconds(cooldown)
  setError('Too many attempts. Please wait before trying again.')
}
```

**Integration Points**:
- Existing error handling: Lines 89-94 (try/catch for forgotPassword)
- Existing success handling: Lines 78-88 (reset attempts on success)
- Existing UI: Lines 123-124 (error display), 205-213 (submit button)

**Dependencies**:
- `RateLimitBanner` from `@repo/app-component-library` (Phase 1)
- React hooks: `useState`, `useEffect`
- SessionStorage API (browser native)

**Reference**: Seed section 2.5 Phase 2, BUGF-027 guide section 2.5

---

### Phase 3: ResetPasswordPage Countdown Timer

**Estimated Time**: 1-2 hours
**Risk**: Low
**Complexity**: ⭐⭐ (Moderate)

**Tasks**:
1. Similar to Phase 2, but for `confirmResetPassword` operation
2. Wire up resend code button with exponential backoff (use existing ResendCodeButton pattern)
3. Add RateLimitBanner integration

**Files Modified**:
- `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`

**SessionStorage Keys**:

```typescript
const CONFIRM_RESET_KEYS = {
  attempts: 'auth:confirmResetPassword:attempts',
  lastAttempt: 'auth:confirmResetPassword:lastAttempt',
  cooldownUntil: 'auth:confirmResetPassword:cooldownUntil',
}

const RESEND_CODE_KEYS = {
  attempts: 'auth:resendCode:attempts',
  lastAttempt: 'auth:resendCode:lastAttempt',
  cooldownUntil: 'auth:resendCode:cooldownUntil',
}
```

**Two Cooldowns to Track**:
1. `confirmResetPassword` (submit button)
2. `resendCode` (resend code button)

**Reference**: Seed section 2.5 Phase 3, BUGF-027 guide section 2.1

---

### Phase 4: Password Strength Extraction

**Estimated Time**: 2-3 hours
**Risk**: Low
**Complexity**: ⭐⭐ (Moderate)

**Tasks**:
1. Create component directory: `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/`
2. Create `__types__/index.ts` with Zod props schema
3. Extract `getPasswordStrength()` utility from ResetPasswordPage (lines 56-74)
4. Extract JSX from ResetPasswordPage (lines 75-108)
5. Create `index.tsx` with PasswordStrengthIndicator component
6. Update barrel export in `packages/core/app-component-library/src/index.ts`
7. Update ResetPasswordPage to import from `@repo/app-component-library`
8. Remove inline implementation from ResetPasswordPage

**Files Created**:
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/index.tsx`
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/__types__/index.ts`
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/utils/getPasswordStrength.ts`

**Files Modified**:
- `packages/core/app-component-library/src/index.ts` (add export)
- `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` (remove lines 56-108, add import)

**Zod Props Schema**:

```typescript
// packages/core/app-component-library/src/forms/PasswordStrengthIndicator/__types__/index.ts
import { z } from 'zod'

export const PasswordStrengthIndicatorPropsSchema = z.object({
  /** Current password value */
  password: z.string(),
  /** Whether to show strength text label */
  showLabel: z.boolean().optional().default(true),
  /** Custom className for container */
  className: z.string().optional(),
})

export type PasswordStrengthIndicatorProps = z.infer<typeof PasswordStrengthIndicatorPropsSchema>
```

**Component Pattern**:

```typescript
// index.tsx
import { getPasswordStrength } from './utils/getPasswordStrength'

export function PasswordStrengthIndicator({ password, showLabel = true, className }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password)

  const colors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const labels = ['Weak', 'Fair', 'Medium', 'Strong', 'Very Strong']

  return (
    <div className={cn('space-y-2', className)}>
      {/* 5-bar display */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(bar => (
          <div
            key={bar}
            className={cn(
              'h-2 flex-1 rounded',
              bar <= strength ? colors[strength - 1] : 'bg-muted'
            )}
          />
        ))}
      </div>
      {/* Strength label */}
      {showLabel && strength > 0 && (
        <p className="text-sm text-muted-foreground">
          Password strength: {labels[strength - 1]}
        </p>
      )}
    </div>
  )
}
```

**getPasswordStrength Utility** (extracted from ResetPasswordPage lines 56-74):

```typescript
// utils/getPasswordStrength.ts
export function getPasswordStrength(password: string): number {
  if (password.length === 0) return 0
  if (password.length < 8) return 1

  let strength = 2 // Base: length >= 8

  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password)

  if (hasLowercase && hasUppercase) strength++
  if (hasNumbers) strength++
  if (hasSpecialChars && password.length >= 12) strength++

  return Math.min(strength, 5)
}
```

**Usage in ResetPasswordPage**:

```typescript
// Before (inline implementation, lines 56-108)
const getPasswordStrength = (password: string) => { /* ... */ }
// JSX: <div>5-bar display</div>

// After (import from @repo/app-component-library)
import { PasswordStrengthIndicator } from '@repo/app-component-library'

// JSX: <PasswordStrengthIndicator password={password} />
```

**Reference**: Seed section 2.5 Phase 4, Seed AC-4

---

### Phase 5: Testing

**Estimated Time**: 3-4 hours
**Risk**: Low
**Complexity**: ⭐⭐ (Moderate)

**Tasks**:
1. Unit tests for sessionStorage tracking (ForgotPasswordPage, ResetPasswordPage)
2. Unit tests for countdown timer (vi.useFakeTimers)
3. Unit tests for button disable states
4. Unit tests for RateLimitBanner component (after move)
5. Unit tests for PasswordStrengthIndicator component
6. MSW mocking of Cognito LimitExceededException
7. Manual UAT testing with real Cognito

**Test Files**:
- `apps/web/main-app/src/routes/pages/__tests__/ForgotPasswordPage.test.tsx` (expand existing)
- `apps/web/main-app/src/routes/pages/__tests__/ResetPasswordPage.test.tsx` (expand existing)
- `packages/core/app-component-library/src/feedback/RateLimitBanner/__tests__/RateLimitBanner.test.tsx` (port from upload package)
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/__tests__/PasswordStrengthIndicator.test.tsx` (new)

**MSW Handler** (add to `apps/web/main-app/src/test/handlers/auth.ts`):

```typescript
import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.post('https://cognito-idp.us-east-1.amazonaws.com/', async ({ request }) => {
    const body = await request.json()

    if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ForgotPassword') {
      const attemptCount = sessionStorage.getItem('test_forgot_attempts')
      const attempts = attemptCount ? parseInt(attemptCount, 10) : 0

      if (attempts >= 3) {
        return HttpResponse.json(
          { __type: 'LimitExceededException', message: 'Attempt limit exceeded' },
          { status: 400 }
        )
      }

      sessionStorage.setItem('test_forgot_attempts', (attempts + 1).toString())

      return HttpResponse.json({
        CodeDeliveryDetails: { Destination: 't***@e***', DeliveryMedium: 'EMAIL' },
      })
    }

    // Similar for ConfirmResetPassword
  }),
]
```

**Reference**: Test Plan artifact, BUGF-027 guide section 6.1

---

## Technical Dependencies

### Internal Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `@repo/app-component-library` | Target for RateLimitBanner and PasswordStrengthIndicator | ✅ Exists, stable |
| `@repo/upload` | Current location of RateLimitBanner | ✅ Stable, import will be updated |
| `zod` | Props validation schemas | ✅ Installed across monorepo |

### External Libraries

| Library | Purpose | Version | Status |
|---------|---------|---------|--------|
| `aws-amplify/auth` | Cognito SDK (forgotPassword, confirmResetPassword) | v6 | ✅ Already integrated |
| `msw` | Cognito API mocking in tests | Latest | ✅ Already configured |
| `vitest` | Unit test runner (vi.useFakeTimers) | Latest | ✅ Already configured |
| `@testing-library/react` | Component testing | Latest | ✅ Already configured |

**No new dependencies required**. All dependencies already installed and stable.

---

## Risk Assessment

### Low Risk Areas

1. **RateLimitBanner Move** (⭐ Low)
   - Component is stable and proven in upload flows
   - Simple copy-paste with import updates
   - Existing tests can be ported
   - No breaking changes to existing upload usage

2. **Password Strength Extraction** (⭐ Low)
   - Pure utility function (no side effects)
   - Simple JSX extraction
   - No complex dependencies
   - Easy to test in isolation

3. **SessionStorage State Management** (⭐ Low)
   - Well-established pattern in ResendCodeButton
   - Browser API is stable
   - Straightforward to test with mock storage

### Moderate Risk Areas

1. **Countdown Timer Implementation** (⭐⭐ Moderate)
   - **Risk**: Timer drift or memory leaks if `setInterval` not cleaned up properly
   - **Mitigation**: Use `useEffect` cleanup function, test with `vi.useFakeTimers()`
   - **Fallback**: Copy exact pattern from ResendCodeButton (proven implementation)

2. **Cognito Rate Limit Behavior** (⭐⭐ Moderate)
   - **Risk**: Actual Cognito rate limit thresholds may differ from documented estimates
   - **Mitigation**: Exponential backoff handles variability; UAT testing with real Cognito required
   - **Fallback**: Document actual thresholds in UAT notes; adjust base cooldown if needed

3. **Multiple Auth Pages** (⭐⭐ Moderate)
   - **Risk**: Pattern duplication across ForgotPasswordPage and ResetPasswordPage
   - **Mitigation**: Extract shared utilities to `/utils/rate-limiting.ts` for reuse
   - **Fallback**: Accept slight duplication for Phase 3 (refactor in future story if needed)

### Security Considerations

1. **Account Enumeration Prevention** (✅ Already Handled)
   - Existing code uses generic error messages (lines 89-94, 123-124)
   - No changes to error messaging logic needed
   - Maintain existing pattern: Always show success for `UserNotFoundException`

2. **SessionStorage Bypass** (✅ Acceptable Trade-off)
   - Users can clear sessionStorage to bypass cooldown
   - **BUT**: Cognito enforces service-level limit regardless
   - Client-side cooldown is UX feedback, not security enforcement
   - Security handled by Cognito, not frontend

**Reference**: BUGF-027 guide section 5.4, Seed section 2.6 Security Considerations

---

## Alternative Approaches Considered

### Alternative 1: Custom Hook for Rate Limiting

**Approach**: Extract rate limiting logic to `useRateLimiting()` custom hook.

**Pros**:
- Reusable across ForgotPasswordPage and ResetPasswordPage
- Cleaner component code
- Easier to test in isolation

**Cons**:
- Additional abstraction layer
- May be overkill for 2 pages
- Increases complexity

**Decision**: ❌ **Not Recommended for BUGF-019**. Stick to inline implementation for now. Extract to custom hook in future refactor if needed (BUGF-023 or similar).

### Alternative 2: Backend Proxy for Cognito Rate Limiting

**Approach**: Route forgotPassword/confirmResetPassword through backend API to track rate limiting server-side.

**Pros**:
- Centralized rate limiting logic
- Cannot be bypassed by clearing sessionStorage
- Consistent with backend-managed API rate limiting

**Cons**:
- **Violates ADR-004** ("Cognito as Authoritative Auth Service")
- Adds latency (extra hop)
- Increases backend complexity
- Requires backend code changes (out of scope)

**Decision**: ❌ **Not Recommended**. Cognito-managed rate limiting is intentional architectural decision. Do not proxy through backend.

**Reference**: BUGF-027 guide section 5.2, Seed section 2.1 (No backend API endpoints)

---

## Performance Considerations

### Countdown Timer Performance

**Update Frequency**: Every 1000ms (1 second)

**Potential Issue**: 60 updates per minute may cause unnecessary re-renders.

**Mitigation**:
- Use `useEffect` with `[cooldownSeconds]` dependency (only re-render when countdown changes)
- No debouncing needed (1 second updates are acceptable)
- Cleanup `setInterval` in `useEffect` return function

**Reference**: BUGF-027 guide section 3.2.2

### Password Strength Calculation Performance

**Update Frequency**: On every keystroke (as user types)

**Potential Issue**: Regex evaluation on every keystroke may feel laggy for long passwords.

**Mitigation**:
- Debounce by 200ms (update strength 200ms after user stops typing)
- Pattern from existing implementation: No debouncing currently used
- If performance issue arises in UAT, add `useDebouncedValue()` hook

**Reference**: Seed AC-4

---

## CLAUDE.md Compliance

### Zod-First Types (REQUIRED)

✅ **Compliant**:
- RateLimitBanner uses Zod schema: `RateLimitBannerPropsSchema`
- PasswordStrengthIndicator will use Zod schema: `PasswordStrengthIndicatorPropsSchema`
- No TypeScript interfaces used

**Example**:

```typescript
// CORRECT (Zod schema with inferred type)
export const PasswordStrengthIndicatorPropsSchema = z.object({
  password: z.string(),
  showLabel: z.boolean().optional().default(true),
  className: z.string().optional(),
})

export type PasswordStrengthIndicatorProps = z.infer<typeof PasswordStrengthIndicatorPropsSchema>

// WRONG (interface without Zod)
// interface PasswordStrengthIndicatorProps {
//   password: string
//   showLabel?: boolean
// }
```

**Reference**: CLAUDE.md Zod-First Types section

### Import Rules

✅ **Compliant**:
- Import from `@repo/app-component-library` barrel export
- Never import from individual paths

**Example**:

```typescript
// CORRECT
import { Button, RateLimitBanner, PasswordStrengthIndicator } from '@repo/app-component-library'

// WRONG
import { Button } from '@repo/app-component-library/buttons'
import { RateLimitBanner } from '@repo/app-component-library/feedback/RateLimitBanner'
```

**Reference**: CLAUDE.md Critical Import Rules

### Logging

✅ **Compliant**:
- Use `@repo/logger` for any logging needs (not console.log)
- No logging needed for this story (UI-only changes)

**Reference**: CLAUDE.md Logging Rules

---

## Coordination with Active Work

### BUGF-026: Auth Token Refresh Security Review (In QA)

**Overlap**: Low - Different concern (token refresh vs password reset)

**Coordination**: None needed. BUGF-026 focuses on session/token validation, not password reset flows.

### BUGF-027: Rate Limiting Implementation Guide (UAT Complete)

**Overlap**: High - BUGF-027 provides full specification for BUGF-019 implementation

**Coordination**: Use BUGF-027 guide as source of truth for patterns, MSW mocking, accessibility requirements.

**Reference**: Seed section 1.3 Active In-Progress Work

---

## Implementation Sequence Recommendation

**Recommended Order**:
1. **Phase 1** (RateLimitBanner move) - Foundational, required for Phases 2-3
2. **Phase 4** (PasswordStrengthIndicator extraction) - Independent, can be done in parallel
3. **Phase 2** (ForgotPasswordPage countdown) - Depends on Phase 1
4. **Phase 3** (ResetPasswordPage countdown) - Depends on Phases 1-2 pattern
5. **Phase 5** (Testing) - Final, validates all phases

**Parallel Work Opportunities**:
- Phase 1 and Phase 4 can be done simultaneously (different files, no overlap)
- Phases 2 and 3 can overlap if different developers work on each

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (sequential)

---

## Estimated Timeline

| Phase | Task | Estimated Time | Dependency |
|-------|------|----------------|------------|
| 1 | RateLimitBanner move | 1-2 hours | — |
| 2 | ForgotPasswordPage countdown | 2-3 hours | Phase 1 |
| 3 | ResetPasswordPage countdown | 1-2 hours | Phase 1, Phase 2 (pattern) |
| 4 | PasswordStrengthIndicator extraction | 2-3 hours | — |
| 5 | Testing (unit + UAT) | 3-4 hours | Phases 1-4 |

**Total Estimated Time**: 9-14 hours
**Story Points**: **2 points** (based on 8-hour point = 1 point)

**Confidence**: High - All patterns proven, no unknowns, clear specification from BUGF-027.

---

## Blockers and Prerequisites

### Prerequisites

✅ **All prerequisites met**:
- BUGF-027 guide complete (provides full specification)
- Existing components stable (ResendCodeButton, RateLimitBanner)
- MSW already configured in test environment
- Cognito User Pool available for UAT testing

### No Blockers

❌ **No blocking dependencies**:
- BUGF-026 (Auth Token Refresh) is unrelated
- No backend API changes needed
- No infrastructure changes needed

**Ready to Start**: ✅ **YES**

---

## Rollback Strategy

### If Issues Arise During Implementation

**Phase 1 Rollback** (RateLimitBanner move):
- Revert `@repo/app-component-library` changes
- Restore import in upload package to original path
- Component still works in upload flows

**Phase 2/3 Rollback** (Countdown timers):
- Remove RateLimitBanner integration
- Remove sessionStorage state tracking
- Auth pages revert to basic error handling (current state)

**Phase 4 Rollback** (PasswordStrengthIndicator):
- Remove `@repo/app-component-library` export
- Restore inline implementation in ResetPasswordPage
- No impact on auth flow (visual only)

**No Data Loss Risk**: SessionStorage is ephemeral, no persistent data changes.

---

## Success Criteria

- [ ] RateLimitBanner moved to `@repo/app-component-library` and exported correctly
- [ ] ForgotPasswordPage displays countdown timer during cooldown
- [ ] ResetPasswordPage displays countdown timer during cooldown
- [ ] Resend code button uses exponential backoff
- [ ] PasswordStrengthIndicator extracted to shared component
- [ ] All unit tests pass (including new MSW mocking)
- [ ] Manual UAT testing with real Cognito passes
- [ ] Accessibility ARIA attributes verified
- [ ] Account enumeration prevention maintained
- [ ] No console.log calls (use @repo/logger if logging needed)
- [ ] CLAUDE.md compliance: Zod schemas, correct imports, no interfaces

---

**Dev Feasibility Status**: ✅ **APPROVED**
**Story**: BUGF-019
**Last Updated**: 2026-02-11
**Author**: PM Dev Feasibility Worker
