# UIUX-NOTES.md - REPA-011: Standardize GalleryFilterBar Across Apps

**Story ID:** REPA-011
**Epic:** REPACK
**Created:** 2026-02-10
**Author:** PM UI/UX Advisor (Haiku)

---

## Verdict

**PASS-WITH-NOTES**

This story touches UI (sets gallery filter bar) but is primarily a refactoring effort. The shared GalleryFilterBar component is already MVP-ready and battle-tested in other gallery apps. BuildStatusFilter is a simple wrapper around existing AppSelect primitive.

**Notes:**
- No new UI patterns needed - reusing existing components
- Accessibility already established in shared GalleryFilterBar
- Minor risk: Ensure BuildStatusFilter matches visual style of other filters

---

## MVP Component Architecture

### Core Components Required

1. **BuildStatusFilter** (NEW)
   - Location: `apps/web/app-sets-gallery/src/components/BuildStatusFilter/`
   - Reuse: `AppSelect` from `@repo/app-component-library`
   - Purpose: App-specific filter for build status (all/built/unbuilt)

2. **GalleryFilterBar** (REUSE)
   - Location: `@repo/gallery`
   - Already has extension points (`children`, `rightSlot`)
   - Used successfully in wishlist-gallery and instructions-gallery

3. **GalleryViewToggle** (REUSE)
   - Location: `@repo/gallery`
   - Renders in `rightSlot` of GalleryFilterBar
   - No changes needed

### Reuse Targets

**From `@repo/gallery`:**
- `GalleryFilterBar` - Main filter bar container with responsive layout
- `GalleryViewToggle` - Grid/datatable view switcher

**From `@repo/app-component-library`:**
- `AppSelect` - Dropdown primitive for BuildStatusFilter

**Shadcn Primitives:**
- No direct primitives usage - AppSelect already wraps shadcn Select

---

## MVP Accessibility (Blocking Only)

### Critical Requirements

1. **BuildStatusFilter Accessibility**
   - ✅ `aria-label="Filter by build status"` on AppSelect
   - ✅ Keyboard navigable (Enter/Space to open, Arrow keys to select, Escape to close)
   - ✅ Focus indicator visible
   - ✅ Selected value announced to screen readers

2. **GalleryFilterBar Accessibility** (Already Implemented)
   - ✅ All filter controls keyboard accessible
   - ✅ Logical focus order (top to bottom, left to right)
   - ✅ Search input has placeholder text
   - ✅ Dropdowns have aria-labels
   - ✅ No keyboard traps

3. **Responsive Layout Accessibility**
   - ✅ Touch targets meet 44x44px minimum on mobile
   - ✅ Text remains readable when zoomed to 200%
   - ✅ Controls remain accessible in stacked mobile layout

### Testing Requirements

- [ ] Keyboard navigation through all filter controls
- [ ] Screen reader announces BuildStatusFilter correctly
- [ ] Focus indicators visible on all interactive elements
- [ ] No axe-core accessibility violations in filter bar region

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**BuildStatusFilter:**
- Use existing AppSelect component (already token-compliant)
- No custom color styling needed
- Inherits theme colors from GalleryFilterBar

**Verification:**
```bash
# Search for hardcoded colors (should find none in BuildStatusFilter)
grep -r "bg-\[#" apps/web/app-sets-gallery/src/components/BuildStatusFilter/
grep -r "text-\[#" apps/web/app-sets-gallery/src/components/BuildStatusFilter/
```

### `_primitives` Import Requirement

**BuildStatusFilter:**
- ✅ Uses `AppSelect` from `@repo/app-component-library` (wraps shadcn Select)
- ✅ No direct shadcn imports needed
- ✅ Follows established pattern (same as theme filter in GalleryFilterBar)

**Import Pattern:**
```typescript
// CORRECT
import { AppSelect } from '@repo/app-component-library'

// WRONG (do not import shadcn directly)
import { Select } from '@repo/ui/_primitives/select'
```

---

## MVP Playwright Evidence

### Core Journey Demonstration

**User Story:** As a sets gallery user, I want to filter sets by build status so I can see only built sets or sets in pieces.

**Playwright Test Steps:**

1. **Navigate to sets gallery**
   ```typescript
   await page.goto('/gallery/sets')
   await expect(page.locator('[data-testid="sets-gallery"]')).toBeVisible()
   ```

2. **Verify BuildStatusFilter present**
   ```typescript
   const buildStatusFilter = page.getByRole('combobox', { name: 'Filter by build status' })
   await expect(buildStatusFilter).toBeVisible()
   ```

3. **Select "Built" from build status filter**
   ```typescript
   await buildStatusFilter.click()
   await page.getByRole('option', { name: 'Built' }).click()
   ```

4. **Verify gallery filtered by build status**
   ```typescript
   await expect(page).toHaveURL(/built=built/)
   // Verify only built sets displayed (implementation-specific)
   ```

5. **Verify other filters still work**
   ```typescript
   await page.getByPlaceholder('Search sets...').fill('castle')
   await expect(page).toHaveURL(/search=castle&built=built/)
   ```

6. **Verify responsive layout on mobile**
   ```typescript
   await page.setViewportSize({ width: 375, height: 667 })
   await expect(buildStatusFilter).toBeVisible()
   // Verify filters stack vertically
   ```

---

## Non-MVP Items (Deferred to FUTURE-UIUX.md)

The following items are NOT blocking MVP launch but should be considered for future enhancements:

1. **Active Filters Badge for Build Status**
   - Currently, GalleryActiveFilters only shows tags and theme
   - Build status filter not displayed in active filters chips
   - User impact: Minor - users can still see selected value in dropdown

2. **Clear All Filters Enhancement**
   - Current `onClearAll` may not reset build status filter
   - Requires handler update to include build status reset
   - User impact: Minor - filters can be reset individually

3. **Visual Consistency Polish**
   - Ensure BuildStatusFilter matches exact spacing/sizing of theme filter
   - Minor visual refinements if needed
   - User impact: None - purely polish

---

## Design System Compliance Checklist

**Pre-Implementation:**
- [x] Component uses AppSelect from @repo/app-component-library
- [x] No direct shadcn imports
- [x] No hardcoded colors (token-only)
- [x] Accessibility requirements defined

**During Implementation:**
- [ ] BuildStatusFilter uses cn utility for className merging
- [ ] Component accepts className prop for flexibility
- [ ] aria-label present on AppSelect
- [ ] data-testid present for testing
- [ ] TypeScript types use Zod schemas

**Post-Implementation:**
- [ ] Visual QA: BuildStatusFilter matches theme filter style
- [ ] Accessibility QA: Keyboard navigation works
- [ ] Accessibility QA: Screen reader announces correctly
- [ ] Responsive QA: Mobile layout verified
- [ ] Design system QA: No hardcoded colors found

---

## Known Limitations (Not MVP-Blocking)

1. **Active Filters Display:**
   - Build status filter does NOT appear in active filters chips
   - Future enhancement: Extend GalleryActiveFilters to support custom filters
   - Workaround: Selected value visible in dropdown

2. **Clear All Behavior:**
   - `onClearAll` may not reset build status filter (depends on implementation)
   - Future enhancement: Update onClearAll to reset all filters including custom ones
   - Workaround: Users can manually reset build status to "All statuses"

3. **Filter Persistence:**
   - Build status persists via query params (good)
   - No localStorage caching (consistent with other filters)
   - Not a limitation - query params are sufficient

---

## Cross-Reference: Related Components

**Similar Patterns in Codebase:**

1. **Wishlist Gallery Store Tabs**
   - Uses GalleryFilterBar `children` slot for custom filters
   - Pattern: `<GalleryFilterBar>{customFilterUI}</GalleryFilterBar>`
   - Location: `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

2. **Instructions Gallery**
   - Uses GalleryFilterBar `rightSlot` for view toggle
   - Pattern: `<GalleryFilterBar rightSlot={<GalleryViewToggle />} />`
   - Location: `apps/web/app-instructions-gallery/src/pages/main-page.tsx`

3. **BuildStatusFilter Parallels Theme Filter**
   - Both use AppSelect
   - Both have 3+ options
   - Both are single-select dropdowns
   - Location: GalleryFilterBar theme filter implementation

---

## Success Criteria

**UI/UX Pass Criteria:**
- ✅ BuildStatusFilter visually consistent with theme filter
- ✅ Responsive layout works on desktop, tablet, mobile
- ✅ Keyboard navigation functions correctly
- ✅ Screen reader accessibility verified
- ✅ No hardcoded colors used
- ✅ Design system rules followed (token-only, _primitives pattern)
- ✅ Playwright test demonstrates core journey

---

**UI/UX Notes Complete**
**Status:** PASS-WITH-NOTES
**Ready for Implementation**

**Next Steps:**
- Implement BuildStatusFilter component
- Refactor sets main page to use shared GalleryFilterBar
- Verify accessibility and responsive design
- Document any deviations from design system in FUTURE-UIUX.md
