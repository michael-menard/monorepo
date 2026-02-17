# Elaboration Analysis - WINT-0131

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry exactly. Two packages (database-schema + mcp-tools) identified, both correct. |
| 2 | Internal Consistency | CONDITIONAL PASS | Medium | Architecture Notes document that `graph_get_franken_features` will return ALL features as Franken-features until WINT-4040 populates featureId linkage. This expected-but-surprising behavior is not reflected in AC-5, creating a risk of AC-5 being interpreted as "implementation incorrect" at QA. Non-blocking but needs a note in AC-5. |
| 3 | Reuse-First | PASS | — | `graph-check-cohesion.ts` explicitly named as canonical reference. `@repo/db`, `@repo/database-schema`, `@repo/logger`, `drizzle-orm` all reused. No new packages required. |
| 4 | Ports & Adapters | PASS | — | MCP tools only — no HTTP endpoints, no API layer concerns. Core logic is transport-agnostic. |
| 5 | Local Testability | CONDITIONAL PASS | Medium | Test files are specified and patterns are cited (session-management tests). However, the STORY-SEED.md explicitly states that tests were deferred for ALL 4 graph query tools in WINT-0130, and must be delivered in WINT-0131. The story as written only includes tests for 2 of 4 tools (graph_get_franken_features and graph_get_capability_coverage). Tests for `graph_check_cohesion` and `graph_apply_rules` are missing from the ACs. This is a scope gap relative to the seed intent. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. `unified-wint.ts` drift is an accepted known conflict (documented in Conflict Log). Migration number confirmed as 0027. Schema source of truth confirmed as `wint.ts`. |
| 7 | Risk Disclosure | PASS | — | "All features become Franken-features" behavior is documented in Architecture Notes. Migration risk is low (nullable column, no existing data affected). `ON DELETE SET NULL` prevents cascade issues. |
| 8 | Story Sizing | CONDITIONAL PASS | Low | 13 ACs exceeds the 8-AC indicator. However, the work is a focused, sequential schema fix + 2 tool rewrites + 2 test files. No frontend work. Only 2 packages. Not independently splittable without losing coherence. Story points (3) are appropriate. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC-10 test scope omits `graph_check_cohesion` and `graph_apply_rules` | Medium | STORY-SEED.md (lines 95-96) explicitly documents that 0% test coverage exists for ALL 4 graph query tools and that the test suite must cover all 4 in WINT-0131. The story as written only adds tests for the 2 stub tools. AC-10 should be expanded, or ACs-10 and 11 added for `graph_check_cohesion` and `graph_apply_rules` respectively. If not addressed, the 80%+ coverage target (AC-12 in the story) will still fail because the 2 fully functional tools are untested. |
| 2 | AC-5 Franken-feature behavior ambiguity | Low | AC-5 does not mention that all features with no linked capabilities will also appear in the Franken-feature list until WINT-4040. This is documented in Architecture Notes but not in the AC. A QA agent reading only AC-5 may flag the "all features returned" result as a defect. Add a parenthetical clarification to AC-5: "Features with no linked capabilities (featureId NULL) are also returned as Franken-features — this is expected until WINT-4040 populates featureId linkage." |

---

## Split Recommendation

Not recommended. The story is coherent and sequential: migration 0027 is the prerequisite for both tool rewrites, and the tool rewrites are the prerequisite for the tests. Splitting would create artificial blocking dependencies with no parallel work benefit.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-structured and implementation-ready with two minor issues:
1. Missing test ACs for `graph_check_cohesion` and `graph_apply_rules` (which STORY-SEED.md mandates)
2. AC-5 Franken-feature behavior needs a clarifying note about null-featureId behavior

Both issues are resolvable with minor AC amendments before implementation begins.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Test coverage gap for `graph_check_cohesion` and `graph_apply_rules` | AC-12 (80% coverage target) cannot be met with only 2 of 4 tools tested. The 2 fully functional tools have real logic paths (DB query, JSONB evaluation, rule application) that require test coverage to hit 80%. | Add test ACs for `graph_check_cohesion.test.ts` (happy path, feature not found, no active rules, DB error, invalid input, malformed JSONB) and `graph_apply_rules.test.ts` (happy path, no active rules, ruleType filter, DB error, invalid ruleType, malformed JSONB conditions). |

---

## Worker Token Summary

- Input: ~9,200 tokens (files read: WINT-0131.md, STORY-SEED.md, stories.index.md, wint.ts sections, graph-get-franken-features.ts, graph-get-capability-coverage.ts, __types__/index.ts, graph-check-cohesion.ts, _journal.json, 0026 migration)
- Output: ~600 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
