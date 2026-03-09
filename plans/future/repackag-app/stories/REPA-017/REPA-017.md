---
id: REPA-017
title: "Consolidate Component-Level Schemas"
status: ready-to-work
priority: P2
story_type: tech_debt
epic: repackag-app
feature: upload-consolidation
story_points: 2
experiment_variant: control
created_at: "2026-02-11"
elaborated_at: "2026-02-11"
elaboration_verdict: PASS
depends_on: []
blocks: []
tags:
  - consolidation
  - schemas
  - zod
  - deduplication
surfaces:
  backend: false
  frontend: true
  database: false
  infra: false
---

# REPA-017: Consolidate Component-Level Schemas

## Context

The monorepo currently contains duplicate `FileValidationResultSchema` definitions in component-level `__types__` directories within app-instructions-gallery. These schemas are identical in shape and purpose, violating the DRY principle and creating maintenance overhead.

### Current State

**Duplicate Schemas Found:**

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

Both schemas are identical: simple client-side validation results with a `valid` boolean and optional `error` string.

**Backend Schema (Different Purpose - NOT Consolidated):**

A third `FileValidationResultSchema` exists in `packages/backend/moc-instructions-core/src/__types__/index.ts` with a much richer structure (fileId, filename, success, errors[], warnings[], pieceCount). This backend schema serves a different purpose (server-side validation with detailed error reporting) and should **NOT** be consolidated with the frontend schemas.

### Problem Statement

1. **Duplication:** Two identical schemas in different component directories
2. **Maintenance Overhead:** Changes require updating multiple locations
3. **Inconsistency Risk:** Schemas could diverge over time
4. **Violates DRY:** Single-source-of-truth principle not followed
5. **Component Coupling:** Each component maintains its own validation types

### Context from Dependencies

**REPA-006 (Completed):**
- Established `@repo/upload/src/types/` structure
- Migrated session, upload, slug, edit schemas
- Provides pattern for adding validation.ts module
- Barrel export at `types/index.ts`

**REPA-005 (Pending):**
- Will migrate ThumbnailUpload and InstructionsUpload components to `@repo/upload/components`
- Currently blocked on REPA-003 (hooks) and REPA-004 (image processing)
- Components remain in app-instructions-gallery until REPA-005 completes

**This Story's Role:**
- Consolidate schema **before** component migration (REPA-005)
- Components will import from `@repo/upload/types` while staying in app-instructions-gallery
- REPA-005 will later migrate components and remove re-exports

---

## Goal

Consolidate duplicate `FileValidationResultSchema` into a single source of truth at `@repo/upload/src/types/validation.ts`, eliminating duplicate component-level schemas and establishing consistent validation types for upload components.

**Success Criteria:**
- Single FileValidationResultSchema in @repo/upload/types
- No duplicate schema definitions in component __types__ directories
- Components import from consolidated location
- All tests pass with ≥45% coverage

---

## Non-Goals

**Explicitly Out of Scope:**

1. **Backend Schema Consolidation:** The backend `FileValidationResultSchema` in moc-instructions-core is intentionally different (serves server-side validation with richer error details) and should NOT be consolidated
2. **Component Migration:** Components (ThumbnailUpload, InstructionsUpload) remain in app-instructions-gallery - that's handled by REPA-005
3. **Schema Shape Changes:** Maintain exact schema structure (valid: boolean, error?: string optional)
4. **Adding New Validation Types:** This is pure consolidation, no new functionality
5. **Component Refactoring:** No changes to component logic or behavior
6. **Removing Re-exports Before REPA-005:** Components will re-export from __types__ for backward compatibility until REPA-005 migrates them

**Protected Features:**
- Existing schema shape must remain identical (no breaking changes)
- Component tests must continue to pass
- TypeScript compilation must succeed
- Test coverage must maintain ≥45% minimum
- Backend validation schema remains independent

---

## Scope

### Packages Modified

**@repo/upload** (target package):
- Create `src/types/validation.ts` (~15 LOC with JSDoc comments)
- Create `src/types/__tests__/validation.test.ts` (~150 LOC with 16 test cases)
- Update `src/types/index.ts` barrel export (add FileValidationResultSchema export)

### Apps Modified

**apps/web/app-instructions-gallery:**
- Update `src/components/InstructionsUpload/__types__/index.ts`:
  - Import FileValidationResultSchema from @repo/upload/types
  - Re-export for backward compatibility (remove in REPA-005)
  - Delete local schema definition
- Update `src/components/ThumbnailUpload/__types__/index.ts`:
  - Import FileValidationResultSchema from @repo/upload/types
  - Re-export for backward compatibility (remove in REPA-005)
  - Delete local schema definition

### Total Change Surface

- **Files created:** 2 (validation.ts, validation.test.ts)
- **Files modified:** 3 (types/index.ts, InstructionsUpload/__types__, ThumbnailUpload/__types__)
- **Lines of code:** ~165 total (15 schema + 150 tests)
- **Duplicate schemas removed:** 2

---

## Acceptance Criteria

### Schema Consolidation (3 ACs)

- [ ] **AC-1:** Create `packages/core/upload/src/types/validation.ts` with FileValidationResultSchema
  - Schema definition: `z.object({ valid: z.boolean(), error: z.string().optional() })`
  - Includes JSDoc comments explaining client-side validation purpose
  - Exports both schema and inferred type

- [ ] **AC-2:** Update `packages/core/upload/src/types/index.ts` barrel export
  - Add: `export { FileValidationResultSchema, type FileValidationResult } from './validation'`
  - Verify TypeScript compilation passes

- [ ] **AC-3:** Schema accessible from package root via `@repo/upload/types`
  - Import test: `import { FileValidationResultSchema } from '@repo/upload/types'` works
  - Type import test: `import type { FileValidationResult } from '@repo/upload/types'` works

### Component Import Updates (2 ACs)

- [ ] **AC-4:** Update InstructionsUpload component imports
  - Import from `@repo/upload/types` at top of `__types__/index.ts`
  - Re-export schema: `export { FileValidationResultSchema, type FileValidationResult }`
  - Remove local schema definition
  - Add TODO comment: `// TODO(REPA-005): Remove re-export when component migrates to @repo/upload`

- [ ] **AC-5:** Update ThumbnailUpload component imports
  - Import from `@repo/upload/types` at top of `__types__/index.ts`
  - Re-export schema: `export { FileValidationResultSchema, type FileValidationResult }`
  - Remove local schema definition
  - Add TODO comment: `// TODO(REPA-005): Remove re-export when component migrates to @repo/upload`

### Testing (2 ACs)

- [ ] **AC-6:** Create comprehensive validation tests at `packages/core/upload/src/types/__tests__/validation.test.ts`
  - Schema validation tests (8 test cases): valid/invalid results, error handling, type rejection
  - Type inference tests (2 test cases): z.infer correctness
  - Integration tests (3 test cases): barrel export, package export, type export
  - Component import tests (3 test cases): import verification, duplicate removal
  - Minimum 16 test cases total

- [ ] **AC-7:** All tests pass with ≥45% coverage
  - Run: `pnpm --filter @repo/upload test`
  - Run: `pnpm --filter @repo/upload test --coverage`
  - Verify: validation.ts has 100% coverage
  - Verify: Overall @repo/upload package maintains ≥45% coverage
  - Verify: Component tests in app-instructions-gallery still pass

---

## Reuse Plan

### Pattern Reuse from REPA-006

**REPA-006 established the pattern for @repo/upload/types structure:**

1. **File Organization:**
   ```
   packages/core/upload/src/types/
   ├── {domain}.ts           // Schema definitions (session, upload, slug, edit)
   ├── __tests__/
   │   └── {domain}.test.ts  // Comprehensive tests
   └── index.ts              // Barrel export
   ```

2. **Test Structure:**
   - Schema validation tests (parse success/failure)
   - Type inference tests (z.infer correctness)
   - Integration tests (barrel exports work)
   - Coverage target: ≥45%

3. **Barrel Export Pattern:**
   ```typescript
   export {
     SchemaNameSchema,
     type SchemaNameType,
     utilityFunction,
   } from './{domain}'
   ```

**This Story Applies Same Pattern:**
- Create `validation.ts` following session.ts, upload.ts, slug.ts, edit.ts structure
- Create `__tests__/validation.test.ts` following existing test patterns
- Update `index.ts` barrel export following existing format
- Maintain ≥45% coverage requirement

### Existing Infrastructure

**Package Configuration (already set up by REPA-001/REPA-006):**
- `package.json` exports field includes types subpath
- `tsconfig.json` includes types/ in compilation
- `vitest.config.ts` configured for testing
- Zod 4.1.13 dependency available

**No New Dependencies Required:**
- All tooling already configured
- Test setup in `src/__tests__/setup.ts` reusable
- No new packages to install

### Test Pattern Reuse

**Copy Test Structure from session.test.ts:**
```typescript
import { describe, it, expect } from 'vitest'
import { FileValidationResultSchema } from '../validation'

describe('FileValidationResultSchema', () => {
  describe('valid results', () => {
    it('should accept valid result without error', () => { ... })
    it('should accept valid result with optional error field', () => { ... })
  })

  describe('invalid results', () => {
    it('should accept invalid result with error message', () => { ... })
    it('should reject result without valid field', () => { ... })
  })

  describe('type inference', () => {
    it('should infer correct TypeScript type', () => { ... })
  })
})
```

**Extend package-structure.test.ts** for integration tests

---

## Architecture Notes

### Package Structure

**@repo/upload Types Architecture (Post-REPA-006):**

```
packages/core/upload/src/types/
├── session.ts       (170 LOC) - session management
├── upload.ts        (279 LOC) - upload state and errors
├── slug.ts          (111 LOC) - slug utilities
├── edit.ts          (185 LOC) - MOC edit types
├── validation.ts    (NEW: 15 LOC) - file validation
├── __tests__/
│   ├── session.test.ts   (177 LOC)
│   ├── upload.test.ts    (249 LOC)
│   ├── slug.test.ts      (133 LOC)
│   └── validation.test.ts (NEW: 150 LOC)
└── index.ts         (barrel export)
```

**Design Principles:**
1. **One domain per file:** Each validation concern gets its own module
2. **Barrel export:** All types exported through `types/index.ts`
3. **Co-located tests:** Tests in `__tests__/` subdirectory
4. **JSDoc documentation:** Clear purpose and usage examples
5. **Type safety:** Zod schemas with TypeScript type inference

### Schema Separation: Frontend vs Backend

**Frontend Validation (This Story):**
- **Location:** `@repo/upload/types`
- **Purpose:** Client-side file validation feedback
- **Schema:**
  ```typescript
  FileValidationResultSchema = z.object({
    valid: z.boolean(),
    error: z.string().optional(),
  })
  ```
- **Use Case:** User-facing error messages (e.g., "File too large", "Invalid file type")
- **Consumers:** ThumbnailUpload, InstructionsUpload components

**Backend Validation (Separate - DO NOT CONSOLIDATE):**
- **Location:** `packages/backend/moc-instructions-core/src/__types__/`
- **Purpose:** Server-side file validation with detailed error reporting
- **Schema:**
  ```typescript
  FileValidationResultSchema = z.object({
    fileId: z.string().uuid(),
    filename: z.string(),
    success: z.boolean(),
    errors: z.array(z.object({...})).optional(),
    warnings: z.array(z.object({...})).optional(),
    pieceCount: z.number().optional(),
  })
  ```
- **Use Case:** Per-file validation results with line-level errors for parts lists, magic byte validation, etc.
- **Consumers:** finalize-with-files Lambda function

**Why Separate?**
- Different concerns (client feedback vs server validation)
- Different complexity (simple valid/error vs detailed per-file reporting)
- Different packages (frontend @repo/upload vs backend moc-instructions-core)
- No shared use cases (no component needs both)

### Component Import Strategy

**Current State (Pre-REPA-017):**
```typescript
// InstructionsUpload/__types__/index.ts
export const FileValidationResultSchema = z.object({ ... })  // LOCAL DEFINITION
export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
```

**After REPA-017 (Temporary - Components Stay in Place):**
```typescript
// InstructionsUpload/__types__/index.ts
import { FileValidationResultSchema, type FileValidationResult } from '@repo/upload/types'

// TODO(REPA-005): Remove re-export when component migrates to @repo/upload
export { FileValidationResultSchema, type FileValidationResult }
```

**After REPA-005 (Component Migration - Final State):**
```typescript
// @repo/upload/components/InstructionsUpload/__types__/index.ts
// No re-export needed - component imports directly from @repo/upload/types
import { FileValidationResultSchema } from '@repo/upload/types'
```

**Why This Approach?**
1. **REPA-017:** Schema consolidation first (no breaking changes to components)
2. **REPA-005:** Component migration second (components already using consolidated schema)
3. **Clean Separation:** Each story has clear, independent scope
4. **Backward Compatibility:** Re-exports maintain compatibility during transition

---

## Infrastructure Notes

### Build and Test Configuration

**No infrastructure changes required.** All configuration already in place from REPA-001/REPA-006:

**package.json exports:**
```json
{
  "exports": {
    "./types": "./src/types/index.ts",
    "./client": "./src/client/index.ts",
    "./image": "./src/image/index.ts"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"]
}
```

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/__tests__/**', '**/node_modules/**']
    }
  }
})
```

### TypeScript Compilation

**Import Path Resolution:**
- `@repo/upload/types` → `packages/core/upload/src/types/index.ts`
- Handled by Turborepo + TypeScript workspace resolution
- No tsconfig.json changes needed

**Type Checking:**
```bash
pnpm check-types           # Check changed files
pnpm check-types:all       # Check all files
```

### Test Execution

**Commands:**
```bash
# Run all upload package tests
pnpm --filter @repo/upload test

# Run validation tests only
pnpm --filter @repo/upload test validation

# Run with coverage
pnpm --filter @repo/upload test --coverage

# Run component tests (verify no breakage)
pnpm --filter app-instructions-gallery test
```

**Coverage Reporting:**
- Terminal output: text format
- HTML report: `packages/core/upload/coverage/index.html`
- JSON report: `packages/core/upload/coverage/coverage-final.json`

---

## HTTP Contract Plan

Not applicable - no API changes.

---

## Seed Requirements

Not applicable - no seed data needed.

---

## Test Plan

**Full test plan available at:** `_pm/TEST-PLAN.md`

### Test Strategy Summary

**Scope:** Schema consolidation with 16 comprehensive test cases

**Test Types:**
1. **Unit Tests (Primary):** Schema validation behavior (8 cases)
2. **Type Tests:** TypeScript inference and type safety (2 cases)
3. **Integration Tests:** Package exports work correctly (3 cases)
4. **Component Tests:** Import verification (3 cases)

### Key Test Cases

**Schema Validation (8 TCs):**
- Valid result without error
- Invalid result with error message
- Invalid result without error (optional field)
- Reject missing valid field
- Reject invalid valid field type
- Reject invalid error field type
- Accept empty string error
- Inferred type matches expected shape

**Integration Tests (3 TCs):**
- FileValidationResultSchema exported from types barrel
- FileValidationResult type exported from types barrel
- Schema exported from package root (@repo/upload/types)

**Type Tests (2 TCs):**
- z.infer produces correct type
- TypeScript type inference works end-to-end

**Component Tests (3 TCs):**
- InstructionsUpload imports from @repo/upload/types
- ThumbnailUpload imports from @repo/upload/types
- Components no longer export duplicate schemas

### Coverage Requirements

**Minimum:** 45% overall package coverage
**Target:** 100% for validation.ts (simple schema, fully testable)

**Verification:**
```bash
pnpm --filter @repo/upload test --coverage
```

Expected output:
```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
types/validation.ts |   100   |   100    |   100   |   100
types/index.ts      |   100   |   100    |   100   |   100
```

### Manual Verification Checklist

- [ ] Schema file created at `packages/core/upload/src/types/validation.ts`
- [ ] Test file created at `packages/core/upload/src/types/__tests__/validation.test.ts`
- [ ] Barrel export updated in `packages/core/upload/src/types/index.ts`
- [ ] InstructionsUpload imports updated, local schema removed
- [ ] ThumbnailUpload imports updated, local schema removed
- [ ] TypeScript compilation passes (`pnpm check-types`)
- [ ] All tests pass (`pnpm test`)
- [ ] Coverage ≥45% (`pnpm --filter @repo/upload test --coverage`)
- [ ] Component tests still pass (`pnpm --filter app-instructions-gallery test`)
- [ ] No duplicate FileValidationResultSchema exports remain (grep verification)

---

## UI/UX Notes

Not applicable - no UI surfaces touched. This is a pure schema consolidation story with no user-facing changes.

---

## Reality Baseline

### Current Codebase State

**Duplicate Schemas:**
1. `apps/web/app-instructions-gallery/src/components/InstructionsUpload/__types__/index.ts:36-39`
   - FileValidationResultSchema definition (4 LOC)
   - FileValidationResult type export
   - Story INST-1104: Upload Instructions (Direct ≤10MB)

2. `apps/web/app-instructions-gallery/src/components/ThumbnailUpload/__types__/index.ts:24-27`
   - FileValidationResultSchema definition (4 LOC)
   - FileValidationResult type export
   - Story INST-1103: Upload Thumbnail

**Both schemas are byte-for-byte identical:**
```typescript
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})
export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
```

**Backend Schema (Separate):**
- Location: `packages/backend/moc-instructions-core/src/__types__/index.ts:329-356`
- Different shape: includes fileId, filename, success, errors[], warnings[], pieceCount
- Different purpose: server-side validation with detailed error reporting
- Used by: finalize-with-files Lambda function
- **Action:** Do NOT consolidate (intentionally separate)

**Target Package State:**
- `@repo/upload` package structure exists (created by REPA-001)
- `@repo/upload/src/types/` directory populated by REPA-006 with:
  - session.ts (170 LOC)
  - upload.ts (279 LOC)
  - slug.ts (111 LOC)
  - edit.ts (185 LOC)
  - index.ts (barrel export)
- Pattern established for adding new type modules
- No validation.ts module exists yet

**Dependency Status:**
- REPA-006 (Migrate Upload Types): ✅ Completed
  - @repo/upload/types structure ready
  - Barrel export pattern established
  - Test infrastructure in place
- REPA-005 (Migrate Upload Components): 🔄 Pending
  - Blocked on REPA-003 (hooks), REPA-004 (image processing)
  - Components remain in app-instructions-gallery
  - Will migrate ThumbnailUpload, InstructionsUpload to @repo/upload/components

**Related Files:**
- `packages/core/upload/package.json` - exports configuration ready
- `packages/core/upload/tsconfig.json` - types/ included in compilation
- `packages/core/upload/vitest.config.ts` - test configuration ready
- `packages/core/upload/src/__tests__/setup.ts` - test setup reusable

### Verification Commands

**Find all FileValidationResultSchema instances:**
```bash
grep -r "FileValidationResultSchema" --include="*.ts" --include="*.tsx"
```

**Verify duplicates (should find 2 frontend instances):**
```bash
grep -r "export const FileValidationResultSchema" apps/web/app-instructions-gallery/
```

**Verify @repo/upload structure:**
```bash
ls -la packages/core/upload/src/types/
```

**Verify backend schema is different:**
```bash
grep -A 20 "FileValidationResultSchema" packages/backend/moc-instructions-core/src/__types__/index.ts
```

---

## Risk Predictions

**Full predictions available at:** `_pm/RISK-PREDICTIONS.yaml`

### Summary

**Split Risk:** Very Low (5%)
- Story scope is minimal: 1 schema (3 LOC) from 2 locations
- Clear ACs (7 total)
- Follows REPA-006 pattern
- No complex logic or unknowns

**Review Cycles:** 1 (predicted)
- Simple schema consolidation
- Comprehensive test plan (16 test cases)
- Clear verification criteria
- Expected verdict: PASS on first QA gate review

**Token Cost:** ~152,000 tokens (estimated)
- Story generation: 47K
- Implementation: 65K
- QA gate: 40K
- Budget recommendation: 180K (includes 20% buffer)

**Implementation Time:** 3-4 hours
- Create validation.ts: 15 min
- Write tests: 1 hour
- Update imports: 30 min
- Verification: 30 min
- Documentation: 30 min

**Quality Gate Pass Probability:** 90%
- Clear testable ACs
- Comprehensive test plan
- Proven pattern (REPA-006)
- No breaking changes

**Sizing Validation:** ✅ 2 SP is appropriate
- AC count: 7 (fits 2 SP: 4-8 ACs)
- LOC: 165 (fits 2 SP: 100-300 LOC)
- Files: 5 (fits 2 SP: 3-8 files)
- Complexity: Simple (fits 2 SP)

---

## Related Stories

**Completed:**
- REPA-001: Create @repo/upload Package Structure
- REPA-002: Migrate Upload Client Functions
- REPA-006: Migrate Upload Types (provides pattern)

**In Progress:**
- REPA-003: Migrate Upload Hooks (pending, blocks REPA-005)
- REPA-004: Migrate Image Processing (completed)

**Pending:**
- REPA-005: Migrate Upload Components (depends on this story)
  - Will move ThumbnailUpload, InstructionsUpload to @repo/upload/components
  - Will remove re-exports from component __types__ directories
  - Components will import directly from @repo/upload/types

**Related:**
- REPA-015: Extract Generic A11y Utilities (similar pattern: consolidate duplicates)
- REPA-016: Consolidate MOC Schemas (similar pattern: move to shared package)

---

## Implementation Notes

### Step-by-Step Implementation

**Phase 1: Create Schema Module**
1. Create `packages/core/upload/src/types/validation.ts`
2. Add FileValidationResultSchema definition
3. Add JSDoc comments explaining client-side purpose
4. Export schema and type

**Phase 2: Write Tests**
1. Create `packages/core/upload/src/types/__tests__/validation.test.ts`
2. Copy test structure from session.test.ts
3. Add 8 schema validation tests
4. Add 2 type inference tests
5. Add 3 integration tests
6. Verify coverage ≥45%

**Phase 3: Update Barrel Export**
1. Update `packages/core/upload/src/types/index.ts`
2. Add export for FileValidationResultSchema and FileValidationResult
3. Verify TypeScript compilation

**Phase 4: Update Component Imports**
1. Update InstructionsUpload/__types__/index.ts
   - Import from @repo/upload/types
   - Re-export for backward compatibility
   - Remove local schema definition
   - Add TODO comment for REPA-005
2. Update ThumbnailUpload/__types__/index.ts
   - Import from @repo/upload/types
   - Re-export for backward compatibility
   - Remove local schema definition
   - Add TODO comment for REPA-005

**Phase 5: Verification**
1. Run `pnpm build` - verify TypeScript compilation
2. Run `pnpm test` - verify all tests pass
3. Run `pnpm --filter @repo/upload test --coverage` - verify coverage ≥45%
4. Run `pnpm --filter app-instructions-gallery test` - verify component tests pass
5. Complete manual verification checklist

### Coordination with REPA-005

**REPA-017 (This Story) Responsibilities:**
- ✅ Create validation.ts in @repo/upload/types
- ✅ Update component imports to use @repo/upload/types
- ✅ Re-export from component __types__ for backward compatibility
- ✅ Add TODO comments for REPA-005 cleanup

**REPA-005 Responsibilities:**
- ⏳ Migrate components to @repo/upload/components
- ⏳ Remove re-exports from component __types__ directories
- ⏳ Components import directly from @repo/upload/types
- ⏳ Delete TODO comments

**Clean Handoff:**
- REPA-017 leaves components in place with working imports
- REPA-005 can migrate components without worrying about schema consolidation
- No blocking dependencies or coordination issues

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Frontmatter `depends_on: [REPA-005]` contradicts story text which says "consolidate before REPA-005" | Fixed: removed REPA-005 dependency. Story is independent — schemas consolidated first, re-exports maintain backward compatibility. | No new AC (frontmatter fix) |

### Non-Blocking Issues (Resolved)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | Test plan TC-16 contradicts AC-4/AC-5 | test-plan-clarity | TC-16 expects "should NOT export" but AC-4/AC-5 use re-exports for backward compatibility. TC-16 should be updated during implementation to test re-exports work correctly instead. |

### Summary

- **MVP-critical gaps found**: 0
- **Frontmatter fixes**: 1 (dependency correction)
- **Non-blocking issues**: 1 (test plan TC-16 contradiction, implementation will handle)
- **ACs added**: 0
- **ACs modified**: 0
- **Mode**: Autonomous
- **Verdict**: PASS

---

**Story Status:** Ready for Implementation
**Blockers:** None
**Estimated Effort:** 2 story points (~3-4 hours)
**Confidence:** High
