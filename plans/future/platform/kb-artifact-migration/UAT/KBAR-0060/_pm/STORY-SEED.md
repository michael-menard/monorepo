---
generated: "2026-02-20"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KBAR-0060

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file was available (baseline_path: null). Context was reconstructed from codebase scanning, stories index, completed KBAR story artifacts (KBAR-0050 story file), ADR-LOG.md, and existing test files.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `syncStoryToDatabase` | `packages/backend/kbar-sync/src/sync-story-to-database.ts` | Active (KBAR-0030) | Primary function under integration test — sync story file FS→DB |
| `syncStoryFromDatabase` | `packages/backend/kbar-sync/src/sync-story-from-database.ts` | Active (KBAR-0030) | Reverse sync function — DB→FS path |
| `detectSyncConflicts` | `packages/backend/kbar-sync/src/detect-sync-conflicts.ts` | Active (KBAR-0030) | Conflict detection for story-level artifacts |
| `syncArtifactToDatabase` | `packages/backend/kbar-sync/src/sync-artifact-to-database.ts` | Active (KBAR-0040) | Artifact sync function under test |
| `detectArtifactConflicts` | `packages/backend/kbar-sync/src/detect-artifact-conflicts.ts` | Active (KBAR-0040) | Artifact-level conflict detection |
| `batchSyncArtifactsForStory` | `packages/backend/kbar-sync/src/batch-sync-artifacts.ts` | Active (KBAR-0040) | Per-story batch artifact sync |
| `batchSyncByType` | `packages/backend/kbar-sync/src/batch-sync-by-type.ts` | Active (KBAR-0040) | Cross-story artifact batch with checkpoint resumption |
| `sync:story` CLI | `packages/backend/kbar-sync/scripts/sync-story.ts` | Active (KBAR-0050) | CLI command wrapping story sync functions — `dryRunStory` exported |
| `sync:epic` CLI | `packages/backend/kbar-sync/scripts/sync-epic.ts` | Active (KBAR-0050) | CLI command wrapping epic batch sync — `dryRunEpic` exported |
| CLI option schemas | `packages/backend/kbar-sync/scripts/__types__/cli-options.ts` | Active (KBAR-0050) | `SyncStoryCLIOptionsSchema`, `SyncEpicCLIOptionsSchema` Zod schemas |
| Existing story integration tests | `packages/backend/kbar-sync/src/__tests__/integration.integration.test.ts` | Active (KBAR-0030) | Testcontainers pattern for story sync — directly reusable as baseline |
| Existing artifact integration tests | `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` | Active (KBAR-0040) | Full schema setup + testcontainers pattern for artifact sync |
| Existing CLI integration tests | `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | Active (KBAR-0050) | AC-11 tests already written — KBAR-0060 extends and validates these with real epic data |
| `vitest.integration.config.ts` | `packages/backend/kbar-sync/vitest.integration.config.ts` | Active (KBAR-0050) | Integration test runner config (includes `scripts/**/*.integration.test.ts`) |
| `@repo/kbar-sync` package exports | `packages/backend/kbar-sync/src/index.ts` | Active | All Zod schemas and function exports — test harness imports from here |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| KBAR-0050 | CLI Sync Commands | ready-to-work | Direct predecessor — KBAR-0060 tests the CLI commands and underlying sync functions. Implementation gate: KBAR-0050 must be merged to main before KBAR-0060 implementation starts |
| KBAR-0070 | story_get Tool | pending (blocked by KBAR-0060) | Downstream — depends on KBAR-0060 completion |

### Constraints to Respect

1. **KBAR-0050 must be merged first** — KBAR-0060 tests the CLI commands delivered in KBAR-0050. If KBAR-0050 function signatures change during UAT, KBAR-0060 integration tests must be updated to match.
2. **Do not modify `@repo/kbar-sync` sync functions** — KBAR-0060 is integration tests only. No new sync logic, no function modifications.
3. **Do not modify CLI scripts** — KBAR-0060 validates existing `sync-story.ts` and `sync-epic.ts` behavior. It does not add features to them.
4. **ADR-005 compliance is mandatory** — integration tests must use real PostgreSQL (testcontainers), never mocks.
5. **Test data must cover all story states** — index entry risk note: test data must cover all story states, dependencies, and artifact types.
6. **Zod-first types** — any new type used in test helpers or fixtures must use Zod schemas with `z.infer<>`.
7. **No barrel files** — import test helpers directly from source files, not re-export indexes.

---

## Retrieved Context

### Related Endpoints

None — KBAR-0060 is a pure test story with no HTTP endpoints. The sync functions and CLI commands under test are also CLI-only (no REST layer).

### Related Components

None — backend-only test suite with no UI components.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| Testcontainers setup pattern | `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` | Complete schema creation SQL (kbar schema, enums, all tables including `sync_checkpoints`) — copy and adapt as the KBAR-0060 test harness |
| CLI integration test harness | `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | Already-written KBAR-0050 AC-11 tests — these are the canonical integration tests KBAR-0060 expands on; run as part of KBAR-0060 acceptance |
| KBAR-0030 story integration tests | `packages/backend/kbar-sync/src/__tests__/integration.integration.test.ts` | Direct reference for happy-path story sync, idempotency, and conflict test patterns |
| `@repo/kbar-sync` package | `packages/backend/kbar-sync/src/index.ts` | All sync functions and Zod schemas imported by tests |
| `vitest.integration.config.ts` | `packages/backend/kbar-sync/vitest.integration.config.ts` | Already configured to include `scripts/**/*.integration.test.ts` — no new config needed |
| Real KBAR story files | `plans/future/platform/kb-artifact-migration/` | Production-like test fixtures — actual KBAR story YAML/Markdown files serve as "real wish epic stories" referenced in the index entry |
| `wint/` epic stories | `plans/future/platform/wint/` | WINT stories as cross-epic test data to validate `--epic` filter behavior and batch sync across heterogeneous epics |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Integration test with full testcontainers setup and KBAR schema | `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` | Most complete testcontainers harness: all enums, all tables including `sync_checkpoints`, `beforeAll`/`afterAll` lifecycle, `skipIf` guard, 90s timeout — KBAR-0060 copies and extends this pattern |
| CLI-layer integration tests with exported test helpers | `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | Already tests `dryRunStory` and `dryRunEpic` via imported module — KBAR-0060 extends these with real epic story fixtures and edge cases |
| Batch sync with checkpoint resumption | `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` (AC-5 test) | Pattern for pre-seeding `kbar.sync_checkpoints` and verifying resumption via `batchSyncByType` |
| Testcontainers skip guard for CI | `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` | `shouldSkip` pattern using `process.env.SKIP_TESTCONTAINERS` or Docker availability check |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0030]** Security vulnerabilities (path traversal CWE-22, symlink following CWE-59) found as HIGH findings in code review.
  - *Applies because*: Integration tests that pass `--story-dir` values must use controlled temp directories (`os.tmpdir()` + unique suffix). Tests must not pass unvalidated paths that could trigger security violations in the CLI layer's path security checks.

- **[KBAR-0040]** N+1 queries in batch operations were HIGH performance findings.
  - *Applies because*: The KBAR-0060 batch integration test for `dryRunEpic` must explicitly verify that the batch dry-run issues a single query for N stories (already tested in KBAR-0050's AC-11 integration test via `dryRunEpic`). The test should assert via query count monitoring or database query log, not just functional output.

- **[KBAR-0040]** `as any` casts caused HIGH type-safety findings in code review.
  - *Applies because*: Test helper files and fixture generators must use proper Zod-inferred types for story YAML content. Do not cast test data to `any` — use `StoryFrontmatterSchema` to validate fixture data before writing to disk.

- **[KBAR-0030]** Code duplication — utility functions re-implemented across sync functions before consolidation.
  - *Applies because*: If KBAR-0060 requires shared test fixtures or schema setup utilities, extract them into a shared helper file rather than duplicating SQL across test files.

- **[KBAR-0050]** Integration test for CLI dry-run uses direct module import of `dryRunStory` and `dryRunEpic` (not subprocess invocation).
  - *Applies because*: KBAR-0060 follows the same pattern. Testing CLI commands via in-process function imports (not `child_process.exec`) is faster, more reliable, and avoids environment variable propagation issues with subprocess spawning.

### Blockers to Avoid (from past stories)

- **Starting implementation before KBAR-0050 is merged** — function signatures in `sync-story.ts` and `sync-epic.ts` may still change during KBAR-0050 UAT; integration tests written against an unstable API will need to be rewritten.
- **Using mocks in integration tests** — ADR-005 explicitly prohibits mocking in tests intended for UAT validation. All database interactions must use real PostgreSQL (testcontainers).
- **Missing edge cases** — the index entry risk note is explicit: "Test data must cover all story states, dependencies, and artifact types." A test suite that only covers the happy path will fail this AC.
- **Hardcoding test story paths** — test fixtures must use `os.tmpdir()` + unique temp directories, not hardcoded paths. This ensures tests work across machines and CI environments.
- **Not cleaning up testcontainers** — `afterAll` must stop the container and remove temp directories. Leaked containers cause CI failures.
- **Using `CREATE TYPE` without `IF NOT EXISTS`** — KBAR-0030's integration test hit failures when types were created without guards. KBAR-0040 fixed this with `CREATE TYPE IF NOT EXISTS`. KBAR-0060 must use the same pattern.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Integration/UAT tests MUST use real PostgreSQL (testcontainers), never mocks. All KBAR-0060 tests must comply. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` so Playwright E2E is not required. Testcontainers integration tests fulfill the "E2E equivalent" requirement. |

ADR-001 (API paths), ADR-002 (infrastructure), ADR-003 (CDN), ADR-004 (auth) are not applicable — no HTTP endpoints, no infrastructure, no image storage, no authentication layer.

### Patterns to Follow

- **Testcontainers-based integration tests**: Use `@testcontainers/postgresql` with `postgres:16-alpine` image; configure via `process.env.POSTGRES_*` variables for `@repo/db` compatibility.
- **`skipIf` guard**: Wrap integration test suites with `describe.skipIf(shouldSkip)` using `SKIP_TESTCONTAINERS === 'true'` as the guard condition.
- **Lifecycle management**: `beforeAll` starts container + creates schema + seeds data; `afterAll` stops container + removes temp directories. No shared state across `it` blocks.
- **`CREATE TYPE IF NOT EXISTS`**: All PostgreSQL type creation must use this guard (KBAR-0040 lesson).
- **Direct module import for CLI functions**: Import `dryRunStory`, `dryRunEpic` directly from the script modules for in-process testing, not via subprocess.
- **Real YAML fixtures**: Test story fixture files must use valid YAML matching `StoryFrontmatterSchema` — use `StoryFrontmatterSchema.parse()` to validate test data before writing files.
- **Fail-soft verification**: Batch tests must verify that one failure does not abort the batch — assert that all items are processed and error counts are correct.
- **All story states in test data**: Cover `backlog`, `in-progress`, `ready-to-work`, `uat`, `completed` story states in test fixtures.

### Patterns to Avoid

- **Mocking `@repo/kbar-sync` functions in integration tests** — integration tests must call real functions against real PostgreSQL.
- **`console.log` in test helpers** — use Vitest's built-in reporter or `process.stdout.write` if progress output is needed.
- **Hardcoded UUIDs or checksums** — compute expected checksums using `computeChecksum` from `@repo/kbar-sync` types, not hardcoded values.
- **`as any` casts on test fixture data** — validate fixtures against Zod schemas.
- **Shared mutable state between `it` blocks** — each test should be independent with its own data seeded in the test body or `beforeEach`.

---

## Conflict Analysis

### Conflict: KBAR-0050 Still in ready-to-work (not yet implemented)

- **Severity**: warning (non-blocking)
- **Description**: KBAR-0050 is in `ready-to-work` status. The CLI scripts (`sync-story.ts`, `sync-epic.ts`) and their exported test helpers (`dryRunStory`, `dryRunEpic`) exist in the repository, but KBAR-0050 implementation has not yet been started. KBAR-0060 integration tests import these functions directly. If KBAR-0050 implementation changes function signatures, KBAR-0060 tests must be updated before they can pass.
- **Resolution Hint**: KBAR-0060 PM elaboration can proceed now. Implementation must not begin until KBAR-0050 is merged to main and its exports are stable. The CLI integration test file at `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` already exists with KBAR-0050's AC-11 tests; KBAR-0060 extends rather than replaces those tests.

---

## Story Seed

### Title

Sync Integration Tests

### Description

**Context:**

The `packages/backend/kbar-sync/` package now has a complete set of sync functions (KBAR-0030, KBAR-0040) and CLI commands (KBAR-0050). Unit tests for each story validated individual function behavior in isolation. However, no integration test suite validates the entire sync pipeline end-to-end with:
- Real production-like story data (multi-state, multi-dependency KBAR stories)
- Edge cases: missing files, corrupt YAML, empty directories, cross-epic prefix filtering
- Batch operations at scale with checkpoint resumption
- The full CLI command flow (argument parsing → Zod validation → sync function delegation → output)

**Problem:**

Without integration tests against real PostgreSQL and real-world story fixtures:
- Checksum idempotency across story states is unverified with authentic data
- `sync:epic --epic KBAR` filter correctness is only unit-tested with synthetic data
- Batch checkpoint resumption has not been exercised with real `kbar.sync_checkpoints` rows
- Edge cases unique to real KBAR story YAML structures (multi-dependency frontmatter, large artifact counts) may cause failures not caught by unit tests
- ADR-005 compliance for this phase of KBAR development is incomplete without a full integration pass

**Solution Direction:**

Create a comprehensive integration test suite in `packages/backend/kbar-sync/src/__tests__/` (and extending `scripts/__tests__/integration/`) that:

1. Uses testcontainers (`@testcontainers/postgresql`) against real PostgreSQL to test all story sync scenarios
2. Tests with real KBAR story YAML fixtures covering all story states, artifact types, and dependency structures
3. Validates edge cases: empty directories, corrupt/missing YAML, symlink paths, cross-epic prefix filtering, large batches
4. Exercises the CLI commands (`sync:story`, `sync:epic`) via their exported module functions (`dryRunStory`, `dryRunEpic`, `syncEpicBatch`)
5. Verifies batch performance characteristics: single-query dry-run, checkpoint resumption from pre-seeded state, fail-soft behavior

The test suite runs via `pnpm test:integration --filter @repo/kbar-sync` using the already-configured `vitest.integration.config.ts`.

### Initial Acceptance Criteria

- [ ] **AC-1**: Integration tests for `syncStoryToDatabase` with real story state fixtures
  - Test with story fixtures covering all states: `backlog`, `in-progress`, `ready-to-work`, `uat`, `completed`
  - Verify idempotency: second sync of unchanged story returns `skipped`
  - Verify checksum update: modified story content produces `completed` sync with updated checksum in `kbar.stories`
  - Fixture files must be valid YAML matching `StoryFrontmatterSchema` (validated before writing)
  - Uses testcontainers (real PostgreSQL) — zero mocks

- [ ] **AC-2**: Integration tests for artifact sync functions with real artifact type coverage
  - Test `syncArtifactToDatabase` for all `NonStoryArtifactType` values: `elaboration`, `plan`, `scope`, `evidence`, `review`, `test_plan`, `decisions`, `checkpoint`, `knowledge_context`
  - Verify idempotency per artifact type: second sync returns `skipped` when file unchanged
  - Verify that `batchSyncArtifactsForStory` discovers and syncs all artifacts for a story directory with multiple artifact types present
  - Test handles missing artifact files gracefully (fail-soft: other artifacts sync successfully when one is missing)

- [ ] **AC-3**: Integration tests for conflict detection with story and artifact data
  - Test `detectSyncConflicts`: sync story → modify file → detect conflict returns `hasConflict: true` with `conflictType: 'checksum_mismatch'`
  - Test `detectArtifactConflicts`: sync artifact → modify file → detect conflict returns `hasConflict: true`
  - Test no-conflict scenario: sync then detect without modification returns `hasConflict: false`
  - Verify conflict is recorded in `kbar.sync_conflicts` table with correct checksums

- [ ] **AC-4**: Integration tests for `sync:epic` batch with real KBAR story fixtures
  - Test batch sync of 5+ real KBAR story directories using `batchSyncByType` or `sync:epic` CLI function
  - Test `--epic KBAR` prefix filter: batch only processes stories matching `KBAR-*` prefix, skips `WINT-*` directories in same base
  - Test empty base directory: exits 0 with "no stories found" message, zero DB mutations
  - Test `--epic` filter with no matches: exits 0 with informational message
  - Test fail-soft: one story with corrupt YAML causes that story to fail; remaining stories sync successfully; final exit code reflects failure count

- [ ] **AC-5**: Integration tests for checkpoint resumption with real PostgreSQL
  - Pre-seed `kbar.sync_checkpoints` row with `last_processed_path` pointing to mid-batch position
  - Call `batchSyncByType` with matching `checkpointName` — verify it resumes from seeded position (stories before checkpoint are skipped, stories after are processed)
  - Verify checkpoint row is updated (`last_processed_path`, `total_processed`) after batch completes
  - Test interruption scenario: verify checkpoint state is persisted before batch completes

- [ ] **AC-6**: Dry-run zero-mutation verification with batch queries
  - Verify `dryRunStory` (from `sync-story.ts`) makes zero writes to `kbar.stories` or `kbar.artifacts`
  - Verify `dryRunEpic` (from `sync-epic.ts`) issues exactly ONE batch DB query for N stories (N+1 prevention per KBAR-0040 lesson)
  - Verify row counts in `kbar.stories` and `kbar.artifacts` are identical before and after dry-run execution
  - Test with 3+ story directories in a single `dryRunEpic` call

- [ ] **AC-7**: Edge case integration tests
  - **Symlink path**: Pass symlink path as `storyDir` — verify security rejection before any DB interaction
  - **Path traversal**: Pass `../../etc/passwd` style path — verify rejection with exit 1
  - **Corrupt YAML**: Story directory contains invalid YAML frontmatter — sync fails gracefully with error in `kbar.sync_events` (status: `failed`), does not throw uncaught exception
  - **Missing story file**: Directory exists but `STORY-ID.md` is absent — sync returns appropriate error, no partial DB writes
  - **Unicode in story content**: Story with unicode titles/descriptions syncs correctly; checksum computed from raw bytes

- [ ] **AC-8**: Test infrastructure and configuration
  - All integration tests use `describe.skipIf(process.env.SKIP_TESTCONTAINERS === 'true')` guard
  - Container setup creates complete KBAR schema: all enums, all tables with `IF NOT EXISTS` guards, `sync_checkpoints` table
  - `beforeAll` timeout: 90 seconds (container startup)
  - `afterAll` cleans up container and temp directories
  - Tests run via `pnpm --filter @repo/kbar-sync test:integration` (configured in `vitest.integration.config.ts`)
  - No `as any` casts in test code; all fixture data validated against `StoryFrontmatterSchema`

### Non-Goals

- **Adding new sync functions** — KBAR-0060 tests existing functions only; no new business logic
- **Modifying `@repo/kbar-sync` source files** — tests are additive; sync function implementations are not changed
- **Modifying CLI scripts** (`sync-story.ts`, `sync-epic.ts`) — CLI behavior tested as-is; modifications belong to KBAR-0050 follow-up stories
- **Performance benchmarking** — sync rate measurement and throughput benchmarks are deferred to a future performance story
- **UI or API testing** — no HTTP endpoints, no frontend components
- **Full epic scan of production data** — tests use synthetic temp-directory fixtures, not live `plans/` directory content
- **Automated CI integration** — KBAR-0060 delivers the test suite; CI pipeline integration (e.g., GitHub Actions workflow update) is a separate concern
- **MCP tool integration** — testing the MCP tool layer (KBAR-0070+) is out of scope

### Reuse Plan

- **Test harness**: Copy and adapt testcontainers setup from `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` — most complete schema (all tables + enums with `IF NOT EXISTS`)
- **Existing CLI integration tests**: `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` (KBAR-0050 AC-11) — these tests already exist; KBAR-0060 extends the same file with additional edge case tests
- **Functions under test**: Import `syncStoryToDatabase`, `syncArtifactToDatabase`, `detectSyncConflicts`, `detectArtifactConflicts`, `batchSyncArtifactsForStory`, `batchSyncByType` from `@repo/kbar-sync`; import `dryRunStory`, `dryRunEpic` from CLI scripts
- **Zod schemas for fixture validation**: `StoryFrontmatterSchema`, `NonStoryArtifactTypeSchema` from `@repo/kbar-sync` — validate all fixture data before writing to temp files
- **Packages**: `@testcontainers/postgresql`, `pg`, `drizzle-orm/node-postgres`, `node:fs/promises`, `node:os`, `node:path` (all already in `kbar-sync` devDependencies or dependencies)
- **Vitest config**: `vitest.integration.config.ts` already includes `scripts/**/*.integration.test.ts` — no new config required

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The KBAR-0050 story's `_pm/TEST-PLAN.md` is the best reference for test case structure. KBAR-0060's test plan should mirror the same structure but at the integration layer.
- **Critical test**: AC-6 dry-run zero-mutation must explicitly verify row counts before and after — not just assert that "no errors occurred". A query count assertion (`dryRunEpic` issues exactly 1 DB query) is already demonstrated in the existing CLI integration test and should be preserved.
- **All story states** (AC-1) — generate at least one fixture per story state. The KBAR story index has stories in `ready-to-work`, `uat`, `completed` states — use those state values for fixture frontmatter.
- **All artifact types** (AC-2) — `NonStoryArtifactTypeSchema` enumerates: `elaboration`, `plan`, `scope`, `evidence`, `review`, `test_plan`, `decisions`, `checkpoint`, `knowledge_context`. Each must appear in at least one test.
- Per ADR-005: no mocks in any integration test. The testcontainers pattern from KBAR-0030/0040 is the only acceptable approach.
- Per ADR-006: `frontend_impacted: false` — no Playwright tests required.

### For UI/UX Advisor

Not applicable — this is a backend-only integration test story. No user-facing UI.

### For Dev Feasibility

- **Low implementation risk**: All functions under test already exist and have unit tests. This story adds integration coverage only.
- **Primary new file**: `packages/backend/kbar-sync/src/__tests__/sync-integration.integration.test.ts` — covers AC-1, AC-2, AC-3, AC-7, AC-8 (story + artifact sync integration, conflict detection, edge cases)
- **Extension file**: `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` — extend the existing KBAR-0050 AC-11 file with AC-4, AC-5, AC-6 tests (epic batch, checkpoint resumption, dry-run with real batch data)
- **Estimated complexity**: M (medium) — more complex than typical unit tests due to testcontainers setup and edge case fixture generation, but patterns are well-established
- **Schema setup risk**: KBAR-0030's integration test has a simpler schema (missing `artifact_versions`, `artifact_content_cache`, `sync_checkpoints`). Use KBAR-0040's schema setup as the canonical reference — it includes all tables.
- **`computeChecksum` import**: The existing CLI integration test imports from `../../../src/__types__/index.js` — verify this is still the correct path after KBAR-0050 implementation. The canonical export is `packages/backend/kbar-sync/src/__types__/index.ts`.
- **Canonical references for subtask decomposition**:
  - ST-1: Shared test harness helper (schema creation, testcontainers setup) extracted into `src/__tests__/helpers/testcontainers.ts`
  - ST-2: Story sync integration tests (AC-1, AC-3, AC-7) — new file `src/__tests__/sync-integration.integration.test.ts`
  - ST-3: Artifact sync integration tests (AC-2) — new file or extend `src/__tests__/sync-integration.integration.test.ts`
  - ST-4: Epic batch + checkpoint integration tests (AC-4, AC-5, AC-6) — extend `scripts/__tests__/integration/sync-cli.integration.test.ts`
  - ST-5: Verify all tests pass with `pnpm --filter @repo/kbar-sync test:integration`
