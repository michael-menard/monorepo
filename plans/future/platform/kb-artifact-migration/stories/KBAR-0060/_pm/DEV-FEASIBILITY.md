# Dev Feasibility Review: KBAR-0060 — Sync Integration Tests

**Generated:** 2026-02-20
**Story:** KBAR-0060
**Reviewer:** pm-dev-feasibility-review worker
**Overall Feasibility:** FEASIBLE — Low implementation risk

---

## Summary

KBAR-0060 is a pure integration test story. All functions under test already exist in `packages/backend/kbar-sync/` and have unit test coverage. This story adds integration-layer verification using real PostgreSQL (testcontainers). The testcontainers pattern and schema setup are already established in KBAR-0030/0040 integration tests — KBAR-0060 copies and extends those patterns.

**Risk Level:** Low-Medium
- Low: All target functions exist; patterns are established; existing integration test files provide direct copy-paste starting points
- Medium: Testcontainers setup complexity, edge case fixture generation, and the dependency on KBAR-0050 being stable before implementation begins

---

## Dependency Gate

**BLOCKING DEPENDENCY:** KBAR-0050 (CLI Sync Commands) must be merged to `main` before KBAR-0060 implementation starts.

- `dryRunStory` and `dryRunEpic` are imported from KBAR-0050's CLI scripts
- If KBAR-0050 function signatures change during UAT, KBAR-0060 tests must be updated
- The existing CLI integration test at `scripts/__tests__/integration/sync-cli.integration.test.ts` already covers KBAR-0050 AC-11 — KBAR-0060 extends this file; do not replace it

---

## Affected Files

| File | Action | Notes |
|------|--------|-------|
| `packages/backend/kbar-sync/src/__tests__/helpers/testcontainers.ts` | CREATE | Shared helper: schema creation SQL, container lifecycle, `skipIf` guard |
| `packages/backend/kbar-sync/src/__tests__/sync-integration.integration.test.ts` | CREATE | New integration test file: AC-1, AC-2, AC-3, AC-7, AC-8 |
| `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` | EXTEND | Add AC-4, AC-5, AC-6 test cases to existing KBAR-0050 AC-11 file |

**No other files modified.** KBAR-0060 is additive only.

---

## Complexity Assessment: M (Medium)

| Factor | Assessment |
|--------|------------|
| New business logic | None — tests only |
| Testcontainers setup | Already established pattern (KBAR-0040) |
| Edge case fixture generation | Moderate complexity (symlinks, unicode, corrupt YAML) |
| Schema verification | Must use KBAR-0040 schema as canonical (includes `sync_checkpoints`) |
| Checkpoint resumption test | Requires pre-seeding DB state + verifying skip logic |
| N+1 query count assertion (AC-6) | Requires pg query instrumentation — moderate complexity |
| Story state coverage | 5 fixtures minimum; straightforward |
| Dependency stability | KBAR-0050 must be stable; otherwise re-sync of tests needed |

Story points estimate: **5** (M complexity)

---

## Reuse Plan

### 1. Testcontainers Shared Helper (ST-1)

Extract into `src/__tests__/helpers/testcontainers.ts`:

```typescript
// src/__tests__/helpers/testcontainers.ts
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type pg from 'pg'

export async function startKbarTestContainer(): Promise<{
  container: StartedPostgreSqlContainer
  client: pg.Client
}> {
  // ... container startup + env var injection
}

export async function createKbarSchema(client: pg.Client): Promise<void> {
  // Full schema SQL from artifact-sync.integration.test.ts
  // with CREATE TYPE IF NOT EXISTS and CREATE TABLE IF NOT EXISTS guards
}

export function makeSkipGuard(): boolean {
  return process.env.SKIP_TESTCONTAINERS === 'true'
}
```

**Why extract:** KBAR-0030 lesson — avoid duplicating schema setup SQL across test files.

### 2. Canonical Schema Reference

Use `artifact-sync.integration.test.ts` schema verbatim (most complete):
- All 6 enums with `CREATE TYPE IF NOT EXISTS`
- All 7 tables with `CREATE TABLE IF NOT EXISTS` (including `sync_checkpoints`, `artifact_versions`, `artifact_content_cache`)
- Do NOT use `integration.integration.test.ts` schema — it is incomplete (missing `sync_checkpoints`)

### 3. CLI Functions (AC-4, AC-5, AC-6)

```typescript
// Direct module import — NOT subprocess invocation (KBAR-0050 lesson)
import { dryRunStory } from '../../../scripts/sync-story.js'
import { dryRunEpic } from '../../../scripts/sync-epic.js'
```

Verify exact export paths after KBAR-0050 is merged. Canonical source: `packages/backend/kbar-sync/scripts/sync-story.ts` and `scripts/sync-epic.ts`.

### 4. Zod Schema Fixture Validation

```typescript
import { StoryFrontmatterSchema, NonStoryArtifactTypeSchema } from '@repo/kbar-sync'

// MUST validate fixtures before writing to disk
const frontmatter = StoryFrontmatterSchema.parse({
  id: 'KBAR-TEST-001',
  title: 'Test Story',
  status: 'backlog',
  // ...
})
```

**No `as any` casts.** All test data validated at fixture creation time.

---

## Implementation Risks

### Risk 1: KBAR-0050 export path uncertainty
- **Likelihood:** Low-Medium
- **Impact:** High (compilation failures)
- **Mitigation:** Verify `dryRunStory` and `dryRunEpic` export paths immediately after KBAR-0050 is merged. The existing CLI integration test at `scripts/__tests__/integration/sync-cli.integration.test.ts` already imports these — use the same import pattern.

### Risk 2: N+1 query count assertion (AC-6)
- **Likelihood:** Medium
- **Impact:** Medium (may require pg query log instrumentation)
- **Mitigation:** Use `pg.Client` query event listener or a wrapper to count queries. The existing CLI integration test demonstrates `dryRunEpic` with query assertions — check if query count is already tracked there. If not, add a simple query counter: `let queryCount = 0; client.on('query', () => queryCount++)`

### Risk 3: Checkpoint interruption simulation (AC-5 TC-5.3)
- **Likelihood:** Medium
- **Impact:** Low (can defer interruption test to a future story)
- **Mitigation:** If interruption simulation is complex (requires hooking internal state), simplify AC-5 TC-5.3 to verify checkpoint state after partial manual pre-seeding rather than live interruption simulation.

### Risk 4: Symlink test on CI (AC-7 TC-7.1)
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:** Use `node:fs.symlinkSync` in temp directory. Wrap in try/catch in case the CI environment does not allow symlinks — skip that specific assertion with a warning rather than failing the test.

---

## Proposed Subtask Breakdown

### ST-1: Shared Test Harness Helper
**File:** `packages/backend/kbar-sync/src/__tests__/helpers/testcontainers.ts`
**Scope:** Extract container startup, KBAR schema creation SQL (all 7 tables + 6 enums with IF NOT EXISTS), `skipIf` guard function, temp dir utilities
**Pattern:** `packages/backend/kbar-sync/src/__tests__/artifact-sync.integration.test.ts` (lines 38-187)
**AC coverage:** AC-8
**Estimate:** 1 subtask — ~1.5 hours

### ST-2: Story Sync Integration Tests
**File:** `packages/backend/kbar-sync/src/__tests__/sync-integration.integration.test.ts`
**Scope:** AC-1 (all story states, idempotency, checksum update), AC-3 (conflict detection for stories), AC-7 (edge cases: symlink, path traversal, corrupt YAML, missing file, unicode)
**Pattern:** `packages/backend/kbar-sync/src/__tests__/integration.integration.test.ts` (story sync patterns) + `artifact-sync.integration.test.ts` (testcontainers setup — via shared helper ST-1)
**AC coverage:** AC-1, AC-3, AC-7
**Estimate:** 1 subtask — ~2 hours

### ST-3: Artifact Sync Integration Tests
**File:** `packages/backend/kbar-sync/src/__tests__/sync-integration.integration.test.ts` (extend same file or add `describe` block)
**Scope:** AC-2 (all 9 artifact types, idempotency per type, batch discovery, fail-soft for missing file), AC-3 artifact-level conflict detection
**Pattern:** `artifact-sync.integration.test.ts` (AC-1, AC-4 patterns)
**AC coverage:** AC-2, AC-3 (artifact portion)
**Estimate:** 1 subtask — ~1.5 hours

### ST-4: Epic Batch + Checkpoint + Dry-Run Integration Tests
**File:** `packages/backend/kbar-sync/scripts/__tests__/integration/sync-cli.integration.test.ts` (extend existing)
**Scope:** AC-4 (5+ stories, epic prefix filter, empty dir, fail-soft), AC-5 (checkpoint resumption, row update), AC-6 (dry-run zero mutation, exactly 1 batch query, row count verification)
**Pattern:** Existing KBAR-0050 AC-11 tests in same file (direct module import pattern)
**AC coverage:** AC-4, AC-5, AC-6
**Estimate:** 1 subtask — ~2.5 hours

### ST-5: Integration Verification Pass
**Scope:** Run `pnpm --filter @repo/kbar-sync test:integration` — verify all new tests pass, no regressions in existing integration tests, `SKIP_TESTCONTAINERS=true` skips all correctly, no `as any` casts, no barrel file imports
**AC coverage:** AC-8 (infrastructure verification)
**Estimate:** 1 subtask — ~30 minutes

---

## Infrastructure Notes

No new infrastructure required:
- `@testcontainers/postgresql` already in `kbar-sync` devDependencies
- `pg` already in dependencies
- `vitest.integration.config.ts` already configured (includes `scripts/**/*.integration.test.ts`)
- No new NPM packages needed
- No new Drizzle schemas (tests interact via raw `pg.Client` queries for schema setup, then use `@repo/kbar-sync` functions for the actual test operations)

---

## Quality Gates for Implementation

Before marking KBAR-0060 complete, verify:

- [ ] `pnpm --filter @repo/kbar-sync test:integration` passes with 0 failures
- [ ] `SKIP_TESTCONTAINERS=true pnpm --filter @repo/kbar-sync test:integration` skips all integration tests cleanly
- [ ] Zero `as any` casts in any new test file
- [ ] All 5 story states represented in test fixtures
- [ ] All 9 `NonStoryArtifactType` values covered in AC-2 tests
- [ ] Schema uses `CREATE TYPE IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` throughout
- [ ] `afterAll` cleans up container and all temp directories
- [ ] `beforeAll` timeout is 90 seconds (not default 5s)
- [ ] No barrel file imports (import directly from source, not re-export index)
- [ ] Shared helper extracted to `src/__tests__/helpers/testcontainers.ts` (not duplicated)
