---
id: REPA-018
title: "Create @repo/auth-services Package"
epic: repackag-app
status: uat
priority: P2
story_type: tech_debt
experiment_variant: control
points: 3
surfaces:
  - backend
created: 2026-02-10
updated: 2026-02-10
elaborated: 2026-02-10
verdict: CONDITIONAL PASS
---

# REPA-018: Create @repo/auth-services Package

## Context

The session service (`apps/web/main-app/src/services/auth/sessionService.ts`, 161 lines) is a critical component that synchronizes Cognito authentication with backend httpOnly cookies. After successful Cognito authentication, the ID token is sent to the backend via POST `/auth/session`, which validates the token and sets a secure httpOnly cookie for subsequent API requests. This cookie-based session is required for all authenticated API calls.

Currently, the session service is locked to main-app and cannot be reused by other apps that may need Cognito authentication in the future.

### Related Work
- **REPA-012**: Create @repo/auth-hooks Package (In Progress) - Sibling package for auth hooks (useModuleAuth, usePermissions, useTokenRefresh)
- **REPA-013**: Create @repo/auth-utils Package (Ready for QA) - Sibling package for JWT and route guard utilities
- **ADR-001**: API Path Schema - Frontend uses `/api/v2/{domain}`, backend uses `/{domain}`
- **ADR-004**: Authentication Architecture - Cognito with httpOnly cookie sessions
- **ADR-005**: Testing Strategy - UAT must use real services, no mocks

---

## Problem Statement

1. **No Sharing**: Session service is locked to main-app internal structure
2. **No Tests**: Session service has zero test coverage (integration tests exist for AuthProvider, but not for sessionService directly)
3. **TypeScript Interfaces**: Uses interfaces instead of Zod schemas (violates CLAUDE.md requirement)
4. **Future Blocker**: Other apps may need session management if they adopt Cognito auth

---

## Proposed Solution

Create `@repo/auth-services` package to house session service with:
- Zod schema conversion for `SessionResponse` and `SessionError`
- Comprehensive unit tests (mocking fetch)
- Integration tests (real backend, per ADR-005)
- Same API surface (setAuthSession, refreshAuthSession, clearAuthSession, getSessionStatus)

**Package Structure:**
```
packages/core/auth-services/
  src/
    session/
      index.ts          # Session service implementation
      __types__/
        index.ts        # Zod schemas
      __tests__/
        index.test.ts   # Unit tests (mocked fetch)
        integration.test.ts  # Integration tests (real backend)
    index.ts            # Root export
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  README.md
```

---

## Acceptance Criteria

### AC-1: Create Package Structure
- [ ] Create `packages/core/auth-services/` with standard package structure
- [ ] Add `package.json` with dependencies: @repo/logger, zod ^4.1.13
- [ ] Add `tsconfig.json` extending monorepo base config
- [ ] Add `vite.config.ts` with vite-plugin-dts for type generation (follow REPA-013 pattern)
- [ ] Add `vitest.config.ts` for test configuration
- [ ] Add `README.md` with usage examples and API documentation
- [ ] Configure Turborepo tasks (build, lint, test, check-types)
- [ ] Package builds successfully: `pnpm build packages/core/auth-services`

**Success Criteria:**
- Build produces type declaration files in `dist/` directory
- Package exports available for import: `import { setAuthSession } from '@repo/auth-services'`
- Turborepo cache hit on subsequent builds

---

### AC-2: Migrate Session Service with Zod Conversion
- [ ] Move code from `apps/web/main-app/src/services/auth/sessionService.ts` to `packages/core/auth-services/src/session/index.ts`
- [ ] Convert TypeScript interfaces to Zod schemas:
  - `SessionResponse` → `SessionResponseSchema` (success, message, optional user object)
  - `SessionError` → `SessionErrorSchema` (error, message)
  - Use `z.infer<typeof Schema>` for type extraction
- [ ] Maintain all 4 exported functions:
  - `setAuthSession(idToken: string): Promise<SessionResponse>`
  - `refreshAuthSession(idToken: string): Promise<SessionResponse>`
  - `clearAuthSession(): Promise<void>`
  - `getSessionStatus(): Promise<{ authenticated: boolean; user?: { userId: string; email?: string } }>`
- [ ] Maintain `getBaseUrl()` helper (VITE_SERVERLESS_API_BASE_URL env var)
- [ ] Keep all error handling patterns (try/catch, logger.error, logger.warn)
- [ ] **CRITICAL**: Preserve `credentials: 'include'` for httpOnly cookie support

**Success Criteria:**
- All 4 functions maintain identical API surface
- Zod schemas validate request/response shapes at runtime
- Environment variable handling unchanged (throws if missing)
- Logger usage preserved (@repo/logger, no console.log)

---

### AC-3: Add Unit Tests (Mocked Fetch)
- [ ] Create `packages/core/auth-services/src/session/__tests__/index.test.ts`
- [ ] Mock global `fetch` using vitest
- [ ] Test coverage for all 4 functions:
  - `setAuthSession` - success case, error case (401), network failure
  - `refreshAuthSession` - success case, error case
  - `clearAuthSession` - success case, graceful failure (logs warning, doesn't throw)
  - `getSessionStatus` - authenticated, unauthenticated, network failure
- [ ] Test environment variable handling (missing `VITE_SERVERLESS_API_BASE_URL` throws)
- [ ] Test request headers (`Content-Type: application/json`, `credentials: include`)
- [ ] Test edge cases: empty token, concurrent calls, malformed backend response

**Success Criteria:**
- Minimum 45% coverage (CLAUDE.md requirement), aim for 80%+
- All tests pass: `pnpm test packages/core/auth-services`
- Coverage report shows all code paths tested

---

### AC-4: Add Integration Tests (Real Backend)
- [ ] Create `packages/core/auth-services/src/session/__tests__/integration.test.ts`
- [ ] **Per ADR-005:** Use real backend endpoints, no MSW mocking
- [ ] Setup: Assume backend running at `VITE_SERVERLESS_API_BASE_URL` with `/auth/*` routes
- [ ] Test sequence:
  1. setAuthSession with valid test ID token → expect 200 OK
  2. getSessionStatus → expect authenticated: true
  3. refreshAuthSession with new token → expect 200 OK
  4. clearAuthSession → expect 200 OK
  5. getSessionStatus → expect authenticated: false
- [ ] Mark as `test.skip()` if backend not available (CI environment)
- [ ] Document backend setup requirements in README

**Success Criteria:**
- Integration test runs successfully at least once in dev environment
- Test skips gracefully with clear message if backend unavailable
- httpOnly cookie behavior validated end-to-end

**Note:** May require test Cognito user pool credentials (ADR-004). If unavailable, defer full validation to UAT phase and rely on existing AuthProvider integration tests.

---

### AC-5: Update main-app to Use New Package
- [ ] Add `@repo/auth-services` to `apps/web/main-app/package.json`
- [ ] Update `apps/web/main-app/src/services/auth/AuthProvider.tsx`:
  - Change import from `./sessionService` to `@repo/auth-services`
- [ ] Delete `apps/web/main-app/src/services/auth/sessionService.ts`
- [ ] Verify AuthProvider tests still pass (`apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`)
- [ ] Verify AuthProvider integration tests pass (`apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx`)

**Success Criteria:**
- AuthProvider tests pass with no changes except import path
- TypeScript compilation succeeds: `pnpm check-types apps/web/main-app`
- main-app builds successfully: `pnpm build apps/web/main-app`
- Old sessionService.ts deleted from git

---

### AC-6: Documentation and Type Safety
- [ ] Add JSDoc comments to all exported functions
- [ ] Document required environment variables in README:
  - `VITE_SERVERLESS_API_BASE_URL` (required)
- [ ] Document API endpoints used:
  - POST `/auth/session` - set session
  - POST `/auth/refresh` - refresh session
  - POST `/auth/logout` - clear session
  - GET `/auth/status` - get session status
- [ ] Add usage examples in README
- [ ] Export both Zod schemas and inferred types from package root

**Success Criteria:**
- README includes installation, environment setup, and usage examples
- JSDoc comments visible in IDE autocomplete
- Types properly exported and importable

---

### AC-7: Build and Test Verification
- [ ] Package builds with no errors: `pnpm build packages/core/auth-services`
- [ ] All tests pass: `pnpm test packages/core/auth-services`
- [ ] Type checking passes: `pnpm check-types packages/core/auth-services`
- [ ] Linting passes: `pnpm lint packages/core/auth-services`
- [ ] Turborepo cache works correctly
- [ ] main-app builds with no errors after migration

**Success Criteria:**
- All quality gates pass
- No console errors or warnings in dev mode
- Package ready for use by other apps in future stories

---

## Non-Goals

- **NOT modifying AuthProvider logic** - only changing import path
- **NOT adding new session features** - pure migration with tests
- **NOT migrating other auth services** - only sessionService.ts (error handling is REPA-019)
- **NOT implementing session service in other apps** - migration only, future stories can adopt
- **NOT changing backend session endpoints** - backend API remains unchanged
- **NOT implementing refresh token logic** - that's in AuthProvider, not session service
- **NOT creating auth middleware** - that exists in @repo/api-client already

---

## Test Plan Summary

### Unit Tests (Mocked Fetch)
- All 4 functions: setAuthSession, refreshAuthSession, clearAuthSession, getSessionStatus
- Success paths, error cases (401, 500), network failures
- Environment variable validation
- Request header validation (Content-Type, credentials)
- Edge cases: empty token, concurrent calls, malformed responses
- **Target:** 80%+ coverage

### Integration Tests (Real Backend - ADR-005)
- Full session lifecycle: set → status → refresh → status → clear → status
- Invalid token rejection
- Requires running backend at `VITE_SERVERLESS_API_BASE_URL`
- May require test Cognito user pool (ADR-004)
- Skips gracefully if backend unavailable

### Existing Tests (Unchanged)
- AuthProvider tests in main-app already validate session flow integration
- These tests continue to pass after migration (import path change only)

See: `_pm/TEST-PLAN.md` for detailed test scenarios

---

## Dev Feasibility Summary

**Feasibility:** HIGH - Single file migration (161 lines) with single consumer (AuthProvider)

**Confidence:** HIGH - Proven patterns from REPA-012/013 sibling packages

**Estimated Effort:** 4-6 hours
- 1 hour: Package structure + config
- 2 hours: Zod conversion + code migration
- 2 hours: Unit tests
- 1 hour: Integration tests + README

**Critical Risks:**
1. Integration tests require real backend (ADR-005) and test Cognito pool (ADR-004)
   - **Mitigation:** Document setup requirements, use `test.skip()` if unavailable, rely on AuthProvider tests
2. Zod schema conversion must maintain type compatibility
   - **Mitigation:** Export inferred types, verify main-app types pass, run AuthProvider tests
3. Missing environment variable handling
   - **Mitigation:** Document `VITE_SERVERLESS_API_BASE_URL` requirement clearly

**Change Surface:**
- New package: `packages/core/auth-services/` (~8 files total)
- Modified: `apps/web/main-app/src/services/auth/AuthProvider.tsx` (1 line import change)
- Deleted: `apps/web/main-app/src/services/auth/sessionService.ts`

See: `_pm/DEV-FEASIBILITY.md` and `_pm/FUTURE-RISKS.md` for detailed analysis

---

## Risk Predictions

**Split Risk:** 0.2 (LOW) - Well-isolated single-file migration, clear scope

**Review Cycles:** 2 - Auth code requires careful review, first REPA migration story

**Token Estimate:** 120,000 - Backend-only migration, no UI work

**Confidence:** Low - No historical data for repackag-app epic, heuristics-only mode

**Similar Stories:** None found (KB unavailable)

See: `_pm/RISK-PREDICTIONS.yaml` for detailed predictions

---

## Reuse Plan

### Package Structure
- Follow **auth-utils pattern** (REPA-013) with build step using vite + vite-plugin-dts
- No subpath exports needed (single service module)

### Configuration Files
- `vitest.config.ts` - Reuse from auth-hooks/auth-utils
- `vite.config.ts` - Reuse from auth-utils (includes vite-plugin-dts)
- `tsconfig.json` - Extend monorepo base config

### Dependencies
- `@repo/logger` - Already used in sessionService
- `zod` ^4.1.13 - Matches auth-utils, standardize across monorepo

### Patterns
- Zod-first types (CLAUDE.md requirement)
- No barrel files (CLAUDE.md requirement)
- Logger usage (no console.log)
- Error handling (try/catch with logger)
- Credentials include pattern (critical for httpOnly cookies)

---

## Rollback Plan

If migration causes issues:
1. Revert main-app import back to `./sessionService`
2. Restore deleted `apps/web/main-app/src/services/auth/sessionService.ts` from git
3. Remove `@repo/auth-services` from main-app package.json
4. Run `pnpm install` to restore lockfile

---

## Definition of Done

- [ ] All 7 acceptance criteria met
- [ ] Package builds successfully with type declarations
- [ ] All tests pass (unit + integration or skipped with docs)
- [ ] Test coverage ≥45% (target 80%+)
- [ ] TypeScript compilation passes for main-app
- [ ] All AuthProvider tests pass unchanged
- [ ] Linting passes with no errors
- [ ] README includes installation, env vars, usage examples, API docs
- [ ] Turborepo cache verified working
- [ ] Old sessionService.ts deleted from main-app
- [ ] Code reviewed and approved
- [ ] Merged to main branch

---

## Future Enhancements

Tracked in `_pm/FUTURE-RISKS.md`:
- Session timeout utilities
- Retry logic with exponential backoff
- Observability metrics integration
- Cross-tab session sync with BroadcastChannel
- Session debugging tools
- Custom session metadata support
- Granular session scopes (MFA pending, email unverified, etc.)
- Multi-region support

These are explicitly OUT OF SCOPE for MVP to maintain focused story size.

---

## Notes

**Migration Complexity:** LOW - Single file, single consumer, no breaking changes

**Dependencies:** No blocking dependencies on REPA-012 or REPA-013 (independent packages)

**Post-Migration Opportunity:** After REPA-018, future stories could enable other apps to use session services if they implement Cognito auth (currently only main-app has AuthProvider).

**Baseline Warning:** No baseline reality file exists for repackag-app epic. Conflicts may exist with unreleased work not visible in git status. Seed used codebase scanning instead.

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps identified | All 7 ACs are complete and testable | — |

### Non-Blocking Items (Logged to Implementation Notes)

| # | Finding | Category | Resolution |
|---|---------|----------|-----------|
| 1 | Integration tests require real backend (ADR-005) without clear CI strategy | Test Execution | AC-4 includes test.skip() with documentation. Existing AuthProvider integration tests provide fallback coverage. Acceptable for MVP. |
| 2 | Test Cognito user pool may not exist | Test Dependencies | AC-4 notes deferral to UAT if unavailable. Story includes workaround: rely on existing AuthProvider tests. Not blocking. |
| 3 | Zod schema version discrepancy | Dependencies | Story specifies zod ^4.1.13, but auth-hooks uses ^3.24.0. Should standardize to monorepo version (likely 3.24.0). Minor update needed in AC-1. |

### Future Opportunities Captured

15 non-blocking enhancement opportunities identified and deferred to post-MVP consideration:

**High-Impact (1)**:
- Cross-tab session synchronization with BroadcastChannel (High impact, Medium effort)

**Medium-Impact (6)**:
- Retry logic with exponential backoff (Medium impact, Medium effort)
- Session timeout utilities (Medium impact, Low effort)
- Observability metrics (Medium impact, Medium effort)
- Session debugging tools (Medium impact, Low effort)
- Configurable base URL override (Medium impact, Low effort)

**Low-Impact (8)**:
- Request/response interceptor hooks, Session metadata support, Concurrent session test coverage, Granular session scopes, Request deduplication, Session persistence cache, Custom error classes, Multi-region support, Malformed response validation

Full list documented in `_implementation/DECISIONS.yaml`.

### Summary

- **ACs added**: 0 (story scope complete)
- **Implementation notes added**: 3 (minor clarifications for dev team)
- **Future opportunities identified**: 15 (KB entries deferred, KB system unavailable)
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS
