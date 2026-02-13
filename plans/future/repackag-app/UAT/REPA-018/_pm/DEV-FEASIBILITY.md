# Dev Feasibility Review: REPA-018

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Session service is well-isolated with clear boundaries (161 lines, 4 exported functions)
- Single consumer (AuthProvider in main-app) makes migration straightforward
- No complex dependencies beyond @repo/logger (already exists)
- Sibling packages (REPA-012, REPA-013) provide proven patterns for package structure
- Zod conversion is mechanical (2 interfaces → 2 schemas)
- No breaking changes to API surface required

---

## Likely Change Surface (Core Only)

### Core Packages/Files
| Path | Change Type | Lines | Rationale |
|------|-------------|-------|-----------|
| `packages/core/auth-services/` | **CREATE** | ~200 total | New package structure |
| `packages/core/auth-services/src/session/index.ts` | **MOVE + EDIT** | 161 → ~180 | Move from main-app, add Zod schemas |
| `packages/core/auth-services/src/session/__types__/index.ts` | **CREATE** | ~30 | Zod schemas (SessionResponseSchema, SessionErrorSchema) |
| `packages/core/auth-services/src/session/__tests__/index.test.ts` | **CREATE** | ~150 | Unit tests (mocked fetch) |
| `packages/core/auth-services/src/session/__tests__/integration.test.ts` | **CREATE** | ~100 | Integration tests (real backend) |
| `packages/core/auth-services/src/index.ts` | **CREATE** | ~10 | Root export (no barrel file, direct re-exports) |
| `apps/web/main-app/src/services/auth/AuthProvider.tsx` | **EDIT** | 1 line | Import path change |
| `apps/web/main-app/src/services/auth/sessionService.ts` | **DELETE** | 161 | Migrated to package |

### Build/Config Files
| Path | Change Type | Purpose |
|------|-------------|---------|
| `packages/core/auth-services/package.json` | **CREATE** | Package metadata, dependencies |
| `packages/core/auth-services/tsconfig.json` | **CREATE** | TypeScript config (extends base) |
| `packages/core/auth-services/vite.config.ts` | **CREATE** | Build config with vite-plugin-dts |
| `packages/core/auth-services/vitest.config.ts` | **CREATE** | Test config |
| `packages/core/auth-services/README.md` | **CREATE** | Usage docs, API reference |
| `apps/web/main-app/package.json` | **EDIT** | Add `@repo/auth-services` dependency |

### Endpoints (No Changes)
All backend endpoints remain unchanged:
- POST `/auth/session` - set session
- POST `/auth/refresh` - refresh session
- POST `/auth/logout` - clear session
- GET `/auth/status` - get session status

**Note:** Frontend uses `/api/v2/auth/*` paths via Vite proxy (ADR-001). This is preserved in migration.

---

## MVP-Critical Risks

### Risk 1: Integration Test Requires Real Backend
**Why it blocks MVP:**
- Per ADR-005, integration tests must use real backend (no MSW)
- Without integration tests, we cannot verify httpOnly cookie behavior end-to-end
- Unit tests alone do not validate critical auth flow

**Required Mitigation:**
1. Document backend setup requirements in README
2. Provide `test.skip()` conditional for CI environments without backend
3. Ensure at least one developer can run integration tests locally before merge
4. **Acceptance Criteria:** Integration test runs successfully at least once in dev environment

**Workaround if Backend Unavailable:**
- Mark integration tests as `test.skip()` with comment explaining backend requirement
- Rely on existing AuthProvider integration tests in main-app (already test session flow)
- Defer full integration test validation to UAT phase

---

### Risk 2: Missing Test Cognito User Pool
**Why it blocks MVP:**
- Backend `/auth/session` endpoint validates Cognito ID tokens (ADR-004)
- Integration tests need valid ID token to test real backend
- Without test tokens, integration tests cannot validate auth flow

**Required Mitigation:**
1. Document test Cognito user pool setup in README
2. Provide example token generation script or fixture
3. Coordinate with backend team for test user credentials
4. **Acceptance Criteria:** At least one valid test ID token available for integration tests

**Workaround if No Test Pool:**
- Skip integration tests (use `test.skip()`)
- Rely on main-app AuthProvider tests which already have Cognito integration
- Unit tests provide sufficient coverage for service logic (80%+ target)

---

### Risk 3: Zod Schema Conversion Breaks Type Compatibility
**Why it blocks MVP:**
- Converting TypeScript interfaces to Zod schemas changes type definitions
- AuthProvider may have type mismatches after migration
- Runtime validation errors could break auth flow

**Required Mitigation:**
1. Export both Zod schemas AND inferred types from package root
2. Ensure `z.infer<typeof SessionResponseSchema>` matches original interface shape exactly
3. Run TypeScript type checking on main-app after migration: `pnpm check-types apps/web/main-app`
4. Verify AuthProvider tests pass without modification (except import path)
5. **Acceptance Criteria:** No TypeScript errors in main-app after migration, all AuthProvider tests pass

**Implementation Notes:**
- Original interfaces already match backend response shapes (validated by existing tests)
- Zod conversion should be mechanical (e.g., `email: string` → `z.string().email()`)
- No new validation rules beyond existing types

---

## Missing Requirements for MVP

### Requirement 1: Environment Variable Documentation
**What's Missing:**
- README must document `VITE_SERVERLESS_API_BASE_URL` requirement
- No clear guidance on what happens if env var missing

**PM Must Include:**
```markdown
## Environment Variables

Required:
- `VITE_SERVERLESS_API_BASE_URL` - Base URL for backend API (e.g., `http://localhost:3000`)

If missing, all session functions will throw: `Error: VITE_SERVERLESS_API_BASE_URL environment variable is required`
```

**Why Critical:**
- Developers integrating package need to know env var setup
- Tests need env var configured or they will fail

---

### Requirement 2: Integration Test Backend Setup Instructions
**What's Missing:**
- How to run backend locally for integration tests
- What backend version/configuration is required

**PM Must Include:**
```markdown
## Running Integration Tests

Integration tests require a running backend with auth endpoints at `VITE_SERVERLESS_API_BASE_URL`.

To run:
1. Start backend: `cd apps/api && pnpm dev`
2. Set env var: `export VITE_SERVERLESS_API_BASE_URL=http://localhost:3000`
3. Run tests: `pnpm test packages/core/auth-services`

To skip integration tests (CI):
- Tests automatically skip if backend unreachable
- Or set `SKIP_INTEGRATION=true`
```

---

### Requirement 3: Rollback Plan
**What's Missing:**
- How to revert if migration breaks production

**PM Must Include:**
```markdown
## Rollback Plan

If migration causes issues:
1. Revert main-app import back to `./sessionService`
2. Restore deleted `apps/web/main-app/src/services/auth/sessionService.ts` from git
3. Remove `@repo/auth-services` from main-app package.json
4. Run `pnpm install` to restore lockfile
```

---

## MVP Evidence Expectations

### Evidence 1: Package Builds Successfully
**Command:**
```bash
pnpm build packages/core/auth-services
```

**Expected Output:**
- No build errors
- Type declaration files generated in `dist/` (via vite-plugin-dts)
- Package exports available for import

**Verification:**
```bash
ls packages/core/auth-services/dist
# Should show: index.d.ts, index.js, session/index.d.ts, session/index.js
```

---

### Evidence 2: All Tests Pass
**Command:**
```bash
pnpm test packages/core/auth-services
```

**Expected Output:**
- All unit tests pass (mocked fetch)
- Integration tests pass OR skip gracefully with clear message
- Coverage ≥45% (target 80%+)

**Verification:**
```bash
pnpm test packages/core/auth-services --coverage
# Check coverage report
```

---

### Evidence 3: main-app Still Works After Migration
**Commands:**
```bash
pnpm check-types apps/web/main-app
pnpm test apps/web/main-app/src/services/auth/__tests__/AuthProvider.test.tsx
pnpm test apps/web/main-app/src/services/auth/__tests__/AuthStateSync.integration.test.tsx
pnpm build apps/web/main-app
```

**Expected Output:**
- No TypeScript errors
- All AuthProvider tests pass (no changes needed except import)
- main-app builds successfully

**Verification:**
- Inspect AuthProvider.tsx import changed to `@repo/auth-services`
- Old sessionService.ts deleted
- No console errors in dev mode

---

### Evidence 4: Turborepo Cache Works
**Command:**
```bash
pnpm build packages/core/auth-services
# (run twice to test cache)
pnpm build packages/core/auth-services
```

**Expected Output:**
- First build compiles TypeScript
- Second build uses cache (instant, shows `cache hit` in Turborepo output)

---

## Critical Deploy Touchpoints

### Deploy Checkpoint 1: Package Publish (If Applicable)
**Note:** This is a monorepo internal package, so no npm publish required.

**If External Publish Needed:**
- Add publish config to package.json
- Verify package exports in package.json match build output
- Test install in external project before publish

---

### Deploy Checkpoint 2: Dependency Installation
**When:** After merging PR to main

**Command:**
```bash
pnpm install
```

**Verification:**
- main-app `node_modules/@repo/auth-services` exists
- No pnpm lockfile conflicts

---

### Deploy Checkpoint 3: Production Build
**When:** Before deploying main-app to production

**Command:**
```bash
pnpm build apps/web/main-app
```

**Verification:**
- Build succeeds
- No missing module errors for `@repo/auth-services`
- Bundle size reasonable (session service is small)

---

### Deploy Checkpoint 4: Smoke Test Production Session Flow
**When:** After deployment to production (or staging first)

**Actions:**
1. Sign in to main-app → verify session created (check Network tab for `/auth/session` call)
2. Refresh page → verify session persists (httpOnly cookie present)
3. Sign out → verify session cleared (httpOnly cookie removed)

**Expected:**
- No auth errors in console
- Session behavior unchanged from pre-migration

---

## Notes

**Migration Complexity:** LOW
- Single file migration (161 lines)
- Single consumer (AuthProvider)
- No breaking API changes
- Proven package patterns from REPA-012/013

**Estimated Effort:** 4-6 hours
- 1 hour: Package structure + config
- 2 hours: Zod conversion + code migration
- 2 hours: Unit tests
- 1 hour: Integration tests + README

**Confidence Drivers:**
- Sibling packages provide blueprints
- Existing tests validate current behavior
- Well-isolated service layer
- No UI changes reduce risk

**Dependencies:**
- REPA-012 (in progress) and REPA-013 (ready for QA) are independent
- No blocking dependencies
