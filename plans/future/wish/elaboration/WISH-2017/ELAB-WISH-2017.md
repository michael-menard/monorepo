# Elaboration Report - WISH-2017

**Date**: 2026-01-28
**Verdict**: SPLIT REQUIRED

## Summary

WISH-2017 (Advanced Multi-Sort Filtering) is a well-documented story that combines backend filtering logic with frontend UI implementation. Analysis identified the story is oversized (20 ACs) and exhibits 4 sizing indicators recommending split. Architecture terminology requires clarification (hexagonal vs services pattern), and filter parameter encoding must be specified. User decisions approve the split into WISH-2017-A (Backend) and WISH-2017-B (Frontend).

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: extends GET /api/wishlist with combined filters + sort. No extra endpoints introduced. |
| 2 | Internal Consistency | PASS | — | Goals align with scope (combined filtering + sorting). Non-goals properly exclude Phase 5/7 features. ACs match scope. Test plan matches ACs. |
| 3 | Reuse-First | PASS | — | Reuses existing GET /api/wishlist endpoint, RTK Query hooks, smart sort algorithms from WISH-2014, Drizzle query builder, URL state management patterns. New FilterPanel component justified as domain-specific UI. |
| 4 | Ports & Adapters | FAIL | High | **DEFECT**: Story specifies `apps/api/lego-api/domains/wishlist/` structure (hexagonal architecture), which contradicts `docs/architecture/api-layer.md` required pattern. Api-layer.md requires: (1) Service layer at `apps/api/services/wishlist/`, (2) Routes at `apps/api/routes/wishlist.ts`, (3) Infrastructure at `apps/api/core/`. Story incorrectly uses `application/`, `adapters/`, and `ports/` naming from hexagonal architecture instead of prescribed `services/` naming. However, story correctly separates concerns: business logic in service layer, database queries in repository, HTTP handling in routes. |
| 5 | Local Testability | PASS | — | Backend: `.http` file with 18 test scenarios. Frontend: 4 Playwright E2E tests with evidence (screenshots, HAR). Tests are concrete and executable. |
| 6 | Decision Completeness | PASS | — | Open Questions section states "None - Story is implementation-ready." No blocking TBDs. All design decisions made (filter UI, query structure, error handling). |
| 7 | Risk Disclosure | PASS | — | 5 MVP-critical risks disclosed: query performance, URL length limits, filter state sync, schema synchronization, empty result UX. All have mitigations tied to ACs. Non-MVP risks documented separately. |
| 8 | Story Sizing | FAIL | Medium | **SPLIT RECOMMENDED**: Story exhibits 4 of 6 sizing indicators: (1) 20 ACs (exceeds 8 limit), (2) Significant frontend AND backend work (filter panel + repository queries + RTK integration), (3) 5-8 day estimate suggests complexity, (4) Touches 3 packages (api, api-client, app-wishlist-gallery). Recommend split into Backend (filtering logic) and Frontend (filter UI) stories. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Architecture terminology mismatch | High | Story uses hexagonal architecture terms (`application/`, `adapters/`, `ports/`) instead of prescribed `services/` pattern from api-layer.md. Must clarify: Is lego-api exempt from api-layer.md pattern? | ACCEPTED AS AC |
| 2 | Story too large (20 ACs) | Medium | Split into WISH-2017-A (Backend: Combined filter + sort queries) and WISH-2017-B (Frontend: Filter panel UI). Each split should have <10 ACs and be independently testable. | SPLIT APPROVED |
| 3 | Missing service layer in Scope | High | Story specifies `application/wishlist-service.ts` (hexagonal) but api-layer.md requires `services/wishlist/index.ts`. Scope section must be updated to match authoritative architecture document. | ADDRESSED BY ISSUE #1 |
| 4 | Filter parameter schema format unclear | Medium | Story shows both array notation (`store?: string[]`) and comma-separated query params (`?store=LEGO,BrickLink`). Clarify HTTP query param encoding. | ACCEPTED AS AC |

## Split Recommendation

### Approved Splits

User decision: "Split story into WISH-2017-A (Backend) and WISH-2017-B (Frontend)"

#### WISH-2017-A: Backend Combined Filter + Sort Queries

**Scope:**
- Extend `ListWishlistQuerySchema` with filter parameters (store, priority, priceRange)
- Implement repository layer combined WHERE + ORDER BY queries
- Handle null values, pagination, error validation
- 45 unit tests + 18 integration tests (.http file)
- Schema alignment test with frontend

**Endpoints:**
- Extended: `GET /api/wishlist` with filter query params

**Packages:**
- `apps/api/lego-api/domains/wishlist/` (or `apps/api/services/wishlist/` per api-layer.md)
- `packages/core/api-client/src/schemas/wishlist.ts`

**Effort:** 3 days (backend-focused)

**ACs:** AC1, AC2, AC3, AC4, AC5, AC6, AC15, AC16, AC18 (9 ACs)

**AC Additions:**
- AC1 Amendment: Specify comma-separated format for array parameters: `?store=LEGO,BrickLink`
- AC0 (New): Architecture Pattern Clarification - Clarify whether lego-api uses hexagonal architecture (`domains/*/application/`) and is exempt from api-layer.md pattern, or should follow `apps/api/services/wishlist/` structure.

#### WISH-2017-B: Frontend Filter Panel UI

**Scope:**
- Create FilterPanel component with store, priority, price range controls
- URL query parameter state management
- RTK Query integration with filter params
- Active filter badge, Clear All button
- 20 component tests + 4 Playwright E2E tests

**Packages:**
- `apps/web/app-wishlist-gallery/`
- `packages/core/api-client/` (RTK Query hooks)

**Effort:** 4 days (frontend-focused)

**ACs:** AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC17, AC19, AC20 (11 ACs)

**Definition of Done:**
- FilterPanel component renders all controls
- URL sync works (filter state ↔ URL query params)
- RTK Query calls API with correct params
- 20 component tests pass
- 4 Playwright E2E tests pass with evidence
- Axe-core accessibility audit passes

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Architecture ambiguity | **Add as AC - Clarify lego-api uses hexagonal architecture and is exempt from api-layer.md pattern** | Critical for backend implementation. Determines directory structure and package organization. |
| 2 | Filter encoding undefined | **Add as AC - Specify comma-separated format: ?store=LEGO,BrickLink** | Blocks frontend/backend integration. Must clarify HTTP query param encoding for array parameters. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1-15 | Non-Blocking Enhancements | **Skipped** | Detailed in FUTURE-OPPORTUNITIES.md. Not reviewed in interactive phase per user decision. |

### Follow-up Stories Suggested

- [x] **WISH-2018: Filter State Persistence** (NEW - Phase 5 UX Polish)
  - Store active filters in localStorage. On page load, restore last-used filters.
  - Depends on WISH-2017-B (Frontend Filter Panel UI)
  - Effort: 2 days
  - Phase: 5 (UX Polish)

### Items Marked Out-of-Scope

- Real-time collaborative filtering (deferred to Phase 7)
- Machine learning-based recommendations (deferred to future epic)
- Saved filter presets (deferred to Phase 5 UX Polish)
- Filter history/undo (deferred to Phase 5)
- Custom user-defined filter logic (deferred to Phase 7)
- Cross-user filter sharing (deferred to Phase 7)

## Proceed to Implementation?

**NO - requires split**

Story has been split into two implementation-ready stories:
- **WISH-2017-A**: Backend Combined Filter + Sort Queries (ready-to-work)
- **WISH-2017-B**: Frontend Filter Panel UI (depends on WISH-2017-A)

Parent story (WISH-2017) moves to needs-split status pending PM creation of split stories in repository.
