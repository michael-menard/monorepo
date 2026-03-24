---
generated: "2026-03-19"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: CDBE-4030

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file exists (`plans/baselines/` directory absent). Codebase scan performed directly for ground truth.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `EmbeddingClient` in `apps/api/knowledge-base/src/embedding-client/` | Deployed | Production-ready OpenAI client with caching, retry, batch processing, concurrency limiting. CDBE-4030 must reuse this — not call OpenAI directly. |
| `public.embedding_cache` table | Deployed | Content-hash deduplication cache for embedding API calls. Already integrated into `EmbeddingClient`. |
| `public.knowledge_entries.embedding vector(1536)` | Deployed | The only public-schema table currently populated with embeddings. Canonical pattern for inline embedding columns. |
| `pg_notify` on story state changes (`1003_story_notify.sql`) | Deployed | Existing precedent for NOTIFY/LISTEN in the KB database. Fires on `workflow.stories` state changes. Demonstrates the pattern but not used for embedding updates. |
| `workflow.story_embeddings`, `workflow.plan_embeddings` | Pending (CDBE-4010, backlog) | Normalized embedding tables for stories/plans. Upstream dependency at the same phase level. |
| Inline embedding columns on knowledge tables | Pending (CDBE-4020, in_progress) | The five target tables (`lessons_learned`, `adrs`, `code_standards`, `rules`, `cohesion_rules`) will gain embedding columns. CDBE-4030 is blocked on CDBE-4020 completing. |
| `apps/api/knowledge-base/src/db/client.ts` | Deployed | Pool + circuit breaker + `withRetry` pattern. Long-lived LISTEN connections require a **dedicated** pg client, NOT the shared pool. |
| `apps/api/pipeline/src/scheduler/` | Deployed | BullMQ-backed scheduler for pipeline jobs. Could be a model for persistent job-based fallback queue approach. |

### Active In-Progress Work

| Story | State | Risk of Overlap |
|-------|-------|-----------------|
| CDBE-4020 — Embedding Columns on Knowledge Tables | in_progress | Direct blocker. CDBE-4030 cannot begin implementation until CDBE-4020 is merged. The five target tables and their Drizzle schema definitions are being modified now. |
| CDBE-4010 — pgvector Foundation | backlog | Indirect context. CDBE-4010 establishes `workflow.story_embeddings` and `workflow.plan_embeddings`. If CDBE-4030 scope is extended to those tables in future, CDBE-4010 must be merged first. Current CDBE-4030 scope is the five public-schema knowledge tables only. |

### Constraints to Respect

- **Do NOT use `pnpm db:generate`** — known failure (`sets.js` module resolution error, WINT-0040). All migrations must be authored manually.
- **Target DB is `knowledgebase` (port 5433)** — not `lego_dev` (port 5432). All migration SQL must include DB safety preamble.
- **Do NOT reference `wint.*` or `kbar.*` schemas** — these schemas are deprecated and must not appear in new code.
- **Do NOT modify `workflow.ts`** — CDBE-4030 only concerns tables defined in `kb.ts`.
- **`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block** — enforce at migration authoring time.
- **Inline columns only** — do not create separate embedding tables for the five knowledge tables. CDBE-4020 adds inline `embedding vector(1536)` columns; CDBE-4030 populates them.
- **`public.` prefix required** on all pgvector operator references (`public.vector_cosine_ops`).
- **NOTIFY/LISTEN is not durable** — if the worker process is down, notifications are lost. This is acknowledged in risk_notes and must be explicitly addressed in the architecture (worker restart backfill + optional fallback).
- **Worker is flagged `sizing_warning: true`** — infrastructure scope is significant. Decompose into subtasks carefully to avoid scope creep.

---

## Retrieved Context

### Related Endpoints

No new HTTP API endpoints. This story introduces a background worker process (long-running Node.js process), not an HTTP handler. No APIGW/Lambda surface area.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `EmbeddingClient` | `apps/api/knowledge-base/src/embedding-client/index.ts` | Primary reuse target — wraps OpenAI, handles caching, retry, concurrency limiting |
| `createEmbeddingClient()` | `apps/api/knowledge-base/src/embedding-client/index.ts` | Singleton factory — use this, not `new EmbeddingClient()` directly |
| `processBatch()` / `processBatchWithSplitting()` | `apps/api/knowledge-base/src/embedding-client/batch-processor.ts` | Backfill must use batch processing with order preservation and cache coordination |
| `getDbClient()` / `getPool()` | `apps/api/knowledge-base/src/db/client.ts` | Pool for Drizzle queries. LISTEN requires a raw `pg.Client` (not a pool connection). |
| `withRetry()` | `apps/api/knowledge-base/src/db/client.ts` | Transient error retry for DB writes |
| Migration safety preamble pattern | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` lines 28–35 | DB guard DO block for all new migrations |
| `pg_notify` pattern | `apps/api/knowledge-base/src/db/migrations/1003_story_notify.sql` | Existing NOTIFY trigger approach; CDBE-4030 will add similar NOTIFY triggers to the five knowledge tables |
| `SchedulerLoop` / BullMQ | `apps/api/pipeline/src/scheduler/` | Architecture reference for persistent queue fallback (if NOTIFY/LISTEN is deemed insufficient) |
| pgtap test structure | `apps/api/knowledge-base/src/db/migrations/pgtap/1007_pipe_0020_ghost_state_audit_test.sql` | Gold-standard structure for KB pgtap assertions |

### Reuse Candidates

- **EmbeddingClient** — all OpenAI API calls must go through `createEmbeddingClient()`. Do not instantiate or call the OpenAI SDK directly.
- **`withRetry()`** — wrap all DB UPDATE calls that write embeddings back.
- **`processBatchWithSplitting()`** — backfill loop must not fire one embedding per row; use batch processing.
- **Migration safety preamble** — copy DO block from `1007_pipe_0020_ghost_state_audit.sql` lines 28–35 for any NOTIFY trigger migrations.
- **pgtap test template** — copy structure from `1007_pipe_0020_ghost_state_audit_test.sql` for trigger assertion tests.
- **`pg` library** — already a dependency in the knowledge-base package (used in `db/client.ts`). Use `pg.Client` directly (not the pool) for the long-lived LISTEN connection.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| EmbeddingClient — OpenAI calls with caching, retry, batch | `apps/api/knowledge-base/src/embedding-client/index.ts` | Primary reuse target: concurrency limiter, retry config, `generateEmbeddingsBatch()` — all needed by the worker |
| Batch processor with cache coordination | `apps/api/knowledge-base/src/embedding-client/batch-processor.ts` | Backfill must follow this batch-with-cache-dedup pattern to avoid redundant API calls |
| pg_notify trigger pattern | `apps/api/knowledge-base/src/db/migrations/1003_story_notify.sql` | Existing NOTIFY trigger in KB DB — CDBE-4030 adds similar triggers on the five knowledge tables |
| SQL migration with DB safety preamble + idempotent DDL | `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` | Gold standard for KB migration structure — safety check, RAISE NOTICE, idempotent guards |

---

## Knowledge Context

### Lessons Learned

No KB lessons tagged `lesson-learned` were directly matched to embedding worker / NOTIFY / LISTEN patterns. The KB search returned pipeline worker lessons (APIP-1050 workers, BullMQ dead letter queue) with adjacent relevance. Surfaced lessons below are inferred from codebase patterns and CDBE-4020 architectural notes.

- **[CDBE-4010/4020]** HNSW indexes cannot be expressed in Drizzle table definitions — they must live in migration SQL only. (category: pattern)
  - *Applies because*: Any trigger or index added as part of CDBE-4030 must be in migration SQL, not Drizzle schema.

- **[CDBE-4020]** `pnpm db:generate` fails with a `sets.js` module resolution error (WINT-0040). Author all migration SQL manually. (category: blocker)
  - *Applies because*: CDBE-4030 may need a migration to add NOTIFY triggers on the five knowledge tables.

- **[1003_story_notify]** NOTIFY/LISTEN pattern already exists in this DB. A `pg.Client` (not a Pool) must hold the LISTEN connection because pools recycle connections and will silently drop LISTEN subscriptions. (category: pattern)
  - *Applies because*: The embedding worker LISTEN loop must use a raw `pg.Client`, not `getPool()` or `getDbClient()`.

- **[BullMQ / APIP-0020 opp]** A dead letter / fallback queue is architecturally cleaner than polling a main queue's failed bucket. (category: architecture)
  - *Applies because*: NOTIFY/LISTEN is not durable. A fallback polling sweep or periodic backfill cron is required to catch rows missed during worker downtime.

### Blockers to Avoid (from past stories)

- Using `getDbClient()` / the connection pool for a LISTEN subscription — pool recycles connections, dropping LISTEN registrations silently.
- Synchronous embedding generation per INSERT/UPDATE notification — must batch and rate-limit to avoid OpenAI 429 errors.
- Running `CREATE TRIGGER` or `CREATE INDEX CONCURRENTLY` inside a transaction block — PostgreSQL engine rejects both.
- Calling OpenAI directly rather than through `EmbeddingClient` — bypasses caching and retry logic.
- Writing `embedding = result` without NULL handling — application code must tolerate `NULL` embeddings until the backfill completes.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. ADR constraints below are inferred from CDBE-4010/4020 stories and codebase patterns.

| Constraint | Source | Description |
|-----------|--------|-------------|
| HNSW for all new embedding indexes (CDBE-4xxx) | CDBE-4020 arch notes | ivfflat is grandfathered only. All CDBE-4xxx stories use HNSW with `m=16, ef_construction=64` for small tables. |
| Inline columns (not separate tables) for knowledge tables | CDBE-4020 non-goals | CDBE-4020 chose inline columns deliberately. CDBE-4030 must write back to the inline `embedding` column, not a separate table. |
| `public.` prefix on vector operators | CDBE-4020 arch notes | pgvector is installed in the `public` schema. All `vector_cosine_ops` references require `public.vector_cosine_ops`. |
| No `wint.*` or `kbar.*` schemas | Project memory | Dead schemas must not appear in any new code. |

### Patterns to Follow

- Reuse `createEmbeddingClient()` — do not call OpenAI SDK directly.
- Use `processBatchWithSplitting()` for backfill batch processing.
- Use a dedicated `pg.Client` (not the pool) for the LISTEN connection.
- Include a DB safety preamble DO block in all new migration SQL.
- Implement a periodic polling fallback (cron or interval) to catch rows with `embedding IS NULL` as a reliability backstop to NOTIFY/LISTEN.
- Rate-limit calls to OpenAI: respect `maxConcurrentRequests` config in `EmbeddingClient` (default: 10). For backfill, consider lowering to 3-5 to stay within OpenAI tier limits.
- Write embeddings back via `UPDATE ... SET embedding = $1, updated_at = NOW() WHERE id = $2`.
- Log all embedding write failures with `@repo/logger` — do not swallow errors silently.

### Patterns to Avoid

- Do NOT read from or write to `wint.*` or `kbar.*` schemas.
- Do NOT use `console.log` — use `@repo/logger`.
- Do NOT use TypeScript interfaces for type definitions — use Zod schemas with `z.infer<>`.
- Do NOT create a barrel file (`index.ts` re-exports) for the worker module.
- Do NOT run the worker as a Lambda function — NOTIFY/LISTEN requires a persistent connection; Lambda's stateless, short-lived model is incompatible.
- Do NOT assume `embedding IS NOT NULL` in any query that runs before backfill completes.
- Do NOT ignore the `sizing_warning` flag — this story is large. Decompose into at minimum: (1) NOTIFY triggers migration, (2) worker process core loop, (3) backfill script.

---

## Conflict Analysis

### Conflict: blocking_dependency — CDBE-4020 not yet merged
- **Severity**: blocking
- **Description**: CDBE-4030 implementation requires the `embedding vector(1536)` columns to exist on `lessons_learned`, `adrs`, `code_standards`, `rules`, and `cohesion_rules`. CDBE-4020 is in_progress as of 2026-03-19. The NOTIFY triggers and worker UPDATE logic both depend on these columns existing.
- **Resolution Hint**: Do not begin any ST that writes to or reads `embedding` columns until CDBE-4020 is confirmed merged. Elaboration and test planning are fully unblocked.

### Conflict: architecture_risk — NOTIFY/LISTEN durability gap
- **Severity**: warning
- **Description**: `pg_notify` events are lost if the worker is down. This is noted in `risk_notes` but the story description does not explicitly define the fallback mechanism. Without a fallback, tables will accumulate `NULL` embeddings after any worker restart or deployment.
- **Resolution Hint**: Scope MUST include: (a) periodic polling sweep (`SELECT id FROM <table> WHERE embedding IS NULL LIMIT N`) as a reliability backstop, and (b) backfill script for initial population of all existing rows. The NOTIFY/LISTEN path handles new writes; the polling path covers durability gaps. Escalating to SQS is out of scope for this story — document as a future enhancement.

### Conflict: sizing_risk — large scope flagged
- **Severity**: warning
- **Description**: `sizing_warning: true` in story YAML. The scope spans: SQL migrations for NOTIFY triggers on five tables, a long-running worker process (LISTEN loop, rate-limited batch processor, DB write-back, error handling), and a backfill script. This is three distinct deliverables with non-trivial infrastructure concerns.
- **Resolution Hint**: Decompose into at minimum three subtasks. If token estimate for the worker process alone exceeds 30K, consider splitting the worker (LISTEN loop + single-table write-back) from the full five-table coverage.

---

## Story Seed

### Title
Embedding Worker Process and Backfill

### Description

**Context**: CDBE-4020 (in_progress) adds `embedding vector(1536)` columns to five public-schema knowledge tables (`lessons_learned`, `adrs`, `code_standards`, `rules`, `cohesion_rules`). After CDBE-4020 merges, all existing and future rows on these tables will have `embedding = NULL` until a worker populates them. The `EmbeddingClient` already handles OpenAI API calls with caching and retry for `knowledge_entries`. The KB database already has a `pg_notify` trigger pattern in place (`1003_story_notify.sql`).

**Problem**: There is no process that (a) listens for new/updated rows on the five knowledge tables and generates embeddings asynchronously, or (b) backfills the existing rows. Without this worker, semantic search across all KB entity types — a prerequisite for retrieval-augmented generation and agent context lookup — will never have data to query.

**Proposed Solution**:
1. A SQL migration adds `pg_notify` calls to INSERT/UPDATE triggers on each of the five knowledge tables, publishing a notification channel (e.g., `knowledge_embedding_needed`) with the table name and row ID as payload.
2. A long-running Node.js worker process holds a dedicated `pg.Client` LISTEN connection, receives notifications, batches them (with deduplication and rate limiting), calls `EmbeddingClient.generateEmbeddingsBatch()`, and writes embeddings back via UPDATE.
3. A periodic polling fallback runs on a configurable interval, scanning each table for `embedding IS NULL` rows and feeding them through the same embedding pipeline. This guards against notifications lost during worker downtime.
4. A one-time backfill script processes all existing NULL-embedding rows at startup (or on-demand), using the same batch processing path.

The worker is a standalone process (not Lambda), likely colocated with the knowledge-base package. NOTIFY/LISTEN is the primary path; polling is the durability backstop. SQS escalation is explicitly deferred to a future story.

### Initial Acceptance Criteria

- [ ] **AC-1**: A SQL migration adds NOTIFY trigger functions to all five knowledge tables (`lessons_learned`, `adrs`, `code_standards`, `rules`, `cohesion_rules`) that fire on INSERT and relevant UPDATE events. The trigger calls `pg_notify('knowledge_embedding_needed', json_build_object('table', '<table_name>', 'id', NEW.id::text)::text)`. Migration includes DB safety preamble, is idempotent, and targets `knowledgebase` DB only.

- [ ] **AC-2**: A pgtap test file verifies: (a) trigger exists on all five tables for INSERT, (b) trigger exists on all five tables for UPDATE, (c) notify channel payload contains `table` and `id` fields.

- [ ] **AC-3**: A worker module (`embedding-worker.ts` or equivalent) exposes a class/function that: accepts `EmbeddingClient` and a `pg.Client` as constructor/config parameters (injectable for testing), subscribes to `knowledge_embedding_needed` via LISTEN, batches incoming notifications by table within a configurable window (default: 50ms or 25 items), generates embeddings via `EmbeddingClient.generateEmbeddingsBatch()`, and writes results back via `UPDATE <table> SET embedding = $1, updated_at = NOW() WHERE id = $2`.

- [ ] **AC-4**: The worker handles failures gracefully: individual row failures are logged via `@repo/logger` and do not crash the worker loop; the notification is NOT re-queued (stateless delivery — lost notifications are covered by the polling fallback); transient OpenAI errors are retried via `EmbeddingClient`'s built-in retry logic.

- [ ] **AC-5**: A polling fallback runs on a configurable interval (default: 5 minutes). On each tick, it queries each of the five tables for `WHERE embedding IS NULL LIMIT 100`, generates embeddings for the batch, and writes them back. This run is skipped if the previous run has not completed (no overlap).

- [ ] **AC-6**: A backfill function (callable at worker startup and as a standalone script) processes all `embedding IS NULL` rows across all five tables in batches of configurable size (default: 50), with a configurable inter-batch delay (default: 500ms) to respect OpenAI rate limits.

- [ ] **AC-7**: The worker process handles SIGTERM and SIGINT gracefully: finishes any in-flight batch, releases the LISTEN `pg.Client`, and exits with code 0.

- [ ] **AC-8**: All Zod schemas are defined in `__types__/index.ts` for: worker config (pollIntervalMs, batchSize, batchWindowMs, backfillBatchSize, backfillDelayMs), notification payload schema (`{ table: z.string(), id: z.string().uuid() }`), and embedding write result.

- [ ] **AC-9**: Unit tests cover: notification batching logic (window + size triggers), polling fallback skip-if-running guard, backfill batch-with-delay loop, graceful shutdown sequence. Tests use injected mock `EmbeddingClient` and mock `pg.Client` — no real DB or OpenAI calls in unit tests.

- [ ] **AC-10**: `pnpm check-types --filter @repo/knowledge-base` exits 0 after all changes. No use of TypeScript `interface` — all types via `z.infer<>`.

- [ ] **AC-11**: Worker startup log (via `@repo/logger`) records: DB connection established, LISTEN subscription active, backfill starting, backfill complete (with row counts per table).

### Non-Goals

- Do NOT implement SQS as the primary queue mechanism — that is explicitly deferred. NOTIFY/LISTEN + polling fallback is the MVP durability model.
- Do NOT populate `workflow.story_embeddings` or `workflow.plan_embeddings` — those are separate tables in CDBE-4010's scope.
- Do NOT modify `public.knowledge_entries` embedding logic — that table already has embeddings managed by the existing `EmbeddingClient` usage elsewhere.
- Do NOT deploy the worker as a Lambda function — NOTIFY/LISTEN requires a persistent connection.
- Do NOT change HNSW indexes or the `embedding` column definitions — those are CDBE-4020's responsibility.
- Do NOT create `wint.*` or `kbar.*` schema references.
- Do NOT implement a UI or API endpoint for triggering backfill — a script is sufficient.
- Do NOT implement cross-table semantic search — that is downstream search functionality, not this story's scope.

### Reuse Plan

- **Components**: `EmbeddingClient` (via `createEmbeddingClient()`), `processBatchWithSplitting()` from `batch-processor.ts`, `withRetry()` from `db/client.ts`
- **Patterns**: Migration safety preamble from `1007_pipe_0020_ghost_state_audit.sql`, pgtap test structure from `1007_pipe_0020_ghost_state_audit_test.sql`, pg_notify trigger pattern from `1003_story_notify.sql`
- **Packages**: `pg` (direct `pg.Client` for LISTEN), `drizzle-orm` (for UPDATE queries), `@repo/logger`, `zod`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The worker process has no HTTP surface area — testing is unit (mocked pg.Client + mocked EmbeddingClient) and integration (real DB + real NOTIFY).
- Integration tests must verify: INSERT to a knowledge table fires NOTIFY, worker receives notification, `embedding` column is populated, not-null constraint remains satisfied after backfill.
- The polling fallback needs explicit test coverage for the "skip if previous run not complete" guard — this is a concurrency boundary.
- Graceful shutdown (SIGTERM) must be tested — verify in-flight batch completes before process exit.
- No Playwright E2E tests are applicable (no UI).
- Test the durability gap explicitly: stop the worker, insert rows, restart the worker — verify polling fallback catches the missed notifications.
- Rate limiting: test that backfill with a large number of NULL rows does not hammer the OpenAI API — verify inter-batch delay fires.

### For UI/UX Advisor

Not applicable. This is a pure backend worker process with no user-facing surface area. Operational visibility (startup logs, error logs, batch counts) is via `@repo/logger` output, not UI.

### For Dev Feasibility

- **Subtask decomposition** (recommended minimum):
  - ST-1: NOTIFY trigger migration for all five knowledge tables + pgtap tests (covers AC-1, AC-2). ~10K tokens. Blocked on CDBE-4020 merge.
  - ST-2: Worker core — Zod schemas, LISTEN loop, batch window, embedding call, DB write-back, unit tests (covers AC-3, AC-4, AC-8, AC-9, AC-10 partial). ~20K tokens.
  - ST-3: Polling fallback + backfill script + graceful shutdown + startup logging (covers AC-5, AC-6, AC-7, AC-11). ~14K tokens.

- **Long-lived LISTEN connection**: Use a raw `pg.Client`, not `getPool()`. Call `client.connect()` once at startup. Handle `client.on('error', ...)` — reconnect with exponential backoff on unexpected disconnect.

- **Drizzle UPDATE for nullable vector column**: Drizzle supports updating custom types. Pattern: `await db.update(<table>).set({ embedding: vector }).where(eq(<table>.id, id))`. Verify the `vector` customType's `toDriver()` function serializes correctly for UPDATE (it does — same as INSERT).

- **OpenAI rate limits**: `EmbeddingClient` caps at `maxConcurrentRequests: 10` by default. For backfill, instantiate with `maxConcurrentRequests: 3` to avoid hitting tier limits on large tables.

- **Canonical references for implementation**:
  - `apps/api/knowledge-base/src/embedding-client/index.ts` — EmbeddingClient API
  - `apps/api/knowledge-base/src/embedding-client/batch-processor.ts` — batch processing pattern
  - `apps/api/knowledge-base/src/db/migrations/1003_story_notify.sql` — NOTIFY trigger structure
  - `apps/api/knowledge-base/src/db/migrations/1007_pipe_0020_ghost_state_audit.sql` — migration safety preamble
