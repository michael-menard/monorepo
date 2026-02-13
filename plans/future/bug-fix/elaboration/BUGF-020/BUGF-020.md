---
id: BUGF-020
title: "Fix Accessibility Issues and Improve A11y Test Coverage"
status: backlog
priority: P2
phase: 3
story_type: bug
points: 8
epic: bug-fix
experiment_variant: control
created_at: "2026-02-11T20:45:00Z"
---

# BUGF-020: Fix Accessibility Issues and Improve A11y Test Coverage

## Context

The codebase has excellent accessibility infrastructure in place (`@repo/accessibility`, `useRovingTabIndex`, form primitives with ARIA support), and most apps follow proper a11y patterns. However, there are minor issues and gaps in test coverage that need to be addressed to ensure WCAG 2.1 AA compliance across all applications.

**Current State:**

**Existing A11y Infrastructure:**
- `/packages/core/accessibility/src/` - Centralized a11y package with reusable hooks and components
  - `useAnnouncer` hook + `Announcer` component for screen reader announcements
  - `useKeyboardDragAndDrop` for keyboard-accessible drag-and-drop
  - `KeyboardDragDropArea` wrapper component
  - Focus management utilities (`focus-styles.ts`, `keyboard-labels.ts`)
  - Contrast validation utilities
- `/packages/core/gallery/src/hooks/useRovingTabIndex.ts` - WAI-ARIA roving tabindex pattern for 2D grid navigation
- `/packages/core/gallery/src/hooks/useKeyboardShortcuts.ts` - Centralized keyboard shortcut management
- `/packages/core/app-component-library/src/_primitives/form.tsx` - Form primitives with built-in `aria-describedby` support
- Comprehensive a11y test utilities in `apps/web/app-wishlist-gallery/src/test/a11y/` including:
  - `screen-reader.test.tsx` - ARIA validation, live region testing, semantic HTML validation
  - `keyboard.test.tsx` - Keyboard navigation testing
  - `axe.test.tsx` - Automated axe-core testing

**Issues Identified:**

1. **Misleading screen reader instructions** - Drag handles describe keyboard drag-and-drop that isn't implemented (PointerSensor/TouchSensor only, no KeyboardSensor)
2. **Missing accessible instructions** - TagInput components support keyboard shortcuts but don't announce them to screen readers
3. **Incomplete a11y test coverage** - Only wishlist-gallery has comprehensive a11y tests; other apps lack coverage
4. **A11y test utilities are siloed** - Excellent test utilities in wishlist-gallery should be promoted to `@repo/accessibility/testing` for reuse

## Goal

Fix identified accessibility issues and establish consistent a11y testing across all apps to ensure WCAG 2.1 AA compliance for all interactive components.

## Non-Goals

- Implementing KeyboardSensor for drag-and-drop (significant feature, separate story)
- Visual regression tests for focus states (defer to separate story)
- Comprehensive accessibility audit of all components (ongoing process, not one-time story)
- Chart/visualization alternative text (defer to dashboard-specific story)

## Scope

**Apps:**
- `apps/web/app-wishlist-gallery` (fix issues + promote tests)
- `apps/web/app-inspiration-gallery` (fix issues + add tests)
- `apps/web/app-sets-gallery` (fix issues + add tests)
- `apps/web/app-instructions-gallery` (add tests)
- `apps/web/app-dashboard` (add tests)

**Packages:**
- Create: `packages/core/accessibility/testing/` (new testing sub-package)
- Modify: `@repo/accessibility` package exports

**Components:**
- `SortableWishlistCard` (wishlist-gallery)
- `SortableInspirationCard` (inspiration-gallery)
- `TagInput` (sets-gallery, wishlist-gallery)
- All gallery components, forms, drag-and-drop components across apps

## Acceptance Criteria

### AC1: Fix Misleading Drag Handle Instructions

**Given** a sortable card component with drag handles
**When** a screen reader user navigates to the drag handle
**Then** the instructions accurately describe the interaction method

**Implementation:**
- Update `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx` (lines 137-140)
- Update `apps/web/app-inspiration-gallery/src/components/SortableInspirationCard/index.tsx`
- Remove "Press Space to start dragging" instructions since KeyboardSensor is not implemented
- Clarify that drag is pointer/touch only: "Drag to reorder. Use arrow keys to navigate between items."
- Ensure `aria-describedby` still connects handle to instructions

**Verification:**
- Screen reader announces accurate interaction instructions
- No references to keyboard drag-and-drop that isn't implemented
- ARIA validation passes in tests

### AC2: Add Accessible Instructions to TagInput Components

**Given** a TagInput component
**When** a screen reader user focuses on the input
**Then** keyboard shortcuts are announced via `aria-describedby`

**Implementation:**
- Add hidden instructions to `apps/web/app-sets-gallery/src/components/TagInput.tsx`
- Add hidden instructions to `apps/web/app-wishlist-gallery/src/components/TagInput/index.tsx`
- Instructions text: "Press Enter or comma to add tag. Press Backspace with empty input to remove last tag."
- Add unique ID for instructions: `tag-input-instructions-{id}`
- Connect via `aria-describedby`
- Add `role="list"` to tag container and `role="listitem"` to individual tags

**Verification:**
- Screen reader announces instructions when input is focused
- Keyboard shortcuts are discoverable without visual inspection
- ARIA validation passes in tests

### AC3: Promote A11y Test Utilities to Shared Package

**Given** existing a11y test utilities in wishlist-gallery
**When** creating shared testing infrastructure
**Then** utilities are available to all apps

**Implementation:**
- Create `packages/core/accessibility/testing/` directory
- Move utilities from `apps/web/app-wishlist-gallery/src/test/a11y/` to shared package:
  - `screen-reader.ts` (ARIA validation, live region testing, semantic HTML validation)
  - `keyboard.ts` (keyboard navigation testing utilities)
  - `axe.ts` (axe-core integration)
- Create `packages/core/accessibility/testing/package.json`:
  - Package name: `@repo/accessibility-testing`
  - Dependencies: `@testing-library/react`, `axe-core`, `vitest`
  - Peer dependencies: `react`, `react-dom`
- Export utilities from `packages/core/accessibility/testing/index.ts`
- Update `apps/web/app-wishlist-gallery` to import from `@repo/accessibility-testing`
- Update all app `package.json` files to include `@repo/accessibility-testing` as dev dependency

**Verification:**
- Package builds successfully
- Wishlist-gallery tests still pass using new imports
- Other apps can import and use utilities

### AC4: Add A11y Test Coverage to Inspiration Gallery

**Given** the inspiration gallery app
**When** running test suite
**Then** a11y tests cover all critical components

**Implementation:**
- Create `apps/web/app-inspiration-gallery/src/test/a11y/` directory
- Add `__tests__/screen-reader.test.tsx`:
  - Test drag-and-drop announcements (useAnnouncer integration)
  - Test ARIA attributes on AlbumCard, InspirationCard
  - Test semantic HTML structure in main-page
  - Test live region timing for sort/delete operations
- Add `__tests__/keyboard.test.tsx`:
  - Test roving tabindex for arrow key navigation in galleries
  - Test keyboard shortcuts (Enter for select, Delete for delete)
  - Test focus management after delete operation
  - Test Escape key behavior in modals
- Add `__tests__/axe.test.tsx`:
  - Test main-page with axe-core
  - Test album view with axe-core
  - Ensure WCAG 2.1 AA compliance
- Use `@repo/accessibility-testing` utilities

**Coverage Target:** 80%+ of a11y-critical components (DraggableInspirationGallery, SortableInspirationCard, AlbumCard, modals)

**Verification:**
- All tests pass
- Coverage target met
- No axe violations reported

### AC5: Add A11y Test Coverage to Sets Gallery

**Given** the sets gallery app
**When** running test suite
**Then** a11y tests cover all critical components

**Implementation:**
- Create `apps/web/app-sets-gallery/src/test/a11y/` directory
- Add `__tests__/screen-reader.test.tsx`:
  - Test form error announcements (aria-live on form validation)
  - Test ARIA attributes on SetCard, forms
  - Test semantic HTML structure in main-page, add-set-page
  - Test TagInput ARIA (from AC2)
- Add `__tests__/keyboard.test.tsx`:
  - Test form keyboard navigation (Tab order, Enter to submit)
  - Test TagInput keyboard shortcuts (Enter, Backspace)
  - Test focus management in modals
- Add `__tests__/axe.test.tsx`:
  - Test main-page with axe-core
  - Test add-set-page with axe-core
  - Test edit-set-page with axe-core
  - Ensure WCAG 2.1 AA compliance
- Use `@repo/accessibility-testing` utilities

**Coverage Target:** 80%+ of a11y-critical components (forms, TagInput, SetCard, modals)

**Verification:**
- All tests pass
- Coverage target met
- No axe violations reported

### AC6: Add A11y Test Coverage to Instructions Gallery

**Given** the instructions gallery app
**When** running test suite
**Then** a11y tests cover all critical components

**Implementation:**
- Create `apps/web/app-instructions-gallery/src/test/a11y/` directory
- Add `__tests__/screen-reader.test.tsx`:
  - Test uploader component announcements (session start, file added, progress, completion)
  - Test form error announcements
  - Test ARIA attributes on MocDetailDashboard, InstructionsCard
  - Test semantic HTML structure in main-page
- Add `__tests__/keyboard.test.tsx`:
  - Test gallery keyboard navigation
  - Test form keyboard navigation in edit pages
  - Test uploader keyboard interactions (file selection, cancel)
  - Test focus management in modals
- Add `__tests__/axe.test.tsx`:
  - Test main-page with axe-core
  - Test upload-page with axe-core
  - Test edit-page with axe-core
  - Ensure WCAG 2.1 AA compliance
- Use `@repo/accessibility-testing` utilities

**Coverage Target:** 80%+ of a11y-critical components (beyond existing uploader coverage)

**Verification:**
- All tests pass
- Coverage target met
- No axe violations reported

### AC7: Add A11y Test Coverage to Dashboard

**Given** the dashboard app
**When** running test suite
**Then** a11y tests cover all critical components

**Implementation:**
- Create `apps/web/app-dashboard/src/test/a11y/` directory
- Add `__tests__/screen-reader.test.tsx`:
  - Test ARIA attributes on charts/visualizations
  - Test data tables have proper ARIA (grid role, row/cell roles)
  - Test StatsCards have appropriate labels
  - Test filter controls have labels and descriptions
  - Test semantic HTML structure in main-page
- Add `__tests__/keyboard.test.tsx`:
  - Test keyboard navigation through dashboard sections
  - Test filter controls keyboard interactions
  - Test chart/table keyboard navigation (if interactive)
- Add `__tests__/axe.test.tsx`:
  - Test dashboard main-page with axe-core
  - Ensure WCAG 2.1 AA compliance
- Use `@repo/accessibility-testing` utilities

**Coverage Target:** 80%+ of a11y-critical components (charts, filters, stats cards)

**Verification:**
- All tests pass
- Coverage target met
- No axe violations reported

### AC8: Verify Focus Visible Compliance

**Given** all interactive elements across apps
**When** navigating via keyboard
**Then** focus indicators meet WCAG 2.4.7 criteria

**Implementation:**
- Audit interactive elements in each app to ensure they use `focusRingClasses` from `@repo/accessibility`
- Check buttons, links, form inputs, drag handles, cards
- Verify focus ring meets criteria:
  - Minimum 2px outline
  - 3:1 contrast ratio against background
  - Visible on all interactive elements
- Document any custom focus styles that don't use `focusRingClasses`
- Create `docs/accessibility/focus-management.md` documenting:
  - How to use `focusRingClasses` utility
  - WCAG 2.4.7 requirements
  - Focus trap patterns for modals
  - Focus restoration after actions (e.g., delete)

**Verification:**
- All interactive elements have visible focus indicators
- Focus indicators meet WCAG 2.4.7 criteria (2px, 3:1 contrast)
- Documentation created and reviewed

## Reuse Plan

**Use Existing Infrastructure:**

**From `@repo/accessibility`:**
- `useAnnouncer` hook - Already used in drag-and-drop components, validate proper usage
- `focusRingClasses` - Utility for consistent focus styles, audit usage in AC8
- `keyboardShortcutLabels` - Standard labels for screen readers
- `ContrastRatioSchema` - Validate color contrast compliance

**From `@repo/gallery`:**
- `useRovingTabIndex` - Already used in galleries, validate in keyboard tests
- `useKeyboardShortcuts` - Already used, validate in keyboard tests

**From `@repo/app-component-library`:**
- Form primitives - Already handle `aria-describedby` automatically, validate in tests

**Promote to Shared:**
- Wishlist-gallery a11y test utilities → `@repo/accessibility-testing` (AC3)

## Architecture Notes

**Test Infrastructure:**

```
packages/core/accessibility/testing/
  src/
    screen-reader.ts    # ARIA validation, live region testing
    keyboard.ts         # Keyboard navigation testing utilities
    axe.ts             # axe-core integration
    index.ts           # Exports
  package.json         # @repo/accessibility-testing
  tsconfig.json
  vitest.config.ts
```

**App Test Structure (per app):**

```
apps/web/{app-name}/src/test/a11y/
  __tests__/
    screen-reader.test.tsx
    keyboard.test.tsx
    axe.test.tsx
```

**ARIA Patterns:**

1. **Form Error Announcements:**
   - Already handled by `FormControl` component
   - Automatically adds `aria-describedby` when errors exist
   - Sets `aria-invalid={true}` on error state

2. **Drag-and-Drop Announcements:**
   - Use `useAnnouncer` hook for screen reader feedback
   - Announce actions: "Item moved to position X", "Item deleted"
   - Use `aria-live="polite"` for non-critical announcements

3. **Keyboard Navigation:**
   - Roving tabindex for 2D grids (useRovingTabIndex)
   - Tab for form navigation
   - Enter/Space for activation
   - Escape for cancellation

**Focus Management:**

- Use `focusRingClasses` utility for consistent focus styles
- Focus trap in modals (already implemented in modal primitives)
- Focus restoration after delete operations
- Focus on first input when opening forms

## Test Plan

### Unit Tests

**AC1-AC2: Component Fixes**

Test files:
- `apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/__tests__/index.test.tsx`
- `apps/web/app-inspiration-gallery/src/components/SortableInspirationCard/__tests__/index.test.tsx`
- `apps/web/app-sets-gallery/src/components/__tests__/TagInput.test.tsx`
- `apps/web/app-wishlist-gallery/src/components/TagInput/__tests__/index.test.tsx`

Test scenarios:
```typescript
describe('SortableWishlistCard a11y', () => {
  it('should have accurate drag handle instructions', () => {
    render(<SortableWishlistCard item={mockItem} />)
    const instructions = screen.getByText(/drag to reorder/i)
    expect(instructions).toHaveClass('sr-only')
    expect(instructions).not.toHaveTextContent(/press space/i)
  })

  it('should connect drag handle to instructions via aria-describedby', () => {
    render(<SortableWishlistCard item={mockItem} />)
    const handle = screen.getByRole('button', { name: /drag handle/i })
    expect(handle).toHaveAttribute('aria-describedby', `sortable-instructions-${mockItem.id}`)
  })
})

describe('TagInput a11y', () => {
  it('should announce keyboard shortcuts via aria-describedby', () => {
    render(<TagInput />)
    const input = screen.getByRole('textbox')
    const instructionsId = input.getAttribute('aria-describedby')
    expect(instructionsId).toBeTruthy()
    const instructions = document.getElementById(instructionsId!)
    expect(instructions).toHaveTextContent(/press enter or comma to add tag/i)
  })

  it('should have list semantics for tags', () => {
    render(<TagInput value={['tag1', 'tag2']} />)
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
```

**AC3: Shared Package**

Test files:
- `packages/core/accessibility/testing/src/__tests__/screen-reader.test.ts`
- `packages/core/accessibility/testing/src/__tests__/keyboard.test.ts`
- `packages/core/accessibility/testing/src/__tests__/axe.test.ts`

Test scenarios:
```typescript
describe('@repo/accessibility-testing', () => {
  describe('screen-reader utilities', () => {
    it('should validate ARIA attributes', () => {
      const element = screen.getByRole('button')
      expect(validateAriaLabel(element)).toBe(true)
    })

    it('should test live region announcements', async () => {
      render(<ComponentWithAnnouncer />)
      const liveRegion = screen.getByRole('status')
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Action completed')
      })
    })
  })

  describe('keyboard utilities', () => {
    it('should simulate keyboard navigation', () => {
      render(<NavigableComponent />)
      const { pressArrowDown } = createKeyboardNavigationTest()
      pressArrowDown()
      expect(screen.getAllByRole('button')[1]).toHaveFocus()
    })
  })

  describe('axe utilities', () => {
    it('should run axe-core and report violations', async () => {
      const { container } = render(<TestComponent />)
      const results = await runAxe(container)
      expect(results.violations).toHaveLength(0)
    })
  })
})
```

**AC4-AC7: App A11y Tests**

Test structure per app (using inspiration-gallery as example):

`apps/web/app-inspiration-gallery/src/test/a11y/__tests__/screen-reader.test.tsx`:
```typescript
import { validateAriaLabel, testLiveRegion } from '@repo/accessibility-testing'
import { render, screen, waitFor } from '@testing-library/react'
import { MainPage } from '../../../pages/main-page'

describe('Inspiration Gallery - Screen Reader', () => {
  it('should announce drag-and-drop operations', async () => {
    render(<MainPage />)
    const announcer = screen.getByRole('status')

    // Simulate drag operation
    fireEvent.dragEnd(screen.getByRole('article'))

    await waitFor(() => {
      expect(announcer).toHaveTextContent(/moved/i)
    })
  })

  it('should have proper ARIA labels on cards', () => {
    render(<AlbumCard album={mockAlbum} />)
    const card = screen.getByRole('article')
    expect(validateAriaLabel(card)).toBe(true)
  })

  it('should have semantic HTML structure', () => {
    render(<MainPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
```

`apps/web/app-inspiration-gallery/src/test/a11y/__tests__/keyboard.test.tsx`:
```typescript
import { createKeyboardNavigationTest } from '@repo/accessibility-testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Inspiration Gallery - Keyboard Navigation', () => {
  it('should support arrow key navigation in gallery', async () => {
    render(<DraggableInspirationGallery items={mockItems} />)
    const cards = screen.getAllByRole('article')

    cards[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(cards[1]).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(cards[4]).toHaveFocus() // Assuming 4-column grid
  })

  it('should support Enter key for selection', async () => {
    const onSelect = vi.fn()
    render(<InspirationCard item={mockItem} onSelect={onSelect} />)

    const card = screen.getByRole('article')
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalled()
  })
})
```

`apps/web/app-inspiration-gallery/src/test/a11y/__tests__/axe.test.tsx`:
```typescript
import { runAxe } from '@repo/accessibility-testing'
import { render } from '@testing-library/react'
import { MainPage } from '../../../pages/main-page'

describe('Inspiration Gallery - Axe Compliance', () => {
  it('should have no axe violations on main page', async () => {
    const { container } = render(<MainPage />)
    const results = await runAxe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should meet WCAG 2.1 AA color contrast', async () => {
    const { container } = render(<MainPage />)
    const results = await runAxe(container, {
      rules: { 'color-contrast': { enabled: true } }
    })
    expect(results.violations).toHaveLength(0)
  })
})
```

**AC8: Focus Compliance**

Test files:
- Focus audit checklist in each app's a11y tests
- Visual inspection + automated tests

Test scenarios:
```typescript
describe('Focus Visible Compliance', () => {
  it('should have visible focus indicator on all buttons', () => {
    render(<MainPage />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      button.focus()
      const styles = window.getComputedStyle(button)
      expect(styles.outline).toMatch(/2px/)
    })
  })

  it('should use focusRingClasses utility', () => {
    render(<CustomButton />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('focus:ring-2')
  })
})
```

### Coverage Targets

| App | Current Coverage | Target | Critical Components |
|-----|-----------------|--------|-------------------|
| wishlist-gallery | Good (has a11y tests) | Maintain 80%+ | Drag-and-drop, TagInput, forms |
| inspiration-gallery | None | 80%+ | Drag-and-drop, AlbumCard, modals |
| sets-gallery | None | 80%+ | Forms, TagInput, SetCard |
| instructions-gallery | Partial (uploader) | 80%+ | Gallery views, forms |
| dashboard | None | 80%+ | Charts, filters, stats |

### Manual Testing Checklist

- [ ] Test with screen reader (VoiceOver on macOS, NVDA on Windows)
  - [ ] Drag-and-drop announcements accurate
  - [ ] TagInput keyboard shortcuts announced
  - [ ] Form errors announced immediately
  - [ ] All interactive elements have accessible names
- [ ] Test with keyboard only (no mouse)
  - [ ] Can navigate entire app via keyboard
  - [ ] Focus indicators visible on all elements
  - [ ] Arrow keys work in galleries
  - [ ] Tab order is logical
- [ ] Test with browser zoom (200%, 400%)
  - [ ] All text remains readable
  - [ ] No horizontal scrolling
  - [ ] Focus indicators still visible
- [ ] Run automated axe DevTools browser extension on all pages

## UI/UX Notes

### Design Considerations

**Focus Indicators:**
- All interactive elements must have visible focus indicators that meet WCAG 2.4.7
- Minimum 2px outline with 3:1 contrast ratio against background
- Use `focusRingClasses` utility from `@repo/accessibility` for consistency
- Default: `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`

**Screen Reader Instructions:**
- Hidden instructions should be concise and action-oriented
- Good: "Press Enter to submit"
- Bad: "You can press Enter to submit if you want"
- Use `className="sr-only"` for screen-reader-only content
- Connect via `aria-describedby` with unique IDs

**Error Messages:**
- Form errors should be announced immediately using `aria-live="assertive"`
- Error messages must be visible and associated with inputs via `aria-describedby`
- Form primitives from `@repo/app-component-library` handle this automatically
- Error format: "Field name: Error description"

**Keyboard Shortcuts:**
- Document all keyboard shortcuts in a centralized help modal
- Common shortcuts:
  - Tab/Shift+Tab: Navigate between elements
  - Enter/Space: Activate buttons/links
  - Escape: Cancel/close modals
  - Arrow keys: Navigate grids (roving tabindex)
  - Delete: Remove items (with confirmation)
- Announce shortcuts to screen readers via `aria-describedby`

**Color Contrast:**
- All text must meet WCAG AA criteria:
  - Normal text (< 18pt): 4.5:1 contrast ratio
  - Large text (≥ 18pt or ≥ 14pt bold): 3:1 contrast ratio
- Use `ContrastRatioSchema` from `@repo/accessibility` to validate
- Test with axe-core color-contrast rule

### Accessibility Checklist for Components

Use this checklist when reviewing or creating new components:

- [ ] All interactive elements are keyboard accessible
- [ ] All images have alt text (decorative images use `alt=""`)
- [ ] All form inputs have associated labels (visible or `aria-label`)
- [ ] All buttons have accessible names (text content or `aria-label`)
- [ ] All dynamic content changes are announced to screen readers (aria-live)
- [ ] All modals trap focus and return focus on close
- [ ] All drag-and-drop has keyboard alternative (or accurate instructions)
- [ ] All custom controls have proper ARIA roles and states
- [ ] All interactive elements have visible focus indicators
- [ ] All text meets color contrast requirements

### Component Patterns

**TagInput Component:**
```tsx
<div>
  <label htmlFor="tag-input" id="tag-input-label">
    Tags
  </label>
  <input
    id="tag-input"
    type="text"
    role="textbox"
    aria-labelledby="tag-input-label"
    aria-describedby="tag-input-instructions"
  />
  <span id="tag-input-instructions" className="sr-only">
    Press Enter or comma to add tag. Press Backspace with empty input to remove last tag.
  </span>
  <ul role="list" aria-label="Current tags">
    {tags.map(tag => (
      <li key={tag} role="listitem">
        {tag}
        <button aria-label={`Remove ${tag} tag`}>×</button>
      </li>
    ))}
  </ul>
</div>
```

**Drag Handle with Instructions:**
```tsx
<button
  aria-label="Drag handle"
  aria-describedby={`sortable-instructions-${item.id}`}
  className={cn('cursor-grab', focusRingClasses)}
>
  <GripVertical className="h-4 w-4" aria-hidden="true" />
</button>
<span id={`sortable-instructions-${item.id}`} className="sr-only">
  Drag to reorder. Use arrow keys to navigate between items.
</span>
```

**Form with Error Announcement:**
```tsx
<form>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} type="email" />
        </FormControl>
        <FormMessage /> {/* Automatically connected via aria-describedby */}
      </FormItem>
    )}
  />
</form>
```

## Reality Baseline

**Apps Needing Work:**

1. **app-wishlist-gallery** (Partial - Fix Issues Only)
   - ✅ Comprehensive a11y test suite already exists
   - ✅ Drag-and-drop with screen reader announcements
   - ✅ Roving tabindex for keyboard navigation
   - ⚠️ TagInput needs accessible instructions (AC2)
   - ⚠️ Drag handle instructions are misleading (AC1)

2. **app-inspiration-gallery** (Fix + Add Tests)
   - ✅ Drag-and-drop with screen reader announcements
   - ✅ Roving tabindex for keyboard navigation
   - ⚠️ Drag handle instructions are misleading (AC1)
   - ❌ No dedicated a11y test suite (AC4)

3. **app-sets-gallery** (Fix + Add Tests)
   - ✅ Forms use accessible primitives
   - ⚠️ TagInput needs accessible instructions (AC2)
   - ❌ No dedicated a11y test suite (AC5)

4. **app-instructions-gallery** (Add Tests Only)
   - ✅ Forms use accessible primitives
   - ✅ Uploader components have a11y tests
   - ❌ Limited a11y test coverage beyond uploader (AC6)

5. **app-dashboard** (Add Tests Only)
   - ⚠️ Charts/visualizations need a11y review
   - ❌ No dedicated a11y test suite (AC7)

**Dependencies:**
- None - Story can start immediately
- No conflicts with in-progress work (BUGF-003, BUGF-013, BUGF-014, BUGF-038 are separate concerns)

**Constraints:**
- Zod-first types (per CLAUDE.md)
- No barrel files (per CLAUDE.md)
- Minimum 45% test coverage (per CLAUDE.md)
- Accessibility-first design (per CLAUDE.md)
- Must not break existing functionality

**Risks:**
- Low risk - Most a11y patterns already in place, story is primarily additive
- Test utilities promotion is straightforward (proven code being shared)
- Component fixes are minor text changes
- New tests follow established patterns from wishlist-gallery

## Predictions

```yaml
split_risk: 0.2
confidence: medium
review_cycles: 1
estimated_token_cost: 100000
reasoning: "Low split risk due to clear scope (fixes + tests), established patterns from wishlist-gallery, and no behavioral changes. Medium confidence - heuristics only, KB unavailable. 1 review cycle expected - straightforward a11y improvements with clear acceptance criteria."
```

## Related Work

**Synergies:**
- **BUGF-013** (Instructions Gallery Test Coverage) - Can reuse `@repo/accessibility-testing` utilities
- **BUGF-014** (Sets Gallery Test Coverage) - Can reuse `@repo/accessibility-testing` utilities
- **BUGF-043** (Consolidate Test Setup) - Should coordinate on test utilities structure

**Blocked By:** None

**Blocks:** None

---

**Story created:** 2026-02-11T20:45:00Z with experiment variant control
