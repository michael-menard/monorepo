# Future Opportunities - WINT-1040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The command spec's "Feature Only" (no Story ID) mode is currently directory-based and documented as deferred to WINT-1070. During the migration window, feature-level summaries will still reflect directory state rather than DB state, which may lag behind DB reality for stories in `blocked` or `cancelled` DB states (no directory equivalent). | Low | Low | Accept as-is; address in WINT-1070 (Deprecate stories.index.md as Source of Truth). |
| 2 | The "No Arguments" mode (all-features summary) also remains directory-based. If DB becomes the authoritative source and directories are eventually flattened (WINT-1020), the summary will become stale. | Low | Medium | Defer to a post-WINT-1070 story that routes all modes through DB. |
| 3 | The optional one-line `Source: database` / `Source: directory (DB miss)` diagnostic noted in the story's UI/UX Notes section is explicitly marked as advisory and non-MVP. It would aid debugging during the migration window but is not required for the command to function correctly. | Medium | Low | Add to WINT-1040 as an optional AC, or create a follow-on story after WINT-1120 validation phase. |
| 4 | Directory-only states (`elaboration`, `needs-code-review`, `failed-code-review`, `ready-for-qa`, `failed-qa`, `created`) are not in `SWIM_LANE_TO_STATE` and therefore not mapped in the DB. These states surface only via directory fallback. The command spec acknowledges this as acceptable during the migration window, but it introduces an asymmetry: a story in `elaboration` will always show as directory-sourced even after WINT-1030 runs. | Medium | High | Map remaining directory states to DB states in a future schema migration (requires WINT-1080 alignment and a new story). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Once WINT-3070 adds telemetry logging to `story-status`, the DB-first routing could emit a structured telemetry event (e.g., `story_status_queried: { source: db | directory | not_found }`). This would enable aggregate analysis of DB vs directory hit rates during the migration window. | Medium | Low | Defer to WINT-3070 (Update 10 Core Workflow Agents with Telemetry). |
| 2 | The current `shimGetStoryStatus` call normalizes story IDs to uppercase (step 1 of the updated command spec). Future improvement: validate the normalized ID against `isValidStoryId` from `@repo/workflow-logic` before calling the MCP tool, to provide an early, descriptive error for malformed IDs (e.g., `WINT-abc`) rather than a "Story not found" message. | Low | Low | Add ID validation to the command spec as a pre-call check in a follow-on story. |
| 3 | After WINT-7030 (Phase 7: Migrate Batch 1 Agents — DB exclusively), the shim fallback in this command can be removed and the command can call `storyGetStatus` directly. This simplification is architecturally planned and documented in the story's non-goals as future scope. | High | Low | Track as a Phase 7 cleanup task under WINT-7030 scope. |
| 4 | The command does not currently display the `ShimDiagnostics.source` field (`db | directory | not_found`) from WINT-1012. Exposing this in output (even optionally) would make it clear to users whether the result came from the DB or the fallback, which is especially useful when the two sources diverge during the migration window. | Medium | Low | Add optional `--verbose` flag to the command in a follow-on story that surfaces the diagnostics field. |
| 5 | The DB state → display label mapping table (AC-3) is defined in the command spec itself, which creates a risk of divergence with the actual `storyStateEnum` values in the DB schema if the schema evolves. A future improvement would be to auto-generate the mapping table from a canonical source (e.g., the Drizzle schema or `SWIM_LANE_TO_STATE`). | Low | Medium | Address as part of WINT-1070 (stories.index.md deprecation) or as a Phase 7 maintenance task. |

## Categories

- **Edge Cases**: Items 1, 2, 4 above (directory-only states, "No Arguments" / "Feature Only" mode staleness)
- **UX Polish**: Items 3, 4 (source diagnostic line, ShimDiagnostics exposure)
- **Observability**: Item 1 in Enhancement Opportunities (telemetry event on DB vs directory hit)
- **Performance**: None identified (single-story lookup is inherently low-latency)
- **Integrations**: Item 3 in Enhancement Opportunities (Phase 7 shim removal after full migration)
- **Future-Proofing**: Item 5 (auto-generated mapping table to prevent schema drift)
