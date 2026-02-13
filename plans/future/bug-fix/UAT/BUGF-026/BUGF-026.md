---
id: BUGF-026
title: "Auth Token Refresh Security Review"
status: in-qa
priority: P2
phase: 2
feature: bug-fix
story_type: documentation
points: 3
created: 2026-02-11
updated: 2026-02-11
experiment_variant: control
blocks: [BUGF-005]
tags: [security, auth, documentation, review]
---

# BUGF-026: Auth Token Refresh Security Review

## Context

The application currently has a sophisticated token refresh implementation spread across multiple layers:
1. **AuthProvider** (UI layer) - Hub.listen event handling for Amplify auth events
2. **CognitoTokenManager** (client layer) - Token lifecycle management with retry logic and circuit breaker
3. **Auth session services** (backend sync layer) - httpOnly cookie synchronization

Story BUGF-005 proposes consolidating the 6 duplicate `use-module-auth.ts` stubs across apps into a shared @repo/auth-hooks package. However, this consolidation introduces **security risk SEC-002**: "Auth hook consolidation must not consolidate auth state unsafely."

### Existing Implementation

**Authentication Core:**
- `/apps/web/main-app/src/services/auth/AuthProvider.tsx` (685 lines)
  - Hub.listen event handler for tokenRefresh, tokenRefresh_failure, signedOut, signedIn
  - `refreshTokens()` method with session sync
  - Integration with CognitoTokenManager and auth-services

**Token Management:**
- `/packages/core/api-client/src/auth/cognito-integration.ts` (498 lines)
  - CognitoTokenManager class with comprehensive token refresh logic
  - Circuit breaker pattern (opens after 3 consecutive failures)
  - Token expiration buffer (5 minutes default)
  - Retry logic with priority support
  - Performance monitoring and metrics tracking

**Session Services:**
- `/packages/core/auth-services/src/session/index.ts` (161 lines)
  - Backend httpOnly cookie synchronization
  - `setAuthSession()`, `refreshAuthSession()`, `clearAuthSession()`
  - Error handling with Zod schema validation

**Auth Hooks (Existing Shared Package):**
- `/packages/core/auth-hooks/src/useModuleAuth.ts` (147 lines)
- `/packages/core/auth-hooks/src/usePermissions.ts`
- Already exists as @repo/auth-hooks package

### Problem Statement

Before consolidating authentication hooks into a shared package, we need to ensure:
1. Token refresh mechanisms are secure and follow best practices
2. Session/token validation is clearly defined and consistent
3. No security vulnerabilities will be introduced during consolidation
4. The auth hook contract is well-defined with clear security boundaries

The current implementation has good patterns (circuit breaker, retry logic, expiration buffer) but lacks:
- Formal security architecture documentation
- Clear contract definition for auth hooks
- Security acceptance criteria for the consolidation
- Threat model for token refresh flows

### Related Work

- **BUGF-001** (In Elaboration): Presigned URL implementation - has SEC-001 security review requirement
- **BUGF-005** (Backlog, BLOCKED by this story): Create Shared Auth Hooks Package

### Constraints

From BUGF-005 Risk Notes:
- **SEC-002**: Auth hook consolidation must not consolidate auth state unsafely
- Must define clear session/token validation
- Security architecture review required before consolidation
- Cross-cutting change affects 6 apps (main-app, app-dashboard, app-inspiration-gallery, app-instructions-gallery, app-sets-gallery, user-settings)

From Security Review (REVIEW-SECURITY.yaml):
- Current hardcoded auth values are test-only
- Production implementation needs careful handling
- Must define auth hook contract with clear session/token validation

---

## Goal

Conduct a comprehensive security architecture review to **unblock BUGF-005** with clear security guidance, ensuring the auth hook consolidation does not introduce security vulnerabilities in session/token handling.

**Key Deliverable:** `SECURITY-REVIEW.md` document containing:
1. Token refresh architecture documentation and data flows
2. Threat model for token refresh flows
3. Auth hook contract specification with security boundaries
4. Security acceptance criteria for BUGF-005
5. Vulnerability assessment findings and mitigation strategies
6. Security testing requirements for auth consolidation

---

## Non-Goals

- **Not implementing code changes** - This is a review and documentation story only
- **Not fixing existing vulnerabilities** - Identified issues should be logged as follow-up stories if not blocking BUGF-005
- **Not testing the implementation** - Security testing will happen as part of BUGF-005 implementation
- **Not reviewing all auth code** - Focus is specifically on token refresh mechanisms relevant to auth hook consolidation
- **Not reviewing Cognito configuration** - Backend AWS Cognito setup is out of scope; focus on frontend/client-side refresh logic

---

## Scope

### Documentation Deliverables

**Primary Deliverable:**
- `SECURITY-REVIEW.md` in BUGF-026 story folder

**Sections Required:**
1. Token refresh architecture documentation
2. Security-critical decision points mapping
3. Token lifecycle state transitions
4. Threat model matrix (STRIDE methodology)
5. Auth hook contract specification
6. Security acceptance criteria for BUGF-005
7. Vulnerability findings and recommended mitigations

### Related Endpoints

- `POST /auth/session` - Set auth session (httpOnly cookie)
- `POST /auth/refresh` - Refresh auth session
- `POST /auth/logout` - Clear auth session
- `GET /auth/status` - Check session status

### Code Areas to Review

**Security-Critical Components:**
- `/apps/web/main-app/src/services/auth/AuthProvider.tsx`
- `/packages/core/api-client/src/auth/cognito-integration.ts`
- `/packages/core/auth-services/src/session/index.ts`
- `/packages/core/auth-hooks/src/useModuleAuth.ts`
- `/packages/core/auth-hooks/src/usePermissions.ts`

**Test Coverage:**
- `/apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
- `/apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx`
- `/packages/core/auth-hooks/src/__tests__/useModuleAuth.test.tsx`

---

## Acceptance Criteria

- [ ] **AC-1: Token refresh architecture documented**
  - Document current flow: Hub.listen → refreshTokens() → CognitoTokenManager → backend session sync
  - Identify security-critical decision points (when to refresh, when to fail, when to clear tokens)
  - Map token lifecycle states and transitions
  - Include sequence diagram or architecture diagram

- [ ] **AC-2: Threat model created for token refresh flows**
  - Identify attack vectors using STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
  - Document current mitigations (httpOnly cookies, token expiration, circuit breaker)
  - Identify gaps or weaknesses in current implementation
  - Create threat model matrix with severity ratings

- [ ] **AC-3: Auth hook contract specification defined**
  - Define clear interface for shared auth hooks with TypeScript types or Zod schemas
  - Specify session/token validation requirements
  - Document error handling and fallback behavior
  - Define state synchronization requirements across apps
  - Include code examples of expected usage patterns

- [ ] **AC-4: Security acceptance criteria established for BUGF-005**
  - Define security testing requirements for auth consolidation (unit tests, integration tests, E2E tests)
  - Specify integration test scenarios for token refresh edge cases (concurrent refresh, circuit breaker, expiration races)
  - Document rollback criteria if security issues discovered during BUGF-005 implementation
  - Define "definition of done" for BUGF-005 security requirements

- [ ] **AC-5: Vulnerability assessment completed**
  - Review CognitoTokenManager for security issues (token storage, refresh logic, retry behavior)
  - Review Hub.listen event handling for race conditions and concurrent refresh attempts
  - Review backend session sync for CSRF/XSS vulnerabilities
  - Document findings with severity ratings (Critical, High, Medium, Low)
  - Provide recommended mitigations for each identified vulnerability

- [ ] **AC-6: Security review documentation published**
  - Create `SECURITY-REVIEW.md` in BUGF-026 story folder
  - Include all sections from AC-1 through AC-5
  - Architecture diagrams for token refresh flow (Mermaid or similar)
  - Threat model matrix in table format
  - Auth hook contract specification with code examples
  - Security acceptance criteria for BUGF-005 in measurable format
  - Vulnerability findings and mitigations with priority levels
  - Peer review completed by security-focused engineer or external consultant

---

## Reuse Plan

### Documentation Templates

**REVIEW-SECURITY.yaml** ✅
- Location: Epic elaboration output
- Use as template for security findings format
- Adapt structure for SECURITY-REVIEW.md

**SEC-001, SEC-002, SEC-003 Risk Documentation** ✅
- Pattern for documenting security risks and mitigations
- Follow same structure for new risks identified in this review

### Analysis Tools

**Existing Test Files** ✅
- Use to understand current behavior expectations
- AuthProvider.test.tsx, AuthStateSync.integration.test.tsx, useModuleAuth.test.tsx
- Identify gaps in security test coverage

**CognitoTokenManager Metrics** ✅
- Leverage existing metrics tracking to understand refresh patterns
- totalRefreshAttempts, successfulRefreshes, failedRefreshes, consecutiveFailures

### Patterns to Reference

**Circuit Breaker Pattern** ✅
- Location: `/packages/core/api-client/src/auth/cognito-integration.ts`
- Opens after 3 consecutive failures
- Prevents cascading auth failures and DoS attacks
- Document as security mitigation in threat model

**Hub.listen Event Handling** ✅
- Location: `/apps/web/main-app/src/services/auth/AuthProvider.tsx`
- Centralized event listener for auth events
- Threat model should analyze race conditions

**Token Expiration Buffer** ✅
- 5-minute default buffer before token expiration
- Proactive refresh prevents mid-request auth failures
- Include in auth hook contract as required behavior

**Error Handling Pattern** ✅
- Location: `/packages/core/auth-services/src/session/index.ts`
- Use Zod schemas for response validation
- Log warnings but don't fail on non-critical errors
- Clear tokens on refresh failure

**Concurrent Refresh Prevention** ✅
- `refreshPromise` pattern prevents multiple simultaneous refresh attempts
- Returns existing promise if refresh already in progress
- Critical for preventing race conditions

---

## Architecture Notes

### Token Refresh Flow

```
User Action / Token Expiration
  ↓
Hub.listen Event (tokenRefresh)
  ↓
AuthProvider.refreshTokens()
  ↓
CognitoTokenManager.refreshTokens()
  ↓
  ├─ Circuit Breaker Check
  ├─ Expiration Buffer Check (5 min)
  ├─ Concurrent Refresh Prevention
  ├─ Amplify Auth.currentSession()
  └─ Retry Logic (exponential backoff)
  ↓
Backend Session Sync (auth-services)
  ↓
  ├─ POST /auth/refresh
  ├─ httpOnly Cookie Update
  └─ Zod Response Validation
  ↓
Redux State Update
  ↓
UI Re-renders with Fresh Auth State
```

### Security-Critical Decision Points

1. **When to Refresh:**
   - Token expiration buffer (5 minutes before expiry)
   - Hub.listen tokenRefresh event
   - Manual refresh on auth failure

2. **When to Fail:**
   - Circuit breaker open (3 consecutive failures)
   - Backend session sync error
   - Invalid token response from Cognito

3. **When to Clear Tokens:**
   - tokenRefresh_failure event
   - signedOut event
   - Explicit logout

### Existing Security Mitigations

- **httpOnly Cookies**: Prevents XSS token theft
- **Circuit Breaker**: Prevents DoS from excessive refresh attempts
- **Token Expiration Buffer**: Reduces race conditions
- **Zod Schema Validation**: Ensures response integrity
- **Concurrent Refresh Prevention**: Prevents race conditions from simultaneous refresh attempts
- **Metrics Tracking**: Enables observability and anomaly detection

---

## Infrastructure Notes

### Required Access

- ✅ Codebase access (main-app, packages/core/api-client, packages/core/auth-services, packages/core/auth-hooks)
- ✅ Test suite access
- ⚠️ AWS Cognito configuration (if needed for backend review - marked as out of scope)
- ⚠️ Security review tools (SAST tools like Snyk, Semgrep) - optional but recommended

### Security Review Tools (Optional)

**SAST Tools:**
- Snyk for dependency vulnerability scanning
- Semgrep for code pattern analysis
- ESLint security plugins for JS/TS code

**Threat Modeling:**
- OWASP Threat Dragon (open-source)
- Microsoft Threat Modeling Tool

**Reference Standards:**
- OWASP ASVS (Application Security Verification Standard) - Sections V2 (Authentication), V3 (Session Management)
- OWASP Top 10 - A01:2021 Broken Access Control, A07:2021 Identification and Authentication Failures
- AWS Cognito Security Best Practices

---

## Test Plan

### Story Type: Documentation/Security Review

This is a documentation and security architecture review story, not an implementation story. Therefore, no traditional test plan is required.

### Security Review Validation

The security review deliverable (SECURITY-REVIEW.md) should be validated through:

1. **Completeness Check:**
   - All 6 acceptance criteria addressed
   - Architecture diagrams present
   - Threat model matrix complete
   - Auth hook contract specification defined
   - Security acceptance criteria for BUGF-005 documented
   - Vulnerability findings and mitigations documented

2. **Peer Review:**
   - Security-focused engineer review
   - External security consultant review (if available)

3. **BUGF-005 Unblocking Criteria:**
   - Security review addresses SEC-002 risk
   - Auth hook contract is clear and implementable
   - Security acceptance criteria for BUGF-005 are measurable

### Success Criteria

- [ ] SECURITY-REVIEW.md passes completeness check
- [ ] SECURITY-REVIEW.md reviewed by security-focused engineer
- [ ] BUGF-005 can proceed with security guidance from this review
- [ ] No blocking security vulnerabilities identified without mitigation plan

### Test Coverage Target

N/A - Documentation story

---

## Dev Feasibility

**Status:** ✅ Feasible
**Estimated Effort:** 2-3 days (24-34 hours)
**Complexity:** High (security domain expertise required)

### Time Breakdown

- **Architecture Documentation:** 4-6 hours (diagram creation, flow documentation)
- **Threat Modeling:** 6-8 hours (STRIDE analysis, attack vector identification, mitigation review)
- **Auth Hook Contract Spec:** 4-6 hours (interface definition, example code, validation rules)
- **Vulnerability Assessment:** 6-8 hours (code review, test coverage analysis, gap identification)
- **Documentation Writing:** 4-6 hours (SECURITY-REVIEW.md creation, peer review incorporation)

### Domain Knowledge Required

- **AWS Cognito**: Understanding of token lifecycle, refresh flows, and Amplify Hub events
- **Security**: OWASP guidelines, STRIDE threat modeling, session management best practices
- **React State Management**: Redux integration, concurrent state updates
- **httpOnly Cookies**: CSRF protection, XSS mitigation, cookie security

### Recommended Reviewer Profile

**Must Have:**
- 3+ years experience with authentication/authorization systems
- Familiarity with AWS Cognito or similar identity providers
- Security review experience (threat modeling, vulnerability assessment)

**Nice to Have:**
- CISSP, CEH, or similar security certification
- Prior React/Redux auth implementation experience
- Amplify Hub event system knowledge

### Risks and Mitigations

**Risk 1: Lack of Security Expertise**
- **Mitigation:** Involve external security consultant if internal expertise unavailable; Use OWASP ASVS as checklist; Reference AWS Cognito security best practices

**Risk 2: Incomplete Threat Model**
- **Mitigation:** Use STRIDE methodology systematically; Review OWASP Top 10; Include peer review by second security-focused engineer

**Risk 3: Documentation Not Actionable for BUGF-005**
- **Mitigation:** Include specific acceptance criteria with measurable outcomes; Provide code examples; Define clear "definition of done"

### Blockers

**None identified.** This story is ready to proceed.

---

## Risk Predictions

### Split Risk: Low (0.1)

Story is well-scoped as a security architecture review with clear deliverable (SECURITY-REVIEW.md). All 6 ACs are documentation-focused and achievable within 2-3 days. No implementation work required, reducing scope creep risk.

### Review Cycles: 2-3 estimated

Security reviews typically require peer review and iteration.
- Expected cycle 1: Initial draft
- Expected cycle 2: Security expert feedback incorporation
- Possible cycle 3 if significant gaps identified

### Token Cost: 8,000-15,000 tokens

Documentation and analysis story.
- Phase 1: Architecture documentation (~3k tokens)
- Phase 2: Threat modeling (~4k tokens)
- Phase 3: Contract spec and vulnerability assessment (~5k tokens)
- Phase 4: Documentation writing (~3k tokens)

### Unblocks

- **BUGF-005** (high confidence): Primary blocker removal - security review must be complete before auth hook consolidation

### Introduced Risks

- **SEC-004** (low severity): Incomplete security review may provide false confidence for BUGF-005
  - **Mitigation:** Require external security consultant review if internal expertise insufficient

### Fallback Plan

If security review identifies blocking vulnerabilities:
1. Create follow-up stories to fix identified issues
2. BUGF-005 remains blocked until mitigations implemented
3. Update BUGF-005 security acceptance criteria based on findings

If external security consultant unavailable:
1. Use OWASP ASVS as self-review checklist
2. Run automated SAST tools for vulnerability detection
3. Peer review by most senior available engineer
4. Accept higher risk and document gaps for future review

---

## Reality Baseline

### Existing Features (Deployed)

| Feature | Location | Status |
|---------|----------|--------|
| AuthProvider with token refresh | `/apps/web/main-app/src/services/auth/AuthProvider.tsx` | Deployed - Hub.listen handles tokenRefresh events |
| CognitoTokenManager | `/packages/core/api-client/src/auth/cognito-integration.ts` | Deployed - Enhanced token manager with retry logic, circuit breaker, expiration buffer |
| Auth session sync services | `/packages/core/auth-services/src/session/index.ts` | Deployed - httpOnly cookie sync with backend |
| useModuleAuth hook (shared) | `/packages/core/auth-hooks/src/useModuleAuth.ts` | Deployed - Module-level auth hook |
| usePermissions hook (shared) | `/packages/core/auth-hooks/src/usePermissions.ts` | Deployed - Permission checking |

### Related Endpoints (Deployed)

- `POST /auth/session` - Set auth session (httpOnly cookie)
- `POST /auth/refresh` - Refresh auth session
- `POST /auth/logout` - Clear auth session
- `GET /auth/status` - Check session status

### Active In-Progress Work

| Story | Status | Relevance |
|-------|--------|-----------|
| BUGF-001 | In Elaboration | Presigned URL implementation - has SEC-001 security review requirement for S3 scope enforcement |
| BUGF-005 | Backlog (Blocked by BUGF-026) | Create Shared Auth Hooks Package - DIRECTLY BLOCKED by this security review |

### Protected Features

None - this is a documentation and review story that does not modify existing functionality.

### Established Patterns to Follow

1. **Token Refresh Pattern** (AuthProvider.tsx):
   - Use Hub.listen for Amplify auth events
   - Handle tokenRefresh, tokenRefresh_failure separately
   - Sync with backend session on refresh
   - Update both Redux state and CognitoTokenManager

2. **Retry and Circuit Breaker Pattern** (CognitoTokenManager):
   - Implement retry logic with exponential backoff
   - Circuit breaker opens after 3 consecutive failures
   - Track metrics: totalRefreshAttempts, successfulRefreshes, failedRefreshes, consecutiveFailures

3. **Token Expiration Buffer** (CognitoTokenManager):
   - Default 5-minute buffer before actual expiration
   - Proactive refresh to prevent auth failures mid-request
   - `isTokenExpiredOrExpiringSoon()` method for intelligent checking

4. **Error Handling Pattern** (auth-services):
   - Use Zod schemas for response validation
   - Log warnings but don't fail on non-critical errors (e.g., session sync)
   - Clear tokens on refresh failure

5. **Concurrent Refresh Prevention** (CognitoTokenManager):
   - `refreshPromise` pattern prevents multiple simultaneous refresh attempts
   - Returns existing promise if refresh already in progress

### Constraints to Respect

From BUGF-005 Risk Notes:
- **SEC-002**: Auth hook consolidation must not consolidate auth state unsafely
- Must define clear session/token validation
- Security architecture review required before consolidation
- Cross-cutting change affects 6 apps

From Security Review (REVIEW-SECURITY.yaml):
- Current hardcoded auth values are test-only
- Production implementation needs careful handling
- Must define auth hook contract with clear session/token validation

---

## Definition of Done

- [ ] All 6 acceptance criteria completed
- [ ] SECURITY-REVIEW.md created in BUGF-026 story folder
- [ ] Architecture diagrams included (Mermaid or similar)
- [ ] Threat model matrix completed using STRIDE methodology
- [ ] Auth hook contract specification defined with code examples
- [ ] Security acceptance criteria for BUGF-005 documented
- [ ] Vulnerability assessment completed with severity ratings
- [ ] Recommended mitigations documented for all identified vulnerabilities
- [ ] Peer review by security-focused engineer completed
- [ ] BUGF-005 unblocked with actionable security guidance
- [ ] Documentation merged to main branch
- [ ] BUGF-005 team briefed on security requirements

---

## Notes

This is a **documentation and security architecture review story**, not an implementation story. The primary deliverable is a comprehensive security review document that will unblock BUGF-005 and ensure safe consolidation of auth hooks.

The success of this story depends heavily on involving an engineer with security domain expertise. If internal expertise is insufficient, engage an external security consultant to ensure thorough threat modeling and vulnerability assessment.

**Key Success Factors:**
1. Use STRIDE methodology for systematic threat modeling
2. Leverage OWASP ASVS and AWS Cognito security best practices
3. Make security acceptance criteria for BUGF-005 measurable and testable
4. Include architecture diagrams for visual communication
5. Provide code examples in auth hook contract specification

**Timeline:**
- Start: When BUGF-026 moves to "ready-to-work" or "in-progress"
- Duration: 2-3 days
- Completion: SECURITY-REVIEW.md published and peer-reviewed
- BUGF-005 Unblock: Immediately upon completion

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

None—story is documentation-focused with no MVP-critical gaps identified.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | Token expiration buffer (5 min) not configurable per environment | configuration | BUGF-026-KB-001 |
| 2 | Circuit breaker threshold (3 failures) is hardcoded | configuration | BUGF-026-KB-002 |
| 3 | No explicit documentation of Hub.listen race condition mitigation | documentation | BUGF-026-KB-003 |
| 4 | Backend session sync error handling could be more granular | error-handling | BUGF-026-KB-004 |
| 5 | No monitoring/alerting on circuit breaker opens | monitoring | BUGF-026-KB-005 |
| 6 | Token metrics tracking not exposed to UI/dashboard | ui | BUGF-026-KB-006 |
| 7 | No explicit session replay attack protection documented | security | BUGF-026-KB-007 |
| 8 | Refresh token rotation strategy not documented | documentation | BUGF-026-KB-008 |
| 9 | No explicit documentation of CSRF protection for session sync endpoints | security | BUGF-026-KB-009 |
| 10 | Edge case: Network failure during token refresh in progress | edge-case | BUGF-026-KB-010 |
| 11 | Automated security testing in CI/CD | security-testing | BUGF-026-KB-011 |
| 12 | Security testing framework for token refresh flows | testing | BUGF-026-KB-012 |
| 13 | Token refresh observability dashboard | observability | BUGF-026-KB-013 |
| 14 | Security incident response playbook | operations | BUGF-026-KB-014 |
| 15 | Proactive token refresh optimization | performance | BUGF-026-KB-015 |
| 16 | Token refresh simulation testing | testing | BUGF-026-KB-016 |
| 17 | Auth hook contract Zod schema (for BUGF-005 implementation) | code-quality | BUGF-026-KB-017 |
| 18 | Security review automation | automation | BUGF-026-KB-018 |
| 19 | Token lifecycle visualization | documentation | BUGF-026-KB-019 |
| 20 | Cross-tab session sync documentation | documentation | BUGF-026-KB-020 |

### Summary

- **ACs Added:** 0
- **KB Entries Created:** 20
- **Mode:** autonomous
- **Verdict:** PASS
- **Status:** All audit checks passed, ready to move to ready-to-work

---

**Story Status:** ready-to-work
**Points:** 3
**Phase:** 2 (Cross-App Infrastructure)
**Blocks:** BUGF-005
**Experiment Variant:** control
