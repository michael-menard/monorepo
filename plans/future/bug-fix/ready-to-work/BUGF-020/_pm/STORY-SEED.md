# Story Seed: BUGF-020

## Reality Context

### Current State

The codebase has **excellent accessibility infrastructure** in place:

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
- `/packages/core/app-component-library/src/forms/form-error-message.tsx` - Form error messages with proper ARIA attributes

**Good A11y Patterns Already in Use:**
- Drag-and-drop components use `useAnnouncer` for screen reader feedback (DraggableWishlistGallery, DraggableInspirationGallery)
- Roving tabindex implemented in gallery components for keyboard navigation
- Form primitives automatically connect labels to inputs and error messages via `aria-describedby`
- Interactive elements consistently use `aria-label` on icon-only buttons
- Comprehensive a11y test utilities in `apps/web/app-wishlist-gallery/src/test/a11y/` including:
  - `screen-reader.test.tsx` - ARIA validation, live region testing, semantic HTML validation
  - `keyboard.test.tsx` - Keyboard navigation testing
  - `axe.test.tsx` - Automated axe-core testing

### Accessibility Issues Found

After scanning the codebase, **most critical a11y issues are already resolved**. The following minor issues were identified:

#### 1. Drag Handle Accessibility Instructions (Low Priority)

**File:** `/apps/web/app-wishlist-gallery/src/components/SortableWishlistCard/index.tsx` (lines 137-140)

```tsx
<span id={`sortable-instructions-${item.id}`} className="sr-only">
  Press Space to start dragging. Use arrow keys to move. Press Space again to drop, or
  Escape to cancel.
</span>
```

**Issue:** These instructions describe keyboard drag-and-drop, but the actual implementation uses pointer/touch sensors only (no KeyboardSensor). The `useRovingTabIndex` hook handles arrow key navigation, but not drag-and-drop.

**Impact:** Low - The drag handle has proper `aria-label` and `aria-describedby`, so screen readers announce it. The instructions are just misleading about drag-and-drop being keyboard-accessible.

**Related:** `/apps/web/app-inspiration-gallery/src/components/SortableInspirationCard/index.tsx` has the same pattern.

#### 2. Form Error Announcements (Already Handled)

**Status:** ✅ Already implemented correctly

The `FormControl` component in `packages/core/app-component-library/src/_primitives/form.tsx` (lines 99-114) automatically adds `aria-describedby` to form inputs when errors exist:

```tsx
<Slot
  ref={ref}
  id={formItemId}
  aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
  aria-invalid={!!error}
  {...props}
/>
```

**No action needed** - Forms already properly announce errors to screen readers.

#### 3. TagInput Components Missing Accessible Instructions

**Files:**
- `/apps/web/app-sets-gallery/src/components/TagInput.tsx`
- `/apps/web/app-wishlist-gallery/src/components/TagInput/index.tsx`

**Issue:** Tag inputs support keyboard shortcuts (Enter to add, Backspace to remove) but don't provide accessible instructions for screen reader users.

**Impact:** Medium - Keyboard shortcuts work but are undiscoverable for screen reader users.

**Recommendation:** Add `aria-describedby` pointing to instructions like "Press Enter or comma to add tag. Press Backspace with empty input to remove last tag."

#### 4. Focus Management Edge Cases

**Files:**
- `/apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx` (lines 211-216)
- `/apps/web/app-inspiration-gallery/src/components/DraggableInspirationGallery/index.tsx` (lines 192-197)

**Current Implementation:**
```tsx
useEffect(() => {
  if (!activeItem && itemRefs.current[activeIndex]) {
    itemRefs.current[activeIndex]?.focus()
  }
}, [activeIndex, activeItem])
```

**Issue:** Focus management during keyboard navigation works, but there's no visual focus indicator compliance check for WCAG 2.4.7 (Focus Visible).

**Status:** Likely compliant - The `@repo/accessibility` package exports `focusRingClasses` utility for consistent focus styles. Need to verify all interactive elements use it.

### In-Progress Work

**No conflicts identified.** Review of current stories in the bug-fix epic:

- **BUGF-032** (UAT): Frontend presigned URL upload - No a11y overlap
- **BUGF-003** (ready-to-work): Sets gallery delete/edit - Form-based, should use existing form primitives
- **BUGF-013, BUGF-014** (ready-to-work): Test coverage - Will benefit from a11y test patterns
- **BUGF-038** (ready-to-work): Consolidate uploader components - No direct a11y conflict

### Constraints

From `/CLAUDE.md`:

1. **Zod-First Types** - All types must be Zod schemas with `z.infer<>`
2. **No Barrel Files** - Import directly from source files
3. **Minimum Test Coverage** - 45% global coverage required
4. **Accessibility-First Design** - ARIA labels, keyboard nav, focus management are first-class requirements
5. **Quality Gates** - All code must pass TypeScript, ESLint, tests before commit

**Architecture Notes:**
- The `@repo/accessibility` package is the source of truth for a11y utilities
- The `@repo/gallery` package provides keyboard navigation hooks that should be used across all gallery components
- The `@repo/app-component-library` form primitives handle form a11y automatically

## Codebase Context

### Reuse Candidates

**Hooks (from `@repo/accessibility`):**
- ✅ `useAnnouncer` - Screen reader announcements (already widely used)
- ✅ `useKeyboardDragAndDrop` - Keyboard drag-and-drop (available but not yet adopted)
- ⚠️ Focus management utilities exist but not centralized into a hook

**Hooks (from `@repo/gallery`):**
- ✅ `useRovingTabIndex` - 2D grid keyboard navigation (already used in galleries)
- ✅ `useKeyboardShortcuts` - Keyboard shortcut management (already used)

**Components (from `@repo/accessibility`):**
- ✅ `Announcer` - Live region component (already widely used)
- ✅ `KeyboardDragDropArea` - Wrapper for keyboard-accessible drag-and-drop (available but not adopted)

**Utilities (from `@repo/accessibility`):**
- `focusRingClasses` - Consistent focus ring styles
- `keyboardShortcutLabels` - Standard keyboard shortcut labels for screen readers
- `ContrastRatioSchema` - Color contrast validation

**Test Utilities (from `apps/web/app-wishlist-gallery/src/test/a11y/`):**
- `screen-reader.ts` - ARIA validation, live region testing, semantic HTML validation
- Could be promoted to `@repo/accessibility/testing` for reuse across apps

### Related Code

**Apps Needing Review:**

1. **app-wishlist-gallery** (Most Complete)
   - ✅ Comprehensive a11y test suite
   - ✅ Drag-and-drop with screen reader announcements
   - ✅ Roving tabindex for keyboard navigation
   - ⚠️ TagInput needs accessible instructions
   - ⚠️ Drag handle instructions are misleading

2. **app-inspiration-gallery**
   - ✅ Drag-and-drop with screen reader announcements
   - ✅ Roving tabindex for keyboard navigation
   - ⚠️ Drag handle instructions are misleading
   - ⚠️ No dedicated a11y test suite (could reuse wishlist tests)

3. **app-sets-gallery**
   - ✅ Forms use accessible primitives
   - ⚠️ TagInput needs accessible instructions
   - ⚠️ No drag-and-drop (not applicable)
   - ⚠️ No dedicated a11y test suite

4. **app-instructions-gallery**
   - ✅ Forms use accessible primitives
   - ✅ Uploader components have a11y tests
   - ⚠️ No drag-and-drop (not applicable)
   - ⚠️ Limited a11y test coverage beyond uploader

5. **main-app**
   - ✅ Auth flows have a11y tests
   - ✅ Navigation has proper ARIA
   - ⚠️ Uploader components share with app-instructions-gallery
   - ⚠️ Dashboard components need a11y review

6. **app-dashboard**
   - ⚠️ Charts/visualizations need a11y review (data tables, alternative text)
   - ⚠️ No dedicated a11y test suite

**Shared Components:**
- `/packages/core/app-component-library/src/` - All primitives have proper ARIA
- `/packages/core/gallery/src/` - Gallery components follow a11y patterns
- `/packages/core/accessibility/src/` - Central a11y infrastructure

## Conflict Analysis

**No conflicts identified.**

This story is purely additive - it improves existing a11y patterns and adds tests. It does not modify core functionality that other stories depend on.

**Potential synergies:**
- **BUGF-013, BUGF-014** (Test Coverage) - Can reuse a11y test utilities being promoted
- **BUGF-043** (Consolidate Test Setup) - Should coordinate on promoting a11y test utils to shared package

## Initial Story Structure

### Title
Fix Accessibility Issues and Improve A11y Test Coverage

### Description

The codebase has excellent accessibility infrastructure (`@repo/accessibility`, `useRovingTabIndex`, form primitives with ARIA support), and most apps follow proper a11y patterns. However, there are minor issues and gaps in test coverage:

1. **Misleading screen reader instructions** - Drag handles describe keyboard drag-and-drop that isn't implemented (PointerSensor/TouchSensor only, no KeyboardSensor)
2. **Missing accessible instructions** - TagInput components support keyboard shortcuts but don't announce them to screen readers
3. **Incomplete a11y test coverage** - Only wishlist-gallery has comprehensive a11y tests; other apps lack coverage
4. **A11y test utilities are siloed** - Excellent test utilities in wishlist-gallery should be promoted to `@repo/accessibility/testing` for reuse

This story will fix the identified issues and establish consistent a11y testing across all apps.

### Initial ACs (based on findings)

**AC1: Fix Misleading Drag Handle Instructions**
- Update `SortableWishlistCard` and `SortableInspirationCard` screen reader instructions to accurately describe pointer/touch-only drag (or implement `KeyboardSensor` if keyboard drag is desired)
- Remove misleading "Press Space to start dragging" text if keyboard drag is not implemented
- Update ARIA labels to clarify interaction method

**AC2: Add Accessible Instructions to TagInput Components**
- Add `aria-describedby` to TagInput components in `app-sets-gallery` and `app-wishlist-gallery`
- Provide hidden instructions: "Press Enter or comma to add tag. Press Backspace with empty input to remove last tag."
- Add `role="list"` to tag container and `role="listitem"` to individual tags for proper screen reader navigation

**AC3: Promote A11y Test Utilities to Shared Package**
- Create `@repo/accessibility/testing` package
- Move `apps/web/app-wishlist-gallery/src/test/a11y/*.ts` utilities to shared package:
  - `screen-reader.ts` (ARIA validation, live region testing)
  - `keyboard.ts` (keyboard navigation testing)
  - `axe.ts` (axe-core integration)
- Export utilities from `@repo/accessibility/testing`
- Update wishlist-gallery to import from new package

**AC4: Add A11y Test Coverage to Inspiration Gallery**
- Create `apps/web/app-inspiration-gallery/src/test/a11y/` directory
- Add screen reader tests for drag-and-drop announcements
- Add keyboard navigation tests for roving tabindex
- Add axe-core tests for main page
- Achieve 80%+ coverage of a11y-critical components (DraggableInspirationGallery, SortableInspirationCard)

**AC5: Add A11y Test Coverage to Sets Gallery**
- Create `apps/web/app-sets-gallery/src/test/a11y/` directory
- Add screen reader tests for form error announcements
- Add keyboard navigation tests for TagInput
- Add axe-core tests for add/edit pages
- Achieve 80%+ coverage of a11y-critical components (forms, TagInput)

**AC6: Add A11y Test Coverage to Instructions Gallery**
- Create `apps/web/app-instructions-gallery/src/test/a11y/` directory
- Add screen reader tests for uploader components (already partially covered)
- Add keyboard navigation tests for gallery views
- Add axe-core tests for main page
- Achieve 80%+ coverage of a11y-critical components (beyond uploader)

**AC7: Add A11y Test Coverage to Dashboard**
- Create `apps/web/app-dashboard/src/test/a11y/` directory
- Add screen reader tests for charts/visualizations (ensure data tables have proper ARIA)
- Add keyboard navigation tests
- Add axe-core tests for dashboard page
- Achieve 80%+ coverage of a11y-critical components (charts, filters, stats cards)

**AC8: Verify Focus Visible Compliance**
- Audit all interactive elements to ensure they use `focusRingClasses` from `@repo/accessibility`
- Add visual regression tests for focus states (optional, nice-to-have)
- Document focus management patterns in `/docs/accessibility/focus-management.md`

### Recommended Scope

**Include:**
- AC1-AC7 (fixes + test coverage)
- Promoting a11y test utilities to shared package
- Adding a11y tests to all apps

**Exclude (Future Work):**
- AC8 visual regression tests (defer to separate story)
- Implementing KeyboardSensor for drag-and-drop (significant feature, separate story)
- Comprehensive accessibility audit of all components (ongoing process, not one-time story)
- Chart/visualization alternative text (defer to dashboard-specific story)

**Rationale:**
This scope focuses on fixing known issues and establishing consistent a11y testing patterns. It's achievable in one story and sets up infrastructure for ongoing a11y improvements.

## Recommendations

### For Test Plan Worker

**Leverage Existing Patterns:**
- The wishlist-gallery a11y test suite is excellent and should be used as a template
- The `screen-reader.ts` utilities provide comprehensive ARIA validation, live region testing, and semantic HTML validation
- The `axe.ts` integration with axe-core provides automated WCAG compliance checking

**Test Structure:**
```
apps/web/{app-name}/src/test/a11y/
  __tests__/
    screen-reader.test.tsx  - ARIA validation, announcements, semantic HTML
    keyboard.test.tsx       - Keyboard navigation, shortcuts, roving tabindex
    axe.test.tsx           - Automated axe-core WCAG testing
```

**Key Test Scenarios:**
1. Screen reader announcements for dynamic content (drag-and-drop, form validation)
2. Keyboard navigation patterns (Tab, Arrow keys, Enter, Escape)
3. ARIA attribute validation (labels, roles, states)
4. Live region testing (polite vs assertive, timing)
5. Focus management (where does focus go after actions?)
6. Semantic HTML validation (proper heading hierarchy, interactive elements)

**Coverage Targets:**
- 80%+ of a11y-critical components (forms, drag-and-drop, modals, navigation)
- All interactive elements tested for keyboard accessibility
- All dynamic announcements tested for screen reader feedback

### For UI/UX Worker

**Design Considerations:**

1. **Focus Indicators** - Ensure all interactive elements have visible focus indicators that meet WCAG 2.4.7 (2px outline, 3:1 contrast ratio)
2. **Screen Reader Instructions** - Hidden instructions should be concise and action-oriented ("Press Enter to submit" not "You can press Enter to submit if you want")
3. **Error Messages** - Form errors should be announced immediately (aria-live="assertive") with clear, actionable guidance
4. **Keyboard Shortcuts** - Document shortcuts in a centralized help modal, announce them to screen readers
5. **Color Contrast** - All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)

**Accessibility Checklist for New Components:**
- [ ] All interactive elements are keyboard accessible
- [ ] All images have alt text (decorative images use `alt=""`)
- [ ] All form inputs have associated labels
- [ ] All buttons have accessible names (aria-label or text content)
- [ ] All dynamic content changes are announced to screen readers
- [ ] All modals trap focus and return focus on close
- [ ] All drag-and-drop has keyboard alternative
- [ ] All custom controls have proper ARIA roles and states

### For Feasibility Worker

**Complexity Assessment:**

**Low Complexity (AC1-AC2):**
- Fixing misleading instructions and adding TagInput instructions are straightforward text changes
- Risk: Low - No behavioral changes, just improving existing a11y
- Effort: 1-2 days

**Medium Complexity (AC3-AC7):**
- Promoting test utilities requires creating new package and updating imports
- Adding a11y tests to each app requires understanding existing test patterns
- Risk: Medium - Need to ensure shared test utilities work across all apps
- Effort: 5-7 days (1-1.5 days per app for test coverage)

**High Complexity (AC8 - Out of Scope):**
- Visual regression testing is complex, requires infrastructure setup
- Focus management audit across all components is time-consuming
- Risk: High - Could expand scope significantly
- Effort: 5+ days (deferred to future story)

**Cross-Cutting Concerns:**
1. **Test Infrastructure** - Need to ensure all apps have consistent test setup for a11y utilities
2. **Package Dependencies** - New `@repo/accessibility/testing` package needs to be added to all app package.json files
3. **Documentation** - Need to document a11y testing patterns for future stories

**Estimated Story Points:** 8 points (1-2 weeks)

**Dependencies:**
- None - This story is independent and can start immediately

**Risks:**
- **Low Risk** - Most a11y patterns are already in place, this story is primarily additive (fixing minor issues + adding tests)
- **Mitigation** - Use existing wishlist-gallery tests as proven template, reuse across all apps
