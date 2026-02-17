# Future Opportunities - WINT-1150

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | wt-finish is an interactive guided skill — it prompts the user interactively (asks for base branch, offers test-run option). In an automated agent-invoked context, these prompts may hang if not pre-answered. | Medium | Medium | When wt-finish is invoked from qa-verify-completion-leader or story-update, pass `branchName` and `worktreePath` as arguments to skip interactive prompts. Verify wt-finish accepts non-interactive flags or add a `--auto` flag to wt-finish in a follow-up story. |
| 2 | No idempotency guard: if qa-verify-completion-leader PASS flow is replayed (e.g., after a partial failure), `worktree_mark_complete` might be called twice. | Low | Low | Worktree status check: if status is already 'merged' or 'abandoned', skip cleanup. `worktree_get_by_story` returns only `status: 'active'` worktrees, so this is inherently safe — worth confirming and documenting. |
| 3 | The deferred worktree metadata pattern (`cleanup_deferred: true`) is new and undiscoverable without querying the database directly. Users have no visibility into how many deferred worktrees are accumulating. | Medium | Low | WINT-1170 (Worktree-Aware Batch Processing) and the planned `/wt-status` enhancement should surface deferred worktrees. Consider adding `deferred` as a queryable flag in `worktree_list_active` or a new `worktree_list_deferred` tool. |
| 4 | story-update command currently documents valid transitions as `uat → completed` but does not specifically handle the worktree cleanup check in any step. The `completed` transition path from other states (e.g., direct admin override) would miss the cleanup check if story bypasses `uat`. | Low | Low | Scope is intentionally limited to `uat → completed` transition. Document this constraint explicitly in story-update.md implementation notes. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Timeout handling: if wt-finish hangs (interactive prompt not answered), the agent may block indefinitely. AC-11 says completion must not be blocked, but a hanging skill is not an "error" in the traditional sense. | High | Medium | Add a timeout wrapper to the wt-finish invocation in the agent instruction. If no response within N seconds, treat as "unknown" failure and defer. Deferred to implementation design decision. |
| 2 | Structured cleanup result reporting: after PASS flow completes, the agent emits `QA PASS` but there is no field in the output YAML for whether cleanup occurred, was deferred, or was skipped. | Low | Low | Extend agent output YAML with a `worktree_cleanup: 'completed' | 'deferred' | 'skipped' | 'not_found'` field. Improves observability for WINT-3080 telemetry validation. |
| 3 | "Defer" is currently defined as "wt-finish failed for known reasons." An explicit user-opt-in deferral (user says "don't clean up now") is mentioned in the story (AC-7 warning format) and TEST-PLAN Scenario 5, but there is no mechanism for the haiku agent to present a choice to the user in an automated flow. | Medium | Medium | In WINT-1140/1150 follow-up, consider a `--defer-cleanup` flag on `qa-verify-story` or `story-update` commands for power users who want to control worktree lifecycle manually. |
| 4 | The warning message format in AC-7 says "Run /wt-finish {storyId} when ready." The wt-finish skill currently uses `/wt:finish` (colon notation) not `/wt-finish` (hyphen notation). The action instruction in the warning may not match the actual invocation syntax. | Low | Low | Verify canonical invocation syntax in wt-finish/SKILL.md and align warning message format at implementation. |
| 5 | No bulk deferred cleanup command exists. After accumulating multiple deferred worktrees (CI issues resolved, PRs merged), a developer must run `/wt-finish` per-story. | Medium | High | WINT-1170 (Batch Worktree Processing) is the planned solution. This story's deferred metadata pattern is a prerequisite input to that story. No action needed now. |

## Categories

- **Edge Cases**: Interactive wt-finish prompts in automated context (Gap 1), idempotency on replay (Gap 2), direct `completed` transition bypassing cleanup (Gap 4)
- **UX Polish**: User-opt-in deferral mechanism (Enhancement 3), warning message syntax alignment (Enhancement 4)
- **Observability**: Deferred worktree visibility (Gap 3), structured cleanup result in agent output YAML (Enhancement 2)
- **Performance**: Timeout handling for hanging wt-finish invocations (Enhancement 1)
- **Integrations**: Bulk deferred cleanup via WINT-1170 (Enhancement 5)
