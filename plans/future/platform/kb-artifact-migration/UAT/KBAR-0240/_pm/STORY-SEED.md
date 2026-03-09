---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0240

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 6 work (KBAR-0230/KBAR-0240). It documents "Active Stories: None currently in-progress for the platform epic" — outdated given current KBAR UAT wave. The `generateStoriesIndex()` function (KBAR-0230) does not yet exist; this story's CLI wrapper cannot be implemented until that function is delivered. Baseline documents no deprecated patterns; all established conventions remain valid.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `sync:story` CLI script | `packages/backend/kbar-sync/scripts/sync-story.ts` | Canonical pattern for a `tsx` CLI in this package — argument parsing, Zod validation, `--dry-run`, `--help`, exit codes, `@repo/kbar-sync` delegation |
| `sync:epic` CLI script | `packages/backend/kbar-sync/scripts/sync-epic.ts` | Second CLI in same package — shows `--force`, `--verbose`, `--checkpoint` flags and fail-soft error loop |
| `@repo/kbar-sync` package | `packages/backend/kbar-sync/` | All sync functions live here; `regenerate:index` will also live here as a new script |
| `pnpm` script registration | `packages/backend/kbar-sync/package.json` | `sync:story` and `sync:epic` are registered as `tsx` scripts; `regenerate:index` must follow the same pattern |
| Husky pre-commit hook | `.husky/pre-commit` | Currently only checks workflow sync; the risk note says `regenerate:index` must run on pre-commit or workflow transitions — integration point |
| `SyncStoryCLIOptionsSchema` / `SyncEpicCLIOptionsSchema` | `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` | Zod schemas for CLI option validation; `RegenerateIndexCLIOptionsSchema` will be added here |
| KB MCP tools | `apps/api/knowledge-base/src/mcp-server/` | `kb_list_stories`, `kb_get_story`, `kb_update_story_status` — callable by agents at workflow transitions |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| KBAR-0230 (DB-Driven Index Generation) | pending | Direct hard dependency — `generateStoriesIndex()` is the function this CLI wraps. Must be implemented first. |
| KBAR-0220 (Agent Migration Testing) | created | No overlap; validates Phase 5. Only relevant context: the workflow transition trigger pattern that KBAR-0240 may hook into. |
| KBAR-0190 (Update QA & Fix Agents) | needs-code-review | No overlap. |

### Constraints to Respect

- No barrel files — import directly from source
- Zod-first types — no TypeScript interfaces
- `@repo/logger` for all logging — no `console.log`
- Functional style — no classes
- `tsx` scripts in `packages/backend/kbar-sync/scripts/` follow established file structure
- macOS bash 3.2 compatibility required for any `.sh` wrappers (no `declare -A`, no `readarray`)
- Protected: production DB schemas in `packages/backend/database-schema/`, `@repo/db` API surface, orchestrator artifact schemas

---

## Retrieved Context

### Related Endpoints

None — this is a CLI-only story. No HTTP endpoints involved.

### Related Components

None — no UI surface. CLI only.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `parseArgs` pattern | `packages/backend/kbar-sync/scripts/sync-epic.ts` | Direct model for arg parsing loop; copy structure for `--epic`, `--output`, `--dry-run`, `--verbose`, `--force`, `--help` |
| `SyncEpicCLIOptionsSchema` | `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` | Add `RegenerateIndexCLIOptionsSchema` alongside existing schemas |
| `rethrowExitError` helper | `packages/backend/kbar-sync/scripts/sync-epic.ts` | Copy verbatim — required for process.exit mock in tests |
| `HELP_TEXT` pattern | Both existing CLI scripts | Inline constant at top of file, printed on `--help` or missing required flags |
| `tsx scripts/` registration | `packages/backend/kbar-sync/package.json` | Add `"regenerate:index": "tsx scripts/regenerate-index.ts"` alongside existing scripts |
| CLI integration test suite | `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | Mirror test structure for `regenerate-index.ts` |
| `generateStoriesIndex()` (KBAR-0230) | `packages/backend/kbar-sync/src/` (to be implemented) | The sole function this CLI delegates to |

### Similar Stories

| Story | Similarity | Lesson |
|-------|-----------|--------|
| KBAR-0050 (CLI Sync Commands) | High — same package, same CLI pattern, same delegation model | Implementation must wait for the dependency to be merged; PM/elab can proceed in parallel |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| `tsx` CLI in kbar-sync package | `packages/backend/kbar-sync/scripts/sync-epic.ts` | Definitive model: `HELP_TEXT`, `parseArgs`, `SyncEpicCLIOptionsSchema.safeParse`, `rethrowExitError`, exit codes 0/1/2, `@repo/kbar-sync` delegation via dynamic import |
| CLI Zod option schemas | `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` | Where `RegenerateIndexCLIOptionsSchema` must be co-located |
| CLI integration tests | `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | Test structure for CLI scripts in this package |
| Pre-commit hook | `.husky/pre-commit` | Integration point if index regeneration is wired to pre-commit; shows conditional execution pattern based on `git diff --cached --name-only` |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (KB tool not available in this context). The following are inferred from codebase inspection:

- **[KBAR-0050]** CLI implementation must wait for dependency merge before writing code — PM and elaboration artifacts can be generated while dependency is in-flight. Applies because KBAR-0240 depends on KBAR-0230 in the same way KBAR-0050 depended on KBAR-0040.
- **[KBAR-0050]** Zod validation on CLI options must happen before any DB or function imports to allow `--help` to work without env vars. Applies because `regenerate:index` will also need to handle `--help` before any DB connection attempt.
- **[KBAR-0050]** `rethrowExitError` is required for test determinism when `process.exit` is mocked. Applies directly to `regenerate-index.ts`.

### Blockers to Avoid (from past stories)

- Starting implementation before KBAR-0230 (`generateStoriesIndex()`) is merged — the CLI is a pure wrapper; there is nothing to wrap until the function exists
- Forgetting to register the script in `package.json` under `scripts` — both `sync:story` and `sync:epic` required this step; `regenerate:index` must too
- Skipping the `--help` / `--dry-run` separation — `--dry-run` must call `generateStoriesIndex` in read-only mode without writing the output file; help must print without any imports

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT must connect to real DB (port 5432) and real filesystem; no mocks for index generation |
| ADR-006 | E2E Tests Required in Dev Phase | No UI surface — ADR-006 E2E requirement is exempt (`frontend_impacted: false`) |

### Patterns to Follow

- `--dry-run` flag: call `generateStoriesIndex` but print the would-be output instead of writing it to disk
- `--output <path>` flag: allow callers to override the default output path (default: the same path as the existing `stories.index.md` for the given epic)
- Fail-soft on individual epic failures; report summary at end
- Exit code 0 = success, 1 = index generation failed or output mismatch in dry-run, 2 = DB connection failure
- `--verbose` flag for progress logging
- `--force` flag to skip staleness check and always regenerate

### Patterns to Avoid

- Do not read `stories.index.md` manually in the CLI — delegate entirely to `generateStoriesIndex()`
- Do not use `console.log` — use `process.stdout.write` for output (consistent with existing CLI scripts) and `@repo/logger` for internal logging
- Do not make the CLI aware of story format details — it is a thin wrapper only
- Do not hardcode the output path — make it configurable via `--output` with a sensible default

---

## Conflict Analysis

### Conflict: Unimplemented Dependency (KBAR-0230)

- **Severity**: warning (not blocking for story generation; blocking for implementation)
- **Description**: `generateStoriesIndex()` (KBAR-0230) is the sole function KBAR-0240 wraps. KBAR-0230 is `pending` with no implementation started. The CLI cannot be written until the function signature and return type are defined.
- **Resolution Hint**: Complete PM and elaboration for KBAR-0240 now. Add an implementation gate: "KBAR-0230 must be merged to main before implementation starts." Mirror the KBAR-0050 gate pattern (`implementation_gate` frontmatter field in the story YAML).

---

## Story Seed

### Title

Regenerate Index CLI — `regenerate:index` Command for DB-Driven Stories Index

### Description

**Context**: KBAR-0230 (DB-Driven Index Generation) will implement `generateStoriesIndex()`, a TypeScript function that queries the database and generates a `stories.index.md` file replacing the manually maintained index. Once this function exists, there is no command-line way to invoke it.

**Problem**: Without a CLI entry point, `generateStoriesIndex()` can only be called from TypeScript code. Developers cannot trigger index regeneration from the terminal, CI pipelines cannot run it as a pre-push step, and workflow transition commands cannot invoke it to keep the index in sync after story state changes.

**Proposed Solution**: Add a `regenerate-index.ts` script to `packages/backend/kbar-sync/scripts/` following the established `sync-epic.ts` / `sync-story.ts` pattern. Register it as `regenerate:index` in `package.json`. The CLI delegates entirely to `generateStoriesIndex()` and handles argument parsing, Zod validation, progress output, error reporting, and exit codes. It supports `--epic`, `--output`, `--dry-run`, `--verbose`, `--force`, and `--help` flags. The risk note — "must run on pre-commit hook or workflow transitions" — is addressed by documenting the integration steps, with optional pre-commit hook wiring as a stretch goal.

### Initial Acceptance Criteria

- [ ] AC-1: A `regenerate-index.ts` script exists in `packages/backend/kbar-sync/scripts/` and is executable via `pnpm --filter @repo/kbar-sync regenerate:index -- --help` without error and without requiring DB environment variables.
- [ ] AC-2: Running `regenerate:index --epic KBAR --output <path>` calls `generateStoriesIndex()` with the correct epic filter and writes the result to `<path>`. Exit code 0 on success.
- [ ] AC-3: Running `regenerate:index --dry-run --epic KBAR` prints the would-be generated index content to stdout without writing any file. Exit code 0 if content matches current file on disk, exit code 1 if content would differ.
- [ ] AC-4: CLI options are validated via a `RegenerateIndexCLIOptionsSchema` (Zod) defined in `packages/backend/kbar-sync/scripts/__types__/cli-options.ts`. Invalid options produce a descriptive error and exit code 1 without connecting to the DB.
- [ ] AC-5: DB connection failures produce exit code 2 with a `[regenerate:index] ERROR: DB connection failed` message on stderr.
- [ ] AC-6: A unit test file for `regenerate-index.ts` exists in `packages/backend/kbar-sync/scripts/__tests__/` (or adjacent) covering: `--help` output, argument parsing, Zod validation errors, dry-run path, and successful write path with `generateStoriesIndex` mocked.
- [ ] AC-7: The `regenerate:index` script is registered in `packages/backend/kbar-sync/package.json` under `scripts` as `"regenerate:index": "tsx scripts/regenerate-index.ts"`.
- [ ] AC-8: Documentation in the script's `HELP_TEXT` constant describes all flags, exit codes, and at least two usage examples.

### Non-Goals

- Implementing `generateStoriesIndex()` — that is KBAR-0230
- Wiring `regenerate:index` into the Husky pre-commit hook — this is a stretch goal; the story only documents the integration path
- Automatically detecting which epics need regeneration — the CLI requires an explicit `--epic` or `--base-dir` argument
- Supporting parallel regeneration of multiple epics in one invocation — single epic per invocation
- Modifying any existing story data or DB records — this is read-only from the DB perspective
- Frontend or API changes — CLI only
- Replacing the existing `generate-stories.sh` script — that script is for story generation, not index regeneration

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `sync-epic.ts` structure — `HELP_TEXT`, `parseArgs`, `SyncEpicCLIOptionsSchema.safeParse`, `rethrowExitError`, dynamic import of `@repo/kbar-sync`, structured exit codes
- **Packages**: `@repo/kbar-sync` (for `generateStoriesIndex` once KBAR-0230 ships), `tsx` (already a devDependency), `zod` (already a dependency)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- No UI surface; ADR-006 E2E exemption applies (`frontend_impacted: false`). ADR-005 applies to UAT: must connect to real DB (port 5432) and real filesystem.
- The primary test surface is the CLI argument parsing layer and the delegation contract to `generateStoriesIndex()`. Unit tests should mock `generateStoriesIndex` — they do not test DB queries directly.
- A single integration test (with real DB, real filesystem, testcontainer or local Docker Compose) verifying the full `--epic KBAR --output <path>` flow is sufficient for UAT.
- Test `--dry-run` produces output to stdout and does not write files. Test that exit code 1 is returned when dry-run content differs from existing index.
- Test exit code 2 on DB connection failure (ECONNREFUSED).
- Mirror the integration test structure from `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts`.

### For UI/UX Advisor

No UI surface. Not applicable.

### For Dev Feasibility

- **Implementation gate**: KBAR-0230 must be merged before implementation begins. The function signature of `generateStoriesIndex()` must be stable before the CLI wrapper can be written. Elab and PM artifacts for KBAR-0240 can be produced now.
- **Estimated complexity**: Low. This is a thin CLI wrapper following a well-established pattern in `sync-epic.ts`. No novel logic required.
- **Estimated tokens**: 30,000–50,000 (small scope — one new script, one new schema, one test file).
- **Canonical references for subtask decomposition**:
  - ST-1: Add `RegenerateIndexCLIOptionsSchema` to `packages/backend/kbar-sync/scripts/__types__/cli-options.ts`
  - ST-2: Implement `regenerate-index.ts` following `sync-epic.ts` structure
  - ST-3: Register `regenerate:index` in `package.json`
  - ST-4: Write unit tests for the CLI script
  - ST-5: (Stretch) Document pre-commit hook integration steps in script `HELP_TEXT` or a README note
- **Pre-commit hook consideration**: The risk note says the CLI "must run on pre-commit hook or workflow transitions." The simplest approach is to add a conditional block to `.husky/pre-commit` (similar to the existing workflow sync check) that runs `regenerate:index --dry-run` when `plans/future/platform/*/stories.index.md` files are staged. However, this adds latency to every commit touching plan files. The dev feasibility writer should assess whether pre-commit wiring belongs in KBAR-0240 or a follow-on story.
