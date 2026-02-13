---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-018

## Reality Context

### Baseline Status
- Loaded: **NO**
- Date: N/A
- Gaps: No baseline reality file exists for the repackag-app epic. Proceeding with codebase scanning and sibling story analysis.

### Relevant Existing Features
| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Session Service | `apps/web/main-app/src/services/auth/sessionService.ts` | **Production** | 161 lines, 4 exported functions, handles httpOnly cookie sync with backend |
| AuthProvider | `apps/web/main-app/src/services/auth/AuthProvider.tsx` | **Production** | Uses sessionService for Cognito→Backend session sync |
| @repo/auth-hooks | `packages/core/auth-hooks/` | **In Progress (REPA-012)** | Sibling package for auth hooks (useModuleAuth, usePermissions, useTokenRefresh) |
| @repo/auth-utils | `packages/core/auth-utils/` | **Ready for QA (REPA-013)** | Sibling package for JWT and route guard utilities |

### Active In-Progress Work
| Story | Feature | Status | Overlap Risk |
|-------|---------|--------|--------------|
| REPA-012 | Create @repo/auth-hooks Package | In Progress | **LOW** - Different domain (hooks vs services) |
| REPA-013 | Create @repo/auth-utils Package | Ready for QA | **LOW** - Different domain (JWT/guards vs session) |

**Analysis:** Both sibling packages are for different concerns:
- REPA-012: React hooks for auth state
- REPA-013: Pure utility functions for JWT/guards
- **REPA-018 (this story)**: Backend session synchronization service

No file overlap detected. All three packages are complementary.

### Constraints to Respect
1. **Zod-First Types** (CLAUDE.md): Must convert TypeScript interfaces to Zod schemas
2. **No Barrel Files** (CLAUDE.md): Import directly from source files
3. **Package Structure Pattern**: Follow established pattern from REPA-012/013 sibling packages
4. **Test Coverage**: Minimum 45% coverage required (CLAUDE.md)
5. **Session Service is Singleton**: Currently no tests exist - must add tests as part of migration

---

## Retrieved Context

### Related Endpoints
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/api/v2/auth/session` | POST | Set auth session with ID token | ADR-001 path schema applies |
| `/api/v2/auth/refresh` | POST | Refresh auth session | ADR-001 path schema applies |
| `/api/v2/auth/logout` | POST | Clear auth session | ADR-001 path schema applies |
| `/api/v2/auth/status` | GET | Check session status | ADR-001 path schema applies |

**Note:** Backend routes are at `/auth/*`, frontend uses `/api/v2/auth/*` via Vite proxy (ADR-001).

### Related Components
| Component | Location | Usage | Migration Impact |
|-----------|----------|-------|------------------|
| AuthProvider | `apps/web/main-app/src/services/auth/AuthProvider.tsx` | **Primary consumer** of sessionService | Update import from `./sessionService` to `@repo/auth-services` |
| sessionService (source) | `apps/web/main-app/src/services/auth/sessionService.ts` | **Migration target** | Move to new package |
| sessionService tests | N/A | **MISSING** | Must create tests as part of migration |

**Current Usage:**
```typescript
// apps/web/main-app/src/services/auth/AuthProvider.tsx
import { setAuthSession, refreshAuthSession, clearAuthSession } from './sessionService'

// Called in 3 places:
// 1. Line 241: await setAuthSession(tokens.idToken) - after Cognito sign-in
// 2. Line 291: await refreshAuthSession(tokens.idToken) - after token refresh
// 3. Line 601: await clearAuthSession() - during sign-out
```

### Reuse Candidates
| Category | Item | Source | Notes |
|----------|------|--------|-------|
| Package Structure | Package.json template | REPA-012/013 | Follow auth-hooks/auth-utils pattern |
| Test Setup | vitest.config.ts | REPA-012/013 | Reuse test configuration |
| Build Config | vite.config.ts | REPA-013 | Uses vite-plugin-dts for type generation |
| Barrel Export | index.ts pattern | auth-hooks/auth-utils | Export all service functions from root |

**Sibling Package Patterns Observed:**

**@repo/auth-hooks** (REPA-012):
- Structure: Flat files in `src/` (no subdirectories for single-file modules)
- Dependencies: react, @repo/api-client, @repo/logger, zod
- Main export points to `src/index.ts` (no build step)

**@repo/auth-utils** (REPA-013):
- Structure: Subdirectories with subpath exports (`jwt/`, `guards/`)
- Dependencies: @repo/logger, @tanstack/react-router, zod ^4.1.13
- Build step: vite build with vite-plugin-dts
- Exports: Root + subpath (`@repo/auth-utils/jwt`, `@repo/auth-utils/guards`)

**Recommendation for REPA-018:**
- Follow **auth-utils pattern** (build step with types)
- No subpath exports needed (single service module)
- Dependencies: @repo/logger (already used), zod ^4.1.13

---

## Knowledge Context

### Lessons Learned
No knowledge base directory found. No past lessons available.

### Blockers to Avoid (from past stories)
- None available (no KB or baseline)

### Architecture Decisions (ADRs)
| ADR | Title | Constraint | Applies to REPA-018 |
|-----|-------|------------|---------------------|
| ADR-001 | API Path Schema | Frontend uses `/api/v2/{domain}`, Backend uses `/{domain}` | **YES** - sessionService uses `/api/v2/auth/*` paths |
| ADR-004 | Authentication Architecture | Cognito with httpOnly cookie sessions | **YES** - sessionService is the bridge between Cognito and backend |
| ADR-005 | Testing Strategy | UAT must use real services, no mocks | **YES** - Tests must hit real backend endpoints (not MSW) |
| ADR-006 | E2E Tests Required | Dev phase must include E2E tests | **MAYBE** - If sessionService changes affect UI flows |

### Patterns to Follow
1. **Zod Schemas First**: Convert all TypeScript interfaces to Zod schemas (CLAUDE.md requirement)
2. **Logger Usage**: Use `@repo/logger`, never console.log (CLAUDE.md requirement)
3. **Error Handling**: sessionService already uses try/catch + logger.error patterns
4. **Credentials Include**: `credentials: 'include'` is critical for httpOnly cookies (maintain pattern)
5. **Package Naming**: Follow `@repo/{category}-{noun}` pattern (e.g., `@repo/auth-services`)

### Patterns to Avoid
- **No barrel files** (CLAUDE.md): Don't create re-export index.ts files
- **No TypeScript interfaces** (CLAUDE.md): Must use Zod schemas
- **No console.log** (CLAUDE.md): Use @repo/logger
- **No any types**: Strict mode enabled, avoid `any` (CLAUDE.md)

---

## Conflict Analysis

**No conflicts detected.**

**Rationale:**
- REPA-012 and REPA-013 are in different domains (hooks and utils vs services)
- No file overlap between auth-hooks, auth-utils, and session service
- AuthProvider is the only consumer, and it's in main-app (migration source)
- No other apps currently import sessionService (isolated to main-app)

**Post-Migration Opportunity:**
After REPA-018, future stories could enable other apps to use session services if they implement Cognito auth (currently only main-app has AuthProvider).

---

## Story Seed

### Title
**REPA-018: Create @repo/auth-services Package**

### Description

**Context:**
The session service (`apps/web/main-app/src/services/auth/sessionService.ts`, 161 lines) is a critical component that synchronizes Cognito authentication with backend httpOnly cookies. After successful Cognito authentication, the ID token is sent to the backend via POST `/auth/session`, which validates the token and sets a secure httpOnly cookie for subsequent API requests. This cookie-based session is required for all authenticated API calls.

Currently, the session service is locked to main-app and cannot be reused by other apps that may need Cognito authentication in the future.

**Problem Statement:**
1. **No Sharing**: Session service is locked to main-app internal structure
2. **No Tests**: Session service has zero test coverage (integration tests exist for AuthProvider, but not for sessionService directly)
3. **TypeScript Interfaces**: Uses interfaces instead of Zod schemas (violates CLAUDE.md requirement)
4. **Future Blocker**: Other apps may need session management if they adopt Cognito auth

**Proposed Solution:**
Create `@repo/auth-services` package to house session service with:
- Zod schema conversion for `SessionResponse` and `SessionError`
- Comprehensive unit tests (mocking fetch)
- Integration tests (real backend, per ADR-005)
- Same API surface (setAuthSession, refreshAuthSession, clearAuthSession, getSessionStatus)

**Dependencies:**
- Sibling packages: REPA-012 (@repo/auth-hooks), REPA-013 (@repo/auth-utils)
- Both are independent - no blocking dependencies

### Initial Acceptance Criteria

- [ ] **AC-1: Create Package Structure**
  - Create `packages/core/auth-services/` with standard package structure
  - Add `package.json` with dependencies: @repo/logger, zod ^4.1.13
  - Add `tsconfig.json` extending monorepo base config
  - Add `vite.config.ts` with vite-plugin-dts for type generation (follow REPA-013 pattern)
  - Add `vitest.config.ts` for test configuration
  - Add `README.md` with usage examples and API documentation
  - Configure Turborepo tasks (build, lint, test, check-types)
  - Directory structure:
    ```
    packages/core/auth-services/
      src/
        session/
          index.ts          # Session service implementation
          __types__/
            index.ts        # Zod schemas (SessionResponseSchema, SessionErrorSchema)
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
  - Package builds successfully: `pnpm build packages/core/auth-services`

- [ ] **AC-2: Migrate Session Service with Zod Conversion**
  - Move code from `apps/web/main-app/src/services/auth/sessionService.ts` to `packages/core/auth-services/src/session/index.ts`
  - Convert TypeScript interfaces to Zod schemas:
    - `SessionResponse` → `SessionResponseSchema` (success, message, optional user object)
    - `SessionError` → `SessionErrorSchema` (error, message)
    - Use `z.infer<typeof Schema>` for type extraction
  - Maintain all 4 exported functions:
    - `setAuthSession(idToken: string): Promise<SessionResponse>`
    - `refreshAuthSession(idToken: string): Promise<SessionResponse>`
    - `clearAuthSession(): Promise<void>`
    - `getSessionStatus(): Promise<{ authenticated: boolean; user?: { userId: string; email?: string } }>`
  - Maintain `getBaseUrl()` helper (VITE_SERVERLESS_API_BASE_URL env var)
  - Keep all error handling patterns (try/catch, logger.error, logger.warn)
  - **CRITICAL**: Preserve `credentials: 'include'` for httpOnly cookie support

- [ ] **AC-3: Add Unit Tests (Mocked Fetch)**
  - Create `packages/core/auth-services/src/session/__tests__/index.test.ts`
  - Mock global `fetch` using vitest
  - Test coverage for all 4 functions:
    - `setAuthSession` - success case, error case, network failure
    - `refreshAuthSession` - success case, error case
    - `clearAuthSession` - success case, graceful failure (logs warning, doesn't throw)
    - `getSessionStatus` - authenticated, unauthenticated, network failure
  - Test environment variable handling (missing `VITE_SERVERLESS_API_BASE_URL` throws)
  - Test request headers (`Content-Type: application/json`, `credentials: include`)
  - **Target:** Minimum 45% coverage (CLAUDE.md), aim for 80%+

- [ ] **AC-4: Add Integration Tests (Real Backend)**
  - Create `packages/core/auth-services/src/session/__tests__/integration.test.ts`
  - **Per ADR-005:** Use real backend endpoints, no MSW mocking
  - Setup: Assume backend running at `VITE_SERVERLESS_API_BASE_URL` with `/auth/*` routes
  - Test sequence:
    1. setAuthSession with valid test ID token → expect 200 OK
    2. getSessionStatus → expect authenticated: true
    3. refreshAuthSession with new token → expect 200 OK
    4. clearAuthSession → expect 200 OK
    5. getSessionStatus → expect authenticated: false
  - **Note:** May require test Cognito user pool credentials (ADR-004)
  - Mark as `test.skip()` if backend not available (CI environment)

- [ ] **AC-5: Update main-app to Use New Package**
  - Add `@repo/auth-services` to `apps/web/main-app/package.json`
  - Update `apps/web/main-app/src/services/auth/AuthProvider.tsx`:
    - Change import from `./sessionService` to `@repo/auth-services`
  - Delete `apps/web/main-app/src/services/auth/sessionService.ts`
  - Verify AuthProvider tests still pass (`apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx`)
  - Verify AuthProvider integration tests pass (`apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx`)

- [ ] **AC-6: Documentation and Type Safety**
  - Add JSDoc comments to all exported functions
  - Document required environment variables in README:
    - `VITE_SERVERLESS_API_BASE_URL` (required)
  - Document API endpoints used:
    - POST `/auth/session` - set session
    - POST `/auth/refresh` - refresh session
    - POST `/auth/logout` - clear session
    - GET `/auth/status` - get session status
  - Add usage examples in README
  - Export both Zod schemas and inferred types from package root

- [ ] **AC-7: Build and Test Verification**
  - Package builds with no errors: `pnpm build packages/core/auth-services`
  - All tests pass: `pnpm test packages/core/auth-services`
  - Type checking passes: `pnpm check-types packages/core/auth-services`
  - Linting passes: `pnpm lint packages/core/auth-services`
  - Turborepo cache works correctly
  - main-app builds with no errors after migration

### Non-Goals
- **NOT modifying AuthProvider logic** - only changing import path
- **NOT adding new session features** - pure migration with tests
- **NOT migrating other auth services** - only sessionService.ts (error handling is REPA-019)
- **NOT implementing session service in other apps** - migration only, future stories can adopt
- **NOT changing backend session endpoints** - backend API remains unchanged
- **NOT implementing refresh token logic** - that's in AuthProvider, not session service
- **NOT creating auth middleware** - that exists in @repo/api-client already

### Reuse Plan
- **Package Structure**: Follow auth-utils pattern (REPA-013) with build step
- **Test Configuration**: Reuse vitest.config.ts from auth-hooks/auth-utils
- **Build Configuration**: Reuse vite.config.ts from auth-utils (vite-plugin-dts)
- **Zod Version**: Use zod ^4.1.13 (matches auth-utils, standardize across monorepo)
- **Logger**: Use @repo/logger (already used in sessionService)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
1. **Unit Tests**: Mock fetch globally, test all 4 functions with success/error/network failure cases
2. **Integration Tests**: Real backend required (ADR-005), may need test Cognito pool (ADR-004)
3. **Coverage Target**: Minimum 45%, aim for 80%+ (high-value auth code)
4. **Environment Setup**: Document `VITE_SERVERLESS_API_BASE_URL` requirement for integration tests
5. **CI Consideration**: Integration tests may need `test.skip()` if backend not available in CI

### For UI/UX Advisor
- **No UI impact** - this is a backend service migration
- **User-facing behavior unchanged** - same session flow, just moved to shared package
- **Error states unchanged** - AuthProvider still handles all user-facing error states
- **No new components** - purely service layer

### For Dev Feasibility
1. **Low Risk**: Session service is well-isolated, only used by AuthProvider
2. **Testing Strategy**: Unit tests (mocked) are straightforward, integration tests need backend
3. **Dependencies**: @repo/logger (exists), zod ^4.1.13 (matches REPA-013)
4. **Migration Path**: Single consumer (AuthProvider), clean import swap
5. **Rollback Plan**: Keep old sessionService.ts until tests pass, then delete
6. **Consideration**: Integration tests need real backend + test Cognito user (ADR-004, ADR-005)
7. **Build Time**: Follow auth-utils pattern (vite build with dts plugin)
8. **Import Pattern**: `import { setAuthSession } from '@repo/auth-services'` (no subpath needed)

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning:**
- No baseline reality file exists - codebase scanning used instead. Conflicts may exist with unreleased work not visible in git status.
