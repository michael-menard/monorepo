---
id: REPA-008
title: "Add Gallery Keyboard Hooks"
status: in-progress
priority: P1
epic: REPACKAG
phase: "Phase 2 - Gallery Enhancement"
estimate: 2
dependencies: []
experiment_variant: "control"
created_at: "2026-02-10"
updated_at: "2026-02-10"
---

# REPA-008: Add Gallery Keyboard Hooks

## Context

Both `app-wishlist-gallery` and `app-inspiration-gallery` maintain duplicate implementations of keyboard navigation hooks, resulting in ~1,420 lines of duplicated code across the codebase. This creates maintenance burden, inconsistent behavior, and violates DRY principles.

**Current State:**
- `useRovingTabIndex`: EXACT duplicate in both galleries (363 lines wishlist, 325 lines inspiration), only difference is aria-label
- `useAnnouncer`: EXACT duplicate in both galleries (180 lines wishlist, 154 lines inspiration), functionally identical
- `useKeyboardShortcuts` (wishlist): Generic shortcut manager (212 lines)
- `useGalleryKeyboard` (inspiration): Gallery-specific shortcuts (186 lines)

**Established Patterns:**
- `@repo/gallery` package exists at `packages/core/gallery/` with hooks directory
- `@repo/accessibility` package exists at `packages/core/accessibility/` with hooks directory
- Both packages already export hooks via barrel files
- Full test suites exist in wishlist gallery for existing hooks

**Protected Features:**
- Existing keyboard navigation behavior in both galleries
- WCAG 2.1 compliance (roving tabindex pattern, screen reader support)
- Test coverage must remain at 45% minimum

## Goal

Consolidate keyboard navigation hooks into shared packages (`@repo/gallery` and `@repo/accessibility`), eliminating ~470 lines of duplicate code while establishing a single source of truth for keyboard accessibility across all gallery apps.

## Non-Goals

- Changing keyboard navigation behavior in existing apps
- Refactoring gallery components (covered in REPA-010)
- Creating keyboard shortcuts help panel (future: REPA-011)
- Implementing focus trap utilities (future enhancement)
- Modifying @repo/app-component-library (not in scope)

## Scope

### Packages Modified
- `packages/core/gallery/` - Add keyboard hooks
- `packages/core/accessibility/` - Add useAnnouncer hook

### Apps Modified
- `apps/web/app-wishlist-gallery/` - Update imports, remove duplicate hooks
- `apps/web/app-inspiration-gallery/` - Update imports, remove duplicate hooks

### Hooks to Move/Create

**Move to @repo/gallery:**
- `useRovingTabIndex` (from both apps, consolidate to one)
- `useKeyboardShortcuts` (from wishlist)
- `useGalleryKeyboard` (new implementation combining both approaches)
- `useGallerySelection` (new, optional for this story)

**Move to @repo/accessibility:**
- `useAnnouncer` (from both apps, consolidate to one)

### Files Created
```
packages/core/gallery/src/hooks/
  useRovingTabIndex.ts
  useKeyboardShortcuts.ts
  useGalleryKeyboard.ts
  useGallerySelection.ts
  __tests__/
    useRovingTabIndex.test.ts
    useKeyboardShortcuts.test.ts
    useGalleryKeyboard.test.ts
    useGallerySelection.test.ts

packages/core/accessibility/src/hooks/
  useAnnouncer.tsx
  __tests__/
    useAnnouncer.test.tsx
```

### Files Deleted
```
apps/web/app-wishlist-gallery/src/hooks/
  useRovingTabIndex.ts
  useAnnouncer.tsx
  useKeyboardShortcuts.ts
  __tests__/
    useRovingTabIndex.test.tsx
    useAnnouncer.test.tsx
    useKeyboardShortcuts.test.tsx

apps/web/app-inspiration-gallery/src/hooks/
  useRovingTabIndex.ts
  useAnnouncer.tsx
  useGalleryKeyboard.ts
  __tests__/
    useGalleryKeyboard.test.ts
```

## Acceptance Criteria

### AC1: useRovingTabIndex in @repo/gallery
- [ ] Hook exists at `packages/core/gallery/src/hooks/useRovingTabIndex.ts`
- [ ] Accepts `ariaLabel` as optional parameter (default: 'Gallery items')
- [ ] Supports automatic column detection via ResizeObserver
- [ ] Supports manual column configuration
- [ ] Supports horizontal/vertical wrapping options
- [ ] Provides `getItemProps` and `containerProps` for easy integration
- [ ] All tests migrated to `packages/core/gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`
- [ ] Tests verify tabIndex management, arrow navigation, wrapping behavior, bounds checking
- [ ] Exported from `packages/core/gallery/src/index.ts`
- [ ] Package builds successfully: `pnpm build --filter=@repo/gallery`

### AC2: useAnnouncer in @repo/accessibility
- [ ] Hook and component exist at `packages/core/accessibility/src/hooks/useAnnouncer.tsx`
- [ ] Supports 'polite' and 'assertive' priority levels
- [ ] Implements auto-clear mechanism with configurable delay
- [ ] Prevents duplicate announcements
- [ ] Exports both hook and `Announcer` component
- [ ] All tests migrated to `packages/core/accessibility/src/hooks/__tests__/useAnnouncer.test.tsx`
- [ ] Tests verify announcements, priorities, clear delay, cleanup
- [ ] Exported from `packages/core/accessibility/src/index.ts`
- [ ] Package builds successfully: `pnpm build --filter=@repo/accessibility`

### AC3: useKeyboardShortcuts in @repo/gallery
- [ ] Hook exists at `packages/core/gallery/src/hooks/useKeyboardShortcuts.ts`
- [ ] Accepts array of shortcut objects with key/handler/description
- [ ] Container-scoped event listeners only
- [ ] Ignores shortcuts when focus in INPUT/TEXTAREA/contentEditable
- [ ] Case-insensitive letter keys
- [ ] Key normalization (Backspace → Delete, Esc → Escape)
- [ ] Configurable preventDefault and stopPropagation
- [ ] `getShortcutHints()` helper function for help text generation
- [ ] All tests migrated to `packages/core/gallery/src/hooks/__tests__/useKeyboardShortcuts.test.ts`
- [ ] Exported from `packages/core/gallery/src/index.ts`

### AC4: useGalleryKeyboard in @repo/gallery
- [ ] Hook exists at `packages/core/gallery/src/hooks/useGalleryKeyboard.ts`
- [ ] Built on top of `useKeyboardShortcuts` primitive
- [ ] Accepts options object with handler callbacks
- [ ] Supports standard gallery shortcuts (Escape, Delete, Enter)
- [ ] Supports modifier keys (Ctrl/Cmd+A for select all)
- [ ] Supports custom action shortcuts (a, m, e, u, n)
- [ ] Returns shortcuts array for help UI
- [ ] Container scoping via optional `containerRef`
- [ ] Enable/disable via `enabled` option
- [ ] Tests at `packages/core/gallery/src/hooks/__tests__/useGalleryKeyboard.test.ts`
- [ ] Tests verify basic shortcuts, modifiers, callbacks, shortcuts array
- [ ] Exported from `packages/core/gallery/src/index.ts`

### AC5: useGallerySelection in @repo/gallery (OPTIONAL)
- [ ] Hook exists at `packages/core/gallery/src/hooks/useGallerySelection.ts`
- [ ] Supports single/multi-select modes
- [ ] Provides `toggleSelection`, `selectAll`, `clearSelection` methods
- [ ] Supports range selection (Shift+click pattern)
- [ ] Returns `selectedIds` Set and helper methods
- [ ] Tests at `packages/core/gallery/src/hooks/__tests__/useGallerySelection.test.ts`
- [ ] Tests verify single/multi modes, range selection, tracking
- [ ] Exported from `packages/core/gallery/src/index.ts`

### AC6: Wishlist Gallery Integration
- [ ] Imports updated to use `@repo/gallery` and `@repo/accessibility`
- [ ] `ariaLabel: 'Wishlist items'` passed to useRovingTabIndex
- [ ] Keyboard navigation works correctly (manual verification)
- [ ] Screen reader announcements work (manual verification)
- [ ] All app tests pass: `pnpm test --filter=app-wishlist-gallery`
- [ ] App runs without errors: `pnpm dev --filter=app-wishlist-gallery`
- [ ] Old hook files deleted from `apps/web/app-wishlist-gallery/src/hooks/`

### AC7: Inspiration Gallery Integration
- [ ] Imports updated to use `@repo/gallery` and `@repo/accessibility`
- [ ] `ariaLabel: 'Inspiration items'` passed to useRovingTabIndex
- [ ] Keyboard navigation works correctly (manual verification)
- [ ] Screen reader announcements work (manual verification)
- [ ] All app tests pass: `pnpm test --filter=app-inspiration-gallery`
- [ ] App runs without errors: `pnpm dev --filter=app-inspiration-gallery`
- [ ] Old hook files deleted from `apps/web/app-inspiration-gallery/src/hooks/`

### AC8: Quality Gates
- [ ] All tests pass: `pnpm test`
- [ ] All packages build: `pnpm build`
- [ ] No TypeScript errors: `pnpm check-types:all`
- [ ] No linting errors: `pnpm lint:all`
- [ ] Test coverage maintained at minimum 45%
- [ ] No circular dependencies introduced

## Reuse Plan

### Existing Implementations to Consolidate

**useRovingTabIndex (EXACT DUPLICATE):**
- Source: `apps/web/app-wishlist-gallery/src/hooks/useRovingTabIndex.ts` (363 lines, better docs)
- Duplicate: `apps/web/app-inspiration-gallery/src/hooks/useRovingTabIndex.ts` (325 lines)
- Action: Move wishlist version, add `ariaLabel` parameter
- Tests: Move from `apps/web/app-wishlist-gallery/src/hooks/__tests__/useRovingTabIndex.test.tsx`

**useAnnouncer (EXACT DUPLICATE):**
- Source: `apps/web/app-wishlist-gallery/src/hooks/useAnnouncer.tsx` (180 lines, better docs)
- Duplicate: `apps/web/app-inspiration-gallery/src/hooks/useAnnouncer.tsx` (154 lines)
- Action: Move wishlist version unchanged
- Tests: Move from `apps/web/app-wishlist-gallery/src/hooks/__tests__/useAnnouncer.test.tsx`

**useKeyboardShortcuts (UNIQUE):**
- Source: `apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts` (212 lines)
- Action: Move unchanged (generic primitive)
- Tests: Move from `apps/web/app-wishlist-gallery/src/hooks/__tests__/useKeyboardShortcuts.test.tsx`

**useGalleryKeyboard (DIVERGENT):**
- Source: `apps/web/app-inspiration-gallery/src/hooks/useGalleryKeyboard.ts` (186 lines)
- Action: Create NEW implementation built on useKeyboardShortcuts
- Combine best of both approaches (generic + opinionated)

### Existing Packages to Extend

**@repo/gallery:**
- Location: `packages/core/gallery/`
- Has: `hooks/` directory already exists
- Has: Barrel export at `src/index.ts`
- Add: 4 new hooks (useRovingTabIndex, useKeyboardShortcuts, useGalleryKeyboard, useGallerySelection)

**@repo/accessibility:**
- Location: `packages/core/accessibility/`
- Has: `hooks/` directory already exists
- Has: Barrel export at `src/index.ts`
- Add: 1 new hook (useAnnouncer)

## Architecture Notes

### Hook Architecture

**Layered Approach:**
1. **Primitives** (generic, reusable):
   - `useKeyboardShortcuts` - generic shortcut manager
   - `useRovingTabIndex` - WAI-ARIA roving tabindex pattern
   - `useAnnouncer` - screen reader announcements

2. **Opinionated Wrappers** (gallery-specific):
   - `useGalleryKeyboard` - built on useKeyboardShortcuts with gallery-standard shortcuts
   - `useGallerySelection` - multi-select logic for galleries

### useGalleryKeyboard Implementation Strategy

```typescript
// Built on primitive
export function useGalleryKeyboard(
  options: UseGalleryKeyboardOptions
): UseGalleryKeyboardReturn {
  const shortcuts: KeyboardShortcut[] = []

  // Build shortcuts from options
  if (options.onEscape) {
    shortcuts.push({ key: 'Escape', handler: options.onEscape, description: 'Clear selection' })
  }
  if (options.onDelete) {
    shortcuts.push({ key: 'Delete', handler: options.onDelete, description: 'Delete selected' })
  }
  // ... more shortcuts

  // Delegate to primitive
  useKeyboardShortcuts(shortcuts, options.containerRef, { enabled: options.enabled })

  // Return help hints
  return { shortcuts: getShortcutHints(shortcuts) }
}
```

### Migration Strategy

**Phase 1: Move Core Hooks (NO BREAKING CHANGES)**
1. Move useRovingTabIndex to @repo/gallery with ariaLabel option
2. Move useAnnouncer to @repo/accessibility unchanged
3. Move useKeyboardShortcuts to @repo/gallery unchanged

**Phase 2: Create New Hooks**
4. Create useGalleryKeyboard built on useKeyboardShortcuts
5. Create useGallerySelection (optional)

**Phase 3: Update Apps**
6. Update wishlist gallery imports and add ariaLabel
7. Update inspiration gallery imports and add ariaLabel

**Phase 4: Cleanup**
8. Delete duplicate hook files from apps
9. Verify all tests pass

### Package Dependencies

No new dependencies required:
- React already in both packages
- Zod already in both packages
- No circular dependencies introduced

## Infrastructure Notes

N/A - No infrastructure changes required.

## HTTP Contract Plan

N/A - No API changes.

## Seed Requirements

N/A - No seed data required.

## Test Plan

### Unit Tests (Hook-Level)

**useRovingTabIndex:**
- ✅ tabIndex management (0 for active item, -1 for others)
- ✅ Arrow key navigation (up, down, left, right)
- ✅ Home/End key support
- ✅ Horizontal wrapping behavior
- ✅ Vertical wrapping behavior (disabled by default)
- ✅ Automatic column detection via ResizeObserver
- ✅ Manual column configuration
- ✅ Bounds checking when item count changes
- ✅ Container/item props generation
- ✅ ariaLabel option applied to containerProps
- **Location:** `packages/core/gallery/src/hooks/__tests__/useRovingTabIndex.test.ts`
- **Migrate from:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useRovingTabIndex.test.tsx`

**useAnnouncer:**
- ✅ Announcement state updates
- ✅ Priority levels (polite/assertive)
- ✅ Clear delay mechanism (default 100ms)
- ✅ Duplicate announcement prevention
- ✅ Cleanup on unmount
- ✅ Announcer component rendering
- ✅ Live region ARIA attributes
- **Location:** `packages/core/accessibility/src/hooks/__tests__/useAnnouncer.test.tsx`
- **Migrate from:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useAnnouncer.test.tsx`

**useKeyboardShortcuts:**
- ✅ Shortcut registration and triggering
- ✅ Case-insensitive letter keys
- ✅ Special key handling (Delete, Escape, Enter, Space)
- ✅ Input element filtering (INPUT, TEXTAREA, contentEditable)
- ✅ Container scoping
- ✅ Enable/disable functionality
- ✅ preventDefault/stopPropagation options
- ✅ getShortcutHints helper function
- **Location:** `packages/core/gallery/src/hooks/__tests__/useKeyboardShortcuts.test.ts`
- **Migrate from:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useKeyboardShortcuts.test.tsx`

**useGalleryKeyboard (NEW):**
- ✅ Standard shortcut registration (Escape, Delete, Enter)
- ✅ Modifier key support (Ctrl/Cmd+A)
- ✅ Action shortcut registration (a, m, e, u, n)
- ✅ Callback triggering
- ✅ Shortcuts array generation for help UI
- ✅ Container scoping
- ✅ Enable/disable functionality
- ✅ Custom actions via options.actions
- **Location:** `packages/core/gallery/src/hooks/__tests__/useGalleryKeyboard.test.ts`
- **New test file:** No existing tests to migrate

**useGallerySelection (NEW, OPTIONAL):**
- ✅ Single select mode
- ✅ Multi select mode
- ✅ Toggle selection
- ✅ Select all / clear all
- ✅ Range selection (Shift+click pattern)
- ✅ Selected count tracking
- ✅ isSelected helper
- **Location:** `packages/core/gallery/src/hooks/__tests__/useGallerySelection.test.ts`
- **New test file:** No existing tests to migrate

### Integration Tests (App-Level)

**app-wishlist-gallery:**
- ✅ Keyboard navigation in gallery grid (arrow keys, home, end)
- ✅ Screen reader announcements on add/delete actions
- ✅ Keyboard shortcuts (A for add, G for got it, Delete, Enter, Escape)
- ✅ Multi-select with keyboard (Shift+arrow for range selection)
- ✅ No regressions in existing tests
- **Run:** `pnpm test --filter=app-wishlist-gallery`

**app-inspiration-gallery:**
- ✅ Keyboard navigation in gallery grid (arrow keys, home, end)
- ✅ Screen reader announcements on actions
- ✅ Keyboard shortcuts (Ctrl+A, Delete, Enter, a, m, e, u, n)
- ✅ Multi-select with keyboard
- ✅ No regressions in existing tests
- **Run:** `pnpm test --filter=app-inspiration-gallery`

### Manual Testing

**Keyboard Navigation:**
1. Navigate gallery with arrow keys → active item moves correctly
2. Press Home → focus moves to first item
3. Press End → focus moves to last item
4. Tab key → single tab stop entry into gallery
5. Wrap at edges → follows wrapHorizontal/wrapVertical settings

**Screen Reader:**
1. Add item → "Item added to wishlist" announced (polite)
2. Delete item → "Item deleted" announced (polite)
3. Error occurs → announced with assertive priority
4. No duplicate announcements

**Keyboard Shortcuts:**
1. Press 'a' → opens add modal (wishlist)
2. Press 'Delete' → opens delete modal
3. Press 'Enter' → opens detail view
4. Press 'Escape' → clears selection
5. Ctrl+A → selects all items (inspiration)
6. Shortcuts ignored when typing in input field

### Coverage Requirements

- Minimum 45% global coverage (project standard)
- Hook tests should maintain ~95% coverage (existing standard)
- No coverage regression from current baseline

### Test Commands

```bash
# Run all tests
pnpm test

# Test specific packages
pnpm test --filter=@repo/gallery
pnpm test --filter=@repo/accessibility

# Test specific apps
pnpm test --filter=app-wishlist-gallery
pnpm test --filter=app-inspiration-gallery

# Coverage report
pnpm test --coverage
```

## UI/UX Notes

### Accessibility (WCAG 2.1 Compliance)

**Keyboard Navigation:**
- ✅ Roving tabindex pattern (WAI-ARIA Grid Pattern)
- ✅ Single Tab stop entry into gallery
- ✅ Arrow keys for 2D navigation
- ✅ Home/End keys for first/last item
- ✅ Visible focus indicators

**Screen Reader Support:**
- ✅ Live regions for dynamic announcements (aria-live)
- ✅ Polite vs assertive priorities
- ✅ Descriptive aria-labels on containers
- ✅ Announced state changes

**Keyboard Shortcuts:**
- ✅ Shortcuts documented and discoverable
- ✅ No conflicts with browser/OS shortcuts
- ✅ Ignored when typing in form fields
- ✅ Consistent across gallery apps

### User Experience

**No Visual Changes:**
- This story is purely a code consolidation
- No UI changes expected
- Behavior remains identical to existing implementations

**Performance:**
- No performance impact (same implementations)
- Potential slight improvement from shared bundle code
- ResizeObserver for column detection (efficient)

## Reality Baseline

### Existing Code Locations

**Duplicate Hooks (Exact Matches):**
```
apps/web/app-wishlist-gallery/src/hooks/
  useRovingTabIndex.ts (363 lines)
  useAnnouncer.tsx (180 lines)
  useKeyboardShortcuts.ts (212 lines)
  __tests__/
    useRovingTabIndex.test.tsx
    useAnnouncer.test.tsx
    useKeyboardShortcuts.test.tsx

apps/web/app-inspiration-gallery/src/hooks/
  useRovingTabIndex.ts (325 lines)
  useAnnouncer.tsx (154 lines)
  useGalleryKeyboard.ts (186 lines)
  __tests__/
    useGalleryKeyboard.test.ts
```

**Target Package Locations:**
```
packages/core/gallery/
  src/
    hooks/ (exists, has other hooks)
    index.ts (exists, barrel export)
  package.json (exists)
  tsconfig.json (exists)

packages/core/accessibility/
  src/
    hooks/ (exists, has other hooks)
    index.ts (exists, barrel export)
  package.json (exists)
  tsconfig.json (exists)
```

### Active Work

**No conflicts identified:**
- REPA-007 (SortableGallery) is independent (different hooks)
- REPA-010 (Refactor inspiration gallery) depends on this story
- REPA-011 (GalleryFilterBar) is independent

### Current Usage

**useRovingTabIndex used in:**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
- `apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/index.tsx`

**useAnnouncer used in:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- `apps/web/app-inspiration-gallery/src/pages/main-page.tsx`

**useKeyboardShortcuts used in:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

**useGalleryKeyboard used in:**
- `apps/web/app-inspiration-gallery/src/pages/main-page.tsx`

### Migration Impact

**Files to Update (Import Changes):**
- `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
- `apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/index.tsx`
- `apps/web/app-inspiration-gallery/src/pages/main-page.tsx`

**Import Changes Example:**
```typescript
// Before (wishlist)
import { useRovingTabIndex } from '../../hooks/useRovingTabIndex'
import { useAnnouncer, Announcer } from '../../hooks/useAnnouncer'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

// After (wishlist)
import { useRovingTabIndex, useKeyboardShortcuts } from '@repo/gallery'
import { useAnnouncer, Announcer } from '@repo/accessibility'

// Add ariaLabel option
const { activeIndex, getItemProps, containerProps } = useRovingTabIndex(
  items.length,
  containerRef,
  { columns: 3, ariaLabel: 'Wishlist items' }  // NEW
)
```

### Package Structure

**@repo/gallery structure:**
```
packages/core/gallery/
  src/
    components/
      GalleryCard/
      GalleryGrid/
      GalleryFilterBar/
      StatCard/
    hooks/        ← Add hooks here
    index.ts      ← Add exports here
    types.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

**@repo/accessibility structure:**
```
packages/core/accessibility/
  src/
    hooks/        ← Add useAnnouncer here
    utils/
    index.ts      ← Add export here
  package.json
  tsconfig.json
  vitest.config.ts
```

### Dependencies

**No new dependencies needed:**
- React: already in both packages
- Zod: already in both packages
- @testing-library/react: already in both packages (devDependencies)
- vitest: already in both packages (devDependencies)

### Test Infrastructure

**Existing test setup:**
- Vitest configured in both packages
- React Testing Library available
- Test utils in `src/test/setup.ts` (if needed)
- Coverage thresholds configured

### Build System

**Turborepo tasks:**
- `pnpm build` - builds all packages
- `pnpm test` - runs all tests
- `pnpm check-types:all` - type checks everything
- `pnpm lint:all` - lints everything

**Package build order:**
- Core packages build first (@repo/gallery, @repo/accessibility)
- Apps depend on core packages (automatic dependency resolution)

### Code Metrics

**Before:**
- Total lines: ~1,420 (across duplicate implementations)
- Duplicate lines: ~470
- Test files: 6 (3 in each app)

**After:**
- Total lines: ~950 (33% reduction)
- Duplicate lines: 0
- Test files: 5 (in packages)
- Lines saved: ~470

### Browser Compatibility

**Requirements:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ResizeObserver support (all modern browsers)
- No IE11 support needed

### Standards Compliance

**WAI-ARIA Patterns:**
- [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) - roving tabindex
- [WAI-ARIA Live Regions](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19) - announcements
- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/quickref/#keyboard-accessible)

---

## Implementation Checklist

### Phase 1: Move Core Hooks
- [ ] Move useRovingTabIndex to @repo/gallery with ariaLabel option
- [ ] Move tests for useRovingTabIndex
- [ ] Move useAnnouncer to @repo/accessibility
- [ ] Move tests for useAnnouncer
- [ ] Move useKeyboardShortcuts to @repo/gallery
- [ ] Move tests for useKeyboardShortcuts
- [ ] Update package index exports
- [ ] Verify packages build: `pnpm build --filter=@repo/gallery --filter=@repo/accessibility`

### Phase 2: Create New Hooks
- [ ] Create useGalleryKeyboard in @repo/gallery
- [ ] Write tests for useGalleryKeyboard
- [ ] (Optional) Create useGallerySelection in @repo/gallery
- [ ] (Optional) Write tests for useGallerySelection
- [ ] Update @repo/gallery index exports
- [ ] Verify package builds: `pnpm build --filter=@repo/gallery`

### Phase 3: Update Apps
- [ ] Update wishlist gallery imports
- [ ] Add ariaLabel to wishlist useRovingTabIndex calls
- [ ] Verify wishlist app builds and runs
- [ ] Run wishlist tests: `pnpm test --filter=app-wishlist-gallery`
- [ ] Update inspiration gallery imports
- [ ] Add ariaLabel to inspiration useRovingTabIndex calls
- [ ] Verify inspiration app builds and runs
- [ ] Run inspiration tests: `pnpm test --filter=app-inspiration-gallery`

### Phase 4: Cleanup
- [ ] Delete duplicate hooks from wishlist app
- [ ] Delete duplicate hooks from inspiration app
- [ ] Delete duplicate tests from apps
- [ ] Run full test suite: `pnpm test`
- [ ] Run type check: `pnpm check-types:all`
- [ ] Run linter: `pnpm lint:all`
- [ ] Verify coverage maintained: `pnpm test --coverage`

---

**Story Points:** 2
**Complexity:** Medium
**Risk Level:** Low

**Related Stories:**
- WISH-2006: Wishlist Accessibility (original implementation)
- INSP-019: Inspiration Keyboard Navigation & A11y
- REPA-007: Add SortableGallery Component (uses these hooks)
- REPA-010: Refactor app-inspiration-gallery (depends on these hooks)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | Status |
|---|---------|------------|--------|
| 1 | Barrel export pattern conflicts with project guidelines | Clarified as non-issue - applies to component re-exports, not package entry points | ✓ |
| 2 | AC5 optional status unclear in checklist | Implementation note added clarifying AC5 can be skipped | ✓ |
| 3 | Test migration paths incomplete | Implementation note added with git mv commands | ✓ |
| 4 | Package build verification incomplete | Implementation note added for cross-package verification | ✓ |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 1 | E2E keyboard navigation tests | enhancement | Playwright tests for arrow keys and announcements (REPA-011) |
| 2 | ResizeObserver performance benchmarks | enhancement | Future verification for layout efficiency |
| 3 | Accessibility regression testing | enhancement | Automated axe-core tests for WCAG compliance |
| 4 | Keyboard shortcuts discoverability | enhancement | Covered by future story REPA-011 (help panel) |
| 5 | Error boundaries for hook failures | enhancement | Defensive handling for production stability |
| 6 | Migration guides for future consumers | enhancement | Documentation for other apps (sets, instructions) |
| 7 | useGallerySelection shift+click details | enhancement | Pattern documentation if AC5 is implemented |
| 8+ | 10 additional enhancements | enhancement | Customization, touch support, analytics, i18n, Storybook, etc. |

### Implementation Guidance

Three critical implementation notes added to story:

1. **AC5 Optional**: useGallerySelection can be skipped without blocking completion. ACs 1-4, 6-8 are sufficient.
2. **Test Migration**: Use `git mv` to preserve history when moving test files between packages.
3. **Build Verification**: Final check should build both packages together: `pnpm build --filter=@repo/gallery --filter=@repo/accessibility`

### Summary

- MVP gaps resolved: 4
- Non-blocking enhancements logged: 18
- Mode: autonomous (DECISIONS.yaml processed)
- Verdict: PASS
- Ready for implementation with full guidance provided
