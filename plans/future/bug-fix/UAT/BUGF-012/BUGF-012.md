---
id: BUGF-012
title: "Add Test Coverage for Inspiration Gallery Components"
status: in-qa
updated_at: "2026-02-11T23:45:00Z"
priority: P2
phase: 3
story_type: tech_debt
points: 5
experiment_variant: control
epic: bug-fix
created_at: "2026-02-11T00:00:00Z"
depends_on: []
blocks: []
tags:
  - test-coverage
  - inspiration-gallery
  - vitest
  - accessibility
surfaces:
  - frontend
  - testing
touches_backend: false
touches_frontend: true
touches_database: false
touches_infra: false
---

# BUGF-012: Add Test Coverage for Inspiration Gallery Components

## Context

The inspiration gallery app (`apps/web/app-inspiration-gallery`) has 23 components with only 3 components having test coverage: `BulkActionsBar`, `InspirationCard`, and `AlbumCard`. The remaining 18 components lack tests, including the critical `main-page.tsx` (885 lines) that orchestrates the entire gallery experience with tabs, search, filtering, multi-select, drag-sort, and all modal flows.

**Current Coverage Gap:**

| Component Type | Total | Tested | Untested |
|----------------|-------|--------|----------|
| Pages | 1 | 0 | 1 |
| Modals | 7 | 0 | 7 |
| Drag & Drop | 5 | 0 | 5 |
| Context Menus | 2 | 0 | 2 |
| UI Components | 4 | 0 | 4 |
| Cards | 2 | 2 | 0 |
| Toolbar | 1 | 1 | 0 |
| **Total** | **22** | **3** | **19** |

The app has robust test infrastructure in place:
- MSW handlers for all inspiration API endpoints
- Global test setup with mocks for browser APIs (ResizeObserver, IntersectionObserver, matchMedia)
- Test utilities for custom rendering
- Vitest configuration with coverage reporting
- Existing test patterns from BulkActionsBar and InspirationCard tests

**Problem:**

Without test coverage, we cannot:
- Confidently refactor components (especially the 885-line main-page.tsx)
- Catch regressions in critical user flows (upload, delete, edit, drag-sort)
- Validate accessibility features (keyboard nav, screen reader announcements)
- Ensure modal interactions work correctly (open/close, confirm/cancel, form validation)
- Verify multi-select and bulk operations function properly

**Related Work:**
- **BUGF-032** (in-progress): Frontend integration for presigned URL upload - may affect UploadModal testing but no blocking conflicts (different scope)

## Goal

Implement comprehensive unit and integration tests for all 18 untested components following established patterns from existing test files. Achieve minimum 70% line coverage for the inspiration gallery app (above global 45% target) with focus on critical user flows: upload, delete, edit, drag-sort, multi-select, keyboard navigation, and accessibility.

## Non-Goals

**Out of Scope:**
- E2E tests for inspiration gallery (per ADR-005, this is Phase 3 unit/integration only)
- Testing backend API endpoints (backend has its own test suite)
- Visual regression testing (not in current test strategy)
- Performance testing (not required for this story)
- Testing drag-and-drop behavior in real browser (unit tests mock @dnd-kit)
- Fixing bugs found during testing (create separate BUGF stories)
- Refactoring components to be more testable (test as-is, refactor separately if needed)
- Testing module-layout.tsx (candidate for consolidation in BUGF-045)

**Protected Features:**
- Existing test files (BulkActionsBar, InspirationCard, AlbumCard) - do not modify
- Existing MSW handlers - reuse as-is unless API contract changed
- Existing test setup (`src/test/setup.ts`) - do not break global mocks
- Component implementations - do not change component code to make tests pass (exception: fixing actual bugs requires separate story)

**Deferred:**
- Integration with shared gallery components from @repo/gallery (test as black box)
- Testing hooks in isolation (test through component behavior)
- Testing custom render utilities (if needed, create separate story)

## Scope

**Packages Modified:**
- `apps/web/app-inspiration-gallery` - add test files only, no component changes

**Components to Test (18 total):**

**Phase 1 - Critical User Flows (P0):**
1. `main-page.tsx` - Full user flow integration (885 lines)
2. `DraggableInspirationGallery/index.tsx` - Drag-sort functionality

**Phase 2 - Modal Components (P1):**
3. `DeleteInspirationModal/index.tsx` - Destructive actions
4. `DeleteAlbumModal/index.tsx` - Destructive actions
5. `EditInspirationModal/index.tsx` - Edit flow
6. `UploadModal/index.tsx` - Upload flow
7. `CreateAlbumModal/index.tsx` - Creation flow
8. `AddToAlbumModal/index.tsx` - Album membership
9. `LinkToMocModal/index.tsx` - MOC linking

**Phase 3 - Context Menus (P1):**
10. `InspirationContextMenu/index.tsx` - Right-click actions
11. `AlbumContextMenu/index.tsx` - Right-click actions

**Phase 4 - Drag Components (P2):**
12. `SortableAlbumCard/index.tsx` - Draggable card
13. `SortableInspirationCard/index.tsx` - Draggable card
14. `AlbumDragPreview/index.tsx` - Drag preview overlay
15. `InspirationDragPreview/index.tsx` - Drag preview overlay

**Phase 5 - UI Components (P3):**
16. `EmptyState/index.tsx` - Empty state variants
17. `GalleryLoadingSkeleton/index.tsx` - Loading skeleton
18. `AlbumCardSkeleton/index.tsx` - Album skeleton
19. `InspirationCardSkeleton/index.tsx` - Inspiration skeleton

**Test Files to Create:**
- `src/pages/__tests__/main-page.test.tsx`
- `src/components/DraggableInspirationGallery/__tests__/DraggableInspirationGallery.test.tsx`
- `src/components/DeleteInspirationModal/__tests__/DeleteInspirationModal.test.tsx`
- `src/components/DeleteAlbumModal/__tests__/DeleteAlbumModal.test.tsx`
- `src/components/EditInspirationModal/__tests__/EditInspirationModal.test.tsx`
- `src/components/UploadModal/__tests__/UploadModal.test.tsx`
- `src/components/CreateAlbumModal/__tests__/CreateAlbumModal.test.tsx`
- `src/components/AddToAlbumModal/__tests__/AddToAlbumModal.test.tsx`
- `src/components/LinkToMocModal/__tests__/LinkToMocModal.test.tsx`
- `src/components/InspirationContextMenu/__tests__/InspirationContextMenu.test.tsx`
- `src/components/AlbumContextMenu/__tests__/AlbumContextMenu.test.tsx`
- `src/components/SortableAlbumCard/__tests__/SortableAlbumCard.test.tsx`
- `src/components/SortableInspirationCard/__tests__/SortableInspirationCard.test.tsx`
- `src/components/AlbumDragPreview/__tests__/AlbumDragPreview.test.tsx`
- `src/components/InspirationDragPreview/__tests__/InspirationDragPreview.test.tsx`
- `src/components/EmptyState/__tests__/EmptyState.test.tsx`
- `src/components/GalleryLoadingSkeleton/__tests__/GalleryLoadingSkeleton.test.tsx`
- `src/components/AlbumCardSkeleton/__tests__/AlbumCardSkeleton.test.tsx`
- `src/components/InspirationCardSkeleton/__tests__/InspirationCardSkeleton.test.tsx`

**Dependencies:**
- `@testing-library/react` - existing
- `@testing-library/user-event` - existing
- `vitest` - existing
- `msw` - existing (handlers in `src/test/mocks/handlers.ts`)

## Acceptance Criteria

### AC-1: Main Page Testing (Highest Priority)

**Status:** Not Started

**Test File:** `src/pages/__tests__/main-page.test.tsx`

**Required Test Coverage:**
- [ ] Tab switching between "All Inspirations" and "Albums" tabs
- [ ] Search functionality (input updates query state)
- [ ] Sort options (sortOrder: newest/oldest, createdAt/title)
- [ ] View mode toggle (grid/list) - if implemented
- [ ] Empty states:
  - [ ] First-time user (no inspirations, no albums)
  - [ ] No search results
  - [ ] Empty album
- [ ] Loading states (skeleton components display during fetch)
- [ ] Error states (API error handling and display)
- [ ] Multi-select mode toggle (checkbox selection)
- [ ] Keyboard shortcuts:
  - [ ] Escape - exit multi-select, close modals
  - [ ] Delete - delete selected items
  - [ ] Ctrl+A / Cmd+A - select all
  - [ ] Cmd+N - new inspiration
  - [ ] Cmd+U - upload
  - [ ] Cmd+L - link to MOC
  - [ ] Cmd+M - add to album
- [ ] Modal opening/closing flows:
  - [ ] Upload modal
  - [ ] Create album modal
  - [ ] Edit inspiration modal
  - [ ] Delete confirmation modals
  - [ ] Link to MOC modal
  - [ ] Add to album modal
- [ ] Card click handlers:
  - [ ] Inspiration card click (navigate to detail or select in multi-select mode)
  - [ ] Album card click (navigate to album detail)
- [ ] Context menu opening (right-click on cards)
- [ ] Bulk actions bar visibility in multi-select mode

**Verification:**
- All test assertions pass
- Main page test has minimum 75% line coverage of main-page.tsx
- Tests use semantic queries (getByRole, getByLabelText)
- Tests follow BDD structure (rendering, interactions, keyboard, accessibility)

---

### AC-2: Modal Component Testing

**Status:** Not Started

**Test Files:**
- `DeleteInspirationModal/__tests__/DeleteInspirationModal.test.tsx`
- `DeleteAlbumModal/__tests__/DeleteAlbumModal.test.tsx`
- `EditInspirationModal/__tests__/EditInspirationModal.test.tsx`
- `UploadModal/__tests__/UploadModal.test.tsx`
- `CreateAlbumModal/__tests__/CreateAlbumModal.test.tsx`
- `AddToAlbumModal/__tests__/AddToAlbumModal.test.tsx`
- `LinkToMocModal/__tests__/LinkToMocModal.test.tsx`

**Required Test Coverage (for each modal):**
- [ ] Modal renders correctly when `isOpen={true}`
- [ ] Modal does not render when `isOpen={false}`
- [ ] Close button closes modal (calls onClose handler)
- [ ] Cancel button closes modal without action
- [ ] Escape key closes modal
- [ ] Form validation (if applicable):
  - [ ] Required fields show error when empty
  - [ ] Valid input passes validation
  - [ ] Submit button disabled during validation errors
- [ ] Confirm/submit action:
  - [ ] Calls correct handler with correct data
  - [ ] Shows loading state during async operation
  - [ ] Shows success feedback (toast or close)
  - [ ] Shows error message on failure
- [ ] Focus management:
  - [ ] Focus trapped within modal when open
  - [ ] Focus restored to trigger element on close
- [ ] ARIA attributes:
  - [ ] `role="dialog"`
  - [ ] `aria-labelledby` points to title
  - [ ] `aria-describedby` for description (if applicable)

**Verification:**
- All modal tests pass
- Each modal test file has minimum 70% line coverage
- Tests use userEvent for interactions
- Tests verify RTK Query mutation calls (where applicable)

---

### AC-3: Drag & Drop Component Testing

**Status:** Not Started

**Test Files:**
- `DraggableInspirationGallery/__tests__/DraggableInspirationGallery.test.tsx`
- `SortableAlbumCard/__tests__/SortableAlbumCard.test.tsx`
- `SortableInspirationCard/__tests__/SortableInspirationCard.test.tsx`
- `AlbumDragPreview/__tests__/AlbumDragPreview.test.tsx`
- `InspirationDragPreview/__tests__/InspirationDragPreview.test.tsx`

**Required Test Coverage:**
- [ ] DraggableInspirationGallery:
  - [ ] Renders items in sortable grid
  - [ ] Drag start event calls handler (mock @dnd-kit)
  - [ ] Drag end event calls onReorder with new order
  - [ ] Disabled state prevents dragging
- [ ] Sortable cards:
  - [ ] Card renders with drag handle
  - [ ] Drag handle has accessible label
  - [ ] Card displays correctly during drag state
- [ ] Drag preview components:
  - [ ] Preview renders correct content
  - [ ] Preview matches card appearance
  - [ ] Preview shows item count for multi-select

**Special Setup:**
- [ ] Mock @dnd-kit/core context provider
- [ ] Mock useDraggable, useDroppable, useSortable hooks
- [ ] Test drag handlers in isolation (not full drag behavior)

**Verification:**
- All drag component tests pass
- DraggableInspirationGallery test has minimum 65% line coverage
- Documentation added for @dnd-kit mocking approach
- Tests verify drag event handlers are called correctly

---

### AC-4: Context Menu Testing

**Status:** Not Started

**Test Files:**
- `InspirationContextMenu/__tests__/InspirationContextMenu.test.tsx`
- `AlbumContextMenu/__tests__/AlbumContextMenu.test.tsx`

**Required Test Coverage:**
- [ ] Context menu renders with correct options
- [ ] Each menu option calls correct handler:
  - [ ] Edit option calls onEdit
  - [ ] Delete option calls onDelete
  - [ ] Link to MOC option calls onLink (inspiration only)
  - [ ] Add to album option calls onAddToAlbum (inspiration only)
  - [ ] View details option navigates
- [ ] Context menu closes after action
- [ ] Keyboard navigation:
  - [ ] Arrow keys navigate menu items
  - [ ] Enter activates selected item
  - [ ] Escape closes menu
- [ ] ARIA attributes:
  - [ ] `role="menu"`
  - [ ] Menu items have `role="menuitem"`
  - [ ] Active item has `aria-selected="true"`

**Verification:**
- All context menu tests pass
- Each test file has minimum 70% line coverage
- Tests verify keyboard navigation works
- Tests use semantic queries for menu structure

---

### AC-5: UI Component Testing

**Status:** Not Started

**Test Files:**
- `EmptyState/__tests__/EmptyState.test.tsx`
- `GalleryLoadingSkeleton/__tests__/GalleryLoadingSkeleton.test.tsx`
- `AlbumCardSkeleton/__tests__/AlbumCardSkeleton.test.tsx`
- `InspirationCardSkeleton/__tests__/InspirationCardSkeleton.test.tsx`

**Required Test Coverage:**
- [ ] EmptyState:
  - [ ] Renders "first-time" variant with correct message and action
  - [ ] Renders "no-results" variant with search term
  - [ ] Renders "no-items" variant with create action
  - [ ] Action buttons call correct handlers
  - [ ] Displays custom icon/illustration per variant
- [ ] Loading skeletons:
  - [ ] Render correct count of skeleton items
  - [ ] Have animation classes (pulse/shimmer)
  - [ ] Match layout of actual components
  - [ ] Accessible label (aria-label="Loading...")

**Verification:**
- All UI component tests pass
- Each test file has minimum 60% line coverage (presentational components)
- Tests verify correct variant rendering
- Skeleton tests verify aria-label for screen readers

---

### AC-6: Test Coverage Metrics

**Status:** Not Started

**Required Metrics:**
- [ ] Inspiration gallery app achieves minimum **70% line coverage**
- [ ] Inspiration gallery app achieves minimum **65% branch coverage**
- [ ] All critical user flows have integration test coverage:
  - [ ] Upload flow (UploadModal → API call → success)
  - [ ] Delete flow (DeleteModal → API call → cache invalidation)
  - [ ] Edit flow (EditModal → API call → cache update)
  - [ ] Drag-sort flow (DraggableGallery → reorder → API call)
- [ ] All interactive components have keyboard navigation tests
- [ ] All components have accessibility tests (ARIA, focus management)

**Verification:**
- Run `pnpm test:coverage` for app-inspiration-gallery
- Coverage report shows ≥70% line coverage, ≥65% branch coverage
- No critical user flow is untested
- All keyboard shortcuts are tested in main-page.test.tsx

---

### AC-7: Test Infrastructure & Quality

**Status:** Not Started

**Required Standards:**
- [ ] All tests use existing MSW handlers from `src/test/mocks/handlers.ts`
- [ ] No new MSW handlers needed (unless API contract changed)
- [ ] All tests follow BDD structure from existing test files:
  - `describe('ComponentName')`
    - `describe('rendering')`
    - `describe('interactions')`
    - `describe('accessibility')`
    - `describe('keyboard navigation')` (if applicable)
- [ ] All tests use semantic queries:
  - Prefer `getByRole` over `getByTestId`
  - Use `getByLabelText` for form inputs
  - Use `getByText` for static content
- [ ] All tests use `userEvent` for interactions (not `fireEvent`)
- [ ] All tests clean up properly:
  - [ ] `beforeEach(() => { vi.clearAllMocks() })`
  - [ ] No memory leaks
  - [ ] No hanging promises
  - [ ] Modal state reset between tests

**Verification:**
- All tests pass `pnpm test` in app-inspiration-gallery
- ESLint passes (no testing-library violations)
- Tests run in under 30 seconds total
- No console errors or warnings during test runs

---

### AC-8: Documentation & Patterns

**Status:** Not Started

**Required Documentation:**
- [ ] JSDoc comments added to complex test helpers (if created)
- [ ] Document @dnd-kit mocking approach in test file comments
- [ ] Document modal testing pattern for future reference
- [ ] Update vitest.config.ts if coverage thresholds are added

**Optional Enhancements:**
- [ ] Create reusable modal test helper function to reduce duplication
- [ ] Create reusable keyboard navigation test helper
- [ ] Add test data factory functions if mock data becomes complex

**Verification:**
- Test files are self-documenting with clear describe blocks
- Complex mocking is explained in comments
- Patterns are consistent across all test files

---

## Reuse Plan

**Test Patterns from Existing Tests:**

1. **BulkActionsBar Test Structure** (`__tests__/BulkActionsBar.test.tsx`):
   - Modal/toolbar testing pattern for main-page.tsx
   - Multi-select state management testing
   - Keyboard shortcut testing (Delete, Escape, Select All)
   - Toast notification verification
   - RTK Query mutation testing

2. **InspirationCard Test Structure** (`__tests__/InspirationCard.test.tsx`):
   - Card component testing with GalleryCard integration
   - Hover overlay interactions
   - Selection mode testing
   - Context menu triggering
   - Keyboard navigation (arrow keys, Enter, Space)
   - Accessibility assertions (ARIA labels, roles)

3. **AlbumCard Test Structure** (`__tests__/AlbumCard.test.tsx`):
   - Card metadata display testing
   - Click handler verification
   - Responsive behavior testing

**Test Utilities to Reuse:**

| Utility | Location | Usage |
|---------|----------|-------|
| Custom render | `src/test/test-utils.tsx` | Wrap components with providers if needed |
| MSW handlers | `src/test/mocks/handlers.ts` | All inspiration API mocking |
| Global mocks | `src/test/setup.ts` | ResizeObserver, IntersectionObserver, matchMedia, TanStack Router, @repo/logger |

**Mock Data Patterns:**

Use consistent UUID format from existing tests:
```typescript
const mockInspiration = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Test Inspiration',
  imageUrl: 'https://example.com/image.jpg',
  createdAt: '2026-01-01T00:00:00Z',
  // ... match MSW handler structure
}
```

**Shared Packages for Testing:**

- `@repo/gallery` components:
  - `GalleryCard` - tested through integration, not isolation
  - `GalleryFilterBar` - tested through main-page integration
  - `useGalleryKeyboard` - tested through keyboard shortcuts
  - `useRovingTabIndex` - tested through arrow key navigation
- `@repo/accessibility`:
  - `useAnnouncer` - verify screen reader announcements
- `@repo/api-client/rtk/inspiration-api`:
  - RTK Query hooks - verify mutations and cache updates
- `@repo/hooks`:
  - `useMultiSelect` - tested through multi-select mode

**Patterns to Follow:**

1. **BDD Structure:**
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with required props', () => {
      // ...
    })
  })

  describe('interactions', () => {
    it('handles user click', async () => {
      const user = userEvent.setup()
      // ...
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      // ...
    })
  })

  describe('keyboard navigation', () => {
    it('responds to Enter key', async () => {
      const user = userEvent.setup()
      // ...
    })
  })
})
```

2. **Modal Testing Pattern:**
```typescript
describe('ModalName', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when open', () => {
      render(<Modal isOpen={true} onClose={mockOnClose} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<Modal isOpen={false} onClose={mockOnClose} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('closes on close button click', async () => {
      const user = userEvent.setup()
      render(<Modal isOpen={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('button', { name: /close/i }))
      expect(mockOnClose).toHaveBeenCalledOnce()
    })

    it('closes on Escape key', async () => {
      const user = userEvent.setup()
      render(<Modal isOpen={true} onClose={mockOnClose} />)

      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalledOnce()
    })
  })

  describe('form validation', () => {
    it('shows error for required field', async () => {
      const user = userEvent.setup()
      render(<Modal isOpen={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('button', { name: /submit/i }))
      expect(screen.getByText(/required/i)).toBeInTheDocument()
    })
  })
})
```

3. **Accessibility Assertions:**
```typescript
it('has correct ARIA attributes', () => {
  render(<Component />)

  const button = screen.getByRole('button', { name: /action/i })
  expect(button).toHaveAttribute('aria-label', 'Expected label')

  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveAttribute('aria-labelledby')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
})
```

4. **RTK Query Testing:**
```typescript
it('calls delete mutation on confirm', async () => {
  const user = userEvent.setup()
  render(<DeleteModal isOpen={true} inspirationId="123" />)

  await user.click(screen.getByRole('button', { name: /delete/i }))

  // MSW handler will be called, verify success state
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

**Packages to Use:**

- `@testing-library/react` - render, screen, within, waitFor
- `@testing-library/user-event` - userEvent.setup(), click, keyboard, type
- `vitest` - describe, it, expect, vi.fn(), vi.mock(), beforeEach
- `msw` - Use existing handlers, no new setup needed

---

## Architecture Notes

**Component Testing Strategy:**

1. **Integration over Isolation:**
   - Test components with their real dependencies where possible
   - Use MSW for API mocking, not manual mocks
   - Test @repo/gallery components as black boxes through integration

2. **Main Page Priority:**
   - `main-page.tsx` is the highest value test (885 lines, orchestrates entire UX)
   - Test as integration: render full page, verify all flows work together
   - Use `within()` to scope queries to specific sections (tabs, modals, etc.)

3. **Drag Testing Approach:**
   - Mock @dnd-kit/core context and hooks
   - Test drag event handlers in isolation
   - Do NOT attempt to test actual drag behavior (requires Playwright E2E)
   - Focus on verifying `onReorder` handler is called with correct data

4. **Modal Testing Approach:**
   - Extract common modal test helper if duplication is high
   - Test each modal in isolation with mocked handlers
   - Verify RTK Query mutations are triggered correctly
   - Test form validation and error states

5. **Coverage Strategy:**
   - Achieve 70% line coverage minimum
   - Focus on critical paths: user actions, error states, keyboard shortcuts
   - Skip coverage for type definitions and pure presentational code
   - Document any intentionally uncovered code

**Test Organization:**

```
app-inspiration-gallery/
  src/
    pages/
      __tests__/
        main-page.test.tsx          # Integration test for full page
    components/
      DraggableInspirationGallery/
        __tests__/
          DraggableInspirationGallery.test.tsx
      DeleteInspirationModal/
        __tests__/
          DeleteInspirationModal.test.tsx
      [... other components ...]
    test/
      setup.ts                       # Global mocks (do not modify)
      test-utils.tsx                 # Custom render (reuse as-is)
      mocks/
        handlers.ts                  # MSW handlers (reuse as-is)
```

**Testing Anti-Patterns to Avoid:**

1. **Don't** use `fireEvent` - use `userEvent` instead (more realistic)
2. **Don't** test implementation details - test user behavior
3. **Don't** skip accessibility tests - they're mandatory
4. **Don't** create barrel files for tests - import directly
5. **Don't** use console.log in tests - use @repo/logger (mocked)
6. **Don't** modify component code to make tests pass (except bug fixes)
7. **Don't** add new MSW handlers without verifying API contract changed
8. **Don't** test @repo/gallery components in isolation - test through integration

---

## Infrastructure Notes

**Test Execution:**

```bash
# Run all tests
pnpm test

# Run tests for inspiration gallery only
pnpm test --filter app-inspiration-gallery

# Run tests with coverage
pnpm test:coverage --filter app-inspiration-gallery

# Run specific test file
pnpm test main-page.test.tsx

# Watch mode for TDD
pnpm test --watch
```

**Coverage Thresholds:**

Current global threshold: 45%
Target for this story: 70% line coverage, 65% branch coverage

Optional: Add to `vitest.config.ts` if enforcement desired:
```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 60,
        statements: 70,
      },
    },
  },
})
```

**CI/CD Integration:**

Tests run automatically in CI via:
- `.github/workflows/ci.yml` - on pull request
- Pre-push git hooks - locally before push

No changes needed to CI configuration for this story.

**Special Setup for Drag Testing:**

Research @dnd-kit testing approaches:
- [Official testing guide](https://docs.dndkit.com/introduction/testing)
- Mock DndContext provider
- Mock useDraggable, useDroppable, useSortable hooks
- Test drag handlers independently

Example mock setup:
```typescript
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}))
```

Document final approach in test file comments.

---

## Test Plan

### Test Scope

**Unit Tests:**
- All 18 untested components (modal, drag, context menu, UI components)
- Focus on component behavior, props, user interactions
- Mock external dependencies (@dnd-kit, RTK Query, @repo/gallery)

**Integration Tests:**
- `main-page.tsx` - full page integration with all modals, tabs, search, filters
- Verify RTK Query mutations trigger MSW handlers
- Verify cache invalidation after mutations
- Verify keyboard shortcuts work across the page

**Not in Scope:**
- E2E tests (per ADR-005)
- Backend API tests
- Performance tests
- Visual regression tests

### Test Environment

**Tools:**
- Vitest (test runner)
- React Testing Library (component testing)
- MSW (API mocking)
- userEvent (user interactions)

**Mocks Available:**
- ResizeObserver (global mock in setup.ts)
- IntersectionObserver (global mock in setup.ts)
- matchMedia (global mock in setup.ts)
- TanStack Router (global mock in setup.ts)
- @repo/logger (global mock in setup.ts)
- MSW handlers for all inspiration API endpoints

**Custom Mocks Needed:**
- @dnd-kit/core (for drag testing)
- @dnd-kit/sortable (for sortable components)

### Test Data

**Mock Data Sources:**
- Reuse MSW handler mock data structure
- Consistent UUID format: `'123e4567-e89b-12d3-a456-426614174001'`
- Realistic inspiration/album data matching production schema

**Test Data Factories (optional):**
If mock data becomes complex, create factory functions:
```typescript
function createMockInspiration(overrides = {}) {
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    imageUrl: 'https://example.com/image.jpg',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}
```

### Coverage Targets

| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| Line Coverage | 70% | ~15% (3/23 components) | +55% |
| Branch Coverage | 65% | ~10% | +55% |
| Function Coverage | 60% | ~10% | +50% |

**Priority Coverage:**
1. `main-page.tsx` - 75%+ (highest value)
2. Modal components - 70%+
3. Drag components - 65%+ (mocking complexity)
4. Context menus - 70%+
5. UI components - 60%+ (presentational)

### Test Execution Plan

**Phase 1 - Foundation (Days 1-2):**
1. Research @dnd-kit testing approach
2. Create `main-page.test.tsx` skeleton
3. Implement main page rendering tests
4. Implement tab switching tests
5. Run coverage report - verify setup works

**Phase 2 - Critical Flows (Days 2-3):**
6. Main page modal opening tests
7. Main page keyboard shortcut tests
8. Main page search and filter tests
9. Delete modal tests (inspiration + album)
10. Edit modal tests
11. Upload modal tests

**Phase 3 - Secondary Features (Days 3-4):**
12. Create album modal tests
13. Add to album modal tests
14. Link to MOC modal tests
15. Context menu tests (inspiration + album)
16. DraggableInspirationGallery tests

**Phase 4 - Drag & UI (Days 4-5):**
17. Sortable card tests (inspiration + album)
18. Drag preview tests (inspiration + album)
19. EmptyState tests
20. Loading skeleton tests
21. Card skeleton tests

**Phase 5 - Coverage & Polish (Day 5):**
22. Run full coverage report
23. Identify gaps and add missing tests
24. Refactor duplicate code into helpers
25. Document complex mocks
26. Final test run and verification

### Acceptance Testing

**Verification Steps:**

1. **Run Full Test Suite:**
```bash
pnpm test --filter app-inspiration-gallery
```
All tests must pass.

2. **Generate Coverage Report:**
```bash
pnpm test:coverage --filter app-inspiration-gallery
```
Verify ≥70% line coverage, ≥65% branch coverage.

3. **Run Lint:**
```bash
pnpm lint --filter app-inspiration-gallery
```
No ESLint errors or warnings.

4. **Type Check:**
```bash
pnpm check-types --filter app-inspiration-gallery
```
No TypeScript errors.

5. **Manual Review:**
- Review test files for clarity and maintainability
- Verify BDD structure is consistent
- Verify semantic queries are used
- Verify accessibility tests are present
- Verify keyboard navigation tests are present
- Verify no test implementation details are tested

**Success Criteria:**
- All 18 untested components now have test files
- All test files follow established patterns
- Coverage targets met (70% line, 65% branch)
- All critical user flows tested
- All keyboard shortcuts tested
- All accessibility features tested
- No regressions in existing tests

---

## UI/UX Notes

### Accessibility Requirements

**Mandatory Accessibility Tests:**

All components must have accessibility tests verifying:

1. **ARIA Attributes:**
   - Modal components: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
   - Context menus: `role="menu"`, menu items `role="menuitem"`
   - Buttons: Clear `aria-label` for icon-only buttons
   - Form inputs: Associated labels via `htmlFor` or `aria-label`
   - Loading states: `aria-label="Loading..."` or `aria-live="polite"`

2. **Keyboard Support:**
   - All interactive elements reachable by Tab
   - Modal focus trap (Tab cycles within modal)
   - Escape closes modals and context menus
   - Enter/Space activates buttons and selects items
   - Arrow keys navigate context menus and gallery items
   - Delete key triggers delete action in multi-select mode
   - Keyboard shortcuts (Cmd+N, Cmd+U, etc.) work as documented

3. **Focus Management:**
   - Focus trapped in modal when open
   - Focus restored to trigger element when modal closes
   - Visible focus indicator on all interactive elements
   - Logical focus order (matches visual order)

4. **Screen Reader Support:**
   - All images have alt text
   - Icon-only buttons have aria-label
   - Loading states announced via aria-live regions
   - Success/error messages announced
   - Multi-select state announced ("2 items selected")
   - Drag operations announce reorder (if keyboard drag supported)

**Test Verification:**

For each component test file, include:
```typescript
describe('accessibility', () => {
  it('has correct ARIA attributes', () => {
    render(<Component />)
    const element = screen.getByRole('dialog')
    expect(element).toHaveAttribute('aria-modal', 'true')
    expect(element).toHaveAttribute('aria-labelledby')
  })

  it('traps focus within modal', async () => {
    const user = userEvent.setup()
    render(<Modal isOpen={true} />)

    const firstButton = screen.getByRole('button', { name: /close/i })
    const lastButton = screen.getByRole('button', { name: /submit/i })

    firstButton.focus()
    await user.tab()
    expect(lastButton).toHaveFocus()

    await user.tab()
    expect(firstButton).toHaveFocus() // focus wraps
  })
})
```

### User Experience Validation

**Empty States:**

Test that empty states provide clear next actions:
- **First-time user:** "Upload your first inspiration" with prominent upload button
- **No results:** "No inspirations match your search" with clear filter/reset option
- **Empty album:** "This album is empty" with "Add inspirations" button

**Loading States:**

Test that loading states don't flash for fast operations:
- Skeleton components should have minimum display time (if implemented)
- Loading spinners should appear after ~500ms delay
- Test that loading state renders before data arrives

**Error Messages:**

Test that error messages are actionable:
- API errors show user-friendly message (not raw error)
- Network errors suggest "Try again" action
- Validation errors explain how to fix
- Error messages don't expose internal details

**Multi-Select Mode:**

Test that multi-select mode is discoverable:
- Checkbox appears on card hover or in multi-select mode
- Bulk actions bar appears when items selected
- Clear "Exit selection mode" action
- Selection count displayed ("2 items selected")

**Drag Operations:**

Test that drag operations provide visual feedback:
- Drag preview shows item being dragged
- Drop target highlights when dragging over
- Reorder completes with visual confirmation
- Undo option available after reorder (if implemented)

**Keyboard Shortcuts:**

Document and test all keyboard shortcuts:
- Escape - Exit multi-select mode, close modals
- Delete - Delete selected items
- Ctrl+A / Cmd+A - Select all items
- Cmd+N - New inspiration
- Cmd+U - Upload modal
- Cmd+L - Link to MOC modal
- Cmd+M - Add to album modal

Test in `main-page.test.tsx` under "keyboard shortcuts" describe block.

---

## Reality Baseline

**Baseline Date:** 2026-02-11 (seed generation date)

**Codebase State:**

```yaml
existing_test_files:
  - src/components/App.test.tsx (basic test)
  - src/components/BulkActionsBar/__tests__/BulkActionsBar.test.tsx (207 lines, complete)
  - src/components/InspirationCard/__tests__/InspirationCard.test.tsx (342 lines, complete)
  - src/components/AlbumCard/__tests__/AlbumCard.test.tsx (complete)

test_infrastructure:
  - src/test/setup.ts (global mocks: ResizeObserver, IntersectionObserver, matchMedia, TanStack Router, @repo/logger)
  - src/test/test-utils.tsx (custom render utilities)
  - src/test/mocks/handlers.ts (MSW handlers for all inspiration API endpoints)
  - vitest.config.ts (coverage enabled)

msw_handlers:
  - GET /inspiration (list with pagination)
  - GET /inspiration/:id (single inspiration)
  - POST /inspiration (create)
  - PATCH /inspiration/:id (update)
  - DELETE /inspiration/:id (delete)
  - GET /inspiration/albums (album list)
  - GET /inspiration/albums/:id (single album)
  - POST /inspiration/albums (create album)
  - PATCH /inspiration/albums/:id (update album)
  - DELETE /inspiration/albums/:id (delete album)
  - POST /inspiration/presign (presigned URL)

untested_components:
  total: 18
  pages:
    - main-page.tsx (885 lines - HIGHEST PRIORITY)
  modals:
    - AddToAlbumModal/index.tsx
    - CreateAlbumModal/index.tsx
    - DeleteAlbumModal/index.tsx
    - DeleteInspirationModal/index.tsx
    - EditInspirationModal/index.tsx
    - LinkToMocModal/index.tsx
    - UploadModal/index.tsx
  drag_components:
    - DraggableInspirationGallery/index.tsx
    - SortableAlbumCard/index.tsx
    - SortableInspirationCard/index.tsx
    - AlbumDragPreview/index.tsx
    - InspirationDragPreview/index.tsx
  context_menus:
    - AlbumContextMenu/index.tsx
    - InspirationContextMenu/index.tsx
  ui_components:
    - EmptyState/index.tsx
    - GalleryLoadingSkeleton/index.tsx
    - AlbumCardSkeleton/index.tsx
    - InspirationCardSkeleton/index.tsx

shared_packages:
  - '@repo/gallery':
      - GalleryCard (tested through integration)
      - GalleryFilterBar (tested through integration)
      - useGalleryKeyboard (keyboard shortcuts hook)
      - useRovingTabIndex (arrow key navigation hook)
  - '@repo/accessibility':
      - useAnnouncer (screen reader announcements)
  - '@repo/api-client/rtk/inspiration-api':
      - RTK Query hooks for all inspiration APIs
  - '@repo/hooks':
      - useMultiSelect (multi-select logic)

related_work:
  - BUGF-032 (in-progress): Presigned URL upload integration - may affect UploadModal tests but no blocking conflict

constraints:
  - CLAUDE.md minimum coverage: 45% global (this story targets 70% for inspiration gallery)
  - ADR-005: E2E tests exempt for Phase 3 test coverage stories
  - Vitest + React Testing Library required
  - Semantic queries preferred (getByRole, getByLabelText)
  - Tests must be in __tests__/ directories
  - React 19 functional components
  - Zod-first types for all props

test_patterns:
  - BDD structure: rendering, interactions, accessibility, keyboard navigation
  - userEvent for user interactions (not fireEvent)
  - vi.fn() for mocking callbacks
  - beforeEach cleanup: vi.clearAllMocks()
  - Modal pattern: open/close, confirm/cancel, validation, async operations
  - Card pattern: hover, selection mode, keyboard nav, click handlers
  - Accessibility tests mandatory for all components
```

**Protected Features:**
- Do not modify existing test files (BulkActionsBar, InspirationCard, AlbumCard)
- Do not modify MSW handlers unless API contract changed
- Do not modify global test setup (src/test/setup.ts)
- Do not modify component implementations to make tests pass (except actual bug fixes → separate story)

**Known Gaps from Baseline:**
- No @dnd-kit mocking approach documented (needs research)
- No modal test helper pattern (opportunity to create reusable helper)
- No test data factory functions (optional, create if needed)
- Coverage thresholds not enforced in vitest.config.ts (optional to add)

**No Active Baseline:** Story seed generated from codebase scanning only (no baseline was active at time of seed generation).

---

## Predictions

**Sizing Estimate:** 5 points (3-5 days)

**Complexity Factors:**
- 18 untested components
- Main page is 885 lines with complex integration
- @dnd-kit mocking requires research and setup
- High test coverage target (70%)
- Accessibility tests mandatory for all components

**Risk Assessment:**

| Risk | Severity | Mitigation |
|------|----------|------------|
| @dnd-kit mocking complex | Medium | Research official docs, test handlers in isolation, document approach |
| Main page test too broad | Medium | Break into smaller describe blocks, use within() for scoping |
| Test suite slow | Low | Use test.concurrent for independent tests, monitor performance |
| Coverage gaps remain | Low | Run coverage report early, iterate on gaps |
| Modal duplication | Low | Create reusable test helper if duplication high |

**Predicted Metrics:**

```yaml
split_risk: 0.3
confidence: low
reason: "Heuristics-only mode - no historical data available"

review_cycles: 2
confidence: low
reason: "Estimated based on story complexity (drag testing, high coverage target)"

token_estimate: 120000
confidence: low
reason: "Large scope (18 components), complex integration test, accessibility requirements"
```

**Notes:**
- Predictions generated in heuristics-only mode (WKFL-006 learning data not available)
- Split risk low: Tests are additive, no component changes
- Review cycles medium: QA may request additional test coverage for edge cases
- Token estimate high: Large scope, detailed test requirements, accessibility focus

---

## Story Generation Metadata

**Generated:** 2026-02-11T00:00:00Z
**Generator:** pm-story-generation-leader agent v4.2.0
**Experiment Variant:** control
**Seed File:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-012/_pm/STORY-SEED.md`
**Baseline Used:** None (codebase scanning only)
**Conflicts Detected:** 0
**Blocking Conflicts:** 0

**Quality Gates:**
- [x] Seed integrated (reality context, retrieved context incorporated)
- [x] No blocking conflicts (BUGF-032 non-blocking)
- [x] Index fidelity (scope matches index entry)
- [x] Reuse-first (existing test patterns, MSW handlers, test utilities)
- [x] Test plan present (comprehensive test strategy documented)
- [x] ACs verifiable (all ACs have clear verification criteria)
- [x] Experiment variant assigned (control)

**Worker Outputs:**
- Test Plan: Integrated from seed recommendations
- UI/UX Notes: Accessibility requirements documented
- Dev Feasibility: Technical considerations and @dnd-kit research documented
- Risk Predictions: Generated (heuristics-only mode)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | No MVP-critical gaps identified | Story complete as-is | No |

All core requirements are present. Test infrastructure complete (MSW, vitest, mocks). All 18 components clearly scoped. All acceptance criteria testable.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1 | Reusable Modal Test Helper | enhancement | Deferred to KB |
| 2 | Reusable Keyboard Navigation Test Helper | enhancement | Deferred to KB |
| 3 | Test Data Factory Functions | enhancement | Deferred to KB |
| 4 | Coverage Threshold Enforcement | enhancement | Deferred to KB (apply after tests written) |
| 5 | Integration Test for Full User Journey | enhancement | Deferred to KB |
| 6 | Visual Regression Tests for Skeletons | enhancement | Deferred to KB |
| 7 | Performance Testing for Large Galleries | enhancement | Deferred to KB |
| 8 | Accessibility Audit with axe-core | enhancement | Deferred to KB |
| 9 | Test for RTK Query Cache Invalidation | enhancement | Deferred to KB |
| 10 | Mock @dnd-kit with Test Utilities | enhancement | Deferred to KB |
| 11 | Snapshot Tests for Empty States | enhancement | Deferred to KB |
| 12 | Test Coverage for Error Boundary Fallbacks | enhancement | Deferred to KB |
| 13 | Internationalization Test Preparation | enhancement | Deferred to KB |
| 14 | Test for Browser Compatibility (Safari) | enhancement | Deferred to KB |
| 15 | Component Integration with @repo/gallery Internals | enhancement | Deferred to KB |
| 16 | Test for Concurrent User Actions | enhancement | Deferred to KB |
| 17 | MSW Handler Edge Cases | enhancement | Deferred to KB |
| 18 | Test for Undo/Redo in DraggableInspirationGallery | enhancement | Deferred to KB |
| 19 | Test for Multi-Select Limits | enhancement | Deferred to KB |
| 20 | Test for Tag Input in Modals | enhancement | Deferred to KB |

### Audit Results Summary

**Audit Check Results:** 8/8 PASS
- Scope Alignment: PASS
- Internal Consistency: PASS
- Reuse-First: PASS
- Local Testability: PASS
- Decision Completeness: PASS
- Risk Disclosure: PASS
- Story Sizing: PASS

**Issues & Gaps:**
- 0 MVP-critical gaps
- 4 informational issues (all non-blocking)
- 20 enhancements identified (deferred to future work)
- 10 non-blocking edge case gaps identified

### Summary

- ACs added: 0 (all original ACs complete and adequate)
- KB entries created: 0 (KB unavailable, entries deferred in DEFERRED-KB-WRITES.yaml)
- Mode: autonomous
- Verdict: PASS
- Status: Ready for implementation (ready-to-work)
