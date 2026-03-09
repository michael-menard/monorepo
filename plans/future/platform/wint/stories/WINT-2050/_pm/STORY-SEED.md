---
generated: "2026-03-03"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-2050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: None critical. Baseline predates several WINT Phase 2 story completions (WINT-2030, WINT-2040 now in progress), but core infrastructure is confirmed active.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `wint.context_packs` table | Active (WINT-0010, protected) | Stores all cache entries — the write target for this story |
| `contextCachePut()` MCP tool | UAT-complete (WINT-0100, 2026-02-16) | Primary write mechanism for cache population |
| `contextCacheGet()` MCP tool | UAT-complete (WINT-0100) | Used to validate cached content |
| KB pgvector store (`knowledgeEntries`) | Active at port 5433 | Contains lessons learned, ADRs, decisions — primary read source |
| WINT-2030 populate script | needs-code-review | Precedent: reads static docs, extracts structured JSONB, writes via `contextCachePut()` — same architecture this story follows |
| WINT-2040 agent-mission populator | in-progress | Sibling story for agent mission cache — will share the same `context_packs` table and upsert pattern |
| Drizzle ORM v0.44.3 | Active | Used for direct DB access in populate scripts |
| `@repo/db` connection pooling | Active | Required for script DB access |

### Active In-Progress Work

| Story | Area | Overlap Risk |
|-------|------|-------------|
| WINT-2030 | `packages/backend/mcp-tools/src/scripts/` | Low — different script file, but shares `contextCachePut()` and integration test patterns |
| WINT-2040 | `packages/backend/mcp-tools/src/scripts/` | Low — different packType/packKey namespace; WINT-2040 writes `agent_missions` type (deferred enum addition), this story uses existing pack types |

### Constraints to Respect

- `wint.context_packs` is protected (WINT-0010) — do NOT modify the schema
- Do not add new `contextPackTypeEnum` values — use only existing: `codebase`, `story`, `feature`, `epic`, `architecture`, `lessons_learned`, `test_patterns`
- Database for populate scripts is port 5432 (lego_dev) — NOT port 5433 (KB database). This is the #1 historical integration test failure for WINT stories (ARCH-001 pattern from WINT-2030 evidence)
- `@repo/db` client is the only DB connection approach for backend scripts
- All types via Zod schemas — no TypeScript interfaces

---

## Retrieved Context

### Related Endpoints

None — this is a backend populate script (no HTTP endpoints). The story writes to the database directly via `contextCachePut()`.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `contextCachePut()` | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Primary write mechanism |
| `contextCacheGet()` | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Optional verification of written content |
| `ContextCachePutInputSchema` | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Input validation; note `packTypeValues` array does NOT yet include `agent_missions` |
| `populateProjectContext()` | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Directly analogous script — this story follows the same architecture |
| KB search (`kb_search`) | `apps/api/knowledge-base/src/` (MCP tool) | Read source for lessons, ADRs, decisions |

### Reuse Candidates

| Candidate | Source | Usage |
|-----------|--------|-------|
| Resilient execution loop pattern | `populate-project-context.ts` lines 304–346 | Sequential pack writes with try/catch, summary counts |
| `readDoc()` helper | `populate-project-context.ts` lines 43–53 | File reading with error handling — useful for reading `plans/stories/ADR-LOG.md` |
| `extractSections()` helper | `populate-project-context.ts` lines 59–81 | Markdown section extraction by `##` heading |
| Integration test pattern | `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` | `beforeEach`/`afterEach` cleanup with real PostgreSQL |
| `PopulateResultSchema` | `populate-project-context.ts` | Reuse exact same result schema (`{ attempted, succeeded, failed }`) |
| `MONOREPO_ROOT` resolution | `populate-project-context.ts` line 30 | `resolve(import.meta.dirname ?? __dirname, '../../../../../')` |

### Similar Stories

| Story | Relationship |
|-------|-------------|
| WINT-2030 | Direct predecessor — same populate-script pattern, same write mechanism, same test strategy. This story is the domain KB equivalent |
| WINT-2040 | Sibling — agent mission cache populator. Same base pattern, different content domain |
| WINT-2060 | Successor — library patterns cache (React 19, Vitest API). Same pattern family |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Populate script (primary model) | `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` | Complete implementation of the exact same pattern: read docs, extract structured JSONB, write via `contextCachePut()`, resilient loop, summary result |
| Cache write (upsert) | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | The only write path — upsert on `(packType, packKey)` composite unique constraint |
| Zod schemas + pack types | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | `packTypeValues` enum — must use only values already defined here |
| Integration test pattern | `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` | `beforeEach`/`afterEach` cleanup, real PostgreSQL on port 5432 |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2030]** Sequential `contextCachePut` calls should use a resilient try/catch loop — individual pack failures must not abort the run. Summary counts (`attempted`, `succeeded`, `failed`) provide observable outcomes. (category: pattern)
  - *Applies because*: This story writes multiple domain KB packs; same resilience pattern required.

- **[WINT-2030]** Content JSONB must be a structured object (not a raw string dump) with at minimum a `summary` field. Content length < 8000 chars per pack guards injection budget. (category: pattern)
  - *Applies because*: Domain KB packs (ADRs, lessons) extracted from the KB will need structured JSONB with bounded length.

- **[WINT-2040 opp-1]** The `packTypeValues` array in `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` does NOT include `agent_missions`. This story must also use only existing pack types — no new enum values allowed without a DB migration. (category: constraint)
  - *Applies because*: The `domain_kb` pack type does not exist in the enum. Story must use one of the existing types: `lessons_learned` is the appropriate fit.

- **[WINT-2040 opp-2]** Populate scripts could emit structured telemetry for cache population success rate and parse failure distribution. (category: future-work, non-blocking)
  - *Applies because*: Worth noting as a non-blocking future opportunity, not MVP scope.

- **[WINT-2030]** Parallel cache writes with `Promise.allSettled()` would improve performance over sequential loops. (category: future-work, non-blocking)
  - *Applies because*: If N packs are written, parallelization is possible but not required for MVP.

### Blockers to Avoid (from past stories)

- **Wrong database port**: Integration tests must use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev` (port 5432). Port 5433 is the KB database (pgvector) — tests accidentally targeting it cause silent failures. This is ARCH-001 for WINT populate stories.
- **New packType enum values**: Do not attempt to add a `domain_kb` or any other new packType without a DB migration story. Use `lessons_learned` for ADR/lesson/blocker packs, `architecture` for structural patterns.
- **Raw content dump**: Do not store the entire ADR-LOG.md or raw KB query results as-is. Always extract into structured `{ summary, adrs?, lessons?, blockers? }` JSONB objects within token budget.
- **Shared context object in tests**: Use factory functions returning fresh context objects per test (not shared module-level context) — avoids CIRCULAR_DEPENDENCY issues in MCP test patterns.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests against real PostgreSQL; no in-memory DB mocking |
| ADR-006 | E2E Tests Required in Dev Phase | Backend-only story (no UI) → E2E not applicable; integration tests satisfy this |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not relevant to this story.

### Patterns to Follow

- Import `contextCachePut` directly from its source file — no barrel files
- Use `@repo/logger` for all logging — never `console.log`
- Zod-first: define result schema with `z.object()`, infer type with `z.infer<>`
- Resilient execution: each pack write in independent try/catch; log errors, increment `failed` count, continue
- Script runnable via `pnpm tsx` with inline JSDoc documenting the run command and `DATABASE_URL` requirement
- Integration test uses real PostgreSQL at port 5432 with `beforeEach`/`afterEach` cleanup
- TTL of 30 days (`2592000` seconds) consistent with WINT-2030 domain knowledge packs

### Patterns to Avoid

- Do not use `console.log` — use `@repo/logger`
- Do not use TypeScript interfaces — use Zod schemas
- Do not create barrel files
- Do not target port 5433 in integration tests
- Do not add new packType enum values without a DB migration
- Do not store raw KB query results as content — always extract into structured JSONB

---

## Conflict Analysis

### Conflict: Missing packType for domain KB
- **Severity**: warning (non-blocking)
- **Description**: The index entry says "populate `context_cache.domain_kb`" but there is no `domain_kb` table or packType enum value. The `context_packs` table is the actual storage, and the valid packTypes are `codebase`, `story`, `feature`, `epic`, `architecture`, `lessons_learned`, `test_patterns`. There is no `domain_kb` packType.
- **Resolution Hint**: Use `packType: 'lessons_learned'` for ADR and lessons-based packs, and `packType: 'architecture'` for structural patterns. The packKey values (e.g., `domain-kb-frontend`, `domain-kb-backend`, `domain-kb-testing`) provide the area-based disambiguation. No new enum value needed.

### Conflict: Dependency clarification (WINT-2020, WINT-0030)
- **Severity**: warning (informational)
- **Description**: The index lists depends_on: [WINT-2020, WINT-0030, WINT-0100]. As established in WINT-2030 and WINT-2040, WINT-2020 (Context Pack Sidecar) and WINT-0030 (Context Cache Tables) are not actual blockers. The `wint.context_packs` table was delivered by WINT-0010. `contextCachePut()` operates standalone. Only WINT-0100 is a real blocker (it is UAT-complete as of 2026-02-16).
- **Resolution Hint**: Actual dependencies are: WINT-0010 (table), WINT-0100 (MCP tools). WINT-2020 and WINT-0030 can be removed from `depends_on` in the final story.

---

## Story Seed

### Title

Populate Domain Knowledge Cache from ADR-LOG, KB Lessons, and Architecture Docs

### Description

**Context**: The WINT platform's Phase 2 goal is 80% token reduction across agent invocations. The `wint.context_packs` table (deployed WINT-0010, protected) is the storage layer. WINT-2030 populated project conventions and tech-stack packs. WINT-2040 (in progress) populates agent mission packs. This story (WINT-2050) closes the domain knowledge gap: ADRs, lessons learned, blockers, and area-specific patterns from `plans/stories/ADR-LOG.md` and the KB (`knowledgeEntries` pgvector store) are currently re-read or re-queried on every agent invocation.

**Problem**: Agents working on frontend, backend, or testing stories must repeatedly retrieve the same ADR constraints, past blockers, and domain-specific lessons. These are stable (change infrequently) and expensive to re-derive from raw sources or live KB queries on every session start.

**Proposed Solution**: Create a TypeScript populate script in `packages/backend/mcp-tools/src/scripts/` that:
1. Reads `plans/stories/ADR-LOG.md` and extracts active ADRs as structured JSONB packs (one per domain area or a consolidated ADR pack)
2. Queries the KB (`knowledgeEntries` table at port 5433) for lessons learned and blockers, grouped by domain tag (frontend, backend, testing, architecture, workflow)
3. Optionally reads `docs/adr/ADR-resilience-observability.md` and other active ADR docs
4. Writes discrete, bounded (< 8000 chars each) cache entries to `wint.context_packs` via `contextCachePut()`
5. Uses `packType: 'lessons_learned'` for KB-derived packs and `packType: 'architecture'` for ADR-derived packs
6. Is idempotent, resilient, and follows the exact same pattern as `populate-project-context.ts`

**Key constraint**: The KB at port 5433 is NOT the same database as lego_dev at port 5432. The script must connect to port 5433 to read KB entries, and port 5432 to write cache packs. This dual-database access is the primary complexity of this story versus WINT-2030.

### Initial Acceptance Criteria

- [ ] **AC-1**: Populate script reads `plans/stories/ADR-LOG.md` and extracts all active ADRs (ADR-001 through ADR-006). Writes a consolidated ADR pack to `packType: 'architecture', packKey: 'active-adrs'` with `{ summary, adrs: [{ id, title, constraint, status }] }` structured JSONB.

- [ ] **AC-2**: Populate script queries the KB (`knowledgeEntries` at port 5433) for entries tagged `lesson-learned` or `lesson` and groups results by domain area (frontend, backend, testing, workflow, architecture). Writes one pack per domain area with at least 1 entry: `packType: 'lessons_learned', packKey: 'lessons-{area}'` (e.g., `lessons-backend`, `lessons-frontend`, `lessons-testing`, `lessons-workflow`).

- [ ] **AC-3**: Populate script queries the KB for entries of `entry_type: 'constraint'` or tagged `blocker`. Writes a consolidated blockers pack: `packType: 'lessons_learned', packKey: 'blockers-known'` with `{ summary, blockers: [{ title, description }] }`.

- [ ] **AC-4**: All writes use `contextCachePut()` with `ttl: 2592000` (30 days). Script is idempotent — re-running updates existing entries without errors or duplicates (upsert on `packType, packKey`).

- [ ] **AC-5**: Individual pack write failures are logged via `@repo/logger` and do not abort the full run. Script returns `{ attempted: number, succeeded: number, failed: number }` summary.

- [ ] **AC-6**: Content JSONB for each pack is structured (not a raw KB result dump). Minimum structure varies by pack type but always includes a `summary: string` field. JSON stringified length < 8000 chars per pack (enforced by truncating or limiting the number of entries per pack).

- [ ] **AC-7**: Script is runnable via `pnpm tsx` from the monorepo root. Run command and both `DATABASE_URL` (port 5432 for writes) and `KB_DATABASE_URL` (port 5433 for KB reads) requirements documented in inline JSDoc.

- [ ] **AC-8**: Integration test (Vitest, real PostgreSQL at port 5432) verifies: after running the populate function, at least 6 entries exist in `wint.context_packs` with the expected `(packType, packKey)` pairs and non-null JSONB content. Running populate twice yields same count (idempotency).

- [ ] **AC-9**: KB query path is injectable/mockable for unit tests — the KB search function should be a parameter or importable dependency, not hardcoded. Unit tests mock the KB query; integration tests use the real KB.

- [ ] **AC-10**: All pack types used are from the existing `contextPackTypeEnum`: `'lessons_learned'` and `'architecture'` only. No new enum values are added.

### Non-Goals

- Do not add new `contextPackTypeEnum` values to the database schema
- Do not modify `wint.context_packs` table schema (protected by WINT-0010)
- Do not implement the context-pack sidecar HTTP endpoint (WINT-2020's scope)
- Do not implement cache warming scheduling (WINT-2070/WINT-2080's scope)
- Do not cache library patterns (React 19, Vitest API) — that is WINT-2060's scope
- Do not cache project conventions or tech-stack docs — already done by WINT-2030
- Do not cache agent missions — already done by WINT-2040
- Do not implement automatic doc-change triggers — manual re-population is MVP
- Do not implement a UI or CLI command — script is a Node.js utility
- Do not store entire raw KB query result sets — always extract bounded structured content
- Do not modify the KB database schema or `knowledgeEntries` table

### Reuse Plan

- **Scripts**: Follow `populate-project-context.ts` structure exactly — same `PopulateResultSchema`, same resilient loop, same `readDoc()` and `extractSections()` helpers where applicable
- **Patterns**: `contextCachePut()` upsert, `@repo/logger`, `TTL_30_DAYS = 2592000`, `MONOREPO_ROOT` resolution, test cleanup with `db.delete(contextPacks)`
- **Packages**: `@repo/mcp-tools` (contextCachePut), `@repo/db` (direct DB access for KB reads), `@repo/logger`, `@repo/database-schema` (contextPacks table ref for test cleanup)
- **Test infrastructure**: `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` — copy the beforeEach/afterEach cleanup pattern

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary complexity vs WINT-2030 is dual-database access: reads from port 5433 (KB), writes to port 5432 (lego_dev). The test plan must explicitly address how integration tests handle this — whether to use the real KB database (port 5433) for the read side, or mock it.
- Recommend: unit tests mock the KB query function (injectable dep); integration tests may target real KB at 5433 if available, or use a mock KB response fixture if not.
- Idempotency test is critical — verify that running the script twice yields the same count of rows (upsert, not insert).
- Content structure tests: each pack must have `summary` field and JSON length < 8000 chars. These are the same assertions as WINT-2030.
- Error cases: (1) KB unavailable — packs that depend on KB queries should fail gracefully with warning and increment `failed`; (2) ADR-LOG.md missing — log warning, skip ADR packs; (3) single pack write failure should not abort the run.
- AC-9 (injectable KB dependency) is key to testability — ensure test plan specifies mock boundary at the KB query function.

### For UI/UX Advisor

Not applicable — this is a backend populate script with no UI surface. The only "UX" consideration is the developer experience of running the script, which is documented via inline JSDoc (same as WINT-2030). Mark as N/A.

### For Dev Feasibility

- **Feasibility**: High confidence. Infrastructure fully in place (`wint.context_packs` deployed, `contextCachePut()` UAT-complete). The primary new complexity is reading from the KB database (port 5433) in addition to writing to lego_dev (port 5432).
- **Dual-database access**: The KB uses a separate PostgreSQL instance. The script needs to establish a connection to port 5433 for KB reads. Options: (a) import `@repo/db` configured for KB port (if it supports configurable URL), (b) create a lightweight direct Drizzle connection to port 5433 similar to how `assemble-context-pack.ts` uses `@repo/db`, or (c) call the KB MCP tool via HTTP. Option (b) is most consistent with WINT-2030 patterns.
- **Content strategy for KB-derived packs**: The KB may return many results per tag. The script must limit to top N results per domain (e.g., 5–10 per area) and truncate to stay under 8000 chars. The existing `estimateTokens()` utility in `packages/backend/sidecars/context-pack/src/__types__/index.ts` can help estimate.
- **packKey taxonomy to finalize during elaboration**: Suggest: `domain-kb-frontend`, `domain-kb-backend`, `domain-kb-testing`, `domain-kb-workflow` (for lesson packs), `active-adrs` (for ADR pack), `blockers-known` (for blocker pack). But this taxonomy should be validated against what data actually exists in the KB.
- **Change surface**: New file `packages/backend/mcp-tools/src/scripts/populate-domain-kb.ts` + test file. No existing files modified.
- **Canonical references for subtask decomposition**:
  - ST-1: Scaffold script file, define pack taxonomy, import deps — reference `populate-project-context.ts` lines 1–38
  - ST-2: Implement ADR-LOG.md reader and extractor — reference `extractSections()` helper + WINT-2030 AC-1 approach
  - ST-3: Implement KB query + grouping by domain — this is the novel part; reference `assemble-context-pack.ts` for how KB search is called
  - ST-4: Implement resilient write loop + result summary — reference `populateProjectContext()` lines 268–347
  - ST-5: Write integration + unit tests — reference integration test pattern
