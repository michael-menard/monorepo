# Elaboration Report - WISH-20171

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

Backend Combined Filter + Sort Queries story passes elaboration with 2 issues requiring resolution before implementation: (1) Architecture pattern documentation mismatch must be resolved via AC0, and (2) Query parameter format specification needs clarification in AC1. Core user journey is complete with comprehensive 45 unit tests and 18 integration tests.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md: backend filter + sort queries only |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and Test Plan are consistent |
| 3 | Reuse-First | PASS | — | Reuses existing Drizzle, Zod, smart sort algorithms from WISH-2014 |
| 4 | Ports & Adapters | **CONDITIONAL** | **Medium** | **Architecture Pattern Mismatch**: Story correctly uses `lego-api/domains/wishlist/` with hexagonal architecture (application/, adapters/, types.ts), but this conflicts with `docs/architecture/api-layer.md` which requires `apps/api/services/` pattern. AC0 addresses this but needs clarification before implementation. |
| 5 | Local Testability | PASS | — | 45 unit tests + 18 .http integration tests specified |
| 6 | Decision Completeness | PASS | — | No blocking TBDs or unresolved design decisions |
| 7 | Risk Disclosure | PASS | — | Query performance, schema sync, null handling risks disclosed with mitigations |
| 8 | Story Sizing | PASS | — | 9 ACs, backend-only scope, 3-day estimate, already split from parent (1 of 2) |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | **Architecture Pattern Mismatch**: Story plans `lego-api/domains/wishlist/application/` but `docs/architecture/api-layer.md` requires `apps/api/services/wishlist/`. AC0 exists to clarify this, but story should either: (1) Update docs to document lego-api hexagonal pattern as canonical, OR (2) Migrate to services/ pattern | Medium | AC0 must resolve before implementation. Recommend: Update docs (Option 1) since all 6 existing domains (gallery, wishlist, health, instructions, sets, parts-lists) already use domains/ pattern | **MUST FIX** |
| 2 | **Query Parameter Format Ambiguity**: AC1 amendment specifies comma-separated format (`?store=LEGO,BrickLink`) but doesn't specify priority/priceRange format. Example shows `?priority=3,5` (comma-separated min,max) vs schema shows `{ min: number, max: number }` (object). Clarify: Are priority/priceRange passed as comma-separated strings and parsed to objects, or as nested query params? | Low | Add to AC1: Specify exact query string format for range parameters. Recommend: `?priority=3,5&priceRange=50,200` parsed to `{min: 3, max: 5}` objects | **MUST FIX** |

## Split Recommendation

**Not Applicable** - Story is already split (1 of 2) from WISH-2017 with 9 ACs, backend-only scope.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | **Cursor-based pagination for large datasets** | Not Reviewed | Defer to Phase 7 (Performance Optimization). MVP offset pagination is sufficient for < 1,000 items |
| 2 | **Filter combination validation** (min <= max) | Not Reviewed | Add to future story: Enhanced validation rules for filter parameters |
| 3 | **Partial filter matches** (LIKE queries) | Not Reviewed | Defer to Phase 7 (Advanced Search) |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | **Filter preset persistence** | Not Reviewed | Defer to Phase 5 (UX Polish) as noted in Non-goals |
| 2 | **Query result caching** (Redis) | Not Reviewed | Defer to Phase 7 (Performance Optimization) after user behavior analysis |
| 3 | **GraphQL-style field selection** | Not Reviewed | Defer to Phase 8 (API Evolution) if mobile app adoption requires it |
| 4 | **Faceted search counts** | Not Reviewed | Defer to Phase 6 or 7 (UX enhancement) - valuable for filter discoverability |
| 5 | **Smart sort algorithm explanations** | Not Reviewed | Defer to Phase 5 (UX Polish) as delighter feature |
| 6 | **Filter analytics/telemetry** | Not Reviewed | Defer to Phase 6+ (Observability) after MVP launch |
| 7 | **Database index optimization** | Not Reviewed | COVERED by AC18 - query plans will reveal index optimization opportunities |

### Follow-up Stories Suggested

_None - All findings marked as "Not Reviewed" for parallel execution. Future enhancements tracked in FUTURE-OPPORTUNITIES.md._

### Items Marked Out-of-Scope

_None - All findings marked as "Not Reviewed" for parallel execution._

## Proceed to Implementation?

**YES - story may proceed after fixing 2 issues:**
1. Resolve architecture pattern mismatch via AC0 (Update docs/architecture/api-layer.md)
2. Add query parameter format specification to AC1

Once fixes are applied, story is ready for /dev-implement-story.
