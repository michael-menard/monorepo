---
id: REPA-014
title: "Create @repo/hooks Package for Common React Hooks"
status: uat
priority: P2
experiment_variant: control
story_type: tech_debt
points: 5
tags:
  - repackaging
  - hooks
  - consolidation
created: 2026-02-10
epic: repackag-app
feature_area: core-packages
depends_on: []
elaborated: 2026-02-10
elaboration_verdict: PASS
---

# Create @repo/hooks Package for Common React Hooks

## Context

The codebase currently has duplicate implementations of common React hooks scattered across multiple web apps:

**Duplicate hooks:**
- `useLocalStorage` - exists identically in app-instructions-gallery and app-wishlist-gallery
- `useUnsavedChangesPrompt` - exists identically in app-instructions-gallery and main-app

**Unique but generally useful hooks:**
- `useDelayedShow` - exists only in main-app but is generally useful for delayed UI rendering
- `useMultiSelect` - exists only in app-inspiration-gallery but is generally useful for selection state

**Impact:**
- 101 total import references across 21 files
- Maintenance burden when applying fixes/enhancements
- Bundle size bloat from duplicates
- Risk of drift between identical implementations

**Current Reality:**
- REPA-001 completed: established package structure pattern with @repo/upload
- packages/core/accessibility/ and packages/core/gallery/ provide reference patterns
- 815 lines of existing comprehensive test coverage to migrate
- No active work conflicts

## Goal

Create a single source of truth for general-purpose React hooks by consolidating four hooks (useLocalStorage, useUnsavedChangesPrompt, useDelayedShow, useMultiSelect) into a new @repo/hooks package, eliminating duplicates and making generally useful hooks available to all apps.

## Non-Goals

- Modifying hook functionality or API (migration only, preserve existing behavior)
- Adding new hooks beyond the four identified
- Creating domain-specific hooks (those belong in @repo/gallery, @repo/upload, etc.)
- E2E or UAT testing (no user-facing changes, internal refactor only)
- Migrating hooks that are domain-specific or tightly coupled to a single app
- Changing the behavior of useUnsavedChangesPrompt's TanStack Router dependency

## Scope

### Packages Touched
- **New:** `packages/core/hooks/` - create entire package
- **Modified:** All consuming apps (app-instructions-gallery, app-wishlist-gallery, main-app, app-inspiration-gallery)

### Components/Files Modified
**Consumer files (21 total):**
- useLocalStorage consumers: 5 files
  - apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx
  - apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx
  - apps/web/app-wishlist-gallery/src/hooks/useWishlistSortPersistence.ts
  - apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx
- useUnsavedChangesPrompt consumers: 2 files
  - apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx
  - apps/web/app-instructions-gallery/src/components/Uploader/SessionProvider/index.tsx
- useDelayedShow consumers: 2 files
  - apps/web/main-app/src/components/PageTransitionSpinner/PageTransitionSpinner.tsx
- useMultiSelect consumers: 3 files
  - apps/web/app-inspiration-gallery/src/pages/main-page.tsx
  - apps/web/app-inspiration-gallery/src/hooks/index.ts

**Files to delete after migration:**
- apps/web/app-instructions-gallery/src/hooks/useLocalStorage.ts
- apps/web/app-instructions-gallery/src/hooks/useUnsavedChangesPrompt.ts
- apps/web/app-wishlist-gallery/src/hooks/useLocalStorage.ts
- apps/web/main-app/src/hooks/useUnsavedChangesPrompt.ts
- apps/web/main-app/src/hooks/useDelayedShow.ts
- apps/web/app-inspiration-gallery/src/hooks/useMultiSelect.ts

### Endpoints
None - purely frontend/hook consolidation.

### Data/Storage
- No database changes
- useLocalStorage interacts with browser localStorage (existing behavior)

## Acceptance Criteria

### Package Setup (3 ACs)

- [ ] **AC-1:** Create @repo/hooks package structure in packages/core/hooks/ with:
  - package.json with name "@repo/hooks", version "0.1.0"
  - dependencies: react (peer), @repo/logger (workspace:*), @tanstack/react-router (peer), zod (peer)
  - exports field with named exports for all four hooks
  - tsconfig.json extending from root tsconfig
  - vite.config.ts for build (following REPA-001 pattern)
  - README.md documenting all four hooks

- [ ] **AC-2:** Package builds successfully with `pnpm build` from packages/core/hooks/

- [ ] **AC-3:** Package.json exports configured correctly:
  ```json
  {
    "exports": {
      "./useLocalStorage": "./src/useLocalStorage.ts",
      "./useUnsavedChangesPrompt": "./src/useUnsavedChangesPrompt.ts",
      "./useDelayedShow": "./src/useDelayedShow.ts",
      "./useMultiSelect": "./src/useMultiSelect.ts"
    }
  }
  ```

### Hook Migration (5 ACs)

- [ ] **AC-4:** Migrate useLocalStorage to @repo/hooks/src/useLocalStorage.ts:
  - Copy implementation from app-wishlist-gallery (reference version)
  - Preserve all JSDoc comments
  - Keep zod schema validation support
  - Verify @repo/logger import works

- [ ] **AC-5:** Migrate useUnsavedChangesPrompt to @repo/hooks/src/useUnsavedChangesPrompt.ts:
  - Copy implementation from main-app (reference version)
  - Preserve TanStack Router dependency
  - Keep all JSDoc comments

- [ ] **AC-6:** Migrate useDelayedShow to @repo/hooks/src/useDelayedShow.ts:
  - Copy implementation from main-app
  - Preserve timer-based delay logic
  - Keep all JSDoc comments

- [ ] **AC-7:** Migrate useMultiSelect to @repo/hooks/src/useMultiSelect.ts:
  - Copy implementation from app-inspiration-gallery
  - Preserve shift-click range selection logic
  - Keep all JSDoc comments

- [ ] **AC-8:** All hooks use named exports (not default exports) per CLAUDE.md

### Test Migration (3 ACs)

- [ ] **AC-9:** Migrate useLocalStorage tests to @repo/hooks/src/__tests__/useLocalStorage.test.ts:
  - Copy all 239 lines from app-wishlist-gallery version
  - Update imports to reference local hook file
  - All tests pass with `pnpm test` from packages/core/hooks/

- [ ] **AC-10:** Migrate useDelayedShow tests to @repo/hooks/src/__tests__/useDelayedShow.test.ts:
  - Copy all 233 lines from main-app version
  - Update imports to reference local hook file
  - All tests pass including timer mocking tests

- [ ] **AC-11:** Migrate useMultiSelect tests to @repo/hooks/src/__tests__/useMultiSelect.test.ts:
  - Copy all 343 lines from app-inspiration-gallery version
  - Update imports to reference local hook file
  - All tests pass including shift-click range selection tests

### Consumer Updates (2 ACs)

- [ ] **AC-12:** Update all 21 consumer files to import from @repo/hooks:
  - Replace relative imports with @repo/hooks imports
  - Use named imports matching package exports
  - Example: `import { useLocalStorage } from '@repo/hooks/useLocalStorage'`

- [ ] **AC-13:** Add @repo/hooks dependency to consuming app package.json files:
  - app-instructions-gallery
  - app-wishlist-gallery
  - main-app
  - app-inspiration-gallery
  - Use `workspace:*` version specifier

### Cleanup & Verification (3 ACs)

- [ ] **AC-14:** Remove duplicate hook files after successful migration:
  - Delete 6 duplicate hook implementation files listed in Scope
  - Verify no other files import from deleted paths

- [ ] **AC-15:** Build verification passes for all consuming apps:
  - `pnpm build` succeeds for app-instructions-gallery
  - `pnpm build` succeeds for app-wishlist-gallery
  - `pnpm build` succeeds for main-app
  - `pnpm build` succeeds for app-inspiration-gallery

- [ ] **AC-16:** Type checking passes for all consuming apps:
  - `pnpm check-types` passes for all four consuming apps
  - No TypeScript errors related to hook imports

## Reuse Plan

### Existing Patterns
- **REPA-001 package structure:** Use as template for @repo/hooks package setup (package.json, tsconfig.json, vite.config.ts)
- **packages/core/accessibility/:** Reference for core package patterns
- **packages/core/gallery/:** Reference for hooks package structure

### Dependencies
- **@repo/logger** (existing): Used by useLocalStorage and useUnsavedChangesPrompt
- **@tanstack/react-router** (peer): Required dependency for useUnsavedChangesPrompt
- **zod** (peer): Used by useLocalStorage for optional schema validation
- **react** (peer): All hooks require React

### Test Coverage
- **Preserve existing tests:** 815 lines of comprehensive test coverage
  - useLocalStorage: 239 lines (app-wishlist-gallery version)
  - useDelayedShow: 233 lines (main-app version)
  - useMultiSelect: 343 lines (app-inspiration-gallery version)

## Architecture Notes

### Package Placement
- Location: `packages/core/hooks/`
- Rationale: General-purpose hooks belong in core/ namespace, not domain-specific (gallery/, upload/)

### Dependency Considerations
- **TanStack Router dependency:** useUnsavedChangesPrompt requires @tanstack/react-router. This is acceptable as a peer dependency since all consuming apps already use TanStack Router.
- **No circular dependencies:** Verified that creating @repo/hooks does not introduce circular dependencies. Package only depends on @repo/logger and external libraries.

### Migration Strategy
Three-step approach to minimize risk:
1. Create @repo/hooks package with all hooks and tests
2. Update consumer imports and verify builds/tests pass
3. Delete duplicate files after verification

### Export Pattern
Direct exports (no barrel files per CLAUDE.md):
```typescript
// Consumer usage
import { useLocalStorage } from '@repo/hooks/useLocalStorage'
import { useMultiSelect } from '@repo/hooks/useMultiSelect'
```

## Test Plan

### Scope Summary
- **Endpoints touched:** None
- **UI touched:** No (internal refactor)
- **Data/storage touched:** No (preserves existing localStorage behavior)

### Unit Tests (Primary Focus)

**Test 1: useLocalStorage tests pass in new location**
- Setup: Run `pnpm test` from packages/core/hooks/
- Expected: All 239 lines of useLocalStorage.test.ts pass
- Evidence: Vitest output showing all tests green

**Test 2: useDelayedShow tests pass in new location**
- Setup: Run `pnpm test` from packages/core/hooks/
- Expected: All 233 lines of useDelayedShow.test.ts pass, including timer mocking
- Evidence: Vitest output showing all tests green

**Test 3: useMultiSelect tests pass in new location**
- Setup: Run `pnpm test` from packages/core/hooks/
- Expected: All 343 lines of useMultiSelect.test.ts pass, including shift-click tests
- Evidence: Vitest output showing all tests green

**Test 4: useUnsavedChangesPrompt (no existing tests)**
- Setup: Manual verification that hook imports correctly
- Expected: No TypeScript errors
- Evidence: `pnpm check-types` passes

### Integration Tests

**Test 5: Consumer imports work after migration**
- Setup: Update 1 consumer file (e.g., AddItemPage.tsx) to import from @repo/hooks
- Action: Run `pnpm build` for app-wishlist-gallery
- Expected: Build succeeds with no import errors
- Evidence: Build output success, no module resolution errors

**Test 6: All 21 consumer files build successfully**
- Setup: Update all 21 consumer files to import from @repo/hooks
- Action: Run `pnpm build` from monorepo root
- Expected: All four consuming apps build successfully
- Evidence: Turborepo build summary showing success

**Test 7: Type checking passes across all apps**
- Setup: All consumer imports updated
- Action: Run `pnpm check-types` from monorepo root
- Expected: No TypeScript errors in any consuming app
- Evidence: TypeScript output showing 0 errors

### Smoke Tests

**Test 8: Package installation works**
- Setup: Clean install with `pnpm install --force`
- Action: Verify @repo/hooks resolves in consuming apps
- Expected: No workspace resolution errors
- Evidence: pnpm install output, no errors

**Test 9: Duplicate files safely deleted**
- Setup: Remove 6 duplicate hook files
- Action: Run `pnpm build` and `pnpm test` for all consuming apps
- Expected: No import errors, all tests pass
- Evidence: Build/test output success

### Error Cases (Not Applicable)
No error cases to test - this is an internal refactor with no user-facing changes.

### Edge Cases (Not Applicable)
No edge cases to test - hook behavior is preserved exactly.

### Required Tooling Evidence

**Build verification:**
- Run `pnpm build` from packages/core/hooks/ - must succeed
- Run `pnpm build` from monorepo root - all apps must succeed

**Test verification:**
- Run `pnpm test` from packages/core/hooks/ - all 815+ lines of tests must pass
- Run `pnpm test` from consuming apps - no regressions

**Type checking:**
- Run `pnpm check-types` from monorepo root - must pass with 0 errors

### Risks to Call Out
- No test file exists for useUnsavedChangesPrompt - will rely on type checking and manual verification
- Large changeset (21 files) - recommend thorough review before merging

## Dev Feasibility

### Feasibility Summary
- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** Straightforward code migration with established patterns from REPA-001. All hooks are self-contained with no complex dependencies. Comprehensive existing test coverage (815 lines) provides safety net.

### Likely Change Surface (Core Only)
- **New package:** packages/core/hooks/ (entire package)
- **App imports:** 21 consumer files across 4 apps
- **Package.json:** 4 app package.json files to add @repo/hooks dependency
- **No critical deploy touchpoints:** Internal refactor only

### MVP-Critical Risks

**Risk 1: TanStack Router peer dependency conflict**
- **Why it could block MVP:** If any consuming app uses a different TanStack Router version, peer dependency resolution may fail
- **Required mitigation:** Verify all four apps use compatible @tanstack/react-router versions before migration. Check package.json files for version alignment.

**Risk 2: Circular dependency with @repo/logger**
- **Why it could block MVP:** If @repo/logger imports from any consuming app that will import @repo/hooks, circular dependency prevents build
- **Required mitigation:** Verify @repo/logger has no imports from apps/web/** before creating @repo/hooks. Review packages/core/logger/src/ for any app imports.

**Risk 3: Missing tests for useUnsavedChangesPrompt**
- **Why it could block MVP:** No test coverage exists for this hook. Refactor could introduce silent breakage.
- **Required mitigation:** Add smoke test in SessionProvider components after migration OR add basic unit test to @repo/hooks before migration.

### Missing Requirements for MVP

**Requirement 1: Peer dependency version alignment**
- **Decision needed:** Confirm compatible version ranges for @tanstack/react-router across all apps
- **Concrete text:** "All consuming apps must use @tanstack/react-router versions compatible with ^1.x.x (or specify exact aligned version)"

**Requirement 2: Migration order**
- **Decision needed:** Should we migrate one hook at a time or all four simultaneously?
- **Concrete text:** "Migrate all four hooks in single PR to minimize intermediate states and ensure atomic changeset"

### MVP Evidence Expectations

**Proof needed for core journey:**
1. All 815 lines of migrated tests pass in new package location
2. `pnpm build` succeeds for all four consuming apps after consumer import updates
3. `pnpm check-types` passes for all four consuming apps
4. No import errors when duplicate files are deleted

**Critical CI/deploy checkpoints:**
- Turborepo build must pass for all apps
- Vitest coverage must remain at or above 45% global threshold
- No TypeScript errors in any workspace

### Non-MVP Risks

**Risk 1: Hook API evolution**
- **Impact:** Future enhancements to hooks may require breaking changes across all consuming apps
- **Recommended timeline:** Post-MVP, establish versioning and deprecation strategy for shared hooks

**Risk 2: Test file maintenance burden**
- **Impact:** 815 lines of test code now requires maintenance in single location
- **Recommended timeline:** Post-MVP, review test coverage and consider refactoring redundant tests

**Risk 3: Missing JSDoc documentation**
- **Impact:** Hooks may lack comprehensive documentation for new consumers
- **Recommended timeline:** Post-MVP, audit and enhance JSDoc comments for all four hooks

### Scope Tightening Suggestions

**Future iterations:**
- Add Storybook documentation for @repo/hooks package
- Create migration guide for teams extracting hooks from apps
- Add linting rule to prevent duplicate hook implementations

**OUT OF SCOPE candidates for later:**
- Creating additional general-purpose hooks (e.g., useDebounce, useThrottle)
- Optimizing hook implementations for performance
- Adding advanced type safety features (e.g., branded types for localStorage keys)

### Future Requirements
- **Nice-to-have:** Automated detection of duplicate code patterns across hooks
- **Polish:** Add examples to README.md for each hook
- **Edge case handling:** Add error boundaries for hooks that interact with browser APIs

## Predictions

**Note:** Predictions generated by pm-story-risk-predictor (haiku model) using heuristics-only mode (WKFL-006 patterns unavailable).

### Risk Metrics
- **split_risk:** 0.3 (low-medium risk of story splitting)
  - Base risk from 14 ACs: 0.2
  - No full-stack complexity (frontend only): +0.0
  - No database changes: +0.0
  - Multi-file changeset (21 files): +0.1

- **review_cycles:** 2 (expected code review iterations)
  - Base cycles: 1
  - 21 files touched: +1
  - No auth/security complexity: +0

- **token_estimate:** 125,000 (predicted total token cost)
  - Fallback to global default (no similar stories with sufficient data)
  - Adjustment: -25K for straightforward migration pattern

### Confidence
- **Level:** Low
- **Reasoning:** No similar story data available, WKFL-006 patterns unavailable, relying on conservative heuristics

### Similar Stories
None found - @repo/hooks is first general-purpose hooks consolidation in this codebase.

### Metadata
- **generated_at:** 2026-02-10T19:45:00Z
- **model:** haiku
- **wkfl_version:** 007-v1

## Reality Baseline

### Current State Snapshot

**Existing implementations:**
- useLocalStorage: 2 identical copies (app-instructions-gallery, app-wishlist-gallery)
- useUnsavedChangesPrompt: 2 identical copies (app-instructions-gallery, main-app)
- useDelayedShow: 1 copy (main-app)
- useMultiSelect: 1 copy (app-inspiration-gallery)

**Test coverage:**
- useLocalStorage.test.ts: 239 lines (app-wishlist-gallery)
- useDelayedShow.test.ts: 233 lines (main-app)
- useMultiSelect.test.ts: 343 lines (app-inspiration-gallery)
- useUnsavedChangesPrompt: NO TESTS

**Dependencies:**
- All consuming apps already have @repo/logger
- All consuming apps already have @tanstack/react-router
- All consuming apps already have zod and react

### Constraints from Reality

**Protected features (do not modify):**
- Existing hook APIs and signatures
- Consumer component behavior
- localStorage key formats used by useLocalStorage
- TanStack Router integration in useUnsavedChangesPrompt

**Changed constraints:**
- CLAUDE.md rules apply: Zod-first types, named exports, no barrel files
- REPA-001 pattern must be followed for package structure
- Minimum 45% test coverage must be maintained

### Verification Points

**Before starting implementation:**
- [ ] Verify all four apps use compatible @tanstack/react-router versions
- [ ] Verify @repo/logger has no imports from apps/web/**
- [ ] Confirm REPA-001 (@repo/upload) is completed and provides reference structure

**After hook migration:**
- [ ] All 815+ lines of tests pass in new location
- [ ] No TypeScript errors in @repo/hooks package

**After consumer updates:**
- [ ] All 21 consumer files import from @repo/hooks successfully
- [ ] All four apps build without errors

**After cleanup:**
- [ ] All 6 duplicate files deleted
- [ ] No remaining imports reference deleted files
- [ ] Full monorepo build and test pass

---

**Story generated:** 2026-02-10
**Generated by:** pm-story-generation-leader (sonnet)
**Seed file:** plans/future/repackag-app/backlog/REPA-014/_pm/STORY-SEED.md

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

None - All MVP-critical gaps verified as non-blocking:

| # | Finding | Resolution | Status |
|---|---------|------------|--------|
| 1 | TanStack Router version alignment | Verified - All apps use ^1.130.2 | ✅ Verified |
| 2 | Circular dependency risk with @repo/logger | Verified - No imports from apps/web/** | ✅ Verified |
| 3 | Missing tests for useUnsavedChangesPrompt | Mitigated - Type-check verification via AC-16 | ✅ Acceptable |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 1 | Consumer count discrepancy | documentation | Story claims 21 files, actual 18 (6 hooks, 8 consumers, 3 tests, 1 re-export) |
| 2 | useUnsavedChangesPrompt test coverage | test-gap | Hook in production without tests; AC-16 type-check mitigation specified |
| 3 | Export pattern clarification | documentation | Direct file exports correct per CLAUDE.md "no barrel files" rule |
| 4 | Incomplete test verification | documentation | AC-16 covers implicitly; explicit verification acceptable |
| 5 | useUnsavedChangesPrompt coverage | test-coverage | Type-check mitigation sufficient for MVP |
| 6-20 | Enhancement opportunities | future | 15 enhancements logged: TTL support, storage events, keyboard selection, easing, custom dialogs, useDebounce/useThrottle, useMediaQuery, branded types, error boundaries, versioning, JSDoc consistency, usage guidance, Storybook, changelog, ESLint rules |

### Summary

- ACs added: 0
- ACs modified: 0
- KB entries created: 20
- Mode: autonomous
- Verdict: PASS
- MVP-critical gaps: 0
- Non-blocking findings: 5
- Enhancement opportunities: 15
- Post-MVP story candidates: 4 (REPA-014b/c/d/e)
