# REPA-017 Dev Feasibility Review

## Story Context

**Story:** REPA-017 - Consolidate Component-Level Schemas
**Goal:** Move duplicate FileValidationResultSchema from component __types__ to @repo/upload/types
**Depends On:** REPA-005 (Migrate Upload Components) - pending

---

## Executive Summary

**Verdict:** ✅ **FEASIBLE with coordination**

This is a straightforward schema consolidation with minimal technical risk. The story follows the established pattern from REPA-006 (completed successfully). The main coordination point is that REPA-005 (component migration) is still pending, so components remain in their current location.

**Complexity:** Simple
**Estimated Effort:** 2 story points
**Risk Level:** Low
**Blockers:** None (REPA-005 dependency is for components, not schema)

---

## Technical Analysis

### 1. Schema Consolidation

#### Current State

**Duplicate Schemas (Identical):**

1. **InstructionsUpload** (`apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts`):
   ```typescript
   export const FileValidationResultSchema = z.object({
     valid: z.boolean(),
     error: z.string().optional(),
   })
   export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
   ```

2. **ThumbnailUpload** (`apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts`):
   ```typescript
   export const FileValidationResultSchema = z.object({
     valid: z.boolean(),
     error: z.string().optional(),
   })
   export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
   ```

**Backend Schema (Different - Do NOT Consolidate):**

3. **moc-instructions-core** (`packages/backend/moc-instructions-core/src/__types__/index.ts`):
   ```typescript
   export const FileValidationResultSchema = z.object({
     fileId: z.string().uuid(),
     filename: z.string(),
     success: z.boolean(),
     errors: z.array(z.object({...})).optional(),
     warnings: z.array(z.object({...})).optional(),
     pieceCount: z.number().optional(),
   })
   ```
   - **Different purpose:** Server-side validation with per-file error details
   - **Different shape:** Includes fileId, filename, errors[], warnings[], pieceCount
   - **Different package:** Backend moc-instructions-core vs frontend @repo/upload
   - **Action:** Leave backend schema unchanged

#### Proposed Solution

**Target Location:** `packages/core/upload/src/types/validation.ts`

**Schema Definition:**
```typescript
import { z } from 'zod'

/**
 * Client-side file validation result
 * Used by upload components for user-facing validation feedback
 */
export const FileValidationResultSchema = z.object({
  /** Whether the file passed validation */
  valid: z.boolean(),
  /** Optional error message if validation failed */
  error: z.string().optional(),
})

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
```

**Feasibility:** ✅ Straightforward
- Schema is trivial (3 lines)
- No complex logic or dependencies
- Well-documented purpose (client-side validation)

---

### 2. Package Structure

#### Current @repo/upload Structure (Post-REPA-006)

```
packages/core/upload/
├── src/
│   ├── types/
│   │   ├── __tests__/
│   │   │   ├── session.test.ts (177 LOC)
│   │   │   ├── upload.test.ts (249 LOC)
│   │   │   └── slug.test.ts (133 LOC)
│   │   ├── session.ts (170 LOC)
│   │   ├── upload.ts (279 LOC)
│   │   ├── slug.ts (111 LOC)
│   │   ├── edit.ts (185 LOC)
│   │   └── index.ts (barrel export)
│   ├── client/ (from REPA-002)
│   ├── hooks/ (from REPA-003 - pending)
│   ├── image/ (from REPA-004)
│   ├── components/ (from REPA-005 - pending)
│   └── index.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

#### Proposed Changes

**New Files:**
1. `src/types/validation.ts` (~15 LOC with comments)
2. `src/types/__tests__/validation.test.ts` (~150 LOC)

**Modified Files:**
1. `src/types/index.ts` - Add export for FileValidationResultSchema

**Feasibility:** ✅ Follows established pattern
- REPA-006 established this exact structure
- Barrel export pattern is consistent
- Test location follows convention
- No structural changes needed

---

### 3. Import Updates

#### Component Import Changes

**Before:**
```typescript
// InstructionsUpload/__types__/index.ts
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})
export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
```

**After:**
```typescript
// InstructionsUpload/__types__/index.ts
import { FileValidationResultSchema, type FileValidationResult } from '@repo/upload/types'

// Re-export for component use (temporary until REPA-005 migrates component)
export { FileValidationResultSchema, type FileValidationResult }
```

**Impact Analysis:**
- 2 component __types__ files to update
- Components remain in app-instructions-gallery (REPA-005 pending)
- No breaking changes (re-export maintains backward compatibility)
- Component tests should continue to pass

**Feasibility:** ✅ Low risk
- Import path change only
- No API changes
- Re-export maintains compatibility
- Easy to verify with TypeScript compilation

---

### 4. Dependency Analysis

#### REPA-005 Coordination

**Status:** pending (blocked on REPA-003, REPA-004)

**REPA-005 Scope:**
- Migrate ThumbnailUpload component to @repo/upload/components
- Migrate InstructionsUpload component to @repo/upload/components
- Migrate 7 Uploader sub-components

**Coordination Strategy:**
```
REPA-017 (this story):
  ├── Create validation.ts in @repo/upload/types/
  ├── Update component imports (components stay in place)
  └── Re-export from component __types__ for backward compatibility

REPA-005 (later):
  ├── Migrate components to @repo/upload/components/
  ├── Remove re-exports from component __types__
  └── Components import directly from @repo/upload/types
```

**Why This Order Works:**
1. REPA-017 consolidates schema first (no breaking changes)
2. Components continue to work in current location
3. REPA-005 later migrates components
4. Clean separation of concerns

**Feasibility:** ✅ Proper sequencing
- Schema migration independent of component migration
- Re-exports prevent breaking changes
- REPA-005 can cleanly remove re-exports when ready

#### REPA-006 Foundation

**Status:** completed

**What REPA-006 Provided:**
- @repo/upload/src/types/ structure
- Barrel export pattern in types/index.ts
- Test structure in types/__tests__/
- Package.json exports configuration
- TypeScript compilation setup

**Feasibility:** ✅ Foundation solid
- REPA-006 passed QA successfully
- Pattern is proven and working
- No structural changes needed

---

### 5. Reuse Assessment

#### Reuse Opportunities

**Package Structure Pattern (from REPA-006):**
```typescript
// Established pattern:
packages/core/upload/src/types/
  ├── {domain}.ts        // Schema definitions
  ├── __tests__/
  │   └── {domain}.test.ts  // Comprehensive tests
  └── index.ts           // Barrel export
```

**Test Pattern (from REPA-006):**
- Schema validation tests
- Type inference tests
- Integration/export tests
- Coverage ≥45%

**Feasibility:** ✅ Strong reuse
- Copy test structure from session.test.ts
- Follow barrel export pattern from index.ts
- Use existing vitest config
- No new tooling needed

#### No Backend Reuse

**Backend FileValidationResultSchema:**
- Different purpose (server-side vs client-side)
- Different shape (fileId, filename, errors[], warnings[] vs valid, error)
- Different package (moc-instructions-core vs @repo/upload)

**Decision:** Do NOT consolidate backend schema

**Feasibility:** ✅ Correct separation
- Backend and frontend validation have different needs
- Backend schema supports per-file error reporting
- Frontend schema supports simple user feedback
- Separation is intentional and correct

---

### 6. Testing Strategy

#### Test Coverage

**Proposed Tests:**
1. Schema validation tests (8 test cases)
2. Type inference tests (2 test cases)
3. Integration/export tests (3 test cases)
4. Component import tests (3 test cases)

**Total:** ~16 test cases, ~150 LOC

**Feasibility:** ✅ Comprehensive
- Simple schema is easy to test exhaustively
- Type tests ensure no breaking changes
- Integration tests verify exports work
- Component tests verify imports updated correctly

#### Manual Verification

**Checklist:**
1. TypeScript compilation passes
2. All tests pass
3. Coverage ≥45%
4. Component tests still pass
5. No duplicate schema exports remain

**Feasibility:** ✅ Straightforward
- Clear pass/fail criteria
- Automated checks (TypeScript, tests, coverage)
- Easy to verify duplicates removed

---

### 7. Risk Assessment

#### Low Risk: Schema is Trivial

**Risk:** Schema change breaks existing behavior
**Likelihood:** Very Low
**Impact:** Medium
**Mitigation:**
- Schema remains identical (valid: boolean, error?: string)
- Comprehensive validation tests
- Type inference tests
- No API changes

**Feasibility:** ✅ Risk well-mitigated

#### Low Risk: Import Changes

**Risk:** Import path updates break component tests
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Re-export from component __types__ for backward compatibility
- TypeScript compilation will catch import errors
- Component tests run before and after
- Easy to rollback if needed

**Feasibility:** ✅ Risk well-mitigated

#### Low Risk: Backend Confusion

**Risk:** Developer tries to use frontend schema in backend
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Clear documentation in validation.ts
- Different package names (@repo/upload vs moc-instructions-core)
- Different schema names in backend
- JSDoc comments explain purpose

**Feasibility:** ✅ Risk well-mitigated

#### Medium Risk: REPA-005 Coordination

**Risk:** REPA-005 is delayed, re-exports remain too long
**Likelihood:** Medium
**Impact:** Low
**Mitigation:**
- Re-exports are backward compatible
- No performance impact
- REPA-005 tracks removal of re-exports
- Clear TODO comments in code

**Feasibility:** ✅ Acceptable risk
- Re-exports are temporary but harmless
- REPA-005 will clean up when ready
- No blocking issue

---

### 8. Effort Estimation

#### Task Breakdown

| Task | Effort | Complexity |
|------|--------|-----------|
| Create validation.ts | 0.25 SP | Trivial |
| Write validation tests | 0.5 SP | Simple |
| Update types/index.ts barrel | 0.1 SP | Trivial |
| Update InstructionsUpload imports | 0.25 SP | Simple |
| Update ThumbnailUpload imports | 0.25 SP | Simple |
| Run tests and verify coverage | 0.25 SP | Simple |
| Manual verification checklist | 0.15 SP | Simple |
| Documentation updates | 0.2 SP | Simple |

**Total:** ~2 story points

**Feasibility:** ✅ Well-scoped
- Clear tasks with defined boundaries
- No unknowns or research needed
- Follows established pattern
- Low coordination overhead

---

### 9. Implementation Plan

#### Phase 1: Create Schema Module

1. Create `packages/core/upload/src/types/validation.ts`
2. Copy frontend FileValidationResultSchema
3. Add JSDoc comments explaining client-side purpose
4. Export schema and type

**Estimated Time:** 15 minutes

#### Phase 2: Write Tests

1. Create `packages/core/upload/src/types/__tests__/validation.test.ts`
2. Copy test structure from session.test.ts
3. Add 8 schema validation tests
4. Add 2 type inference tests
5. Add 3 integration tests
6. Verify coverage ≥45%

**Estimated Time:** 1 hour

#### Phase 3: Update Barrel Export

1. Update `packages/core/upload/src/types/index.ts`
2. Add export for FileValidationResultSchema and FileValidationResult
3. Verify TypeScript compilation

**Estimated Time:** 5 minutes

#### Phase 4: Update Component Imports

1. Update `apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts`
2. Update `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts`
3. Import from @repo/upload/types
4. Re-export for backward compatibility
5. Remove local schema definitions
6. Add TODO comment for REPA-005 cleanup

**Estimated Time:** 30 minutes

#### Phase 5: Verification

1. Run `pnpm build` - verify TypeScript compilation
2. Run `pnpm test` - verify all tests pass
3. Run `pnpm --filter @repo/upload test --coverage` - verify coverage
4. Run component tests - verify no breakage
5. Complete manual verification checklist

**Estimated Time:** 30 minutes

**Total Implementation Time:** ~2.5 hours (fits 2 SP estimate)

---

## Recommendations

### ✅ Proceed with Story

**Rationale:**
1. Simple, well-defined scope
2. Follows proven pattern from REPA-006
3. Low technical risk
4. Clear acceptance criteria
5. Comprehensive test plan
6. Proper coordination with REPA-005

### 📋 Implementation Notes

**Do:**
- Follow REPA-006 pattern exactly
- Add clear JSDoc comments
- Write comprehensive tests
- Maintain re-exports for backward compatibility
- Add TODO comments for REPA-005 cleanup
- Verify component tests still pass

**Don't:**
- Consolidate backend FileValidationResultSchema (different purpose)
- Remove re-exports before REPA-005
- Change schema shape
- Add new functionality
- Skip tests or coverage verification

### 🔄 REPA-005 Coordination

**For REPA-005 Implementation:**
1. Remove re-exports from InstructionsUpload/__types__/index.ts
2. Remove re-exports from ThumbnailUpload/__types__/index.ts
3. Component can import directly: `import { FileValidationResultSchema } from '@repo/upload/types'`
4. Remove TODO comments

---

## Blockers

**None identified.**

- REPA-005 is a dependency for component migration, but not for schema consolidation
- Schema can be consolidated independently
- Re-exports provide backward compatibility until REPA-005 completes

---

## Conclusion

**Verdict:** ✅ **FEASIBLE - Ready for Implementation**

This story is straightforward, well-scoped, and follows an established pattern. Technical risk is low, and coordination with REPA-005 is clean. Estimated at 2 story points with ~2.5 hours implementation time.

**Ready to Start:** Yes
**Confidence Level:** High
**Recommended Priority:** Can proceed immediately

---

**Dev Feasibility Status:** COMPLETE
**Blockers:** None
**Ready for Synthesis:** Yes
