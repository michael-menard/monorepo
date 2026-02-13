---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-014

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file found for this epic. Proceeding with codebase scanning and ADR analysis.

### Relevant Existing Features
- Sets Gallery app (`apps/web/app-sets-gallery`) is fully functional with CRUD operations
- Main page, add-set-page, and edit-set-page already have test coverage (3 test files)
- SetCard, ImageUploadZone, and TagInput components have existing tests
- Sets API integration via RTK Query (`@repo/api-client/rtk/sets-api`) is complete
- MSW handlers configured for Sets API endpoints in test/mocks/server
- @repo/gallery package provides shared GalleryFilterBar, GalleryGrid, and other gallery components
- BUGF-003 (Sets Edit/Delete) completed and in UAT phase

### Active In-Progress Work
- BUGF-010: Fix Hub.listen Mocking in Auth Tests (in-progress) - no overlap
- BUGF-012: Add Test Coverage for Inspiration Gallery Components (in-progress) - similar scope, different app

### Constraints to Respect
- ADR-005: Testing Strategy - UAT must use real services, unit tests may use MSW mocking
- ADR-006: E2E Tests Required in Dev Phase - at least one happy-path E2E test per UI-facing AC
- CLAUDE.md: Minimum 45% test coverage required globally
- Test framework: Vitest + React Testing Library
- Use semantic queries (getByRole, getByLabelText) per CLAUDE.md

---

## Retrieved Context

### Related Endpoints
From `@repo/api-client/rtk/sets-api`:
- `GET /api/sets` - List sets with pagination, search, theme, isBuilt filters, and sorting
- `GET /api/sets/:id` - Get set by ID (used by SetDetailPage)
- `POST /api/sets` - Create new set
- `PATCH /api/sets/:id` - Update set
- `DELETE /api/sets/:id` - Delete set

### Related Components

**Untested components (target for this story):**
1. `GalleryGrid.tsx` - Generic grid layout wrapper (47 lines)
2. `set-detail-page.tsx` - Complex detail view with lightbox, delete dialog, routing (584 lines)
3. `module-layout.tsx` - Layout wrapper (32 lines)

**Note:** `GalleryFilterBar` is from `@repo/gallery` package and is NOT app-specific. Testing shared components belongs in the package itself, not in app-sets-gallery.

**Components with existing tests:**
- `SetCard.tsx` - Has tests
- `ImageUploadZone.tsx` - Has tests
- `TagInput.tsx` - Has tests
- `main-page.tsx` - Has tests (383 lines, comprehensive MSW integration)
- `add-set-page.tsx` - Has tests (210 lines)
- `edit-set-page.tsx` - Has tests (new from BUGF-003)

### Reuse Candidates

**Test Patterns:**
- `main-page.test.tsx` - MSW handler for dynamic filtering/sorting/pagination (lines 128-209)
- `add-set-page.test.tsx` - Form submission with RTK Query mutation mocking
- `edit-set-page.test.tsx` - Edit flow with navigation and toast assertions
- Existing SetCard tests - Card rendering patterns

**Shared Gallery Tests:**
- `@repo/gallery/src/__tests__/GalleryGrid.test.tsx` - Existing tests for shared GalleryGrid component
- `@repo/gallery/src/__tests__/GalleryLightbox.test.tsx` - Lightbox interaction patterns
- `@repo/gallery/src/__tests__/GalleryFilters.test.tsx` - Filter bar testing patterns

**Test Infrastructure:**
- MSW server configured in `src/test/setup.ts`
- Global mocks: matchMedia, ResizeObserver, IntersectionObserver, TanStack Router, @repo/logger
- RTK Query store setup pattern in main-page.test.tsx (lines 101-107)

---

## Knowledge Context

### Lessons Learned

No KB access during autonomous mode. ADR-LOG.md reviewed for applicable constraints.

### Blockers to Avoid (from past stories)
- **API path mismatch**: Ensure MSW handlers use correct `/api/sets` paths per ADR-001
- **Missing test providers**: SetDetailPage uses useToast, requires TooltipProvider wrapper
- **Router context missing**: Components using useParams/useNavigate require MemoryRouter

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/sets`, MSW handlers: `/api/sets` (rewrite handled by Vite proxy) |
| ADR-005 | Testing Strategy | Unit tests may use MSW mocking; UAT must use real services |
| ADR-006 | E2E Tests Required | At least one happy-path E2E test per UI-facing AC during dev phase |

### Patterns to Follow
- Use MSW to mock RTK Query API calls in unit tests
- Wrap components in MemoryRouter for routing context
- Provide TooltipProvider for components using tooltips/toasts
- Create configureStore helper with setsApi reducer and middleware
- Use `waitFor` for async RTK Query state updates
- Test error states (404, 403, network errors) for API-dependent components
- Use `data-testid` attributes for complex queries (e.g., lightbox, dialogs)

### Patterns to Avoid
- Don't test shared `@repo/gallery` components in app-sets-gallery (they belong in the package)
- Don't skip E2E tests if UI-facing ACs exist (ADR-006)
- Don't use console.log - use @repo/logger (CLAUDE.md)
- Don't create barrel files (CLAUDE.md)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title
Add Test Coverage for Sets Gallery Components

### Description

The Sets Gallery app (`app-sets-gallery`) currently has test coverage for the main page, add/edit pages, and three core components (SetCard, ImageUploadZone, TagInput). However, three key components remain untested:

1. **GalleryGrid** - Generic grid layout wrapper used by main-page and set-detail-page
2. **SetDetailPage** - Complex detail view with image gallery, lightbox, delete dialog, routing, and error states
3. **ModuleLayout** - Layout wrapper for module pages

**Context from reality:**
- BUGF-003 (Sets Edit/Delete) is complete and in UAT, providing edit-set-page as a reference
- Main-page.test.tsx demonstrates comprehensive MSW integration with dynamic filtering
- @repo/gallery package already has extensive test coverage for shared components like GalleryFilterBar, GalleryGrid (as a shared component), and GalleryLightbox

**Problem:**
Without test coverage for these components, regressions in the set detail view, layout consistency, or grid rendering may go undetected. SetDetailPage is particularly complex with 584 lines covering multiple user flows (view, edit navigation, delete, lightbox, error states).

**Proposed Solution:**
Add focused unit tests for these three components following established patterns from existing test files. Prioritize SetDetailPage due to its complexity and critical user-facing functionality.

### Initial Acceptance Criteria

- [ ] AC-1: GalleryGrid component has tests covering loading state, empty state, and item rendering
- [ ] AC-2: SetDetailPage has tests for successful set load, skeleton state, 404 not found, 403 forbidden, and generic error states
- [ ] AC-3: SetDetailPage has tests for edit navigation, delete dialog flow, and delete mutation success/failure
- [ ] AC-4: SetDetailPage has tests for lightbox opening/closing when images are present
- [ ] AC-5: ModuleLayout component has basic rendering tests
- [ ] AC-6: All new tests follow existing patterns (MSW mocking, MemoryRouter, semantic queries)
- [ ] AC-7: All tests pass with minimum 70% line coverage for tested components
- [ ] AC-8: No console.log usage in tests - use @repo/logger if logging needed

### Non-Goals

- Testing shared `@repo/gallery` components (GalleryFilterBar, GalleryLightbox internals) - these belong in the package
- E2E tests for the full sets gallery flow - deferred to BUGF-030 (Comprehensive E2E Suite)
- Testing BuildStatusFilter component - separate component not listed in story scope
- Refactoring or modifying component implementations - tests only
- Improving test coverage for already-tested components (main-page, add-set-page, edit-set-page)
- Backend API tests for sets endpoints - covered by backend test suite
- Visual regression tests - out of scope for unit tests
- Performance testing for large galleries - out of scope

### Reuse Plan

**Components:**
- Reuse SetCard tests as reference for card rendering assertions
- Reuse existing test wrappers (MemoryRouter, TooltipProvider, RTK store setup)

**Patterns:**
- Follow main-page.test.tsx MSW handler pattern for dynamic API responses
- Follow add-set-page.test.tsx RTK Query mutation mocking pattern
- Follow edit-set-page.test.tsx navigation and toast assertion pattern
- Refer to @repo/gallery GalleryGrid.test.tsx for shared component testing approach
- Refer to @repo/gallery GalleryLightbox.test.tsx for lightbox interaction patterns

**Packages:**
- @testing-library/react (already configured)
- @testing-library/user-event (already configured)
- msw for API mocking (already configured in test/setup.ts)
- vitest (already configured)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- SetDetailPage is the highest priority due to complexity (584 lines, multiple error states)
- GalleryGrid is straightforward (47 lines, simple layout logic) - use as warm-up
- ModuleLayout is trivial (32 lines, just a wrapper) - lowest priority
- Consider edge cases: SetDetailPage with no images, no purchase info, no notes, no tags
- MSW handlers already exist for GET /api/sets/:id (verify in test/mocks/server)
- SetDetailPage uses FetchBaseQueryError type guards - test 404, 403, generic error branches
- Delete flow requires mocking useDeleteSetMutation - reference BUGF-003 edit-page tests

### For UI/UX Advisor
- SetDetailPage has sophisticated error states (404, 403, generic) with user-friendly messages
- Lightbox integration provides accessible image viewing (aria-labels present)
- Delete confirmation dialog uses destructive variant with clear warning text
- Back navigation uses ghost button with ArrowLeft icon for consistency
- Consider accessibility: all interactive elements have aria-labels, focus management tested

### For Dev Feasibility
- All test infrastructure is in place (MSW, vitest, global mocks)
- No new dependencies required
- SetDetailPage test complexity: ~200-300 lines estimated (similar to main-page)
- GalleryGrid test complexity: ~50-80 lines estimated
- ModuleLayout test complexity: ~20-30 lines estimated
- Total estimated test code: ~300-400 lines
- Risk: SetDetailPage lightbox interactions may require additional React Testing Library queries
- Risk: Delete dialog confirmation flow requires careful sequencing of user events

---

**STORY-SEED COMPLETE**
