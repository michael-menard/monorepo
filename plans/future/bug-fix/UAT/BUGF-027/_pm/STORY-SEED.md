---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-027

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file found at expected path. Proceeding with codebase scanning and ADR analysis.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Password Reset Flow | `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` | Deployed | Handles LimitExceededException from Cognito |
| Password Reset Completion | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` | Deployed | Includes resend code functionality |
| Rate Limit Middleware | `apps/api/lego-api/middleware/rate-limit.ts` | Deployed | Implements brute-force protection for 401/403 responses |
| Rate Limit Banner Component | `packages/core/upload/src/components/RateLimitBanner/index.tsx` | Deployed | Shows countdown timer for rate limit expiration |
| Auth Provider | `apps/web/main-app/src/services/auth/AuthProvider.tsx` | Deployed | Integrates with AWS Cognito via Amplify v6 |
| Password Reset Flow Documentation | `docs/flows/auth/forgot-password.md`, `docs/flows/auth/reset-password.md` | Documented | Comprehensive flow documentation with UX gaps noted |

### Active In-Progress Work

| Story ID | Title | Status | Overlap Risk |
|----------|-------|--------|--------------|
| BUGF-032 | Frontend Integration for Presigned URL Upload | in-progress | Low - different domain (upload vs auth) |
| BUGF-006 | Replace Console Usage with @repo/logger | in-progress | Low - logging infrastructure story |

### Constraints to Respect

1. **AWS Cognito Rate Limiting**: Password reset code generation (`forgotPassword`) is rate limited by Cognito service, not application backend
2. **Frontend-Only Implementation**: Current password reset flow is entirely frontend (Amplify SDK → Cognito), no backend API involvement
3. **Security Pattern**: Account enumeration prevention requires always showing success message regardless of email existence
4. **Existing Error Handling**: `LimitExceededException` already caught and displayed as "Too many attempts. Please try again later."
5. **Related Story**: BUGF-019 covers frontend UX improvements (countdown timers, button states) while this story focuses on implementation guide

---

## Retrieved Context

### Related Endpoints

**Backend Endpoints**: None - Password reset is direct Cognito integration via Amplify SDK

**Cognito Operations**:
- `resetPassword({ username: email })` - Triggers code generation
- `confirmResetPassword(username, code, newPassword)` - Completes reset

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| ForgotPasswordPage | `apps/web/main-app/src/routes/pages/ForgotPasswordPage.tsx` | Initiates password reset, handles LimitExceededException |
| ResetPasswordPage | `apps/web/main-app/src/routes/pages/ResetPasswordPage.tsx` | Completes password reset with code validation |
| AuthProvider | `apps/web/main-app/src/services/auth/AuthProvider.tsx` | Wraps Amplify auth methods |
| ResendCodeButton | `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` | Implements exponential backoff for resend operations |
| RateLimitBanner | `packages/core/upload/src/components/RateLimitBanner/index.tsx` | Reusable rate limit UI component with countdown |

### Reuse Candidates

1. **RateLimitBanner Component**: Already exists in `packages/core/upload/src/components/RateLimitBanner/index.tsx`
   - Shows countdown timer
   - Respects `prefers-reduced-motion`
   - Includes retry button and dismiss functionality
   - **Requires**: Move to `packages/core/app-component-library` for broader reuse across auth flows

2. **ResendCodeButton Pattern**: Implements exponential backoff with attempt tracking
   - Uses sessionStorage for state persistence
   - Calculates cooldown dynamically based on attempt count
   - Could be adapted for forgotPassword retry logic

3. **Rate Limit Middleware Pattern**: `apps/api/lego-api/middleware/rate-limit.ts`
   - Sliding window algorithm
   - In-memory store (Map-based)
   - Includes cleanup routines
   - **Not directly applicable**: Password reset is Cognito-managed, but pattern is useful for documentation

---

## Knowledge Context

### Lessons Learned

No Knowledge Base lessons loaded (KB search not performed for backlog seed generation).

### Blockers to Avoid

Based on codebase analysis:
1. **Cognito vs Backend Confusion**: Password reset rate limiting happens at Cognito service level, not application backend API
2. **Duplicate Implementation**: RateLimitBanner already exists but in wrong package location (upload package vs app-component-library)
3. **Missing Retry-After Header**: Cognito LimitExceededException does not provide Retry-After value - frontend must estimate cooldown
4. **State Persistence Gap**: ResendCodeButton uses sessionStorage for cooldown state, but ForgotPasswordPage does not track forgotPassword attempts

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-004 | Authentication Architecture | Use AWS Cognito with Amplify v6 for auth operations |
| ADR-005 | Testing Strategy - UAT Must Use Real Services | UAT tests must use real Cognito, no mocking |

**Relevant ADR Constraints**:
- **ADR-004**: Password reset is Cognito-managed. Backend API is not involved in password reset flow. Implementation guide must clarify this architectural boundary.
- **ADR-005**: Any testing recommendations must distinguish between unit tests (MSW allowed) and UAT (real Cognito required).

### Patterns to Follow

1. **Account Enumeration Prevention**: Always show success message (see ForgotPasswordPage lines 78-88, 112-120)
2. **Error Display Pattern**: Use Alert component with role="alert" for accessibility (see authentication-system.md lines 586-591)
3. **Session Storage for State**: Use `sessionStorage` for temporary state like pending email or cooldown tracking
4. **Exponential Backoff**: ResendCodeButton implements attempt-based cooldown calculation (60s → 120s → 240s → 480s → 600s max)
5. **Frontend-Only Auth**: Amplify SDK directly calls Cognito, no backend proxy needed

### Patterns to Avoid

1. **Backend API for Password Reset**: Do not create backend endpoints for forgotPassword or confirmResetPassword - these are Cognito direct operations
2. **Retry-After Header Assumptions**: Cognito LimitExceededException does not include retry-after metadata - must calculate estimate
3. **Global Rate Limiting Middleware**: Backend rate-limit.ts middleware does not apply to Cognito operations
4. **Over-Engineering**: Story is a guide/specification, not implementation. BUGF-019 handles actual frontend implementation.

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title

Rate Limiting Implementation Guide for Password Reset

### Description

**Context**: The password reset flow (forgot password → reset with code) currently handles Cognito's `LimitExceededException` with a basic error message. However, there is no comprehensive specification for rate limiting behavior, frontend feedback mechanisms, or integration patterns between Cognito's built-in rate limiting and the application's user experience layer.

**Problem**:
1. Developers implementing password reset UX improvements (BUGF-019) need clear guidance on:
   - How Cognito rate limiting works for `forgotPassword` operations
   - What frontend state tracking is required to provide countdown timers
   - How to estimate cooldown duration without Retry-After header from Cognito
   - Where rate limiting UI components should be reused or created

2. Security review (BUGF-026) requires documentation of rate limiting mechanisms for authentication flows to support SEC-003 risk mitigation.

3. No architectural decision record or implementation guide exists for password reset rate limiting, leading to potential inconsistent implementations across auth flows.

**Solution Direction**:
Create a comprehensive implementation guide and specification document that:
- Documents Cognito's rate limiting behavior for password reset operations
- Specifies frontend state management patterns for tracking reset attempts and cooldown state
- Provides UI/UX patterns for displaying rate limit feedback with countdown timers
- Defines reuse strategy for RateLimitBanner component across auth flows
- Clarifies architectural boundaries (Cognito-managed vs backend-managed rate limiting)
- Includes testing strategy for rate limit scenarios (unit vs E2E vs UAT)

This guide will serve as the reference specification for BUGF-019 implementation and inform security review in BUGF-026.

### Initial Acceptance Criteria

- [ ] AC-1: Document Cognito rate limiting behavior for `forgotPassword` and `confirmResetPassword` operations
  - API call limits per IP/user
  - Error response format (LimitExceededException)
  - Retry behavior and cooldown duration
  - Differences from backend-managed rate limiting (rate-limit.ts)

- [ ] AC-2: Specify frontend state management for password reset rate limiting
  - sessionStorage keys for tracking forgotPassword attempts
  - Cooldown calculation algorithm (exponential backoff recommendation)
  - State lifecycle management (reset conditions, expiration)
  - Integration with existing ResendCodeButton pattern

- [ ] AC-3: Define UI/UX patterns for rate limit feedback
  - When to show RateLimitBanner vs inline error message
  - Countdown timer display requirements
  - Button disable states during cooldown
  - Accessibility considerations (ARIA live regions, screen reader announcements)

- [ ] AC-4: Provide component reuse strategy
  - Move RateLimitBanner from `packages/core/upload` to `packages/core/app-component-library`
  - Adapt RateLimitBanner for auth flow use cases (different styling/messaging)
  - Document integration points in ForgotPasswordPage and ResetPasswordPage

- [ ] AC-5: Document architectural boundaries and constraints
  - Cognito-managed vs backend-managed rate limiting
  - Why backend API endpoints are not needed for password reset rate limiting
  - ADR-004 implications for rate limiting strategy
  - Security considerations (account enumeration prevention)

- [ ] AC-6: Include testing strategy for rate limiting
  - Unit test approach with MSW mocking of Cognito LimitExceededException
  - E2E test scenarios for rate limit flow (Playwright)
  - UAT requirements (ADR-005: must use real Cognito)
  - How to trigger rate limiting in test environments

### Non-Goals

1. **Frontend Implementation**: This story produces a specification/guide document. Actual implementation of countdown timers, button states, and UI improvements is BUGF-019.

2. **Backend API Development**: Password reset is Cognito-managed. No backend rate limiting API or middleware is needed.

3. **Cognito Configuration Changes**: This guide documents existing Cognito behavior. Infrastructure changes to Cognito rate limit settings are out of scope.

4. **Rate Limiting for Other Auth Operations**: Focus is solely on password reset flow. Sign-in, sign-up, and MFA rate limiting are separate concerns.

5. **Global Rate Limiting Strategy**: This is a password-reset-specific guide. Cross-domain rate limiting strategy is out of scope.

### Reuse Plan

- **Components**:
  - `RateLimitBanner` from `packages/core/upload/src/components/RateLimitBanner/index.tsx` (requires relocation)
  - `ResendCodeButton` pattern from `apps/web/main-app/src/components/Auth/ResendCodeButton.tsx` (reference for cooldown logic)

- **Patterns**:
  - Exponential backoff algorithm from ResendCodeButton (attempt-based cooldown calculation)
  - Account enumeration prevention pattern from ForgotPasswordPage
  - Error display pattern from authentication-system.md

- **Documentation**:
  - `docs/flows/auth/forgot-password.md` and `reset-password.md` (extend with rate limiting section)
  - `docs/architecture/authentication-system.md` (add rate limiting subsection)
  - `apps/api/lego-api/middleware/rate-limit.ts` (reference pattern for backend rate limiting comparison)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

1. **Unit Testing Focus**:
   - Test guide document examples/code snippets are syntactically valid
   - If guide includes reference implementations, ensure they are unit testable
   - No runtime testing required for guide document itself

2. **E2E/UAT Considerations**:
   - Guide should include testing strategy section that references ADR-005
   - Document how to trigger Cognito rate limiting in test environments
   - Specify MSW mock patterns for unit testing LimitExceededException

3. **Test Coverage**:
   - This is a documentation story, so "tests" verify documentation quality, not code coverage
   - Consider QA verification: does guide provide all information needed to implement BUGF-019?

### For UI/UX Advisor

1. **UX Patterns**:
   - Guide should include mockups or wireframes for rate limit feedback UI
   - Countdown timer display should follow Material Design or existing design system patterns
   - Consider accessibility of rate limit feedback (screen readers, keyboard nav)

2. **Component Design**:
   - RateLimitBanner may need visual variations for auth flows vs upload flows
   - Button disabled states during cooldown should be visually clear
   - Consider error vs warning styling for rate limit messages

3. **User Flow**:
   - Guide should document user journey through rate limit scenario
   - Include recovery path: what happens after cooldown expires?
   - Consider edge cases: user switches tabs during cooldown, page refresh, etc.

4. **Cross-Reference**:
   - Coordinate with BUGF-019 (frontend implementation) to ensure guide aligns with actual UX requirements

### For Dev Feasibility

1. **Architectural Clarity**:
   - Guide must clearly distinguish Cognito rate limiting (service-managed) from backend rate limiting (application-managed)
   - Document why backend API is not involved in password reset rate limiting

2. **Implementation Complexity**:
   - Moving RateLimitBanner to app-component-library is straightforward but requires package updates
   - sessionStorage state management pattern already proven in ResendCodeButton
   - No API development required - purely frontend concerns

3. **Dependencies**:
   - Guide should reference BUGF-019 as consumer of this specification
   - Consider coordination with BUGF-026 (security review) for security-related guidance

4. **Constraints**:
   - Cognito rate limit thresholds are AWS-managed and not configurable at fine-grained level
   - Retry-After header not provided by Cognito - frontend must estimate cooldown
   - Account enumeration prevention must be maintained (always show success message)

5. **Technical Risks**:
   - Low risk: guide is documentation, not code
   - Medium risk: if guide includes code examples, they must be validated against actual Amplify/Cognito behavior
   - Mitigation: include working code snippets from existing ForgotPasswordPage implementation

---

## Output Metadata

**Story Complexity**: Low (documentation/specification story)

**Estimated Effort**: 1 point (4-6 hours)
- 2 hours: Research Cognito rate limiting behavior and document API limits
- 2 hours: Draft specification sections (state management, UI patterns, testing strategy)
- 1-2 hours: Review and integrate with existing docs, create diagrams if needed

**Key Deliverable**: Implementation guide document at `docs/guides/password-reset-rate-limiting.md` or similar location

**Success Criteria**: Guide provides sufficient detail for BUGF-019 implementation without ambiguity. Security review (BUGF-026) can reference guide for rate limiting evaluation.

---

STORY-SEED COMPLETE
