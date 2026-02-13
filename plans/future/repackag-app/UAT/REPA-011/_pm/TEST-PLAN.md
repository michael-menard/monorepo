# TEST-PLAN.md - REPA-011: Standardize GalleryFilterBar Across Apps

**Story ID:** REPA-011
**Epic:** REPACK
**Created:** 2026-02-10
**Author:** PM Test Plan Writer (Haiku)

---

## Scope Summary

### Changes Surface
- **Endpoints touched:** None (frontend-only refactoring)
- **UI touched:** Yes
  - Sets gallery main page (filter bar)
  - BuildStatusFilter component (new)
- **Data/Storage touched:** No (no database or API changes)

### Packages Modified
- `apps/web/app-sets-gallery` (refactored to use shared GalleryFilterBar)
- `packages/core/gallery` (read-only reference, no changes)

---

## Happy Path Tests

### Test 1: BuildStatusFilter Component Renders Correctly
**Setup:**
- Import BuildStatusFilter component
- Mount with default props (value='all', onChange handler)

**Action:**
- Render component
- Open dropdown

**Expected Outcome:**
- Component renders without errors
- Dropdown shows 3 options: "All statuses", "Built", "In Pieces"
- aria-label is "Filter by build status"
- Minimum width is 160px

**Evidence:**
- Unit test assertion: `expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Filter by build status')`
- Unit test assertion: `expect(screen.getAllByRole('option')).toHaveLength(3)`
- Visual snapshot test (optional)

---

### Test 2: BuildStatusFilter onChange Callback
**Setup:**
- Mock onChange handler
- Render BuildStatusFilter with value='all'

**Action:**
- User selects "Built" option from dropdown

**Expected Outcome:**
- onChange called with 'built'
- Dropdown value updates to "Built"

**Evidence:**
- Unit test assertion: `expect(mockOnChange).toHaveBeenCalledWith('built')`
- Component re-renders with new value

---

### Test 3: Sets Gallery Filter Bar Integration
**Setup:**
- Navigate to sets gallery main page
- Verify GalleryFilterBar is imported from `@repo/gallery`

**Action:**
- Load page
- Observe filter bar layout

**Expected Outcome:**
- Filter bar renders with:
  - Search input
  - Theme dropdown
  - Sort dropdown
  - BuildStatusFilter (in children slot, above search/sort)
  - View toggle (in rightSlot, right-aligned)
- All filters display correctly
- Responsive layout works on desktop

**Evidence:**
- Integration test: `expect(screen.getByPlaceholderText('Search sets...')).toBeInTheDocument()`
- Integration test: `expect(screen.getByLabelText('Filter by build status')).toBeInTheDocument()`
- Integration test: `expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument()`

---

### Test 4: Filter Combinations Work
**Setup:**
- Sets gallery main page loaded
- No filters active initially

**Action:**
1. Enter "castle" in search input
2. Select "Castle" theme
3. Select "Built" build status
4. Select "Name (A-Z)" sort

**Expected Outcome:**
- All filters applied simultaneously
- Gallery results filtered and sorted correctly
- URL query parameters updated:
  - `?search=castle&theme=Castle&built=built&sort=name`

**Evidence:**
- Integration test: Mock gallery API response filtered by criteria
- Integration test: Verify correct API call with combined filters
- Integration test: Assert URL contains expected query params

---

### Test 5: View Toggle Interaction Preserved
**Setup:**
- Sets gallery main page loaded
- Default view is grid

**Action:**
- Click view toggle button to switch to datatable view

**Expected Outcome:**
- View changes to datatable layout
- Filter bar remains visible and functional
- All active filters persist across view change

**Evidence:**
- Integration test: `expect(screen.getByRole('table')).toBeInTheDocument()` (datatable view)
- Integration test: Filters remain applied after view toggle

---

## Error Cases

### Error 1: BuildStatusFilter Invalid Value
**Setup:**
- Render BuildStatusFilter with invalid value (e.g., 'invalid')

**Action:**
- Component renders

**Expected Outcome:**
- Component defaults to 'all' if invalid value provided
- No console errors
- Dropdown shows "All statuses" selected

**Evidence:**
- Unit test: Component handles gracefully, no errors thrown
- Unit test: `expect(screen.getByRole('combobox')).toHaveValue('all')`

---

### Error 2: Missing onChange Handler
**Setup:**
- Render BuildStatusFilter without onChange prop

**Action:**
- User attempts to select an option

**Expected Outcome:**
- TypeScript compile error (onChange is required in type signature)
- If runtime bypass attempted, component doesn't crash

**Evidence:**
- TypeScript compilation failure if onChange omitted
- Runtime test: Component renders but selection is no-op

---

## Edge Cases (Reasonable)

### Edge 1: Responsive Layout - Mobile Viewport
**Setup:**
- Sets gallery main page
- Set viewport to mobile size (375px width)

**Action:**
- Load page
- Observe filter bar layout

**Expected Outcome:**
- Filter bar stacks vertically on mobile
- BuildStatusFilter renders correctly in stacked layout
- All filters remain accessible
- View toggle moves to appropriate position (per GalleryFilterBar responsive design)

**Evidence:**
- Manual testing: Verify on mobile device or Chrome DevTools
- Playwright test: `await page.setViewportSize({ width: 375, height: 667 })`
- Playwright test: Screenshot comparison (optional)

---

### Edge 2: Keyboard Navigation
**Setup:**
- Sets gallery main page loaded
- User navigates via keyboard only

**Action:**
1. Tab through filter controls
2. Use Enter/Space to activate dropdowns
3. Use arrow keys to navigate dropdown options
4. Use Enter to select option

**Expected Outcome:**
- All filter controls are keyboard accessible
- Focus indicators visible
- BuildStatusFilter dropdown opens/closes with keyboard
- Selections work via keyboard

**Evidence:**
- Manual testing: Full keyboard navigation test
- Playwright test: `await page.keyboard.press('Tab')` sequence
- Accessibility audit: No keyboard trap violations

---

### Edge 3: Screen Reader Accessibility
**Setup:**
- Sets gallery main page loaded
- Screen reader active (e.g., NVDA, JAWS, VoiceOver)

**Action:**
- Navigate through filter bar with screen reader

**Expected Outcome:**
- All filter labels announced correctly
- BuildStatusFilter announced as "Filter by build status, combobox"
- Selected option announced when dropdown opened
- No unlabeled controls

**Evidence:**
- Manual testing: Screen reader announces all controls properly
- Accessibility audit: All form controls have accessible names
- axe-core violations: 0 for filter bar region

---

### Edge 4: Clear All Filters
**Setup:**
- Sets gallery main page
- Multiple filters active (search, theme, build status, sort)

**Action:**
- Click "Clear all" button (if available in GalleryFilterBar)

**Expected Outcome:**
- Search cleared
- Theme reset to "All themes"
- Sort reset to default
- **Build status reset to "all"** (requires onClearAll handler update)

**Evidence:**
- Integration test: Verify all filters reset to initial state
- **NOTE:** Per seed, build status may NOT be included in current clear all logic - document as known limitation

---

## Required Tooling Evidence

### Backend
**Not Applicable:** This story is frontend-only with no API changes.

---

### Frontend (UI Touched)

#### Vitest Unit Tests
**Location:** `apps/web/app-sets-gallery/src/components/BuildStatusFilter/__tests__/`

**Required Tests:**
1. BuildStatusFilter renders all options
2. BuildStatusFilter calls onChange with correct value
3. BuildStatusFilter accepts className prop
4. BuildStatusFilter accepts data-testid prop
5. BuildStatusFilter has aria-label

**Commands:**
```bash
pnpm --filter app-sets-gallery test
pnpm --filter app-sets-gallery test -- --coverage
```

**Coverage Target:** 80%+ for BuildStatusFilter component

---

#### Vitest Integration Tests
**Location:** `apps/web/app-sets-gallery/src/pages/__tests__/main-page.test.tsx`

**Required Tests:**
1. Main page renders with shared GalleryFilterBar
2. Build status filter changes query parameters correctly
3. Filter combinations work (search + theme + build status + sort)
4. View toggle interaction unchanged
5. All existing tests continue to pass

**Commands:**
```bash
pnpm --filter app-sets-gallery test main-page.test.tsx
```

**Assertions:**
- Existing test count: 15+ (per seed reference)
- All existing tests pass with minimal changes
- New tests for BuildStatusFilter integration

---

#### Playwright E2E Tests (Optional but Recommended)
**Location:** `apps/web/playwright/tests/sets-gallery.spec.ts`

**Recommended Tests:**
1. Filter bar visual regression test (screenshot comparison)
2. Build status filter E2E interaction
3. Mobile responsive layout test
4. Keyboard navigation test

**Commands:**
```bash
pnpm --filter playwright test sets-gallery
pnpm --filter playwright test sets-gallery --debug
```

**Artifacts:**
- Screenshots (for visual regression)
- Trace files (if test fails)
- Video recordings (for debugging)

---

## Risks to Call Out

### Risk 1: Test Selector Changes
**Impact:** Medium
**Description:** If GalleryFilterBar uses different data-testid or role attributes than custom filter bar, existing tests may break.

**Mitigation:**
- Review shared GalleryFilterBar component for test selectors before refactoring
- Update main-page.test.tsx selectors to match shared component
- Use semantic queries (getByRole, getByLabelText) which are more resilient

---

### Risk 2: Active Filters Display
**Impact:** Low
**Description:** Per seed, GalleryActiveFilters may NOT show build status filter badge. This could be confusing to users if they expect to see it.

**Mitigation:**
- Document as known limitation in story
- Create follow-up story for active filters enhancement (REPA-012?)
- Not MVP-blocking per seed analysis

---

### Risk 3: Clear All Filters Handler
**Impact:** Low
**Description:** Sets gallery onClearAll may NOT reset build status filter if not wired correctly.

**Mitigation:**
- Manually test clear all functionality during verification
- Update onClearAll handler to reset builtFilter state
- Add test case for clear all behavior

---

### Risk 4: Mobile Layout Testing
**Impact:** Low
**Description:** GalleryFilterBar responsive behavior may differ from custom filter bar on mobile viewports.

**Mitigation:**
- Manual testing on mobile devices required
- Playwright mobile viewport test recommended
- Reference wishlist-gallery mobile behavior (already uses shared component)

---

## Test Execution Checklist

**Pre-Implementation:**
- [ ] Review existing test suite for app-sets-gallery
- [ ] Identify tests that reference custom GalleryFilterBar
- [ ] Document test selector changes needed

**During Implementation:**
- [ ] Write BuildStatusFilter unit tests (TDD approach)
- [ ] Update main-page.test.tsx for shared GalleryFilterBar
- [ ] Run tests frequently to catch regressions early

**Post-Implementation:**
- [ ] All unit tests pass (100% pass rate)
- [ ] All integration tests pass (100% pass rate)
- [ ] Coverage meets 45% global minimum (target 80% for new code)
- [ ] Manual testing on desktop browser (Chrome, Firefox, Safari)
- [ ] Manual testing on mobile browser (iOS Safari, Android Chrome)
- [ ] Keyboard navigation test
- [ ] Screen reader test (at least VoiceOver or NVDA)
- [ ] Playwright E2E test (if implemented)

---

## Success Criteria

**Test Plan Complete When:**
- ✅ All unit tests written and passing
- ✅ All integration tests updated and passing
- ✅ Manual testing checklist completed
- ✅ No accessibility regressions (axe-core violations = 0)
- ✅ Responsive layout verified on mobile
- ✅ Test evidence captured (logs, screenshots, coverage report)

---

**Test Plan Author:** PM Test Plan Writer (Haiku)
**Generated:** 2026-02-10
**Version:** 1.0
**Status:** DRAFT
