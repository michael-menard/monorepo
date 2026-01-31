# Elaboration Analysis - WISH-2017

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Architecture terminology mismatch | High | Story uses hexagonal architecture terms (`application/`, `adapters/`, `ports/`) instead of prescribed `services/` pattern from api-layer.md. Must clarify: Is lego-api exempt from api-layer.md pattern? If not, update story to use `apps/api/services/wishlist/` instead of `apps/api/lego-api/domains/wishlist/application/`. |
| 2 | Story too large (20 ACs) | Medium | Split into WISH-2017-A (Backend: Combined filter + sort queries) and WISH-2017-B (Frontend: Filter panel UI). Each split should have <10 ACs and be independently testable. |
| 3 | Missing service layer in Scope | High | Story specifies `application/wishlist-service.ts` (hexagonal) but api-layer.md requires `services/wishlist/index.ts`. Scope section must be updated to match authoritative architecture document. |
| 4 | Filter parameter schema format unclear | Medium | Story shows both array notation (`store?: string[]`) and comma-separated query params (`?store=LEGO,BrickLink`). Clarify HTTP query param encoding: `store[]=LEGO&store[]=BrickLink` vs `store=LEGO,BrickLink` vs base64 JSON. AC1 should specify encoding format. |

## Split Recommendation

### Rationale

Story exhibits 4 sizing indicators:
- 20 Acceptance Criteria (exceeds 8 threshold by 150%)
- Significant frontend (FilterPanel, 3 filter controls, URL state) AND backend (repository queries, schema extension) work
- 5-8 day effort estimate
- Touches 3 packages across frontend/backend boundary

Split enables:
- Parallel development (backend and frontend teams work simultaneously)
- Independent testability (backend .http tests vs frontend E2E tests)
- Reduced cognitive load per story
- Clearer QA verification boundaries

### Proposed Splits

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| WISH-2017-A | Backend: Combined Filter + Sort Queries | AC1-AC6, AC15, AC16, AC18 (9 ACs) | Depends on WISH-2014 |
| WISH-2017-B | Frontend: Filter Panel UI | AC7-AC14, AC17, AC19-AC20 (14 ACs) | Depends on WISH-2017-A |

### WISH-2017-A: Backend Combined Filter + Sort Queries

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

**Definition of Done:**
- 45 unit tests pass
- 18 integration tests (.http) pass
- Query performance < 2s for 1000+ items
- Schema alignment test passes
- All null value edge cases handled

### WISH-2017-B: Frontend Filter Panel UI

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

**Note:** AC13 and AC14 belong to both splits (frontend tests + error handling UX). Allocated to WISH-2017-B for UI polish.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Conditions:**
1. **Architecture Clarification Required**: Resolve terminology mismatch between story's hexagonal architecture (`application/`, `adapters/`) and api-layer.md prescribed pattern (`services/`). Either:
   - Update story to use `apps/api/services/wishlist/` pattern, OR
   - Document that `lego-api` domain is exempt from api-layer.md pattern
2. **Story Split Recommended**: Split into WISH-2017-A (Backend) and WISH-2017-B (Frontend) to reduce complexity and enable parallel development
3. **Filter Encoding Clarification**: Specify HTTP query param encoding format for array parameters in AC1

**Proceed If:**
- PM confirms architecture pattern (hexagonal vs services/)
- PM approves story split (or provides rationale for keeping unified)
- Filter param encoding format clarified (array vs comma-separated vs JSON)

**Block If:**
- Architecture pattern cannot be resolved
- Story split is rejected AND complexity remains unaddressed

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Architecture pattern ambiguity | Core API implementation | Clarify whether `lego-api` uses hexagonal (`domains/*/application/`) or prescribed (`services/`) pattern. Update Scope section to match authoritative pattern. |
| 2 | Filter param encoding undefined | API contract | Define HTTP query param encoding for `store` array: `?store[]=A&store[]=B` vs `?store=A,B`. Update AC1 and HTTP Contract Plan section with explicit format. |

**Impact on Core Journey:**
- **Gap 1**: Blocks backend implementation - developers don't know which directory structure to use
- **Gap 2**: Blocks frontend/backend integration - unclear how to serialize/deserialize array query params

**Recommendation:**
- Gap 1: Review `apps/api/lego-api/` directory structure. If it uses hexagonal architecture (domains/*/application/), document this as exception to api-layer.md. If story is wrong, update to services/ pattern.
- Gap 2: Standard practice is `?store=LEGO&store=BrickLink` (repeated param) or `?store=LEGO,BrickLink` (comma-separated). Recommend comma-separated for simplicity. Update AC1 to specify: "Query params use comma-separated format: `?store=LEGO,BrickLink`"

---

## Worker Token Summary

- Input: ~15k tokens (WISH-2017.md, stories.index.md, api-layer.md, elab-analyst.agent.md, WISH-2014.md context)
- Output: ~2.5k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
