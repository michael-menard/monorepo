---
id: BUGF-027
title: "Rate Limiting Implementation Guide for Password Reset"
status: uat
priority: P2
phase: 3
story_type: documentation
points: 1
experiment_variant: control
depends_on: []
relates_to: ["BUGF-019", "BUGF-026"]
created_at: "2026-02-11T17:56:36Z"
elaboration_completed_at: "2026-02-11T18:30:00Z"
epic: bug-fix
surfaces:
  - documentation
  - auth
infrastructure: []
predictions:
  split_risk: 0.1
  review_cycles: 1
  token_estimate: 80000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-11T17:56:36Z"
  model: haiku
  wkfl_version: "007-v1"
elaboration_verdict: PASS
---

# BUGF-027: Rate Limiting Implementation Guide for Password Reset

## Context

The password reset flow (forgot password → reset with code) currently handles Cognito's `LimitExceededException` with a basic error message shown in `ForgotPasswordPage.tsx`. However, there is no comprehensive specification for rate limiting behavior, frontend feedback mechanisms, or integration patterns between Cognito's built-in rate limiting and the application's user experience layer.

**Current State**:
- Cognito rate limits password reset operations at the service level
- Frontend catches `LimitExceededException` and displays generic error
- No countdown timer or cooldown state tracking
- No comprehensive documentation for implementing rate limit UX

**Problem**:
1. Developers implementing password reset UX improvements (BUGF-019) need clear guidance on:
   - How Cognito rate limiting works for `forgotPassword` operations
   - What frontend state tracking is required to provide countdown timers
   - How to estimate cooldown duration without Retry-After header from Cognito
   - Where rate limiting UI components should be reused or created

2. Security review (BUGF-026) requires documentation of rate limiting mechanisms for authentication flows to support SEC-003 risk mitigation.

3. No architectural decision record or implementation guide exists for password reset rate limiting, leading to potential inconsistent implementations across auth flows.

**Solution**:
Create a comprehensive implementation guide and specification document at `docs/guides/password-reset-rate-limiting.md` that:
- Documents Cognito's rate limiting behavior for password reset operations
- Specifies frontend state management patterns for tracking reset attempts and cooldown state
- Provides UI/UX patterns for displaying rate limit feedback with countdown timers
- Defines reuse strategy for RateLimitBanner component across auth flows
- Clarifies architectural boundaries (Cognito-managed vs backend-managed rate limiting)
- Includes testing strategy for rate limit scenarios (unit vs E2E vs UAT)

This guide will serve as the reference specification for BUGF-019 implementation and inform security review in BUGF-026.

## Goal

Provide comprehensive implementation guide that prevents password reset abuse through documented rate limiting patterns and enables consistent UX implementation across auth flows.

## Non-Goals

1. **Frontend Implementation**: This story produces a specification/guide document. Actual implementation of countdown timers, button states, and UI improvements is BUGF-019.

2. **Backend API Development**: Password reset is Cognito-managed per ADR-004. No backend rate limiting API or middleware is needed.

3. **Cognito Configuration Changes**: This guide documents existing Cognito behavior. Infrastructure changes to Cognito rate limit settings are out of scope.

4. **Rate Limiting for Other Auth Operations**: Focus is solely on password reset flow. Sign-in, sign-up, and MFA rate limiting are separate concerns.

5. **Global Rate Limiting Strategy**: This is a password-reset-specific guide. Cross-domain rate limiting strategy is out of scope.

## Scope

### Documentation

**New File**:
- `docs/guides/password-reset-rate-limiting.md` - Implementation guide and specification

**Potential Updates** (if needed):
- `docs/flows/auth/forgot-password.md` - Extend with rate limiting section
- `docs/flows/auth/reset-password.md` - Extend with rate limiting section
- `docs/architecture/authentication-system.md` - Add rate limiting subsection

### Referenced Components (Documentation Only)

- `packages/core/upload/src/components/RateLimitBanner/index.tsx` (existing)
- `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` (existing)
- `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` (existing)
- `apps/api/lego-api/middleware/rate-limit.ts` (reference for pattern comparison)

## Acceptance Criteria

- [ ] **AC-1: Document Cognito rate limiting behavior**
  - API call limits per IP/user for `forgotPassword` and `confirmResetPassword`
  - Error response format (LimitExceededException structure)
  - Retry behavior and cooldown duration estimation
  - Differences from backend-managed rate limiting (rate-limit.ts middleware)
  - Explicit statement that Cognito does not provide Retry-After header

- [ ] **AC-2: Specify frontend state management for password reset rate limiting**
  - sessionStorage keys for tracking forgotPassword attempts (`auth:forgotPassword:attempts`, `auth:forgotPassword:lastAttempt`, `auth:forgotPassword:cooldownUntil`)
  - Cooldown calculation algorithm (exponential backoff recommendation: 60s → 120s → 240s → 480s → 600s max)
  - State lifecycle management (reset conditions, expiration handling)
  - Integration pattern with existing ResendCodeButton approach
  - Code examples for sessionStorage read/write operations

- [ ] **AC-3: Define UI/UX patterns for rate limit feedback**
  - When to show RateLimitBanner vs inline error message (show banner on LimitExceededException, inline for validation errors)
  - Countdown timer display requirements (format: "Try again in 2:30", update every second)
  - Button disable states during cooldown (disabled with visual indicator, aria-disabled="true")
  - Accessibility considerations:
    - aria-live="polite" for countdown announcements
    - Screen reader announcements for remaining time (every 30 seconds)
    - prefers-reduced-motion support for timer animations
    - role="alert" for rate limit error messages

- [ ] **AC-4: Provide component reuse strategy**
  - Document RateLimitBanner current location: `packages/core/upload/src/components/RateLimitBanner/index.tsx`
  - Recommend move to `packages/core/app-component-library/feedback/RateLimitBanner` for broader reuse
  - Specify adaptations needed for auth flow use cases:
    - Different messaging (upload timeout vs auth rate limit)
    - Styling variations (error vs warning tone)
    - Props contract for countdown timer and retry callback
  - Document integration points in ForgotPasswordPage and ResetPasswordPage
  - Reference shadcn Alert primitive and `_primitives` import pattern

- [ ] **AC-5: Document architectural boundaries and constraints**
  - Cognito-managed vs backend-managed rate limiting (with comparison table)
  - Why backend API endpoints are not needed for password reset rate limiting (Amplify SDK → Cognito direct)
  - ADR-004 implications for rate limiting strategy (reference Cognito as authoritative auth service)
  - Security considerations:
    - Account enumeration prevention (always show success message regardless of email existence)
    - Rate limit feedback must not leak account existence information
  - Amplify v6 API examples with forgotPassword and confirmResetPassword

- [ ] **AC-6: Include testing strategy for rate limiting**
  - Unit test approach:
    - MSW mocking of Cognito LimitExceededException
    - Code example of MSW handler for forgotPassword rate limit
    - Testing sessionStorage state tracking
  - E2E test scenarios:
    - Playwright test outline for rate limit flow
    - How to trigger rate limiting (multiple rapid requests)
  - UAT requirements:
    - ADR-005 reference: must use real Cognito
    - How to trigger rate limiting in UAT environment (manual or automated rapid requests)
    - Note: Cognito rate limits may differ between dev/staging/prod user pools

## Reuse Plan

### Components to Reference

1. **RateLimitBanner** (`packages/core/upload/src/components/RateLimitBanner/index.tsx`):
   - Existing component with countdown timer functionality
   - Shows remaining time with auto-update
   - Respects prefers-reduced-motion
   - Includes retry button and dismiss functionality
   - **Recommendation**: Move to app-component-library for auth flow reuse

2. **ResendCodeButton** (`apps/web/main-app/src/components/Auth/ResendCodeButton.tsx`):
   - Existing exponential backoff pattern
   - sessionStorage-based attempt tracking
   - Cooldown calculation: `Math.min(600, 60 * Math.pow(2, attemptCount - 1))`
   - **Pattern**: Adapt for forgotPassword retry logic

3. **Rate Limit Middleware** (`apps/api/lego-api/middleware/rate-limit.ts`):
   - Reference for backend rate limiting comparison
   - Sliding window algorithm with in-memory Map
   - **Note**: Not applicable to Cognito operations, but useful for documentation contrast

### Patterns to Document

1. **Account Enumeration Prevention**:
   - From ForgotPasswordPage (lines 78-88, 112-120)
   - Always show success message regardless of email existence
   - Generic error messages for rate limiting

2. **Error Display Pattern**:
   - From authentication-system.md (lines 586-591)
   - Use Alert component with role="alert"
   - Associate errors with inputs via aria-describedby

3. **Exponential Backoff**:
   - From ResendCodeButton implementation
   - Attempt-based cooldown: 60s → 120s → 240s → 480s → 600s max

### Documentation to Extend

- `docs/flows/auth/forgot-password.md` - Add rate limiting section
- `docs/flows/auth/reset-password.md` - Add rate limiting section
- `docs/architecture/authentication-system.md` - Add rate limiting subsection

## Architecture Notes

### Cognito-Managed Rate Limiting

Password reset operations (`forgotPassword`, `confirmResetPassword`) are rate limited by AWS Cognito at the service level. The application does not implement backend rate limiting for these operations.

**Architectural Boundaries** (per ADR-004):
- **Cognito Layer**: Rate limiting enforcement, LimitExceededException responses
- **Frontend Layer**: Error handling, cooldown state tracking, UX feedback
- **Backend Layer**: Not involved in password reset rate limiting

### Frontend State Management

sessionStorage is used for temporary cooldown state tracking:
- `auth:forgotPassword:attempts` - Number of failed attempts
- `auth:forgotPassword:lastAttempt` - Timestamp of last attempt
- `auth:forgotPassword:cooldownUntil` - Calculated cooldown expiration timestamp

State is ephemeral and specific to browser session. Cooldown does not persist across page refreshes (intentional - Cognito enforces service-side limit).

### Component Architecture

RateLimitBanner follows established patterns:
- Built on shadcn Alert primitive (per `_primitives` pattern)
- Token-based Tailwind colors (design system compliance)
- Accessible countdown timer (aria-live regions)
- Reusable across upload and auth flows

## Infrastructure Notes

No infrastructure changes required. This is a documentation story.

## Constraints

1. **Cognito Rate Limit Thresholds**: AWS-managed, not configurable at fine-grained level
2. **No Retry-After Header**: Cognito LimitExceededException does not include retry-after metadata - frontend must estimate cooldown
3. **Account Enumeration Prevention**: Must be maintained in all rate limit messaging
4. **ADR-004**: Password reset is Cognito-managed, no backend API involvement
5. **ADR-005**: UAT tests must use real Cognito, no mocking

## Test Plan

Detailed test plan available at: `_pm/TEST-PLAN.md`

### Scope Summary

- Endpoints touched: None (documentation story)
- UI touched: No
- Data/storage touched: No
- Deliverable: Implementation guide document

### Key Tests

1. **Documentation Completeness**: Verify all 6 ACs addressed
2. **Code Snippet Validity**: TypeScript compilation of all examples
3. **Pattern Consistency**: Alignment with existing ForgotPasswordPage and ResendCodeButton
4. **ADR Compliance**: AC-5 references ADR-004, AC-6 references ADR-005
5. **BUGF-019 Alignment**: Guide provides sufficient implementation guidance

### QA Evidence

- Manual review checklist with all sections complete
- TypeScript compilation output (0 errors)
- Cross-reference validation with BUGF-019 ACs
- Senior engineer review for technical accuracy

## UI/UX Notes

UI/UX notes available at: `_pm/UIUX-NOTES.md`

**Verdict**: SKIPPED - This is a documentation story with no UI implementation.

However, the guide document should address UI/UX patterns for BUGF-019:
- RateLimitBanner component reuse and adaptation
- Accessibility requirements (aria-live, prefers-reduced-motion)
- Button disabled states and visual indicators
- Countdown timer display format and screen reader announcements

## Dev Feasibility

Feasibility review available at: `_pm/DEV-FEASIBILITY.md`

**Feasibility**: Yes (High Confidence)

This is a straightforward documentation story with well-defined scope and no implementation complexity. Estimated effort: 1 point (4-6 hours).

**Change Surface**:
- New file: `docs/guides/password-reset-rate-limiting.md`
- Optional updates to existing auth flow docs

**Risks**: None (MVP-critical). Low risk of guide staleness if Amplify SDK changes (mitigated by version references and quarterly review).

## Reality Baseline

### Existing Features Referenced

| Feature | Location | Status |
|---------|----------|--------|
| Password Reset Flow | `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` | Deployed |
| Password Reset Completion | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` | Deployed |
| Rate Limit Banner Component | `packages/core/upload/src/components/RateLimitBanner/index.tsx` | Deployed |
| Auth Provider | `apps/web/main-app/src/services/auth/AuthProvider.tsx` | Deployed |
| Password Reset Docs | `docs/flows/auth/forgot-password.md`, `reset-password.md` | Documented |

### Active Constraints

1. **Cognito Service-Level Rate Limiting**: Password reset operations are rate limited by Cognito, not application backend
2. **Frontend-Only Flow**: Password reset uses Amplify SDK → Cognito direct, no backend API proxy
3. **Account Enumeration Prevention**: Always show success message regardless of email existence
4. **ADR-004**: Cognito is authoritative auth service
5. **ADR-005**: UAT must use real services

### Related Stories

- **BUGF-019**: Frontend implementation of password reset rate limiting UX (consumes this guide)
- **BUGF-026**: Auth token refresh security review (references rate limiting for SEC-003)

---

**Story generated**: 2026-02-11T17:56:36Z with experiment variant `control`.

**Predictions**: split_risk=0.1, review_cycles=1, token_estimate=80K (low confidence - heuristics-only mode, no similar documentation stories in KB).

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps found | Story scope is complete | — |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | No backend rate limiting documentation for other auth operations | documentation | BUGF-027-GAP-001 |
| 2 | No monitoring/alerting guidance for rate limit abuse patterns | observability | BUGF-027-GAP-002 |
| 3 | No fallback behavior documented for sessionStorage failure | edge-case | BUGF-027-GAP-003 |
| 4 | No guidance on rate limiting for 'Resend code' functionality beyond password reset | pattern-reuse | BUGF-027-GAP-004 |
| 5 | Interactive code examples could be runnable | ux-polish | BUGF-027-ENH-001 |
| 6 | Diagram visual for cooldown calculation algorithm | documentation-polish | BUGF-027-ENH-002 |
| 7 | Comparison table: Cognito vs backend rate limiting | architecture | BUGF-027-ENH-003 |
| 8 | Progressive enhancement for countdown timer | enhancement | BUGF-027-ENH-004 |
| 9 | Internationalization considerations for countdown messages | i18n | BUGF-027-ENH-005 |
| 10 | Dark mode considerations for RateLimitBanner styling | visual-polish | BUGF-027-ENH-006 |
| 11 | Animation guidance for prefers-reduced-motion | accessibility | BUGF-027-ENH-007 |
| 12 | Rate limit banner placement patterns | ux-guidance | BUGF-027-ENH-008 |

### Summary

- ACs added: 0 (story scope is complete)
- KB entries created: 12 (4 gaps + 8 enhancements)
- Mode: autonomous
- Status: Ready to move to ready-to-work

**Elaboration Verdict**: PASS - All 8 audit checks passed. No MVP-critical gaps. Story ready for implementation.
