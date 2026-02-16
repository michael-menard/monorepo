# Test Plan: BUGF-019

## Story Context

**Title**: Implement Password Reset Rate Limiting and UX Improvements
**Story ID**: BUGF-019
**Epic**: bug-fix
**Phase**: 3 (Test Coverage & Quality)
**Points**: 2

---

## Test Strategy

This story implements rate limiting UX improvements and component consolidation for password reset flows. Testing focuses on:

1. **SessionStorage State Tracking** - Verify attempt count, cooldown expiration, and persistence across page refresh
2. **Exponential Backoff Calculation** - Ensure cooldown progression follows spec (60s → 120s → 240s → 480s → 600s)
3. **Countdown Timer Behavior** - Test timer updates, UI updates, and accessibility
4. **Component Extraction** - Verify RateLimitBanner and PasswordStrengthIndicator work identically after move
5. **Cognito Rate Limit Handling** - Mock LimitExceededException via MSW
6. **Accessibility** - Screen reader announcements, ARIA attributes, prefers-reduced-motion support

---

## Test Scope

### In Scope
- Unit tests for ForgotPasswordPage rate limiting behavior
- Unit tests for ResetPasswordPage rate limiting behavior
- Unit tests for RateLimitBanner component (after move to @repo/app-component-library)
- Unit tests for PasswordStrengthIndicator component (after extraction)
- MSW mocking of Cognito LimitExceededException
- SessionStorage state tracking tests
- Countdown timer tests (vi.useFakeTimers)
- Button disable state tests
- Accessibility tests (ARIA attributes, role="timer")

### Out of Scope
- E2E Playwright tests (deferred to BUGF-030)
- Backend API rate limiting tests (password reset is Cognito-managed)
- Email delivery tests (out of scope per seed)
- MFA flow rate limiting (not in scope)

---

## Unit Test Scenarios

### 1. SessionStorage State Tracking

#### 1.1 Track Attempt Count After Rate Limit

**Test**: `should increment attempt count in sessionStorage after LimitExceededException`

**Arrange**:
- Mock MSW handler to return LimitExceededException after 3 attempts
- Render ForgotPasswordPage
- Clear sessionStorage

**Act**:
- Submit form 3 times rapidly

**Assert**:
- `sessionStorage.getItem('auth:forgotPassword:attempts')` === '3'
- `sessionStorage.getItem('auth:forgotPassword:lastAttempt')` is a valid timestamp

**Reference**: Seed section 2.2.1, BUGF-027 guide section 2.3.3

#### 1.2 Calculate Exponential Backoff Correctly

**Test**: `should calculate exponential backoff cooldown (3rd attempt = 240s)`

**Arrange**:
- Pre-set `auth:forgotPassword:attempts` to '2'
- Mock LimitExceededException response

**Act**:
- Submit form (3rd attempt)

**Assert**:
- Cooldown calculated as 240 seconds (60 * 2^2)
- `sessionStorage.getItem('auth:forgotPassword:cooldownUntil')` is ~240 seconds in future

**Formula**: `base * 2^(attempt-1)`, capped at 600s

**Reference**: BUGF-027 guide section 2.2

#### 1.3 Persist Cooldown Across Page Refresh

**Test**: `should restore cooldown state from sessionStorage after reload`

**Arrange**:
- Set `auth:forgotPassword:cooldownUntil` to timestamp 120 seconds in future
- Render ForgotPasswordPage

**Act**:
- Check component state on mount

**Assert**:
- Countdown timer displays ~120 seconds
- Submit button is disabled
- RateLimitBanner is visible

**Reference**: Seed section 2.2.6

### 2. Countdown Timer Behavior

#### 2.1 Update Countdown Every Second

**Test**: `should update countdown timer every second`

**Arrange**:
- Use `vi.useFakeTimers()`
- Set cooldown to 60 seconds
- Render ForgotPasswordPage

**Act**:
- Advance timers by 1000ms
- Check displayed countdown

**Assert**:
- Initial: "1:00"
- After 1 second: "0:59"
- After 30 seconds: "0:30"
- After 60 seconds: button re-enabled

**Reference**: BUGF-027 guide section 6.1.3, Seed section 2.2.2

#### 2.2 Clear Cooldown When Timer Expires

**Test**: `should re-enable submit button when countdown reaches zero`

**Arrange**:
- Use `vi.useFakeTimers()`
- Set cooldown to 5 seconds

**Act**:
- Advance timers by 6000ms

**Assert**:
- Submit button enabled
- RateLimitBanner hidden
- Countdown no longer displayed
- `sessionStorage.getItem('auth:forgotPassword:cooldownUntil')` cleared

### 3. MSW Mocking of Cognito API

#### 3.1 MSW Handler Setup

**Test**: `should mock Cognito LimitExceededException via MSW`

**Handler Pattern** (from BUGF-027 guide section 6.1.1):

```typescript
// apps/web/main-app/src/test/handlers/auth.ts
import { http, HttpResponse } from 'msw'

export const authHandlers = [
  http.post('https://cognito-idp.us-east-1.amazonaws.com/', async ({ request }) => {
    const body = await request.json()

    if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ForgotPassword') {
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

      sessionStorage.setItem('test_forgot_attempts', (attempts + 1).toString())

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

**Note**: MSW must intercept low-level Cognito HTTP API, not high-level Amplify SDK calls.

**Reference**: Seed section 2.2.1 MSW Setup, BUGF-027 guide section 6.1.1

#### 3.2 Verify LimitExceededException Triggers Rate Limit Flow

**Test**: `should show RateLimitBanner when LimitExceededException is caught`

**Arrange**:
- Pre-set `test_forgot_attempts` to '3'
- Render ForgotPasswordPage

**Act**:
- Submit form

**Assert**:
- MSW returns LimitExceededException
- RateLimitBanner is visible
- Submit button disabled
- Error message displayed: "Too many attempts. Please wait before trying again."

### 4. Button Disable States

#### 4.1 Disable Button During Cooldown

**Test**: `should disable submit button with ARIA attributes during cooldown`

**Arrange**:
- Set cooldown to 120 seconds
- Render ForgotPasswordPage

**Act**:
- Check button state

**Assert**:
- `<button disabled={true} />`
- `<button aria-disabled="true" />`
- Button text: "Wait 2:00"
- Button has reduced opacity class (opacity-50)
- Button has cursor-not-allowed class

**Reference**: BUGF-027 guide section 3.3

#### 4.2 Re-enable Button After Cooldown Expires

**Test**: `should re-enable submit button when cooldown expires`

**Arrange**:
- Use `vi.useFakeTimers()`
- Set cooldown to 5 seconds

**Act**:
- Advance timers by 6000ms

**Assert**:
- `<button disabled={false} />`
- Button text: "Send Reset Instructions"
- Normal button styling (full opacity)

### 5. RateLimitBanner Component Tests

#### 5.1 RateLimitBanner After Move to @repo/app-component-library

**Test**: `should render RateLimitBanner from @repo/app-component-library`

**Arrange**:
- Import from `@repo/app-component-library`
- Render with props: `{ visible: true, retryAfterSeconds: 120, onRetry: jest.fn() }`

**Act**:
- Check rendered output

**Assert**:
- Banner visible
- Countdown displays "2:00"
- Progress bar animates
- role="timer" attribute present
- aria-live="polite" attribute present

**Reference**: BUGF-027 guide section 4.2, Seed AC-2

#### 5.2 Custom Message Prop (Recommended Enhancement)

**Test**: `should display custom message when message prop provided`

**Arrange**:
- Render RateLimitBanner with `message="Too many password reset attempts. Please wait."`

**Act**:
- Check rendered text

**Assert**:
- Custom message displayed instead of default
- Countdown still functional

**Note**: This is a recommended enhancement from BUGF-027 guide section 4.3.1. If not implemented in AC-2, defer to future story.

### 6. PasswordStrengthIndicator Component Tests

#### 6.1 Extracted Component Works Identically

**Test**: `should display 5-bar password strength indicator with color coding`

**Arrange**:
- Render PasswordStrengthIndicator from `@repo/app-component-library`
- Test passwords: "weak", "test123", "Test123!", "Test123!Secure", "Test123!SecurePassword"

**Act**:
- Check bar count and colors

**Assert**:
- "weak" = 1 bar (red)
- "test123" = 2 bars (orange)
- "Test123!" = 3 bars (yellow)
- "Test123!Secure" = 4 bars (lime)
- "Test123!SecurePassword" = 5 bars (green)

**Reference**: Seed AC-4, BUGF-027 guide section 3.4

#### 6.2 getPasswordStrength Utility

**Test**: `should calculate password strength correctly`

**Arrange**:
- Import getPasswordStrength utility

**Act**:
- Call with test passwords

**Assert**:
- Length < 8 = 1
- Length >= 8, lowercase only = 2
- Length >= 8, mixed case = 3
- Mixed case + numbers = 4
- Mixed case + numbers + special chars + length >= 12 = 5

**Reference**: Seed section 2.4 (Phase 4)

### 7. ResetPasswordPage Resend Code Button

#### 7.1 Exponential Backoff for Resend Code

**Test**: `should apply exponential backoff to resend code button`

**Arrange**:
- Render ResetPasswordPage
- Mock resend code API to return LimitExceededException after 3 attempts

**Act**:
- Click "Resend code" 3 times rapidly

**Assert**:
- After 3rd attempt: cooldown = 240 seconds
- Resend button disabled
- Button text: "Wait 4:00"
- `sessionStorage.getItem('auth:resendCode:cooldownUntil')` set

**Reference**: Seed AC-3, BUGF-027 guide section 2.1

### 8. Accessibility Tests

#### 8.1 ARIA Attributes Present

**Test**: `should have correct ARIA attributes on countdown timer`

**Arrange**:
- Set cooldown to 120 seconds
- Render ForgotPasswordPage

**Act**:
- Query for timer element

**Assert**:
- Element has `role="timer"`
- Element has `aria-live="polite"`
- Screen reader text updates (check via screen reader simulation or text content)

**Reference**: BUGF-027 guide section 3.4.1, Seed AC-5

#### 8.2 Screen Reader Announcements Throttled

**Test**: `should throttle screen reader announcements to every 30 seconds`

**Arrange**:
- Use `vi.useFakeTimers()`
- Set cooldown to 120 seconds
- Spy on ARIA live region text content changes

**Act**:
- Advance timers by 1000ms intervals

**Assert**:
- Announcement at 120s
- No announcement at 119s
- Announcement at 90s (30 seconds later)
- No announcement at 89s

**Note**: Throttling prevents screen reader spam.

**Reference**: BUGF-027 guide section 3.4.2

#### 8.3 Prefers-Reduced-Motion Support

**Test**: `should disable progress bar animation when prefers-reduced-motion is active`

**Arrange**:
- Mock `matchMedia('(prefers-reduced-motion: reduce)')` to return true
- Render RateLimitBanner with countdown

**Act**:
- Check progress bar styles

**Assert**:
- Progress bar has `motion-reduce:transition-none` class
- Countdown timer continues to function
- Static states visible (no smooth transitions)

**Reference**: BUGF-027 guide section 3.4.3, Seed AC-5

### 9. Account Enumeration Prevention

#### 9.1 Generic Error Messages Only

**Test**: `should use generic error message for rate limiting`

**Arrange**:
- Trigger LimitExceededException

**Act**:
- Check error message text

**Assert**:
- Message: "Too many attempts. Please wait before trying again."
- NOT: "This account has been locked" (reveals account existence)
- NOT: "Invalid email (rate limited)" (leaks validation info)

**Reference**: BUGF-027 guide section 5.4.1, Seed AC-6

---

## Coverage Targets

| Component | Target Coverage | Focus Areas |
|-----------|----------------|-------------|
| ForgotPasswordPage | 80% | Rate limiting, cooldown state, button disable |
| ResetPasswordPage | 80% | Resend code cooldown, password strength display |
| RateLimitBanner | 90% | Timer, progress bar, accessibility |
| PasswordStrengthIndicator | 90% | Strength calculation, bar rendering |

---

## Test Data

### SessionStorage Keys (from BUGF-027 section 2.1)

```typescript
const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
}

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

### Exponential Backoff Progression

| Attempt | Calculation | Cooldown (seconds) | Display |
|---------|-------------|-------------------|---------|
| 1 | 60 * 2^0 | 60 | 1:00 |
| 2 | 60 * 2^1 | 120 | 2:00 |
| 3 | 60 * 2^2 | 240 | 4:00 |
| 4 | 60 * 2^3 | 480 | 8:00 |
| 5+ | 60 * 2^4 (capped) | 600 | 10:00 |

---

## UAT Requirements (ADR-005)

### Manual Testing with Real Cognito

**Per ADR-005**: UAT must use real Cognito User Pool, not mocked services.

**UAT Test Procedure**:

1. Navigate to `/forgot-password` in UAT environment
2. Enter valid email address: `test@example.com`
3. Click "Send Reset Instructions"
4. Observe success message
5. Click "Try different email"
6. Repeat steps 2-5 rapidly 5-6 times
7. **Verify**:
   - Rate limit banner appears with countdown
   - Submit button disabled
   - Countdown timer decrements every second
   - Button text shows "Wait X:XX"
   - After countdown expires, button re-enabled

**Expected Behavior**:
- After ~5 rapid attempts, Cognito returns LimitExceededException
- Cooldown duration depends on attempt count (see exponential backoff table)
- SessionStorage persists across page refresh

**Reference**: BUGF-027 guide section 6.3

---

## Test Environment Setup

### MSW Configuration

Add MSW handlers to `apps/web/main-app/src/test/handlers/auth.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const authHandlers = [
  // ForgotPassword rate limit mock
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

    // ConfirmResetPassword rate limit mock
    if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ConfirmResetPassword') {
      const attemptCount = sessionStorage.getItem('test_confirm_reset_attempts')
      const attempts = attemptCount ? parseInt(attemptCount, 10) : 0

      if (attempts >= 3) {
        return HttpResponse.json(
          { __type: 'LimitExceededException', message: 'Attempt limit exceeded' },
          { status: 400 }
        )
      }

      sessionStorage.setItem('test_confirm_reset_attempts', (attempts + 1).toString())

      return HttpResponse.json({})
    }
  }),
]
```

### Vitest Setup

Ensure `vi.useFakeTimers()` is reset in `beforeEach`:

```typescript
beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllTimers()
})

afterEach(() => {
  vi.useRealTimers()
})
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Cognito rate limit thresholds vary by environment | Document actual thresholds in UAT notes; exponential backoff handles variability |
| Timer drift in tests | Use `vi.useFakeTimers()` for deterministic time control |
| MSW mock not matching real Cognito behavior | Validate with real Cognito in UAT per ADR-005 |
| Screen reader announcement spam | Throttle announcements to every 30 seconds per ARIA best practices |
| SessionStorage can be bypassed by user | Client-side cooldown is UX feedback only; Cognito enforces service-level limit |

---

## Dependencies

- **BUGF-027**: Rate Limiting Implementation Guide (UAT Complete) - Provides full specification
- **MSW**: Mock Service Worker for Cognito API mocking
- **Vitest**: `vi.useFakeTimers()` for countdown timer tests
- **React Testing Library**: Semantic queries for accessibility testing

---

## Completion Criteria

- [ ] All unit test scenarios pass
- [ ] SessionStorage state tracking verified
- [ ] Countdown timer behavior tested with fake timers
- [ ] MSW mocking of Cognito LimitExceededException working
- [ ] Accessibility ARIA attributes verified
- [ ] Account enumeration prevention maintained
- [ ] RateLimitBanner component tests pass after move
- [ ] PasswordStrengthIndicator component tests pass after extraction
- [ ] UAT manual testing completed with real Cognito
- [ ] Test coverage meets 80% threshold for affected components

---

**Test Plan Status**: Draft
**Story**: BUGF-019
**Last Updated**: 2026-02-11
**Author**: PM Test Plan Worker
