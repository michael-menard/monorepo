# Dev Feasibility Review: KBAR-0050 — CLI Sync Commands

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: All business logic is already implemented in `@repo/kbar-sync` (KBAR-0030 + KBAR-0040). KBAR-0050 is purely a CLI wrapper layer — it adds no new database schemas, no new sync logic, and no new dependencies. The pattern for CLI scripts with dry-run, stats aggregation, and fail-soft error handling already exists at `packages/backend/orchestrator/src/scripts/populate-story-status.ts`. The KB CLI architecture for Zod option schemas and parseOptions exists at `apps/api/knowledge-base/src/cli/index.ts`. Risk is low once KBAR-0040 is merged to main.

---

## Likely Change Surface (Core Only)

**New files**:
- `packages/backend/kbar-sync/scripts/sync-story.ts` — `sync:story` CLI command script
- `packages/backend/kbar-sync/scripts/sync-epic.ts` — `sync:epic` CLI command script
- `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` — Shared Zod schemas for CLI option parsing

**Modified files**:
- `packages/backend/kbar-sync/package.json` — Add `sync:story` and `sync:epic` script entries

**No changes to**:
- `packages/backend/kbar-sync/src/` — All sync functions untouched (constraint from seed)
- `packages/backend/database-schema/` — No DDL changes
- Any other package

**Critical deploy touchpoints**:
- None — CLI scripts are development/automation tools; no Lambda deployment, no APIGW changes, no CDN changes

---

## MVP-Critical Risks (Max 5)

### Risk 1: Dry-run mode accidentally triggers DB writes

- **Why it blocks MVP**: AC-6 requires zero DB mutations during `--dry-run`. If the CLI calls sync functions in dry-run mode (rather than implementing its own checksum-compare path), any sync function that writes to DB will violate the AC and potentially corrupt production data. This is a data integrity risk.
- **Required mitigation**: Implement dry-run mode by (1) checking whether `@repo/kbar-sync` functions accept a `dryRun: true` parameter (preferred, delegates properly), OR (2) implementing a separate checksum-comparison path in the CLI that queries DB checksums read-only and computes filesystem checksums without calling sync functions. Tests must assert zero `kbar.*` table mutations in dry-run mode.

### Risk 2: KBAR-0040 not merged to main before implementation starts

- **Why it blocks MVP**: KBAR-0050 imports `batchSyncArtifactsForStory`, `batchSyncByType`, `detectArtifactConflicts`, and `detectSyncConflicts` from `@repo/kbar-sync`. If KBAR-0040 UAT surfaces breaking changes to function signatures or schema exports, KBAR-0050's CLI wrappers will need adjustment. Starting implementation before KBAR-0040 merges creates rework risk.
- **Required mitigation**: Gate KBAR-0050 implementation start on KBAR-0040 being merged to `main`. Confirm stable `@repo/kbar-sync` package.json version before writing any imports.

### Risk 3: N+1 database queries in dry-run batch mode

- **Why it blocks MVP**: `sync:epic --dry-run` must fetch DB checksums for potentially hundreds of stories. A per-story DB query loop violates the N+1 lesson from KBAR-0040 and will be flagged as a HIGH finding in code review, blocking completion.
- **Required mitigation**: Dry-run batch mode must use a single `SELECT story_id, checksum FROM kbar.stories WHERE story_id = ANY(...)` query (or equivalent batch fetch) rather than one query per story. Verify `@repo/kbar-sync` or `@repo/db` exports a suitable batch query helper; if not, implement one read-only helper in the CLI's `__types__/` for dry-run use only.

### Risk 4: Path security at CLI boundary (CWE-22, CWE-59)

- **Why it blocks MVP**: KBAR-0030 had HIGH security findings for path traversal and symlink following. The CLI layer accepts user-supplied paths for `--story-dir`, `--base-dir`, and `--artifact-file`. Even though `@repo/kbar-sync` validates internally, the CLI must also reject unsafe paths at its boundary to prevent confusing downstream errors and to satisfy security review.
- **Required mitigation**: Add explicit path validation in CLI option parsing: (1) reject paths containing `..` or absolute paths outside a defined base, (2) reject symlinks using `fs.lstatSync` before passing to sync functions. Document in CLI code that this is defense-in-depth (sync functions also validate).

### Risk 5: `as any` casts on `process.argv` parsing

- **Why it blocks MVP**: KBAR-0040 had HIGH type-safety findings for `as any` casts. CLI argument parsing typically involves `Record<string, unknown>` which developers often cast to `any`. Zod `safeParse` must be used throughout; no `as any` in CLI scripts.
- **Required mitigation**: Parse raw `process.argv` into a `Record<string, unknown>` object (using a minimal arg parser utility), then immediately pass to `SyncStoryCLIOptionsSchema.safeParse()` or `SyncEpicCLIOptionsSchema.safeParse()`. Only use the typed result from `safeParse`. Never cast the raw args object.

---

## Missing Requirements for MVP

None identified — ACs are complete and concrete. The seed's recommended constraints cover all known gaps.

---

## MVP Evidence Expectations

- `pnpm check-types --filter @repo/kbar-sync` passes with zero errors
- `pnpm lint --filter @repo/kbar-sync` passes with zero errors on new files
- `pnpm test --filter @repo/kbar-sync` passes with >80% coverage on `scripts/` files
- Unit tests demonstrate:
  - `--dry-run` produces zero DB mutations (spy or read-only connection)
  - All three exit codes (0, 1, 2) are exercised in tests
  - `--epic KBAR` filter correctly excludes non-KBAR directories
  - Path traversal input (`../../etc/passwd`) rejected at CLI layer with exit code 1

---

## Proposed Subtask Breakdown

### ST-1: Shared CLI option types

- **Goal**: Define `SyncStoryCLIOptionsSchema` and `SyncEpicCLIOptionsSchema` as Zod schemas in the shared types file
- **Files to read**: `apps/api/knowledge-base/src/cli/index.ts` (Zod CLI option schema pattern)
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` (CREATE)
- **ACs covered**: AC-8
- **Depends on**: none
- **Verification**: `pnpm check-types --filter @repo/kbar-sync` — zero type errors on the new file

### ST-2: `sync:story` CLI script (story sync + dry-run)

- **Goal**: Implement `scripts/sync-story.ts` with flag parsing, Zod validation, `syncStoryToDatabase` delegation, dry-run checksum comparison, and exit code management
- **Files to read**: `packages/backend/orchestrator/src/scripts/populate-story-status.ts` (script entry point pattern), `packages/backend/kbar-sync/src/index.ts` (@repo/kbar-sync exports)
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/sync-story.ts` (CREATE)
- **ACs covered**: AC-1, AC-6, AC-9
- **Depends on**: ST-1
- **Verification**: `pnpm check-types --filter @repo/kbar-sync` and manual invocation: `pnpm --filter @repo/kbar-sync run sync:story -- --help`

### ST-3: `sync:story --artifacts` and `--check-conflicts` extensions

- **Goal**: Extend `sync-story.ts` to handle `--artifacts` (calls `batchSyncArtifactsForStory` and optionally `syncArtifactToDatabase`), `--check-conflicts` (calls `detectSyncConflicts` + `detectArtifactConflicts`), and `--from-db` flag (calls `syncStoryFromDatabase`)
- **Files to read**: `packages/backend/kbar-sync/src/batch-sync-artifacts.ts` (function call pattern), `packages/backend/kbar-sync/src/index.ts`
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/sync-story.ts` (MODIFY)
- **ACs covered**: AC-2, AC-3
- **Depends on**: ST-2
- **Verification**: `pnpm check-types --filter @repo/kbar-sync` — no errors on extended script

### ST-4: `sync:epic` CLI script

- **Goal**: Implement `scripts/sync-epic.ts` with story directory discovery, `--epic` prefix filter, per-story sync loop (fail-soft), aggregate result output, and `--dry-run` batch checksum comparison using a single batch DB query
- **Files to read**: `packages/backend/orchestrator/src/scripts/populate-story-status.ts`, `packages/backend/kbar-sync/src/index.ts`
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/sync-epic.ts` (CREATE)
- **ACs covered**: AC-4, AC-6, AC-9
- **Depends on**: ST-1
- **Verification**: `pnpm check-types --filter @repo/kbar-sync` and manual: `pnpm --filter @repo/kbar-sync run sync:epic -- --help`

### ST-5: `sync:epic --artifact-type` and checkpoint support

- **Goal**: Extend `sync-epic.ts` to handle `--artifact-type <type>` (calls `batchSyncByType`) with `--checkpoint <name>` passthrough for resumable batches
- **Files to read**: `packages/backend/kbar-sync/src/batch-sync-by-type.ts` (if exists), `packages/backend/kbar-sync/src/index.ts`
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/sync-epic.ts` (MODIFY)
- **ACs covered**: AC-5
- **Depends on**: ST-4
- **Verification**: `pnpm check-types --filter @repo/kbar-sync`

### ST-6: Script registration in package.json

- **Goal**: Add `sync:story` and `sync:epic` script entries to `packages/backend/kbar-sync/package.json`; verify shebang in both scripts
- **Files to read**: `packages/backend/kbar-sync/package.json` (current scripts section)
- **Files to create/modify**:
  - `packages/backend/kbar-sync/package.json` (MODIFY)
- **ACs covered**: AC-7
- **Depends on**: ST-2, ST-4
- **Verification**: `pnpm --filter @repo/kbar-sync run sync:story -- --help` exits 0; `pnpm --filter @repo/kbar-sync run sync:epic -- --help` exits 0

### ST-7: Unit tests for `sync:story`

- **Goal**: Write Vitest unit tests covering: all valid flag combinations, missing required flags, invalid flag values, dry-run zero-mutation assertion, error reporting (exit codes 0, 1, 2), conflict detection path
- **Files to read**: `packages/backend/kbar-sync/scripts/sync-story.ts` (ST-2, ST-3 output)
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/__tests__/sync-story.test.ts` (CREATE)
- **ACs covered**: AC-10
- **Depends on**: ST-3
- **Verification**: `pnpm test --filter @repo/kbar-sync -- --coverage` → `scripts/sync-story.ts` coverage >80%

### ST-8: Unit tests for `sync:epic`

- **Goal**: Write Vitest unit tests covering: story discovery (finds correct directories, respects `--epic` filter), batch fail-soft (one failure does not abort batch), dry-run batch (single DB query assertion, no mutations), artifact-type + checkpoint passthrough
- **Files to read**: `packages/backend/kbar-sync/scripts/sync-epic.ts` (ST-4, ST-5 output)
- **Files to create/modify**:
  - `packages/backend/kbar-sync/scripts/__tests__/sync-epic.test.ts` (CREATE)
- **ACs covered**: AC-10
- **Depends on**: ST-5
- **Verification**: `pnpm test --filter @repo/kbar-sync -- --coverage` → `scripts/sync-epic.ts` coverage >80%
