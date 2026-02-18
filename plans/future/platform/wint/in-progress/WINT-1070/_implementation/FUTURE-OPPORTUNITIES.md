# Future Opportunities - WINT-1070

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Empty-phase behavior is underspecified** — EDGE-3 in TEST-PLAN.md notes that if a phase has no stories, the section "may be omitted entirely, or present with empty body — consistent behavior documented in GenerationReport; no crash." Both behaviors are acceptable but should be deterministic. Currently the story says "no crash" is sufficient for MVP. | Low | Low | Post-MVP: define a canonical rule (e.g., "omit empty phase sections") and add a unit test asserting the rule. |
| 2 | **`--verify` exit code semantics for empty/missing file** — What exit code should `--verify` return if `stories.index.md` does not exist on disk yet (first-run scenario)? The story treats `--verify` purely as a drift-detection tool against an existing file. The behavior when the file is absent is not addressed. | Low | Low | Post-MVP: document and test the "file not found" path for `--verify`. Return exit code 1 with a clear message: "stories.index.md not found — run --generate first." |
| 3 | **`generation-report.json` output location** — The report is written to `process.cwd()`, which may vary depending on where the script is invoked from. This is consistent with `populate-story-status.ts` behavior (`migration-log.json` similarly written to cwd), but it makes the report location non-deterministic in CI. | Low | Low | Post-MVP: add an optional `--report-path` flag to specify a fixed output location. |
| 4 | **No npm script registered** — The story specifies invocation via `npx tsx generate-stories-index.ts` but does not add an npm script to `package.json` of `packages/backend/orchestrator`. Discoverability depends on reading the JSDoc or README. | Low | Low | Post-MVP: add `"generate:stories-index": "tsx src/scripts/generate-stories-index.ts"` to the orchestrator package's `scripts` section. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Automation hook — auto-regenerate after `story_update_status` MCP tool** — The story explicitly defers this as a non-goal ("automation hook deferred"). WINT-1030-KB-012 flagged this as a future enhancement. Once the generation script is stable, a post-update hook in the MCP tool could trigger `--generate` automatically, eliminating manual regeneration. | High | Medium | Create a follow-up story (WINT-1080 or similar) to wire `story_update_status` → `generate-stories-index.ts --generate` as a post-write side effect. |
| 2 | **Multi-epic support** — The story is scoped to WINT only. The same pattern would apply to KBAR, LNGG, and other epics that maintain their own `stories.index.md` files. A parameterized `--epic` flag would unlock this with minimal additional code. | Medium | Low | Deferred to a follow-up story after WINT-1070 UAT proves the pattern. The script should be written with this extension in mind (no hardcoded "wint" schema in the core rendering functions). |
| 3 | **DB schema enrichment — store `risk_notes`, `phase`, `feature` freeform in `wint.stories`** — The hybrid DB-primary / YAML-fallback strategy works but means the generation script must read individual YAML files for 143+ stories per run, which adds latency. If these fields were in the DB, YAML fallback reads would be eliminated, improving performance and simplifying the script. | Medium | High | Create a follow-up story to add `phase`, `risk_notes`, `feature_description`, `infrastructure` columns to `wint.stories` and populate them via a migration. WINT-1070 intentionally defers this as a non-goal. |
| 4 | **CI gate integration** — AC-8's `--verify` mode is designed as a CI gate mechanism. TEST-PLAN.md notes: "The `--verify` mode is a critical gate mechanism: AC-8 is the foundation for any future CI integration." The script could be wired into the pre-commit hook or CI pipeline to fail if `stories.index.md` has manual edits that differ from what the DB would generate. | High | Low | Post-MVP: add a CI step that runs `generate-stories-index.ts --verify` and fails the build if exit code is 1. This enforces the "read-only generated artifact" contract without manual enforcement. |
| 5 | **Snapshot test for full generated output** — INT-1 uses a fixture DB and compares against an expected snapshot. Over time, as the index format evolves, maintaining a snapshot file becomes overhead. A semantic comparison (parse the markdown into structured data, compare counts and story sections) would be more resilient to whitespace/ordering changes. | Medium | Medium | Post-MVP: replace the raw-text snapshot with a structured comparison that parses the generated markdown and asserts field-by-field. |
| 6 | **Progress bar or streaming output for large index generation** — 143+ stories with YAML fallback reads could produce 10-30 seconds of silence in the terminal before completion. A progress indicator (e.g., `Processing story X of 143...`) would improve operator confidence during manual runs. | Low | Low | Post-MVP: add optional `--verbose` flag (consistent with `populate-story-status.ts`) that logs each story as it is processed. |

## Categories

- **Edge Cases**: Empty-phase behavior, `--verify` with missing file, report output location
- **UX Polish**: npm script discoverability, progress bar for large runs
- **Performance**: DB schema enrichment to eliminate YAML fallback reads
- **Observability**: Structured semantic comparison for INT-1 snapshot test
- **Integrations**: Automation hook post-MCP-update, CI gate via `--verify`, multi-epic support
