---
generated: "2026-02-10"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: REPA-013

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file exists (only template at plans/baselines/TEMPLATE-BASELINE-REALITY.md). This limits validation against in-progress work and protected features.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| JWT utilities | `apps/web/main-app/src/lib/jwt.ts` | production | 122 lines, 5 exported functions + 3 TypeScript interfaces |
| Route guard utilities | `apps/web/main-app/src/lib/route-guards.ts` | production | 345 lines, createTanStackRouteGuard factory + RouteGuards presets + composeMiddleware |
| JWT tests | `apps/web/main-app/src/lib/__tests__/jwt.test.ts` | production | Comprehensive test coverage (430 lines) |
| Route guard tests | `apps/web/main-app/src/lib/__tests__/route-guards.test.ts` | production | Comprehensive test coverage (996 lines) |
| useTokenRefresh hook | `apps/web/main-app/src/hooks/useTokenRefresh.ts` | production | 96 lines, imports jwt utilities |
| Session service | `apps/web/main-app/src/services/auth/sessionService.ts` | production | 161 lines (mentioned in REPA-018 scope) |

### Active In-Progress Work

| Story ID | Status | Description | Potential Overlap |
|----------|--------|-------------|-------------------|
| REPA-001 | Completed | Create @repo/upload package structure | Provides package pattern reference |
| REPA-002 | Ready to Work | Migrate upload client functions | No overlap |
| REPA-004 | Ready to Work | Migrate image processing | No overlap |

### Constraints to Respect

- **REPA naming convention**: Use REPA-XXX (3 digits), not XXYZ format
- **Package location**: Core logic goes in `packages/core/*`
- **No barrel files**: Direct imports from source files only
- **Zod-first types**: All types must be defined via Zod schemas with `z.infer<>`
- **Test coverage**: Maintain 45% minimum global coverage
- **Dependencies**: JWT utils currently imported in 7 files (6 in main-app, 1 in useTokenRefresh)

---

## Retrieved Context

### Related Endpoints

No backend endpoints directly related (this is frontend-only utilities).

### Related Components

**Files importing JWT utilities:**
- `apps/web/main-app/src/lib/route-guards.ts` - Uses `isTokenExpired`, `getTokenScopes`
- `apps/web/main-app/src/hooks/useTokenRefresh.ts` - Uses `isTokenExpired`
- Test files (2 files)

**Files importing route guard utilities:**
- `apps/web/main-app/src/routes/index.ts` - Uses `RouteGuards` presets
- Test files (1 file)

### Reuse Candidates

**Package structure pattern (from REPA-001 / @repo/upload):**
```
packages/core/auth-utils/
  src/
    jwt/
      index.ts              # JWT decode, expiration checking, scope extraction
      __tests__/
        index.test.ts
    guards/
      index.ts              # Route guard factory, presets, composition
      __tests__/
        index.test.ts
    __types__/
      index.ts              # Zod schemas for JWT payloads, guard options
    index.ts                # Barrel export
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

**Similar packages to reference:**
- `@repo/logger` - Simple utility package (122 lines similar to jwt.ts)
- `@repo/upload` - Recently created, has subpath exports pattern
- `@repo/accessibility` - Similar utility nature

---

## Knowledge Context

### Lessons Learned

No lessons loaded (no KB search performed as this is initial seed generation).

### Blockers to Avoid (from past stories)

- Missing or inactive baseline (current gap - logged above)
- Breaking changes during migration without deprecation period
- Insufficient test migration leading to coverage drops

### Architecture Decisions (ADRs)

No ADR log found or loaded. Will need to check `plans/stories/ADR-LOG.md` if it exists.

### Patterns to Follow

**From CLAUDE.md:**
- Zod-first types (REQUIRED) - all types via Zod schemas
- Component directory structure with `__types__/` and `__tests__/`
- No barrel files in app code, but packages can have index.ts exports
- Import via `@repo/*` workspace packages
- Use `@repo/logger` (never console.log)

**From @repo/upload package structure:**
- Subpath exports for modular access
- Separate directories for logical grouping (client, hooks, types, etc.)
- Vite build with vite-plugin-dts for type generation
- Vitest for testing

### Patterns to Avoid

- Don't create barrel files for re-exports (except at package root)
- Don't use TypeScript interfaces - use Zod schemas
- Don't hardcode values - use environment variables where appropriate
- Don't skip test migration

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title

Create @repo/auth-utils Package

### Description

**Context:**
Authentication utilities are currently located in `apps/web/main-app/src/lib/` and are used across multiple files within main-app. The JWT utilities (122 lines) provide token decoding, expiration checking, and scope extraction. The route guard utilities (345 lines) provide a flexible factory pattern for creating TanStack Router guards with support for authentication, roles, permissions, and token expiration checking.

These utilities are well-tested (1,426 lines of tests combined) and production-ready, but are currently locked to main-app. Other apps cannot reuse them, and related auth stories (REPA-012 for auth hooks, REPA-018 for auth services) will need a shared auth-utils package to build upon.

**Problem:**
1. JWT and route guard utilities are main-app specific and cannot be shared with other web apps
2. No centralized package for authentication utility functions
3. Future auth packages (REPA-012, REPA-018) will need these utilities as dependencies
4. 6 stub useModuleAuth implementations across apps indicate need for shared auth infrastructure

**Solution:**
Create `@repo/auth-utils` package in `packages/core/auth-utils/` to consolidate JWT and route guard utilities. Package will have two main modules:
- `@repo/auth-utils/jwt` - JWT decoding, expiration checking, scope extraction
- `@repo/auth-utils/guards` - TanStack Router guard factory, presets, composition utilities

### Initial Acceptance Criteria

- [ ] AC-1: Create `packages/core/auth-utils` with standard package structure (package.json, tsconfig.json, vite.config.ts, vitest.config.ts, README.md)
- [ ] AC-2: Move JWT utilities from `apps/web/main-app/src/lib/jwt.ts` to `@repo/auth-utils/jwt`
  - Convert all TypeScript interfaces to Zod schemas (JwtPayload, CognitoIdTokenPayload, CognitoAccessTokenPayload)
  - Maintain all 5 exported functions: decodeToken, isTokenExpired, getTokenExpiration, getTokenPayload, getTokenScopes
- [ ] AC-3: Move route guard utilities from `apps/web/main-app/src/lib/route-guards.ts` to `@repo/auth-utils/guards`
  - Convert RouteGuardOptions interface to Zod schema
  - Maintain createTanStackRouteGuard factory function
  - Maintain RouteGuards preset guards (public, protected, verified, admin, moderator, guestOnly)
  - Maintain LegacyRoutePatterns for backward compatibility
  - Maintain composeMiddleware composition utility
  - Maintain ROUTE_METADATA_CONFIG constant
- [ ] AC-4: Migrate tests from `apps/web/main-app/src/lib/__tests__/` to `@repo/auth-utils/src/__tests__/`
  - Migrate jwt.test.ts (430 lines) to `jwt/__tests__/index.test.ts`
  - Migrate route-guards.test.ts (996 lines) to `guards/__tests__/index.test.ts`
  - Update test imports to use package paths
  - Verify all tests pass with 100% coverage maintained
- [ ] AC-5: Configure package exports for subpath imports
  - Root export: `@repo/auth-utils` (exports both jwt and guards)
  - Subpath export: `@repo/auth-utils/jwt`
  - Subpath export: `@repo/auth-utils/guards`
- [ ] AC-6: Update main-app imports to use `@repo/auth-utils`
  - Update 7 files importing from `lib/jwt` or `lib/route-guards`
  - Delete old `apps/web/main-app/src/lib/jwt.ts` and `apps/web/main-app/src/lib/route-guards.ts`
  - Delete old test files from main-app
  - Verify main-app builds and all tests pass
- [ ] AC-7: Add package to relevant package.json files
  - Add dependency in `apps/web/main-app/package.json`
  - Document in package README with usage examples
- [ ] AC-8: Verify no regression in test coverage
  - Run tests in main-app (affected by import changes)
  - Run tests in @repo/auth-utils package
  - Confirm 45% minimum global coverage maintained

### Non-Goals

- Implementing new authentication features (out of scope - focus on migration only)
- Moving session service (covered by REPA-018)
- Implementing useModuleAuth (covered by REPA-012)
- Moving useTokenRefresh hook (covered by REPA-012)
- Updating other apps to use @repo/auth-utils (can be done in future stories)
- Changes to authentication logic or behavior (pure migration)

### Reuse Plan

**Components:**
- None (utility functions only)

**Patterns:**
- Package structure pattern from `@repo/upload` (REPA-001)
- Subpath exports pattern from `@repo/upload`
- Vite build configuration from `@repo/logger`
- Zod-first types from project conventions

**Packages:**
- `@repo/logger` - for logging in package functions (already imported)
- `@tanstack/react-router` - peer dependency for route guard types
- `zod` - for schema definitions (REQUIRED per CLAUDE.md)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- JWT utilities have 430 lines of existing tests with excellent coverage (base64 decoding, token expiration with fake timers, scope extraction)
- Route guard tests have 996 lines covering authentication flows, role checking, permission checking, token expiration, middleware composition
- Focus UAT on:
  1. Import path changes don't break main-app functionality
  2. All existing test cases still pass after migration
  3. Package exports work correctly for both root and subpath imports
  4. TypeScript types are correctly exported and available to consumers

### For UI/UX Advisor

- No UI components in this story (utility functions only)
- No user-facing changes expected
- This is pure infrastructure work

### For Dev Feasibility

**Critical dependencies:**
- This package is a dependency for REPA-012 (auth-hooks) and REPA-018 (auth-services)
- Consider completing this story before starting REPA-012 or REPA-018

**Migration strategy:**
1. Create package structure first (REPA-001 pattern)
2. Copy code before converting to Zod (maintain behavior)
3. Convert interfaces to Zod schemas incrementally
4. Migrate tests one file at a time
5. Update main-app imports last (after package is working)
6. Run full test suite to verify no breakage

**Zod conversion notes:**
- JwtPayload has index signature `[key: string]: unknown` - use z.record() or passthrough()
- CognitoIdTokenPayload extends JwtPayload - use `.extend()` or `.merge()`
- RouteGuardOptions has many optional fields - extensive use of `.optional()`

**Risk mitigation:**
- Keep old files in main-app until package is confirmed working
- Use git branch to isolate changes
- Verify builds at each step (package build, main-app build, tests)
- Consider feature flag if rolling out to other apps immediately

**Estimated complexity:**
- Low-medium complexity (pure migration, no new features)
- Well-tested code reduces risk
- Zod conversion adds some work but improves type safety
- 2-3 SP reasonable estimate
