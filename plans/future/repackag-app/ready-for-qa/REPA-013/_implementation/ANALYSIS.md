# Elaboration Analysis - REPA-013

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry. Package creation for JWT and route guard utilities only. |
| 2 | Internal Consistency | FAIL | High | AC-2 lists property `checkTokenExpiration` but actual code uses `checkTokenExpiry` (line 20, 77, 166+ in route-guards.ts). Story must use correct property name. |
| 3 | Reuse-First | PASS | — | Excellent reuse strategy. References REPA-001 package pattern, follows @repo/upload and @repo/logger patterns. |
| 4 | Ports & Adapters | PASS | — | Not applicable - utility functions only, no API endpoints or business logic requiring ports/adapters separation. |
| 5 | Local Testability | PASS | — | Comprehensive test migration plan. 1,426 lines of existing tests ensure coverage. All tests are runnable via Vitest. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. Zod conversion strategy is clear with code examples. Migration steps are concrete. |
| 7 | Risk Disclosure | PASS | — | Risks properly disclosed: test fragility (fake timers), missing prerequisites (@tanstack/react-router version), Zod schema ambiguity. |
| 8 | Story Sizing | PASS | — | 8 ACs for 467 lines of code + 1,426 lines of tests = 3 SP is reasonable. Well-tested migration with Zod conversion adds complexity but is bounded. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Property name inconsistency | High | AC-2 description mentions "token expiration checking" generically but doesn't specify the exact property name. Code uses `checkTokenExpiry` (not `checkTokenExpiration`). Update AC-2 to explicitly state: "Maintain `checkTokenExpiry` property (note: not `checkTokenExpiration`)" to avoid confusion during migration. |
| 2 | Zod version inconsistency | Medium | Story AC-1 doesn't specify Zod version. main-app uses `zod: ^3.25.76`, @repo/upload uses `zod: 4.1.13`, @repo/logger uses `zod: ^4.0.5`, @repo/accessibility uses `zod: ^3.22.4`. Recommend using monorepo-standard version (appears to be 4.x based on @repo/upload). Add explicit Zod version to AC-1 dependencies list. |
| 3 | Import count verification | Low | Story states "7 files importing these utilities" but grep found only 3 files (routes/index.ts, hooks/useTokenRefresh.ts, hooks/__tests__/useTokenRefresh.test.tsx). The lib/route-guards.ts itself imports jwt.ts (internal), plus 2 test files. Verify exact count: may be 3-7 depending on whether test files and self-imports are included. Update AC-6 with precise file list. |
| 4 | Package exports configuration | Low | AC-5 shows package.json exports pointing to source files (./src/index.ts), but AC-1 specifies vite build. Standard pattern from @repo/upload shows exports pointing to dist/ files. Story should clarify: dev exports use src/, production exports use dist/. See @repo/upload exports for reference pattern. |

## Split Recommendation

Not applicable. Story is appropriately sized for a package creation and migration story.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-structured and ready for implementation with **3 required fixes**:

1. **HIGH PRIORITY**: Clarify property naming (`checkTokenExpiry` vs `checkTokenExpiration`) in AC-2
2. **MEDIUM PRIORITY**: Specify Zod version in AC-1 dependencies (recommend 4.1.13 to match @repo/upload)
3. **LOW PRIORITY**: Verify and document exact import count in AC-6 (may be 3-7 files)

The story demonstrates strong elaboration quality:
- Clear migration path with Zod conversion examples
- Comprehensive test coverage (1,426 lines migrated)
- Excellent reuse strategy (REPA-001 pattern reference)
- Detailed Zod conversion strategy with code examples
- Protected features documented (session service, useModuleAuth excluded)

Once the 3 issues are addressed, the story is ready for implementation.

---

## MVP-Critical Gaps

None - core migration journey is complete.

**Analysis Details:**

The story's core journey is migrating JWT and route guard utilities from main-app to a shared package with Zod conversion. All essential elements are present:

1. **Package Structure**: Complete specification with standard directory structure, following REPA-001 pattern

2. **Code Migration**: Both JWT utilities (122 lines) and route guard utilities (345 lines) are clearly scoped with all exported functions listed

3. **Zod Conversion**: Detailed strategy with code examples for:
   - Index signatures (JwtPayload with `.passthrough()`)
   - Interface extension (CognitoIdTokenPayload with `.extend()`)
   - Optional fields (RouteGuardOptions with extensive `.optional()`)

4. **Test Migration**: All 1,426 lines of tests are in scope with verification checkpoints

5. **Import Updates**: Clear guidance for updating consuming files (though exact count needs verification per Issue #3)

6. **Build Configuration**: Vite + vite-plugin-dts for type generation, following @repo/upload pattern

The three issues identified (property naming, Zod version, import count) are **clarifications**, not missing functionality. They do not block the core migration journey - they ensure accuracy during implementation.

---

## Additional Observations

### Strengths

1. **Exceptional Reuse Strategy**: Story references multiple existing packages:
   - REPA-001 for package structure pattern
   - @repo/upload for subpath exports (122 lines similar to jwt.ts)
   - @repo/logger for simple utility package pattern
   - @repo/accessibility for A11y utilities pattern

2. **Comprehensive Test Migration**: 1,426 lines of tests broken down:
   - jwt.test.ts: 430 lines (token decoding, expiration, scope extraction)
   - route-guards.test.ts: 995 lines (auth flows, roles, permissions, composition)
   - Story explicitly includes adding new Zod validation tests

3. **Clear Dependency Chain**: Story documents it blocks REPA-012 (auth-hooks) and REPA-018 (auth-services), establishing clear priority

4. **Well-Documented Architecture**:
   - Package structure diagram showing jwt/ and guards/ modules
   - Zod conversion examples for all 3 interfaces
   - Import pattern examples (before/after)
   - Migration strategy with 6 concrete steps

5. **Production-Ready Code**: Both files are production code with comprehensive tests, reducing migration risk

### Technical Notes

**Zod Schema Design:**

The story's Zod conversion strategy is sound:

```typescript
// Index signature handling (JwtPayload)
const JwtPayloadSchema = z.object({
  sub: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
}).passthrough() // ✓ Correct - allows additional properties

// Interface extension (CognitoIdTokenPayload)
const CognitoIdTokenPayloadSchema = JwtPayloadSchema.extend({
  email: z.string().email(),
  email_verified: z.boolean(),
  'cognito:username': z.string(),
  'cognito:groups': z.array(z.string()).optional(),
}) // ✓ Correct - extends base schema

// Optional fields (RouteGuardOptions)
const RouteGuardOptionsSchema = z.object({
  requireAuth: z.boolean().optional(),
  requireRoles: z.array(z.string()).optional(),
  // ... extensive use of .optional()
}) // ✓ Correct - all fields are optional in original interface
```

**One refinement**: JwtPayload has required fields in the actual code (`sub`, `exp`, `iat` are not optional based on usage in `isTokenExpired` line 75-80). The schema should be:

```typescript
const JwtPayloadSchema = z.object({
  sub: z.string(),        // Required (no .optional())
  exp: z.number(),        // Required (checked in isTokenExpired)
  iat: z.number(),        // Required (standard JWT claim)
}).passthrough()
```

Add this clarification to FUTURE-OPPORTUNITIES.md as a refinement opportunity.

**Peer Dependency Pattern:**

Story specifies `@tanstack/react-router` as peer dependency. Good pattern from @repo/gallery package.json (lines 46-54):

```json
"peerDependencies": {
  "@tanstack/react-router": "^1.130.0",
  "react": "^19.0.0"
},
"peerDependenciesMeta": {
  "@tanstack/react-router": {
    "optional": true
  }
}
```

This allows route guard utilities to work with TanStack Router without forcing the dependency on JWT utilities consumers. Story should mention this pattern in AC-1.

**Build Configuration:**

AC-1 mentions vite-plugin-dts but AC-5 shows exports pointing to src/ files. The @repo/upload pattern (lines 11-36) shows the correct approach:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",  // Production uses dist/
    "types": "./dist/index.d.ts"
  },
  "./jwt": {
    "import": "./dist/jwt/index.js",
    "types": "./dist/jwt/index.d.ts"
  }
}
```

During development, TypeScript resolves `workspace:*` to source files. For production builds, exports point to dist/. Story should clarify this in AC-5.

### Validation Against Project Standards

**CLAUDE.md Compliance**:
- ✅ Zod-first types specified with conversion strategy
- ✅ Functional components (not applicable - utility functions only)
- ✅ No barrel files warning (correct - package can have index.ts, apps cannot)
- ✅ @repo/logger usage (already imported in existing code)
- ✅ Component directory structure (__tests__, __types__)
- ✅ Named exports (all functions use named exports)

**Monorepo Standards**:
- ✅ pnpm workspace packages (AC-1 specifies workspace:* dependencies)
- ✅ Turborepo integration (implied, should verify in AC-8)
- ✅ Vitest for testing (AC-1 specifies vitest.config.ts)
- ✅ TypeScript strict mode (implied, should verify in AC-1)

### Dependencies Validation

**Current versions in monorepo**:
- `@tanstack/react-router`: ^1.130.2 (main-app)
- `zod`: varies (^3.22.4 to 4.1.13 across packages)
- `@repo/logger`: workspace:* (already used in both jwt.ts and route-guards.ts)
- `react`: ^19.0.0 (main-app) / ^19.1.0 (@repo/upload)

**Recommendations for AC-1**:
- Zod: Use 4.1.13 (matches @repo/upload, most recent in monorepo)
- React: Use ^19.1.0 peer dependency (matches @repo/upload)
- @tanstack/react-router: Use ^1.130.0 peer dependency with optional flag (matches @repo/gallery pattern)

### Test Plan Validation

**Happy Path Tests (8 tests)**:
- ✅ All tests are concrete and executable
- ✅ Tests cover both JWT and route guard functionality
- ✅ Package import tests (root and subpath) verify export configuration
- ✅ Evidence format specified (Jest assertions, TypeScript compilation)

**Error Cases (5 tests)**:
- ✅ Cover invalid token format, expiration, missing fields
- ✅ Guard failure scenarios (no auth, invalid role)
- ✅ Zod validation error handling

**Edge Cases (6 tests)**:
- ✅ Token without expiration, empty scopes
- ✅ Multiple guard composition, short-circuit behavior
- ✅ Boundary values (expiration timestamp)
- ✅ TypeScript type safety verification

**Test Fragility Note**: Story correctly identifies fake timer dependency for token expiration tests. Existing tests (430 lines) already use this pattern successfully, so migration risk is low.

### Risk Assessment

**Identified Risks** (from story):
1. Token expiration tests rely on fake timers ✅ (existing pattern, low risk)
2. Route guard tests depend on @tanstack/react-router types ✅ (peer dependency handles this)
3. Zod schema constraints may need adjustment ✅ (see Technical Notes above - minor refinement needed)
4. Route guard error handling patterns ✅ (follow existing behavior - no changes)

**Additional Risks** (not in story):
1. **Import path updates**: 7 files need import updates (possibly 3-7, see Issue #3). Risk: Missing a file during migration. Mitigation: Use grep to find all imports before starting.
2. **Zod version conflicts**: Different packages use different Zod versions. Risk: Runtime errors if schemas created with incompatible versions. Mitigation: Standardize on 4.1.13 (Issue #2).
3. **Type generation**: vite-plugin-dts must generate correct types for subpath exports. Risk: TypeScript errors in consuming apps. Mitigation: Test imports in AC-8 before deleting old files.

All risks are low-medium severity with clear mitigations.

### Sizing Validation

**Story Points**: 3 SP

**Complexity factors**:
- 467 lines of code to migrate (122 JWT + 345 route guards)
- 1,426 lines of tests to migrate (430 + 996)
- 3 TypeScript interfaces → Zod schemas conversion
- 3-7 import paths to update
- Package structure creation (following REPA-001 pattern reduces complexity)
- Build configuration (Vite + vite-plugin-dts)

**Comparable work**:
- REPA-001: 2 SP for package structure only (0 LOC migration)
- REPA-002: 3 SP for 200-300 LOC migration
- REPA-004: 3 SP for image processing migration

**Verdict**: 3 SP is appropriate. The code is well-tested and production-ready, reducing risk. Zod conversion adds some complexity but is bounded by clear examples. Similar in scope to REPA-002 and REPA-004.

---

## Worker Token Summary

- **Input**: ~48,000 tokens (story file + seed + stories index + agent instructions + 2 source files + 3 package.json files + REPA-001 analysis)
- **Output**: ~3,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- **Total**: ~51,800 tokens
