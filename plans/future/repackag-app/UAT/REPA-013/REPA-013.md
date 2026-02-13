---
id: REPA-013
title: "Create @repo/auth-utils Package"
status: uat
priority: P2
story_points: 3
epic: repackag-app
feature_area: infrastructure
experiment_variant: control
created_at: "2026-02-10"
updated_at: "2026-02-10T20:00:00Z"
elaborated_at: "2026-02-11"
elaboration_verdict: CONDITIONAL PASS
surfaces:
  frontend: true
  backend: false
  database: false
  infrastructure: false
dependencies: []
blocks: [REPA-012, REPA-018]
tags:
  - package-creation
  - auth
  - migration
  - zod-conversion
---

# REPA-013: Create @repo/auth-utils Package

## Context

Authentication utilities are currently located in `apps/web/main-app/src/lib/` and are used across multiple files within main-app. The JWT utilities (122 lines) provide token decoding, expiration checking, and scope extraction. The route guard utilities (345 lines) provide a flexible factory pattern for creating TanStack Router guards with support for authentication, roles, permissions, and token expiration checking.

These utilities are well-tested (1,426 lines of tests combined) and production-ready, but are currently locked to main-app. Other apps cannot reuse them, and related auth stories (REPA-012 for auth hooks, REPA-018 for auth services) will need a shared auth-utils package to build upon.

**Current Reality:**
- JWT utilities: `apps/web/main-app/src/lib/jwt.ts` (122 lines, 5 exported functions, 3 TypeScript interfaces)
- Route guard utilities: `apps/web/main-app/src/lib/route-guards.ts` (345 lines)
- Comprehensive tests: 430 lines (jwt.test.ts) + 996 lines (route-guards.test.ts) = 1,426 lines total
- 7 files importing these utilities (6 in main-app, 1 in hooks)
- 6 stub useModuleAuth implementations across apps indicate need for shared auth infrastructure

**Problem:**
1. JWT and route guard utilities are main-app specific and cannot be shared with other web apps
2. No centralized package for authentication utility functions
3. Future auth packages (REPA-012, REPA-018) will need these utilities as dependencies
4. TypeScript interfaces prevent runtime validation (need Zod conversion)

## Goal

Create `@repo/auth-utils` package in `packages/core/auth-utils/` to consolidate JWT and route guard utilities with proper Zod schemas. Package will have two main modules:
- `@repo/auth-utils/jwt` - JWT decoding, expiration checking, scope extraction
- `@repo/auth-utils/guards` - TanStack Router guard factory, presets, composition utilities

## Non-Goals

- Implementing new authentication features (focus on migration only)
- Moving session service (covered by REPA-018)
- Implementing useModuleAuth (covered by REPA-012)
- Moving useTokenRefresh hook (covered by REPA-012)
- Updating other apps to use @repo/auth-utils (can be done in future stories)
- Changes to authentication logic or behavior (pure migration with Zod conversion)

## Scope

### Packages Touched
- **New Package:** `packages/core/auth-utils/`
- **Updated:** `apps/web/main-app/package.json`
- **Deprecated:** None (new package, no deprecation needed)

### Files Changed
- **Created:**
  - `packages/core/auth-utils/package.json`
  - `packages/core/auth-utils/tsconfig.json`
  - `packages/core/auth-utils/vite.config.ts`
  - `packages/core/auth-utils/vitest.config.ts`
  - `packages/core/auth-utils/README.md`
  - `packages/core/auth-utils/src/jwt/index.ts`
  - `packages/core/auth-utils/src/jwt/__tests__/index.test.ts`
  - `packages/core/auth-utils/src/guards/index.ts`
  - `packages/core/auth-utils/src/guards/__tests__/index.test.ts`
  - `packages/core/auth-utils/src/__types__/index.ts`
  - `packages/core/auth-utils/src/index.ts`
- **Deleted:**
  - `apps/web/main-app/src/lib/jwt.ts`
  - `apps/web/main-app/src/lib/route-guards.ts`
  - `apps/web/main-app/src/lib/__tests__/jwt.test.ts`
  - `apps/web/main-app/src/lib/__tests__/route-guards.test.ts`
- **Updated (imports only):**
  - `apps/web/main-app/src/lib/route-guards.ts` consumers (if any remain)
  - `apps/web/main-app/src/hooks/useTokenRefresh.ts`
  - `apps/web/main-app/src/routes/index.ts`
  - Other files importing from `lib/jwt` or `lib/route-guards`

### Endpoints Touched
None (frontend-only utilities)

## Acceptance Criteria

- [ ] **AC-1: Create Package Structure**
  - Create `packages/core/auth-utils` with standard package structure
  - Add `package.json` with proper workspace configuration
    - Name: `@repo/auth-utils`
    - Type: `module`
    - Dependencies: `@repo/logger`, `@tanstack/react-router` (peer), `zod: ^4.1.13`
    - Exports configured for root and subpath imports
  - Add `tsconfig.json` extending base config
  - Add `vite.config.ts` with vite-plugin-dts for type generation
  - Add `vitest.config.ts` for testing
  - Add `README.md` with usage examples and API documentation
  - _Clarification added by autonomous elaboration: Use zod ^4.1.13 to match @repo/upload and standardize across monorepo_

- [ ] **AC-2: Migrate JWT Utilities with Zod Conversion**
  - Move code from `apps/web/main-app/src/lib/jwt.ts` to `packages/core/auth-utils/src/jwt/index.ts`
  - Convert TypeScript interfaces to Zod schemas:
    - `JwtPayload` → `JwtPayloadSchema` (use `.passthrough()` for index signature)
    - `CognitoIdTokenPayload` → `CognitoIdTokenPayloadSchema` (use `.extend()` from JwtPayload)
    - `CognitoAccessTokenPayload` → `CognitoAccessTokenPayloadSchema` (use `.extend()`)
  - Maintain all 5 exported functions:
    - `decodeToken(token: string): JwtPayload | null`
    - `isTokenExpired(token: string): boolean`
    - `getTokenExpiration(token: string): Date | null`
    - `getTokenPayload<T>(token: string): T | null`
    - `getTokenScopes(token: string): string[]`
  - Add runtime validation using Zod schemas where appropriate
  - Export both schemas and inferred types

- [ ] **AC-3: Migrate Route Guard Utilities with Zod Conversion**
  - Move code from `apps/web/main-app/src/lib/route-guards.ts` to `packages/core/auth-utils/src/guards/index.ts`
  - Convert TypeScript interfaces to Zod schemas:
    - `RouteGuardOptions` → `RouteGuardOptionsSchema` (extensive use of `.optional()`)
    - **CRITICAL**: Property name is `checkTokenExpiry` (not `checkTokenExpiration`) - verify in source code before migration
  - Maintain all exported functions and constants:
    - `createTanStackRouteGuard` factory function
    - `RouteGuards` preset guards (public, protected, verified, admin, moderator, guestOnly)
    - `LegacyRoutePatterns` for backward compatibility
    - `composeMiddleware` composition utility
    - `ROUTE_METADATA_CONFIG` constant
  - Export both schemas and inferred types
  - _Clarification added by autonomous elaboration: Actual code uses `checkTokenExpiry` property name at lines 20, 77, 166+ in route-guards.ts_

- [ ] **AC-4: Migrate and Update Tests**
  - Migrate `apps/web/main-app/src/lib/__tests__/jwt.test.ts` (430 lines) to `packages/core/auth-utils/src/jwt/__tests__/index.test.ts`
  - Migrate `apps/web/main-app/src/lib/__tests__/route-guards.test.ts` (996 lines) to `packages/core/auth-utils/src/guards/__tests__/index.test.ts`
  - Update test imports to use package paths
  - Add tests for Zod schema validation (new test cases)
  - Verify all existing tests pass with 100% coverage maintained
  - Delete old test files from main-app after verification

- [ ] **AC-5: Configure Package Exports**
  - Configure `package.json` exports field for subpath imports:
    ```json
    {
      "exports": {
        ".": {
          "import": "./dist/index.js",
          "types": "./dist/index.d.ts"
        },
        "./jwt": {
          "import": "./dist/jwt/index.js",
          "types": "./dist/jwt/index.d.ts"
        },
        "./guards": {
          "import": "./dist/guards/index.js",
          "types": "./dist/guards/index.d.ts"
        }
      }
    }
    ```
  - Root export from `src/index.ts` exports both jwt and guards modules
  - Verify TypeScript can resolve all export paths
  - Verify build produces correct output structure
  - _Clarification added by autonomous elaboration: Production exports point to dist/ (built output), not src/ files. Follow @repo/upload pattern._

- [ ] **AC-6: Update main-app Imports**
  - Update files importing from `lib/jwt` or `lib/route-guards`:
    - Find all imports: `git grep -l "from.*lib/jwt\|from.*lib/route-guards" apps/web/main-app/src`
    - **Verify exact count before starting** - story claims 7 files but grep found 3-7 depending on counting method
    - Replace with `@repo/auth-utils/jwt` or `@repo/auth-utils/guards`
  - Delete old source files:
    - `apps/web/main-app/src/lib/jwt.ts`
    - `apps/web/main-app/src/lib/route-guards.ts`
  - Delete old test files (after AC-4 verification)
  - Add `@repo/auth-utils` to `apps/web/main-app/package.json` dependencies
  - Verify main-app builds successfully
  - Verify all main-app tests pass
  - _Clarification added by autonomous elaboration: Grep found 3-7 files depending on whether test files and internal imports are counted. Document actual count during implementation._

- [ ] **AC-7: Documentation and Examples**
  - Add comprehensive README.md with:
    - Package overview and purpose
    - Installation instructions
    - JWT utilities usage examples
    - Route guard utilities usage examples
    - Zod schema validation examples
    - Migration guide from old imports
  - Document all exported functions, types, and schemas
  - Include code examples for common use cases
  - Document peer dependencies (@tanstack/react-router)

- [ ] **AC-8: Verify Test Coverage**
  - Run tests in @repo/auth-utils package: `pnpm test --filter @repo/auth-utils`
  - Run tests in main-app (affected by import changes): `pnpm test --filter main-app`
  - Confirm 45% minimum global coverage maintained
  - Verify no coverage regressions from migration
  - CI pipeline passes all quality gates

## Reuse Plan

### Components
None (utility functions only)

### Patterns
- **Package structure:** Follow `@repo/upload` pattern from REPA-001
  - Standard directory structure with `src/`, `__tests__/`, `__types__/`
  - Vite build with vite-plugin-dts for type generation
  - Vitest configuration for testing
  - Subpath exports in package.json
- **Zod-first types:** Per CLAUDE.md requirements
  - All TypeScript interfaces converted to Zod schemas
  - Export both schemas and inferred types
  - Runtime validation where appropriate
- **Testing:** Maintain existing comprehensive test coverage
  - All 1,426 lines of tests migrated
  - Additional tests for Zod validation

### Packages
- `@repo/logger` - for logging in package functions (already imported in existing code)
- `@tanstack/react-router` - peer dependency for route guard types
- `zod` - for schema definitions (REQUIRED per CLAUDE.md)

## Architecture Notes

### Package Structure
```
packages/core/auth-utils/
├── package.json              # Package config with subpath exports
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Build configuration
├── vitest.config.ts          # Test configuration
├── README.md                 # Documentation and examples
└── src/
    ├── index.ts              # Root barrel export (jwt + guards)
    ├── __types__/
    │   └── index.ts          # Shared Zod schemas
    ├── jwt/
    │   ├── index.ts          # JWT utilities
    │   └── __tests__/
    │       └── index.test.ts # JWT tests (430 lines)
    └── guards/
        ├── index.ts          # Route guard utilities
        └── __tests__/
            └── index.test.ts # Route guard tests (996 lines)
```

### Zod Conversion Strategy

**JwtPayload (has index signature):**
```typescript
// Before (TypeScript interface)
interface JwtPayload {
  [key: string]: unknown
  sub?: string
  iat?: number
  exp?: number
}

// After (Zod schema)
const JwtPayloadSchema = z.object({
  sub: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
}).passthrough() // Allows additional properties

type JwtPayload = z.infer<typeof JwtPayloadSchema>
```

**CognitoIdTokenPayload (extends JwtPayload):**
```typescript
// Use .extend() or .merge()
const CognitoIdTokenPayloadSchema = JwtPayloadSchema.extend({
  email: z.string().email(),
  email_verified: z.boolean(),
  'cognito:username': z.string(),
  // ... other Cognito-specific fields
})

type CognitoIdTokenPayload = z.infer<typeof CognitoIdTokenPayloadSchema>
```

**RouteGuardOptions (many optional fields):**
```typescript
const RouteGuardOptionsSchema = z.object({
  requireAuth: z.boolean().optional(),
  requireRoles: z.array(z.string()).optional(),
  requirePermissions: z.array(z.string()).optional(),
  checkTokenExpiration: z.boolean().optional(),
  redirectTo: z.string().optional(),
  // ... extensive use of .optional()
})

type RouteGuardOptions = z.infer<typeof RouteGuardOptionsSchema>
```

### Migration Strategy

1. **Create package structure first** (follow REPA-001 pattern)
2. **Copy code before converting to Zod** (maintain existing behavior)
3. **Convert interfaces to Zod schemas incrementally** (test after each conversion)
4. **Migrate tests one file at a time** (jwt tests first, then guards)
5. **Update main-app imports last** (after package is confirmed working)
6. **Run full test suite** to verify no breakage

### Import Changes

**Before:**
```typescript
// In main-app files
import { decodeToken, isTokenExpired } from '../lib/jwt'
import { RouteGuards, createTanStackRouteGuard } from '../lib/route-guards'
```

**After:**
```typescript
// Using subpath imports
import { decodeToken, isTokenExpired } from '@repo/auth-utils/jwt'
import { RouteGuards, createTanStackRouteGuard } from '@repo/auth-utils/guards'

// Or using root import
import { decodeToken, RouteGuards } from '@repo/auth-utils'
```

## Infrastructure Notes

### Build Configuration
- Use Vite with vite-plugin-dts for type generation (like @repo/logger)
- Output ES modules only (type: "module")
- Generate TypeScript declaration files for all exports
- Ensure subpath exports work correctly in consuming apps

### Testing Configuration
- Vitest for unit tests
- Run tests independently in package (no dependency on main-app)
- Mock @tanstack/react-router types where needed in tests
- Use fake timers for token expiration tests (already in existing tests)

### CI/CD Impact
- New package needs to be built before consuming apps
- Turborepo will handle build ordering automatically
- No deployment impact (utility package only)

## Test Plan

### Scope Summary
- **Endpoints touched:** None (frontend-only utilities)
- **UI touched:** No
- **Data/storage touched:** No

### Happy Path Tests

**Test 1: JWT Token Decoding**
- **Setup:** Valid JWT token string
- **Action:** Call `decodeToken(token)`
- **Expected:** Returns decoded payload object with expected fields
- **Evidence:** Jest assertion on payload shape and values

**Test 2: Token Expiration Check**
- **Setup:** Create token with known expiration time
- **Action:** Call `isTokenExpired(token)` before and after expiration
- **Expected:** Returns false before expiration, true after
- **Evidence:** Jest assertions with fake timers (existing test pattern)

**Test 3: Scope Extraction**
- **Setup:** Token with cognito:groups claim
- **Action:** Call `getTokenScopes(token)`
- **Expected:** Returns array of scope strings
- **Evidence:** Jest assertion on array contents

**Test 4: Route Guard Creation**
- **Setup:** Create guard with `requireAuth: true`
- **Action:** Call guard function with authenticated context
- **Expected:** Returns success, allows navigation
- **Evidence:** Jest assertion on guard return value

**Test 5: Route Guard Presets**
- **Setup:** Use `RouteGuards.protected` preset
- **Action:** Apply guard to route configuration
- **Expected:** Guard properly checks authentication
- **Evidence:** Jest assertion on guard behavior

**Test 6: Middleware Composition**
- **Setup:** Create multiple guards (auth + role)
- **Action:** Compose with `composeMiddleware([guard1, guard2])`
- **Expected:** Both guards execute in order
- **Evidence:** Jest spy assertions on call order

**Test 7: Package Imports (Root)**
- **Setup:** Import from `@repo/auth-utils`
- **Action:** Use exported functions
- **Expected:** All functions available and working
- **Evidence:** TypeScript compilation + test execution

**Test 8: Package Imports (Subpath)**
- **Setup:** Import from `@repo/auth-utils/jwt` and `@repo/auth-utils/guards`
- **Action:** Use exported functions
- **Expected:** Subpath imports resolve correctly
- **Evidence:** TypeScript compilation + test execution

### Error Cases

**Test 1: Invalid Token Format**
- **Setup:** Malformed JWT string (not base64)
- **Action:** Call `decodeToken(invalidToken)`
- **Expected:** Returns null or throws appropriate error
- **Evidence:** Jest assertion on error handling

**Test 2: Expired Token Handling**
- **Setup:** Token with past expiration
- **Action:** Call `isTokenExpired(token)`
- **Expected:** Returns true
- **Evidence:** Jest assertion with fake timers

**Test 3: Missing Required Fields**
- **Setup:** Token payload missing required claims
- **Action:** Call `getTokenPayload<CognitoIdTokenPayload>(token)`
- **Expected:** Zod validation fails with clear error
- **Evidence:** Jest assertion on Zod error

**Test 4: Guard Without Auth Context**
- **Setup:** Guard requiring auth, no auth context provided
- **Action:** Execute guard
- **Expected:** Guard fails with redirect or error
- **Evidence:** Jest assertion on guard return value

**Test 5: Invalid Role Check**
- **Setup:** Guard requiring role, user has different role
- **Action:** Execute guard
- **Expected:** Guard fails, prevents navigation
- **Evidence:** Jest assertion on guard return value

### Edge Cases

**Test 1: Token Without Expiration**
- **Setup:** JWT token missing 'exp' claim
- **Action:** Call `isTokenExpired(token)`
- **Expected:** Handles gracefully (assumes not expired or requires exp)
- **Evidence:** Jest assertion on return value

**Test 2: Empty Scopes Array**
- **Setup:** Token with empty cognito:groups
- **Action:** Call `getTokenScopes(token)`
- **Expected:** Returns empty array (not null)
- **Evidence:** Jest assertion on array

**Test 3: Multiple Guard Composition**
- **Setup:** Compose 5+ guards
- **Action:** Execute composed middleware
- **Expected:** All guards execute, performance acceptable
- **Evidence:** Jest spy assertions on all guards called

**Test 4: Guard Short-Circuit**
- **Setup:** First guard in composition fails
- **Action:** Execute composed middleware
- **Expected:** Subsequent guards not executed (short-circuit)
- **Evidence:** Jest spy assertions on call counts

**Test 5: Boundary Value - Expiration Timestamp**
- **Setup:** Token expiring in 1 second
- **Action:** Check expiration at boundary moment
- **Expected:** Correct before/after behavior
- **Evidence:** Jest fake timers to control time

**Test 6: TypeScript Type Safety**
- **Setup:** Import types from package
- **Action:** Use types in consuming code
- **Expected:** TypeScript compilation succeeds, types available
- **Evidence:** tsc --noEmit in CI

### Required Tooling Evidence

**Backend:** None (frontend-only utilities)

**Frontend:**
- **Vitest runs required:**
  - `pnpm test --filter @repo/auth-utils` - All package tests pass
  - `pnpm test --filter main-app` - Main-app tests pass with new imports
  - CI pipeline full test suite
- **What to assert:**
  - All 1,426 lines of existing tests pass
  - New Zod validation tests pass
  - No coverage regressions
  - TypeScript compilation succeeds
- **Required artifacts:**
  - Test coverage report showing 45%+ global coverage
  - Build output showing successful compilation
  - No ESLint errors in package code

**Manual Verification:**
- Import package in main-app and run dev server
- Verify no runtime errors in browser console
- Verify route guards work correctly in navigation
- Verify token refresh hook still functions

### Risks to Call Out

**Test Fragility:**
- Token expiration tests rely on fake timers - ensure timer implementation matches existing pattern
- Route guard tests depend on @tanstack/react-router types - may need mocking in package tests

**Missing Prerequisites:**
- Need to verify @tanstack/react-router version compatibility
- Need to confirm peer dependency version ranges

**Ambiguity:**
- Exact Zod schema constraints for JWT payloads may need adjustment based on actual token formats
- Route guard error handling patterns may vary - follow existing behavior exactly

## Predictions

```yaml
predictions:
  split_risk: 0.3
  review_cycles: 2
  token_estimate: 120000
  confidence: medium
  similar_stories:
    - story_id: REPA-001
      similarity_score: 0.85
      actual_cycles: null
      actual_tokens: null
      split_occurred: false
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
  notes: "Low-medium complexity migration with well-tested code. Zod conversion adds minimal risk. Similar to REPA-001 package creation pattern."
```

## Reality Baseline

### Baseline Used
None (no active baseline reality file exists)

### Protected Features
None declared in seed

### Relevant Existing Code
- **JWT utilities:** `apps/web/main-app/src/lib/jwt.ts` (122 lines, production)
  - 5 exported functions: decodeToken, isTokenExpired, getTokenExpiration, getTokenPayload, getTokenScopes
  - 3 TypeScript interfaces: JwtPayload, CognitoIdTokenPayload, CognitoAccessTokenPayload
- **Route guards:** `apps/web/main-app/src/lib/route-guards.ts` (345 lines, production)
  - createTanStackRouteGuard factory
  - RouteGuards presets
  - composeMiddleware utility
  - ROUTE_METADATA_CONFIG constant
- **Tests:** 1,426 lines combined
  - jwt.test.ts: 430 lines (comprehensive coverage)
  - route-guards.test.ts: 996 lines (authentication flows, role/permission checking)
- **Consumers:**
  - `apps/web/main-app/src/hooks/useTokenRefresh.ts` (96 lines, imports jwt utilities)
  - `apps/web/main-app/src/routes/index.ts` (imports RouteGuards)
  - Total: 7 files importing these utilities

### Dependencies
- **Blocks:** REPA-012 (auth-hooks), REPA-018 (auth-services)
- **Depends On:** None
- **Patterns:** REPA-001 (@repo/upload) provides package structure reference

### Constraints Verified
- REPA naming convention (3 digits) ✓
- Package location: packages/core/* ✓
- No barrel files in app code (package can have index.ts) ✓
- Zod-first types required ✓
- 45% minimum test coverage ✓
- No conflicts with in-progress work ✓

---

**Generated by:** pm-story-generation-leader
**Generated at:** 2026-02-10
**Seed file:** plans/future/repackag-app/backlog/REPA-013/_pm/STORY-SEED.md
**Experiment variant:** control

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Property name inconsistency (AC-2 vs code) | AC-3 clarified with explicit property name 'checkTokenExpiry' and line references | AC-3 |
| 2 | Zod version inconsistency across packages | AC-1 updated to specify zod: ^4.1.13 matching @repo/upload | AC-1 |
| 3 | Package exports configuration (src/ vs dist/) | AC-5 updated with correct dist/ export pattern from @repo/upload | AC-5 |
| 4 | Import count ambiguity (7 files vs 3-7 found) | AC-6 updated with verification step for implementation time | AC-6 |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | JwtPayload schema optionality refinement | edge-case | Logged to KB for future refinement |
| 2 | Token validation at parse time | enhancement | Logged to KB for future enhancement |
| 3 | Guard composition testing scenarios | observability | Logged to KB for future observability |
| 4 | Import automation codemod | dev-experience | Logged to KB for future DX improvement |
| 5 | Token without 'sub' validation | edge-case | Logged to KB for future refinement |
| 6 | Token refresh integration | integration | Logged to KB as potential follow-up |
| 7 | Guard telemetry monitoring | observability | Logged to KB for infrastructure phase |
| 8 | Guard testing utilities | dev-experience | Logged to KB for follow-up story |
| 9 | JWT parsing performance | performance | Logged to KB for optimization phase |
| 10 | Type-safe route metadata | type-safety | Logged to KB as nice-to-have |
| 11 | Guard composition helpers | dev-experience | Logged to KB as syntactic sugar |
| 12 | Custom redirect logic | enhancement | Logged to KB for edge cases |
| 13 | Permission caching | performance | Logged to KB for optimization |
| 14 | Guard middleware types | type-safety | Logged to KB for type system |
| 15 | Subpath export documentation | documentation | Logged to KB for future docs |

### Summary

- **ACs clarified**: 4 (AC-1, AC-3, AC-5, AC-6)
- **KB entries logged**: 15 (deferred for future KB write)
- **MVP-critical gaps**: 0 (all resolved)
- **Mode**: autonomous
- **Audit issues resolved**: 4 (internal consistency, decision completeness, story sizing, exports configuration)
- **Verdict**: CONDITIONAL PASS - All issues resolved, ready for implementation
