# Future Opportunities - WINT-1140

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Edge case: CHECKPOINT.yaml contains a `worktree_id` that references a DB record in `merged` or `abandoned` state (not `active`) | Low | Low | Current AC-3 only handles matching active DB records. A stale `worktree_id` pointing to a non-active record could cause confusing behavior. Add a check: if worktree_id found in CHECKPOINT.yaml but DB record status is not active, treat as "no active worktree" and create a new one. Log a warning. |
| 2 | Edge case: Worktree path on disk no longer exists but DB record is active (orphaned DB record from a crashed session with no cleanup) | Low | Low | Deferred to WINT-1150 (cleanup) but WINT-1140 could add a pre-flight path-existence check before calling /wt:switch to surface a clearer error message instead of a confusing wt-switch failure. |
| 3 | Edge case: `worktree_register` returns a conflict error (duplicate path) vs a generic MCP failure — AC-8 treats both as "null" | Low | Low | Future iteration could distinguish conflict vs failure in the graceful degradation message to give the user more actionable information. Requires worktree_register to return structured errors (WINT-1130 scope). |
| 4 | No test for `--gen` + `--skip-worktree` combined flags (AC-5 + AC-7) | Low | Low | The test plan covers `--gen` and `--skip-worktree` independently but not in combination. Add a matrix entry. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | UX polish: The 3-option warning (AC-4) could include time elapsed since the worktree was registered, not just the registered timestamp | Low | Low | Showing "Registered 2 days ago" is more human-readable than an ISO datetime. Future improvement. |
| 2 | UX polish: Step 1.3 could log the worktree path and branch name to CHECKPOINT.yaml as additional fields beyond `worktree_id` for easier debugging | Low | Low | Would allow quick inspection of which worktree/branch is active without querying the DB. |
| 3 | Performance: `worktree_get_by_story` is called unconditionally on every dev-implement-story invocation, even for short dry-run or re-resume flows | Low | Low | Add a short-circuit: if `--skip-worktree` is set, skip the MCP call entirely (currently the story does this, but AC-5 should explicitly state no MCP calls are made, not just no DB rows created). |
| 4 | Observability: No telemetry logging for worktree pre-flight outcomes (new create, resume, take-over, abort) | Medium | Low | WINT-3020 will add telemetry logging generally. Flagging here so the pre-flight step is included in WINT-3070's scope when dev-implement-story is instrumented. |
| 5 | Integration: The autonomy auto-select for moderate/aggressive (AC-9) only handles same-machine detection. Cross-machine detection (different hostname in DB record) is not addressed. | Low | Medium | Future: add machine identifier to worktree_register call. Cross-machine conflict handling is a WINT-1160 concern (conflict prevention UI). |
| 6 | Accessibility of output: The 3-option prompt (AC-4) uses lowercase a/b/c. A future iteration could add numbered options (1/2/3) as aliases for accessibility and reduced typo risk. | Low | Low | Minor UX polish, not MVP-relevant. |

## Categories

- **Edge Cases**: Issues #1, #2, #3, #4 — error handling for orphaned records, combined flags, structured error responses
- **UX Polish**: Enhancements #1, #2, #6 — human-readable timestamps, CHECKPOINT extended fields, input aliases
- **Performance**: Enhancement #3 — avoiding unnecessary MCP calls in skip mode
- **Observability**: Enhancement #4 — telemetry hook for WINT-3070
- **Integrations**: Enhancement #5 — cross-machine conflict detection for WINT-1160
