# Future Opportunities - WINT-1060

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `done` stage ambiguity in the command's Valid Stages table — currently absent from the table, present in SWIM_LANE_TO_STATE | Low | Low | When updating story-move.md, add a note in the Valid Stages table or Step 2.5 inline mapping table that `done` is in SWIM_LANE_TO_STATE but is intentionally excluded as a TO_STAGE argument for `/story-move`. Prevents a future implementer from accidentally treating it as a valid target. |
| 2 | Locate-then-write independence not explicitly prose-stated in the command | Low | Low | Step 2.5 should include one sentence clarifying that a null return from shimGetStoryStatus during the locate step does not suppress the DB write — the write proceeds independently for mapped stages. This removes interpreter ambiguity for any executing agent. |
| 3 | `MOVE SKIPPED: Already in {TO_STAGE}` path (EDGE-4) does not attempt a DB reconciliation write | Low | Medium | If a story is already in the target directory but the DB record shows a different state (e.g., DB got ahead from a prior failed move), MOVE SKIPPED silently leaves the DB out of sync. A low-cost fix: even on SKIPPED, attempt a `shimUpdateStoryStatus` to reconcile. Defer to Phase 7 (WINT-7030) when directory move is removed. |
| 4 | No structured output for which stage triggered the DB-write-skipped warning (AC-5) | Low | Low | When `db_updated: skipped` due to unmapped stage, the warning log doesn't include the name of the stage that was skipped. Adding the stage name to the log message would help diagnostics. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | ShimDiagnostics field (from WINT-1012) not surfaced in the command's return YAML | Low | Low | WINT-1012 adds an opt-in `ShimDiagnostics` field (source: `db | directory | not_found`) to all four shim functions. The command return YAML could include `db_source: db | directory | not_found` from the locate step, giving operators visibility into whether the story was found via DB or directory fallback. Low impact for Phase 1; worth adding in Phase 7 cleanup. |
| 2 | `--dry-run` flag for auditing without side effects | Low | Medium | A `--dry-run` flag that echoes what DB state would be written (newState, shimUpdateStoryStatus arguments) and what directory would be moved, without executing either, would be useful for debugging and pre-flight verification. Defer to WINT-7030. |
| 3 | Bulk move operation (multiple stories at once) | Medium | High | The `/story-move` command operates on one story per invocation. A batch variant (`/story-move-batch`) that accepts a list of story IDs and a target stage would reduce agent invocations for common operations like "move all stories in backlog to ready-to-work." Defer to Phase 6 batch mode. |
| 4 | State transition validation against DB schema enum | Low | Low | The command currently trusts `SWIM_LANE_TO_STATE` as the authoritative mapping. A future enhancement could validate that the resolved `newState` is a member of the live `storyStateEnum` before writing, adding a runtime guard against schema drift. Deferred to Phase 7. |
| 5 | `db_updated` field in stories.index.md Progress Summary | Low | Low | After successful DB writes, the stories.index.md Progress Summary is updated by `/story-update` (when `--update-status` is used) but not by `/story-move` alone. A future story could update the index as part of the move command to keep the markdown index in sync without requiring a separate `--update-status` invocation. Already partially deferred by WINT-1070 (Deprecate stories.index.md as Source of Truth). |
| 6 | Telemetry integration for move events | Medium | Medium | WINT-3070 plans to add telemetry-log calls to `story-move`. The `db_updated` field introduced by WINT-1060 provides a natural telemetry signal (DB-write success/failure/skipped) that should be logged as a state transition event (from_state, to_state, reason, actor) per WINT-3100's telemetry.state_transitions table schema. Pre-wire the logging hook location in the updated command as a comment so WINT-3070 has a clear insertion point. |

## Categories

- **Edge Cases**: `done` stage ambiguity, locate-then-write independence clarification, MOVE SKIPPED DB reconciliation, skipped-stage log verbosity
- **UX Polish**: ShimDiagnostics in return YAML, dry-run flag, bulk move operation
- **Observability**: Telemetry hook for move events, state transition logging pre-wire
- **Integrations**: WINT-3070 telemetry instrumentation point, WINT-7030 cleanup target
- **Future-proofing**: DB enum validation guard, stories.index.md sync deferral to WINT-1070
