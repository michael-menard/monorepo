# Elaboration Analysis - WINT-1150

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope in WINT-1150.md matches stories.index.md description exactly; no extra endpoints or infrastructure introduced |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals/ACs are internally consistent; AC-11 explicitly protects the non-goal of blocking completion; cleanup decision flow diagram matches ACs |
| 3 | Reuse-First | PASS | — | Fully reuses WINT-1130 MCP tools (`worktree_get_by_story`, `worktree_mark_complete`), existing wt-finish skill, and WINT-1130 error-handling pattern; no per-story one-off utilities |
| 4 | Ports & Adapters | PASS | — | No API endpoints touched; TypeScript scope is schema-only additions; agent/command files serve as adapters invoking MCP tools as core; business logic (CI/PR checks) delegated to wt-finish skill |
| 5 | Local Testability | CONDITIONAL PASS | Medium | Test scenarios are well-defined in TEST-PLAN.md; however, behavioral/agent tests for haiku agents have no concrete runner specified; integration test (real PostgreSQL) is scoped but the test file location is not specified in the story |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | One open question identified: wt-finish structured output (CI/PR failure reasons) is explicitly flagged as TBD pre-work in Architecture Notes; not a blocker but requires discovery at implementation start before AC-5/AC-6 can be coded |
| 7 | Risk Disclosure | PASS | — | `wt-finish-output-structure` (p=0.40) and `wint-1130-deployment` (p=0.10) blockers explicitly named; auto-merge risk addressed; haiku budget constraint documented |
| 8 | Story Sizing | PASS | — | 11 ACs, but 6 of them are trivially sequential if-branches (AC-5 through AC-11 derive from the same flow); 2 files modified (agent + command); no new packages; 1 TypeScript schema addition; 4 test scenarios |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | wt-finish returns no machine-readable structured output (currently a guided interactive skill) | High | Pre-work: verify `wt-finish/SKILL.md` output format before implementing AC-5/AC-6; if CI/PR reasons are absent, add structured output to wt-finish as explicit prerequisite task. Document finding in DECISIONS.yaml. |
| 2 | `worktree_mark_complete` input schema uses `worktreeId` (UUID), but the pre-flight check via `worktree_get_by_story` returns `id` (UUID) and `storyId` (human-readable string). Story ACs reference "metadata update" for deferred paths (AC-5/AC-6) but the current `worktree_mark_complete` signature sets status to 'merged' or 'abandoned' — deferral may need a separate metadata-update path or status 'abandoned' with deferred metadata | Medium | Clarify in DECISIONS.yaml: use `worktree_mark_complete(worktreeId, { status: 'abandoned', metadata: { cleanup_deferred: true, reason: '...' } })` for deferred paths, or confirm a metadata-only update path exists. Existing `worktree_mark_complete` supports JSONB metadata merge; this is likely fine with `status: 'abandoned'`. |
| 3 | Test file location for integration tests is unspecified in story | Low | At implementation start, specify the test file path (likely `packages/backend/mcp-tools/src/worktree-management/__tests__/cleanup-integration.test.ts`); no story change needed, just implementation decision |
| 4 | The `story-update` command currently operates in `docs-only` permission; the command instruction cannot make MCP tool calls directly | Low | Story correctly notes delegation to MCP tools; implementation must ensure `story-update.md` invokes a sub-step (e.g., calling `worktree_get_by_story` MCP tool) at the command level. Verify that command files can invoke MCP tools. Already acknowledged in TEST-PLAN.md Scenario 7 expected notes — this confirms awareness. No story change needed. |

## Split Recommendation

Not applicable. Story is appropriately sized. The 11 ACs map to a single linear decision flow with 4 branches. Splitting would create artificial fragmentation.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

One pre-work discovery step (wt-finish output structure) must be completed before implementing AC-5/AC-6. This is explicitly documented in the story's Architecture Notes and Risk Predictions and is already mitigated. One schema clarification (Issue 2: deferred path status value) should be resolved in DECISIONS.yaml at implementation start. Neither issue blocks proceeding.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | wt-finish skill does not expose machine-readable CI/PR failure reasons (`ci_failing`, `pr_review_pending`) — confirmed by reviewing `.claude/skills/wt-finish/SKILL.md` which describes an interactive guided flow with no structured output schema | AC-5 (CI failing → defer) and AC-6 (PR changes → defer); these ACs cannot be implemented as scoped without structured failure output | Document in DECISIONS.yaml at implementation start; either (a) add structured output to wt-finish as a prerequisite task adding 1-2 points, or (b) scope AC-5/AC-6 to treat any wt-finish failure as "unknown" reason and defer uniformly, which weakens observability but keeps scope. Decision required before coding. |
| 2 | `worktree_mark_complete` status enum accepts only 'merged' or 'abandoned' — the deferral path stores metadata but the "right" status for a deferred worktree is ambiguous (still active? abandoned with metadata?) | AC-5 and AC-6 metadata update (cleanup_deferred) and the agent's ability to represent "deferred but not abandoned" state | Resolve in DECISIONS.yaml: recommend `status: 'abandoned'` with metadata `{ cleanup_deferred: true, reason: '...' }` to record deferral without leaving worktree in 'active' indefinitely. This is consistent with existing schema. |

---

## Worker Token Summary

- Input: ~8,200 tokens (story file, stories.index.md, qa-verify-completion-leader.agent.md, story-update.md, wt-finish/SKILL.md, worktree-management types, worktree-get-by-story.ts, worktree-mark-complete.ts, TEST-PLAN.md, DEV-FEASIBILITY.md)
- Output: ~1,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
