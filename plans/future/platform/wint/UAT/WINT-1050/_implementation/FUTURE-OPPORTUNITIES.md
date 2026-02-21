# Future Opportunities - WINT-1050

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | stories.index.md WINT-1050 entry has a stale "Acceptance Criteria (Phase 0)" block referencing WINT-0120 and "compatibility shim test suite deliverables" — copy-paste artifact from WINT-1060. Does not affect implementation but creates confusion for future readers of the index. | Low | Low | Clean up the stories.index.md WINT-1050 entry in a follow-up index maintenance pass (or as part of WINT-1070 when the index is regenerated from DB). |
| 2 | AC-2 text says "all 13 status values" but lists 14 (count mismatch). The mapping table in Architecture Notes is the authoritative artifact and is correct with 14 entries. | Low | Low | Correct the AC-2 count from "13" to "14" in a future story spec polish pass. Not worth a separate story. |
| 3 | The `superseded` status is not listed in the Status Transition Rules table in story-update.md v2.1.0 as a valid current state with allowed next transitions. This means there is no documented exit path from `superseded`. | Low | Low | Add `superseded → (terminal, no transitions)` row to the transition rules table in a follow-up command spec polish (could be bundled into WINT-1070 or WINT-7030). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The `--no-db` or `--skip-db` flag is explicitly out of scope (Non-Goal). However, once DB rollout is mature, agents in environments without DB access (e.g., offline local dev) would benefit from a graceful skip-db mode that emits a warning without attempting the shim call at all. | Medium | Low | Add as a Non-Goal comment in the Phase 7 migration stories (WINT-7030) and consider for the v4.0.0 spec bump. |
| 2 | The current spec does not define a structured `db_error_detail` field in the result YAML when `db_updated: false` due to a write failure (only `db_updated: false` is emitted). A future iteration could surface the failure category (DB unavailable vs. non-existent story vs. validation error) for richer observability. | Low | Low | Track in WINT-3070 (Telemetry) scope — the telemetry layer is the right place to capture DB error categories rather than the command result YAML. |
| 3 | The story does not define retry behavior for transient DB failures. The shim returns null on any failure — transient or permanent. A future enhancement could add a configurable retry count (e.g., 1 retry with 500ms backoff) at the command layer before treating the result as a definitive failure. | Low | Medium | Evaluate during Phase 3 telemetry work (WINT-3070). Frequency data from DB write failures will inform whether retry logic is justified. |
| 4 | The result YAML does not include a `db_state` field showing the actual DB `newState` value written (e.g., `in_progress`). Agents consuming the result YAML can only see `db_updated: true | false`, not what value was written. | Low | Low | Consider adding `db_state: <newState> | null` to the Step 5 result YAML in a future minor version bump (v3.1.0). |
| 5 | Integration test Scenario D (uat → completed order verification) is documented as a scenario but has no runnable test harness defined. ADR-005 requires real DB. As WINT-1050 is docs-only, the integration test runner would need to be a separate harness story. | Low | Medium | Create a dedicated integration test harness story in Phase 1 validation (WINT-1120) that covers all command spec scenarios against a live DB. |
| 6 | The `triggeredBy` field in the shim call is hardcoded to `'story-update'` in the spec. Future enhancements could pass the calling agent name (e.g., `'qa-verify-completion-leader'`) for richer telemetry attribution when agents call `/story-update` programmatically. | Low | Low | When WINT-3070 (telemetry) lands, revisit whether `triggeredBy` should accept the caller's agent ID dynamically. May require an optional `--triggered-by` argument on the command. |

## Categories

- **Edge Cases**: `superseded` terminal state transition gap (Gap 3); no retry logic for transient DB failures (Enhancement 3)
- **UX Polish**: `db_state` field in result YAML (Enhancement 4); richer `db_error_detail` (Enhancement 2)
- **Observability**: `triggeredBy` dynamic attribution (Enhancement 6); integration test harness story (Enhancement 5)
- **Integrations**: `--no-db` flag for offline dev environments (Enhancement 1)
- **Documentation Debt**: stories.index.md stale Phase 0 AC block (Gap 1); AC-2 count off-by-one (Gap 2)
