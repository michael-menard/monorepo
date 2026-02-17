# Future Opportunities - KBAR-0040

Non-MVP gaps and enhancements tracked for future iterations.

---

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | The `ARTIFACT_FILENAME_MAP` uses static keys and a glob pattern for `PROOF-*.md` files. Glob discovery is mentioned in the architecture notes but the integration with the static map is not fully specified — the batch discovery logic needs to merge static-key matches with glob matches. No AC explicitly defines this merge algorithm. | Low | Low | Add a sentence to AC-4 or the Architecture Notes clarifying how static map lookups and glob patterns are composed during batch file discovery. |
| 2 | `_pm/STORY-SEED.md` and `_pm/DEV-FEASIBILITY.md` are both mapped to `elaboration` type. If in the future a `DEV-FEASIBILITY.md`-specific artifact type is needed (e.g., `feasibility`), the `kbarArtifactTypeEnum` would need extension. Current enum does not include a `feasibility` value. | Low | Medium | Track as a future KBAR schema story. For now, using `elaboration` for both is acceptable if the `kbar.artifacts` table allows multiple rows per `(storyId, artifactType)`. |
| 3 | Cache TTL is hardcoded to 24h default in the story. There is no mechanism to configure TTL per artifact type (e.g., `checkpoint` artifacts change frequently and might benefit from a shorter TTL, while `evidence` artifacts rarely change). | Low | Low | Track as KBAR-0040 follow-up. Add a per-type TTL config map in a future story or when monitoring reveals stale cache issues. |
| 4 | The batch sync return type includes `conflictsDetected` in AC-4 output schema but AC-5 output does not include `conflictsDetected`. This asymmetry is minor but could confuse callers of `batchSyncByType` who expect conflict reporting. | Low | Low | Add `conflictsDetected` to `BatchSyncByTypeOutputSchema` in a follow-up or clarify the omission in AC-5 as intentional. |
| 5 | The story does not specify behavior when `outputPath` in AC-2 (`syncArtifactFromDatabase`) points to a directory that does not exist. The atomic write pattern (`.tmp` then `rename`) will fail if the parent directory is missing. | Low | Low | Add `mkdir -p` (or `fs.mkdir({ recursive: true })`) before the atomic write in `sync-artifact-from-database.ts`. Can be addressed during implementation without a story change. |

---

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **UX Polish — Progress reporting in batch sync**: `batchSyncByType` (AC-5) returns a summary result only at completion. For long-running bootstraps (hundreds of stories, 1000+ artifacts), a progress callback or event emitter would allow callers (KBAR-0050 CLI) to display a progress bar. | Medium | Medium | Implement in KBAR-0050 or KBAR-0060. Add an optional `onProgress` callback parameter to `batchSyncByType` in a future iteration. |
| 2 | **Performance — Bulk insert for batch artifact rows**: `batchSyncArtifactsForStory` (AC-4) calls `syncArtifactToDatabase` per artifact, which creates one `syncEvents` row and one transaction per artifact. For large batches, a bulk-upsert path (single multi-row insert for `artifacts` and `artifactVersions` with ON CONFLICT DO UPDATE) would dramatically reduce DB round trips. | Medium | High | Defer to a future KBAR performance story. Current per-artifact approach is acceptable for MVP bootstrap scenarios. |
| 3 | **Observability — Batch metrics emission**: Batch functions return aggregate counts but do not emit structured telemetry events to `kbar.syncEvents` with per-artifact detail beyond the summary. Future KBAR tooling (KBAR-0110 `artifact_write`, KBAR-0140 summary extraction) would benefit from richer batch event records. | Low | Medium | When TELE-0010 (Docker Telemetry Stack) is complete, add structured metric emission to batch functions. |
| 4 | **Edge case — Partial write recovery**: If the atomic write in `syncArtifactFromDatabase` fails between `.tmp` write and `rename()` (e.g., disk full during rename), the `.tmp` file is left on disk. No cleanup logic exists. | Low | Low | Add a `finally` block that attempts `unlink` of the `.tmp` file if the rename failed. Low priority since disk-full scenarios are rare, but worth adding as a defensive measure. |
| 5 | **Integration — Conflict auto-resolution for simple cases**: AC-6 intentionally defers conflict resolution to a future story. However, for the common case where the filesystem version is newer than the database version (common after manual edits), an opt-in `resolveWith: 'filesystem_wins'` parameter could be accepted by `detectArtifactConflicts` to immediately apply the resolution. | Medium | Medium | Defer to a future KBAR conflict resolution story. The `resolutionOptions` array returned by AC-6 already sets up the interface for this. |
| 6 | **Accessibility / Observability — Artifact sync dashboard**: Once KBAR tooling is operational (KBAR-0070 through KBAR-0150), a DB-driven view of sync status across all artifacts (which are stale, which have conflicts, last sync time) would give operators visibility into the state of the filesystem-DB sync. | High | High | Defer to Wave 6–7 KBAR stories. The `kbar.artifacts` and `kbar.syncEvents` tables provide the necessary data. |
| 7 | **Performance — Streaming for files over 5MB**: The story explicitly defers streaming with "5MB limit is acceptable." But the orchestrator produces `EVIDENCE.yaml` files that can grow large as a project matures. A streaming checksum and streaming DB write path would remove the 5MB ceiling. | Medium | High | Create a dedicated follow-up story (e.g., KBAR-0045 "Artifact Sync Streaming Support") when 5MB violations are observed in production. |
| 8 | **Reuse — Shared `validateInput` utility**: DEV-FEASIBILITY notes that `validateInput()` is duplicated across 4+ backend packages. KBAR-0040 continues this pattern by inheriting it from `kbar-sync/__types__/index.ts` rather than a shared `@repo/backend-utils` package. | Low | Medium | Address in a future cross-cutting refactor story. The debt reference `DEBT-RU-002` is already documented in `__types__/index.ts`. |

---

## Categories

- **Edge Cases**: Items #1 (glob/static merge), #5 (missing parent directory), #4 (partial write recovery)
- **UX Polish**: Item #1 enhancement (progress reporting in batch CLI)
- **Performance**: Items #2 (bulk insert), #7 (streaming), #8 (shared utility)
- **Observability**: Items #3 (batch metrics), #6 (sync status dashboard)
- **Integrations**: Item #5 enhancement (conflict auto-resolution), #6 (dashboard)
- **Schema / Type Evolution**: Items #2 gap (DEV-FEASIBILITY type), #3 gap (per-type TTL), #4 gap (BatchSyncByType conflicts output)
