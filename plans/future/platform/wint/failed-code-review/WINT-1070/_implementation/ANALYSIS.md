# Elaboration Analysis - WINT-1070

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md; backend-only CLI script |
| 2 | Internal Consistency | CONDITIONAL PASS | Medium | AC-4 lists status values that do not match the actual `wint.story_state` DB enum; see Issue #1 |
| 3 | Reuse-First | PASS | — | `createDbPool()`, `findMonorepoRoot()`, `StoryFileAdapter`, `StoryRepository`, `@repo/logger`, `population.ts` patterns all explicitly reused |
| 4 | Ports & Adapters | PASS | — | No API surface; script is a standalone CLI. Ports & Adapters check is N/A for this pattern |
| 5 | Local Testability | PASS | — | `.ts --dry-run` / `--generate` / `--verify` modes serve as runnable tests; unit tests + integration tests with real DB fixture specified |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | Missing: specification of the diff library or algorithm for `--verify` line-diff output (noted as a risk in TEST-PLAN.md but not resolved in the story itself) |
| 7 | Risk Disclosure | PASS | — | DB schema completeness, label mismatch, format regression, DO NOT EDIT header, concurrent writes — all explicitly identified with mitigations |
| 8 | Story Sizing | PASS | — | 12 ACs, but backend-only, no frontend, clear analog (WINT-1030), no split recommended by PM predictions (0.3 split risk) |
| 9 | Subtask Decomposition | PASS | — | 5 subtasks; each covers ≤3 files; linear DAG (ST-1→ST-2→ST-3→ST-4→ST-5); each has a verification command; Canonical References section present |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **DB State Enum Mismatch in AC-4** — AC-4 specifies the Progress Summary must show: `completed, uat, in-qa, ready-for-qa, ready-for-code-review, failed-qa, elaboration, created, backlog, in-progress, ready-to-work, pending`. The actual `wint.story_state` DB enum (from `packages/backend/orchestrator/src/state/enums/story-state.ts`) contains only: `draft, backlog, ready-to-work, in-progress, ready-for-qa, uat, done, cancelled`. Additionally, `population.ts` uses a different underscore-form enum (`ready_to_work`, `in_progress`, etc.). None of the three sets match the Progress Summary table currently in `stories.index.md`. | High | Before implementing the `STATE_TO_DISPLAY_LABEL` constant and the Progress Summary renderer, the implementer must determine which enum is the authoritative source for the actual DB column type. Running `SELECT unnest(enum_range(NULL::wint.story_state))` against the live DB is required. The AC-4 evidence line ("DB enum values (underscores) are converted to display labels (hyphens)") assumes underscore format, but `story-state.ts` already uses hyphens. The story must clarify which schema wins. |
| 2 | **`--verify` diff algorithm unspecified** — AC-8 requires printing a "line-diff summary to stdout" but does not specify the diff algorithm, output format, or whether a third-party library (e.g., `diff`, `jest-diff`) is required or if a Node.js native string comparison is used. TEST-PLAN.md flags this as a risk ("Recommendation: use Node's built-in string comparison with a line-diff library rather than shelling out to `diff`") but leaves it as a recommendation rather than a decision. Without a specified approach, two implementers could produce incompatible outputs. | Medium | Add one sentence to AC-8 specifying the algorithm: "Line diff uses the `diff` npm package's `diffLines()` function, which is already available in the orchestrator workspace, or implement inline character-by-character diff if not available — no new npm dependencies required." This is a small addition but prevents implementation ambiguity. |
| 3 | **`StoryRepository.getAllStories()` returns `StoryArtifact` not raw DB rows** — The existing `StoryRepository` methods return `StoryArtifact` objects (via `rowToStoryArtifact()` which calls `StoryArtifactSchema.parse()`). The script needs `phase` from YAML fallback and a `depends_on` that matches the DB array — `StoryArtifact` maps `feature_id` to a string `'unknown'` default when null. The `depends_on` field is mapped correctly. However, `StoryArtifact.state` uses the hyphenated form (e.g., `ready-to-work`) from `story-state.ts`, not underscores. The story's `STATE_TO_DISPLAY_LABEL` constant describes converting "DB enum values (underscores)" — but the repository layer already converts to hyphens. The implementer needs clarity on whether `getAllStories()` returns `StoryArtifact[]` (already hyphenated) or raw `StoryRow[]` (database format). | Medium | Clarify in ST-1 that `getAllStories()` should return `StoryRow[]` (raw DB rows) rather than `StoryArtifact[]`, because: (a) the script needs DB-native field names directly, and (b) it avoids the `rowToStoryArtifact()` overhead which discards fields the script doesn't need and requires a separate `acs: []` and `risks: []` stub. Alternatively, if `StoryArtifact[]` is returned, update AC-4 to note that the state values will already be hyphenated and the `STATE_TO_DISPLAY_LABEL` constant maps hyphen → display-label. |

---

## Split Recommendation

Not applicable — story sizing check passes. 3-point story with clear analogous implementation.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

All checks pass with the following required fixes before implementation proceeds:

1. **Issue #1 (High)**: Implementer must query the live DB to determine the actual `wint.story_state` enum values and reconcile AC-4's Progress Summary status list, the `STATE_TO_DISPLAY_LABEL` constant, and the `stories.index.md` format. This cannot be resolved in the story document alone — it requires a pre-implementation DB audit step already described in the DEV-FEASIBILITY.md but not yet encoded as a required deliverable in a subtask.
2. **Issue #2 (Medium)**: Diff algorithm for `--verify` mode must be specified in AC-8 or ST-4 before implementation.
3. **Issue #3 (Medium)**: `getAllStories()` return type (`StoryArtifact[]` vs `StoryRow[]`) should be decided in ST-1 to prevent a mid-implementation rework.

None of these issues block writing the analysis — they are resolvable during the elaboration synthesis phase without a story split or full rewrite.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | DB state enum mismatch — `wint.story_state` actual values unknown relative to what AC-4 specifies for Progress Summary | AC-4 (Progress Summary counts) and AC-5 (Ready to Start computation, which filters on `ready_to_work` vs `ready-to-work`) cannot be correctly implemented without knowing the authoritative enum values | Add a mandatory pre-implementation DB audit step to ST-1: run `SELECT unnest(enum_range(NULL::wint.story_state))` and cross-reference result against AC-4's status list. Document the authoritative list as the `STORY_STATE_ENUM` constant. If the actual DB enum differs from AC-4's list, update AC-4 before coding begins. |

---

## Worker Token Summary

- Input: ~9,800 tokens (WINT-1070.md, STORY-SEED.md, TEST-PLAN.md, DEV-FEASIBILITY.md, RISK-PREDICTIONS.yaml, story-repository.ts, populate-story-status.ts, population.ts, story-file-adapter.ts header, story-state.ts, stories.index.md header)
- Output: ~800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
