# BUGF-019: Implement Password Reset Rate Limiting and UX Improvements

---
id: BUGF-019
title: "Implement Password Reset Rate Limiting and UX Improvements"
status: ready-to-work
priority: P2
epic: bug-fix
phase: 3
story_type: tech_debt
points: 2
experiment_variant: control
created: "2026-02-11"
updated: "2026-02-11"
elaboration_verdict: "PASS"
elaboration_date: "2026-02-11"
related_stories:
  - BUGF-027
  - BUGF-026
surfaces:
  backend: false
  frontend: true
  database: false
  infrastructure: false
predictions:
  split_risk: 0.3
  review_cycles: 1-2
  token_estimate: "90K-110K"
  confidence: low
---

## Context

The current password reset flow (ForgotPasswordPage and ResetPasswordPage) has basic error handling for Cognito's `LimitExceededException` but lacks user-friendly feedback mechanisms. When users trigger rate limits, they see a generic error message ("Too many attempts. Please try again later.") without knowing how long to wait.

The ResendCodeButton component in `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` demonstrates sophisticated exponential backoff (60s → 120s → 240s → 480s → 600s) and countdown timers that should be applied consistently across all password reset actions. Meanwhile, RateLimitBanner in `packages/core/upload/` provides excellent UX patterns (countdown timer, progress bar, accessibility features) that should be available for auth flows.

Password strength validation logic is duplicated between ResetPasswordPage (inline implementation at lines 56-108) and a standalone PasswordStrengthIndicator component in `apps/web/reset-password/`. This duplication violates DRY principles and increases maintenance burden.

**Guiding Specification**: BUGF-027 implementation guide (`docs/guides/password-reset-rate-limiting.md`) provides comprehensive patterns for exponential backoff, sessionStorage state tracking, UI/UX requirements, MSW mocking, and testing approaches.

**Reality Baseline**:
- ForgotPasswordPage has basic rate limit error handling (lines 89-94, 123-124)
- ResetPasswordPage has inline PasswordStrengthIndicator (lines 56-108) and resend code button (lines 199-227)
- ResendCodeButton demonstrates exponential backoff with sessionStorage persistence
- RateLimitBanner exists in `@repo/upload` package with countdown timer and accessibility features

**Architectural Constraints** (per ADR-004):
- Password reset operations go directly to Cognito (no backend API)
- Cognito does NOT provide Retry-After header
- Frontend must estimate cooldown using exponential backoff
- Client-side cooldown is UX feedback, not security enforcement

---

## Goal

Improve password reset security and user experience by:
1. Adding countdown timers for rate limits with clear visual feedback
2. Disabling buttons during cooldown with accessibility support
3. Implementing resend code rate limiting with exponential backoff
4. Consolidating duplicate password strength implementations into shared component

Users will understand why they can't retry and when they can, reducing frustration during rate limit scenarios.

---

## Non-Goals

- **Backend rate limiting implementation**: Password reset is Cognito-managed; no backend API changes needed
- **Email integration testing**: Code delivery via SES is out of scope (existing behavior)
- **MFA flow rate limiting**: This story focuses only on password reset flows (forgotPassword, confirmResetPassword)
- **Changing exponential backoff formula**: Use established pattern from ResendCodeButton (60s → 120s → 240s → 480s → 600s)
- **Playwright E2E tests**: Unit tests only per ADR-005 (E2E would be BUGF-030 scope)
- **Backend proxy for Cognito rate limiting**: Would violate ADR-004 (Cognito as Authoritative Auth Service)

---

## Scope

### Frontend Components

**Modified**:
- `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` - Add countdown timer, integrate RateLimitBanner
- `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` - Add countdown timer, wire up resend code button, replace inline PasswordStrengthIndicator

**Moved**:
- `packages/core/upload/src/components/RateLimitBanner/` → `packages/core/app-component-library/src/feedback/RateLimitBanner/`

**Created**:
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/` - Extracted from ResetPasswordPage
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/utils/getPasswordStrength.ts` - Shared utility
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/__types__/index.ts` - Zod props schema

**Test Files**:
- `apps/web/main-app/src/routes/pages/__tests__/ForgotPasswordPage.test.tsx` - Expand with rate limiting tests
- `apps/web/main-app/src/routes/pages/__tests__/ResetPasswordPage.test.tsx` - Expand with rate limiting tests
- `packages/core/app-component-library/src/feedback/RateLimitBanner/__tests__/RateLimitBanner.test.tsx` - Port from upload package
- `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/__tests__/PasswordStrengthIndicator.test.tsx` - New

**MSW Handlers**:
- `apps/web/main-app/src/test/handlers/auth.ts` - Add Cognito LimitExceededException mocking

### Packages

- `@repo/app-component-library` - Target location for extracted components
- `@repo/upload` - Update import after RateLimitBanner move
- `zod` - For props validation schemas (CLAUDE.md requirement)

### Endpoints

**None** - Password reset operations (`forgotPassword`, `confirmResetPassword`) are Cognito-managed and do not involve backend API endpoints. Flow is: Frontend (Amplify SDK) → Cognito User Pool (Direct).

---

## Acceptance Criteria

### AC-1: ForgotPasswordPage displays countdown timer during cooldown

**Given**: User has triggered Cognito rate limit (LimitExceededException)
**When**: Page loads or user attempts to submit form during cooldown
**Then**:
- [ ] Cooldown calculated using exponential backoff (60s → 120s → 240s → 480s → 600s)
- [ ] Submit button displays countdown in MM:SS format (e.g., "Wait 2:30")
- [ ] Submit button is disabled with `disabled={true}` and `aria-disabled="true"`
- [ ] Cooldown persists across page refresh via sessionStorage (`auth:forgotPassword:cooldownUntil`)
- [ ] Countdown updates every second (visual update)
- [ ] Button re-enabled when countdown reaches zero

**SessionStorage Keys**:
```typescript
const FORGOT_PASSWORD_KEYS = {
  attempts: 'auth:forgotPassword:attempts',
  lastAttempt: 'auth:forgotPassword:lastAttempt',
  cooldownUntil: 'auth:forgotPassword:cooldownUntil',
}
```

**Exponential Backoff Formula**: `base * 2^(attempt-1)`, capped at 600s

**Reference**: Dev Feasibility Phase 2, BUGF-027 guide section 2.2

---

### AC-2: RateLimitBanner is moved to @repo/app-component-library and integrated into auth flows

**Given**: RateLimitBanner component exists in `packages/core/upload/`
**When**: Component is moved to `packages/core/app-component-library/src/feedback/RateLimitBanner/`
**Then**:
- [ ] Component moved with `__types__/index.ts` (Zod props schema)
- [ ] Exported from `@repo/app-component-library` barrel
- [ ] Import in upload package updated to use `@repo/app-component-library`
- [ ] Optional `message` and `title` props added for custom messaging (recommended enhancement)
- [ ] RateLimitBanner integrated into ForgotPasswordPage: shows when `LimitExceededException` occurs
- [ ] RateLimitBanner integrated into ResetPasswordPage: shows when code verification rate limited
- [ ] Banner displays above form, below page header
- [ ] Countdown timer visible in banner with MM:SS format
- [ ] Progress bar animates from 100% to 0% over cooldown duration
- [ ] All existing upload package tests still pass

**Props Schema** (enhanced):
```typescript
export const RateLimitBannerPropsSchema = z.object({
  visible: z.boolean(),
  retryAfterSeconds: z.number(),
  onRetry: z.any(),
  onDismiss: z.any().optional(),
  message: z.string().optional(), // NEW: Custom message
  title: z.string().optional().default('Rate Limit Exceeded'), // NEW: Custom title
})
```

**Reference**: Dev Feasibility Phase 1, BUGF-027 guide section 4.2

---

### AC-3: ResetPasswordPage resend code button uses exponential backoff

**Given**: User clicks "Resend code" button in ResetPasswordPage
**When**: Cognito returns `LimitExceededException` for resend code operation
**Then**:
- [ ] Existing ResendCodeButton component wired up for resend code action (lines 199-227)
- [ ] Exponential backoff cooldown applied (60s → 120s → 240s → 480s → 600s)
- [ ] Cooldown state persisted in sessionStorage (`auth:resendCode:cooldownUntil`)
- [ ] Button displays countdown in text during cooldown ("Wait 2:00")
- [ ] Button disabled with `disabled={true}` and `aria-disabled="true"`
- [ ] Countdown updates every second
- [ ] Button re-enabled when countdown expires

**SessionStorage Keys**:
```typescript
const RESEND_CODE_KEYS = {
  attempts: 'auth:resendCode:attempts',
  lastAttempt: 'auth:resendCode:lastAttempt',
  cooldownUntil: 'auth:resendCode:cooldownUntil',
}
```

**Reference**: Dev Feasibility Phase 3, BUGF-027 guide section 2.1

---

### AC-4: Password strength logic is consolidated into shared component

**Given**: Password strength logic duplicated in ResetPasswordPage (inline) and reset-password app
**When**: Component is extracted to `@repo/app-component-library`
**Then**:
- [ ] `getPasswordStrength()` utility extracted to `/utils/getPasswordStrength.ts`
- [ ] Zod schema created for PasswordStrengthIndicator props in `__types__/index.ts`
- [ ] PasswordStrengthIndicator component created in `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/`
- [ ] Exported from `@repo/app-component-library` barrel
- [ ] ResetPasswordPage imports from `@repo/app-component-library`
- [ ] Duplicate inline implementation removed from ResetPasswordPage (lines 56-108)
- [ ] 5-bar color-coded display matches existing behavior (red, orange, yellow, lime, green)
- [ ] Strength calculation identical to original implementation
- [ ] Component updates in real-time as user types (optional: debounced by 200ms)

**Strength Calculation**:
- 0 bars: Empty password
- 1 bar: Length < 8 (red)
- 2 bars: Length >= 8 (orange)
- 3 bars: Mixed case (yellow)
- 4 bars: Mixed case + numbers (lime)
- 5 bars: Mixed case + numbers + special chars + length >= 12 (green)

**Props Schema**:
```typescript
export const PasswordStrengthIndicatorPropsSchema = z.object({
  password: z.string(),
  showLabel: z.boolean().optional().default(true),
  className: z.string().optional(),
})
```

**Reference**: Dev Feasibility Phase 4, UI/UX Notes section 4

---

### AC-5: Accessibility requirements are met for all countdown timers

**Given**: Countdown timer is active (ForgotPasswordPage, ResetPasswordPage, or ResendCodeButton)
**When**: User interacts with page or countdown updates
**Then**:
- [ ] All countdown displays have `role="timer"` attribute
- [ ] All countdown displays have `aria-live="polite"` attribute
- [ ] Screen reader announcements throttled to every 30 seconds (not every second)
- [ ] Announcement text: "Approximately X minutes remaining" (rounded to nearest 30 seconds)
- [ ] Final announcement: "Rate limit expired. You can now retry."
- [ ] Prefers-reduced-motion support: progress bar animations disabled, static states visible
- [ ] Visual countdown continues to function normally (every second) regardless of prefers-reduced-motion
- [ ] Submit buttons have `aria-disabled="true"` when disabled

**ARIA Live Region Pattern**:
```typescript
<div role="timer" aria-live="polite" className="sr-only">
  {canRetry
    ? 'Rate limit expired. You can now retry.'
    : `Approximately ${Math.ceil(remainingSeconds / 60)} minutes remaining.`}
</div>
```

**CSS for Prefers-Reduced-Motion**:
```typescript
className="transition-all duration-1000 ease-linear motion-reduce:transition-none"
```

**Reference**: BUGF-027 guide sections 3.4.1-3.4.3, Test Plan section 8

---

### AC-6: Account enumeration prevention is maintained

**Given**: User triggers rate limit or any error during password reset
**When**: Error message is displayed
**Then**:
- [ ] All rate limit error messages are generic ("Too many attempts. Please wait before trying again.")
- [ ] No messaging reveals account existence (❌ WRONG: "This account has been locked")
- [ ] Success messages for `UserNotFoundException` continue to show generic success (existing behavior preserved)
- [ ] No email-specific error messages (❌ WRONG: "Too many failed resets for test@example.com")

**Approved Messages**:
- ✅ "Too many attempts. Please wait before trying again."
- ✅ "Rate limit exceeded. Try again in 2:30."

**Prohibited Messages**:
- ❌ "This account has been locked for 5 minutes."
- ❌ "Too many failed resets for test@example.com."

**Reference**: BUGF-027 guide section 5.4.1, UI/UX Notes section 7.1

---

### AC-7: Unit tests cover new rate limiting behavior

**Given**: Test suite runs for affected components
**When**: All tests execute
**Then**:
- [ ] Test countdown timer updates every second (use `vi.useFakeTimers()`)
- [ ] Test sessionStorage state tracking (attempts, cooldown expiration)
- [ ] Test exponential backoff cooldown calculation (3rd attempt = 240 seconds)
- [ ] Test button disable states during cooldown (disabled={true}, aria-disabled="true")
- [ ] Test RateLimitBanner visibility based on cooldown state
- [ ] Test password strength consolidation (moved component works identically)
- [ ] MSW handler mocks Cognito `LimitExceededException` (low-level HTTP API)
- [ ] Test cooldown persistence across page refresh (reload sessionStorage)
- [ ] Test accessibility ARIA attributes (role="timer", aria-live="polite")
- [ ] Test prefers-reduced-motion support (animations disabled, countdown continues)
- [ ] All existing tests for RateLimitBanner still pass after move
- [ ] Coverage meets 80% threshold for affected components

**MSW Handler Pattern** (add to `apps/web/main-app/src/test/handlers/auth.ts`):
```typescript
http.post('https://cognito-idp.us-east-1.amazonaws.com/', async ({ request }) => {
  const body = await request.json()
  if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ForgotPassword') {
    const attempts = sessionStorage.getItem('test_forgot_attempts')
    if (parseInt(attempts || '0') >= 3) {
      return HttpResponse.json(
        { __type: 'LimitExceededException', message: 'Attempt limit exceeded' },
        { status: 400 }
      )
    }
  }
})
```

**Reference**: Test Plan sections 1-8, BUGF-027 guide section 6.1

---

### AC-8: Documentation is updated

**Given**: Implementation is complete
**When**: Documentation is reviewed
**Then**:
- [ ] BUGF-027 guide (`docs/guides/password-reset-rate-limiting.md`) updated to reference actual implementation in BUGF-019
- [ ] Inline code comments added for sessionStorage key conventions (`auth:{operation}:{attribute}`)
- [ ] RateLimitBanner new location documented in `packages/core/app-component-library/README.md` (or create if missing)
- [ ] PasswordStrengthIndicator usage examples added to app-component-library documentation

**Reference**: Seed AC-8

---

## Reuse Plan

### Components

| Component | Current Location | Target Location | Purpose |
|-----------|-----------------|-----------------|---------|
| **ResendCodeButton** | `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` | N/A (pattern reference only) | Pattern for exponential backoff, sessionStorage persistence, attempt tracking |
| **RateLimitBanner** | `packages/core/upload/src/components/RateLimitBanner/` | `packages/core/app-component-library/src/feedback/RateLimitBanner/` | Countdown timer, progress bar, accessibility features (role="timer", aria-live) |
| **PasswordStrengthIndicator** | `apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx` | `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/` | 5-bar strength indicator with color coding |

### Patterns

| Pattern | Source | Application |
|---------|--------|-------------|
| **Exponential Backoff** | ResendCodeButton lines 23-31 | ForgotPasswordPage, ResetPasswordPage cooldown calculation |
| **SessionStorage State Management** | ResendCodeButton lines 36-100 | Track attempts, cooldown expiration, persist across refresh |
| **Countdown Timer** | RateLimitBanner lines 41-59 | Update every second, format as MM:SS, cleanup on unmount |
| **Accessibility Patterns** | RateLimitBanner | role="timer", aria-live="polite", prefers-reduced-motion support |

### Utilities

| Utility | Source | Purpose |
|---------|--------|---------|
| `calculateCooldown()` | ResendCodeButton (infer from pattern) | Calculate exponential backoff: `base * 2^(attempt-1)`, capped at 600s |
| `getCooldownRemaining()` | Infer from BUGF-027 guide section 2.3.1 | Read sessionStorage, calculate remaining time in seconds |
| `setCooldown()` | Infer from BUGF-027 guide section 2.3.2 | Write cooldown expiration to sessionStorage |
| `incrementAttemptCount()` | Infer from BUGF-027 guide section 2.3.3 | Track attempt count, update timestamp |
| `getPasswordStrength()` | ResetPasswordPage lines 56-74 | Calculate password strength (1-5 scale) based on length, character variety |

---

## Architecture Notes

### Cognito-Managed Rate Limiting

**Flow**: Frontend (Amplify SDK) → Cognito User Pool (Direct)

**Key Differences from Backend Rate Limiting**:

| Aspect | Cognito-Managed | Backend-Managed |
|--------|----------------|-----------------|
| Enforcement | AWS Cognito service | Backend middleware |
| Error Type | `LimitExceededException` | `429 Too Many Requests` |
| Retry-After Header | ❌ No | ✅ Yes |
| Configurable Threshold | ❌ AWS-managed | ✅ Configurable |
| Cooldown Calculation | Frontend estimates | Backend provides |

**Rationale** (per ADR-004):
- Cognito is authoritative authentication service
- No backend proxy layer needed for Cognito operations
- Reduces latency and complexity
- Leverages Cognito's built-in security features

**Security Trade-off**: Client-side cooldown tracking provides UX feedback but does not replace Cognito's enforcement. Users who bypass client-side cooldown (by clearing sessionStorage) will still be blocked by Cognito.

**Reference**: Dev Feasibility section "Coordination with Active Work", BUGF-027 guide section 5.2

---

### Component Library Architecture

**Structure**:
```
packages/core/app-component-library/
├── _primitives/              # Raw shadcn/Radix wrappers
│   └── alert.tsx            # Base Alert component
├── feedback/                 # App-level feedback components
│   └── RateLimitBanner/
│       ├── index.tsx
│       └── __types__/index.ts
└── forms/                    # App-level form components
    └── PasswordStrengthIndicator/
        ├── index.tsx
        ├── __types__/index.ts
        └── utils/getPasswordStrength.ts
```

**Import Pattern** (per CLAUDE.md):
```typescript
// CORRECT (barrel export)
import { RateLimitBanner, PasswordStrengthIndicator, Button } from '@repo/app-component-library'

// WRONG (individual paths)
import { RateLimitBanner } from '@repo/app-component-library/feedback/RateLimitBanner'
```

**Reference**: CLAUDE.md Component Library Architecture, Dev Feasibility "CLAUDE.md Compliance"

---

### SessionStorage State Schema

**Key Naming Convention**: `auth:{operation}:{attribute}`

**Keys**:
```typescript
// ForgotPassword
'auth:forgotPassword:attempts' // number (attempt count)
'auth:forgotPassword:lastAttempt' // timestamp (Date.now())
'auth:forgotPassword:cooldownUntil' // timestamp (expiration)

// ConfirmResetPassword
'auth:confirmResetPassword:attempts'
'auth:confirmResetPassword:lastAttempt'
'auth:confirmResetPassword:cooldownUntil'

// ResendCode
'auth:resendCode:attempts'
'auth:resendCode:lastAttempt'
'auth:resendCode:cooldownUntil'
```

**Lifecycle**:
- **Created**: On first `LimitExceededException`
- **Updated**: On each rate limit error (increment attempts, recalculate cooldown)
- **Cleared**: On successful operation or manual reset
- **Persisted**: Across page refresh (sessionStorage survives refresh)
- **Ephemeral**: Cleared when browser tab/window closed

**Reference**: BUGF-027 guide section 2.1, Dev Feasibility Phase 2

---

## Infrastructure Notes

**No infrastructure changes required**.

**Existing Infrastructure**:
- Cognito User Pool (handles rate limiting service-side)
- Amplify SDK v6 (already integrated for auth operations)
- SessionStorage API (browser native, no polyfill needed)

**Testing Infrastructure**:
- MSW (already configured for API mocking)
- Vitest (supports `vi.useFakeTimers()` for countdown timer tests)
- React Testing Library (supports accessibility queries)

---

## HTTP Contract Plan

**N/A** - No backend API endpoints involved. Password reset operations are Cognito-managed.

**Cognito Operations** (via Amplify SDK):
- `resetPassword({ username })` - Sends reset code via email (was `forgotPassword` in Amplify v5)
- `confirmResetPassword({ username, confirmationCode, newPassword })` - Verifies code and sets new password

**Error Responses**:
- `LimitExceededException` - Rate limit exceeded (trigger cooldown)
- `UserNotFoundException` - Account doesn't exist (show generic success per account enumeration prevention)
- `CodeMismatchException` - Invalid verification code
- `ExpiredCodeException` - Code expired (user must request new code)

**Reference**: BUGF-027 guide section 5.5

---

## Seed Requirements

**N/A** - No database seeding needed. All state is client-side (sessionStorage).

---

## Test Plan

### Unit Test Coverage

**Target Components**:
- ForgotPasswordPage (80% coverage)
- ResetPasswordPage (80% coverage)
- RateLimitBanner (90% coverage)
- PasswordStrengthIndicator (90% coverage)

**Key Test Scenarios**:
1. Track attempt count in sessionStorage after `LimitExceededException`
2. Calculate exponential backoff cooldown correctly (3rd attempt = 240 seconds)
3. Update countdown timer every second (advance timers in test with `vi.useFakeTimers()`)
4. Disable submit button during cooldown with proper ARIA attributes
5. Show RateLimitBanner when rate limited
6. Persist cooldown across page refresh (reload test)
7. Password strength component behaves identically after extraction

**MSW Setup**:
```typescript
// Mock Cognito forgotPassword rate limit
http.post('https://cognito-idp.us-east-1.amazonaws.com/', async ({ request }) => {
  const body = await request.json()
  if (body?.['X-Amz-Target'] === 'AWSCognitoIdentityProviderService.ForgotPassword') {
    const attempts = sessionStorage.getItem('test_forgot_attempts')
    if (parseInt(attempts || '0') >= 3) {
      return HttpResponse.json(
        { __type: 'LimitExceededException', message: 'Attempt limit exceeded' },
        { status: 400 }
      )
    }
    sessionStorage.setItem('test_forgot_attempts', (parseInt(attempts || '0') + 1).toString())
    return HttpResponse.json({
      CodeDeliveryDetails: { Destination: 't***@e***', DeliveryMedium: 'EMAIL' },
    })
  }
})
```

**Note**: Amplify SDK uses low-level Cognito HTTP API. MSW must intercept raw Cognito requests, not high-level Amplify calls.

**Reference**: TEST-PLAN.md artifact (detailed test scenarios in `_pm/TEST-PLAN.md`)

---

### UAT Requirements (ADR-005)

**Per ADR-005**: UAT must use real Cognito User Pool, not mocked services.

**Manual Testing Procedure**:
1. Navigate to `/forgot-password` in UAT environment
2. Enter valid email address
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
- After ~5 rapid attempts, Cognito returns `LimitExceededException`
- Cooldown duration depends on attempt count (see exponential backoff table)
- SessionStorage persists across page refresh

**Reference**: BUGF-027 guide section 6.3, Test Plan section "UAT Requirements"

---

## UI/UX Notes

### Visual Design

**RateLimitBanner**:
- **Variant**: Destructive (red, error tone)
- **Placement**: Above form, below page header
- **Components**: Alert + progress bar + countdown text + retry button
- **Progress Bar**: Animates from 100% to 0% over cooldown duration (disabled with `prefers-reduced-motion`)

**Button States**:
- **Normal**: "Send Reset Instructions" (full color, enabled)
- **Cooldown**: "Wait 2:30" (reduced opacity 50%, cursor-not-allowed, disabled)
- **Loading**: "Sending..." (spinner animation)

**Password Strength Indicator**:
- **Layout**: 5 horizontal bars
- **Colors**: Red (weak) → Orange (fair) → Yellow (medium) → Lime (strong) → Green (very strong)
- **Update**: Real-time as user types (optional: debounced by 200ms)

**Countdown Format**: MM:SS (e.g., "2:30" for 150 seconds)

**Visual Consistency**: Maintain LEGO-inspired theme (Sky/Teal color palette), match existing auth page styling.

**Reference**: UIUX-NOTES.md artifact (detailed UI/UX patterns in `_pm/UIUX-NOTES.md`)

---

### Accessibility

**ARIA Attributes**:
- `role="timer"` on countdown displays
- `aria-live="polite"` for screen reader announcements (throttled to every 30 seconds)
- `aria-disabled="true"` on disabled buttons

**Screen Reader Announcements**:
- Initial: "Rate limit exceeded. Approximately 4 minutes remaining."
- Updates: Every 30 seconds (not every second to avoid spam)
- Final: "Rate limit expired. You can now retry."

**Prefers-Reduced-Motion**:
- Progress bar animations disabled
- Countdown timer continues to function
- Static states remain visible

**Keyboard Navigation**:
- Tab order: Banner → Email input → Submit button
- Focus indicators visible on all interactive elements

**Reference**: BUGF-027 guide sections 3.4.1-3.4.3, UI/UX Notes section 6

---

## Reality Baseline

### Current State (Before BUGF-019)

**ForgotPasswordPage** (`apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx`):
- Lines 89-94: Basic error handling for `LimitExceededException`
- Lines 123-124: Generic error message display
- **Missing**: Countdown timer, RateLimitBanner integration, button disable states

**ResetPasswordPage** (`apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx`):
- Lines 56-108: Inline PasswordStrengthIndicator implementation (duplicated)
- Lines 199-227: Resend code button (not using exponential backoff)
- **Missing**: Countdown timer for submit button, RateLimitBanner integration

**ResendCodeButton** (`apps/web/main-app/src/components/Auth/ResendCodeButton.tsx`):
- Lines 23-31: Exponential backoff algorithm (60s → 120s → 240s → 480s → 600s)
- Lines 36-100: SessionStorage state management (attempts, cooldown, persistence)
- **Status**: Proven pattern, will be referenced for ForgotPasswordPage/ResetPasswordPage implementation

**RateLimitBanner** (`packages/core/upload/src/components/RateLimitBanner/`):
- **Status**: Works in upload flows, has countdown timer, progress bar, accessibility features
- **Target**: Move to `@repo/app-component-library` for broader reuse

**PasswordStrengthIndicator** (`apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx`):
- **Status**: Standalone component (5-bar display, color coding)
- **Duplicate**: Logic also exists inline in ResetPasswordPage (lines 56-108)
- **Target**: Extract to `@repo/app-component-library`, remove duplicates

---

### Active In-Progress Work

**BUGF-026**: Auth Token Refresh Security Review (In QA)
- **Overlap**: Low - Different concern (token refresh vs password reset)
- **Coordination**: None needed

**BUGF-027**: Rate Limiting Implementation Guide (UAT Complete)
- **Overlap**: High - Provides full specification for BUGF-019
- **Coordination**: Use BUGF-027 guide as source of truth for all patterns

---

### Constraints to Respect

1. **CLAUDE.md Compliance**: Must use Zod schemas for all types (no TypeScript interfaces)
2. **Component Library Structure**: Components in `@repo/app-component-library` follow `_primitives/` + feature folders pattern
3. **Import Rules**: Must import from `@repo/app-component-library` barrel exports only
4. **Cognito-Managed Rate Limiting**: Password reset operations go directly to Cognito (no backend API)
5. **Account Enumeration Prevention**: Rate limit feedback must NOT reveal account existence
6. **ADR-004**: Cognito as Authoritative Auth Service (no backend proxy for password reset)
7. **ADR-005**: UAT must use real Cognito User Pool (not mocked services)

---

## Risk Predictions

**Split Risk**: 0.3 (Low) - Well-defined scope, proven patterns, clear boundaries

**Review Cycles**: 1-2 (Low) - Straightforward implementation, comprehensive specification from BUGF-027

**Token Estimate**: 90K-110K (Low confidence, heuristics-only)

**High Risk Factors**:
- Cognito rate limit behavior variability (UAT testing required)
- Multi-page state management (SessionStorage tracking across ForgotPasswordPage and ResetPasswordPage)

**Medium Risk Factors**:
- Countdown timer memory leaks (use `useEffect` cleanup, test with `vi.useFakeTimers()`)
- Accessibility requirements (follow BUGF-027 guide closely)

**Low Risk Factors**:
- Component extraction (stable components, port existing tests)

**Reference**: RISK-PREDICTIONS.yaml artifact (detailed predictions in `_pm/RISK-PREDICTIONS.yaml`)

---

## Definition of Done

- [ ] All 8 Acceptance Criteria pass
- [ ] RateLimitBanner moved to `@repo/app-component-library` and exported
- [ ] PasswordStrengthIndicator extracted to `@repo/app-component-library` and exported
- [ ] ForgotPasswordPage displays countdown timer during cooldown
- [ ] ResetPasswordPage displays countdown timer during cooldown
- [ ] Resend code button uses exponential backoff
- [ ] All unit tests pass (including new MSW mocking)
- [ ] Test coverage meets 80% threshold for affected components
- [ ] Manual UAT testing with real Cognito passes
- [ ] Accessibility ARIA attributes verified
- [ ] Account enumeration prevention maintained
- [ ] Lint passes: `pnpm lint`
- [ ] Type-check passes: `pnpm check-types`
- [ ] Documentation updated (BUGF-027 guide, app-component-library README)
- [ ] No console.log calls (use `@repo/logger` if logging needed)
- [ ] CLAUDE.md compliance: Zod schemas, correct imports, no interfaces

---

## Story Status

**Status**: backlog
**Created**: 2026-02-11
**Updated**: 2026-02-11
**Experiment Variant**: control
**Points**: 2
**Estimated Hours**: 9-14
**Priority**: P2
**Phase**: 3 (Test Coverage & Quality)

---

**Dependencies**:
- BUGF-027 (Rate Limiting Implementation Guide) - UAT Complete

**Related Stories**:
- BUGF-026 (Auth Token Refresh Security Review) - In QA
- BUGF-030 (E2E Test Suite) - Backlog (E2E tests out of scope for BUGF-019)

---

**Artifacts**:
- Story Seed: `_pm/STORY-SEED.md`
- Test Plan: `_pm/TEST-PLAN.md`
- UI/UX Notes: `_pm/UIUX-NOTES.md`
- Dev Feasibility: `_pm/DEV-FEASIBILITY.md`
- Risk Predictions: `_pm/RISK-PREDICTIONS.yaml`

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### Elaboration Verdict

**PASS** - All 8 audit checks passed. Zero MVP-critical gaps identified. Story is implementation-ready without PM modifications.

### Audit Checks

| # | Check | Status |
|---|-------|--------|
| 1 | Scope Alignment | PASS |
| 2 | Internal Consistency | PASS |
| 3 | Reuse-First | PASS |
| 4 | Ports & Adapters | PASS |
| 5 | Local Testability | PASS |
| 6 | Decision Completeness | PASS |
| 7 | Risk Disclosure | PASS |
| 8 | Story Sizing | PASS |

### MVP Gaps Resolved

**None** - Core password reset rate limiting journey is complete. All 8 ACs support the primary user workflow without gaps.

### Non-Blocking Items (Logged to KB)

22 findings logged to `_implementation/DEFERRED-KB-WRITES.yaml`:

**Non-Blocking Gaps (7)**:
- RateLimitBanner custom message/title props (enhancement, low effort)
- Password strength indicator debouncing (performance, low effort)
- ResendCodeButton integration (consistency, medium effort)
- Visual distinction between error types (UX, low effort)
- SessionStorage keys as TypeScript constants (code quality, low effort)
- Countdown timer update frequency configurable (performance, low effort)
- Analytics tracking for rate limit events (observability, low effort)

**Enhancement Opportunities (15)**:
- Progress bar animation (quick win, already implemented)
- Toast notification on cooldown expiry (quick win, low effort)
- Persistent attempt count across sessions (security, high effort)
- Server-side rate limiting (security, high effort, requires ADR review)
- Configurable exponential backoff formula (flexibility, medium effort)
- Visual countdown in RateLimitBanner title (UX, low effort)
- Copy to clipboard for verification code (UX, low effort)
- Resend code success feedback via banner (UX, low effort)
- Password strength recommendations (UX, medium effort)
- Cooldown state sync across tabs (security, high effort)
- Adaptive cooldown based on user behavior (security, high effort)
- Email verification reminder in message (UX, low effort)
- Dark mode support for password strength colors (accessibility, low effort)
- Keyboard shortcut to retry after cooldown (accessibility, low effort)
- A/B test different cooldown formulas (observability, high effort)

### Summary

- **ACs added**: 0
- **ACs modified**: 0
- **KB entries created**: 22
- **Blocking issues**: 0
- **Mode**: autonomous

**Recommendation**: Implement story as written. All enhancements and optimizations appropriately deferred to Knowledge Base. Prioritize 3 quick wins for iteration immediately following MVP release:
1. Progress bar animation (already implemented, needs integration)
2. Toast notification on cooldown expiry
3. RateLimitBanner custom message/title props
