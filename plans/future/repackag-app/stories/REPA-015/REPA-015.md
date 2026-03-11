---
id: REPA-015
title: "Extract Generic A11y Utilities to @repo/accessibility"
status: uat
priority: P3
points: 1
epic: repackag-app
created_at: "2026-02-10"
updated_at: "2026-02-10"
elaborated_at: "2026-02-10"
experiment_variant: control
tags:
  - accessibility
  - utilities
  - refactor
  - repackaging
surfaces:
  - packages/core/accessibility
  - apps/web/app-wishlist-gallery
related_stories:
  - REPA-008
  - WISH-2006
predictions:
  split_risk: low
  review_cycles: 1-2
  token_cost_range: 80000-120000
---

# REPA-015: Extract Generic A11y Utilities to @repo/accessibility

## Context

The `app-wishlist-gallery` package contains a comprehensive accessibility utilities file (`src/utils/a11y.ts`, 257 lines) created by story WISH-2006. This file contains both generic accessibility utilities that could benefit all apps and domain-specific ARIA label generators specific to the wishlist domain.

**Current Reality:**
- Generic utilities (focusRingClasses, keyboard labels, contrast validation) are trapped in app-specific location
- Other apps cannot reuse these utilities without duplication
- @repo/accessibility package already exists (created/enhanced by REPA-008)
- useAnnouncer hook was already moved to @repo/accessibility by REPA-008 (no longer needs migration)

**Key Discovery from Seed Analysis:**
The original index entry for this story mentions "Add useAnnouncer (deduped from wishlist/inspiration)" - this work is ALREADY COMPLETE. REPA-008 successfully migrated useAnnouncer to @repo/accessibility. This story's scope is now refined to focus on the remaining generic utilities from a11y.ts.

**Opportunity:**
Extract generic accessibility utilities to @repo/accessibility, making them available to all apps while keeping domain-specific wishlist ARIA generators in the app where they belong.

---

## Goal

Enhance @repo/accessibility with generic accessibility utilities extracted from app-wishlist-gallery, providing reusable focus styling, keyboard label formatting, and WCAG contrast validation to all apps.

---

## Non-Goals

1. **Migrate Domain-Specific ARIA Generators** - Functions like generateItemAriaLabel(), generatePriorityChangeAnnouncement(), etc. (~200 LOC) reference WishlistItem types and contain wishlist-specific logic. These should remain in app-wishlist-gallery.

2. **Create Generic ARIA Builder Framework** - While this could be valuable, it adds complexity and is not required to achieve the core value of sharing generic utilities. Defer to future story if demand emerges.

3. **Migrate useAnnouncer Hook** - Already completed by REPA-008. This story does NOT need to migrate useAnnouncer.

4. **Refactor Existing Utilities** - Extract utilities as-is. Do not refactor, optimize, or enhance functionality beyond ensuring they work in the new location.

5. **Add New Accessibility Features** - Focus on migration only. New utilities, hooks, or components are out of scope.

---

## Scope

### Packages

**Modified:**
- `packages/core/accessibility/` - Add utils/ directory with new utilities
- `apps/web/app-wishlist-gallery/` - Update imports, remove migrated utilities from a11y.ts

**No New Packages Required**

### Files Created

**In @repo/accessibility:**
```
src/utils/
  focus-styles.ts                      ← NEW (export focusRingClasses)
  keyboard-labels.ts                   ← NEW (export keyboardShortcutLabels, getKeyboardShortcutLabel)
  contrast-validation.ts               ← NEW (export ContrastRatioSchema)
  __tests__/
    focus-styles.test.ts               ← NEW (~30 lines)
    keyboard-labels.test.ts            ← NEW (~40 lines)
    contrast-validation.test.ts        ← NEW (~50 lines)
```

**Modified:**
```
src/index.ts                           ← UPDATE (add utility exports)
```

### Files Modified

**In app-wishlist-gallery:**
```
src/utils/a11y.ts                      ← REMOVE migrated utilities (keep domain-specific)
src/utils/__tests__/a11y.test.ts       ← REMOVE tests for migrated utilities
src/components/GotItModal/index.tsx    ← UPDATE import to @repo/accessibility
src/components/WishlistCard/index.tsx  ← UPDATE import to @repo/accessibility
```

### Utilities to Migrate

| Utility | Source File | Lines | Target File | Notes |
|---------|-------------|-------|-------------|-------|
| focusRingClasses | a11y.ts | ~5 | focus-styles.ts | Tailwind focus ring classes |
| keyboardShortcutLabels | a11y.ts | ~20 | keyboard-labels.ts | Key name mappings |
| getKeyboardShortcutLabel() | a11y.ts | ~10 | keyboard-labels.ts | Format key names |
| ContrastRatioSchema | a11y.ts | ~15 | contrast-validation.ts | WCAG validation |

**Total Lines Migrating:** ~50 LOC + ~80 LOC tests

### Utilities to Keep in App

**Domain-Specific Functions (NOT migrating):**
- generateItemAriaLabel() - References WishlistItem type
- generatePriorityChangeAnnouncement() - Wishlist-specific
- generateDeleteAnnouncement() - Wishlist-specific
- generateAddAnnouncement() - Wishlist-specific
- generateFilterAnnouncement() - Gallery-specific
- generateEmptyStateAnnouncement() - Wishlist-specific
- generateModalOpenAnnouncement() - Wishlist-specific
- generateDragAnnouncement() - Could be generic but currently wishlist-focused

**Total Lines Staying in App:** ~200 LOC + ~170 LOC tests

---

## Acceptance Criteria

### AC-1: focusRingClasses Utility Migrated
**Given** the focus styling utility exists in app-wishlist-gallery/src/utils/a11y.ts
**When** extracting to @repo/accessibility
**Then**:
- New file created at `packages/core/accessibility/src/utils/focus-styles.ts`
- Exports `focusRingClasses` constant with same value as source
- JSDoc documentation added with usage example
- Imported and exported from `packages/core/accessibility/src/index.ts`
- Test file created at `src/utils/__tests__/focus-styles.test.ts`
- Original export removed from app-wishlist-gallery/src/utils/a11y.ts

**Verification:**
```bash
# Package exports focusRingClasses
pnpm --filter=@repo/accessibility exec tsc --noEmit
grep "focusRingClasses" packages/core/accessibility/src/index.ts

# Test passes
pnpm test --filter=@repo/accessibility src/utils/__tests__/focus-styles.test.ts
```

### AC-2: Keyboard Label Utilities Migrated
**Given** keyboard shortcut utilities exist in app-wishlist-gallery/src/utils/a11y.ts
**When** extracting to @repo/accessibility
**Then**:
- New file created at `packages/core/accessibility/src/utils/keyboard-labels.ts`
- Exports `keyboardShortcutLabels` object and `getKeyboardShortcutLabel()` function
- JSDoc documentation added for both exports
- Imported and exported from `packages/core/accessibility/src/index.ts`
- Test file created at `src/utils/__tests__/keyboard-labels.test.ts`
- Tests verify key mappings (arrows, Delete, Escape, Enter, etc.)
- Tests verify label formatting (uppercase single chars, special key names)
- Original exports removed from app-wishlist-gallery/src/utils/a11y.ts

**Verification:**
```bash
# Package exports keyboard utilities
grep "keyboardShortcutLabels\|getKeyboardShortcutLabel" packages/core/accessibility/src/index.ts

# Tests pass
pnpm test --filter=@repo/accessibility src/utils/__tests__/keyboard-labels.test.ts
```

### AC-3: Contrast Validation Schema Migrated
**Given** ContrastRatioSchema exists in app-wishlist-gallery/src/utils/a11y.ts
**When** extracting to @repo/accessibility
**Then**:
- New file created at `packages/core/accessibility/src/utils/contrast-validation.ts`
- Exports `ContrastRatioSchema` Zod schema
- JSDoc documentation added referencing WCAG AA standards
- Imported and exported from `packages/core/accessibility/src/index.ts`
- Test file created at `src/utils/__tests__/contrast-validation.test.ts`
- Tests verify WCAG AA compliance (4.5:1 normal text, 3:1 large text)
- Original export removed from app-wishlist-gallery/src/utils/a11y.ts

**Verification:**
```bash
# Package exports ContrastRatioSchema
grep "ContrastRatioSchema" packages/core/accessibility/src/index.ts

# Tests pass (validates WCAG ratios)
pnpm test --filter=@repo/accessibility src/utils/__tests__/contrast-validation.test.ts
```

### AC-4: App Imports Updated
**Given** components in app-wishlist-gallery import from local utils/a11y
**When** utilities are migrated to @repo/accessibility
**Then**:
- GotItModal/index.tsx imports focusRingClasses from @repo/accessibility
- WishlistCard/index.tsx imports focusRingClasses from @repo/accessibility
- All imports resolve correctly (no TypeScript errors)
- App builds successfully: `pnpm build --filter=app-wishlist-gallery`
- App tests pass: `pnpm test --filter=app-wishlist-gallery`

**Verification:**
```bash
# Check imports updated
grep "@repo/accessibility" apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx
grep "@repo/accessibility" apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx

# App builds and tests pass
pnpm build --filter=app-wishlist-gallery
pnpm test --filter=app-wishlist-gallery
```

### AC-5: Tests Migrated with Utilities
**Given** utilities have tests in app-wishlist-gallery/src/utils/__tests__/a11y.test.ts
**When** migrating utilities to @repo/accessibility
**Then**:
- Tests for focusRingClasses migrated to focus-styles.test.ts
- Tests for keyboard utilities migrated to keyboard-labels.test.ts
- Tests for ContrastRatioSchema migrated to contrast-validation.test.ts
- All migrated tests pass in new location
- Domain-specific tests remain in app-wishlist-gallery
- Total test LOC migrated: ~80 lines
- Test coverage maintained at 45% minimum globally

**Verification:**
```bash
# Package tests pass
pnpm test --filter=@repo/accessibility

# App tests still pass (domain-specific tests remain)
pnpm test --filter=app-wishlist-gallery

# Coverage maintained
pnpm test --filter=@repo/accessibility --coverage
```

### AC-6: Domain-Specific Functions Remain in App
**Given** a11y.ts contains domain-specific ARIA generators
**When** extracting generic utilities
**Then**:
- All generate*Announcement functions remain in app-wishlist-gallery/src/utils/a11y.ts
- Tests for domain-specific functions remain in app-wishlist-gallery
- No references to WishlistItem type in @repo/accessibility
- No dependency from @repo/accessibility to @repo/api-client
- app-wishlist-gallery/src/utils/a11y.ts still exists (not deleted, only trimmed)

**Verification:**
```bash
# Domain functions still in app
grep "generateItemAriaLabel\|generatePriorityChangeAnnouncement" apps/web/app-wishlist-gallery/src/utils/a11y.ts

# No api-client dependency in accessibility package
! grep "@repo/api-client" packages/core/accessibility/package.json
! grep "@repo/api-client" packages/core/accessibility/src/**/*.ts
```

### AC-7: Package Builds and Quality Gates Pass
**Given** utilities are migrated and imports updated
**When** running build and quality checks
**Then**:
- Package builds: `pnpm build --filter=@repo/accessibility`
- TypeScript compiles: `pnpm check-types --filter=@repo/accessibility`
- Linting passes: `pnpm lint --filter=@repo/accessibility`
- All tests pass: `pnpm test:all`
- No circular dependencies introduced
- No console errors or warnings

**Verification:**
```bash
pnpm build --filter=@repo/accessibility
pnpm check-types:all
pnpm lint:all
pnpm test:all
```

---

## Reuse Plan

### Existing Package Reuse

**Package:** `@repo/accessibility` (already exists from REPA-008)

**Reusing:**
- Package structure and configuration (TypeScript, ESLint, Vitest)
- Test setup in `src/test/setup.ts`
- Export pattern in `src/index.ts`
- Migration pattern (proven with useAnnouncer in REPA-008)

**No New Package Required:** Extending existing package only.

### Source Code Reuse

**Source File:** `apps/web/app-wishlist-gallery/src/utils/a11y.ts` (257 lines)

**Extraction Strategy:**
- Extract ~50 lines of generic utilities (as-is, no refactoring)
- Extract ~80 lines of corresponding tests
- Keep ~200 lines of domain-specific functions in app
- Maintain JSDoc comments and WCAG references

### Pattern Reuse from REPA-008

**Story:** REPA-008: Add Gallery Keyboard Hooks
**Completed Work:** useAnnouncer hook migrated to @repo/accessibility

**Reusing Pattern:**
1. Create utility files in src/utils/ (or src/hooks/ for hooks)
2. Migrate tests to corresponding __tests__/ directory
3. Export from package index.ts
4. Update app imports
5. Remove from app source

**Proven Success:** useAnnouncer migration completed without issues.

---

## Architecture Notes

### Package Structure After Migration

```
packages/core/accessibility/
  src/
    components/
      KeyboardDragDropArea/          ← Existing
    hooks/
      useKeyboardDragAndDrop.ts      ← Existing
      useAnnouncer.tsx               ← From REPA-008
      __tests__/
        useAnnouncer.test.tsx        ← From REPA-008
    utils/                           ← NEW
      focus-styles.ts                ← NEW (this story)
      keyboard-labels.ts             ← NEW (this story)
      contrast-validation.ts         ← NEW (this story)
      __tests__/
        focus-styles.test.ts         ← NEW (this story)
        keyboard-labels.test.ts      ← NEW (this story)
        contrast-validation.test.ts  ← NEW (this story)
    __tests__/                       ← Existing
    test/setup.ts                    ← Existing
    index.ts                         ← UPDATE (add util exports)
  package.json                       ← No changes needed
```

### Dependency Architecture

**Critical Constraint:** @repo/accessibility MUST NOT depend on @repo/api-client

**Verification:**
- Generic utilities have no type dependencies on domain models
- focusRingClasses is a string constant (no types)
- keyboardShortcutLabels is a plain object (built-in types)
- getKeyboardShortcutLabel() uses string input/output (no types)
- ContrastRatioSchema uses Zod primitives only (no domain types)

**Domain-Specific Exclusion:**
Domain functions that reference WishlistItem or other api-client types stay in app:
- generateItemAriaLabel(item: WishlistItem, ...) ← References WishlistItem
- Other generate*() functions ← Wishlist-specific logic

### Export Strategy

```typescript
// packages/core/accessibility/src/index.ts

// Existing exports (from REPA-008 and earlier)
export { useKeyboardDragAndDrop } from './hooks/useKeyboardDragAndDrop'
export type { KeyboardDragAndDropOptions, DragPosition } from './hooks/useKeyboardDragAndDrop'
export { KeyboardDragDropArea } from './components/KeyboardDragDropArea'
export type { KeyboardDragDropAreaProps } from './components/KeyboardDragDropArea'
export { useAnnouncer, Announcer } from './hooks/useAnnouncer'
export type { AnnouncerProps, UseAnnouncerReturn } from './hooks/useAnnouncer'

// New exports (this story)
export { focusRingClasses } from './utils/focus-styles'
export { keyboardShortcutLabels, getKeyboardShortcutLabel } from './utils/keyboard-labels'
export { ContrastRatioSchema } from './utils/contrast-validation'
```

### Usage Examples

**Focus Styling:**
```typescript
import { focusRingClasses } from '@repo/accessibility'

// In component
<button className={`${focusRingClasses} px-4 py-2`}>
  Click Me
</button>
```

**Keyboard Labels:**
```typescript
import { getKeyboardShortcutLabel } from '@repo/accessibility'

// Format key for display
const label = getKeyboardShortcutLabel('ArrowUp') // "↑"
const deleteLabel = getKeyboardShortcutLabel('Delete') // "Del"
```

**Contrast Validation:**
```typescript
import { ContrastRatioSchema } from '@repo/accessibility'

// Validate WCAG AA compliance
const ratio = ContrastRatioSchema.parse({ normal: 4.5 }) // ✅ Valid
const invalid = ContrastRatioSchema.parse({ normal: 3.0 }) // ❌ Throws error
```

---

## Infrastructure Notes

### Build Configuration

**No Changes Required:**
- TypeScript, ESLint, Vitest already configured in @repo/accessibility
- No new dependencies needed (Zod already in package)
- Existing test setup (src/test/setup.ts) works for new utils

### Test Infrastructure

**Test Framework:** Vitest (already configured)

**Test Setup:** `packages/core/accessibility/src/test/setup.ts` (already exists)

**Coverage Targets:**
- Global minimum: 45% (maintained)
- Utility functions: 95%+ (new utilities are simple, high coverage achievable)

### Quality Gates

**Pre-Merge Checklist:**
- [ ] All package tests pass: `pnpm test --filter=@repo/accessibility`
- [ ] All app tests pass: `pnpm test --filter=app-wishlist-gallery`
- [ ] TypeScript compiles: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] Coverage maintained at 45% minimum
- [ ] No circular dependencies
- [ ] Manual testing: Focus rings visible, keyboard labels work

---

## Test Plan

### Unit Tests (Package Level)

**New Test Files:**

1. **focus-styles.test.ts** (~30 lines)
   - Verify focusRingClasses contains required Tailwind classes
   - Verify classes follow WCAG 2.1 focus indicator guidelines
   - Verify classes work with dark mode

2. **keyboard-labels.test.ts** (~40 lines)
   - Verify keyboardShortcutLabels has mappings for common keys
   - Verify getKeyboardShortcutLabel returns correct labels
   - Verify unmapped keys default to uppercase
   - Verify special keys have human-readable names

3. **contrast-validation.test.ts** (~50 lines)
   - Verify ContrastRatioSchema enforces WCAG AA ratios
   - Verify normal text requires 4.5:1 minimum
   - Verify large text requires 3:1 minimum
   - Verify invalid ratios are rejected

**Test Execution:**
```bash
pnpm test --filter=@repo/accessibility
pnpm test --filter=@repo/accessibility --coverage
```

### Integration Tests (App Level)

**Existing Tests to Update:**
- GotItModal/__tests__/index.test.tsx - Update import to @repo/accessibility
- WishlistCard/__tests__/index.test.tsx - Update import to @repo/accessibility

**Verification:**
```bash
pnpm test --filter=app-wishlist-gallery
```

**Expected:** All existing tests pass with no logic changes, only import path updates.

### Manual Testing Checklist

**Focus Styling:**
- [ ] Tab through wishlist gallery → focus rings visible on all interactive elements
- [ ] Focus rings meet WCAG 2.1 contrast requirements (manual check with dev tools)
- [ ] Dark mode → focus rings still visible

**Keyboard Labels (if applicable):**
- [ ] Keyboard shortcuts help displays correct labels (↑, ↓, Del, Esc, Enter)
- [ ] Special keys show human-readable names

**Build and Runtime:**
- [ ] Package builds: `pnpm build --filter=@repo/accessibility`
- [ ] App builds: `pnpm build --filter=app-wishlist-gallery`
- [ ] App runs without errors: `pnpm dev --filter=app-wishlist-gallery`
- [ ] No console errors related to accessibility imports

### Rollback Plan

If issues detected:
1. Revert package changes (remove new utility files)
2. Revert app import changes (restore local utils/a11y imports)
3. Verify app tests pass with original imports
4. Document blocker and defer to follow-up story

---

## UI/UX Notes

### Focus Indicator Standards

**WCAG 2.1 Requirement:**
- Focus indicators must have 2:1 contrast ratio minimum with background
- Focus indicators must be clearly visible for keyboard navigation

**Current Implementation:**
```typescript
// focusRingClasses value
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
```

**Design System Compliance:**
- Uses `ring-sky-500` from design system primary color palette
- Sky-500 provides good contrast in both light and dark modes
- 2px ring width (`ring-2`) meets visibility requirements
- 2px offset (`ring-offset-2`) provides separation from element

### Keyboard Shortcut Display

**Human-Readable Labels:**
```typescript
keyboardShortcutLabels = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Delete: 'Del',
  Escape: 'Esc',
  Enter: '↵',
  // ... etc.
}
```

**Usage:** Display keyboard shortcuts in help text, tooltips, or accessibility announcements with user-friendly labels.

### No Visual Changes Expected

**Impact:** This story extracts utilities without changing their behavior or visual output.

**Verification:**
- Focus rings should look identical before and after migration
- Keyboard labels (if displayed) should format identically
- No CSS or styling changes

---

## Reality Baseline

### Existing Code State

**Source File:**
- `apps/web/app-wishlist-gallery/src/utils/a11y.ts` (257 lines)
- Created by: WISH-2006: Wishlist Accessibility
- Contains: Generic utilities (~50 LOC) + Domain-specific ARIA generators (~200 LOC)

**Test File:**
- `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts` (257 lines)
- Coverage: Comprehensive tests for all utilities
- Split: ~80 LOC for generic, ~170 LOC for domain-specific

**Consumer Files:**
- `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` (imports focusRingClasses)
- `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx` (imports focusRingClasses)

**Target Package:**
- `packages/core/accessibility/` (exists, created by earlier stories)
- Enhanced by REPA-008 (useAnnouncer migration complete)
- Ready for utils/ directory addition

### Dependencies

**Story Dependencies:**
- None explicitly blocking
- REPA-008 (Add Gallery Keyboard Hooks) - useAnnouncer already complete (no conflict)

**Package Dependencies:**
- No new dependencies required
- Zod already in @repo/accessibility (for ContrastRatioSchema)
- React already in @repo/accessibility (not needed for utils, but present)

### Active Work Coordination

**REPA-008:** In Progress (keyboard hooks to @repo/gallery, useAnnouncer to @repo/accessibility)
- useAnnouncer migration complete (no overlap with REPA-015)
- No merge conflicts expected (different file paths)

**REPA-011:** In Progress (GalleryFilterBar standardization)
- May use focusRingClasses after REPA-015 completes
- Can update import after REPA-015 merges
- No blocking dependency

---

## Risk Assessment

### Low Risk Factors

1. **Small Scope** - Only ~50 LOC + ~80 LOC tests moving
2. **No New Dependencies** - Uses existing Zod in package
3. **Proven Pattern** - REPA-008 already migrated hooks successfully
4. **Clear Boundaries** - Generic vs. domain-specific well-defined
5. **High Test Coverage** - Source code has comprehensive tests (257 lines)
6. **No Breaking Changes** - Utilities used as-is in new location

### Potential Risks (Mitigatable)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Import path changes break apps | Low | Update all imports before deleting from source |
| Tests fail in new location | Low | Migrate tests with utilities, verify locally |
| Package build fails | Low | Run build before committing |
| Coverage drops below 45% | Low | Migrate tests maintain coverage |
| Merge conflict with REPA-008 | Low | REPA-008 useAnnouncer already complete |

### Risk Predictions (WKFL-007)

**Split Risk:** LOW (0.15)
- Small, well-defined scope
- No multi-package coordination
- Clear migration path

**Review Cycles:** 1-2
- Straightforward implementation (likely 1 cycle)
- Thorough verification needed (may require 2 cycles)

**Token Cost:** 80,000 - 120,000 (full lifecycle)
- Small code changes (~50 LOC + tests)
- Clear implementation path
- Minimal exploration needed

---

## Implementation Phases

### Phase 1: Create Utilities (30 min)

1. Create `packages/core/accessibility/src/utils/` directory
2. Create `focus-styles.ts`:
   - Extract focusRingClasses constant
   - Add JSDoc with usage example
3. Create `keyboard-labels.ts`:
   - Extract keyboardShortcutLabels object
   - Extract getKeyboardShortcutLabel() function
   - Add JSDoc for both
4. Create `contrast-validation.ts`:
   - Extract ContrastRatioSchema
   - Add JSDoc referencing WCAG AA

### Phase 2: Migrate Tests (30 min)

1. Create `packages/core/accessibility/src/utils/__tests__/` directory
2. Extract tests from `app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`:
   - focusRingClasses tests → `focus-styles.test.ts`
   - Keyboard utility tests → `keyboard-labels.test.ts`
   - ContrastRatioSchema tests → `contrast-validation.test.ts`
3. Run tests: `pnpm test --filter=@repo/accessibility`
4. Verify all tests pass

### Phase 3: Update Exports (10 min)

1. Update `packages/core/accessibility/src/index.ts`:
   ```typescript
   export { focusRingClasses } from './utils/focus-styles'
   export { keyboardShortcutLabels, getKeyboardShortcutLabel } from './utils/keyboard-labels'
   export { ContrastRatioSchema } from './utils/contrast-validation'
   ```
2. Build package: `pnpm build --filter=@repo/accessibility`
3. Verify exports: Check TypeScript compilation

### Phase 4: Update App Imports (20 min)

1. Update `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`:
   ```diff
   - import { focusRingClasses } from '../../utils/a11y'
   + import { focusRingClasses } from '@repo/accessibility'
   ```

2. Update `apps/web/app-wishlist-gallery/src/components/WishlistCard/index.tsx`:
   ```diff
   - import { focusRingClasses } from '../../utils/a11y'
   + import { focusRingClasses } from '@repo/accessibility'
   ```

3. Build app: `pnpm build --filter=app-wishlist-gallery`
4. Run app tests: `pnpm test --filter=app-wishlist-gallery`

### Phase 5: Cleanup (10 min)

1. Remove migrated utilities from `apps/web/app-wishlist-gallery/src/utils/a11y.ts`
   - Delete focusRingClasses
   - Delete keyboardShortcutLabels
   - Delete getKeyboardShortcutLabel()
   - Delete ContrastRatioSchema
   - Keep all generate*Announcement functions

2. Remove migrated tests from `apps/web/app-wishlist-gallery/src/utils/__tests__/a11y.test.ts`
   - Keep tests for domain-specific functions

3. Final verification:
   ```bash
   pnpm check-types:all
   pnpm lint:all
   pnpm test:all
   ```

---

## Success Criteria

- ✅ Generic utilities extracted to @repo/accessibility (focusRingClasses, keyboard labels, ContrastRatioSchema)
- ✅ All package tests pass with 95%+ coverage
- ✅ All app tests pass with updated imports
- ✅ No breaking changes in app functionality
- ✅ TypeScript compilation succeeds
- ✅ Linting passes
- ✅ Focus styling works identically to before migration
- ✅ No circular dependencies introduced
- ✅ Domain-specific functions remain in app (clean separation maintained)
- ✅ Quality gates pass (build, lint, type-check, tests)

---

## Related Documentation

**WCAG 2.1 Standards:**
- Focus Visible (2.4.7): https://www.w3.org/WAI/WCAG21/Understanding/focus-visible
- Contrast (Minimum) (1.4.3): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum

**Package Architecture:**
- Monorepo structure: `/docs/tech-stack/monorepo.md`
- Accessibility strategy: `/docs/testing/overview.md`

**Related Stories:**
- REPA-008: Add Gallery Keyboard Hooks (useAnnouncer migration)
- WISH-2006: Wishlist Accessibility (original source of a11y.ts)

---

**Story Status:** Ready to Work
**Next Steps:** Begin implementation following phased approach above
**Estimated Duration:** 1.5-2 hours active development

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | Status |
|---|---------|-----------|--------|
| None | All MVP-critical scope items verified | Story is implementation-ready | Complete |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | getKeyboardShortcutLabel() - no current usage pattern | future-opportunities | Documented |
| 2 | ContrastRatioSchema - no active usage in codebase | future-opportunities | Documented |
| 3 | keyboardShortcutLabels incomplete (missing modifier/function/media keys) | future-opportunities | Documented |
| 4 | focusRingClasses hardcodes sky-500 color | future-opportunities | Documented |
| 5 | Generic ARIA Label Builder Framework opportunity | enhancement-opportunities | Documented |
| 6 | Keyboard Shortcut Help Component opportunity | enhancement-opportunities | Documented |
| 7 | Screen Reader Text Utilities opportunity | enhancement-opportunities | Documented |
| 8 | Keyboard Event Utilities opportunity | enhancement-opportunities | Documented |
| 9 | ARIA Live Region Hook opportunity | enhancement-opportunities | Documented |
| 10 | Contrast Validation CLI Tool opportunity | enhancement-opportunities | Documented |

### Summary

- **ACs added**: 0 (story already complete)
- **KB entries logged**: 10 (for future work queue)
- **Audit checks passed**: 8 of 8
- **Mode**: autonomous
- **Verdict**: CONDITIONAL PASS (2 low-severity documentation issues, non-blocking)

**Recommendation:** Proceed with implementation. Address low-severity documentation issues before starting work.
