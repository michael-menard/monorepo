# Elaboration Analysis - WINT-1011

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | stories.index.md and WINT-1011.md are identical in scope: 8 ACs, 1 package (`mcp-tools`), backend-only module |
| 2 | Internal Consistency | PASS | — | Goals, Non-Goals, ACs, Architecture Notes, and Test Plan are mutually consistent. AC numbering gaps (AC-6, AC-9, AC-11 excluded) are explained in Split Context and Non-Goals |
| 3 | Reuse-First | PASS | — | All 4 WINT-0090 source files verified present. `@repo/db`, `@repo/logger`, `@repo/database-schema`, `zod` all established packages. Seed parsers evaluated and available for optional reuse |
| 4 | Ports & Adapters | PASS | — | No HTTP surface. Backend TypeScript module. No transport coupling. Shim wraps DB-layer tools without exposing transport primitives |
| 5 | Local Testability | PASS | — | Unit test files named per function. Integration test path specified. Test commands for both unit and integration provided. ADR-005 (real PostgreSQL) explicitly cited |
| 6 | Decision Completeness | PASS | — | STORIES_ROOT resolution strategy documented. Swim-lane mapping table specified (6 of 8 states; blocked/cancelled gap acknowledged and justified). Directory scan strategy (parent-dir-name approach) chosen with rationale. No blocking TBDs |
| 7 | Risk Disclosure | PASS | — | 4 risks explicitly documented: WINT-0090 not formally closed, blocked/cancelled state gap, no retry logic on transient DB failures, directory depth assumption. All have mitigations or deferral decisions |
| 8 | Story Sizing | PASS | — | 8 ACs (at limit), 1 package touched, backend-only, no frontend. Test path count (5) exceeds 3-scenario guideline but this is a pre-split story and all 5 paths correspond to distinct ACs. No indicators of bundled independent features |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | `ShimOptions` parameter not surfaced in AC signatures | Medium | ACs define functions as `shimGetStoryStatus(storyId)` with no mention of an options parameter. Architecture Notes specify `ShimOptionsSchema` with injectable `storiesRoot`, but no AC validates this. Implementer may omit the `options` parameter or add it inconsistently across the four functions. Add a note to ACs clarifying the function signature includes an optional `options?: ShimOptions` second parameter. |
| 2 | `storyGetByStatus` returns `[]` on error, not `null` — empty-result fallback trigger is ambiguous | Low | The underlying `storyGetByStatus` and `storyGetByFeature` functions return `[]` on both DB error AND genuine empty result. AC-3/AC-4 say "on empty result, fall back to directory scan." The shim cannot distinguish "DB returned 0 rows" from "DB threw error and returned []". This means DB errors on list queries will silently trigger directory fallback rather than logging a warning. This is acceptable behavior for Phase 1 but should be documented in `__types__/index.ts` as a known behavioral nuance. No AC change required; document in code. |
| 3 | Integration test path uses `--testPathPattern` flag syntax inconsistent with Vitest | Low | Story specifies `pnpm --filter @repo/mcp-tools test:integration -- --testPathPattern shim.integration`. Vitest uses `--reporter` and `--run`; pattern filtering uses `pnpm vitest run path/to/test`. Verify the test command against the actual Vitest config in `mcp-tools` before implementation. |

## Split Recommendation

Not applicable. Story is within sizing limits and is already a split result.

## Preliminary Verdict

**Verdict: CONDITIONAL PASS**

All 8 audit checks pass. Two low-severity implementation risks and one medium-severity AC ambiguity identified. The medium issue (ShimOptions signature not in ACs) should be resolved before implementation to avoid inconsistency across the four shim functions.

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | `ShimOptions` injectable `storiesRoot` not specified in AC function signatures | AC-1, AC-3, AC-4 (directory fallback testability) | AC-1, AC-3, AC-4 should note that each shim function accepts `options?: { storiesRoot?: string }` as an optional second parameter. Without this, unit tests cannot inject a test directory root and integration tests cannot point to the real stories path without relying on environment variables alone. This is AC-5-adjacent: if the function signature is inconsistent across the four shims, callers (WINT-1040/1050/1060) may receive type errors. |

---

## Worker Token Summary

- Input: ~8,500 tokens (story file, stories.index.md, PLAN.exec.md, PLAN.meta.md, story-management source files x6, wint.ts schema, mcp-tools index.ts)
- Output: ~800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
