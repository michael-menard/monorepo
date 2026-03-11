# Test Plan: WINT-1070 — Generate stories.index.md from Database

## Scope Summary

- **Endpoints touched**: None (CLI script, no HTTP API surface)
- **UI touched**: No
- **Data/storage touched**: Yes — reads from `wint.stories` table (read-only); writes `stories.index.md` and `generation-report.json` to filesystem

**Script under test**: `packages/backend/orchestrator/src/scripts/generate-stories-index.ts`

**Execution modes**: `--dry-run`, `--generate`, `--verify`

---

## Happy Path Tests

### HPT-1: `--generate` mode writes a valid stories.index.md

- **Setup**: Live PostgreSQL with `wint.stories` table populated (≥10 stories across ≥2 phases)
- **Action**: `npx tsx generate-stories-index.ts --generate`
- **Expected outcome**:
  - `plans/future/platform/wint/stories.index.md` written to disk
  - File has valid YAML frontmatter with `generated_by: generate-stories-index.ts`, `status: generated`, and `updated_at` set to current timestamp
  - File body begins with `DO NOT EDIT` warning comment
  - Progress Summary table present with correct counts matching `SELECT state, COUNT(*) FROM wint.stories GROUP BY state`
  - Per-phase story sections present, sorted by story ID ascending within each phase
  - `generation-report.json` written to working directory
- **Evidence**: File hash changes; frontmatter parsed and validated against Zod schema; `generation-report.json` validated against `GenerationReportSchema`

### HPT-2: `--dry-run` mode writes preview without modifying stories.index.md

- **Setup**: Same as HPT-1; capture MD5 hash of existing `stories.index.md`
- **Action**: `npx tsx generate-stories-index.ts --dry-run`
- **Expected outcome**:
  - Stdout or `stories-index-preview.md` contains generated content
  - `stories.index.md` file hash unchanged (no write occurred)
  - Exit code 0
- **Evidence**: Pre/post hash comparison; `stories.index.md` last-modified timestamp unchanged

### HPT-3: `--verify` mode exits 0 when file matches generated content

- **Setup**: Run `--generate` first to produce a fresh file, then immediately run `--verify`
- **Action**: `npx tsx generate-stories-index.ts --verify`
- **Expected outcome**:
  - Exit code 0
  - Stdout indicates "No drift detected" or equivalent
- **Evidence**: Exit code assertion; log output inspection

### HPT-4: Progress Summary counts match database

- **Setup**: Known fixture DB with 5 stories: 2 `pending`, 1 `uat`, 1 `backlog`, 1 `ready_to_work`
- **Action**: Run `--generate` and inspect Progress Summary table
- **Expected outcome**: Table shows `pending: 2`, `uat: 1`, `backlog: 1`, `ready-to-work: 1`, all other statuses `0`
- **Evidence**: Parse generated markdown table; compare to `SELECT state, COUNT(*) FROM wint.stories GROUP BY state`

### HPT-5: Ready to Start table lists only unblocked ready-to-work stories

- **Setup**: DB with 3 `ready_to_work` stories — Story A (no deps), Story B (deps: all `uat`), Story C (deps: one `pending`)
- **Action**: Run `--generate` and inspect "Ready to Start" section
- **Expected outcome**: Story A and Story B appear; Story C does NOT appear
- **Evidence**: Section contains exactly 2 entries matching Story A and Story B IDs

### HPT-6: Per-story sections rendered with all expected fields

- **Setup**: Story with known values in DB for `story_id`, `title`, `state`, `depends_on`, `goal`; YAML frontmatter with `risk_notes`, `phase`, `feature` description
- **Action**: Run `--generate`; locate story section in output
- **Expected outcome**: Section contains `### {STORY-ID}: {Title}`, `**Status:**`, `**Depends On:**`, `**Phase:**`, `**Feature:**`, `**Goal:**`, `**Risk Notes:**`
- **Evidence**: Spot-check 5 stories: generated section matches expected field values from DB + YAML

### HPT-7: Generation report JSON is valid and complete

- **Setup**: Standard run with at least 10 stories
- **Action**: `npx tsx generate-stories-index.ts --generate`; read `generation-report.json`
- **Expected outcome**:
  - Report includes: `timestamp`, `story_count_by_phase`, `story_count_by_status`, `field_source_breakdown`, `skipped_stories`, `duration_ms`
  - All fields non-null; `duration_ms` > 0
  - Validates against `GenerationReportSchema` without errors
- **Evidence**: `z.parse()` on report with `GenerationReportSchema`

### HPT-8: Generated file's YAML frontmatter has all required fields

- **Setup**: Fresh generate run
- **Action**: Parse YAML frontmatter of output file
- **Expected outcome**: Frontmatter contains `doc_type: stories_index`, `title`, `status: generated`, `story_prefix`, `created_at` (preserved from original), `updated_at` (current timestamp), `generated_by: generate-stories-index.ts`
- **Evidence**: Zod validation of parsed frontmatter

---

## Error Cases

### EC-1: Database unreachable

- **Setup**: Invalid `POSTGRES_HOST` environment variable
- **Action**: `npx tsx generate-stories-index.ts --generate`
- **Expected outcome**: Script exits with code 1; error logged via `@repo/logger` including connection error details; `stories.index.md` NOT modified
- **Evidence**: Exit code 1; log contains database error message; file hash unchanged

### EC-2: `wint.stories` table empty

- **Setup**: DB connection valid but `wint.stories` table has 0 rows
- **Action**: `npx tsx generate-stories-index.ts --generate`
- **Expected outcome**: Script completes (exit code 0); generated file contains Progress Summary table with all zeros; no per-story sections; warning logged that 0 stories found
- **Evidence**: Generated file structure valid; warning in logs; `generation-report.json` shows `story_count: 0`

### EC-3: Story in DB with no corresponding YAML file

- **Setup**: Story `WINT-9999` in DB but no directory or YAML file on disk
- **Action**: Run `--generate`
- **Expected outcome**: Story section generated using DB-only fields; YAML-derived fields (`risk_notes`, freeform `feature` description) render as `—` or `N/A`; story not skipped; warning logged that YAML fallback returned null for `WINT-9999`
- **Evidence**: `WINT-9999` section present in output; `generation-report.json` `field_source_breakdown` shows this story as `db_only`

### EC-4: Malformed YAML frontmatter in a story file

- **Setup**: One story file with invalid YAML in its frontmatter
- **Action**: Run `--generate`
- **Expected outcome**: Fail-soft: story generates from DB-only data; warning logged; other stories unaffected; skipped story recorded in `generation-report.json`
- **Evidence**: Skipped story entry in report with reason "YAML parse error"; other stories present in output

### EC-5: `--verify` detects drift and exits 1

- **Setup**: Generate file, then manually edit one line (change one status value)
- **Action**: `npx tsx generate-stories-index.ts --verify`
- **Expected outcome**: Exit code 1; diff summary printed to stdout showing the mutated line; log indicates "Drift detected"
- **Evidence**: Exit code 1; diff output contains the mutated line

### EC-6: Missing required environment variable `POSTGRES_PASSWORD`

- **Setup**: Unset `POSTGRES_PASSWORD`
- **Action**: `npx tsx generate-stories-index.ts --generate`
- **Expected outcome**: Script either proceeds with default password `postgres` or fails with clear error message indicating missing env var; does not silently produce corrupt output
- **Evidence**: Either success with default or clear error; no partial writes

---

## Edge Cases

### EDGE-1: `depends_on` empty array vs null

- **Setup**: Story A has `depends_on: []`, Story B has `depends_on: null` in DB
- **Action**: Run `--generate`, inspect both story sections
- **Expected outcome**: Both render `**Depends On:** —` (not empty brackets or "null")
- **Evidence**: Regex check on output for `Depends On: —` for both stories

### EDGE-2: Story with phase 0 (Phase 0: Bootstrap)

- **Setup**: Stories with `phase: 0` in DB
- **Action**: Run `--generate`
- **Expected outcome**: Phase 0 section header present; stories sorted by story ID ascending within section
- **Evidence**: Section header `## Phase 0` present; story IDs in ascending order within section

### EDGE-3: Phase with no stories

- **Setup**: DB contains stories for phases 0, 1, 3 but not phase 2
- **Action**: Run `--generate`
- **Expected outcome**: Phase 2 section may be omitted entirely, or present with empty body — consistent behavior documented in `GenerationReport`; no crash
- **Evidence**: Output does not crash; behavior documented in report

### EDGE-4: Two stories with identical phase and adjacent story IDs

- **Setup**: `WINT-1010` and `WINT-1011` both in Phase 1
- **Action**: Run `--generate`; inspect Phase 1 section order
- **Expected outcome**: `WINT-1010` appears before `WINT-1011` (ascending sort)
- **Evidence**: String comparison of story IDs in output confirms ascending order

### EDGE-5: 143+ stories — performance within 10 seconds

- **Setup**: Full production DB (143+ stories)
- **Action**: Time `npx tsx generate-stories-index.ts --generate`
- **Expected outcome**: Total wall-clock time ≤ 10 seconds
- **Evidence**: `duration_ms` in `generation-report.json` ≤ 10000

### EDGE-6: `--generate` run immediately followed by `--verify` (round-trip)

- **Setup**: Production DB with all stories
- **Action**: `--generate` then `--verify`
- **Expected outcome**: `--verify` exits 0 immediately after `--generate`
- **Evidence**: Exit code 0; no diff output

### EDGE-7: Concurrent `--generate` runs

- **Setup**: Two concurrent processes both run `--generate` at the same time
- **Action**: Launch two parallel processes
- **Expected outcome**: Output file is consistent (not corrupt); no interleaved writes; at least one write completes successfully
- **Evidence**: File is valid markdown with valid YAML frontmatter after both processes complete

### EDGE-8: Stories without a `phase` field in DB or YAML

- **Setup**: Story in DB with `phase: null`
- **Action**: Run `--generate`
- **Expected outcome**: Story appears in a catch-all "Unphased" section, or skipped with warning — behavior must be deterministic and documented
- **Evidence**: No crash; consistent placement or skipped entry in report

---

## Unit Test Coverage Requirements

### Pure Functions to Test

| Function | Coverage Target | Critical Test Cases |
|----------|----------------|---------------------|
| `computeProgressSummary(stories)` | ≥80% | Off-by-one status enum, empty input, all statuses present |
| `computeReadyToStart(stories)` | ≥80% | Partial deps, all deps done, no ready-to-work stories, empty deps array vs null |
| `renderStorySection(story, yaml?)` | ≥80% | All fields present, YAML missing, depends_on null/empty, long goal text |
| `renderFrontmatter(meta)` | ≥80% | created_at preserved, updated_at current, all required fields |
| `renderProgressTable(counts)` | ≥80% | All zeros, mixed values |
| `renderReadyToStartTable(stories)` | ≥80% | Empty list, single entry, multiple entries |
| `groupStoriesByPhase(stories)` | ≥80% | Single phase, multiple phases, unphased stories |

### Integration Tests

| Test | Description |
|------|-------------|
| INT-1 | `--generate` against test PostgreSQL fixture DB, compare output to expected snapshot |
| INT-2 | `--verify` against freshly generated file → exit 0 |
| INT-3 | `--verify` after manual line mutation → exit 1 with diff |
| INT-4 | `--dry-run` does not modify `stories.index.md` file hash |
| INT-5 | YAML fallback: story in DB with no file → generates entry, skips gracefully |

---

## Required Tooling Evidence

### Backend

- `pnpm test --filter packages/backend/orchestrator` — unit tests pass
- `pnpm check-types --filter packages/backend/orchestrator` — 0 TypeScript errors
- `pnpm lint --filter packages/backend/orchestrator` — 0 ESLint errors
- Coverage: `pnpm vitest run --coverage` → ≥80% for `generate-stories-index.ts` and its pure functions
- Integration: `npx tsx generate-stories-index.ts --generate` completes with exit code 0 against live DB
- `npx tsx generate-stories-index.ts --verify` exits 0 immediately after generate

### Frontend

Not applicable — backend-only script.

---

## Risks to Call Out

1. **DB connectivity in CI**: Integration tests require a real PostgreSQL connection (ADR-005). CI pipeline must provision a test DB or these tests must be gated as manual/integration-only.
2. **`wint.stories` schema column completeness**: If columns like `goal`, `depends_on`, `phase` are not in the actual DB schema, the progress summary and per-story section tests will fail — audit the schema before writing test fixtures.
3. **Snapshot fragility**: INT-1 uses a snapshot comparison. If the DB state changes between runs, the snapshot test will fail. Use a seeded test fixture DB to avoid this.
4. **Status label mapping**: The DB uses `ready_to_work` (underscore) but the index displays `ready-to-work` (hyphen). Tests must verify this label mapping explicitly.
5. **`--verify` diff implementation**: The diff output format needs to be specified before writing tests for EC-5. Recommendation: use Node's built-in string comparison with a line-diff library rather than shelling out to `diff`.
