---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-012

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline exists. Story seed generated from codebase scanning only.

**WARNING:** No active baseline exists. Proceeded with codebase scanning to generate seed.

### Relevant Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| Inspiration Gallery App | Deployed | `apps/web/app-inspiration-gallery` |
| Existing Test Suite | Partial | 4 test files exist (App.test.tsx, BulkActionsBar, InspirationCard, AlbumCard) |
| MSW Test Infrastructure | Active | `src/test/mocks/` with handlers for inspiration API |
| Vitest Configuration | Complete | `vitest.config.ts` with coverage enabled |
| Test Setup File | Complete | `src/test/setup.ts` with global mocks |
| Component Library | 23 components | 21 component directories + 2 additional .tsx files |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| BUGF-032 | in-progress | Frontend integration for presigned URL upload - may affect UploadModal testing |

### Constraints to Respect

1. **CLAUDE.md Requirements:**
   - Minimum 45% test coverage global target
   - Use Vitest + React Testing Library
   - Semantic queries preferred (`getByRole`, `getByLabelText`)
   - Tests must be in `__tests__/` directories

2. **Project Architecture:**
   - React 19 components (all components use functional style)
   - Zod-first types (all props use Zod schemas)
   - MSW for API mocking
   - @repo/gallery, @repo/hooks, @repo/accessibility for shared functionality

3. **Existing Test Patterns:**
   - BDD-style describe blocks (rendering, interactions, accessibility, keyboard navigation)
   - userEvent for user interactions
   - vi.fn() for mocking callbacks
   - Accessibility tests for ARIA attributes and keyboard support

---

## Retrieved Context

### Related Components (Untested - 18 total)

**High Priority (User-Facing Pages):**
1. `main-page.tsx` - Main gallery page with tabs, search, filtering (885 lines)

**Modal Components (7):**
2. `AddToAlbumModal/index.tsx` - Add inspirations to albums
3. `CreateAlbumModal/index.tsx` - Create new album
4. `DeleteAlbumModal/index.tsx` - Confirm album deletion
5. `DeleteInspirationModal/index.tsx` - Confirm inspiration deletion
6. `EditInspirationModal/index.tsx` - Edit inspiration metadata
7. `LinkToMocModal/index.tsx` - Link to MOC instructions
8. `UploadModal/index.tsx` - Upload new inspiration

**Drag & Drop Components (5):**
9. `DraggableInspirationGallery/index.tsx` - Drag-sortable grid view
10. `SortableAlbumCard/index.tsx` - Draggable album card
11. `SortableInspirationCard/index.tsx` - Draggable inspiration card
12. `AlbumDragPreview/index.tsx` - Drag preview overlay
13. `InspirationDragPreview/index.tsx` - Drag preview overlay

**Context Menu Components (2):**
14. `AlbumContextMenu/index.tsx` - Right-click menu for albums
15. `InspirationContextMenu/index.tsx` - Right-click menu for inspirations

**UI Components (4):**
16. `EmptyState/index.tsx` - Empty states for gallery
17. `GalleryLoadingSkeleton/index.tsx` - Loading skeleton
18. `AlbumCardSkeleton/index.tsx` - Album card skeleton
19. `InspirationCardSkeleton/index.tsx` - Inspiration card skeleton

**Tested Components (3):**
- `BulkActionsBar/index.tsx` - Complete test coverage (207 lines)
- `InspirationCard/index.tsx` - Complete test coverage (342 lines)
- `AlbumCard/index.tsx` - Complete test coverage

**Module Components (2 - lower priority):**
- `module-layout.tsx` - Shared layout (candidate for consolidation per BUGF-045)
- `App.tsx` - App entry (basic test exists)

### Related API Endpoints (Mocked in MSW)

| Endpoint | Mock Handler | Coverage |
|----------|--------------|----------|
| GET `/inspiration` | ✓ | Returns list with pagination |
| GET `/inspiration/:id` | ✓ | Returns single inspiration |
| POST `/inspiration` | ✓ | Creates inspiration |
| PATCH `/inspiration/:id` | ✓ | Updates inspiration |
| DELETE `/inspiration/:id` | ✓ | Deletes inspiration |
| GET `/inspiration/albums` | ✓ | Returns album list |
| GET `/inspiration/albums/:id` | ✓ | Returns single album |
| POST `/inspiration/albums` | ✓ | Creates album |
| PATCH `/inspiration/albums/:id` | ✓ | Updates album |
| DELETE `/inspiration/albums/:id` | ✓ | Deletes album |
| POST `/inspiration/presign` | ✓ | Returns presigned URL |

### Reuse Candidates

**Test Patterns from Existing Tests:**
- `BulkActionsBar/__tests__/BulkActionsBar.test.tsx` - Modal/toolbar testing pattern
- `InspirationCard/__tests__/InspirationCard.test.tsx` - Card component testing with GalleryCard integration
- `AlbumCard/__tests__/AlbumCard.test.tsx` - Card component with metadata testing

**Test Utilities:**
- `src/test/test-utils.tsx` - Custom render utilities
- `src/test/mocks/handlers.ts` - MSW handlers for all inspiration APIs
- `src/test/setup.ts` - Global mocks (ResizeObserver, IntersectionObserver, matchMedia, TanStack Router, @repo/logger)

**Shared Packages for Testing:**
- `@repo/hooks/useMultiSelect` - Multi-select logic (re-exported from app)
- `@repo/gallery/useGalleryKeyboard` - Keyboard shortcuts
- `@repo/gallery/useRovingTabIndex` - Keyboard navigation
- `@repo/accessibility/useAnnouncer` - Screen reader announcements
- `@repo/api-client/rtk/inspiration-api` - RTK Query hooks

---

## Knowledge Context

### Lessons Learned

**Note:** No lessons loaded - baseline not active. The following are inferred from existing test patterns in the codebase.

### Blockers to Avoid (from past stories)

- Drag testing requires special setup with @dnd-kit/core mocking
- Modal testing requires proper cleanup between tests
- RTK Query mutations require MSW handlers and proper cache invalidation testing

### Architecture Decisions (ADRs)

**Note:** ADR log not loaded in this execution. General ADR-005 constraint applies per stories index.

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | E2E tests exempt for Phase 3 test coverage stories - unit/integration tests only |

### Patterns to Follow

**From Existing Tests:**
1. **BDD Structure:** `describe('ComponentName') > describe('rendering/interactions/accessibility/keyboard')`
2. **Accessibility First:** Every component test includes accessibility describe block
3. **Semantic Queries:** Use `getByRole`, `getByLabelText`, `getByText` over test IDs
4. **User Event:** Use `@testing-library/user-event` for interactions (not fireEvent)
5. **Mock Cleanup:** Clear mocks in `beforeEach`
6. **Modal Testing:** Test open/close states, confirm/cancel actions, form validation
7. **Card Testing:** Test hover overlays, selection mode, keyboard navigation, click handlers

### Patterns to Avoid

1. **Don't** use `fireEvent` - use `userEvent` instead
2. **Don't** test implementation details - test user behavior
3. **Don't** skip accessibility tests
4. **Don't** create barrel files for tests
5. **Don't** use console.log in tests - use @repo/logger (mocked)

---

## Conflict Analysis

**No conflicts detected.**

**Notes:**
- BUGF-032 (in-progress) touches upload functionality but is focused on backend integration, not UploadModal component itself
- No overlapping file modifications expected
- Test additions are purely additive

---

## Story Seed

### Title

Add Test Coverage for Inspiration Gallery Components

### Description

**Context:**

The inspiration gallery app (`apps/web/app-inspiration-gallery`) has 23 components with only 3 components having test coverage: BulkActionsBar, InspirationCard, and AlbumCard. The remaining 18 components lack tests, including the critical main-page.tsx (885 lines) that orchestrates the entire gallery experience.

The app has robust test infrastructure in place:
- MSW handlers for all inspiration API endpoints
- Global test setup with mocks for browser APIs
- Test utilities for custom rendering
- Vitest configuration with coverage reporting

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

**Problem:**

Without test coverage, we cannot:
- Confidently refactor components
- Catch regressions in critical user flows (upload, delete, edit, drag-sort)
- Validate accessibility features (keyboard nav, screen reader announcements)
- Ensure modal interactions work correctly (open/close, confirm/cancel)
- Verify multi-select and bulk operations function properly

**Proposed Solution:**

Implement comprehensive unit tests for all 18 untested components following established patterns from BulkActionsBar and InspirationCard tests. Prioritize testing in this order:

1. **Phase 1 - Critical User Flows (P0):**
   - main-page.tsx - Full user flow integration
   - DraggableInspirationGallery - Drag-sort functionality

2. **Phase 2 - Modal Components (P1):**
   - DeleteInspirationModal, DeleteAlbumModal - Destructive actions
   - EditInspirationModal - Edit flow
   - UploadModal - Upload flow
   - CreateAlbumModal, AddToAlbumModal, LinkToMocModal - Creation flows

3. **Phase 3 - Context Menus (P1):**
   - InspirationContextMenu, AlbumContextMenu - Right-click actions

4. **Phase 4 - Drag Components (P2):**
   - SortableAlbumCard, SortableInspirationCard
   - AlbumDragPreview, InspirationDragPreview

5. **Phase 5 - UI Components (P3):**
   - EmptyState, GalleryLoadingSkeleton, AlbumCardSkeleton, InspirationCardSkeleton

### Initial Acceptance Criteria

**AC-1: Main Page Testing (High Priority)**
- [ ] Test tab switching (All Inspirations / Albums)
- [ ] Test search functionality
- [ ] Test sort options (sortOrder, createdAt, title)
- [ ] Test view mode toggle (grid/list)
- [ ] Test empty states (first-time user, no results, no items)
- [ ] Test loading states
- [ ] Test error states
- [ ] Test multi-select mode toggle
- [ ] Test keyboard shortcuts (Escape, Delete, Ctrl+A, Cmd+N, Cmd+U, Cmd+L, Cmd+M)
- [ ] Test modal opening/closing flows
- [ ] Test card click handlers (inspiration and album)
- [ ] Test context menu opening

**AC-2: Modal Component Testing**
- [ ] Each modal renders correctly when open
- [ ] Each modal can be closed via close button, cancel, or Escape key
- [ ] Form modals validate input and show errors
- [ ] Confirm actions call correct handlers with correct data
- [ ] Loading states display during async operations
- [ ] Success states close modal and show toast
- [ ] Error states display error messages

**AC-3: Drag & Drop Component Testing**
- [ ] DraggableInspirationGallery renders items in sortable grid
- [ ] Drag events trigger proper handlers (mock @dnd-kit)
- [ ] Sortable cards render with drag handle
- [ ] Drag preview components display correct content
- [ ] Keyboard accessibility for drag operations (if applicable)

**AC-4: Context Menu Testing**
- [ ] Context menus render with correct options
- [ ] Each menu option calls correct handler
- [ ] Context menus close after action
- [ ] Keyboard navigation works (Arrow keys, Enter, Escape)

**AC-5: UI Component Testing**
- [ ] EmptyState renders correct variant (first-time, no-results, no-items)
- [ ] EmptyState action buttons call correct handlers
- [ ] Loading skeletons render correct count and variant
- [ ] Skeletons have correct animation classes

**AC-6: Test Coverage Metrics**
- [ ] Achieve minimum 70% line coverage for inspiration gallery app
- [ ] Achieve minimum 65% branch coverage
- [ ] All critical user flows have integration test coverage
- [ ] All interactive components have keyboard navigation tests
- [ ] All components have accessibility tests

**AC-7: Test Infrastructure**
- [ ] All tests use existing MSW handlers (no new mocks needed unless API changed)
- [ ] All tests follow BDD structure from existing test files
- [ ] All tests use semantic queries (getByRole preferred)
- [ ] All tests use userEvent for interactions
- [ ] All tests clean up properly (no memory leaks, no hanging promises)

**AC-8: Documentation**
- [ ] Add JSDoc comments to complex test helpers if created
- [ ] Update vitest config if coverage thresholds are added
- [ ] Document any special test setup required for drag testing

### Non-Goals

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
- Existing test setup - do not break global mocks
- Component implementations - do not change component code to make tests pass (exception: fixing actual bugs requires separate story)

**Deferred:**
- Integration with shared gallery components from @repo/gallery (test as black box)
- Testing hooks in isolation (test through component behavior)
- Testing custom render utilities (if needed, create separate story)

### Reuse Plan

**Components:**
- Reuse test structure from `BulkActionsBar/__tests__/BulkActionsBar.test.tsx` for toolbar-style components
- Reuse test structure from `InspirationCard/__tests__/InspirationCard.test.tsx` for card components
- Reuse accessibility test patterns from both existing test files

**Patterns:**
- BDD describe blocks: `rendering`, `interactions`, `accessibility`, `keyboard navigation`
- Mock cleanup pattern: `beforeEach(() => { vi.clearAllMocks() })`
- Accessibility assertions: role, aria-label, aria-selected, keyboard support
- Modal testing pattern: open/close, confirm/cancel, form validation, async operations

**Packages:**
- `@testing-library/react` - render, screen, within
- `@testing-library/user-event` - user interactions
- `vitest` - vi.fn(), vi.mock(), describe, it, expect
- MSW handlers from `src/test/mocks/handlers.ts` - all inspiration API mocking
- Test utilities from `src/test/test-utils.tsx` - custom render if needed

**Test Data:**
- Reuse mock data structure from MSW handlers for consistency
- Use same UUID format as existing tests: `'123e4567-e89b-12d3-a456-426614174001'`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Priority Guidance:**
1. **Start with main-page.tsx** - This is the highest risk and highest value test. All other components are used by this page, so integration issues will surface here.
2. **Then modals** - These are user-facing and contain critical flows (delete, edit, upload).
3. **Drag components need special setup** - Research @dnd-kit testing best practices. Likely need to mock the entire drag system. Consider using `@dnd-kit/core` test utilities if available.
4. **Context menus are lower priority** - They're wrappers around existing UI, so basic rendering and click tests are sufficient.

**Test Strategy:**
- Use RTK Query cache state for integration tests (verify cache updates after mutations)
- Mock window.open for source link tests
- Mock toast.success/toast.error for user feedback tests
- Consider using `waitFor` for async state updates from RTK Query

**Coverage Target:**
- Aim for 70% line coverage minimum (above global 45% target)
- Focus on critical paths: upload, delete, edit, drag-sort, multi-select
- Accessibility tests are mandatory for all interactive components

### For UI/UX Advisor

**Accessibility Requirements:**
- All modals must have proper focus management (focus trap, restore focus on close)
- All keyboard shortcuts must be documented and tested
- All form inputs must have associated labels
- All interactive elements must have visible focus indicators
- All drag operations should have keyboard alternatives (if not, document limitation)

**User Experience Validation:**
- Empty states provide clear next actions
- Loading states don't flash for fast operations
- Error messages are actionable
- Multi-select mode is discoverable
- Drag operations provide visual feedback

### For Dev Feasibility

**Technical Considerations:**
1. **@dnd-kit Mocking:** Research how to mock @dnd-kit/core for drag tests. May need to mock the entire DndContext provider. Consider testing drag handlers in isolation rather than full drag behavior.

2. **RTK Query Testing:** Existing MSW handlers provide API responses. Tests should verify:
   - Mutations trigger correct API calls
   - Cache invalidation happens correctly
   - Optimistic updates work (if implemented)
   - Error handling displays user-facing messages

3. **TanStack Router Mocking:** Already mocked in setup.ts. Verify navigation tests work with existing mocks. May need to enhance mocks for edit page navigation tests.

4. **Modal Testing:** All modals use similar patterns. Create a test helper function to reduce duplication:
   ```typescript
   function testModalOpenClose(Component, openProps, closeMethod) {
     // Reusable modal open/close test logic
   }
   ```

5. **Test Performance:** 18 new test files could slow down test suite. Monitor vitest run time and consider:
   - Using `vi.hoisted()` for expensive mock setup
   - Splitting large test files into multiple smaller files
   - Using `test.concurrent` for independent tests

6. **Coverage Gaps:** After tests are written, run coverage report and identify remaining gaps. Focus on:
   - Error boundaries (if they exist)
   - Edge cases in form validation
   - Race conditions in async operations

**Estimated Complexity:**
- **Main page:** High (complex integration test)
- **Modals:** Medium (standard form/dialog testing)
- **Drag components:** High (requires mocking @dnd-kit)
- **Context menus:** Low (simple click handlers)
- **UI components:** Low (presentational components)

**Dependencies:**
- No new package dependencies needed
- Existing test infrastructure is sufficient
- May need to research @dnd-kit testing docs
