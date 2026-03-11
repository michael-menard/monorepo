---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-0040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the 0019_wint_0040_telemetry_columns.sql migration (applied post-baseline); partial WINT-0040 work was already done by a prior session.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| wint schema (6 schema groups) | `packages/backend/database-schema/src/schema/wint.ts` | Telemetry tables already defined here under schema group 3 |
| agentInvocations table | `wint.ts` line ~657, migration `0015_messy_sugar_man.sql` | Created by WINT-0010; extended by `0019_wint_0040_telemetry_columns.sql` |
| agentDecisions table | `wint.ts` line ~721, same migrations | Created by WINT-0010; extended by `0019` migration |
| agentOutcomes table | `wint.ts` line ~780, same migrations | Created by WINT-0010; extended by `0019` migration |
| stateTransitions table | `wint.ts` line ~849, same migrations | Created by WINT-0010; extended by `0019` migration |
| Drizzle ORM schema pattern | `packages/backend/database-schema/src/schema/wint.ts` | wintSchema = pgSchema('wint'), drizzle-zod for Zod types |
| Drizzle migration runner | `packages/backend/database-schema/src/migrations/app/` | Sequential SQL files, numbered with story name suffix |
| pgvector in lego_dev DB | `infra/compose.lego-app.yaml`, confirmed in KB | Available in the lego_dev (port 5432) PostgreSQL instance |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| WINT-0060 (Graph Tables) | uat | No overlap — graph schema group only |
| WINT-0080 (Seed Initial Workflow Data) | uat | No overlap — seed data only |
| WINT-0090 (Story Management MCP Tools) | uat | No overlap — MCP tools layer |
| WINT-0100 (Context Cache MCP Tools) | uat | No overlap — context_cache schema only |
| WINT-0120 (Telemetry MCP Tools) | pending | Direct downstream dependency: WINT-0120 is blocked on WINT-0040 |

### Constraints to Respect

- wint schema tables live in the `lego_dev` PostgreSQL database (port 5432), NOT the KB database (port 5433). This is a critical architecture boundary from lesson ARCH-001.
- All production DB schemas in `packages/backend/database-schema/` are protected — migration must use an additive, numbered `.sql` file; never drop/modify existing columns without explicit rollback plan.
- Drizzle ORM manages the schema via `packages/backend/database-schema/src/schema/wint.ts` — table definitions must be added in this file, then `db:generate` used to produce the migration.
- pgvector `vector(1536)` embeddings require the vector extension already enabled in lego_dev (present via WINT-0010).
- Drizzle enum comparisons in PostgreSQL require raw SQL casts (`sql` tag) — standard Drizzle query builder doesn't handle wint schema enums correctly.

---

## Retrieved Context

### Related Endpoints
None. This story is pure database schema — no API endpoints involved. WINT-0120 will expose telemetry via MCP tools once WINT-0040 tables exist.

### Related Components
None. No UI components. Backend-only infrastructure story.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `wintSchema` pgSchema declaration | `packages/backend/database-schema/src/schema/wint.ts` line 43 | All new tables use `wintSchema.table(...)` — already exported |
| `agentInvocations` FK pattern | `wint.ts` line ~657 | `hitl_decisions` foreign keys to `agentInvocations.id` should follow the same cascade pattern as `agentDecisions` |
| `createInsertSchema` / `createSelectSchema` pattern | `wint.ts` lines 1717–1736 | drizzle-zod generates insert/select Zod schemas for new tables |
| Migration numbering convention | `packages/backend/database-schema/src/migrations/app/` | Next migration is `0020_wint_0040_hitl_decisions_story_outcomes.sql` (check current max) |
| wint-schema.test.ts describe structure | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` | Existing `AC-004: Telemetry Schema` block must be extended to cover `hitlDecisions` and `storyOutcomes` |
| pgvector `vector` column type | `apps/api/knowledge-base/src/db/schema.ts`, `wint.ts` for knowledge_entries | `vector(1536)` for hitl_decisions.embedding — same dimension as KB embeddings |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Drizzle table with wint schema, indexes, Zod export | `packages/backend/database-schema/src/schema/wint.ts` (lines 657–714 for agentInvocations) | Direct sibling — same file, same pattern, same schema group. hitlDecisions and storyOutcomes should follow this exact structure. |
| Drizzle migration with additive ALTER + CREATE INDEX | `packages/backend/database-schema/src/migrations/app/0019_wint_0040_telemetry_columns.sql` | The prior partial WINT-0040 migration shows the exact format for additive telemetry table migrations |
| Full table creation migration with FK + indexes | `packages/backend/database-schema/src/migrations/app/0015_messy_sugar_man.sql` (lines 10–40) | Shows agent_decisions and agent_invocations CREATE TABLE format for reference |
| Vitest unit test for Drizzle schema | `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` (lines 141–148) | AC-004 describe block to extend; mirrors exactly what new AC tests should look like |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1120]** wint schema lives in lego_dev (port 5432), not the KB database (port 5433). (category: architecture blocker)
  - *Applies because*: Integration tests for new hitlDecisions and storyOutcomes tables must target `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev`. Using port 5433 will fail silently.

- **[APIP-2020]** Drizzle ORM requires raw SQL (`sql` tag) for PostgreSQL enum casts in wint schema. (category: pattern)
  - *Applies because*: If storyOutcomes or hitlDecisions queries filter/sort on any enum-typed column in wint, use `sql\`column::text\`` rather than relying on Drizzle's query builder enum handling.

- **[WINT-1060]** Telemetry hook pre-wire pattern: add comment insertion points in new tables for WINT-3070 (telemetry-log skill). (category: future-work)
  - *Applies because*: WINT-0040 tables are the write targets for WINT-3070. Document expected write patterns in schema JSDoc.

- **[APIP-3020]** High-volume telemetry tables benefit from batch upsert over individual row writes. (category: performance)
  - *Applies because*: The index entry warns that agent_invocations volume "could be high". Index strategy and write pattern should be designed for bulk insert, not row-by-row.

### Blockers to Avoid (from past stories)

- Targeting the wrong PostgreSQL instance in tests (port 5433 vs 5432). ARCH-001 is a confirmed lesson from WINT-1120.
- Forgetting to run `pnpm --filter @repo/database-schema db:generate` after editing wint.ts — the migration SQL must be generated from schema changes, not hand-written for new Drizzle-managed tables.
- Running `pnpm build` only for `@repo/database-schema` is insufficient — `@repo/api-client` and `@repo/app-component-library` also need building to catch type errors (WINT-0010 evidence shows this was needed in iteration 2).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for new tables must connect to real lego_dev database; no in-memory DB mocking |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — this story has no UI/frontend surface (`frontend_impacted: false`) |

### Patterns to Follow

- Define tables in `packages/backend/database-schema/src/schema/wint.ts` using `wintSchema.table()`, with explicit index functions inline.
- Export `insertXxxSchema`, `selectXxxSchema`, `InsertXxx`, `SelectXxx` types via drizzle-zod at the bottom of wint.ts (telemetry Zod schemas section).
- Generate migration via `pnpm --filter @repo/database-schema db:generate` then verify the output SQL before committing.
- Unit tests live in `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — extend the existing `AC-004: Telemetry Schema` describe block.
- Use composite indexes with high-cardinality column first (e.g., `(agent_name, started_at)` not `(started_at, agent_name)`) — established in the 0019 migration comments.

### Patterns to Avoid

- Do NOT hand-write the migration SQL for new Drizzle-managed tables. Use `db:generate` to produce it from schema changes — hand-written SQL will diverge from Drizzle's internal migration state tracking.
- Do NOT add `hitlDecisions` or `storyOutcomes` to `packages/backend/database-schema/src/schema/index.ts` as barrel re-exports — no barrel files per CLAUDE.md.
- Do NOT skip the full `pnpm build` verification step — type errors in dependent packages have been a blocker in prior WINT-0010 iterations.
- Do NOT use raw `VECTOR` SQL in wint.ts — import the `vector` type from `drizzle-orm/pg-core` (see how knowledge-base's schema.ts imports it).

---

## Conflict Analysis

### Conflict: Prior Partial Work (warning)
- **Severity**: warning
- **Description**: Migration `0019_wint_0040_telemetry_columns.sql` already exists and has been applied. It extended the base telemetry tables (agentInvocations, agentDecisions, agentOutcomes, stateTransitions) that were created by WINT-0010. This means the story is NOT starting from scratch — the base tables exist and the extension columns are already applied. The remaining work is to add the two missing tables: `hitl_decisions` (with pgvector embedding) and `story_outcomes`.
- **Resolution Hint**: Review the exact state of `wint.ts` telemetry section (lines ~640–900) to confirm which tables/columns are live. The story index says "agent_invocations, hitl_decisions, and story_outcomes" — `agent_invocations` is done; focus on the two missing tables.

### Conflict: Story Index Terminology vs Schema Reality (warning)
- **Severity**: warning
- **Description**: The story index entry says to create "agent_invocations, hitl_decisions (with embeddings), and story_outcomes tables". In the current wint.ts, the analogous table is `agentDecisions` (not `hitlDecisions`). It is unclear whether `hitlDecisions` is an additional table representing human-in-the-loop decisions with embedding support (distinct from the agent-authored `agentDecisions`), or a rename. The current `agentDecisions` table has no vector/embedding column.
- **Resolution Hint**: Treat `hitlDecisions` as a new, distinct table for human operator decisions during HITL review steps. These are qualitatively different from agent decisions: they require embedding for semantic search (to find similar past HITL interventions). Create `hitl_decisions` as a new table alongside the existing `agent_decisions` table. The `story_outcomes` table is also new — there is no equivalent in the current schema (the `agentOutcomes` table is per-invocation; `storyOutcomes` is a per-story aggregate summary).

---

## Story Seed

### Title
WINT-0040: Create Telemetry Tables — hitl_decisions and story_outcomes

### Description

**Context:** WINT-0010 established the core database schemas for the wint platform, including the initial telemetry group: `agent_invocations`, `agent_decisions`, `agent_outcomes`, and `state_transitions`. A prior partial implementation (migration `0019_wint_0040_telemetry_columns.sql`) extended these base tables with token tracking, quality metrics, and audit enhancement columns. The telemetry schema group in `packages/backend/database-schema/src/schema/wint.ts` is partially complete.

**Problem:** Two critical telemetry tables are missing that are required for full observability:

1. **`hitl_decisions`**: Human-in-the-loop (HITL) decisions made during story review or QA phases need to be stored with semantic embeddings so similar past human decisions can be surfaced during future HITL episodes. The existing `agent_decisions` table captures agent-authored decisions; human operator decisions need their own table with pgvector support to enable "similar past HITL decisions" retrieval.

2. **`story_outcomes`**: Per-story aggregate outcome records are needed to track the end-to-end result of an autonomous development cycle (quality score, total tokens, review iterations, final verdict). The existing `agent_outcomes` is per-invocation; `story_outcomes` is the story-level rollup needed for ML training data and pipeline health reporting.

Without these two tables, WINT-0120 (Telemetry MCP Tools — `workflow_log_decision`, `workflow_get_story_telemetry`) cannot be implemented, and the observability goal of the WINT epic cannot be met.

**Proposed Solution:** Extend `packages/backend/database-schema/src/schema/wint.ts` with two new Drizzle table definitions in the telemetry schema group. Generate the migration via `db:generate`, verify the output SQL, and add/extend unit tests in `wint-schema.test.ts`. The implementation is additive — no existing tables are modified.

### Initial Acceptance Criteria

- [ ] AC-1: `hitl_decisions` table created in `wint` schema with columns: `id` (UUID PK), `invocationId` (FK → agentInvocations.id, nullable — HITL may occur outside an agent invocation), `decisionType` (text, e.g., 'approve', 'reject', 'request_changes', 'escalate'), `decisionText` (text, the operator's stated reasoning), `context` (jsonb, optional structured context snapshot), `embedding` (vector(1536), for semantic similarity search of past HITL decisions), `operatorId` (text, identifier of the human operator), `storyId` (text, the story being reviewed), `createdAt` (timestamptz).
- [ ] AC-2: `hitl_decisions` has appropriate indexes: btree on `storyId`, btree on `operatorId`, btree on `createdAt`, ivfflat on `embedding` (vector_cosine_ops, lists=100 consistent with KB pattern).
- [ ] AC-3: `story_outcomes` table created in `wint` schema with columns: `id` (UUID PK), `storyId` (text unique, FK-style to `wint.stories.storyId`), `finalVerdict` (text, 'pass' | 'fail' | 'cancelled'), `qualityScore` (integer, 0–100), `totalInputTokens` (integer), `totalOutputTokens` (integer), `totalCachedTokens` (integer), `estimatedTotalCost` (numeric, 10/4), `reviewIterations` (integer), `qaIterations` (integer), `durationMs` (integer, wall-clock time from first invocation to final QA), `primaryBlocker` (text, nullable — top blocking issue if failed), `metadata` (jsonb, flexible slot for future fields), `completedAt` (timestamptz), `createdAt` (timestamptz).
- [ ] AC-4: `story_outcomes` has appropriate indexes: unique on `storyId`, btree on `finalVerdict`, btree on `completedAt`, composite btree on `(finalVerdict, completedAt)` (high-cardinality first per established pattern).
- [ ] AC-5: Drizzle migration generated via `pnpm --filter @repo/database-schema db:generate` producing a numbered `.sql` file in `packages/backend/database-schema/src/migrations/app/`; migration is transaction-safe and idempotent (`CREATE TABLE IF NOT EXISTS`).
- [ ] AC-6: `insertHitlDecisionSchema`, `selectHitlDecisionSchema`, `InsertHitlDecision`, `SelectHitlDecision` exported from `wint.ts` (drizzle-zod pattern, consistent with existing telemetry Zod exports at line ~1717).
- [ ] AC-7: `insertStoryOutcomeSchema`, `selectStoryOutcomeSchema`, `InsertStoryOutcome`, `SelectStoryOutcome` exported from `wint.ts`.
- [ ] AC-8: `wint-schema.test.ts` `AC-004: Telemetry Schema` describe block extended to include `hitlDecisions` and `storyOutcomes` existence assertions.
- [ ] AC-9: All existing tests pass (`pnpm --filter @repo/database-schema test`) with no regressions.
- [ ] AC-10: Full build succeeds (`pnpm build`) with no TypeScript errors in `@repo/database-schema`, `@repo/api-client`, and `@repo/app-component-library`.

### Non-Goals

- Do NOT implement MCP tools for reading/writing these tables — that is WINT-0120's scope.
- Do NOT seed data into `hitl_decisions` or `story_outcomes` — these tables will be populated by agents and the MCP tools layer.
- Do NOT modify `agentInvocations`, `agentDecisions`, `agentOutcomes`, or `stateTransitions` — those tables were extended by the prior migration (`0019_wint_0040_telemetry_columns.sql`) and are complete.
- Do NOT add frontend components or API routes — this is a pure database schema story with no UI surface.
- Do NOT add hitlDecisions or storyOutcomes to barrel re-export files (no barrel files per CLAUDE.md).
- Do NOT introduce rollback migrations unless the story's QA process reveals a need — the existing pattern is forward-only migrations.

### Reuse Plan

- **Schema file**: Extend `packages/backend/database-schema/src/schema/wint.ts` in the existing telemetry section (group 3, currently lines ~640–900). Add the two new tables after `stateTransitions`.
- **Patterns**: Follow `agentInvocations` table definition exactly — same index syntax (`index()` / `uniqueIndex()` inline in second arg), same Drizzle-zod exports at the bottom of the file.
- **Packages**: `drizzle-orm/pg-core` for `vector`, `uuid`, `text`, `integer`, `numeric`, `boolean`, `jsonb`, `timestamp`, `index`; `drizzle-zod` for `createInsertSchema`, `createSelectSchema`; `zod` for type inference.
- **Tests**: Extend `wint-schema.test.ts` lines 141–148 (`AC-004: Telemetry Schema`) — minimal additions, no new test files needed.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story is infrastructure-only with no UI or API surface. Testing approach:

1. **Unit tests** in `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` — extend the existing AC-004 describe block with `expect(hitlDecisions).toBeDefined()` and `expect(storyOutcomes).toBeDefined()`. Verify Zod schema exports as well.
2. **Integration tests** should verify that tables can be created and queried against a real PostgreSQL instance. Target `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev` (port 5432, lego_dev database) — NOT port 5433.
3. **No E2E tests** required (ADR-006 skip condition: `frontend_impacted: false`).
4. **pgvector integration test**: At minimum, verify that `hitl_decisions.embedding` can receive and store a `vector(1536)` value without error. Use the same approach as the existing `knowledge_entries` embedding tests in `apps/api/knowledge-base/`.
5. The `story_outcomes` table has a `qualityScore` (0–100) and `estimatedTotalCost` — add Zod schema refinements with `.min(0).max(100)` for quality score similar to how `correctnessScore` has a CHECK constraint on `agentDecisions`.
6. Minimum coverage target: 45% global (per CLAUDE.md) — for this story the existing test suite already exceeds this; new tests need only cover the two new table/schema exports.

### For UI/UX Advisor

Not applicable. This story has no frontend surface. WINT-0040 is a pure database infrastructure story. All observability UI will come in later WINT phases that query these tables via MCP tools.

### For Dev Feasibility

**Implementation path (estimated 2–3 hours):**

1. **Edit `wint.ts`** — Add `hitlDecisions` and `storyOutcomes` table definitions in the telemetry section after `stateTransitions`. The canonical reference is lines 657–714 (agentInvocations). Add Zod schema exports at lines ~1717+ following the established drizzle-zod pattern.

2. **Generate migration** — Run `pnpm --filter @repo/database-schema db:generate`. Inspect the generated SQL to confirm `hitl_decisions` and `story_outcomes` CREATE TABLE statements with all expected indexes. The migration will be numbered after the current maximum (verify with `ls packages/backend/database-schema/src/migrations/app/ | sort | tail -5`).

3. **Apply migration to local dev** — Run `pnpm --filter @repo/database-schema db:migrate` against lego_dev (port 5432) to verify it applies cleanly.

4. **Extend tests** — Add to `wint-schema.test.ts` AC-004 describe block. Import `hitlDecisions` and `storyOutcomes` from wint.ts. Add `expect(hitlDecisions).toBeDefined()` and `expect(storyOutcomes).toBeDefined()`.

5. **Full build verification** — `pnpm --filter @repo/database-schema test` then `pnpm build` to confirm zero TypeScript errors in all dependent packages.

**Key risk: pgvector column in Drizzle.** The `vector` type from `drizzle-orm/pg-core` requires the pgvector extension. The `wint.ts` file currently does NOT import `vector` — the existing telemetry tables don't use it. Check the import block at the top of `wint.ts` (lines 23–37) and add `vector` to the import list. Reference: `apps/api/knowledge-base/src/db/schema.ts` uses `customType` or the `vector` export from drizzle-orm.

**ivfflat index on embedding:** Standard Drizzle index syntax may not support `USING ivfflat ... WITH (lists = 100)`. Check how this is handled in `0015_messy_sugar_man.sql` or the knowledge-base migrations. If Drizzle can't express it natively, use a raw SQL index in a `sql` block within the table definition callback, or add it as a hand-written `CREATE INDEX` statement in the generated migration (post-generation edit).

**Canonical references for subtask decomposition:**
- Table definition: `packages/backend/database-schema/src/schema/wint.ts` lines 657–714
- Prior telemetry migration: `packages/backend/database-schema/src/migrations/app/0019_wint_0040_telemetry_columns.sql`
- Zod export pattern: `packages/backend/database-schema/src/schema/wint.ts` lines 1717–1736
- Test pattern: `packages/backend/database-schema/src/schema/__tests__/wint-schema.test.ts` lines 141–148
