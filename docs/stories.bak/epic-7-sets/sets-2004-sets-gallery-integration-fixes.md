# Story sets-2004: Sets Gallery Integration & UX Fixes (Follow-up to sets-2001)

## Status

Draft

## Consolidates

- Follow-up on **sets-2001: Sets Gallery MVP (Vertical Slice)** to:
  - Replace mock API usage with real endpoints
  - Align gallery filters/sorting/pagination with backend capabilities
  - Finalize card and detail page UX per PRD
  - Clarify router behavior and navigation

## Story

**As a** user,
**I want** the sets gallery and detail views to behave consistently and reflect my real data,
**So that** I can confidently browse and manage my LEGO set collection without placeholder or mock behavior.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) – Gallery View & Detail View refinements.

## Dependencies

- [ ] **sets-2001**: Sets Gallery MVP (vertical slice)
- [ ] Backend endpoints and RTK Query slice from sets-2001 deployed and available

## Acceptance Criteria

### Detail Page – Real Data & Behavior

- [ ] `/sets/:id` page loads data via `useGetSetByIdQuery` from `@repo/api-client/rtk/sets-api`.
- [ ] The detail page no longer imports or depends on `mock-sets-api` for runtime data.
- [ ] When the set exists and belongs to the user:
  - [ ] All set metadata is shown (title, setNumber, pieceCount, theme, tags, quantity, isBuilt, purchase info, notes).
  - [ ] All associated images are shown in a gallery/grid layout.
  - [ ] Clicking an image opens a lightbox view with keyboard navigation (next/prev, escape to close).
- [ ] When the set does not exist, the page renders a 404-style state matching the app’s design system.
- [ ] When the set belongs to another user and the API returns 403, the user sees an appropriate error state (e.g. "You don’t have access to this set") instead of a generic failure.
- [ ] The "Back" button returns the user to the sets gallery at `/sets` (not `/`), preserving the mental model that the gallery is the entry point.

### Gallery Filters, Sorting, and Pagination

- [ ] The gallery page reads `filters.availableThemes` and `filters.availableTags` from the `/api/sets` response and uses them to populate theme/tag filter controls.
- [ ] The filter bar supports:
  - [ ] Search (existing behavior kept).
  - [ ] Theme filter.
  - [ ] Build status filter (e.g. Built / Not built).
  - [ ] Tags filter (multi-select).
- [ ] Changing filters or search updates the underlying `useGetSetsQuery` parameters (no separate in-memory "fake" filtering that conflicts with server results).
- [ ] A sort dropdown allows the user to sort by at least:
  - [ ] Title
  - [ ] Piece count
  - [ ] Purchase date
  - [ ] Purchase price
  - [ ] Created at
- [ ] Pagination controls allow moving between pages of results (next/previous or numbered pages) and are wired to `page`/`limit` in `useGetSetsQuery`.
- [ ] The gallery grid and table views both respect the active filters, sort, and pagination.

### Set Card / Gallery Card UX

- [ ] The sets gallery uses a single card component (`SetCard` or `SetGalleryCard`) that:
  - [ ] Wraps the shared `GalleryCard` component.
  - [ ] Displays image thumbnail (with sensible fallback).
  - [ ] Shows title and set number.
  - [ ] Shows piece count, theme, quantity, and build status.
- [ ] Build status is clearly indicated with both label and visual emphasis (variant and/or icon) for built vs not built.
- [ ] (Optional, if in scope) A contextual action menu on each card provides:
  - [ ] View details.
  - [ ] Edit.
  - [ ] Delete (triggering a confirmation flow or navigation to the appropriate page).
- [ ] Card naming and exports are consistent with the story and module (either `SetCard` or `SetGalleryCard`, but used consistently in code and docs).

### Router & Navigation Consistency

- [ ] The route configuration for `/sets` and `/sets/:id` is documented and consistent between:
  - [ ] The main application router (e.g. TanStack Router in `main-app`).
  - [ ] The app-sets-gallery module (which may internally use React Router).
- [ ] Navigation from the gallery to the detail page uses a single canonical route pattern (e.g. `/sets/:id`), and all "Back to collection" actions return to `/sets`.
- [ ] Any references in stories/PRD that mention router choice (TanStack vs React Router) are updated to accurately reflect the current implementation strategy.

### Testing & Mocking

- [ ] The Set Detail Page uses RTK Query hooks in tests, with MSW handlers mocking `/api/sets/:id` instead of importing `mock-sets-api` directly.
- [ ] The gallery page tests cover:
  - [ ] Theme filter behavior.
  - [ ] Build status filter behavior.
  - [ ] Tags filter behavior.
  - [ ] Sorting order changes when sort options are changed.
  - [ ] Pagination behavior (next/previous page).
- [ ] Any remaining usages of `mock-sets-api` are confined to:
  - [ ] Storybook / playground usage, or
  - [ ] Dedicated, clearly marked unit tests that do not contradict the "real API + MSW" behavior for integration/page tests.
- [ ] All existing gallery and detail page tests are updated as needed to pass with the new behavior.

## Tasks / Subtasks

### Task 1: Migrate Detail Page to Real API

- [ ] Replace `mockGetSetById` / `mockDeleteSet` usage with `useGetSetByIdQuery` and real delete endpoint (if available) or a temporary no-op.
- [ ] Map `Set` from `@repo/api-client` to the existing UI fields.
- [ ] Implement gallery grid + lightbox for `set.images`.
- [ ] Adjust back navigation to `/sets`.
- [ ] Update error/404 states based on API response codes.

### Task 2: Wire Gallery Filters, Sorting, and Pagination

- [ ] Extend the gallery filter bar to include theme, build status, and tags controls.
- [ ] Connect filter controls to `useGetSetsQuery` params (search, theme, isBuilt, tags, sortField, sortDirection, page, limit).
- [ ] Implement sort dropdown and pagination controls in the gallery.
- [ ] Ensure both grid and table views consume the same filtered/sorted/paginated data.

### Task 3: Finalize Set Card UX

- [ ] Align component name (`SetCard` vs `SetGalleryCard`) across code and docs.
- [ ] Confirm metadata content (pieces, theme, quantity, build status) matches the story/PRD.
- [ ] (If in scope) Add card-level action menu and wire "view" to `/sets/:id`, "edit" to `/sets/:id/edit`, and "delete" to the appropriate flow.

### Task 4: Clean Up Router and Navigation References

- [ ] Document the actual router stack (TanStack in shell + React Router internally, or otherwise).
- [ ] Update any story/PRD references that are out of date.
- [ ] Verify navigation flows:
  - [ ] `/sets` → click card → `/sets/:id`.
  - [ ] Detail back button → `/sets`.

### Task 5: Testing & Mocking Clean-up

- [ ] Add/extend MSW handlers for `/api/sets` and `/api/sets/:id`.
- [ ] Update page/component tests to rely on MSW + RTK hooks instead of `mock-sets-api`.
- [ ] Add tests for new filters, sorting, pagination, and detail page behaviors.
- [ ] Remove or quarantine any remaining test-only mock modules that conflict with this behavior.

## Definition of Done

- [ ] Detail page uses real RTK Query hooks and real endpoints; no runtime dependency on `mock-sets-api`.
- [ ] Gallery filters, sorting, and pagination are fully wired to backend capabilities.
- [ ] Set card UX is aligned with the story (metadata + build status + optional actions) and used consistently.
- [ ] Routes and navigation between `/sets` and `/sets/:id` are consistent and documented.
- [ ] Frontend tests rely on MSW handlers for `/api/sets` and `/api/sets/:id`.
- [ ] All updated and new tests pass.
- [ ] Code reviewed.
