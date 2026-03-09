---
generated: "2026-02-17"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1070

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file found at expected path. Codebase scanning used to establish current state.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| WINT-1030: Populate Story Status | UAT (PASS) | Created `populate-story-status.ts` which reads YAML frontmatter and populates `wint.stories` table. Database is now the source of truth for story data. |
| WINT-0090: Story Management MCP Tools | UAT | `story_get_status`, `story_update_status`, `story_get_by_status`, `story_get_by_feature` tools available for database queries. |
| WINT-0010: Core Database Schemas | completed | `wint.stories` table exists with `story_state` enum. |
| WINT-0020: Story Management Tables | pending | `core.stories` table — separate from `wint.stories`. Dependency needs clarification (see Conflicts). |
| WINT-1020: Directory Flattening | ready-to-work | Story `status:` field now present in YAML frontmatter. |
| stories.index.md | active | Currently manually maintained, at `plans/future/platform/wint/stories.index.md`. Contains 143+ stories across 9 phases with rich metadata (status, depends_on, phase, feature, goal, risk notes). |
| StoryRepository | deployed | `packages/backend/orchestrator/src/db/story-repository.ts` — full CRUD for `wint.stories` table. |
| StoryFileAdapter | deployed | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` — reads YAML frontmatter. |
| `populate-story-status.ts` | deployed (WINT-1030) | `packages/backend/orchestrator/src/scripts/populate-story-status.ts` — pattern to reuse for DB querying. |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-1040 | pending | Updates story-status command to use DB — will query the same `wint.stories` table this story reads from. |
| WINT-1050 | pending | Updates story-update command to use DB. |
| WINT-1060 | pending | Updates story-move command to use DB. |
| WINT-1120 | pending | Phase 1 validation — depends on WINT-1070 being complete. |

No stories are currently in-progress (0 in-progress per stories.index.md), so there is no worktree conflict risk.

### Constraints to Respect

1. **Zod-first types** — All type definitions must use Zod schemas with `z.infer<>`. No TypeScript interfaces.
2. **No barrel files** — Import directly from source files, do not create `index.ts` re-exports.
3. **Use `@repo/logger`** — Never use `console.log`.
4. **Protected features** — Do not modify production DB schemas, the `wint.stories` table schema, or the `@repo/db` client API surface.
5. **Read-only for stories.index.md** — After this story, the file must carry a generated header and should not be manually edited.
6. **Script safety** — Must not write to database (read-only query path), must not modify story files.
7. **stories.index.md format** — The generated file must be a drop-in replacement for the current manually-authored format. Agents and humans that read this file must not notice a structural break.

---

## Retrieved Context

### Related Endpoints

None — this is a generation script, not an API endpoint.

### Related Components

| Component | Location | Usage |
|-----------|----------|-------|
| `populate-story-status.ts` | `packages/backend/orchestrator/src/scripts/populate-story-status.ts` | Primary reference: DB connection pattern, Pool creation, CLI arg parsing, monorepo root detection, `@repo/logger` usage |
| `StoryRepository` | `packages/backend/orchestrator/src/db/story-repository.ts` | `getStoriesByState()`, `getStory()` — read from `wint.stories` |
| `StoryFileAdapter` | `packages/backend/orchestrator/src/adapters/story-file-adapter.ts` | May be needed for supplementary data (depends_on, risk notes, feature text) not yet in DB |
| `population.ts` types | `packages/backend/orchestrator/src/scripts/__types__/population.ts` | Zod schema patterns to replicate for generation artifacts |
| `stories.index.md` | `plans/future/platform/wint/stories.index.md` | Current manually-authored file — defines the output format to generate |
| `migrate-flatten-stories.ts` | `packages/backend/orchestrator/src/scripts/migrate-flatten-stories.ts` | Reference for CLI pattern and file-write output |

### Reuse Candidates

1. **`createDbPool()` + Pool pattern** from `populate-story-status.ts` — identical DB connection approach.
2. **`findMonorepoRoot()` + path resolution** from `populate-story-status.ts` — exact same utility needed.
3. **`parseArgs()` CLI pattern** from `populate-story-status.ts` — adapt for `--generate` / `--verify` / `--dry-run` modes.
4. **`StoryRepository.getStoriesByState()`** — batch-read all stories grouped by state.
5. **Zod schema pattern** from `population.ts` — replicate structure for generation report artifact.
6. **`@repo/logger`** — already set up in the scripts directory.

### Similar Stories

- **WINT-1030** (UAT): Nearly identical script architecture. This story is the "reverse": instead of writing DB from files, it writes files from DB.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Script CLI + DB connection + structured logging | `packages/backend/orchestrator/src/scripts/populate-story-status.ts` | Exact same script structure needed: Pool creation, findMonorepoRoot, parseArgs, @repo/logger, Zod output schemas, file write |
| DB read — stories by state | `packages/backend/orchestrator/src/db/story-repository.ts` | `getStoriesByState()` and `getStory()` methods to use for reading all stories |
| Zod-first artifact types | `packages/backend/orchestrator/src/scripts/__types__/population.ts` | Template for defining `GenerationReport` and related Zod schemas for this story |
| stories.index.md format | `plans/future/platform/wint/stories.index.md` | The exact output format to reverse-engineer and generate programmatically |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (KB not queried). The following is derived from WINT-1030 QA notes and implementation reality:

- **[WINT-1030-KB-012]** Integration with WINT-1070 was flagged as a non-blocking enhancement: "auto-generate stories.index.md after population." This confirms WINT-1030 already anticipated a hook point.
- **[WINT-1030 pattern]** Dry-run mode (preview without writes) is strongly valued and should be replicated.
- **[WINT-1030 pattern]** Fail-soft error handling (skip errors, continue, collect warnings) is the established pattern.
- **[WINT-1030 pattern]** Verification mode (confirm output is valid post-generation) rounds out the CLI pattern.

### Blockers to Avoid

- **Missing data in DB**: The current `wint.stories` table may not contain all fields present in `stories.index.md` (e.g., `depends_on`, `risk_notes`, `goal` text as written in the index). If these fields are absent from the DB, the generated output will be incomplete or differ from the manually-authored version. Resolution: audit the DB schema vs index file fields early, fallback to YAML frontmatter for supplementary fields if needed.
- **Format divergence**: If the generation script produces a different markdown structure than the current file, downstream agents and humans who depend on parsing the index will break. Resolution: generate output format identical to current file structure, use the existing file as a format specification.
- **"Generated" header that breaks frontmatter parsers**: The file currently has YAML frontmatter. Adding a `DO NOT EDIT` warning inside the frontmatter or body must not break agents that read the frontmatter. Resolution: add warning as a frontmatter field AND as a comment at the top of the body section.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT verification must connect to real PostgreSQL, not a mock. Unit tests may mock the DB client. |

ADR-001 (API paths), ADR-002 (Infrastructure), ADR-003 (Image CDN), ADR-004 (Auth), ADR-006 (E2E) are not applicable — this is a backend-only generation script with no API surface or UI.

### Patterns to Follow

- Database-driven workflow: read from `wint.stories`, not from directory structure.
- Zod-first type definitions for all script artifacts.
- Structured logging with `@repo/logger` (never `console.log`).
- Migration safety: dry-run mode, generation report, verification mode.
- Fail-soft: collect errors, log warnings, do not abort entire run on one story failure.
- Generated file header: mark the output file as `DO NOT EDIT — generated` to signal its read-only nature.

### Patterns to Avoid

- TypeScript interfaces — use Zod with `z.infer<>` exclusively.
- Barrel files (index.ts re-exports).
- `console.log` — use `@repo/logger`.
- Hardcoding paths — use `findMonorepoRoot()` to anchor all paths.
- Manual string formatting for the markdown — build the sections programmatically with clear builder functions.
- Reading story files to get data already in the database — prefer DB as source of truth; fall back to YAML only for fields confirmed absent from `wint.stories`.

---

## Conflict Analysis

### Conflict: Data completeness gap (warning)
- **Severity**: warning
- **Description**: The current `stories.index.md` contains fields that may not be stored in `wint.stories`: `depends_on`, `feature` (long-form description), `goal`, `risk_notes`, and per-story elaboration timestamps/verdicts. The `StoryRepository` schema shows: `story_id`, `feature_id`, `type`, `state`, `title`, `goal`, `points`, `priority`, `blocked_by`, `depends_on`, `follow_up_from`, `packages`, `surfaces`, `non_goals`. Some fields map directly (`goal`, `depends_on`), others (`risk_notes`, `feature` freeform text, elaboration verdicts) are likely in YAML frontmatter only.
- **Resolution Hint**: Before writing any generation code, audit `wint.stories` schema columns vs index file fields. For fields not in DB, decide: (a) enrich the DB schema as part of this story (likely out of scope), (b) fall back to reading story YAML frontmatter for supplementary fields, or (c) omit those fields from generation and update the index format. Option (b) is the lowest-risk approach — hybrid: DB for status/title/core data, YAML for supplementary richness. This hybrid approach must be documented in the story ACs.

---

## Story Seed

### Title

Generate stories.index.md from Database

### Description

**Context**

`plans/future/platform/wint/stories.index.md` is a 2,400-line manually-maintained index of all WINT stories. It contains the canonical status, dependency graph, feature descriptions, and risk notes for every story across 9 phases. WINT-1030 (UAT PASS) established the `wint.stories` database table as the authoritative source of story state, populating it from YAML frontmatter.

The problem is that the index file and the database can now drift: any manual edit to `stories.index.md` does not update the database, and any database status update (from WINT-0090 MCP tools) is not reflected in the index file. As stories progress through the workflow, the index becomes stale relative to the database.

**Problem Statement**

- `stories.index.md` is manually maintained and will diverge from the database.
- It is currently the primary reference humans and agents use to understand story state, phase, and dependencies.
- No automated mechanism regenerates it from the database after status changes.
- WINT-1030 explicitly deferred index file generation to this story (listed as non-goal: "Index file generation — WINT-1070 will generate stories.index.md from database").

**Proposed Solution Direction**

Create a generation script (`generate-stories-index.ts`) in `packages/backend/orchestrator/src/scripts/` that:

1. Reads all stories from the `wint.stories` database table via `StoryRepository`.
2. Supplements database data with story YAML frontmatter for fields not stored in `wint.stories` (e.g., `depends_on` array, `risk_notes`, freeform `feature` description, phase).
3. Groups stories by phase, sorts within phase by story ID.
4. Renders the `stories.index.md` format: YAML frontmatter, progress summary table, "Ready to Start" table, and per-phase story sections.
5. Writes the generated file to `plans/future/platform/wint/stories.index.md` with a `DO NOT EDIT` generated header.
6. Provides a `--dry-run` mode that previews generated output to stdout without writing.
7. Provides a `--verify` mode that checks whether the current file on disk matches what would be generated (diff detection).

After this story, `stories.index.md` becomes a read-only generated artifact. The database becomes the single source of truth for story state.

### Initial Acceptance Criteria

- [ ] **AC-1**: Generation script reads all stories from `wint.stories` database table using `StoryRepository` and groups them by phase. Stories within each phase are sorted by story ID in ascending order.
  - **Evidence**: Dry-run output shows all story IDs discovered in DB, grouped by phase.

- [ ] **AC-2**: Script supplements database data with YAML frontmatter for fields absent from `wint.stories`: `depends_on`, `risk_notes`, `feature` freeform description. Audit log records which stories used DB-only vs hybrid reads.
  - **Evidence**: Generation report lists field-source breakdown (db vs yaml fallback).

- [ ] **AC-3**: Generated `stories.index.md` YAML frontmatter includes `doc_type: stories_index`, `title`, `status: generated`, `story_prefix`, `created_at` (preserved from original), `updated_at` (timestamp of generation), and a `generated_by: generate-stories-index.ts` field.
  - **Evidence**: Generated frontmatter validated against Zod schema.

- [ ] **AC-4**: Generated file includes a "Progress Summary" table showing story count per status (completed, uat, in-qa, ready-for-qa, ready-for-code-review, failed-qa, elaboration, created, backlog, in-progress, ready-to-work, pending), matching the format of the current manually-authored file.
  - **Evidence**: Counts in generated file match `SELECT state, COUNT(*) FROM wint.stories GROUP BY state` query result.

- [ ] **AC-5**: Generated file includes a "Ready to Start" table listing stories whose dependencies are all in `done` or `uat` state (i.e., unblocked) and which are themselves in `ready_to_work` state.
  - **Evidence**: Stories in "Ready to Start" table match SQL query for unblocked ready-to-work stories.

- [ ] **AC-6**: Generated file reproduces per-story sections with: `### {STORY-ID}: {Title}`, `**Status:**`, `**Depends On:**`, `**Phase:**`, `**Feature:**`, `**Infrastructure:**`, `**Goal:**`, `**Risk Notes:**` — matching the format of the current manually-authored file.
  - **Evidence**: Spot-check 5 stories: generated section matches manually-authored section for fields available in DB+YAML.

- [ ] **AC-7**: Script provides `--dry-run` flag that outputs the generated content to stdout (or a preview file `stories-index-preview.md`) without overwriting `stories.index.md`.
  - **Evidence**: Running `--dry-run` does not modify `stories.index.md` (file hash unchanged after run).

- [ ] **AC-8**: Script provides `--verify` flag that compares the current `stories.index.md` on disk with what would be generated. Exits with code 0 if identical, code 1 if drift detected, and prints a diff summary.
  - **Evidence**: Running `--verify` against a known-stale file returns exit code 1 with diff summary; against a freshly-generated file returns exit code 0.

- [ ] **AC-9**: Script outputs a generation report (`generation-report.json`) logging: timestamp, story count by phase, story count by status, field-source breakdown, skipped stories (with reasons), duration.
  - **Evidence**: `generation-report.json` written after `--generate` run; validated against Zod schema.

- [ ] **AC-10**: Generated `stories.index.md` includes a prominent `DO NOT EDIT` warning comment at the top of the file body (below frontmatter), stating that the file is generated by `generate-stories-index.ts` and manual edits will be overwritten.
  - **Evidence**: Warning comment present in generated file; verified by inspection.

- [ ] **AC-11**: Unit tests achieve ≥80% coverage for all pure functions: story grouping, progress table generation, ready-to-start computation, per-story section rendering, frontmatter rendering.
  - **Evidence**: `pnpm test` passes; coverage report shows ≥80% for `generate-stories-index.ts`.

- [ ] **AC-12**: The script is documented with CLI usage, required environment variables, and an explanation of the DB-primary / YAML-fallback data strategy in an inline JSDoc block at the top of the file.
  - **Evidence**: JSDoc block present; covers `--dry-run`, `--generate`, `--verify` modes.

### Non-Goals

- **Modifying the `wint.stories` schema** — no DDL changes; read-only DB access only.
- **Generating indexes for other epics** (KBAR, LNGG, etc.) — scope is WINT only; multi-epic support deferred.
- **Real-time regeneration on every DB write** — automation hook (WINT-1030-KB-012) is deferred; this story delivers the script and `--verify` flag; triggering is handled by humans or a future story.
- **Updating story YAML frontmatter files** — script is read-only for both database and filesystem story files.
- **Replacing stories.index.md's role as the primary format** — the format is preserved exactly; only the authorship changes (machine-generated vs human-written).
- **Enriching the DB schema with new fields** (risk_notes, etc.) — out of scope; YAML fallback covers the gap.

### Reuse Plan

- **Components**: `StoryRepository` (DB reads), `StoryFileAdapter` (YAML fallback for missing fields), `populate-story-status.ts` (script architecture template), `population.ts` (Zod schema template).
- **Patterns**: CLI with `--dry-run` / `--generate` / `--verify` modes; `findMonorepoRoot()`; `createDbPool()`; `@repo/logger` for all logging; Zod-first artifact types for `GenerationReport`; fail-soft error handling.
- **Packages**: `@repo/logger`, `pg` (Pool), `zod`, Node.js `fs/promises`, `path`.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The script has three distinct execution paths (`--dry-run`, `--generate`, `--verify`) — each needs its own test coverage.
- Critical unit test: progress summary counts must exactly match DB state counts (off-by-one risk if status enum mapping between DB and index display labels diverges).
- Critical unit test: "Ready to Start" computation — a story is unblocked only when ALL `depends_on` entries are `done` or `uat`. Partial satisfaction should not trigger inclusion.
- Integration test: run `--generate` against a test PostgreSQL instance with fixture data, compare output file to expected snapshot.
- Integration test: run `--verify` against a freshly generated file (exit 0), then manually mutate one line (exit 1 with diff).
- Edge case: story in DB with no corresponding YAML file (YAML fallback returns null) — must still generate entry with DB-only fields.
- Edge case: `depends_on` is an empty array vs null in DB — both should render as `—` in the index.
- Performance: generation of 143+ stories should complete in <10 seconds.
- The `--verify` mode is a critical gate mechanism: AC-8 is the foundation for any future CI integration.

### For UI/UX Advisor

Not applicable — this is a backend generation script with no UI. The "UX" concern is the generated markdown format, which must be indistinguishable from the manually-authored format to avoid disrupting agents and humans who read the index.

### For Dev Feasibility

**Primary risk: data completeness.** The DB schema (`wint.stories`) and the manually-authored `stories.index.md` do not have perfect field alignment. Before writing any generation code:
1. Run `SELECT column_name FROM information_schema.columns WHERE table_schema = 'wint' AND table_name = 'stories'` to enumerate actual DB columns.
2. Cross-reference against the fields present in `stories.index.md` (status, depends_on, phase, feature, infrastructure, goal, risk_notes, elaboration notes, QA notes).
3. For each missing field, confirm YAML frontmatter has it (check 3 representative story files).
4. Document the field-source mapping as a constant in the script.

**Script structure recommendation** (mirrors `populate-story-status.ts`):
```
packages/backend/orchestrator/src/scripts/
  generate-stories-index.ts           # Main CLI script
  __types__/
    generation.ts                     # Zod schemas: GenerationReport, StorySection, etc.
  __tests__/
    generate-stories-index.test.ts    # Unit tests (pure functions)
    generate-stories-index.integration.test.ts  # Integration tests (real DB)
```

**Key functions to isolate for testability:**
- `computeProgressSummary(stories: StoryRow[])` → progress counts by state
- `computeReadyToStart(stories: StoryRow[])` → filtered, sorted list
- `renderStorySection(story: StoryRow, yaml?: StoryMetadata)` → markdown string
- `renderFrontmatter(meta: IndexMeta)` → YAML block string
- `writeIndexFile(content: string, outputPath: string)` → fs write

**DB query strategy:** Use `StoryRepository.getStoriesByState()` for each state to get all stories, or add a `getAllStories()` method to `StoryRepository` that does a single `SELECT * FROM wint.stories ORDER BY story_id ASC`. The latter is more efficient (one query vs N queries).

**Canonical reference**: `populate-story-status.ts` is the direct implementation analog. Copy and adapt its Pool/CLI/logger/Zod pattern. The generation direction is reversed (DB → file vs file → DB), but the script skeleton is identical.

**Estimated effort**: 6-8 hours
- DB field audit + field-source mapping: 1 hour
- Script skeleton + CLI: 1 hour
- Data fetch + grouping logic: 1 hour
- Markdown rendering functions: 2 hours
- `--verify` mode (diff): 1 hour
- Unit tests: 2 hours
- Integration test: 1 hour
- Documentation: 0.5 hours

---

STORY-SEED COMPLETE WITH WARNINGS: 1 warning
