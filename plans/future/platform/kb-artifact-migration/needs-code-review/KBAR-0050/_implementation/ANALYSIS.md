# Elaboration Analysis - KBAR-0050

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Stories index (KBAR-005) matches story: CLI commands with dry-run support for the kbar-sync package |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, AC, and local test plan are internally consistent |
| 3 | Reuse-First | PASS | — | All sync logic reused from `@repo/kbar-sync`; `@repo/logger`, `@repo/db`, `zod`, and `tsx` reused; no one-off utilities |
| 4 | Ports & Adapters | PASS | — | No HTTP endpoints; CLI is a thin adapter; core logic stays in `@repo/kbar-sync`; parse→validate→delegate→print pattern enforced as non-negotiable |
| 5 | Local Testability | CONDITIONAL PASS | Medium | Vitest unit tests specified with >80% coverage requirement. No `.http` tests needed (CLI-only). Integration tests with testcontainers per ADR-005 mentioned but not concretely specified as subtasks — this is a gap in the subtask decomposition, not the AC |
| 6 | Decision Completeness | CONDITIONAL PASS | Low | Dry-run implementation strategy lists two approaches (preferred vs fallback) but defers the choice to implementation. This is a low-risk open question since both approaches are fully specified |
| 7 | Risk Disclosure | PASS | — | Five MVP-critical risks identified in DEV-FEASIBILITY.md: dry-run mutation risk, implementation gate, N+1 queries, path security, `as any` casts — all explicit |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 10 ACs, 8 subtasks, 3 new files + 1 modified. Touches only 1 package. Split risk metadata set to 0.7 (high). See sizing analysis below |
| 9 | Subtask Decomposition | CONDITIONAL PASS | Low | All ACs covered by subtasks; subtask file-touch counts are within bounds; dependency DAG is acyclic; verification commands provided. Integration test subtask missing — see Issues |

---

## Sizing Analysis (Check 8)

Indicators evaluated against "too large" criteria:

| Indicator | Threshold | Actual | Triggered? |
|-----------|-----------|--------|------------|
| Acceptance Criteria count | >8 | 10 | YES |
| Endpoints created/modified | >5 | 0 | No |
| Significant frontend AND backend work | both | backend only | No |
| Multiple independent features bundled | present | sync:story + sync:epic are related; both CLI wrappers for same package | Borderline |
| Distinct test scenarios in happy path | >3 | 12 in TEST-PLAN.md | YES |
| Packages touched | >2 | 1 (`@repo/kbar-sync`) | No |

**Triggered indicators: 2** (AC count and test scenario count). The threshold for a split recommendation is 2+ indicators. However, the two commands (`sync:story` and `sync:epic`) are tightly coupled — `sync:epic` depends on story discovery patterns that are best validated alongside `sync:story`. The AC count is high but all ACs cover a single coherent CLI tool.

**Split risk assessment**: Split risk of 0.7 (from metadata) reflects that this could be split into KBAR-0050-A (sync:story command) and KBAR-0050-B (sync:epic command). This would reduce each story to 5 ACs and 4 subtasks — cleanly within bounds. The shared types file (ST-1) would belong to KBAR-0050-A (prerequisite).

The story is implementable as-is given the tight coupling, but a split is a viable option if the implementing agent encounters context pressure.

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Integration test subtask missing | Medium | AC-10 specifies Vitest unit tests. ADR-005 requires integration tests with real DB for UAT. No subtask (ST-9+) is defined for integration tests. The test plan lists integration test requirements but they have no corresponding subtask with a verification command. Add ST-9 covering integration test file with testcontainers setup and real DB assertions for dry-run zero-mutation and checkpoint resumption |
| 2 | `SyncStoryToDatabaseInput` does not include `force` or `dryRun` flags | Medium | The existing `SyncStoryToDatabaseInputSchema` (confirmed in `packages/backend/kbar-sync/src/__types__/index.ts`) does not accept `force` or `dryRun` parameters. AC-1 requires `--force` (bypass checksum skip) and AC-6 requires dry-run support. This means Approach (2) from the Architecture Notes (CLI implements its own checksum comparison path) is mandatory — not optional. The story's "prefer approach (1)" guidance may mislead implementors into looking for a `dryRun: true` parameter that does not exist. The story should explicitly state that Approach (2) is required given the current function signatures |
| 3 | `SyncStoryToDatabaseInput.filePath` expects absolute path; CLI receives relative `--story-dir` | Low | The real `SyncStoryToDatabaseInputSchema` requires `filePath` (absolute path to story file) not `storyDir`. The CLI accepts `--story-dir` and must construct the absolute path to the story `.md` file. The story refers to this correctly in the reuse plan but the AC-1 spec says "accept `--story-dir <path>`" without clarifying that the CLI must resolve this to an absolute `filePath` before calling `syncStoryToDatabase`. This must be explicit to prevent a subtle type error at the boundary |

---

## Split Recommendation (optional — triggered by 2 sizing indicators)

This split is **optional** but available if needed:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| KBAR-0050-A | Shared CLI types + `sync:story` command (story sync, artifacts, conflicts, dry-run, exit codes, unit tests) | AC-1, AC-2, AC-3, AC-6 (story), AC-7 (sync:story only), AC-8, AC-9, AC-10 (sync-story.test.ts) | Depends on KBAR-0040 |
| KBAR-0050-B | `sync:epic` command (batch discovery, --epic filter, --artifact-type, checkpoint, dry-run, unit tests) | AC-4, AC-5, AC-6 (epic), AC-7 (sync:epic only), AC-10 (sync-epic.test.ts) | Depends on KBAR-0050-A |

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

The story is well-elaborated with concrete ACs, strong reuse enforcement, clear architecture, and solid risk disclosure. Two issues require resolution before handoff to development:

1. Add an integration test subtask (ST-9) — the unit tests alone do not satisfy ADR-005 for UAT
2. Clarify that dry-run Approach (2) is mandatory based on confirmed function signatures — remove ambiguity about Approach (1) being viable

The `filePath` vs `--story-dir` boundary note (Issue 3) is low severity but should be acknowledged in the story so the implementor does not introduce a confusing argument name mismatch.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Integration test subtask missing | UAT sign-off per ADR-005 — story cannot be QA-verified without real DB integration tests | Add ST-9: integration tests with testcontainers covering dry-run zero-mutation assertion and at minimum one happy path with real DB write |
| 2 | Dry-run approach ambiguity — `syncStoryToDatabase` has no `dryRun` or `force` parameter in confirmed schema | Implementor may write code that calls sync functions in dry-run mode, causing unintentional DB mutations (the highest-risk AC in the story) | Remove "Preferred: Pass `dryRun: true` to sync functions" from Architecture Notes; replace with explicit statement that Approach (2) is mandatory given current function signatures; specify that `--force` must be implemented by having the CLI skip the checksum pre-check and always call `syncStoryToDatabase` (which internally does an upsert regardless) |

---

## Worker Token Summary

- Input: ~18,000 tokens (agent instructions, KBAR-0050.md, STORY-SEED.md, TEST-PLAN.md, DEV-FEASIBILITY.md, stories.index.md, PLAN.exec.md, kbar-sync/src/__types__/index.ts, sync-story-to-database.ts, kbar-sync/src/index.ts, package.json, populate-story-status.ts)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
