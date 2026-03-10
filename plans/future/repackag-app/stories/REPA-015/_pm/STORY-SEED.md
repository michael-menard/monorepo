---
doc_type: story_seed
story_id: REPA-015
title: "Enhance @repo/accessibility"
created_at: "2026-02-10"
agent_version: "pm-story-seed-agent-v1.0"
baseline_warning: "No baseline reality file exists - codebase scanning only"
---

# REPA-015: Enhance @repo/accessibility - Story Seed

## Index Entry

```markdown
## REPA-015: Enhance @repo/accessibility

**Status:** pending
**Depends On:** none
**Feature:** Move accessibility hooks to @repo/accessibility. Add useAnnouncer (deduped from wishlist/inspiration). Add ARIA label generators from a11y.ts.
**Goal:** Comprehensive accessibility utilities in @repo/accessibility.
**Risk Notes:** —
```

## Reality Baseline Status

⚠️ **WARNING:** No baseline reality file exists at `plans/baselines/`. This seed is generated from codebase scanning only.

## Current State Analysis

### Existing @repo/accessibility Package

**Location:** `/Users/michaelmenard/Development/monorepo/packages/core/accessibility/`

**Current Structure:**
```
packages/core/accessibility/
  src/
    components/
      KeyboardDragDropArea/index.tsx
    hooks/
      useKeyboardDragAndDrop.ts
      useAnnouncer.tsx          ← ALREADY ADDED (REPA-008)
      __tests__/
        useAnnouncer.test.tsx   ← ALREADY ADDED (REPA-008)
    __tests__/
      useKeyboardDragAndDrop.test.tsx
      KeyboardDragDropArea.test.tsx
    test/
      setup.ts
    index.ts
  package.json
```

**Current Exports (from index.ts):**
- `useKeyboardDragAndDrop` + types
- `KeyboardDragDropArea` component + types
- `useAnnouncer` + `Announcer` component + types ← **ALREADY ADDED (REPA-008)**

**Dependencies:**
- React 19.1.0
- Zod 3.22.4
- framer-motion 12.23.22
- lucide-react 0.468.0

### Related Work: REPA-008 Status

**Story:** REPA-008: Add Gallery Keyboard Hooks
**Status:** In Progress
**Relevant Completions:**
- ✅ `useAnnouncer` hook ALREADY MOVED to `@repo/accessibility`
- ✅ Tests for `useAnnouncer` ALREADY MIGRATED
- ✅ Exported from `packages/core/accessibility/src/index.ts`
- ⏳ `useRovingTabIndex`, `useKeyboardShortcuts`, `useGalleryKeyboard` moved to `@repo/gallery`

**Impact on REPA-015:**
- `useAnnouncer` is NO LONGER a candidate for this story (already completed)
- Story scope should focus on ARIA label generators from `a11y.ts`
- Story description in index is OUTDATED and needs revision

### Source of Truth: a11y.ts Utilities

**Primary Source:** `/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/utils/a11y.ts`
**Size:** 257 lines
**Created by:** Story WISH-2006: Accessibility

**Functions Available for Migration:**

1. **ARIA Label Generators (Domain-Specific):**
   - `generateItemAriaLabel(item, index, total)` - Wishlist item labels
   - `generatePriorityChangeAnnouncement(item, newPosition, total)` - Priority updates
   - `generateDeleteAnnouncement(deletedTitle, nextTitle?)` - Deletion feedback
   - `generateAddAnnouncement(itemTitle?)` - Addition feedback
   - `generateFilterAnnouncement(count, sortMethod, filterActive)` - Filter/sort feedback
   - `generateEmptyStateAnnouncement(hasFilters)` - Empty state feedback
   - `generateModalOpenAnnouncement(modalType, itemTitle?)` - Modal feedback
   - `generateDragAnnouncement(itemTitle, action, position?, total?)` - Drag-and-drop feedback

2. **UI Utilities:**
   - `focusRingClasses` - Consistent focus styling string
   - `keyboardShortcutLabels` - Key name mapping object
   - `getKeyboardShortcutLabel(key)` - Human-readable key labels

3. **Schemas:**
   - `ContrastRatioSchema` - WCAG AA contrast validation

**Current Usage Locations:**
- `/apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` (imports `focusRingClasses`)
- `/apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` (imports `generateItemAriaLabel`, `focusRingClasses`)
- `/apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts` (257 lines of tests)

**Test Coverage:**
- ✅ All functions have comprehensive unit tests
- ✅ Tests verify formatting, pluralization, edge cases
- ✅ Tests cover WCAG contrast requirements
- ✅ Tests validate keyboard shortcut labels

### Duplication Analysis

**useAnnouncer Deduplication:** ✅ ALREADY COMPLETED in REPA-008
- Original wishlist version: 180 lines
- Original inspiration version: 154 lines
- **Resolution:** Consolidated into `@repo/accessibility` by REPA-008

**a11y.ts Duplication Check:**
- ❌ No duplicate `a11y.ts` found in other apps
- ✅ Only exists in `app-wishlist-gallery`
- ⚠️ Inspiration gallery has inline aria-label logic in components (not extracted)

**focusRingClasses Usage:**
- Found in 4 files across web apps
- Currently imported from local `../../utils/a11y`
- Candidates for centralized import after migration

## Gap Analysis

### What the Index Says vs. Reality

**Index Description:**
> Move accessibility hooks to @repo/accessibility. Add useAnnouncer (deduped from wishlist/inspiration). Add ARIA label generators from a11y.ts.

**Reality:**
1. ✅ `useAnnouncer` is ALREADY in `@repo/accessibility` (completed by REPA-008)
2. ⏳ ARIA label generators from `a11y.ts` are NOT yet moved
3. ⚠️ Most ARIA functions are domain-specific (wishlist-oriented)
4. ⚠️ Some functions reference `WishlistItem` type from `@repo/api-client`

**Conclusion:** Story scope needs refinement. Focus should be on:
- Extracting **generic** accessibility utilities (not domain-specific)
- Moving `focusRingClasses` and keyboard utilities
- Creating **patterns** for domain-specific ARIA generators (not moving them directly)

## Architectural Considerations

### What Should Move vs. What Should Stay

**Good Candidates for @repo/accessibility (Generic):**
- ✅ `focusRingClasses` - Universal focus styling
- ✅ `keyboardShortcutLabels` - Universal key mappings
- ✅ `getKeyboardShortcutLabel()` - Universal key formatting
- ✅ `ContrastRatioSchema` - WCAG validation schema
- ⚠️ `generateDragAnnouncement()` - Generic drag-and-drop (consider)

**Should NOT Move (Domain-Specific):**
- ❌ `generateItemAriaLabel()` - Wishlist-specific (references WishlistItem)
- ❌ `generatePriorityChangeAnnouncement()` - Wishlist-specific
- ❌ `generateDeleteAnnouncement()` - Could be generic, but currently wishlist-focused
- ❌ `generateAddAnnouncement()` - Could be generic, but currently wishlist-focused
- ❌ `generateFilterAnnouncement()` - Gallery-specific
- ❌ `generateEmptyStateAnnouncement()` - Wishlist-specific
- ❌ `generateModalOpenAnnouncement()` - Wishlist-specific

### Alternative Approach: Shared Patterns

Instead of moving domain-specific functions, consider:

1. **Move Generic Utilities:**
   - `focusRingClasses`
   - `keyboardShortcutLabels`
   - `getKeyboardShortcutLabel()`
   - `ContrastRatioSchema`

2. **Create Generic Announcement Builders:**
   ```typescript
   // @repo/accessibility
   export function buildItemAriaLabel(parts: string[]): string {
     return parts.filter(Boolean).join(', ')
   }

   export function buildAnnouncementTemplate(template: string, values: Record<string, string>): string {
     return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || '')
   }
   ```

3. **Document Patterns:**
   - Add examples in `@repo/accessibility` README
   - Show how apps can create domain-specific generators
   - Keep domain logic in apps where it belongs

### Package Structure After Enhancement

**Proposed Structure:**
```
packages/core/accessibility/
  src/
    components/
      KeyboardDragDropArea/
    hooks/
      useKeyboardDragAndDrop.ts
      useAnnouncer.tsx                 ← Already exists (REPA-008)
      __tests__/
        useAnnouncer.test.tsx          ← Already exists (REPA-008)
    utils/
      focus-styles.ts                  ← NEW (focusRingClasses)
      keyboard-labels.ts               ← NEW (keyboardShortcutLabels, getKeyboardShortcutLabel)
      aria-builders.ts                 ← NEW (generic announcement builders)
      contrast-validation.ts           ← NEW (ContrastRatioSchema)
      __tests__/
        focus-styles.test.ts           ← NEW
        keyboard-labels.test.ts        ← NEW
        aria-builders.test.ts          ← NEW
        contrast-validation.test.ts    ← NEW
    index.ts                           ← Update exports
```

## Proposed Story Scope Refinement

### Option 1: Generic Utilities Only (Recommended)

**Scope:**
1. Create `utils/` directory in `@repo/accessibility`
2. Move generic utilities from `app-wishlist-gallery/src/utils/a11y.ts`:
   - `focusRingClasses`
   - `keyboardShortcutLabels`
   - `getKeyboardShortcutLabel()`
   - `ContrastRatioSchema`
3. Move corresponding tests
4. Update imports in consuming apps
5. Add JSDoc documentation with usage examples
6. Keep domain-specific functions in apps

**Lines of Code:**
- ~50 lines moved
- ~100 lines of tests moved
- ~150 total LOC

**Effort:** 1 SP (Small)

### Option 2: Full Migration with Refactoring (Not Recommended)

**Scope:**
1. Move all utilities from `a11y.ts`
2. Refactor domain-specific functions to be generic
3. Create adapter patterns for apps to use
4. Update all import paths
5. Extensive testing and documentation

**Lines of Code:**
- ~257 lines moved/refactored
- ~250+ lines of tests
- High risk of breaking changes

**Effort:** 3 SP (Medium-Large)

**Risk:** High - Domain-specific functions may not generalize well

## Dependencies and Blockers

### Story Dependencies

**Depends On:**
- None explicitly listed in index

**Implicit Dependencies:**
- ✅ REPA-008 (partially) - `useAnnouncer` already completed
- ❌ No blockers for generic utilities migration

### Technical Dependencies

**Package Dependencies (No New Required):**
- React - Already in package
- Zod - Already in package
- No new external dependencies

**Type Dependencies:**
- ⚠️ Domain-specific functions reference `WishlistItem` from `@repo/api-client`
- ❌ Should NOT create dependency from `@repo/accessibility` to `@repo/api-client`
- ✅ Generic utilities have no external type dependencies

## Breaking Changes Analysis

### Import Changes Required

**Before (Wishlist Gallery):**
```typescript
import { focusRingClasses, generateItemAriaLabel } from '../../utils/a11y'
```

**After (Recommended Approach):**
```typescript
// Generic utilities from shared package
import { focusRingClasses } from '@repo/accessibility'

// Domain-specific utilities stay local
import { generateItemAriaLabel } from '../../utils/a11y'
```

**Files Requiring Updates:**
- `/apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- `/apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`
- Any other files importing `focusRingClasses` from local utils

### Test Migration

**Source Tests:**
- `/apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts` (257 lines)

**Action Required:**
- Extract tests for generic utilities only
- Move to `packages/core/accessibility/src/utils/__tests__/`
- Keep domain-specific tests in app

## Test Plan Outline

### Unit Tests (New Package Tests)

**focus-styles.test.ts:**
- ✅ focusRingClasses contains required Tailwind classes
- ✅ Classes follow WCAG 2.1 focus indicator guidelines
- ✅ Classes work with dark mode variants

**keyboard-labels.test.ts:**
- ✅ All common keys have mappings (A-Z, arrows, special keys)
- ✅ getKeyboardShortcutLabel returns correct labels
- ✅ Unmapped keys default to uppercase
- ✅ Special keys (Delete, Escape, etc.) have human-readable names

**aria-builders.test.ts** (if generic builders added):
- ✅ buildItemAriaLabel joins parts correctly
- ✅ Empty parts are filtered out
- ✅ Template replacement works with placeholders

**contrast-validation.test.ts:**
- ✅ ContrastRatioSchema enforces WCAG AA ratios
- ✅ Normal text requires 4.5:1 minimum
- ✅ Large text requires 3:1 minimum
- ✅ Invalid ratios are rejected

### Integration Tests (App-Level)

**Wishlist Gallery:**
- ✅ focusRingClasses still applied correctly to interactive elements
- ✅ Focus indicators visible on keyboard navigation
- ✅ No visual regressions in focus styling
- ✅ App builds and runs without import errors

### Manual Testing

**Focus Styling:**
1. Tab through wishlist gallery → focus rings visible on all interactive elements
2. Focus rings meet WCAG 2.1 contrast requirements (manual check with dev tools)
3. Dark mode → focus rings still visible

**Keyboard Labels:**
1. Check keyboard shortcuts help (if implemented) → labels display correctly
2. Special keys show human-readable names (Del, Esc, Enter)

## Quality Gates

**Minimum Requirements:**
- ✅ All tests pass: `pnpm test --filter=@repo/accessibility`
- ✅ App tests pass: `pnpm test --filter=app-wishlist-gallery`
- ✅ Package builds: `pnpm build --filter=@repo/accessibility`
- ✅ TypeScript compiles: `pnpm check-types:all`
- ✅ Linting passes: `pnpm lint:all`
- ✅ No circular dependencies introduced
- ✅ Test coverage maintained at 45% minimum

## Risk Assessment

### Low Risk (Recommended Approach)

**Moving Generic Utilities Only:**
- ✅ Small, well-defined scope (~50 LOC)
- ✅ No domain-specific dependencies
- ✅ Clear separation of concerns
- ✅ Easy to test and verify
- ✅ Low chance of breaking changes

### Medium-High Risk (Full Migration)

**Moving Domain-Specific Functions:**
- ⚠️ Requires refactoring for generalization
- ⚠️ Risk of circular dependencies (api-client types)
- ⚠️ May not provide real reuse value (specific to wishlist)
- ⚠️ Higher testing burden
- ⚠️ More files to update across apps

## Recommendations

### Critical Path Forward

1. **Revise Story Scope:**
   - Update index entry to reflect REPA-008 completion (useAnnouncer done)
   - Focus scope on generic accessibility utilities only
   - Explicitly exclude domain-specific ARIA generators
   - Reduce estimate from 2 SP to 1 SP

2. **Verify REPA-008 Status:**
   - Confirm useAnnouncer migration is complete
   - Ensure no duplicate work with REPA-008
   - Document dependency relationship

3. **Define Clear Boundaries:**
   - Generic utils → `@repo/accessibility`
   - Domain-specific utils → stay in apps
   - Document patterns for future use

4. **Phase Implementation:**
   - Phase 1: Move focusRingClasses + tests (30 min)
   - Phase 2: Move keyboard label utils + tests (30 min)
   - Phase 3: Move ContrastRatioSchema + tests (15 min)
   - Phase 4: Update app imports (15 min)
   - Phase 5: Verify and document (30 min)

### Questions for Elaboration Agent

1. **Scope Confirmation:**
   - Should we move generic utilities only (recommended)?
   - Or attempt to generalize domain-specific functions (higher risk)?

2. **REPA-008 Dependency:**
   - Is useAnnouncer migration fully complete in REPA-008?
   - Should REPA-015 explicitly depend on REPA-008 completion?

3. **Documentation Needs:**
   - Should we add examples for domain-specific pattern creation?
   - Should we create a "How to Create ARIA Generators" guide?

4. **Future Stories:**
   - Should domain-specific utilities be consolidated in a separate story?
   - Is there value in creating `@repo/gallery/a11y` for gallery-specific ARIA?

### Non-Blocking Enhancements (Future)

1. **Generic Announcement Builders:**
   - Create flexible builder functions for common patterns
   - Document with examples for apps to extend

2. **Focus Management Utilities:**
   - Add `focusFirstError()` helper
   - Add `trapFocus()` utility for modals
   - Add `restoreFocus()` for cleanup

3. **ARIA Live Region Utilities:**
   - Add `createLiveRegion()` helper
   - Add priority level constants
   - Add debouncing utilities

4. **Keyboard Navigation Helpers:**
   - Add `isModifierKey()` utility
   - Add `normalizeKey()` for cross-browser compat
   - Add `getKeyCombo()` for chord detection

5. **Contrast Validation:**
   - Add runtime contrast checker
   - Add dev-mode warnings for insufficient contrast
   - Integrate with design system

6. **Screen Reader Testing Utilities:**
   - Add test helpers for announcement verification
   - Add mock screen reader for automated tests

## Files and Locations Reference

### Source Files (Current)

**Wishlist Gallery a11y.ts:**
```
/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/utils/a11y.ts
```
- 257 lines total
- ~50 lines of generic utilities
- ~200 lines of domain-specific functions
- Well-documented with JSDoc
- Comprehensive test coverage

**Test File:**
```
/Users/michaelmenard/Development/monorepo/apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts
```
- 257 lines of tests
- ~80 lines for generic utils
- ~170 lines for domain-specific tests

### Target Package (Accessibility)

**Package Root:**
```
/Users/michaelmenard/Development/monorepo/packages/core/accessibility/
```

**Proposed New Files:**
```
src/utils/
  focus-styles.ts
  keyboard-labels.ts
  aria-builders.ts
  contrast-validation.ts
  __tests__/
    focus-styles.test.ts
    keyboard-labels.test.ts
    aria-builders.test.ts
    contrast-validation.test.ts
```

**Export File:**
```
src/index.ts
```
- Add new utility exports
- Maintain existing hook exports

### Consumer Files (Update Imports)

**Confirmed Consumers:**
1. `/apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
2. `/apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`

**Potential Additional Consumers:**
- Search for `focusRingClasses` across codebase
- Search for `keyboardShortcutLabels` usage
- Found 4 total files using focusRing patterns

## Success Criteria

### Minimum Viable Completion

1. ✅ `focusRingClasses` moved to `@repo/accessibility/utils/focus-styles`
2. ✅ `keyboardShortcutLabels` and `getKeyboardShortcutLabel()` moved to `@repo/accessibility/utils/keyboard-labels`
3. ✅ `ContrastRatioSchema` moved to `@repo/accessibility/utils/contrast-validation`
4. ✅ Tests migrated and passing
5. ✅ App imports updated to use `@repo/accessibility`
6. ✅ Documentation added with usage examples
7. ✅ All quality gates pass

### Optional Completions

1. ⏸️ Generic announcement builders (if time permits)
2. ⏸️ Pattern documentation for domain-specific ARIA
3. ⏸️ Additional focus management utilities

## Story Metadata

**Original Index Entry:**
- Status: pending
- Depends On: none
- Estimate: (not specified, recommend 1 SP)

**Revised Recommendation:**
- Status: ready-to-work (after scope clarification)
- Depends On: REPA-008 (partially - useAnnouncer completion)
- Estimate: 1 SP (generic utils only) or 3 SP (full migration)
- Complexity: Low-Medium
- Risk: Low (generic utils) / Medium-High (full migration)

## Related Stories

**Completed:**
- WISH-2006: Wishlist Accessibility (original source of a11y.ts)
- REPA-008: Add Gallery Keyboard Hooks (already moved useAnnouncer)

**In Progress:**
- REPA-008: Add Gallery Keyboard Hooks (roving tab index, keyboard shortcuts to @repo/gallery)
- REPA-011: Standardize GalleryFilterBar (may use accessibility utils)

**Future:**
- REPA-007: Add SortableGallery Component (mentions accessibility support)
- REPA-010: Refactor app-inspiration-gallery (may add ARIA utilities)
- REPA-014: Create @repo/hooks Package (general hooks, not a11y-specific)

## Additional Context

### Project Guidelines Compliance

**Zod-First Types:**
- ✅ `ContrastRatioSchema` is Zod-based
- ✅ All new utilities should export schemas where applicable

**No Barrel Files:**
- ✅ Export from package index.ts is allowed (package entry point)
- ❌ Do not create utils/index.ts re-export files

**Testing Requirements:**
- ✅ Minimum 45% coverage globally
- ✅ Hook/utility tests should target ~95% coverage
- ✅ Migrate existing tests to maintain coverage

**Component Structure:**
- N/A - This story is utilities, not components

### Tech Stack Notes

**Tailwind CSS:**
- focusRingClasses uses Tailwind utilities
- Requires Tailwind to be configured in consuming apps
- Classes: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`

**WCAG 2.1 Compliance:**
- Focus indicators must meet 2:1 contrast ratio minimum
- Current implementation uses sky-500 (design system primary)
- ContrastRatioSchema validates AA standards (4.5:1 normal, 3:1 large)

**React 19:**
- All hooks use React 19 APIs
- No legacy class components
- Functional components only

---

## Elaboration Agent Instructions

When elaborating this story, please:

1. **Clarify Scope:**
   - Confirm approach: generic utilities only vs. full migration
   - Update story description in index to remove useAnnouncer (completed by REPA-008)
   - Set appropriate story point estimate

2. **Verify REPA-008:**
   - Check if useAnnouncer is fully complete and merged
   - Document any remaining work from REPA-008 that affects this story

3. **Define Acceptance Criteria:**
   - Create specific, testable ACs for each utility being moved
   - Include import path verification
   - Include test migration verification

4. **Address Risks:**
   - Plan for handling domain-specific functions (move or leave?)
   - Strategy for avoiding circular dependencies
   - Rollback plan if issues arise

5. **Create Implementation Plan:**
   - Step-by-step migration guide
   - Test migration strategy (extract vs. move)
   - Import update checklist

6. **Document Patterns:**
   - Add examples for creating domain-specific ARIA generators
   - Show how apps can extend generic utilities
   - Reference existing implementations as examples

---

**End of Story Seed**
