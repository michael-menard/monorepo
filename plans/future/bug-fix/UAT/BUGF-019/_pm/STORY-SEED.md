---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-019

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline reality file found. Context gathered directly from codebase exploration.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| ForgotPasswordPage | `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` | Active - Basic rate limit error handling (lines 89-94, 123-124) |
| ResetPasswordPage | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` | Active - Has inline PasswordStrengthIndicator (lines 56-108), resend code button (lines 199-227) |
| ResendCodeButton | `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` | Active - Exponential backoff (60s→120s→240s→480s→600s), sessionStorage persistence |
| RateLimitBanner | `packages/core/upload/src/components/RateLimitBanner/index.tsx` | Active - Used in upload flows, countdown timer, accessibility features |
| PasswordStrengthIndicator | `apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx` | Active - Standalone component with getPasswordStrength utility |
| Rate Limiting Implementation Guide | `docs/guides/password-reset-rate-limiting.md` | Complete (BUGF-027) - Comprehensive specification for implementation |

### Active In-Progress Work

| Story | Title | Status | Potential Overlap |
|-------|-------|--------|-------------------|
| BUGF-026 | Auth Token Refresh Security Review | In QA Verification | Low - Different concern (token refresh vs password reset) |
| BUGF-027 | Rate Limiting Implementation Guide for Password Reset | UAT (Complete) | High - This guide informs BUGF-019 implementation |

### Constraints to Respect

1. **CLAUDE.md Compliance**: Must use Zod schemas for all types (no TypeScript interfaces)
2. **Component Library Structure**: Components in `@repo/app-component-library` follow `_primitives/` + feature folders pattern
3. **Import Rules**: Must import from `@repo/app-component-library` barrel exports only
4. **Cognito-Managed Rate Limiting**: Password reset operations go directly to Cognito (no backend API), Cognito does NOT provide Retry-After header
5. **Account Enumeration Prevention**: Rate limit feedback must NOT reveal account existence

---

## Retrieved Context

### Related Endpoints

**None** - Password reset operations (`forgotPassword`, `confirmResetPassword`) are Cognito-managed and do not involve backend API endpoints. Flow is: Frontend (Amplify SDK) → Cognito User Pool (Direct).

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| ForgotPasswordPage | `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` | Email input for password reset request |
| ResetPasswordPage | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` | Code verification + new password input |
| ResendCodeButton | `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` | Reusable button with exponential backoff cooldown |
| RateLimitBanner | `packages/core/upload/src/components/RateLimitBanner/index.tsx` | Banner with countdown timer for rate limit feedback |
| PasswordStrengthIndicator (reset-password) | `apps/web/reset-password/src/components/PasswordStrengthIndicator.tsx` | 5-bar strength indicator with color coding |
| PasswordStrengthIndicator (inline, ResetPasswordPage) | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx:56-108` | Inline implementation (duplicated logic) |

### Reuse Candidates

**High Priority Reuse**:
1. **ResendCodeButton** - Already implements exponential backoff (lines 23-31), sessionStorage persistence (lines 4-7, 36-53), and attempt count tracking (lines 59-92). Pattern should be applied to ForgotPasswordPage submit button.

2. **RateLimitBanner** - Currently in `@repo/upload` package. Should be moved to `@repo/app-component-library/feedback/` for broader reuse. Has countdown timer (lines 41-59), accessibility features (role="timer", aria-live), and prefers-reduced-motion support.

3. **PasswordStrengthIndicator** - Standalone component exists in `apps/web/reset-password/src/components/`. Logic duplicated in ResetPasswordPage (lines 56-108). Should be consolidated.

**Patterns from BUGF-027 Guide**:
- SessionStorage keys convention: `auth:{operation}:{attribute}` (e.g., `auth:forgotPassword:cooldownUntil`)
- Exponential backoff algorithm: `base * 2^(attempt-1)`, capped at max (60s → 120s → 240s → 480s → 600s)
- Cooldown state management functions: `getCooldownRemaining()`, `setCooldown()`, `incrementAttemptCount()`, `resetAttempts()`

---

## Knowledge Context

### Lessons Learned

No lessons loaded (Knowledge Base unavailable). However, BUGF-027 implementation guide provides comprehensive patterns.

### Blockers to Avoid (from past stories)

- **Missing Retry-After header**: Cognito does NOT provide `Retry-After` header like backend API rate limiting (429 responses). Frontend must estimate cooldown using exponential backoff.
- **Account enumeration risk**: Rate limit feedback must use generic messaging ("Too many attempts") rather than account-specific ("This account has been locked").

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-004 | Cognito as Authoritative Auth Service | Password reset does not touch backend API; frontend handles Cognito rate limiting errors directly |
| ADR-005 | Testing Strategy | UAT must use real Cognito User Pool, not mocked services |
| ADR-006 | Component Reusability | Shared UI components should live in `@repo/app-component-library` |

### Patterns to Follow

1. **Exponential Backoff**: Use `calculateCooldown()` from ResendCodeButton pattern (60s base, 600s max)
2. **SessionStorage Persistence**: Store cooldown state to survive page refresh
3. **Accessibility**: Use `role="timer"`, `aria-live="polite"`, throttle screen reader announcements to every 30 seconds
4. **Button Disable States**: Set `disabled={true}`, `aria-disabled="true"`, visual opacity reduction during cooldown
5. **Countdown Format**: Display as `MM:SS` (e.g., "2:30" for 150 seconds)
6. **Component Extraction**: When consolidating duplicates, use Zod schemas for props validation

### Patterns to Avoid

1. **Inline implementations**: Don't duplicate password strength logic; extract to shared component
2. **Direct DOM manipulation**: Use React refs or shared hooks instead of `document.getElementById`
3. **Account-specific error messages**: Never reveal account existence in rate limit feedback

---

## Conflict Analysis

**No conflicts detected.**

---

## Story Seed

### Title

Implement Password Reset Rate Limiting and UX Improvements

### Description

**Context**

The current password reset flow (ForgotPasswordPage and ResetPasswordPage) has basic error handling for Cognito's `LimitExceededException` but lacks user-friendly feedback mechanisms. When users trigger rate limits, they see a generic error message ("Too many attempts. Please try again later.") without knowing how long to wait. Additionally, the ResendCodeButton component has sophisticated exponential backoff and countdown timers that should be applied consistently across all password reset actions.

Password strength validation logic is duplicated between ResetPasswordPage (inline implementation at lines 56-108) and a standalone PasswordStrengthIndicator component in `apps/web/reset-password/`. This duplication violates DRY principles and increases maintenance burden.

The RateLimitBanner component, currently scoped to upload flows, provides excellent UX patterns (countdown timer, progress bar, accessibility features) that should be available for auth flows.

**Problem Statement**

Users encountering Cognito rate limits during password reset operations experience:
1. No visibility into cooldown duration
2. No countdown timer showing when they can retry
3. Inability to gauge password strength consistently across the app
4. Button interactions that don't provide clear feedback during cooldown periods

Additionally, developers face:
- Duplicated password strength logic across multiple files
- Rate limiting component scoped to upload package despite broader need
- Inconsistent cooldown patterns between resend code and forgot password actions

**Proposed Solution Direction**

This story implements comprehensive rate limiting UX improvements and consolidates duplicate implementations:

1. **Countdown Timer for ForgotPasswordPage**: Add countdown timer display to form submit button during cooldown, showing time remaining in MM:SS format (e.g., "Wait 2:30")

2. **Rate Limit Banner Integration**: Move RateLimitBanner from `@repo/upload` to `@repo/app-component-library/feedback/`, integrate into ForgotPasswordPage and ResetPasswordPage above forms when rate limited

3. **Button Disable States**: Disable submit buttons during cooldown with visual feedback (reduced opacity, cursor-not-allowed) and proper ARIA attributes

4. **Resend Code Rate Limiting**: Apply same exponential backoff pattern to "Resend code" button in ResetPasswordPage (already exists as ResendCodeButton but not used consistently)

5. **Password Strength Consolidation**: Extract shared password strength utility from duplicated implementations into `@repo/app-component-library`, use consistently across ResetPasswordPage and any future password input forms

All implementations will follow patterns established in BUGF-027 implementation guide, including:
- SessionStorage state tracking (`auth:forgotPassword:cooldownUntil`, etc.)
- Exponential backoff cooldown calculation (60s → 120s → 240s → 480s → 600s)
- Accessibility requirements (role="timer", aria-live, screen reader announcements)
- Account enumeration prevention (generic error messages)

### Initial Acceptance Criteria

- [ ] **AC-1**: ForgotPasswordPage displays countdown timer during cooldown
  - When `LimitExceededException` is caught, calculate cooldown using exponential backoff (60s → 120s → 240s → 480s → 600s)
  - Submit button shows countdown in MM:SS format (e.g., "Wait 2:30")
  - Button is disabled with `disabled={true}` and `aria-disabled="true"`
  - Countdown persists across page refresh via sessionStorage (`auth:forgotPassword:cooldownUntil`)

- [ ] **AC-2**: RateLimitBanner is moved to `@repo/app-component-library` and integrated into auth flows
  - Move `RateLimitBanner` from `packages/core/upload/src/components/RateLimitBanner/` to `packages/core/app-component-library/src/feedback/RateLimitBanner/`
  - Export from `@repo/app-component-library` barrel
  - Update import in upload package to use new location
  - Add optional `message` and `title` props for custom messaging (recommended enhancement from guide)
  - Integrate into ForgotPasswordPage: show banner when `LimitExceededException` occurs
  - Integrate into ResetPasswordPage: show banner when code verification rate limited

- [ ] **AC-3**: ResetPasswordPage resend code button uses exponential backoff
  - Wire up existing ResendCodeButton component for resend code action (lines 199-227)
  - Apply exponential backoff cooldown (60s → 120s → 240s → 480s → 600s)
  - Persist cooldown state in sessionStorage (`auth:resendCode:cooldownUntil`)
  - Display countdown in button text during cooldown

- [ ] **AC-4**: Password strength logic is consolidated into shared component
  - Extract `getPasswordStrength()` utility from ResetPasswordPage (lines 56-74) and reset-password app
  - Create Zod schema for PasswordStrengthIndicator props
  - Move PasswordStrengthIndicator to `packages/core/app-component-library/src/forms/PasswordStrengthIndicator/`
  - Export from `@repo/app-component-library` barrel
  - Update ResetPasswordPage to import from `@repo/app-component-library`
  - Remove duplicate inline implementation (lines 56-108)
  - Ensure 5-bar color-coded display (red, orange, yellow, lime, green) matches existing behavior

- [ ] **AC-5**: Accessibility requirements are met for all countdown timers
  - All countdown displays have `role="timer"` and `aria-live="polite"`
  - Screen reader announcements throttled to every 30 seconds (not every second)
  - Prefers-reduced-motion support: animations disabled, static states visible
  - Visual countdown continues to function normally

- [ ] **AC-6**: Account enumeration prevention is maintained
  - All rate limit error messages are generic ("Too many attempts. Please wait before trying again.")
  - No messaging reveals account existence ("This account has been locked" = WRONG)
  - Success messages for UserNotFoundException continue to show generic success (existing behavior preserved)

- [ ] **AC-7**: Unit tests cover new rate limiting behavior
  - Test countdown timer updates every second (use `vi.useFakeTimers()`)
  - Test sessionStorage state tracking (attempts, cooldown expiration)
  - Test exponential backoff cooldown calculation
  - Test button disable states during cooldown
  - Test RateLimitBanner visibility based on cooldown state
  - Test password strength consolidation (moved component works identically)

- [ ] **AC-8**: Documentation is updated
  - Update BUGF-027 guide to reference actual implementation in BUGF-019
  - Add inline code comments for sessionStorage key conventions
  - Document RateLimitBanner new location in app-component-library README

### Non-Goals

- **Backend rate limiting implementation**: Password reset is Cognito-managed; no backend API changes needed
- **Email integration testing**: Code delivery via SES is out of scope (existing behavior)
- **MFA flow rate limiting**: This story focuses only on password reset flows (forgotPassword, confirmResetPassword)
- **Changing exponential backoff formula**: Use established pattern from ResendCodeButton (60s → 120s → 240s → 480s → 600s)
- **Playwright E2E tests**: Unit tests only per ADR-005 (E2E would be BUGF-030 scope)

### Reuse Plan

**Components**:
- `ResendCodeButton` - Pattern for exponential backoff, sessionStorage persistence, attempt tracking
- `RateLimitBanner` - Move to app-component-library, use for auth flow feedback
- `PasswordStrengthIndicator` (reset-password app) - Extract to shared component library

**Patterns**:
- Exponential backoff algorithm from ResendCodeButton (lines 23-31)
- SessionStorage state management from ResendCodeButton (lines 36-100)
- Countdown timer pattern from RateLimitBanner (lines 41-59)
- Accessibility patterns from RateLimitBanner (role="timer", aria-live)

**Packages**:
- `@repo/app-component-library` - Target location for extracted components (RateLimitBanner, PasswordStrengthIndicator)
- `@repo/upload` - Current location of RateLimitBanner (will update import after move)
- `zod` - For props validation schemas (CLAUDE.md requirement)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context**:
- BUGF-027 guide provides comprehensive testing strategy (section 6)
- Cognito rate limiting requires MSW mocking of low-level Cognito HTTP API (not high-level Amplify calls)
- SessionStorage state tracking is critical for cooldown persistence
- Countdown timer testing requires `vi.useFakeTimers()` pattern

**Key Test Scenarios**:
1. Track attempt count in sessionStorage after `LimitExceededException`
2. Calculate exponential backoff cooldown correctly (3rd attempt = 240 seconds)
3. Update countdown timer every second (advance timers in test)
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
  }
})
```

**UAT Requirement**: Per ADR-005, UAT must use real Cognito User Pool to validate rate limiting behavior. Manual testing: submit forgot password 5-6 times rapidly, observe rate limit banner with countdown.

### For UI/UX Advisor

**Context**:
- BUGF-027 guide section 3 provides comprehensive UI/UX patterns
- RateLimitBanner has existing design (destructive red, progress bar, countdown)
- Countdown format is MM:SS (e.g., "2:30" for 150 seconds)
- Button disable states need clear visual feedback

**Key Considerations**:
1. **Banner Placement**: Above form, below page header (prominent but not blocking)
2. **Countdown Display**: Show in both banner ("Wait 2:30 before retrying") and button text ("Wait 2:30")
3. **Button States**:
   - Normal: Full color, "Send Reset Instructions"
   - During cooldown: Reduced opacity, disabled cursor, "Wait 2:30"
   - Loading: Spinner animation, "Sending..."
4. **Color Coding for Password Strength**: red → orange → yellow → lime → green (5 bars)
5. **Accessibility**:
   - Use `role="timer"` for countdown displays
   - Throttle screen reader announcements to every 30 seconds
   - Support prefers-reduced-motion (disable animations, keep static states)
6. **Account Enumeration Prevention**: Generic error messages only ("Too many attempts" not "Account locked")

**Visual Consistency**: Maintain LEGO-inspired theme (Sky/Teal color palette), match existing auth page styling (ForgotPasswordPage, ResetPasswordPage LEGO brick animations).

### For Dev Feasibility

**Context**:
- RateLimitBanner exists and works well in upload flows (proven pattern)
- ResendCodeButton provides battle-tested exponential backoff implementation
- Password strength logic is straightforward extraction (no complex dependencies)
- SessionStorage patterns are well-established in ResendCodeButton

**Implementation Approach**:
1. **Phase 1 - RateLimitBanner Move** (1-2 hours):
   - Copy component to `@repo/app-component-library/src/feedback/RateLimitBanner/`
   - Add optional `message` and `title` props
   - Update barrel export
   - Update upload package import
   - Run tests to ensure no breakage

2. **Phase 2 - ForgotPasswordPage Countdown** (2-3 hours):
   - Add sessionStorage state management (following ResendCodeButton pattern)
   - Hook into existing `LimitExceededException` handling (lines 89-94, 123-124)
   - Calculate cooldown using exponential backoff
   - Add countdown timer effect (update every second)
   - Update button text during cooldown
   - Integrate RateLimitBanner

3. **Phase 3 - ResetPasswordPage Countdown** (1-2 hours):
   - Similar to Phase 2 but for confirmResetPassword operation
   - Wire up resend code button with exponential backoff

4. **Phase 4 - Password Strength Extraction** (2-3 hours):
   - Create component in `@repo/app-component-library/src/forms/PasswordStrengthIndicator/`
   - Create Zod props schema in `__types__/index.ts`
   - Extract `getPasswordStrength()` utility
   - Update ResetPasswordPage import
   - Remove inline implementation

5. **Phase 5 - Testing** (3-4 hours):
   - Unit tests for sessionStorage tracking
   - Unit tests for countdown timer (vi.useFakeTimers)
   - Unit tests for button disable states
   - Unit tests for password strength component
   - Manual UAT testing with real Cognito

**Estimated Total**: 9-14 hours (2 points)

**Risk Mitigation**:
- RateLimitBanner move is low risk (component is stable, just moving location)
- Password strength extraction is low risk (pure utility function, no side effects)
- Main complexity is sessionStorage state management, but ResendCodeButton provides proven pattern
- Cognito rate limiting behavior may vary by environment (document in testing notes)

**Dependencies**:
- No blocking dependencies
- BUGF-027 guide (complete) provides full specification
- Existing components (ResendCodeButton, RateLimitBanner) are stable

**Security Considerations**:
- Account enumeration prevention: Use generic error messages (already handled in existing code)
- SessionStorage can be bypassed by clearing browser storage, but Cognito enforces service-level limit regardless (client-side cooldown is UX feedback, not security enforcement)

---

## Completion Signal

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning**: No active baseline reality file found. Context gathered directly from codebase exploration and BUGF-027 implementation guide. No conflicts detected with active work (BUGF-026, BUGF-027). Story is ready for elaboration.
