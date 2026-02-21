# Future Opportunities - WINT-1120

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The `shimGetStoriesByStatus` and `shimGetStoriesByFeature` bulk shim functions are listed in the seed's tool table but have no dedicated ACs in the story — only `shimGetStoryStatus` and `shimUpdateStoryStatus` are verified | Low | Low | Add AC coverage for bulk shim functions in a follow-on validation story or fold into WINT-7100 (shim removal) acceptance criteria |
| 2 | EVIDENCE.yaml schema is referenced (`packages/backend/orchestrator/src/artifacts/evidence.ts`) but the schema itself is not verified as part of this story — if it has drifted from the format used, the artifact output may be malformed | Low | Low | Verify evidence.ts schema against current EVIDENCE.yaml format in ST-1; file a fix story if drift detected |
| 3 | `worktree_list_active` MCP tool (listed in seed tool table) is not exercised by any AC — only `worktree_register`, `worktree_get_by_story`, and `worktree_mark_complete` are tested | Low | Low | Add `worktree_list_active` round-trip check in ST-4 or dedicate a future story to verifying bulk worktree query tools |
| 4 | The story verifies DB state before/after commands but does not specify a revert/cleanup step for the story used in AC-7 (`/story-move` test) beyond the inline checklist note "story reverted post-test" — this is fragile if the test session is interrupted | Low | Low | Add an explicit rollback checklist item to ST-3 with the exact reversal command to run |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | EVIDENCE.yaml could include timing metrics (duration of each verification step) to provide a baseline for future performance regression detection | Medium | Low | Extend EVIDENCE.yaml schema to include `duration_ms` per AC entry; useful for WINT-3000s telemetry phase |
| 2 | The integration test file (`wint-1120-foundation-validation.test.ts`) could be tagged as a foundation smoke test and added to a CI gate that runs on every deploy of `mcp-tools` package — currently it will only run on demand | High | Low | Add Vitest tag `@smoke` to the test file and configure Turborepo to run tagged smoke tests on deploy; defer to WINT-3080 (Validate Telemetry Collection) or a CI hardening story |
| 3 | AC-11 (three-option dialog when active worktree exists) is currently verified manually via `dev-implement-story` — a future story could capture this as an integration test that programmatically invokes the command and asserts on its structured output | Medium | Medium | File as a follow-on story in Phase 7 (WINT-7030 or WINT-7050) when agent migration adds testable structured outputs |
| 4 | The unified schema parity check (AC-8, AC-9) currently compares only three fields (`storyId`, `state`, `title`) — a more comprehensive parity check covering all columns would give higher confidence in the unified schema | Medium | Low | Expand field comparison list in ST-2 to include `priority`, `created_at`, `updated_at`; low effort within existing test structure |
| 5 | No negative path is specified for AC-1 (CRUD operations) — if a tool returns an unexpected shape, the test passes as long as it does not throw. A schema validation assertion using the shared Zod types from WINT-1100 would strengthen the test | Medium | Low | Add `StorySchema.parse(result)` assertions in ST-2 integration tests for all four CRUD tools |

## Categories

- **Edge Cases**: Gap #1 (bulk shim tools not verified), Gap #3 (worktree_list_active not tested), Gap #4 (incomplete revert procedure)
- **UX Polish**: N/A — no UI surface
- **Performance**: Enhancement #1 (timing metrics in EVIDENCE.yaml)
- **Observability**: Enhancement #2 (smoke test CI gate), Enhancement #3 (structured output assertions for conflict dialog)
- **Integrations**: Enhancement #4 (expanded parity field coverage), Enhancement #5 (Zod schema assertions on CRUD results)
- **Future-Proofing**: Gap #2 (evidence.ts schema drift check)
