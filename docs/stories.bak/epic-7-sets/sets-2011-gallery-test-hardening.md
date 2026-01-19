# Story sets-2011: Gallery Test Hardening

## Status

Proposed

## Summary

As a developer,
I want the shared `@repo/gallery` package to have a robust, reliable test suite,
So that changes to gallery components (including Sets, Wishlist, and Instructions UIs) are safe and regressions are caught early.

## Motivation

`@repo/gallery` underpins multiple feature epics (including Epic 7: Sets Gallery). Its current test suite has accumulated router / URL-state coupling and brittle DOM expectations that make it noisy and hard to trust. This story tracks the work to modernize and stabilize that suite.

## Scope

- **Package:** `packages/core/gallery`
- **Focus:** `GalleryDataTable` + related hooks (`useSortFromURL`, column helpers) and their tests.

## Acceptance Criteria

1. All `@repo/gallery` tests pass consistently in CI (no intermittent router- or URL-related failures).
2. Tests that depend on router/URL behavior use a **single, consistent router test harness** or **shared router mocks**.
3. `GalleryDataTable` tests are updated to:
   - Use the same router/context helper for all cases that depend on TanStack Router.
   - Avoid direct reliance on internal implementation details where possible (prefer role/text/ARIA-based expectations).
4. Tests for `useSortFromURL` verify:
   - Parsing of `?sort=` into TanStack `SortingState` (single and multi-column).
   - URL updates when sorting changes (including clearing sort state).
5. No tests rely on `MemoryRouter` from `react-router-dom` for gallery behavior (gallery should standardize on TanStack Router or mocks for URL state).
6. New or updated tests clearly document expected accessibility contracts (e.g., `aria-sort`, status announcements) so future changes don’t silently break a11y.

## Tasks / Subtasks

1. **Router Test Harness / Mocks**
   - [ ] Introduce a shared router test helper for `@repo/gallery` tests (e.g., `renderWithRouter`) that wires:
     - `createMemoryHistory`
     - `createRootRoute` / `createRoute`
     - `createRouter` + `RouterProvider`
   - [ ] Alternatively / additionally, define scoped mocks for `@tanstack/react-router` in `src/__tests__/setup.ts` for tests that do not care about real URL state.

2. **GalleryDataTable Test Cleanup**
   - [ ] Update `GalleryDataTable.test.tsx` to render the table through the shared router helper (or appropriate mocks) wherever `useSortFromURL` or router state is involved.
   - [ ] Update `GalleryDataTable.sorting.test.tsx` to:
     - Use the shared router helper consistently for URL-persisted sorting.
     - Avoid mixing `MemoryRouter` from other router libraries.
   - [ ] Update `GalleryDataTable.multiSort.test.tsx` to rely on the same harness, ensuring multi-sort + URL behavior is covered without brittle DOM assumptions.
   - [ ] Update `GalleryDataTable.composable.test.tsx` to:
     - Use the shared router helper for TanStack `ColumnDef` flows.
     - Focus expectations on headers, cells, and `aria-sort` rather than internal layout details.
   - [ ] Ensure `GalleryDataTable.animations.test.tsx` and column-reordering tests still pass under the new harness, adjusting expectations as needed.

3. **`useSortFromURL` Tests**
   - [ ] Add or refine unit/integration tests for `useSortFromURL` to cover:
     - Single-column sort strings (e.g., `?sort=title:asc`).
     - Multi-column sort strings (e.g., `?sort=price:asc,title:desc`).
     - Invalid sort inputs (ignored safely).
     - Clearing sort when the sorting state becomes empty.

4. **Brittle Expectation & A11y Pass**
   - [ ] Replace overly brittle `getByText` / DOM-structure assumptions with role- and ARIA-based queries where practical.
   - [ ] Ensure tests explicitly assert on `aria-sort`, `aria-label`, and status announcements used by screen readers for sort state changes.

## Risks / Notes

- This is a **broader quality project for the shared library**, not limited to Epic 7. Changes must be coordinated with
  Instructions / Wishlist stories that also depend on `@repo/gallery`.
- Some existing failing expectations may reflect **intentional behavior changes**; as part of this story we may need to
  adjust tests to match the current UX rather than forcing legacy behavior.

## Definition of Done

- [ ] All `@repo/gallery` test files (especially `GalleryDataTable*.test.tsx`) pass locally and in CI.
- [ ] Router- and URL-dependent tests share a single, well-documented harness or mock strategy.
- [ ] No tests emit router-context errors (e.g., "useRouter must be used inside a <RouterProvider>").
- [ ] No tests depend on `MemoryRouter` from other routing libraries for gallery behavior.
- [ ] Documentation/comments in the new story and/or test helpers explain how future tests should integrate with router and URL state.
