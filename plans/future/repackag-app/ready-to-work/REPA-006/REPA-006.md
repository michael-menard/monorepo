---
id: REPA-006
title: "Migrate Upload Types to @repo/upload/types"
status: ready-to-work
priority: P2
story_type: tech_debt
epic: repackag-app
feature: upload-consolidation
story_points: 3
experiment_variant: control
created_at: "2026-02-10"
elaborated_at: "2026-02-10"
elaboration_verdict: CONDITIONAL PASS
depends_on: []
blocks: []
tags:
  - migration
  - consolidation
  - types
  - zod
  - deprecation
surfaces:
  backend: false
  frontend: true
  database: false
  infra: false
---

# REPA-006: Migrate Upload Types to @repo/upload/types

## Context

The monorepo currently maintains upload type definitions in a standalone `@repo/upload-types` package (817 lines of code, 559 lines of tests) separate from the new consolidated `@repo/upload` package. This separation creates confusion and violates the single-source-of-truth principle for upload-related code.

The `@repo/upload` package was created in REPA-001 with a prepared `types/` directory containing only a placeholder file. Meanwhile, 17 files across 2 apps (main-app and app-instructions-gallery) continue importing from `@repo/upload-types`, and 2 deprecated wrapper files in main-app re-export these types with deprecation warnings.

### Problem Statement

1. Upload types are maintained separately from other upload functionality (client, hooks, image processing, components)
2. Consumers must import from `@repo/upload-types` instead of the unified `@repo/upload` package
3. Deprecated wrapper files exist in apps but still point to the old package location
4. New code may incorrectly import from the deprecated package instead of the new consolidated location
5. Package fragmentation makes it harder to understand and maintain upload-related code

### Current State (Reality Baseline)

**Existing Packages:**
- `@repo/upload-types` (packages/core/upload-types/): 817 LOC across 5 modules (session.ts, upload.ts, slug.ts, edit.ts, index.ts) + 559 LOC tests (3 test files)
- `@repo/upload` (packages/core/upload/): Created by REPA-001, contains placeholder types/index.ts awaiting migration

**Consumers:**
- 17 files across 2 apps import from @repo/upload-types:
  - main-app: 8 files (hooks, components, pages)
  - app-instructions-gallery: 9 files (hooks, components, pages)

**Deprecated Wrappers:**
- apps/web/main-app/src/types/uploader-upload.ts (28 LOC wrapper)
- apps/web/main-app/src/types/uploader-session.ts (25 LOC wrapper)
- Both marked @deprecated with migration instructions pointing to @repo/upload-types

**In-Progress Coordination:**
- REPA-002 (Upload Client Functions) - in Ready for QA, may import from @repo/upload-types
- REPA-004 (Image Processing) - in progress, may import from @repo/upload-types

**Technical Constraints:**
- Old package uses zod ^3.23.8, new package uses zod 4.1.13 (compatibility verification required)
- TypeScript strict mode enabled in both packages
- Minimum 45% test coverage required
- Monorepo uses workspace:* dependency pattern

---

## Goal

Create a single source of truth for all upload type definitions by migrating schemas from `@repo/upload-types` to `@repo/upload/types`, updating all consumers, and deprecating the old package with a grace period. This completes the type consolidation for the upload domain and enables future stories (REPA-003, REPA-005) to work with a fully consolidated package.

---

## Non-Goals

**Explicitly Out of Scope:**

1. **Immediate deletion of @repo/upload-types**: Package should be deprecated but remain functional for 1-2 sprint cycles to allow gradual migration
2. **Restructuring type schemas**: Maintain current file structure (session.ts, upload.ts, slug.ts, edit.ts) - don't split into subdirectories like form/api/utils (that could be a future refactor)
3. **Adding new types or utilities**: This is a pure migration story, no new functionality
4. **Migrating upload client code**: That's handled by REPA-002 (in Ready for QA)
5. **Migrating upload hooks**: That's handled by REPA-003 (blocked on REPA-002)
6. **Migrating upload components**: That's handled by REPA-005 (blocked on REPA-003)
7. **Backend API changes**: Upload types are shared by frontend and backend but no API contract changes

**Protected Features:**
- Existing Zod schemas must remain functionally identical (no breaking changes)
- Test coverage must not decrease (maintain or exceed current 559 LOC)
- @repo/upload-types must remain functional during deprecation period

---

## Scope

### Packages Modified

**@repo/upload (destination):**
- Add 4 type files: session.ts (170 LOC), upload.ts (279 LOC), slug.ts (111 LOC), edit.ts (185 LOC)
- Add 3 test files: session.test.ts (177 LOC), upload.test.ts (249 LOC), slug.test.ts (133 LOC)
- Replace placeholder types/index.ts with barrel export
- Verify package.json exports field includes types subpath
- Verify tsconfig.json includes types/ in compilation

**@repo/upload-types (source, to deprecate):**
- Add deprecated field to package.json
- Update README.md with migration guide
- Add console.warn() deprecation message to src/index.ts

### Apps Modified

**apps/web/main-app:**
- Update 8 files with import path changes (`@repo/upload-types` → `@repo/upload/types`)
- Delete 2 deprecated wrapper files (uploader-upload.ts, uploader-session.ts)
- Delete 1 wrapper test file

**apps/web/app-instructions-gallery:**
- Update 9 files with import path changes

### Total Change Surface
- **Files created**: 8 (4 types + 3 tests + 1 barrel export)
- **Files modified**: ~20 (17 import updates + package.json + README + index.ts)
- **Files deleted**: 3 immediately (2 wrappers + 1 test), 7 after grace period (source files in old package)

---

## Acceptance Criteria

### Migration (5 ACs)

- [ ] **AC-1**: Move session.ts (170 LOC) from @repo/upload-types to @repo/upload/src/types/session.ts
- [ ] **AC-2**: Move upload.ts (279 LOC) from @repo/upload-types to @repo/upload/src/types/upload.ts
- [ ] **AC-3**: Move slug.ts (111 LOC) from @repo/upload-types to @repo/upload/src/types/slug.ts
- [ ] **AC-4**: Move edit.ts (185 LOC) from @repo/upload-types to @repo/upload/src/types/edit.ts
- [ ] **AC-5**: Create barrel export at @repo/upload/src/types/index.ts re-exporting all types from subdirectories

### Test Migration (5 ACs)

- [ ] **AC-6**: Move session.test.ts (177 LOC) to @repo/upload/src/types/__tests__/session.test.ts
- [ ] **AC-7**: Move upload.test.ts (249 LOC) to @repo/upload/src/types/__tests__/upload.test.ts
- [ ] **AC-8**: Move slug.test.ts (133 LOC) to @repo/upload/src/types/__tests__/slug.test.ts
- [ ] **AC-9**: All migrated tests pass with `pnpm --filter @repo/upload test`
- [ ] **AC-10**: Test coverage for @repo/upload/types meets or exceeds 45% minimum

### Import Updates (5 ACs)

- [ ] **AC-11**: Update 8 files in apps/web/main-app to import from @repo/upload/types (hooks: useUploadManager.ts, useUploaderSession.ts; components: Uploader/UploaderFileItem, Uploader/UploaderList, MocEdit/EditForm, MocEdit/SlugField; pages: InstructionsNewPage.tsx; plus 1 additional file from scan)
- [ ] **AC-12**: Update 9 files in apps/web/app-instructions-gallery to import from @repo/upload/types (hooks, components, pages - similar to main-app)
- [ ] **AC-13**: Delete apps/web/main-app/src/types/uploader-upload.ts (28 LOC deprecated wrapper)
- [ ] **AC-14**: Delete apps/web/main-app/src/types/uploader-session.ts (25 LOC deprecated wrapper)
- [ ] **AC-15**: Delete apps/web/main-app/src/types/__tests__/uploader-upload.test.ts (wrapper test)

### Package Configuration (3 ACs)

- [ ] **AC-16**: Update @repo/upload package.json to include types export with proper entry point (`./types`: `./src/types/index.ts`)
- [ ] **AC-17**: Update @repo/upload tsconfig.json if needed for types/ subdirectory (verify types/ is included in compilation)
- [ ] **AC-18**: Verify @repo/upload builds successfully with `pnpm --filter @repo/upload build`

### Deprecation (4 ACs)

- [ ] **AC-19**: Add deprecation notice to @repo/upload-types package.json (`"deprecated": "Moved to @repo/upload/types. See README for migration guide."`)
- [ ] **AC-20**: Update @repo/upload-types README.md with migration instructions pointing to @repo/upload/types
- [ ] **AC-21**: Add console.warn() deprecation message to @repo/upload-types/src/index.ts (warns on every import)
- [ ] **AC-22**: Document deprecation timeline in README (suggest 2 sprint cycles before removal, ~4 weeks)

### Verification (5 ACs)

- [ ] **AC-23**: All apps build successfully with `pnpm build` (no import errors)
- [ ] **AC-24**: All apps pass type checking with `pnpm check-types:all`
- [ ] **AC-25**: All apps pass linting with `pnpm lint:all`
- [ ] **AC-26**: All tests pass with `pnpm test:all`
- [ ] **AC-27**: No remaining references to @repo/upload-types in app source code (verify with `grep -r "@repo/upload-types" apps/web/main-app/src/ && grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/` both return zero results; only deprecated package references itself)

**Total ACs: 27**

---

## Reuse Plan

### Components to Reuse

**From REPA-001 (Create @repo/upload Package Structure):**
- @repo/upload package with prepared types/ directory structure
- Package.json with exports field likely pre-configured for types subpath
- Vitest configuration already in place
- TypeScript configuration already set up

**From REPA-016 (Consolidate MOC Schemas):**
- Deprecation pattern: package.json deprecated field + README migration guide + console.warn()
- Grace period approach: Keep old package functional during migration window
- Systematic import update pattern: grep → update → verify

**From REPA-014 (Create @repo/hooks Package):**
- Test migration pattern: Move __tests__ directory alongside source files
- Coverage verification in new location
- Barrel export pattern for clean imports

### Patterns to Follow

1. **Zod-first types (CLAUDE.md)**: All types defined via Zod schemas with z.infer<> inference
2. **Workspace dependencies**: Use workspace:* for internal dependencies
3. **Barrel exports**: Re-export all types through types/index.ts for clean consumer imports
4. **Package exports field**: Configure exports field with types subpath for proper resolution
5. **Test co-location**: Tests in __tests__ directory alongside source files

### Packages to Reuse

- **zod**: Already a dependency of both @repo/upload-types (^3.23.8) and @repo/upload (4.1.13)
- **vitest**: Already configured in @repo/upload via REPA-001
- **@repo/logger**: If needed for deprecation warnings (already dependency of @repo/upload)

---

## Architecture Notes

### Package Structure (Final State)

```
packages/core/upload/src/types/
  session.ts          # 170 LOC - Zod schemas for upload sessions
  upload.ts           # 279 LOC - Zod schemas for upload file items and batch state
  slug.ts             # 111 LOC - Zod schemas and utilities for slug generation
  edit.ts             # 185 LOC - Zod schemas for MOC edit form types
  index.ts            # ~10 LOC - Barrel exports (export * from './session', etc.)
  __tests__/
    session.test.ts   # 177 LOC - Unit tests for session schemas
    upload.test.ts    # 249 LOC - Unit tests for upload schemas
    slug.test.ts      # 133 LOC - Unit tests for slug utilities
```

### Dependency Chain

**No circular dependencies:**
- @repo/upload depends on: zod, @repo/logger (already configured)
- Apps depend on: @repo/upload/types (new), @repo/upload-types (old, deprecated)
- @repo/upload-types has no internal consumers after migration (safe to deprecate)

### Import Resolution

**Before migration:**
```typescript
import { UploaderSessionSchema } from '@repo/upload-types'
```

**After migration:**
```typescript
import { UploaderSessionSchema } from '@repo/upload/types'
```

**Export configuration (@repo/upload/package.json):**
```json
{
  "exports": {
    "./types": "./src/types/index.ts",
    "./client": "./src/client/index.ts",
    "./hooks": "./src/hooks/index.ts",
    ...
  }
}
```

### Zod Version Strategy

**Decision**: Use Zod 4.1.13 in @repo/upload (already configured).

**Rationale:**
- Aligns with monorepo modernization goals
- Zod 3→4 is generally backward compatible
- Comprehensive test suite (559 LOC) will catch incompatibilities
- Downgrade to Zod 3 only if critical incompatibilities found (unlikely)

**Risk Mitigation:**
- Run full test suite immediately after migration
- Fix any schema syntax incompatibilities (e.g., .refine() → .superRefine() if needed)
- Validate all 3 test files pass before proceeding to import updates

---

## Infrastructure Notes

Not applicable - this is a types-only migration with no infrastructure changes.

---

## Test Plan

### Scope Summary
- **Endpoints touched**: None (types migration only, no API changes)
- **UI touched**: No
- **Data/storage touched**: No
- **Packages modified**: @repo/upload, @repo/upload-types (deprecated)
- **Apps modified**: main-app (8 files), app-instructions-gallery (9 files)

### Happy Path Tests

**Test 1: Migrate Type Definitions**
- Move all 4 type files from @repo/upload-types to @repo/upload/src/types/
- Create barrel export at types/index.ts
- Verify no TypeScript compilation errors
- Evidence: `pnpm --filter @repo/upload build` succeeds

**Test 2: Migrate Test Files**
- Move all 3 test files to @repo/upload/src/types/__tests__/
- Update test imports to use @repo/upload/types
- Evidence: `pnpm --filter @repo/upload test` passes, coverage >= 45%

**Test 3: Update Consumer Imports in main-app**
- Update 8 files to import from @repo/upload/types
- Evidence: `pnpm --filter main-app check-types && pnpm --filter main-app build` succeeds

**Test 4: Update Consumer Imports in app-instructions-gallery**
- Update 9 files to import from @repo/upload/types
- Evidence: `pnpm --filter app-instructions-gallery check-types && pnpm --filter app-instructions-gallery build` succeeds

**Test 5: Delete Deprecated Wrapper Files**
- Remove 2 wrapper files + 1 test file
- Evidence: Files deleted, main-app still builds

**Test 6: Configure Package Exports**
- Verify types export path in @repo/upload/package.json
- Evidence: `node -e "console.log(require.resolve('@repo/upload/types'))"` resolves correctly

**Test 7: Deprecate Old Package**
- Add deprecated field, update README, add console.warn()
- Evidence: Import from old package shows warning, README has migration guide

### Error Cases

**Error Case 1: Zod Version Mismatch**
- Run tests with Zod 4.1.13, watch for incompatibilities
- Mitigation: Update schema syntax to Zod 4 conventions if needed

**Error Case 2: Missing Import Updates**
- Run `grep -r "@repo/upload-types" apps/web/*/src/` to find missed imports
- Mitigation: Update any remaining imports

**Error Case 3: Build Failures After Migration**
- Run `pnpm build`, capture errors
- Mitigation: Fix missing barrel exports, verify package.json exports field

### Edge Cases

**Edge Case 1: Concurrent Work in REPA-002/REPA-004**
- Coordinate import path updates if those stories complete during REPA-006
- Strategy: Deprecated package remains functional, update imports before merge

**Edge Case 2: Test Coverage Below 45%**
- Verify all 3 test files migrated correctly
- Check test imports resolve properly

**Edge Case 3: Deprecation Period Confusion**
- Verify console warning visible, README states timeline (2 sprint cycles ≈ 4 weeks)

### Required Tooling Evidence

**Build Evidence:**
```bash
pnpm build                  # All apps build
pnpm check-types:all        # All type checking passes
pnpm lint:all               # All linting passes
pnpm test:all               # All tests pass
```

**Migration Evidence:**
```bash
ls -l packages/core/upload/src/types/*.ts        # Verify 4 type files + index
ls -l packages/core/upload/src/types/__tests__/  # Verify 3 test files
pnpm --filter @repo/upload test:coverage         # Verify >= 45%
```

**Import Verification:**
```bash
grep -r "@repo/upload-types" apps/web/main-app/src/
grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/
# Both should return zero results
```

**Deprecation Evidence:**
```bash
node -e "require('@repo/upload-types')"  # Should show console warning
grep "deprecated" packages/core/upload-types/package.json
```

### Risks

1. **Zod Version Compatibility (Medium)**: Old package uses Zod ^3.23.8, new uses 4.1.13. Mitigation: Run tests immediately, update schemas if incompatibilities found.
2. **Incomplete Import Updates (Medium)**: 17 files need updates. Mitigation: Systematic grep, type checking after each app.
3. **REPA-002/004 Coordination (Low)**: In-progress stories may conflict. Mitigation: Deprecated package remains functional.
4. **Deprecation Timeline Confusion (Low)**: Team may not know when old package removed. Mitigation: Clear README timeline + console warnings.

---

## UI/UX Notes

Not applicable - this is a pure backend/types migration story with no user-facing UI changes.

---

## Dev Feasibility

### Summary
- **Feasible for MVP**: Yes
- **Confidence**: High (95%)
- **Estimated Effort**: 3 SP, 4-6 hours

### Key Success Factors

1. **Package structure already exists** (REPA-001) - just need to populate files
2. **Pattern proven** in REPA-014, REPA-015, REPA-016 - low risk
3. **Comprehensive test suite** (559 LOC) catches regressions
4. **Clear file boundaries** - 4 types, 3 tests, 17 import updates
5. **No API changes** - types only, no runtime behavior changes

### MVP-Critical Risks

**Risk 1: Zod Version Mismatch Breaking Schemas**
- Likelihood: Low (Zod 3→4 generally backward compatible)
- Mitigation: Run full test suite immediately, update schemas if needed
- AC Coverage: AC-9 (tests pass), AC-10 (coverage >= 45%)

**Risk 2: Incomplete Import Updates Breaking Builds**
- Likelihood: Medium (17 files to update manually)
- Mitigation: Systematic grep, type checking after each app
- AC Coverage: AC-11 (main-app), AC-12 (instructions-gallery), AC-24 (type checking)

**Risk 3: Missing Barrel Exports Causing Import Failures**
- Likelihood: Low (straightforward to implement)
- Mitigation: Comprehensive barrel export, verify resolution
- AC Coverage: AC-5 (barrel export), AC-18 (build verification)

### Coordination Requirements

**REPA-002 (Upload Client, Ready for QA):**
- May import from @repo/upload-types
- Resolution: Deprecated package remains functional, update imports before merge to main

**REPA-004 (Image Processing, In Progress):**
- May import from @repo/upload-types
- Resolution: Same as REPA-002

**Strategy**: Proceed with REPA-006 immediately. Deprecated package provides grace period for coordination.

### Estimated Timeline
- 1 hour: Migrate files + create barrel export
- 1-2 hours: Update all consumer imports
- 1 hour: Run tests, fix any Zod compatibility issues
- 1 hour: Deprecation setup + verification
- 1 hour: Final QA (full build, type check, test suite)

**Total: 4-6 hours implementation + QA**

---

## Risk Predictions

```yaml
predictions:
  split_risk: 0.3
  review_cycles: 2
  token_estimate: 120000
  confidence: medium
  similar_stories:
    - story_id: REPA-016
      similarity_score: 0.87
      actual_cycles: 1
      actual_tokens: null
      split_occurred: false
    - story_id: REPA-014
      similarity_score: 0.84
      actual_cycles: 1
      actual_tokens: null
      split_occurred: false
    - story_id: REPA-015
      similarity_score: 0.81
      actual_cycles: 1
      actual_tokens: null
      split_occurred: false
  generated_at: "2026-02-10T22:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
  reasoning:
    split_risk_factors:
      - "AC count: 27 (high, +0.2 base risk)"
      - "Scope: types migration only (no frontend+backend split, +0.0)"
      - "Similar to REPA-016 pattern (proven low-risk, -0.1)"
      - "Import updates: 17 files (mechanical but time-consuming, +0.2)"
      - "Final: 0.3 (low-medium risk)"
    review_cycles_factors:
      - "Base cycles: 1 (straightforward migration)"
      - "Scope keywords: 3 (types, migration, deprecation, +0)"
      - "Estimated files: ~20 modified (+1)"
      - "Zod version compatibility check needed (+0)"
      - "Final: 2 cycles (typical for migration stories)"
    token_estimate_factors:
      - "Similar stories: REPA-014, REPA-015, REPA-016 (all migration patterns)"
      - "REPA-016 most similar (schema consolidation + deprecation)"
      - "No actual token data available for completed stories (null)"
      - "Using heuristic: 27 ACs * 4500 tokens/AC = 121500"
      - "Rounded to 120000"
      - "Confidence: medium (heuristic-based, no similar story actuals)"
```

---

## Reality Baseline

**Seed Generation Date**: 2026-02-10
**Baseline Used**: None (no baseline reality file exists at expected path)
**Context Sources**: Codebase scanning, git status, related stories
**Lessons Loaded**: False (KB not queried)
**ADRs Loaded**: True (ADR-001, ADR-005 reviewed)
**Conflicts Found**: 0 blocking, 2 warnings (REPA-002/004 coordination, deprecation period timing)

**Related Completed Stories:**
- REPA-001: Create @repo/upload Package Structure (completed 2026-02-10) - prepared types/ directory
- REPA-016: Consolidate MOC Schemas (completed 2026-02-11) - deprecation pattern
- REPA-014: Create @repo/hooks Package (completed 2026-02-10) - test migration pattern
- REPA-015: Extract Generic A11y Utilities (completed 2026-02-10) - extraction pattern

**In-Progress Stories:**
- REPA-002: Migrate Upload Client Functions (Ready for QA) - may import from @repo/upload-types
- REPA-004: Migrate Image Processing (In Progress) - may import from @repo/upload-types
- REPA-012: Create @repo/auth-hooks Package (In Progress) - no overlap
- REPA-013: Create @repo/auth-utils Package (In Progress) - no overlap
- REPA-018: Create @repo/auth-services Package (In Progress) - no overlap

**Reuse Candidates:**
- @repo/upload package structure (REPA-001)
- Zod schemas from @repo/upload-types (817 LOC source)
- Test suite from @repo/upload-types (559 LOC tests)
- Deprecation pattern from REPA-016
- Test migration pattern from REPA-014

---

## Implementation Notes

**Critical Execution Order**:
1. Migrate files and run tests FIRST (AC-1 to AC-10) - verify Zod 4.1.13 compatibility immediately before proceeding
2. Update all app imports SECOND (AC-11 to AC-12) - ensure all consumers use new package
3. Delete deprecated wrappers LAST (AC-13 to AC-15) - only after all imports updated

**Zod Version Compatibility**:
- Run full test suite immediately after file migration (AC-9)
- Watch for schema syntax incompatibilities (e.g., .refine() vs .superRefine())
- If critical issues found, downgrade to Zod ^3.23.8 as fallback

**Deprecation Timing**:
- Wrappers (AC-13/14/15) must be deleted AFTER app imports updated (AC-11/12)
- Old package remains functional during 2-sprint grace period
- REPA-002/004 coordination: deprecated package provides buffer

---

## Next Actions

1. **Migrate type files** (AC-1 to AC-5): Move session.ts, upload.ts, slug.ts, edit.ts to @repo/upload/src/types/, create barrel export
2. **Migrate test files** (AC-6 to AC-10): Move 3 test files, update imports, verify coverage **[VERIFY ZOD COMPATIBILITY HERE]**
3. **Update main-app imports** (AC-11, AC-13, AC-14, AC-15): Update 8 files, delete 2 wrappers + 1 test **[DELETE WRAPPERS AFTER IMPORTS UPDATED]**
4. **Update app-instructions-gallery imports** (AC-12): Update 9 files
5. **Configure package** (AC-16 to AC-18): Verify exports field, build successfully
6. **Deprecate old package** (AC-19 to AC-22): Add deprecated field, update README, add console.warn()
7. **Final verification** (AC-23 to AC-27): Full build, type check, lint, test, grep for remaining old imports

---

## Definition of Done

- [ ] All 27 acceptance criteria completed
- [ ] All type files migrated (817 LOC) to @repo/upload/src/types/
- [ ] All test files migrated (559 LOC) with coverage >= 45%
- [ ] All 17 consumer files updated to import from @repo/upload/types
- [ ] Deprecated wrapper files deleted (2 wrappers + 1 test)
- [ ] Old package deprecated with console warning + README migration guide
- [ ] Full monorepo build passes: `pnpm build`
- [ ] All type checking passes: `pnpm check-types:all`
- [ ] All linting passes: `pnpm lint:all`
- [ ] All tests pass: `pnpm test:all`
- [ ] Zero `@repo/upload-types` references in app source code (verified via grep)
- [ ] Story file updated with implementation notes
- [ ] Index updated with status: Created → Ready to Work

---

**Story Generated**: 2026-02-10
**Generated By**: pm-story-generation-leader
**Experiment Variant**: control
**Workers Executed**: pm-draft-test-plan, pm-dev-feasibility-review, pm-story-risk-predictor

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10T22:30:00Z_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps found. Core migration journey complete with 27 ACs covering all critical steps. | N/A | No new ACs required |

### Non-Blocking Issues (Resolved)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | Missing explicit Zod version upgrade verification step | implementation-clarity | Implementation note added: "Run full test suite immediately after file migration (AC-9) to verify Zod 4.1.13 compatibility before proceeding to import updates." |
| 2 | Deprecated wrappers deletion timing unclear | dependency-order | Implementation note added: "Delete wrappers (AC-13/14/15) AFTER all app imports updated (AC-11/12), maintain dependency order." |
| 3 | No grep verification command in ACs | verification-clarity | AC-27 updated with explicit grep commands: `grep -r "@repo/upload-types" apps/web/main-app/src/ && grep -r "@repo/upload-types" apps/web/app-instructions-gallery/src/` |

### Non-Blocking Items (Logged to KB)

13 future opportunities identified and logged to KB for future sprint consideration:

| # | Finding | Category | KB Status |
|---|---------|----------|-----------|
| 1 | Automated migration script template for future similar migrations | tooling | Pending KB write |
| 2 | Deprecation warning usage analytics (telemetry) | observability | Pending KB write |
| 3 | ESLint rule to prevent imports from deprecated packages | edge-case | Pending KB write |
| 4 | Per-module test coverage thresholds (suggest 80%+ for schema packages) | code-organization | Pending KB write |
| 5 | Zod version compatibility CI check | observability | Pending KB write |
| 6 | Types directory subdivision (session/, upload/, slug/, edit/) | code-organization | Pending KB write |
| 7 | Named re-exports for tree-shaking instead of export * | ux-polish | Pending KB write |
| 8 | Schema documentation and usage examples in @repo/upload README | ux-polish | Pending KB write |
| 9 | JSDoc comments on all exported types for IDE hover documentation (PRIORITY) | ux-polish | Pending KB write |
| 10 | Codemod script for automated import path migration | tooling | Pending KB write |
| 11 | Calendar reminder for post-deprecation cleanup (2 sprint cycles = ~4 weeks) | tooling | Pending KB write |
| 12 | Conditional exports for browser vs node environments | code-organization | Pending KB write |
| 13 | Zod schema validation benchmarks for upload performance | performance | Pending KB write |

### Summary

- **MVP-critical gaps found**: 0
- **Low-severity issues resolved**: 3 (2 implementation notes, 1 AC clarification)
- **ACs added**: 0
- **ACs modified**: 1 (AC-27 clarified)
- **Implementation notes added**: 2
- **KB entries requested**: 13 (all non-blocking future opportunities)
- **Audit checks passed**: 7/7
- **Audit checks conditional**: 1/1 (acceptable)
- **Mode**: Autonomous
- **Verdict**: CONDITIONAL PASS
