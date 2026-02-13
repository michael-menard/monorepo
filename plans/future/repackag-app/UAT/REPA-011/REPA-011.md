---
id: REPA-011
title: "Standardize GalleryFilterBar Across Apps"
epic: REPACK
phase: 2
status: uat
priority: P3
story_points: 2
experiment_variant: control
created: 2026-02-10
risk_level: low
updated_at: "2026-02-10T21:10:00Z"
surfaces:
  frontend: true
  backend: false
  database: false
  infrastructure: false
---

# REPA-011: Standardize GalleryFilterBar Across Apps

## Context

The sets gallery (`app-sets-gallery`) currently uses a custom `GalleryFilterBar` implementation that duplicates ~135 lines of code from the shared `@repo/gallery` version. This custom implementation exists solely to support the build status filter (all/built/unbuilt), which is specific to the sets gallery.

The shared `GalleryFilterBar` component already has the extension mechanism needed to support app-specific filters via the `children` prop. This pattern is successfully used in the wishlist gallery for store tabs. The custom filter bar in sets gallery can be eliminated by:

1. Creating a dedicated `BuildStatusFilter` component
2. Using the shared `GalleryFilterBar` with the build status filter in the `children` slot
3. Deleting the duplicate custom filter bar code

**From Reality Baseline:**
- Shared GalleryFilterBar has `children` and `rightSlot` props for extensibility
- Custom GalleryFilterBar in app-sets-gallery is ~135 lines of duplicate code
- The only unique functionality is the build status filter dropdown
- Prop names differ between implementations (searchTerm vs search, sortField vs selectedSort)

**Related Work:**
- Story 3.0.5: Gallery Filter Components (created shared GalleryFilterBar)
- Wishlist gallery already uses shared GalleryFilterBar with custom filters (store tabs)

---

## Goal

Eliminate duplicate filter bar code by standardizing on the shared `GalleryFilterBar` across all gallery apps, with proper extension points for app-specific filters.

**Success Metrics:**
- Zero duplicate filter bar implementations
- All gallery apps using shared `@repo/gallery` components
- Extension pattern documented and reusable

---

## Non-Goals

### Explicitly Out of Scope

1. **Inspiration Gallery Refactoring**
   - app-inspiration-gallery has custom filter UI (not using GalleryFilterBar at all)
   - Larger effort, tracked separately (REPA-010 or future story)

2. **Active Filters Display Enhancement**
   - GalleryActiveFilters currently doesn't show custom filter chips (build status)
   - Deferred to Phase 3 follow-up story (REPA-012 candidate)

3. **Generalized StatusFilter Component**
   - BuildStatusFilter is sets-specific; no need to generalize until second use case
   - Future enhancement if other apps need status filters

4. **Filter Behavior Changes**
   - No changes to how filters work, only where code lives
   - Preserve existing filter functionality exactly

---

## Scope

### Packages Touched

**Modified:**
- `apps/web/app-sets-gallery` - create BuildStatusFilter, refactor main page

**Referenced (no changes):**
- `packages/core/gallery` - shared GalleryFilterBar
- `packages/core/app-component-library` - AppSelect component

### Endpoints
None - frontend-only refactoring

### Key Files

**New:**
- `apps/web/app-sets-gallery/src/components/BuildStatusFilter/index.tsx`
- `apps/web/app-sets-gallery/src/components/BuildStatusFilter/__types__/index.ts`

**Modified:**
- `apps/web/app-sets-gallery/src/pages/main-page.tsx`
- `apps/web/app-sets-gallery/src/pages/__tests__/main-page.test.tsx`

**Deleted:**
- `apps/web/app-sets-gallery/src/components/GalleryFilterBar.tsx` (135 lines)

---

## Acceptance Criteria

### Functional Requirements

- [ ] **AC1:** `BuildStatusFilter` component created in `apps/web/app-sets-gallery/src/components/`
- [ ] **AC2:** BuildStatusFilter uses `AppSelect` from `@repo/app-component-library`
- [ ] **AC3:** BuildStatusFilter has three options: "All statuses", "Built", "In Pieces"
- [ ] **AC4:** BuildStatusFilter accepts `value`, `onChange`, `className`, and `data-testid` props
- [ ] **AC5:** Sets gallery main page imports `GalleryFilterBar` from `@repo/gallery` (not local component)
- [ ] **AC6:** Build status filter renders in `children` slot of GalleryFilterBar
- [ ] **AC7:** View toggle renders in `rightSlot` of GalleryFilterBar
- [ ] **AC8:** All filter behaviors preserved (search, theme, build status, sort work identically)
- [ ] **AC9:** Filter combinations work (search + theme + build status + sort)
- [ ] **AC10:** Custom `GalleryFilterBar.tsx` deleted from app-sets-gallery

### Technical Requirements

- [ ] **AC11:** BuildStatusFilter uses Zod schemas for type definitions (no TypeScript interfaces)
- [ ] **AC12:** Prop names match shared GalleryFilterBar API (search, selectedSort, selectedTheme)
- [ ] **AC13:** All existing tests pass (100% pass rate)
- [ ] **AC14:** TypeScript compilation succeeds with no errors
- [ ] **AC15:** ESLint passes with no errors on changed files
- [ ] **AC16:** Responsive layout works on mobile viewports (320px, 375px, 768px)

### Documentation

- [ ] **AC17:** BuildStatusFilter has JSDoc comments explaining props and usage
- [ ] **AC18:** Story documentation updated with implementation notes

---

## Reuse Plan

### Existing Components Reused

1. **GalleryFilterBar** (`@repo/gallery`)
   - Main filter bar container with responsive layout
   - Extension points: `children` (custom filters), `rightSlot` (right-aligned controls)
   - Already handles search, tags, themes, sort, active filters display

2. **AppSelect** (`@repo/app-component-library`)
   - Dropdown component wrapping shadcn Select primitive
   - Used for theme filter, sort dropdown
   - Handles keyboard navigation, aria-labels, styling

3. **GalleryViewToggle** (`@repo/gallery`)
   - Grid/datatable view switcher
   - Already used in sets gallery
   - No changes needed

### New Components (Justified)

**BuildStatusFilter** (`apps/web/app-sets-gallery`)
- **Why app-specific:** Build status is sets-specific domain concept
- **Why not shared:** Not applicable to wishlist, instructions, or inspiration galleries
- **Future path:** If other apps need status filters, can generalize and promote to `@repo/gallery`

---

## Architecture Notes

### Component Structure

**BuildStatusFilter:**
```typescript
// __types__/index.ts
export const BuiltFilterValueSchema = z.enum(['all', 'built', 'unbuilt'])
export type BuiltFilterValue = z.infer<typeof BuiltFilterValueSchema>

export const BuildStatusFilterPropsSchema = z.object({
  value: BuiltFilterValueSchema,
  onChange: z.function().args(BuiltFilterValueSchema).returns(z.void()),
  className: z.string().optional(),
  'data-testid': z.string().optional(),
})
export type BuildStatusFilterProps = z.infer<typeof BuildStatusFilterPropsSchema>

// index.tsx
export function BuildStatusFilter({
  value,
  onChange,
  className,
  'data-testid': testId = 'build-status-filter',
}: BuildStatusFilterProps) {
  const options = [
    { value: 'all', label: 'All statuses' },
    { value: 'built', label: 'Built' },
    { value: 'unbuilt', label: 'In Pieces' },
  ]

  return (
    <div className={cn('min-w-[160px]', className)} data-testid={testId}>
      <AppSelect
        options={options}
        value={value}
        onValueChange={value => onChange((value as BuiltFilterValue) ?? 'all')}
        aria-label="Filter by build status"
      />
    </div>
  )
}
```

### Main Page Integration

**Before (custom GalleryFilterBar):**
```typescript
import { GalleryFilterBar } from '../components/GalleryFilterBar'

<GalleryFilterBar
  searchTerm={searchTerm}
  sortField={sortField}
  builtFilter={builtFilter}
  onBuiltFilterChange={handleBuiltFilterChange}
>
  <GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />
</GalleryFilterBar>
```

**After (shared GalleryFilterBar):**
```typescript
import { GalleryFilterBar } from '@repo/gallery'
import { BuildStatusFilter } from '../components/BuildStatusFilter'

<GalleryFilterBar
  search={searchTerm}
  onSearchChange={handleSearchChange}
  themes={availableThemes}
  selectedTheme={theme}
  onThemeChange={handleThemeChange}
  sortOptions={sortOptions}
  selectedSort={sortField}
  onSortChange={handleSortFieldChange}
  rightSlot={
    <GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />
  }
>
  <BuildStatusFilter
    value={builtFilter}
    onChange={handleBuiltFilterChange}
  />
</GalleryFilterBar>
```

**Key Changes:**
- Import from `@repo/gallery` instead of local component
- Update prop names (searchTerm → search, sortField → selectedSort)
- Move view toggle to `rightSlot` prop
- Add BuildStatusFilter to `children` slot

---

## Infrastructure Notes

Not applicable - frontend-only refactoring with no infrastructure changes.

---

## HTTP Contract Plan

Not applicable - no API changes.

---

## Seed Requirements

Not applicable - no data seeding required.

---

## Test Plan

**Full test plan:** See `_pm/TEST-PLAN.md`

### Unit Tests

**BuildStatusFilter Component:**
- Renders all three options
- Calls onChange with correct value
- Accepts className and data-testid props
- Has proper aria-label

**Commands:**
```bash
pnpm --filter app-sets-gallery test BuildStatusFilter
```

### Integration Tests

**Sets Main Page:**
- Renders with shared GalleryFilterBar
- Build status filter changes query parameters
- Filter combinations work (search + theme + build status + sort)
- View toggle interaction unchanged
- All existing tests pass

**Commands:**
```bash
pnpm --filter app-sets-gallery test main-page.test.tsx
```

### Manual Testing Checklist

- [ ] Search filter works
- [ ] Theme filter dropdown works
- [ ] Build status filter dropdown works
- [ ] Sort dropdown works
- [ ] View toggle (grid/datatable) works
- [ ] Filters can be combined
- [ ] Responsive layout on mobile (375px viewport)
- [ ] Keyboard navigation through all filters
- [ ] Screen reader announces filters correctly

---

## UI/UX Notes

**Full UI/UX notes:** See `_pm/UIUX-NOTES.md`

**Verdict:** PASS-WITH-NOTES

### MVP-Critical Requirements

1. **BuildStatusFilter Styling:**
   - Must match visual style of theme filter (min-width, spacing, font)
   - Uses AppSelect component (already consistent)
   - Visual QA required

2. **Accessibility:**
   - aria-label="Filter by build status" on dropdown
   - Keyboard navigation works (Enter/Space to open, Arrow keys to select)
   - Focus indicators visible

3. **Responsive Layout:**
   - Filters stack vertically on mobile
   - Touch targets meet 44x44px minimum
   - BuildStatusFilter renders correctly in stacked layout

### Design System Compliance

- ✅ Token-only colors (via AppSelect)
- ✅ Uses `@repo/app-component-library` components (no direct shadcn imports)
- ✅ Zod-first types (no TypeScript interfaces)

### Known Limitations (Not MVP-Blocking)

1. **Active Filters Display:** Build status filter NOT shown in active filters chips
2. **Clear All Filters:** May not reset build status filter (depends on onClearAll implementation)

---

## Reality Baseline

**Codebase Snapshot:** Main branch (commit 8f33f014)
**Generated:** 2026-02-10

### Current State

**Shared GalleryFilterBar** (`@repo/gallery`):
- Location: `packages/core/gallery/src/components/GalleryFilterBar.tsx`
- Features: Search, tags, themes, sort, active filters
- Extension points: `children` (custom filters), `rightSlot` (right-aligned controls)
- Used by: wishlist-gallery (with store tabs), instructions-gallery

**Custom GalleryFilterBar** (`app-sets-gallery`):
- Location: `apps/web/app-sets-gallery/src/components/GalleryFilterBar.tsx`
- Size: ~135 lines
- Unique feature: Build status filter (hardcoded)
- Duplicate features: Search, theme dropdown, sort dropdown
- Prop differences: searchTerm vs search, sortField vs selectedSort

### Related Files

**Reference (no changes):**
- `packages/core/gallery/src/components/GalleryFilterBar.tsx` - shared component
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx` - usage example (store tabs)
- `apps/web/app-instructions-gallery/src/pages/main-page.tsx` - usage example (rightSlot)

**Files Scanned:** 12 key files + 93 related documentation files

---

## Risk Predictions

```yaml
predictions:
  split_risk: 0.3
  review_cycles: 2
  token_estimate: 100000
  confidence: low
  similar_stories: []
  generated_at: "2026-02-10T00:00:00Z"
  model: haiku
  wkfl_version: "007-v1"
```

**Rationale:**
- **split_risk (0.3):** Low risk - simple refactoring with well-defined scope, no dependencies
- **review_cycles (2):** One initial review, likely one follow-up for test updates
- **token_estimate (100K):** Conservative estimate for 2 SP refactoring story
- **confidence (low):** No similar stories available in KB for comparison

---

## Dependencies & Blockers

### Dependencies
None - this story is independent and can be implemented immediately.

### Blockers
None - all required extension points already exist in shared GalleryFilterBar.

---

## Implementation Notes

### Execution Order

1. **Create BuildStatusFilter Component** (0.5 SP)
   - Create directory structure
   - Implement component with Zod types
   - Unit tests

2. **Refactor Sets Main Page** (0.5 SP)
   - Update imports
   - Update prop names
   - Move view toggle to rightSlot
   - Add BuildStatusFilter to children slot

3. **Delete Custom Filter Bar** (0.25 SP)
   - Remove custom GalleryFilterBar.tsx
   - Verify no other imports

4. **Update Tests** (0.5 SP)
   - Update test selectors if needed
   - Verify all tests pass
   - Add BuildStatusFilter unit tests

5. **Verification** (0.25 SP)
   - Manual testing
   - Responsive layout verification
   - Accessibility testing

**Total:** 2 SP

### Quality Gates

All must pass before story completion:
- ✅ All unit tests pass (100% pass rate)
- ✅ All integration tests pass (100% pass rate)
- ✅ TypeScript compilation succeeds
- ✅ ESLint passes with no errors
- ✅ Production build succeeds
- ✅ Manual testing checklist completed
- ✅ Accessibility verified (keyboard nav, screen reader)

---

## Future Enhancements

See `_pm/FUTURE-UIUX.md` and `_pm/FUTURE-RISKS.md` for non-MVP enhancements:

1. **Active Filters Enhancement** - Show build status in active filters chips
2. **Clear All Filters** - Ensure onClearAll resets build status
3. **Filter Tooltips** - Explain filter purpose on hover
4. **Filter Icons** - Add visual icons to filters
5. **Generalized StatusFilter** - If other apps need status filters

---

## Success Criteria

**Story Complete When:**
- ✅ All 18 acceptance criteria met
- ✅ BuildStatusFilter component created and tested
- ✅ Sets gallery uses shared GalleryFilterBar
- ✅ Custom GalleryFilterBar deleted (135 lines removed)
- ✅ All existing filter functionality preserved
- ✅ All tests pass
- ✅ Quality gates passed

---

**Story Author:** PM Story Generation Leader (Sonnet 4.5)
**Generated:** 2026-02-10
**Status:** Backlog - Ready for Implementation
**Next Action:** Assign to developer for Sprint 1 implementation

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-10_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps identified | — | — |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Decision |
|---|---------|----------|----------|
| 1 | Active Filters Display: Build status filter NOT shown in active filters chips | feature-gap | KB-logged |
| 2 | Clear All Filters: May not reset build status filter depending on onClearAll implementation | edge-case | KB-logged |
| 3 | Filter Keyboard Navigation: Build status filter keyboard accessibility not explicitly tested | testing | KB-logged |
| 4 | Filter Tooltips: No tooltips explaining filter purpose | ux-enhancement | KB-logged |
| 5 | Filter Icons: Build status filter has no visual icon | ux-enhancement | KB-logged |
| 6 | Generalized StatusFilter Component: BuildStatusFilter is sets-specific | reusability | KB-logged |
| 7 | Filter State Persistence: Build status filter not persisted to URL or localStorage | integration | KB-logged |
| 8 | Filter Analytics: No tracking for build status filter usage | observability | KB-logged |
| 9 | Mobile Filter Panel: Filters could be collapsed into drawer on mobile for better space usage | ux-enhancement | KB-logged |
| 10 | Filter Presets: No quick filter presets (e.g., 'Recently Built', 'Unbuilt Modulars') | ux-enhancement | KB-logged |
| 11 | Filter Count Badges: No indication of how many items match each filter option | ux-enhancement | KB-logged |
| 12 | Responsive Layout Testing: Manual testing checklist mentions 375px viewport but not 320px or 768px | testing | KB-logged |
| 13 | BuildStatusFilter Test Coverage: No dedicated test file created in story scope | code-quality | KB-logged |

### Summary

- ACs added: 0
- KB entries deferred: 13 (no MVP-critical gaps)
- Mode: autonomous
- Audit Result: All 8 checks PASS - story ready for implementation
