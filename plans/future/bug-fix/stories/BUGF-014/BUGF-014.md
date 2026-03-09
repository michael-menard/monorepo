---
id: BUGF-014
title: Add Test Coverage for Sets Gallery Components
status: ready-to-work
priority: P2
story_type: test
points: 3
phase: 3
epic: bug-fix
depends_on: []
blocks: []
created_at: "2026-02-11T19:45:00Z"
experiment_variant: control
surfaces:
  - frontend
  - test
touches_backend: false
touches_frontend: true
touches_database: false
touches_infra: false
---

# BUGF-014: Add Test Coverage for Sets Gallery Components

## Context

The Sets Gallery app (`apps/web/app-sets-gallery`) currently has test coverage for the main page, add/edit pages, and three core components (SetCard, ImageUploadZone, TagInput). However, three key components remain untested:

1. **GalleryGrid** (47 lines) - Generic grid layout wrapper used by main-page and set-detail-page
2. **SetDetailPage** (584 lines) - Complex detail view with image gallery, lightbox, delete dialog, routing, and error states
3. **ModuleLayout** (32 lines) - Layout wrapper for module pages

### Reality Baseline

**Current State:**
- Sets Gallery app is fully functional with CRUD operations
- Main page, add-set-page, and edit-set-page already have test coverage (3 test files)
- SetCard, ImageUploadZone, and TagInput components have existing tests
- BUGF-003 (Sets Edit/Delete) completed and in UAT phase
- MSW handlers configured for Sets API endpoints in test/mocks/server
- @repo/gallery package provides shared GalleryFilterBar, GalleryGrid, and other gallery components

**Active In-Progress Work:**
- BUGF-010: Fix Hub.listen Mocking in Auth Tests (in-progress) - no overlap
- BUGF-012: Add Test Coverage for Inspiration Gallery Components (in-progress) - similar scope, different app

**Established Patterns:**
- Main-page.test.tsx demonstrates comprehensive MSW integration with dynamic filtering (lines 128-209)
- Add-set-page.test.tsx shows RTK Query mutation mocking pattern
- Edit-set-page.test.tsx demonstrates navigation and toast assertion pattern
- @repo/gallery already has extensive test coverage for shared components

**Constraints:**
- ADR-005: Testing Strategy - unit tests may use MSW mocking
- ADR-006: E2E Tests Required - at least one happy-path E2E test per UI-facing AC during dev phase
- CLAUDE.md: Minimum 45% test coverage required globally
- Test framework: Vitest + React Testing Library
- Use semantic queries (getByRole, getByLabelText) per CLAUDE.md

**Problem:**
Without test coverage for these components, regressions in the set detail view, layout consistency, or grid rendering may go undetected. SetDetailPage is particularly complex with 584 lines covering multiple user flows (view, edit navigation, delete, lightbox, error states).

## Goal

Add focused unit tests for GalleryGrid, SetDetailPage, and ModuleLayout following established patterns from existing test files. Prioritize SetDetailPage due to its complexity and critical user-facing functionality.

## Non-Goals

- Testing shared `@repo/gallery` components (GalleryFilterBar, GalleryLightbox internals) - these belong in the package
- E2E tests for the full sets gallery flow - deferred to BUGF-030 (Comprehensive E2E Suite)
- Testing BuildStatusFilter component - separate component not listed in story scope
- Refactoring or modifying component implementations - tests only
- Improving test coverage for already-tested components (main-page, add-set-page, edit-set-page)
- Backend API tests for sets endpoints - covered by backend test suite
- Visual regression tests - out of scope for unit tests
- Performance testing for large galleries - out of scope

## Scope

### Components to Test

**Apps:**
- `apps/web/app-sets-gallery`

**Components:**
- `src/components/GalleryGrid.tsx`
- `src/pages/set-detail-page.tsx`
- `src/components/module-layout.tsx`

### Related Endpoints

From `@repo/api-client/rtk/sets-api`:
- `GET /api/sets` - List sets with pagination, search, theme, isBuilt filters, and sorting
- `GET /api/sets/:id` - Get set by ID (used by SetDetailPage)
- `DELETE /api/sets/:id` - Delete set

### Test Infrastructure

**Existing (no changes needed):**
- MSW server configured in `src/test/setup.ts`
- Global mocks: matchMedia, ResizeObserver, IntersectionObserver, TanStack Router, @repo/logger
- RTK Query store setup pattern
- @testing-library/react and @testing-library/user-event

## Acceptance Criteria

### AC-1: GalleryGrid Component Tests
**Status:** ❌ Not Started

Create test file at `apps/web/app-sets-gallery/src/components/__tests__/GalleryGrid.test.tsx` covering:
- Loading state rendering (skeleton placeholders)
- Empty state rendering (no items passed)
- Item rendering with multiple items
- Grid layout consistency (CSS class verification)

**Verification:**
- Test file exists and runs successfully
- All four scenarios covered
- Minimum 70% line coverage for GalleryGrid component

### AC-2: SetDetailPage - Data Loading Tests
**Status:** ❌ Not Started

Create test file at `apps/web/app-sets-gallery/src/pages/__tests__/set-detail-page.test.tsx` with MSW handlers covering:
- Successful set load and display
- Skeleton loading state
- 404 Not Found error state
- 403 Forbidden error state
- Generic network error state

**Verification:**
- All five loading scenarios tested
- MSW handlers properly configured for each scenario
- Error messages verified in DOM

### AC-3: SetDetailPage - User Interactions Tests
**Status:** ❌ Not Started

Add to `set-detail-page.test.tsx` tests for:
- Edit button navigation (navigates to /sets/:id/edit)
- Delete button opens confirmation dialog
- Delete confirmation triggers mutation and navigates to main page
- Delete cancellation closes dialog without mutation
- Toast message displayed on successful delete

**Verification:**
- All five interaction scenarios tested
- useDeleteSetMutation mocked properly (reference edit-set-page.test.tsx)
- Navigation assertions use TanStack Router mocks
- Toast assertions verify success messages

### AC-4: SetDetailPage - Lightbox Tests
**Status:** ❌ Not Started

Add to `set-detail-page.test.tsx` tests for:
- Lightbox opens when image clicked (for sets with images)
- Lightbox closes when close button clicked
- No lightbox trigger for sets without images
- Accessible lightbox controls (aria-labels verified)

**Verification:**
- Lightbox interaction flow tested
- data-testid or semantic queries used
- Reference @repo/gallery GalleryLightbox.test.tsx for patterns

### AC-5: ModuleLayout Component Tests
**Status:** ❌ Not Started

Create test file at `apps/web/app-sets-gallery/src/components/__tests__/module-layout.test.tsx` covering:
- Basic rendering with children
- Layout wrapper structure (header, main, footer if applicable)
- CSS class application

**Verification:**
- Test file exists and runs successfully
- All three scenarios covered
- Minimum 70% line coverage for ModuleLayout component

### AC-6: Test Quality Standards
**Status:** ❌ Not Started

All new tests must follow established patterns:
- MSW mocking for API calls (never mock RTK Query hooks directly)
- MemoryRouter wrapper for components using routing
- TooltipProvider wrapper for components using toasts
- Semantic queries prioritized (getByRole, getByLabelText)
- data-testid used only when semantic queries insufficient
- No console.log usage - use @repo/logger if logging needed

**Verification:**
- Lint passes for all test files
- Type-check passes for all test files
- Tests follow patterns from main-page.test.tsx, add-set-page.test.tsx, edit-set-page.test.tsx

### AC-7: Coverage Threshold Met
**Status:** ❌ Not Started

Test coverage for newly tested components:
- GalleryGrid: minimum 70% line coverage
- SetDetailPage: minimum 70% line coverage
- ModuleLayout: minimum 70% line coverage

**Verification:**
- Run `pnpm test --coverage` in app-sets-gallery
- Coverage report shows >=70% for all three components
- No coverage regressions for existing tested components

### AC-8: No Console Usage
**Status:** ❌ Not Started

All test files use @repo/logger instead of console.log/error:
- No direct console.log calls in test files
- Use logger.debug() for test debugging if needed
- Remove all console statements before committing

**Verification:**
- Grep for console.log in test files returns no results
- Lint passes without console warnings

## Reuse Plan

### Components to Reuse

**Test Wrappers:**
- MemoryRouter for routing context
- TooltipProvider for toast notifications
- RTK Query store setup helper from main-page.test.tsx (lines 101-107)

**Existing Test Patterns:**
- SetCard tests - card rendering assertions
- main-page.test.tsx - MSW handler for dynamic API responses (lines 128-209)
- add-set-page.test.tsx - RTK Query mutation mocking pattern
- edit-set-page.test.tsx - navigation and toast assertion pattern

### Packages to Reuse

**Already Configured:**
- @testing-library/react - component testing
- @testing-library/user-event - user interaction simulation
- msw - API mocking (configured in test/setup.ts)
- vitest - test runner

**No New Dependencies Required**

### Shared Gallery Tests Reference

From `@repo/gallery` package:
- `src/__tests__/GalleryGrid.test.tsx` - grid layout testing approach
- `src/__tests__/GalleryLightbox.test.tsx` - lightbox interaction patterns
- `src/__tests__/GalleryFilters.test.tsx` - filter bar testing patterns

Note: Do not test shared @repo/gallery components in app-sets-gallery. They belong in the package.

## Architecture Notes

### Component Structure

**GalleryGrid (47 lines):**
- Simple layout wrapper component
- Props: items, loading, emptyState, renderItem
- Straightforward test scenarios

**SetDetailPage (584 lines):**
- Most complex component with multiple responsibilities:
  * Data fetching via RTK Query (useGetSetByIdQuery)
  * Error state handling (404, 403, network errors)
  * Delete mutation (useDeleteSetMutation)
  * Navigation (back button, edit button)
  * Lightbox integration for images
  * Delete confirmation dialog
- Uses FetchBaseQueryError type guards for error handling
- Requires comprehensive test coverage

**ModuleLayout (32 lines):**
- Trivial layout wrapper
- Simple rendering tests sufficient

### Test Complexity Estimates

Based on existing test files and component complexity:
- GalleryGrid: ~50-80 lines of test code
- SetDetailPage: ~200-300 lines of test code (similar to main-page.test.tsx)
- ModuleLayout: ~20-30 lines of test code

**Total estimated test code:** ~300-400 lines

### Risk Assessment

**Medium Risk:**
- SetDetailPage lightbox interactions may require additional React Testing Library queries
- Delete dialog confirmation flow requires careful sequencing of user events

**Mitigation:**
- Reference @repo/gallery GalleryLightbox.test.tsx for lightbox patterns
- Reference edit-set-page.test.tsx for delete mutation mocking
- Use data-testid attributes if semantic queries insufficient

## Test Plan

### Test File Structure

```
apps/web/app-sets-gallery/src/
├── components/
│   └── __tests__/
│       ├── GalleryGrid.test.tsx (NEW)
│       └── module-layout.test.tsx (NEW)
└── pages/
    └── __tests__/
        └── set-detail-page.test.tsx (NEW)
```

### Priority Order

**Phase 1: Warm-up (GalleryGrid)**
- Start with GalleryGrid tests (simplest component)
- Verify test infrastructure and patterns

**Phase 2: Complex Component (SetDetailPage)**
- Implement SetDetailPage tests in order:
  1. Data loading tests (AC-2)
  2. User interaction tests (AC-3)
  3. Lightbox tests (AC-4)

**Phase 3: Simple Wrapper (ModuleLayout)**
- Complete ModuleLayout tests (simplest)

### Test Scenarios

#### GalleryGrid Tests

```typescript
describe('GalleryGrid', () => {
  it('renders loading state with skeleton placeholders')
  it('renders empty state when no items provided')
  it('renders items using renderItem prop')
  it('applies correct grid layout classes')
})
```

#### SetDetailPage Data Loading Tests

```typescript
describe('SetDetailPage - Data Loading', () => {
  it('displays skeleton while loading')
  it('displays set details on successful load')
  it('displays 404 error message when set not found')
  it('displays 403 error message when access forbidden')
  it('displays generic error message on network failure')
})
```

#### SetDetailPage User Interactions Tests

```typescript
describe('SetDetailPage - User Interactions', () => {
  it('navigates to edit page when edit button clicked')
  it('opens delete confirmation dialog when delete button clicked')
  it('closes dialog without mutation when cancel clicked')
  it('triggers delete mutation when confirm clicked')
  it('navigates to main page after successful delete')
  it('displays toast message on successful delete')
})
```

#### SetDetailPage Lightbox Tests

```typescript
describe('SetDetailPage - Lightbox', () => {
  it('opens lightbox when image clicked')
  it('closes lightbox when close button clicked')
  it('does not render lightbox trigger when no images')
  it('has accessible aria-labels on lightbox controls')
})
```

#### ModuleLayout Tests

```typescript
describe('ModuleLayout', () => {
  it('renders children within layout wrapper')
  it('applies correct layout structure classes')
  it('renders header and main sections')
})
```

### MSW Handler Configuration

**Required Handlers:**

```typescript
// Success scenario
http.get('/api/sets/:id', () => {
  return HttpResponse.json({
    id: 'test-id',
    name: 'Test Set',
    setNumber: '12345',
    // ... full set object
  })
})

// 404 scenario
http.get('/api/sets/:id', () => {
  return new HttpResponse(null, { status: 404 })
})

// 403 scenario
http.get('/api/sets/:id', () => {
  return new HttpResponse(null, { status: 403 })
})

// Network error scenario
http.get('/api/sets/:id', () => {
  return HttpResponse.error()
})

// Delete success
http.delete('/api/sets/:id', () => {
  return new HttpResponse(null, { status: 204 })
})
```

### Edge Cases to Test

**SetDetailPage Edge Cases:**
- Set with no images (no lightbox trigger)
- Set with no purchase info (optional fields)
- Set with no notes (optional fields)
- Set with no tags (empty array)
- Set with minimal data (only required fields)

**GalleryGrid Edge Cases:**
- Zero items (empty state)
- Single item (layout consistency)
- Many items (10+ items)

### Test Infrastructure Requirements

**Wrappers Needed:**

```typescript
function renderSetDetailPage(setId: string) {
  const store = configureStore({
    reducer: {
      [setsApi.reducerPath]: setsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(setsApi.middleware),
  })

  return render(
    <Provider store={store}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[`/sets/${setId}`]}>
          <SetDetailPage />
        </MemoryRouter>
      </TooltipProvider>
    </Provider>
  )
}
```

**Reference Files:**
- `main-page.test.tsx` lines 101-107 for store setup
- `edit-set-page.test.tsx` lines 45-60 for MemoryRouter + TooltipProvider pattern
- `add-set-page.test.tsx` lines 28-40 for mutation mocking

### Verification Commands

```bash
# Run tests for app-sets-gallery
cd apps/web/app-sets-gallery
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test file
pnpm test src/pages/__tests__/set-detail-page.test.tsx

# Lint test files
pnpm lint src/**/__tests__/**

# Type-check
pnpm check-types
```

## UI/UX Notes

### SetDetailPage Error States

**404 Not Found:**
- Clear error message: "Set not found"
- Suggestion to return to gallery
- Consistent with platform error patterns

**403 Forbidden:**
- Clear error message: "You don't have permission to view this set"
- Maintains user dignity (not "Access Denied")

**Generic Error:**
- User-friendly message: "Something went wrong. Please try again."
- No technical error details exposed

### Accessibility Considerations

**Lightbox:**
- aria-labels present on open/close controls
- Keyboard navigation supported (Esc to close)
- Focus management when opening/closing

**Delete Dialog:**
- Destructive variant styling (red/warning colors)
- Clear warning text
- Confirm/Cancel button labeling follows platform conventions

**Navigation:**
- Back button uses ghost variant with ArrowLeft icon
- Consistent with platform navigation patterns

**Interactive Elements:**
- All buttons have accessible names
- Loading states announced to screen readers
- Error messages associated with context (aria-describedby)

### Design System Compliance

**Components Used:**
- Button (ghost, destructive variants)
- Dialog (for delete confirmation)
- Toast (for success messages)
- Skeleton (for loading states)
- Lightbox (from @repo/gallery)

**Theme:**
- Sky/Teal LEGO-inspired color palette
- Tailwind CSS utility classes
- Framer Motion for animations (if used in lightbox)

## Definition of Done

- [ ] All 8 acceptance criteria verified PASS
- [ ] All new test files created at correct paths
- [ ] All tests passing (`pnpm test` in app-sets-gallery)
- [ ] Coverage >= 70% for GalleryGrid, SetDetailPage, ModuleLayout
- [ ] Lint passes for all test files
- [ ] Type-check passes for all test files
- [ ] No console.log usage in test files
- [ ] MSW handlers follow established patterns
- [ ] Test wrappers (MemoryRouter, TooltipProvider) used correctly
- [ ] Semantic queries prioritized per CLAUDE.md
- [ ] No regressions in existing test coverage
- [ ] Story index updated to "Created" status
- [ ] Token log recorded

## Story Predictions

### Risk Assessment

**Split Risk:** 0.2 (Low)
- All ACs are tightly scoped to test creation
- Clear component boundaries
- Test infrastructure already in place

**Review Cycles:** 1-2
- Straightforward test implementation
- Clear patterns to follow from existing tests
- Low complexity relative to similar stories

**Token Estimate:** 100K (Medium confidence)
- Based on similar test-focused stories
- SetDetailPage complexity drives token count
- Heuristic-only mode (no historical data)

**Confidence:** Low
- Predictions based on heuristics only
- No KB historical data available
- Similar to BUGF-012 (inspiration gallery tests)

### Risk Factors

**Complexity Drivers:**
- SetDetailPage has 584 lines with multiple error states
- Lightbox interactions may require careful query selection
- Delete flow requires mutation mocking

**Mitigations:**
- Reference edit-set-page.test.tsx for delete patterns
- Reference @repo/gallery tests for lightbox patterns
- Start with simple components (GalleryGrid) to validate patterns

## Notes

### Story Generation Metadata

**Generated:** 2026-02-11T19:45:00Z
**Experiment Variant:** control
**Seed Used:** /Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-014/_pm/STORY-SEED.md
**Agent:** pm-story-generation-leader v4.2.0

### Related Stories

**Depends On:** None (test infrastructure ready)
**Blocks:** None
**Related:**
- BUGF-012: Add Test Coverage for Inspiration Gallery Components (similar scope, in-progress)
- BUGF-030: Implement Comprehensive E2E Test Suite (E2E tests for sets gallery)
- BUGF-003: Implement Delete API and Edit Page for Sets Gallery (provides edit-page test reference)

### Epic Context

**Epic:** Bug Fix & Technical Debt (bug-fix)
**Phase:** 3 (Test Coverage & Quality)
**Priority:** P2
**Story Type:** test

### Technical Constraints

- ADR-005: Use MSW for unit test mocking
- ADR-006: E2E tests exempt for test-type stories
- CLAUDE.md: 45% global coverage minimum
- CLAUDE.md: Semantic queries required
- CLAUDE.md: No console.log usage

### Success Metrics

- Zero test failures after implementation
- Coverage >= 70% for all three components
- No lint or type-check errors
- Test execution time < 30 seconds for all new tests

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | None | — | — |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | Edge case: GalleryGrid with single item | edge-case | BUGF-014-GAP-001 |
| 2 | Edge case: SetDetailPage with partial purchase info | edge-case | BUGF-014-GAP-002 |
| 3 | Edge case: SetDetailPage with extremely long notes | edge-case | BUGF-014-GAP-003 |
| 4 | Edge case: SetDetailPage with many tags | edge-case | BUGF-014-GAP-004 |
| 5 | Error scenario: Delete mutation network failure | error-handling | BUGF-014-GAP-005 |
| 6 | Error scenario: SetDetailPage with malformed image URLs | error-handling | BUGF-014-GAP-006 |
| 7 | Accessibility: Keyboard navigation in lightbox | accessibility | BUGF-014-GAP-007 |
| 8 | Accessibility: Screen reader announcements for delete | accessibility | BUGF-014-GAP-008 |
| 9 | Visual regression testing | testing | BUGF-014-ENH-001 |
| 10 | Performance testing | performance | BUGF-014-ENH-002 |
| 11 | Integration testing | testing | BUGF-014-ENH-003 |
| 12 | Toast message content validation | ux-polish | BUGF-014-ENH-004 |
| 13 | Loading state timing | ux-polish | BUGF-014-ENH-005 |
| 14 | Error message consistency | ux-polish | BUGF-014-ENH-006 |
| 15 | Delete dialog aria-describedby | accessibility | BUGF-014-ENH-007 |
| 16 | Lightbox keyboard shortcuts | accessibility | BUGF-014-ENH-008 |
| 17 | ModuleLayout with nested routing | edge-case | BUGF-014-ENH-009 |
| 18 | Test coverage for utility functions | code-quality | BUGF-014-ENH-010 |

### Summary

- **ACs added**: 0
- **KB entries created**: 18 (8 gaps + 10 enhancements)
- **Mode**: autonomous
- **Verdict**: PASS - Story ready for implementation with clear test patterns and no blockers
