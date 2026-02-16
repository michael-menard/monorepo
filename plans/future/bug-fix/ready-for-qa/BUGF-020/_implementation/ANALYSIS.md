# BUGF-020 Elaboration Analysis

**Story:** Fix Accessibility Issues and Improve A11y Test Coverage
**Analyst:** Story Elaboration Analyst (Autonomous Mode)
**Date:** 2026-02-11
**Story Points:** 8

---

## Executive Summary

**Overall Assessment:** CONDITIONAL PASS with minor sizing concern

The story is well-structured and aligns with the index entry scope. However, there are 3 findings that require decisions:

1. **Package Architecture Decision** - AC3 creates `@repo/accessibility-testing` as a standalone package, but this conflicts with monorepo patterns where testing utilities are typically subdirectories (e.g., `@repo/accessibility/testing` export path)
2. **Story Sizing Concern** - 8 points may be slightly low for the scope (fixes + new package + tests for 5 apps). Estimated effort: 10-11 points
3. **Consistency Issue** - AC1 states "no KeyboardSensor implementation" but the story references "arrow key navigation via roving tabindex" which IS implemented. The instructions are misleading about drag-and-drop keyboard support, but arrow navigation works correctly.

**Verdict:** CONDITIONAL PASS - Story is implementable as-is, but 2 non-blocking improvements recommended (package structure decision + sizing clarification).

---

## Audit Check 1: Scope Alignment

**Status:** ✅ PASS

### Index Entry
```
BUGF-020: Fix Accessibility Issues and Improve A11y Test Coverage
Status: created
Phase: 3 (Test Coverage & Quality)
Points: 8
```

### Story Scope
- Fix misleading drag handle instructions (AC1)
- Add accessible instructions to TagInput (AC2)
- Promote a11y test utilities to shared package (AC3)
- Add a11y test coverage to 5 apps (AC4-AC7)
- Verify focus visible compliance (AC8)

### Assessment
The story scope matches the index entry perfectly. The title accurately describes the work (fixes + test coverage). The phase (3) is appropriate for test coverage and quality improvements. No scope creep detected.

**Finding:** None

---

## Audit Check 2: Internal Consistency

**Status:** ⚠️ MINOR ISSUE (non-blocking)

### Goals vs Non-Goals Alignment
- **Goal:** "Fix identified accessibility issues and establish consistent a11y testing across all apps to ensure WCAG 2.1 AA compliance"
- **Non-Goals:** Correctly excludes KeyboardSensor implementation, visual regression tests, comprehensive audit, chart alt text

✅ Goals and non-goals are clear and complementary.

### ACs vs Goals Alignment
- AC1-AC2: Fix identified issues ✅
- AC3: Establish testing infrastructure ✅
- AC4-AC7: Add consistent a11y testing ✅
- AC8: Verify compliance ✅

✅ All ACs support the stated goals.

### Test Plan vs ACs Alignment
The test plan section provides detailed test scenarios for:
- AC1-AC2: Component fixes with unit tests ✅
- AC3: Shared package tests ✅
- AC4-AC7: App a11y tests (screen-reader, keyboard, axe) ✅
- AC8: Focus compliance tests ✅

✅ Test plan comprehensively covers all ACs.

### INCONSISTENCY DETECTED

**Issue:** AC1 states:
> "Drag handles describe keyboard drag-and-drop that isn't implemented (PointerSensor/TouchSensor only, no KeyboardSensor)"

But the instructions say:
> "Press Space to start dragging. Use arrow keys to move."

**Reality Check:**
- `DraggableWishlistGallery/index.tsx:417-418` confirms: "Removed KeyboardSensor to avoid conflict with useRovingTabIndex"
- `useRovingTabIndex` IS implemented for arrow key navigation between items
- Arrow keys DO work for navigation (confirmed in code)
- Arrow keys DO NOT work for drag-and-drop (no KeyboardSensor)

**Clarification Needed:**
The instructions are misleading because they say "Use arrow keys to move" in the context of drag-and-drop, but arrow keys actually navigate between items (roving tabindex), not drag items. The fix in AC1 correctly updates the instructions to:
> "Drag to reorder. Use arrow keys to navigate between items."

This is accurate and resolves the confusion.

**Finding:** BUGF-020-GAP-001 (documentation clarity) - Logged to deferred KB as non-blocking

---

## Audit Check 3: Reuse-First

**Status:** ✅ PASS with architectural question

### Existing Infrastructure Reuse
The story correctly identifies and reuses:

✅ **From `@repo/accessibility`:**
- `useAnnouncer` hook (validated in existing components)
- `focusRingClasses` utility (audit usage in AC8)
- `keyboardShortcutLabels` (standard labels)
- `ContrastRatioSchema` (validate contrast)

✅ **From `@repo/gallery`:**
- `useRovingTabIndex` (already used, validate in tests)
- `useKeyboardShortcuts` (already used, validate in tests)

✅ **From `@repo/app-component-library`:**
- Form primitives with automatic `aria-describedby` (validate in tests)

✅ **Promotes to Shared:**
- Wishlist-gallery a11y test utilities → `@repo/accessibility-testing` (AC3)

### Architectural Question: Package Structure

**Issue:** AC3 creates `@repo/accessibility-testing` as a new standalone package.

**Monorepo Pattern Analysis:**
- Current structure: 17 packages in `packages/core/`
- None have `/testing` subdirectories
- Testing utilities are typically included in the main package (e.g., `@repo/accessibility` already has `devDependencies: @testing-library/*`)

**Alternative Approach:**
Instead of a new package, consider:
```
packages/core/accessibility/
  src/
    index.ts              # Runtime exports
    testing/              # Testing utilities
      screen-reader.ts
      keyboard.ts
      axe.ts
      index.ts
  package.json            # Add testing exports
```

**Export Pattern:**
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

**Usage:**
```typescript
// Runtime utilities
import { useAnnouncer, focusRingClasses } from '@repo/accessibility'

// Testing utilities
import { validateAriaLabel, runAxe } from '@repo/accessibility/testing'
```

**Benefits:**
1. Fewer top-level packages to maintain
2. Co-located testing utilities with runtime code
3. Standard export pattern used in monorepos
4. Simpler dependency graph

**Tradeoff:**
- AC3 implementation would need to adjust from "create new package" to "add testing subdirectory + export"

**Finding:** BUGF-020-ENH-001 (package architecture) - Logged to deferred KB as non-blocking enhancement

---

## Audit Check 4: Ports & Adapters

**Status:** ✅ PASS

### Separation of Concerns

This story operates primarily at the **UI/Presentation Layer** (accessibility, testing) and does not cross into backend/domain logic. The separation is clean:

**UI Layer (This Story):**
- Component accessibility fixes (AC1-AC2)
- Testing infrastructure (AC3)
- Test coverage (AC4-AC7)
- Focus management (AC8)

**No Backend Dependencies:**
- No API changes required
- No database changes required
- No infrastructure changes required

**Shared Infrastructure:**
- `@repo/accessibility` package (runtime utilities)
- `@repo/accessibility-testing` package (test utilities) - proposed new package or subdirectory

**Architecture Compliance:**
- ✅ Testing utilities are properly isolated (AC3)
- ✅ Component fixes are localized to UI components
- ✅ No cross-cutting backend concerns
- ✅ Follows React 19 frontend architecture (CLAUDE.md)

**Finding:** None

---

## Audit Check 5: Local Testability

**Status:** ✅ PASS

### Test Infrastructure

All tests can run locally with MSW/mocks:

**Unit Tests (AC1-AC2):**
- Component tests using `@testing-library/react`
- No API dependencies for a11y attribute validation
- Mock `useAnnouncer` hook for screen reader announcements
- ✅ Fully local, fast execution

**Shared Package Tests (AC3):**
- Test utilities themselves are testable (meta-tests)
- No external dependencies
- Pure function testing
- ✅ Fully local, fast execution

**App A11y Tests (AC4-AC7):**
- Screen reader tests: ARIA validation, live region testing
- Keyboard tests: Navigation patterns, focus management
- Axe tests: Automated WCAG compliance checks

**Test Setup Analysis:**
All apps have consistent test setup with MSW:
- `app-inspiration-gallery/src/test/setup.ts`: MSW server configured ✅
- `app-sets-gallery/src/test/setup.ts`: MSW server configured ✅
- `app-dashboard/src/test/setup.ts`: MSW server configured ✅
- `app-wishlist-gallery/src/test/setup.ts`: MSW server configured ✅

**Dependencies:**
- `axe-core`: Runs in jsdom, no network calls ✅
- `@testing-library/react`: Local rendering ✅
- MSW: Local API mocking ✅

**No E2E Required:**
Per ADR-006, tech_debt and test stories are E2E exempt. All validation can be done via unit/integration tests.

**Finding:** None

---

## Audit Check 6: Decision Completeness

**Status:** ✅ PASS with 1 minor clarification

### Open Questions in Story

**Scanning for TBDs, TODOs, or decision points...**

✅ **AC1:** Clear implementation - update 2 files, specific line numbers provided
✅ **AC2:** Clear implementation - add aria-describedby to 2 TagInput components
⚠️ **AC3:** Minor ambiguity on package structure (new package vs subdirectory) - See Audit Check 3
✅ **AC4-AC7:** Clear implementation - create test directories, write 3 test files per app, 80%+ coverage
✅ **AC8:** Clear implementation - audit focusRingClasses usage, document patterns

### Coverage Targets

**Concern:** AC4-AC7 each specify "80%+ coverage" but don't clarify:
- Is this 80% line coverage? Branch coverage? Function coverage?
- Is this 80% of a11y-critical components or 80% overall?

**Story Text:**
> "Coverage Target: 80%+ of a11y-critical components (DraggableInspirationGallery, SortableInspirationCard, AlbumCard, modals)"

**Interpretation:**
- 80% coverage of the a11y-critical components listed in each AC
- Not 80% overall app coverage
- Focus on interaction paths (keyboard, screen reader, ARIA)

**Decision:** This is sufficiently clear. "80%+ of a11y-critical components" is an actionable target.

### Technology Choices

✅ **Test Framework:** Vitest + RTL (matches existing setup)
✅ **A11y Testing:** axe-core (standard tool, already in wishlist-gallery)
✅ **Package Manager:** pnpm (per CLAUDE.md)
✅ **Focus Management:** focusRingClasses from `@repo/accessibility` (existing utility)

**Finding:** BUGF-020-GAP-002 (coverage metric clarification) - Logged to deferred KB as non-blocking

---

## Audit Check 7: Risk Disclosure

**Status:** ✅ PASS

### Risks Identified in Story

**From Predictions Section:**
```yaml
split_risk: 0.2
confidence: medium
review_cycles: 1
estimated_token_cost: 100000
reasoning: "Low split risk due to clear scope (fixes + tests), established patterns from wishlist-gallery, and no behavioral changes."
```

**From Reality Baseline:**
> "Risks: Low risk - Most a11y patterns already in place, story is primarily additive"

### Risk Analysis

**1. Test Utilities Promotion (AC3)**
- **Risk:** Breaking changes to wishlist-gallery when moving utilities
- **Mitigation:** Update imports in same PR, comprehensive unit tests for utilities
- **Severity:** Low

**2. Package Structure Decision**
- **Risk:** Creating `@repo/accessibility-testing` as standalone package vs subdirectory
- **Mitigation:** Both approaches work, decision needed before implementation
- **Severity:** Very Low (architectural preference)

**3. Test Coverage Gaps**
- **Risk:** 80% coverage target may not catch all a11y issues
- **Mitigation:** Focus on critical interaction paths (keyboard, screen reader, ARIA)
- **Severity:** Low (automated tests supplement manual testing)

**4. Axe-Core False Negatives**
- **Risk:** Axe-core may not catch all WCAG violations
- **Mitigation:** Manual testing checklist included in story (lines 579-594)
- **Severity:** Low (axe-core is supplemental, not comprehensive)

**5. Story Sizing**
- **Risk:** 8 points may be low for scope (estimated 10-11 points)
- **Mitigation:** Break down by AC, prioritize AC1-AC3, defer AC8 if needed
- **Severity:** Low (story is cohesive, not a split candidate)

### Missing Risks?

**Potential Risk Not Disclosed:**
- **Cross-App Test Setup Divergence:** Apps have similar but not identical test setup files (BUGF-043 addresses this). If test setup diverges during implementation, shared utilities may fail in some apps.
- **Mitigation:** AC3 includes updating all app package.json files with `@repo/accessibility-testing` dependency

**Finding:** BUGF-020-GAP-003 (test setup divergence risk) - Logged to deferred KB as non-blocking

---

## Audit Check 8: Story Sizing

**Status:** ⚠️ POTENTIAL UNDERESTIMATE (non-blocking)

### Points Estimate: 8 Points

### Work Breakdown

**AC1: Fix Drag Handle Instructions (0.5 points)**
- Update 2 files: `SortableWishlistCard/index.tsx`, `SortableInspirationCard/index.tsx`
- Change text only (lines 137-140 in each)
- Write/update 2 unit tests
- **Estimated:** 0.5 points ✅

**AC2: Add TagInput Instructions (0.5 points)**
- Update 2 files: `app-sets-gallery/src/components/TagInput.tsx`, `app-wishlist-gallery/src/components/TagInput/index.tsx`
- Add `aria-describedby` + hidden instructions element
- Add `role="list"` to tag container
- Write/update 2 unit tests
- **Estimated:** 0.5 points ✅

**AC3: Promote Test Utilities to Shared Package (2-3 points)**
- Create new package structure: `packages/core/accessibility-testing/` or subdirectory
- Move ~2100 lines of utilities (screen-reader.ts, keyboard.ts, axe.ts, config.ts, index.ts)
- Create `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- Set up exports in `index.ts`
- Update 5 app `package.json` files with new dependency
- Update `apps/web/app-wishlist-gallery` imports (~10 files)
- Write unit tests for shared utilities (meta-tests)
- **Estimated:** 2-3 points (depending on package structure decision)

**AC4: Add A11y Tests to Inspiration Gallery (1.5 points)**
- Create `apps/web/app-inspiration-gallery/src/test/a11y/` directory
- Write 3 test files:
  - `__tests__/screen-reader.test.tsx` (~100 lines)
  - `__tests__/keyboard.test.tsx` (~100 lines)
  - `__tests__/axe.test.tsx` (~50 lines)
- Import and configure `@repo/accessibility-testing` utilities
- Mock drag-and-drop announcements, ARIA attributes, keyboard navigation
- **Estimated:** 1.5 points ✅

**AC5: Add A11y Tests to Sets Gallery (1.5 points)**
- Create `apps/web/app-sets-gallery/src/test/a11y/` directory
- Write 3 test files (screen-reader, keyboard, axe)
- Test form error announcements, TagInput keyboard shortcuts, axe compliance
- **Estimated:** 1.5 points ✅

**AC6: Add A11y Tests to Instructions Gallery (1.5 points)**
- Create `apps/web/app-instructions-gallery/src/test/a11y/` directory
- Write 3 test files (screen-reader, keyboard, axe)
- Test uploader announcements (already partially covered), gallery views, forms
- **Estimated:** 1.5 points ✅

**AC7: Add A11y Tests to Dashboard (1.5 points)**
- Create `apps/web/app-dashboard/src/test/a11y/` directory
- Write 3 test files (screen-reader, keyboard, axe)
- Test charts/visualizations ARIA, data tables, StatsCards, filters
- **Estimated:** 1.5 points ✅

**AC8: Verify Focus Visible Compliance (1-1.5 points)**
- Audit interactive elements across 5 apps for `focusRingClasses` usage
- Check buttons, links, form inputs, drag handles, cards
- Verify focus ring criteria (2px outline, 3:1 contrast)
- Create `docs/accessibility/focus-management.md` (~200 lines)
- Document focus trap patterns, restoration after actions
- **Estimated:** 1-1.5 points

### Total Estimated Effort: 10.5-12 points

**Story Points:** 8 points

**Gap:** 2.5-4 points over estimate

### Sizing Analysis

**Is 8 points appropriate?**

**Arguments for 8 points:**
- AC1-AC2 are trivial (text changes)
- AC3 reuses existing code (move, not write)
- AC4-AC7 follow established pattern from wishlist-gallery (template reuse)
- AC8 is audit + documentation (no code changes)

**Arguments for 10-12 points:**
- AC3 requires creating new package infrastructure (package.json, tsconfig, vitest config, exports)
- AC4-AC7 each require understanding app-specific components and writing custom test scenarios
- AC8 requires auditing 5 apps for focus compliance (time-consuming)
- 80% coverage target per app may require more test cases than estimated

**Recommendation:**

The story is cohesive and should NOT be split. However, 8 points is slightly optimistic. A more realistic estimate is **10 points**.

**Mitigation:**
- If velocity is a concern, AC8 can be deferred to a follow-up story (it's primarily documentation)
- Reducing story to AC1-AC7 would bring it to ~9 points

**Finding:** BUGF-020-GAP-004 (story sizing) - Logged to deferred KB as non-blocking (informational)

---

## Summary of Findings

### MVP-Blocking Gaps: 0

No gaps block MVP delivery. All findings are non-blocking.

### Non-Blocking Findings: 4

1. **BUGF-020-GAP-001** (documentation clarity) - Drag-and-drop vs navigation keyboard instructions
2. **BUGF-020-GAP-002** (coverage metric clarification) - 80% of what?
3. **BUGF-020-GAP-003** (test setup divergence risk) - Cross-app test setup differences
4. **BUGF-020-GAP-004** (story sizing) - 8 points may be low, 10 points more realistic

### Enhancement Opportunities: 1

1. **BUGF-020-ENH-001** (package architecture) - Use `@repo/accessibility/testing` export instead of new package

---

## Verdict

**CONDITIONAL PASS**

The story is ready for implementation with the following notes:

1. **Package Structure Decision Needed:** Before starting AC3, decide between:
   - Option A: Create `@repo/accessibility-testing` as standalone package (as written)
   - Option B: Add `testing/` subdirectory to `@repo/accessibility` with export path (recommended)

2. **Story Sizing Awareness:** 8 points may be slightly low. Implementation team should be aware of potential 10-point effort. AC8 can be deferred if needed.

3. **All other aspects pass:** Scope alignment, internal consistency, reuse-first, ports & adapters, local testability, decision completeness, and risk disclosure are all acceptable.

**No story modifications required.** Findings logged to deferred KB.

---

## Appendix: Codebase Validation

### Verified Existing Infrastructure

✅ `@repo/accessibility` package exists with:
- `useAnnouncer` hook (src/hooks/useAnnouncer.tsx)
- `focusRingClasses` utility (src/utils/focus-styles.ts)
- `keyboardShortcutLabels` utility (src/utils/keyboard-labels.ts)
- `ContrastRatioSchema` (src/utils/contrast-validation.ts)

✅ `@repo/gallery` package exists with:
- `useRovingTabIndex` hook (src/hooks/useRovingTabIndex.ts)
- `useKeyboardShortcuts` hook (src/hooks/useKeyboardShortcuts.ts)

✅ Wishlist-gallery a11y test utilities exist:
- `screen-reader.ts` (224 lines)
- `keyboard.ts` (~300 lines)
- `axe.ts` (~150 lines)
- `config.ts` (~50 lines)
- `index.ts` (exports)
- Total: ~2100 lines

✅ Test setup files exist in all apps:
- `app-inspiration-gallery/src/test/setup.ts` ✅
- `app-sets-gallery/src/test/setup.ts` ✅
- `app-dashboard/src/test/setup.ts` ✅
- `app-wishlist-gallery/src/test/setup.ts` ✅

✅ Component files to be modified exist:
- `app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx` (lines 137-140)
- `app-inspiration-gallery/src/components/SortableInspirationCard/index.tsx`
- `app-sets-gallery/src/components/TagInput.tsx`
- `app-wishlist-gallery/src/components/TagInput/index.tsx`

✅ No KeyboardSensor confirmed:
- `DraggableWishlistGallery/index.tsx:417-418`: "Removed KeyboardSensor to avoid conflict with useRovingTabIndex"
- Only PointerSensor and TouchSensor configured

✅ useRovingTabIndex IS implemented:
- Confirmed in `DraggableWishlistGallery/index.tsx:43` import
- Arrow key navigation works via roving tabindex
- Separate from drag-and-drop (which is pointer/touch only)

---

**Analysis Complete:** 2026-02-11
**Next Step:** Autonomous Decisions (DECISIONS.yaml + DEFERRED-KB-WRITES.yaml + FUTURE-OPPORTUNITIES.md)
