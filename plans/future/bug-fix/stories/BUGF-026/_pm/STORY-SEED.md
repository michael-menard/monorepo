---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-026

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file found - proceeding with codebase scanning and existing documentation

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| AuthProvider with token refresh | /apps/web/main-app/src/services/auth/AuthProvider.tsx | Deployed - Hub.listen handles tokenRefresh events |
| CognitoTokenManager | /packages/core/api-client/src/auth/cognito-integration.ts | Deployed - Enhanced token manager with retry logic, circuit breaker, expiration buffer |
| Auth session sync services | /packages/core/auth-services/src/session/index.ts | Deployed - httpOnly cookie sync with backend |
| useModuleAuth hook (shared) | /packages/core/auth-hooks/src/useModuleAuth.ts | Deployed - Module-level auth hook |
| usePermissions hook (shared) | /packages/core/auth-hooks/src/usePermissions.ts | Deployed - Permission checking |

### Active In-Progress Work

| Story | Status | Relevance |
|-------|--------|-----------|
| BUGF-001 | In Elaboration | Presigned URL implementation - has SEC-001 security review requirement for S3 scope enforcement |
| BUGF-005 | Backlog (Blocked by BUGF-026) | Create Shared Auth Hooks Package - DIRECTLY BLOCKED by this security review |

### Constraints to Respect

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

## Retrieved Context

### Related Endpoints
- `POST /auth/session` - Set auth session (httpOnly cookie)
- `POST /auth/refresh` - Refresh auth session
- `POST /auth/logout` - Clear auth session
- `GET /auth/status` - Check session status

### Related Components

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
- `/packages/core/auth-hooks/src/usePermissions.ts` (estimated ~200 lines)
- Already exists as @repo/auth-hooks package

**Test Coverage:**
- `/apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`
- `/apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx`
- `/packages/core/auth-hooks/src/__tests__/useModuleAuth.test.tsx`

### Reuse Candidates

**Documentation Templates:**
- Security review structure from REVIEW-SECURITY.yaml
- Risk mitigation pattern from SEC-001, SEC-002, SEC-003 documentation

**Testing Patterns:**
- Auth integration test patterns from AuthStateSync.integration.test.tsx
- Hook testing patterns from useModuleAuth.test.tsx

**Relevant Packages:**
- @repo/logger - Already used throughout auth code
- Zod schemas - Already used for session validation

---

## Knowledge Context

### Lessons Learned
No lesson-learned entries found (no KB search performed - agent limitation).

### Blockers to Avoid (from past stories)
- Unknown - no baseline with lessons loaded

### Architecture Decisions (ADRs)
No ADR-LOG.md file found in repository.

### Patterns to Follow

**From existing codebase analysis:**

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

### Patterns to Avoid
- Unknown - no baseline with anti-patterns loaded

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Auth Token Refresh Security Review

### Description

**Context:**
The application currently has a sophisticated token refresh implementation spread across multiple layers:
1. AuthProvider (UI layer) - Hub.listen event handling
2. CognitoTokenManager (client layer) - Token lifecycle management with retry/circuit breaker
3. Auth session services (backend sync layer) - httpOnly cookie synchronization

Story BUGF-005 proposes consolidating the 6 duplicate `use-module-auth.ts` stubs across apps into a shared @repo/auth-hooks package. However, this consolidation introduces security risk SEC-002: "Auth hook consolidation must not consolidate auth state unsafely."

**Problem Statement:**
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

**Proposed Solution Direction:**
Conduct a comprehensive security architecture review that:
1. Documents the current token refresh architecture and data flows
2. Identifies security-critical decision points in the refresh flow
3. Defines a secure auth hook contract with clear responsibilities
4. Establishes security acceptance criteria for BUGF-005
5. Identifies potential vulnerabilities and mitigation strategies
6. Creates security testing requirements for auth consolidation

This is a documentation and analysis story, not an implementation story. The output will unblock BUGF-005 with clear security guidance.

### Initial Acceptance Criteria

- [ ] AC-1: Token refresh architecture documented
  - Document current flow: Hub.listen → refreshTokens() → CognitoTokenManager → backend session sync
  - Identify security-critical decision points (when to refresh, when to fail, when to clear tokens)
  - Map token lifecycle states and transitions

- [ ] AC-2: Threat model created for token refresh flows
  - Identify attack vectors (token theft, replay attacks, session hijacking)
  - Document current mitigations (httpOnly cookies, token expiration, circuit breaker)
  - Identify gaps or weaknesses in current implementation

- [ ] AC-3: Auth hook contract specification defined
  - Define clear interface for shared auth hooks
  - Specify session/token validation requirements
  - Document error handling and fallback behavior
  - Define state synchronization requirements across apps

- [ ] AC-4: Security acceptance criteria established for BUGF-005
  - Define security testing requirements for auth consolidation
  - Specify integration test scenarios for token refresh edge cases
  - Document rollback criteria if security issues discovered

- [ ] AC-5: Vulnerability assessment completed
  - Review CognitoTokenManager for security issues
  - Review Hub.listen event handling for race conditions
  - Review backend session sync for CSRF/XSS vulnerabilities
  - Document findings and recommended mitigations

- [ ] AC-6: Security review documentation published
  - Create SECURITY-REVIEW.md in BUGF-026 story folder
  - Include architecture diagrams for token refresh flow
  - Include threat model matrix
  - Include auth hook contract specification
  - Include security acceptance criteria for BUGF-005
  - Include vulnerability findings and mitigations

### Non-Goals

- **Not implementing code changes** - This is a review and documentation story only
- **Not fixing existing vulnerabilities** - Identified issues should be logged as follow-up stories if not blocking BUGF-005
- **Not testing the implementation** - Security testing will happen as part of BUGF-005 implementation
- **Not reviewing all auth code** - Focus is specifically on token refresh mechanisms relevant to auth hook consolidation
- **Not reviewing Cognito configuration** - Backend AWS Cognito setup is out of scope; focus on frontend/client-side refresh logic

### Reuse Plan

**Documentation Templates:**
- Use REVIEW-SECURITY.yaml as template for security findings format
- Follow SEC-001, SEC-002, SEC-003 pattern for documenting security risks

**Analysis Tools:**
- Use existing test files to understand current behavior expectations
- Leverage CognitoTokenManager metrics tracking to understand refresh patterns

**Patterns to Reference:**
- Circuit breaker pattern from CognitoTokenManager
- Hub.listen event handling from AuthProvider
- Error handling patterns from auth-services

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- No test plan needed - this is a documentation/review story
- Security review output will define testing requirements for BUGF-005
- Consider integration test scenarios for token refresh edge cases:
  - Concurrent refresh attempts
  - Circuit breaker behavior under load
  - Token expiration during active request
  - Hub.listen event race conditions

### For UI/UX Advisor
- Not applicable - this is a security architecture review
- Focus should be on documentation clarity and completeness
- Consider creating architecture diagrams for visual communication

### For Dev Feasibility
- Review will require deep technical understanding of:
  - AWS Cognito token refresh flows
  - Amplify Hub event system
  - React state management and Redux integration
  - httpOnly cookie security model
- Estimated effort: 2-3 days for thorough review
- Should involve security-focused engineer or external security consultant
- Output must be detailed enough to guide BUGF-005 implementation safely
- Consider automated security testing tools (SAST) to augment manual review
