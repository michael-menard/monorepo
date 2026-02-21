---
generated: "2026-02-17"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates KBAR-0030 and KBAR-0040 completion. The baseline documents no active platform stories, but the git status and filesystem show both KBAR-0030 (UAT) and KBAR-0040 (UAT) are implemented. Key patterns established in those stories — path security validation, Zod-first types, sync event tracking, batch results with per-item fault isolation — are established as mandatory patterns for KBAR-0050. KBAR-0040 is in UAT and not yet merged to main; KBAR-0050 must not start implementation until KBAR-0040 is merged.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `packages/backend/kbar-sync/` package | `packages/backend/kbar-sync/src/` | Active (KBAR-0030 + KBAR-0040) | All sync functions KBAR-0050 will wrap as CLI commands live here |
| `syncStoryToDatabase` | `packages/backend/kbar-sync/src/sync-story-to-database.ts` | Active (KBAR-0030) | CLI `sync:story` wraps this function |
| `syncStoryFromDatabase` | `packages/backend/kbar-sync/src/sync-story-from-database.ts` | Active (KBAR-0030) | CLI `sync:story --from-db` wraps this function |
| `batchSyncArtifactsForStory` | `packages/backend/kbar-sync/src/batch-sync-artifacts.ts` | Active (KBAR-0040) | CLI `sync:story --artifacts` wraps this function |
| `batchSyncByType` | `packages/backend/kbar-sync/src/batch-sync-by-type.ts` | Active (KBAR-0040) | CLI `sync:epic --type` wraps this function |
| `syncArtifactToDatabase` | `packages/backend/kbar-sync/src/sync-artifact-to-database.ts` | Active (KBAR-0040) | CLI single-artifact sync wraps this |
| `detectArtifactConflicts` | `packages/backend/kbar-sync/src/detect-artifact-conflicts.ts` | Active (KBAR-0040) | CLI conflict detection wraps this |
| `ARTIFACT_FILENAME_MAP` | `packages/backend/kbar-sync/src/__types__/index.ts` | Active (KBAR-0040) | Artifact type discovery mapping used by batch functions |
| KB CLI pattern | `apps/api/knowledge-base/src/cli/index.ts` | Active (KBMEM-017) | Existing CLI architecture with Zod schemas and `--dry-run` support |
| Orchestrator scripts | `packages/backend/orchestrator/src/scripts/` | Active | `populate-story-status.ts` and others as CLI script pattern reference |
| Database schema | `packages/backend/database-schema/src/schema/kbar.ts` | Active (KBAR-0010) | `syncEvents`, `syncCheckpoints` tables track progress |
| `@repo/kbar-sync` exports | `packages/backend/kbar-sync/src/index.ts` | Active | All Zod schemas and functions exported; CLI imports from this package |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0040 | Artifact Sync Functions | uat | Direct predecessor — KBAR-0050 wraps its functions. Must wait for KBAR-0040 to merge to main before starting implementation |
| KBAR-0060 | Sync Integration Tests | backlog (blocked by KBAR-0050) | Direct downstream — KBAR-0060 tests the integration of the CLI with real stories |
| WINT-1010 | Create Compatibility Shim Module | backlog | No conflict — different schema namespace, unrelated scope |

### Constraints to Respect

1. **Do not modify `@repo/kbar-sync` sync functions** — KBAR-0050 is a CLI wrapper layer only; all business logic stays in `packages/backend/kbar-sync/src/`. The CLI scripts delegate immediately to the package functions and do not duplicate logic.
2. **No new sync logic in CLI scripts** — dry-run mode reads from DB/filesystem only; no write logic in the CLI layer.
3. **KBAR schema structure is protected** — no DDL changes; `kbar.syncEvents`, `kbar.syncCheckpoints` are read-only from the CLI's perspective (written by `@repo/kbar-sync` functions).
4. **Zod-first types required** — all CLI option schemas use Zod schemas with `z.infer<>`, no TypeScript interfaces.
5. **`@repo/logger` for all logging** — no `console.log` in production code paths; progress reporting uses structured logger output.
6. **Incremental sync is the default** — skip already-synced artifacts (checksum-based idempotency from KBAR-0030/0040 is the default behavior); full resync requires explicit `--force` flag.

---

## Retrieved Context

### Related Endpoints

None — this is a CLI tool with no HTTP endpoints. The CLI scripts are invoked directly via `pnpm exec tsx` or via `pnpm run sync:story`. No REST layer is involved.

### Related Components

None — backend-only CLI tool with no UI components.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `syncStoryToDatabase` | `@repo/kbar-sync` | Direct import; CLI passes parsed flags as `SyncStoryToDatabaseInput` |
| `syncStoryFromDatabase` | `@repo/kbar-sync` | Direct import; used for `--from-db` mode |
| `batchSyncArtifactsForStory` | `@repo/kbar-sync` | Direct import; used for per-story artifact sync with `--artifacts` flag |
| `batchSyncByType` | `@repo/kbar-sync` | Direct import; used for `sync:epic --type <artifactType>` cross-story batch |
| `detectArtifactConflicts` | `@repo/kbar-sync` | Direct import; used for `sync:story --check-conflicts` flag |
| `detectSyncConflicts` | `@repo/kbar-sync` | Direct import; used for story-level conflict checking |
| All Zod input/output schemas | `@repo/kbar-sync` | Import and validate CLI flag parsing results against these schemas |
| `@repo/logger` | `packages/core/logger/` | Structured logging for progress, errors, and dry-run output |
| `@repo/db` | `packages/backend/db/` | Database connection for dry-run queries (read-only) and operation confirmation |
| KB CLI architecture | `apps/api/knowledge-base/src/cli/index.ts` | `--dry-run` flag pattern, Zod option schemas, parseOptions pattern |
| `populate-story-status.ts` | `packages/backend/orchestrator/src/scripts/` | Script entry point pattern: `#!/usr/bin/env npx tsx`, `--dry-run`/`--execute`/`--verbose`, stats aggregation |
| `tsx` | Already in kbar-sync devDependencies | TypeScript script execution without compile step |
| `yaml` | Already in kbar-sync dependencies | Parsing story directory paths from YAML if needed |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| CLI script with dry-run and progress reporting | `packages/backend/orchestrator/src/scripts/populate-story-status.ts` | Complete pattern: shebang, `--dry-run`/`--execute`/`--verbose` flags, stats aggregation, `fail-soft` error handling, migration log output, structured console output for CLI (separate from @repo/logger for human-readable progress) |
| Zod CLI option schemas + parseOptions | `apps/api/knowledge-base/src/cli/index.ts` | Zod schemas for each command's options, `parseCliArgs`, `parseOptions`, aliased commands, typed `CliResult` |
| kbar-sync function call pattern | `packages/backend/kbar-sync/src/batch-sync-artifacts.ts` | How sync functions are structured with typed result objects, per-artifact fault isolation, and batch result aggregation — demonstrates the shape of what the CLI wraps |
| @repo/kbar-sync exports (types and schemas) | `packages/backend/kbar-sync/src/index.ts` | All available exports the CLI can import — functions, Zod schemas, type aliases |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0030]** Security vulnerabilities (path traversal CWE-22, symlink following CWE-59) found as HIGH findings in code review.
  - *Applies because*: The CLI accepts file paths as command-line arguments. Even though the CLI delegates to `@repo/kbar-sync` which applies `validateFilePath` and `validateNotSymlink`, the CLI layer must still reject obviously unsafe paths before passing them downstream. A user providing `../../etc/passwd` as a `--file` argument should get a clear error at the CLI layer.

- **[KBAR-0040]** N+1 queries in batch operations were HIGH performance findings.
  - *Applies because*: The CLI's progress reporting loop must not independently query the database per-story. Dry-run mode should use a single batch query to show what *would* be synced. Do not add separate per-story DB round trips in the CLI layer.

- **[KBAR-0030]** Code duplication — utility functions re-implemented across sync functions before `__types__/index.ts` consolidation.
  - *Applies because*: The CLI layer must not duplicate any sync logic. All business logic (checksums, validation, DB writes) stays in `@repo/kbar-sync`. The CLI is a thin adapter: parse args → validate input → delegate → format and print result.

- **[KBAR-0040]** `as any` casts caused HIGH type-safety findings in code review.
  - *Applies because*: CLI option parsing involves `Record<string, unknown>` which requires careful type narrowing. Use Zod `safeParse` to validate parsed flags; do not cast to `any`. The KBAR-0040 lesson is to use Zod schemas for all data that flows between the CLI and sync functions.

### Blockers to Avoid (from past stories)

- **Implementing sync logic in the CLI** — the CLI layer is a thin wrapper; zero sync logic should exist in script files
- **Missing `--dry-run` implementation** — dry-run is explicitly required by the index entry and is essential for safe operation
- **Missing incremental sync** — the default must be incremental (checksum-based skip); full resync must require explicit `--force` flag
- **Unclear progress output** — batch operations on hundreds of artifacts need per-story progress output with a final summary; silent scripts are unusable
- **Missing error reporting** — failed syncs must be reported by story/artifact with error detail, not just a total count
- **Skipping input validation** — CLI args are user input and must be validated with Zod before passing to sync functions

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services (real PostgreSQL, real filesystem), not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` so Playwright E2E not required; integration tests with testcontainers or real DB serve this role |

ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) are not applicable — no HTTP endpoints, no infrastructure, no image storage, no authentication layer.

### Patterns to Follow

- **Thin CLI layer**: CLI scripts contain zero business logic — parse → validate → delegate → print
- **Zod-first option schemas**: Each CLI command has a Zod schema for its options; use `z.infer<>` for types
- **Dry-run first**: `--dry-run` shows what *would* be synced without writing anything; recommend dry-run before execute
- **Fail-soft progress reporting**: One sync failure must not abort the batch; collect and report all failures at end
- **Structured output**: Human-readable progress to stdout with optional `--verbose` for per-artifact detail; errors to stderr
- **Incremental by default**: Default to checksum-based skip (already provided by `@repo/kbar-sync`); explicit `--force` to override
- **Exit codes**: Exit 0 on success or partial success with warnings; exit 1 on complete failure or invalid input
- **`#!/usr/bin/env npx tsx` shebang**: Scripts are executable TypeScript via tsx, no compilation required
- **Discriminated union results**: All operation results follow `{ success: true, ... } | { success: false, error: ... }` from `@repo/kbar-sync`

### Patterns to Avoid

- **CLI scripts containing Drizzle queries or filesystem operations** — delegate entirely to `@repo/kbar-sync`
- **TypeScript interfaces for CLI option types** — use Zod schemas
- **`console.log` in production code paths** — use `@repo/logger` for structured logging; use formatted stdout only for user-facing CLI output (progress bars, summaries)
- **Silently swallowing sync errors** — every failure must be surfaced to the user with story/artifact context
- **`as any` casts on parsed CLI args** — Zod safeParse provides typed results

---

## Conflict Analysis

### Conflict: KBAR-0040 Still in UAT

- **Severity**: warning (non-blocking)
- **Description**: KBAR-0040 is in `uat` status and its output directory shows as `UAT/KBAR-0040/`. The `packages/backend/kbar-sync/` package is fully implemented with all artifact sync functions exported. KBAR-0050 depends on KBAR-0040 being merged to main before implementation can begin — if UAT surfaces changes to the function signatures or schema exports in `@repo/kbar-sync`, KBAR-0050's CLI wrappers may need adjustment.
- **Resolution Hint**: KBAR-0050 PM and elaboration artifacts can be prepared now. Implementation must not begin until KBAR-0040 is merged to main and the `@repo/kbar-sync` package exports are stable. Confirm KBAR-0040 merge status before handing off to dev.

---

## Story Seed

### Title

CLI Sync Commands

### Description

**Context:**

The `packages/backend/kbar-sync/` package now contains a complete set of sync functions implemented in KBAR-0030 (story sync) and KBAR-0040 (artifact sync). These functions implement bidirectional filesystem-database synchronization with checksum-based idempotency, per-item fault isolation, sync event tracking, and batch operations with checkpoint resumption.

However, these functions have no command-line interface. Running a sync operation currently requires writing custom TypeScript that imports from `@repo/kbar-sync`, connects to the database, and calls the sync functions directly. There is no way for a developer or automation script to:
- Sync a single story from the terminal
- Run a full epic sync before a deployment
- Perform a dry-run to preview what would be synced
- Run an incremental sync as part of a CI pipeline

**Problem:**

Without CLI access to the sync functions, developers must write ad-hoc scripts or use the TypeScript API directly. This creates friction for:
- Bootstrapping the database from the existing filesystem for the first time
- Running manual resync after story moves or renames
- Verifying sync state in development environments
- Integrating sync into automated workflows (pre-commit, CI, scheduled jobs)

**Solution Direction:**

Create two CLI commands as executable TypeScript scripts in `packages/backend/kbar-sync/scripts/`:

1. `sync:story` — Syncs a single story (story metadata + optionally artifacts) to the database. Accepts `--story-id`, `--story-dir`, `--dry-run`, `--artifacts`, `--force`, `--from-db` flags.

2. `sync:epic` — Syncs all stories in an epic (or all epics in a base directory). Accepts `--base-dir`, `--epic`, `--artifact-type`, `--dry-run`, `--force`, `--checkpoint` flags for incremental batch operations.

Both commands delegate entirely to `@repo/kbar-sync` functions. The CLI layer is responsible for: argument parsing, Zod input validation, human-readable progress output, error reporting, and exit code management.

The commands are registered as `pnpm` scripts in `packages/backend/kbar-sync/package.json` so they can be invoked as `pnpm --filter @repo/kbar-sync run sync:story -- --story-id KBAR-0050 --dry-run`.

### Initial Acceptance Criteria

- [ ] **AC-1**: `sync:story` CLI command — sync a single story to the database
  - Accept `--story-id <id>` (required), `--story-dir <path>` (required), `--dry-run` (flag), `--verbose` (flag), `--force` (flag, bypass checksum skip)
  - Parse and validate all args with Zod `SyncStoryToDatabaseInputSchema` before calling `syncStoryToDatabase`
  - Print sync result: story ID, checksum, status (synced/skipped/failed), sync event ID
  - On `--dry-run`: query current DB state, print what *would* change without writing
  - Exit 0 on success or skip; exit 1 on failure

- [ ] **AC-2**: `sync:story --artifacts` — sync a story's artifacts after syncing the story
  - When `--artifacts` flag is set, call `batchSyncArtifactsForStory` after `syncStoryToDatabase` succeeds
  - Print per-artifact results in `--verbose` mode; print summary counts always
  - Single artifacts can also be targeted with `--artifact-file <relative-path>` and `--artifact-type <type>` flags (calls `syncArtifactToDatabase` directly)
  - Fail-soft: story sync failure prints error but does not prevent artifact sync attempt (when `--force` is set)

- [ ] **AC-3**: `sync:story --check-conflicts` — detect conflicts before syncing
  - When `--check-conflicts` flag is set, call `detectSyncConflicts` (story-level) and/or `detectArtifactConflicts` (per artifact, when combined with `--artifacts`)
  - If conflict detected: print conflict details (type, filesystem checksum, database checksum, resolution options); exit 1 to block sync
  - If no conflict: proceed with sync (or print "no conflicts" in `--dry-run` mode)

- [ ] **AC-4**: `sync:epic` CLI command — batch sync all stories in a directory
  - Accept `--base-dir <path>` (required), `--epic <prefix>` (optional filter, e.g. "KBAR"), `--dry-run` (flag), `--verbose` (flag), `--force` (flag), `--checkpoint <name>` (optional, enables resumption)
  - Discover all story directories under `--base-dir` (optionally filtered by `--epic`)
  - Call `syncStoryToDatabase` for each story found; aggregate results
  - Print progress per story (story ID + status); print final summary (total, synced, skipped, failed)
  - On `--dry-run`: print list of stories that would be synced and current DB sync state without writing

- [ ] **AC-5**: `sync:epic --artifact-type <type>` — cross-story artifact batch sync
  - When `--artifact-type <type>` is set, call `batchSyncByType` instead of (or in addition to) story sync
  - Accept `--checkpoint <name>` to enable resumable batch (passed to `batchSyncByType`)
  - Print progress: artifact count processed, artifacts synced/skipped/failed; checkpoint name on completion
  - If checkpoint exists in DB and `--checkpoint <name>` is provided, resume from last processed path

- [ ] **AC-6**: Dry-run mode accuracy
  - `--dry-run` must accurately predict what *would* be written without making any DB mutations
  - For stories: compare filesystem checksum against `kbar.stories` DB checksum; report "would sync" or "would skip"
  - For artifacts: compare filesystem checksum against `kbar.artifacts` DB checksum; report "would sync" or "would skip"
  - Dry-run output includes count of would-sync, would-skip, and estimated time based on average sync rate
  - Zero DB mutations during dry-run (verified in tests)

- [ ] **AC-7**: Script registration in package.json
  - Add `"sync:story": "tsx scripts/sync-story.ts"` to `packages/backend/kbar-sync/package.json` scripts
  - Add `"sync:epic": "tsx scripts/sync-epic.ts"` to `packages/backend/kbar-sync/package.json` scripts
  - Scripts are invokable via `pnpm --filter @repo/kbar-sync run sync:story -- [flags]`
  - Scripts use `#!/usr/bin/env npx tsx` shebang for direct invocation

- [ ] **AC-8**: Zod validation for all CLI inputs
  - Define `SyncStoryCLIOptionsSchema` in `scripts/sync-story.ts` or shared CLI types file
  - Define `SyncEpicCLIOptionsSchema` in `scripts/sync-epic.ts` or shared CLI types file
  - All flag parsing output is validated with `safeParse` before being passed to sync functions
  - Invalid input exits with code 1 and a human-readable error message listing which flags are invalid

- [ ] **AC-9**: Error reporting and exit codes
  - All sync errors include: story/artifact ID, file path, error message, sync event ID (if available)
  - Errors written to stderr; progress and summary written to stdout
  - Exit 0: all operations succeeded or skipped (no errors)
  - Exit 1: one or more operations failed, or invalid input
  - Exit 2: dependency error (DB connection failure, `@repo/kbar-sync` import failure)

- [ ] **AC-10**: Unit tests for CLI scripts
  - Test `sync:story` flag parsing: all valid combinations, missing required flags, invalid flag values
  - Test `sync:story --dry-run` produces no mutations (assert sync functions called with dry-run behavior, or that read-only queries replace write calls in dry-run mode)
  - Test `sync:epic` discovery logic: finds correct story directories, respects `--epic` filter
  - Test error reporting: failed sync result produces correct stderr output and exit code 1
  - Test conflict detection path: `--check-conflicts` with conflict detected exits 1 without syncing
  - Minimum >80% coverage on CLI script files

### Non-Goals

- **Implementing sync logic in CLI scripts** — all sync logic stays in `packages/backend/kbar-sync/src/`; scripts are thin wrappers
- **Automated file watching or event-driven sync** — KBAR-0060+ handles automation and triggers
- **Web UI or REST API for sync operations** — out of scope; CLI only
- **Conflict resolution** — detect conflicts and report them; resolution (filesystem_wins / database_wins) is out of scope for KBAR-0050
- **Schema changes** — no DDL changes; `kbar.*` tables are protected (KBAR-0010 output)
- **KBAR-0030/0040 function modifications** — CLI is additive; do not modify existing sync functions
- **Automated pre-commit or CI integration** — KBAR-0050 delivers the commands; integration into CI pipelines is a separate concern
- **Interactive prompts** — CLI is non-interactive (suitable for CI); no inquirer or readline prompts
- **Progress bars or terminal animations** — plain text output only; structured for both human and script consumption

### Reuse Plan

- **Functions**: Import all sync functions from `@repo/kbar-sync` — `syncStoryToDatabase`, `syncStoryFromDatabase`, `batchSyncArtifactsForStory`, `batchSyncByType`, `syncArtifactToDatabase`, `detectSyncConflicts`, `detectArtifactConflicts`
- **Schemas**: Import all Zod input/output schemas from `@repo/kbar-sync` for result type checking
- **Patterns**: Copy and adapt the CLI architecture from `apps/api/knowledge-base/src/cli/index.ts` (Zod option schemas, parseOptions) and the script pattern from `packages/backend/orchestrator/src/scripts/populate-story-status.ts` (shebang, dry-run, stats aggregation, fail-soft)
- **Packages**: `@repo/logger`, `@repo/db`, `zod`, `tsx` (already in kbar-sync devDependencies)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Dry-run mode correctness is a critical AC — test that zero DB mutations occur during `--dry-run` by asserting no insert/update calls are made to `kbar.*` tables (spy on Drizzle or use a read-only DB connection)
- Test the `--checkpoint` resumption path for `sync:epic`: start a batch, simulate interruption, restart with same `--checkpoint <name>`, verify already-synced stories are skipped
- Per ADR-005: UAT must use real PostgreSQL, not mocks — integration tests should use testcontainers or a dev DB
- Per ADR-006: `frontend_impacted: false` (no UI), so Playwright E2E not required; testcontainers integration tests serve as the E2E requirement
- Test exit codes explicitly: assert `process.exitCode` or process exit in tests for all three exit states (0, 1, 2)
- Cover the `--epic` filter: verify that `--epic KBAR` only processes `KBAR-*` story directories, not `WINT-*` or others

### For UI/UX Advisor

Not applicable — this is a CLI-only tool with no user interface. Output format (stdout/stderr, summary lines) is developer-facing, not end-user-facing.

### For Dev Feasibility

- All business logic already exists in `@repo/kbar-sync` — this story is purely a CLI wrapper layer. Risk is low.
- The most complex part is dry-run mode: it must accurately predict sync state changes without writing. The strategy should be:
  - Query `kbar.stories` / `kbar.artifacts` checksums from the DB (read-only)
  - Compute filesystem checksums for the target stories/artifacts
  - Compare and report differences — no sync function calls needed in dry-run mode
  - Alternatively, pass a `dryRun: true` flag through to sync functions if they support it (check KBAR-0040 outputs)
- The `--checkpoint` flag for `sync:epic` passes `checkpointName` directly to `batchSyncByType` which handles resumption internally — the CLI only needs to pass the value through
- Script location: `packages/backend/kbar-sync/scripts/sync-story.ts` and `scripts/sync-epic.ts` — consistent with the `scripts/` convention used in `packages/backend/orchestrator/src/scripts/`
- Estimated complexity: S-M (smaller than KBAR-0030/0040; no new DB schemas, no new sync logic, purely CLI wiring)
- Key risk: correctly implementing dry-run mode without accidentally triggering any DB writes — this must be verified with tests
- `tsx` is already in `packages/backend/kbar-sync/devDependencies` — no new dependencies required

**Proposed file structure:**

```
packages/backend/kbar-sync/
├── scripts/
│   ├── sync-story.ts          # NEW: sync:story CLI command
│   ├── sync-epic.ts           # NEW: sync:epic CLI command
│   └── __types__/
│       └── cli-options.ts     # NEW: Zod schemas for CLI option parsing (shared)
├── src/
│   └── (existing files — no changes)
└── package.json               # MODIFIED: add sync:story and sync:epic scripts
```
