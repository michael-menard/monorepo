# Story wish-2007: Wishlist End-to-End Test Suite (Real Environment)

## Status

Draft

## Story

**As a** product team,
**I want** a comprehensive, realistic end-to-end test suite for Wishlist,
**so that** we can confidently ship wishlist features knowing they work against real services and data flows.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- Quality & Testing > End-to-End Coverage
- Non-Functional Requirements > Reliability & Regression Safety

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP
- **wish-2002**: Add Item Flow
- **wish-2003**: Detail & Edit Pages
- **wish-2004**: Modals & Transitions
- **wish-2005**: UX Polish
- **wish-2006**: Accessibility Complete

## Testing Principles (Required)

1. **No mocks for system-under-test resources**
   - All wishlist E2E tests must run against **real, fully integrated components and services**.
   - Playwright tests must **not use `page.route` / network interception** to stub wishlist APIs.
   - `apps/web/playwright/utils/wishlist-mocks.ts` and related mocks remain allowed only for legacy or non-wishlist features, not for this story.

2. **Realistic test data**
   - Tests must create and clean up their **own data** via public surfaces (UI + API), or via dedicated test helpers that use the same database/schema as production.
   - Shared seed data for predictable scenarios is allowed, but must be created through real pipelines (e.g., migrations + seed scripts, not in-browser mocks).

3. **Selector strategy**
   - Prefer **semantic selectors**:
     - `getByRole`, `getByLabelText`, `getByPlaceholder`, `getByText` with stable copy
     - CSS structures that reflect UX intent (e.g. `nav`, `main`, `header`, `footer`)
   - `data-testid` **may be used only when absolutely necessary**, e.g.:
     - No accessible role/label exists and cannot be added without harming UX
     - Element is purely presentational but still requires targeting
   - When a `data-testid` is introduced for E2E, it must:
     - Follow a consistent naming convention: `e2e-<domain>-<purpose>` (e.g., `e2e-wishlist-card`, `e2e-wishlist-add-button`).
     - Be documented in this story under **Selector Contracts**.

4. **Isolation & repeatability**
   - Tests must be **idempotent** and safe to run in parallel.
   - Each scenario must clearly define how it:
     - Sets up required state (create user, sign in, create wishlist items, etc.).
     - Cleans up state on success and failure.

5. **Environment assumptions**
   - Story assumes a test environment with:
     - Running API (`apps/api`) with access to test database.
     - Running web app (`apps/web/main-app`) wired to the test API.
     - Authentication flow suitable for automated login (dedicated test user or bypass route).

## Acceptance Criteria

### A. Migration from Mocked to Real E2E

1. Wishlist gallery E2E coverage is provided by a new **Playwright spec suite** in `apps/web/playwright` that **does not mock** wishlist APIs.
2. Existing wishlist BDD feature `features/wishlist/wishlist-gallery.feature` and step definitions in `steps/wishlist.steps.ts` are:
   - Either updated to remove wishlist-specific mocking (`setupWishlistMocks`, `wishlist-mocks.ts`), or
   - Clearly marked as **legacy / exploratory** and excluded from the main CI gate for wishlist regression (while the new real E2E suite becomes the gate).
3. All wishlist-related tests that previously depended on `wishlist-mocks.ts` either:
   - Use real API & database state, or
   - Are re-scoped to unit/integration level and removed from the E2E suite.

### B. Core Wishlist Flows (End-to-End)

4. **Gallery view** (read path):
   - Given an authenticated test user with existing wishlist items,
   - When they navigate to `/wishlist`,
   - Then they see wishlist cards, per-store filters, search and sort working against real data.

5. **Add item** (create path):
   - Scenario: User adds a new wishlist item via `/wishlist/add`.
   - On success, item appears in the gallery and detail page reflects the created data.

6. **Detail view** (read path):
   - Scenario: User opens `/wishlist/:id` for an item they created.
   - Page displays full metadata (title, store, price, piece count, etc.) from real backend data.

7. **Edit item** (update path):
   - Scenario: User edits an existing wishlist item’s title, priority, and tags.
   - Changes persist and are visible on gallery and detail page.

8. **Delete / Got It** (delete / purchased path):
   - Scenario: User marks an item as purchased or deletes it via the real API.
   - Gallery and counts update accordingly on the next load, with no stale UI.

9. **Reorder (if implemented)**:
   - Scenario: User reorders wishlist items via drag-and-drop or reorder API.
   - Order persists across reload and matches the backend `sortOrder`.

### C. Non-Functional E2E Validation

10. **Authentication**:
    - E2E tests log in through the real auth flow (or a dedicated, minimal test-only entry point) instead of mocking auth in the browser.
    - Login helper functions live in `apps/web/playwright/utils` and are re-usable across specs.

11. **Accessibility smoke checks**:
    - Core flows (gallery, add, detail, edit) include at least one assertion using semantic roles/labels per page.

12. **Performance sanity**:
    - Wishlist gallery E2E tests assert that initial load for the test dataset completes within a reasonable bound (e.g., < 5 seconds in CI), using Playwright’s timing APIs.

### D. Selector Contracts

13. A dedicated **Selector Contracts** section in this document lists any `data-testid` attributes used by E2E tests, along with:
    - File path
    - Attribute name (e.g., `data-testid="e2e-wishlist-add-button"`)
    - Purpose and reason why a semantic selector was insufficient.

14. For all other assertions, tests use semantic selectors (`getByRole`, `getByLabelText`, etc.) and human-visible copy that is stable and PRD-aligned.

### E. CI Integration & Documentation

15. New wishlist E2E test suite is wired into the existing Playwright command (e.g., `pnpm test:e2e` or equivalent) and runs as part of the main CI pipeline.
16. `docs/qa/gates/wish-2001-wishlist-gallery-mvp.yml` (or a new QA gate file for wish-2007) is updated to:
    - Reference the new real E2E suite.
    - Note that wishlist E2E coverage no longer relies on mocked APIs.
17. This story document is updated with:
    - Links to the final spec files.
    - Summary of covered flows.

## Tasks / Subtasks

### Task 1: Define E2E Environment & Auth Strategy

- [ ] Document how Playwright connects to the running web and API services.
- [ ] Implement a reusable "login as test user" helper in `apps/web/playwright/utils` that uses the real auth flow.
- [ ] Ensure test user exists (seed script or sign-up path) and is isolated from production users.

### Task 2: Introduce Real Wishlist E2E Specs

- [ ] Create wishlist-focused Playwright specs under `apps/web/playwright` (exact structure to be finalized):
  - [ ] `e2e/wishlist/gallery.real.spec.ts`
  - [ ] `e2e/wishlist/add-item.real.spec.ts`
  - [ ] `e2e/wishlist/detail-edit.real.spec.ts`
  - [ ] `e2e/wishlist/delete-got-it.real.spec.ts`
  - [ ] `e2e/wishlist/reorder.real.spec.ts` (if reorder is implemented).
- [ ] Each spec uses only real network requests (no `page.route` for wishlist APIs).
- [ ] Each spec creates any required data via UI/API and cleans it up at the end.

### Task 3: Update or De-Scope Mock-Based Wishlist Tests

- [ ] Update `features/wishlist/wishlist-gallery.feature` and `steps/wishlist.steps.ts` to:
  - [ ] Remove wishlist-specific mocking (`setupWishlistMocks`, `wishlist-mocks.ts`), **or**
  - [ ] Move them into a `legacy/` or `mocked-experiments/` folder and exclude from CI regression gates.
- [ ] Add comments to `wishlist-mocks.ts` clarifying it is not to be used by real E2E suites for wishlist.

### Task 4: Selector Audit & Contracts

- [ ] Audit current wishlist UI components (`WishlistCard`, gallery page, add/detail/edit pages) for accessible roles and labels.
- [ ] Add ARIA labels or role attributes where necessary to enable semantic selection.
- [ ] Introduce `data-testid` attributes **only** where semantic selectors remain impractical.
- [ ] Document these in **Selector Contracts** section of this story.

### Task 5: CI Wiring & QA Gate

- [ ] Ensure wishlist E2E specs run as part of the standard Playwright pipeline.
- [ ] Update QA gate YAML (new `docs/qa/gates/wish-2007-wishlist-e2e.yml` or existing gate) with:
  - [ ] Test counts and pass status.
  - [ ] Explicit note that all wishlist E2E tests run against real services.
  - [ ] Any known limitations or environment assumptions.

## Selector Contracts (Initial)

> NOTE: This section starts empty and must be updated as part of implementation when/if `data-testid` attributes are added for wishlist E2E.

- _(To be filled in by implementation PRs)_

## Definition of Done

- [ ] All wishlist-critical flows (gallery, add, detail, edit, delete/got-it, reorder if available) are covered by **non-mocked**, real-environment Playwright E2E tests.
- [ ] No wishlist E2E spec uses `page.route` or `wishlist-mocks.ts` for API mocking.
- [ ] Semantic selectors are used by default; any `data-testid` usage is documented under **Selector Contracts**.
- [ ] New E2E specs are stable (no flaky behavior in CI over multiple runs).
- [ ] QA gate is updated to reflect the new source of truth for wishlist E2E coverage.
- [ ] Story status updated from Draft to Approved/Done after review.

## Change Log

| Date       | Version | Description                                      | Author |
| ---------- | ------- | ------------------------------------------------ | ------ |
| 2026-01-10 | 0.1     | Initial draft for real wishlist E2E test suite  | Agent  |
