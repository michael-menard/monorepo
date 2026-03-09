# Future Opportunities - WINT-1050

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Architecture Notes typo: "8 unmapped statuses" should be "6 unmapped statuses" | Low | Low | Fix prose in Architecture Notes section during a future doc cleanup pass. The 6-bullet list below the typo is authoritative; no implementation risk. |
| 2 | TEST-PLAN Test 8 incorrectly includes BLOCKED and superseded as "unmapped" | Low | Low | Correct TEST-PLAN.md Test 8 in a future pass to list only the 6 genuinely unmapped statuses. Tests 9 and 10 correctly handle BLOCKED/superseded. No risk of QA failure if the QA engineer reads ACs directly. |
| 3 | `done` vs `completed` mapping semantics not surfaced for new readers | Low | Low | The command status `completed` maps to DB state `done`. This is correct but the `SWIM_LANE_TO_STATE` constant uses `done` as a key, which could confuse implementers who expect the command status to match the DB state. A clarifying comment in ST-2/ST-3 output would help. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add `db_updated: skipped` as a distinct third value (deferred to WINT-7030) | Medium | Medium | The story explicitly defers a `skipped` value in the result YAML (Non-goals). Tracking `skipped` vs `false` would improve observability for operators diagnosing why a DB write did not occur. WINT-7030 (Phase 7) is the planned home for this. |
| 2 | Concurrent update conflict detection (deferred to WINT-1160) | Medium | High | If two sessions call `/story-update` with different statuses for the same story simultaneously, the last writer wins with no warning. WINT-1160 owns conflict prevention. |
| 3 | --db-only flag for DB write without FS write (deferred to WINT-7030) | Low | Low | Useful for reconciliation scripts that need to sync DB without touching story files. Non-goal for this story; deferred to WINT-7030. |
| 4 | Telemetry logging for shimUpdateStoryStatus calls | Medium | Low | When WINT-3070 lands, the story-update command should be included in the telemetry instrumentation batch. The `triggeredBy: 'story-update-command'` field already provides the actor identifier for logging. |
| 5 | Validation that transition table and mapping table stay in sync | Low | Medium | As new statuses are added to the command, both the Status Transition Rules table and the DB mapping table must be updated. A WINT-7010-style audit script could verify completeness automatically. |

## Categories

- **Edge Cases**: TEST-PLAN Test 8 typo, `done`/`completed` mapping clarity
- **UX Polish**: `db_updated: skipped` third value for operator observability
- **Performance**: N/A (documentation-only story)
- **Observability**: Telemetry logging integration (WINT-3070 dependency)
- **Integrations**: --db-only flag (WINT-7030), conflict detection (WINT-1160)
