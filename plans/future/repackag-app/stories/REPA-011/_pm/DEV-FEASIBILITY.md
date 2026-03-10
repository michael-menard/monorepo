# DEV-FEASIBILITY.md - REPA-011: Standardize GalleryFilterBar Across Apps

**Story ID:** REPA-011
**Epic:** REPACK
**Created:** 2026-02-10
**Author:** PM Dev Feasibility Reviewer (Haiku)

---

## Feasibility Summary

**Feasible for MVP:** Yes
**Confidence:** High
**Why:** All required extension points already exist in shared GalleryFilterBar. Simple refactoring with well-defined scope and no dependencies.

**Key Success Factors:**
- Shared GalleryFilterBar already has `children` and `rightSlot` props
- BuildStatusFilter is a thin wrapper around existing AppSelect component
- No API or database changes required
- Pattern already proven in wishlist-gallery (store tabs use children slot)
- TypeScript will catch most prop mapping errors at compile time

---

## Likely Change Surface (Core Only)

### Packages Modified

1. **apps/web/app-sets-gallery** (PRIMARY)
   - New: `src/components/BuildStatusFilter/index.tsx`
   - New: `src/components/BuildStatusFilter/__types__/index.ts`
   - Edit: `src/pages/main-page.tsx` (refactor to use shared GalleryFilterBar)
   - Edit: `src/pages/__tests__/main-page.test.tsx` (update tests)
   - Delete: `src/components/GalleryFilterBar.tsx` (custom filter bar, 135 lines)

2. **packages/core/gallery** (READ-ONLY)
   - No changes - reference only
   - `src/components/GalleryFilterBar.tsx` (shared component)

3. **packages/core/app-component-library** (READ-ONLY)
   - No changes - reference only
   - AppSelect component (used in BuildStatusFilter)

### Endpoints Touched
None - frontend-only refactoring

### Deploy Touchpoints
- Frontend deployment only (sets gallery app)
- No backend or infrastructure changes
- No database migrations
- No feature flags required (optional: add flag if cautious rollout desired)

---

## MVP-Critical Risks (Max 5)

### Risk 1: Prop Name Mapping Errors

**Description:**
Custom GalleryFilterBar uses different prop names than shared version (searchTerm vs search, sortField vs selectedSort).

**Why it blocks MVP:**
If prop names not updated correctly, filters won't work and users can't filter sets gallery.

**Required Mitigation:**
- Careful prop mapping during refactoring (search, selectedTheme, selectedSort, etc.)
- TypeScript compilation will catch most errors
- Run existing tests to verify filter behavior unchanged
- Manual testing of all filter combinations before deployment

**Confidence:** Low risk - TypeScript provides strong guardrails

---

### Risk 2: Test Failures After Refactoring

**Description:**
Existing tests may use selectors specific to custom GalleryFilterBar. Shared component may have different data-testid or DOM structure.

**Why it blocks MVP:**
Tests must pass before deployment per quality gates. Failing tests block merge.

**Required Mitigation:**
- Review existing tests before refactoring (main-page.test.tsx)
- Update test selectors to match shared GalleryFilterBar structure
- Use semantic queries (getByRole, getByLabelText) which are more resilient
- Verify all existing tests pass after refactoring

**Confidence:** Medium risk - tests may need significant updates, but well-understood problem

---

### Risk 3: Missing BuildStatusFilter Styling

**Description:**
BuildStatusFilter must visually match existing filters (theme, sort). If min-width, spacing, or font size differs, UI looks inconsistent.

**Why it blocks MVP:**
Inconsistent UI creates poor user experience and violates design system rules.

**Required Mitigation:**
- Use same AppSelect component as theme filter
- Apply min-w-[160px] class (matches other filters)
- Visual QA: Compare BuildStatusFilter to theme filter side-by-side
- Screenshot comparison test (optional but recommended)

**Confidence:** Low risk - AppSelect already handles styling consistently

---

### Risk 4: Responsive Layout Regressions

**Description:**
GalleryFilterBar responsive behavior may differ from custom filter bar on mobile viewports. BuildStatusFilter placement in children slot may not stack correctly.

**Why it blocks MVP:**
Mobile users (significant portion of traffic) must be able to use filters. Broken mobile layout blocks launch.

**Required Mitigation:**
- Test on mobile viewports (320px, 375px, 768px) before deployment
- Reference wishlist-gallery mobile behavior (already uses children slot)
- Manual testing on real iOS and Android devices
- Playwright mobile viewport test (recommended)

**Confidence:** Low-Medium risk - GalleryFilterBar already handles responsive layout, but manual testing required

---

### Risk 5: Filter State Management Errors

**Description:**
Sets main page manages build status state (builtFilter, handleBuiltFilterChange). If state handlers not wired correctly to new component structure, filter won't work.

**Why it blocks MVP:**
Build status filter is the key value-add of this story. If it doesn't work, story provides no benefit.

**Required Mitigation:**
- Verify builtFilter state passed to BuildStatusFilter value prop
- Verify handleBuiltFilterChange passed to BuildStatusFilter onChange prop
- Test all filter state combinations (search + theme + build status + sort)
- Add integration test for build status filter state changes

**Confidence:** Low risk - state management is straightforward, TypeScript helps

---

## Missing Requirements for MVP

### None Identified

All requirements are clearly defined in story seed:
- BuildStatusFilter component API specified
- Prop mapping documented
- File changes enumerated
- Test requirements outlined
- Acceptance criteria clear

**No PM decisions required to proceed with implementation.**

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Component Renders:**
   - Screenshot of sets gallery with BuildStatusFilter in filter bar
   - BuildStatusFilter visually matches theme filter
   - All filters present (search, theme, build status, sort, view toggle)

2. **Filters Work:**
   - Video or GIF of selecting "Built" from build status filter
   - Gallery results update to show only built sets
   - URL query parameter updates (built=built)
   - Filters can be combined (search + theme + build status + sort)

3. **Tests Pass:**
   - Test output showing all unit tests pass (100% pass rate)
   - Test output showing all integration tests pass
   - Coverage report meeting 45% global minimum

4. **Responsive Layout:**
   - Screenshot of mobile layout (375px viewport)
   - Filters stack vertically
   - BuildStatusFilter renders correctly on mobile

5. **Code Quality:**
   - TypeScript compilation succeeds (tsc --noEmit)
   - ESLint passes with no errors
   - Production build succeeds (pnpm build)

### Critical CI/Deploy Checkpoints

1. **Pre-Merge:**
   - All tests pass
   - Type check passes
   - Lint passes
   - Build succeeds

2. **Post-Deploy:**
   - Sets gallery loads without errors
   - All filters functional in production
   - No console errors
   - Mobile layout verified

---

## Technical Implementation Notes

### BuildStatusFilter Component Structure

**Recommended Implementation:**

```typescript
// apps/web/app-sets-gallery/src/components/BuildStatusFilter/__types__/index.ts
import { z } from 'zod'

export const BuiltFilterValueSchema = z.enum(['all', 'built', 'unbuilt'])
export type BuiltFilterValue = z.infer<typeof BuiltFilterValueSchema>

export const BuildStatusFilterPropsSchema = z.object({
  value: BuiltFilterValueSchema,
  onChange: z.function().args(BuiltFilterValueSchema).returns(z.void()),
  className: z.string().optional(),
  'data-testid': z.string().optional().default('build-status-filter'),
})
export type BuildStatusFilterProps = z.infer<typeof BuildStatusFilterPropsSchema>

// apps/web/app-sets-gallery/src/components/BuildStatusFilter/index.tsx
import { AppSelect } from '@repo/app-component-library'
import { cn } from '@repo/ui/utils'
import type { BuildStatusFilterProps, BuiltFilterValue } from './__types__'

export function BuildStatusFilter({
  value,
  onChange,
  className,
  'data-testid': testId = 'build-status-filter',
}: BuildStatusFilterProps) {
  const options: { value: BuiltFilterValue; label: string }[] = [
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

### Main Page Refactoring

**Key Changes:**

1. **Import Updates:**
   ```typescript
   // OLD
   import { GalleryFilterBar } from '../components/GalleryFilterBar'
   
   // NEW
   import { GalleryFilterBar } from '@repo/gallery'
   import { BuildStatusFilter } from '../components/BuildStatusFilter'
   ```

2. **Prop Name Updates:**
   ```typescript
   // OLD props
   searchTerm={searchTerm}
   sortField={sortField}
   builtFilter={builtFilter}  // Custom prop
   onBuiltFilterChange={handleBuiltFilterChange}  // Custom prop
   
   // NEW props
   search={searchTerm}
   selectedSort={sortField}
   // Build status passed via children slot
   ```

3. **Component Structure:**
   ```typescript
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

---

## Reuse-First Verification

### Existing Components Reused

✅ **GalleryFilterBar** (@repo/gallery)
- Already has extension points (children, rightSlot)
- Battle-tested in wishlist-gallery and instructions-gallery
- Handles responsive layout, accessibility, filter state display

✅ **AppSelect** (@repo/app-component-library)
- Wraps shadcn Select primitive
- Used consistently across all gallery filters
- Handles keyboard navigation, aria-labels, styling

✅ **GalleryViewToggle** (@repo/gallery)
- Already used in sets gallery
- No changes needed

### New Components (Justified)

✅ **BuildStatusFilter** (app-sets-gallery)
- App-specific domain concept (build status is sets-specific)
- Not applicable to other galleries (wishlist, instructions, inspiration)
- Follows pattern: domain-specific filters live in app directories
- If other apps need similar filters in future, can promote to shared package

---

## Dependency Analysis

### No External Dependencies

- No new npm packages required
- No new monorepo packages required
- All dependencies already in place:
  - @repo/gallery (existing)
  - @repo/app-component-library (existing)
  - @repo/ui (existing)

### No Story Dependencies

- No dependencies on other REPA stories
- Can be implemented immediately
- Does not block or depend on REPA-001 through REPA-010

### No Feature Flag Dependencies

- Optional: Can add feature flag if cautious rollout desired
- Not required: Low-risk refactoring, no user-facing changes to functionality
- Recommendation: Deploy without flag (saves complexity)

---

## Architecture Compliance

### Monorepo Structure

✅ Follows established patterns:
- App-specific components in `apps/web/app-sets-gallery/src/components/`
- Shared components in `packages/core/gallery/`
- No cross-app imports (only package imports)

### Component Architecture

✅ Follows design system rules:
- Uses shadcn primitives via @repo/app-component-library
- Token-only colors (no hardcoded hex values)
- Zod-first types (no TypeScript interfaces)
- Functional components only

### Testing Strategy

✅ Follows testing standards:
- Vitest + React Testing Library for unit/integration tests
- Semantic queries (getByRole, getByLabelText)
- 45% global coverage minimum
- Manual testing for accessibility and responsive design

---

## Success Criteria

**Dev Feasibility Pass Criteria:**
- ✅ All MVP-critical risks have mitigation plans
- ✅ No blocking dependencies identified
- ✅ Implementation approach clear and documented
- ✅ Reuse-first principle followed
- ✅ Architecture compliance verified
- ✅ Evidence expectations defined
- ✅ Estimate aligns with scope (2 SP reasonable)

---

**Dev Feasibility Review Complete**
**Status:** FEASIBLE FOR MVP
**Confidence:** HIGH
**Ready for Implementation**

**Recommendation:** Proceed with story implementation. Risk level is LOW with well-defined scope and clear mitigation strategies.
