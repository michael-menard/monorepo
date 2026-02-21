# Future Opportunities - KBAR-0050

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | `--story-dir` accepts relative paths but `syncStoryToDatabase` requires an absolute `filePath`. The story notes this but does not add path resolution as an explicit subtask step. No test specifically asserts that relative input `--story-dir plans/future/...` is correctly resolved to an absolute path before calling the sync function. | Low | Low | Add a path resolution test case to ST-7: assert that `path.resolve(process.cwd(), storyDir, storyId + '.md')` is passed as `filePath` when a relative `--story-dir` is provided |
| 2 | `--from-db` flag (`syncStoryFromDatabase`) is mentioned in the Goal section and Reuse Plan but is absent from the AC list. It has no AC, no subtask, and no test scenario. | Low | Low | Either add a minimal AC covering `--from-db` behaviour or move it explicitly to a Future Opportunities note in the story to prevent scope creep during implementation |
| 3 | `--help` flag is specified in AC-7 ("prints usage without error") but no subtask tests the `--help` output format or validates that all flags are listed. The reference script (`populate-story-status.ts`) does not implement `--help` either — it silently defaults to dry-run mode for unknown flags. | Low | Low | Ensure the `--help` implementation is exercised in at least one unit test; consider using a minimal arg-parser library that handles `--help` automatically (e.g., `minimist` or `parseArgs` from Node's built-in `node:util`) |
| 4 | `--artifact-file` + `--artifact-type` single-artifact targeting (AC-2) has no unit test scenario in AC-10 or TEST-PLAN.md. The test plan covers batch artifacts (`--artifacts`) but not the single-artifact path that calls `syncArtifactToDatabase` directly. | Low | Low | Add a test case to ST-7: invoke `sync:story --artifact-file _implementation/PLAN.yaml --artifact-type plan` and assert `syncArtifactToDatabase` called with correct input |
| 5 | The `SyncStoryToDatabaseInput` does not accept a `force` parameter — the CLI must implement force bypass by skipping its pre-sync checksum check. This is implied by the Architecture Notes but not explicit in any subtask. If the implementing agent reads only the subtasks without the Architecture Notes, they may miss this implementation detail. | Low | Low | Add a note to ST-2's goal: "Implement `--force` by skipping CLI-layer checksum pre-check; always call `syncStoryToDatabase` which performs its own upsert internally" |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Machine-readable output mode (`--json` flag). The story specifies human-readable stdout output only. For CI pipeline integration, a structured JSON output mode would allow downstream tools to parse sync results without text parsing. | Medium | Low | Add a `--json` flag to both commands in a follow-up story (KBAR-0050-followup or KBAR-0060+); output a JSON object with `{ storyId, status, checksum, syncEventId, error }` per operation |
| 2 | Estimated time output in dry-run mode. AC-6 requires "estimated time based on average sync rate (if available)" in dry-run output. No implementation guidance is given for how to compute or store the "average sync rate." This could result in the field being silently omitted or hardcoded. | Low | Medium | In a follow-up, track sync duration in `kbar.syncEvents` (already implemented) and compute a rolling average from recent events as the estimated rate; defer this to KBAR-0060+ or add an explicit note that estimated time can be omitted in the initial implementation |
| 3 | `sync:story --from-db` reverse sync direction. `syncStoryFromDatabase` is listed in the Reuse Plan but excluded from the ACs. A reverse sync command would be useful for restoring filesystem state from the database. | Medium | Low | Add `--from-db` as a future AC in KBAR-0050-B or a follow-up story targeting the DB→filesystem sync path |
| 4 | Prettier output formatting with column alignment. Current output spec ("KBAR-0050: synced (checksum: abc123, syncEventId: ev-001)") is functional but not visually scannable for large batches. A columnar format (aligned columns for ID, status, checksum) would improve readability. | Low | Low | Not MVP-blocking; add as a UX enhancement in a polish story |
| 5 | `sync:epic` does not specify artifact sync in addition to story sync — it only syncs story metadata. A common workflow would be `sync:epic --artifacts` (sync all stories AND all artifacts in one pass). AC-5 adds artifact-type batch sync but this is type-scoped, not per-story. | Medium | Medium | Add a `sync:epic --artifacts` mode that calls `batchSyncArtifactsForStory` for each story discovered — this is a natural extension of AC-4 that was intentionally excluded to keep KBAR-0050 bounded |
| 6 | No `--since <date>` incremental filter. The default incremental behavior relies on checksum comparison, but for very large bases (100+ stories), a date-based filter (`--since 2026-01-01`) would allow skipping checksum computation for stories with filesystem `mtime` older than the last sync. | Low | High | Defer to a performance-focused story; requires `mtime` tracking in `kbar.stories` or `kbar.artifacts` |
| 7 | No color/ANSI output differentiation. Synced vs skipped vs failed are plain text. Adding green/yellow/red ANSI coloring (behind a `NO_COLOR` env var check for CI) would improve developer ergonomics. | Low | Low | Add as a polish enhancement; check `process.env.NO_COLOR` and `process.stdout.isTTY` before using ANSI codes |

---

## Categories

- **Edge Cases**: Issues 1–5 in Gaps section (missing test coverage, implicit implementation details)
- **UX Polish**: Enhancement 4, 7 (output formatting and color)
- **Performance**: Enhancement 6 (date-based incremental filter)
- **Integrations**: Enhancement 1 (JSON output for CI), Enhancement 3 (reverse sync from DB)
- **Feature Completeness**: Enhancement 2 (estimated time), Enhancement 5 (epic-level artifact sync)
