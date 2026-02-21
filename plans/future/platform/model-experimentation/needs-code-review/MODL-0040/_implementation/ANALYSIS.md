# Elaboration Analysis - MODL-0040

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Deliverables in story match `stories.index.md` MODL-0040 entry exactly: `__types__/index.ts`, `leaderboard.ts`, `reports.ts`, `model-leaderboard.md` command, unit + integration tests |
| 2 | Internal Consistency | PASS | — | Goals align with ACs; Non-goals do not contradict any AC; `recordRun` signature in Architecture Notes matches AC-2 signature; test plan matches AC-9/AC-10 counts |
| 3 | Reuse-First | PASS | — | Reuse Plan explicitly cites `QualityEvaluationSchema`, atomic write pattern from `yaml-artifact-writer.ts`, `@repo/logger`, `yaml` package, `fs/promises`, and Vitest fixture pattern — all from existing packages |
| 4 | Ports & Adapters | PASS | — | No HTTP endpoints; no API Gateway or Lambda; pure TypeScript library — ports/adapters check N/A for transport. Circular import risk explicitly identified and mitigation documented: import only from `models/__types__/`, not `models/quality-evaluator.ts` |
| 5 | Local Testability | PASS | — | Test commands provided (`pnpm test --filter @repo/orchestrator -- model-selector`); 28 tests decomposed into unit + integration categories; integration test uses real `os.tmpdir()` per AC-10 |
| 6 | Decision Completeness | PASS | — | Three previously-open design decisions are fully resolved in the story: (a) convergence algorithm: simplified heuristic with explicit thresholds, (b) `recent_run_scores` field added to schema, (c) `value_score` ceiling and zero-cost sentinel defined. No blocking TBDs remain |
| 7 | Risk Disclosure | PASS | — | Five MVP-critical risks documented in DEV-FEASIBILITY.md: rolling window field, convergence underspecification, float serialization, hardcoded paths, new directory. Dependency on MODL-0030 UAT status is flagged |
| 8 | Story Sizing | PASS | — | 10 ACs (2 over limit of 8 — see note below); 0 endpoints; backend-only; 8 new files across 1 package. Two sizing indicators triggered (>8 ACs, >3 test scenarios). Split not recommended — all 10 ACs are tightly coupled around one data structure (`Leaderboard`) and the schema/compute/persist/report pipeline is a single conceptual unit |
| 9 | Subtask Decomposition | PASS | — | 8 subtasks covering all 10 ACs; each subtask touches ≤3 files; DAG is linear with ST-5 parallelizable from ST-2 (both depend only on ST-1); each subtask has a `pnpm check-types` or `pnpm test` verification command; canonical references section present with 4 entries |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | `LeaderboardEntrySchema` in story body (AC-1) omits `recent_run_scores` field which is defined as mandatory in Architecture Notes and DEV-FEASIBILITY.md | Medium | Story body AC-1 must be updated to include `recent_run_scores: z.array(z.number()).max(5)` in `LeaderboardEntrySchema`. The field is already in the story's Architecture Notes section and in DEV-FEASIBILITY.md Requirement 2 — the AC-1 bullet list simply needs the field added for completeness. Without this, the degradation trend (AC-5) has no stored window. |
| 2 | ST-6 (slash command) depends on ST-5 (reports.ts) but ST-6 creates only a markdown definition file — no actual code dependency on ST-5. The dependency is conceptual only, not a compilation dependency | Low | Clarify in subtask that ST-6 depends on ST-5 conceptually (it documents the report output format) but can be written in parallel if needed. No fix required for implementation but documentation could be clearer. |
| 3 | Story metadata `blocked_by: [MODL-0030]` is correct but MODL-0030 is in UAT status — if MODL-0030 UAT fails and the `QualityEvaluation` schema is modified, `RunRecordSchema.extend()` definition will need updating | Low | No fix required in story. The existing warning in the Reality Baseline section is adequate. Verify MODL-0030 UAT status before starting implementation. |

---

## Split Recommendation

Not applicable. While the story has 10 ACs (2 over the guideline of 8), all ACs are tightly coupled:
- AC-1 (schema) is a prerequisite for every other AC
- AC-2/3/4/5/6 all operate on the same `LeaderboardEntry` structure
- AC-7 (reports) requires the completed schema
- AC-8 (CLI command) requires AC-7 output format
- AC-9/10 (tests) require all implementation ACs

Splitting into MODL-0040-A (persistence + tracking) and MODL-0040-B (reports + CLI) would create an artificial dependency with no independent testability for MODL-0040-B. The 5-point estimate and single-package scope support keeping this as one story.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

One medium-severity issue: AC-1 in the story body needs `recent_run_scores` added to the `LeaderboardEntrySchema` field list. This is a documentation fix — the intent is already captured in Architecture Notes and DEV-FEASIBILITY.md. The story is otherwise complete and executable.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | AC-1 `LeaderboardEntrySchema` bullet in story body does not list `recent_run_scores: z.array(z.number()).max(5)` | AC-5 (degradation detection); AC-9 boundary tests for rolling window | Add `recent_run_scores: z.array(z.number()).max(5)` to the `LeaderboardEntrySchema` field list in AC-1. The field is documented in Architecture Notes section ("Quality Trend — Rolling Window") and in DEV-FEASIBILITY.md Requirement 2, but omitting it from AC-1 creates ambiguity about the schema contract the developer must deliver |

---

## Worker Token Summary

- Input: ~12,500 tokens (MODL-0040.md, STORY-SEED.md, DEV-FEASIBILITY.md, quality-evaluation.ts, quality-evaluator.ts, yaml-artifact-writer.ts, stories.index.md, elab-analyst.agent.md)
- Output: ~900 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
