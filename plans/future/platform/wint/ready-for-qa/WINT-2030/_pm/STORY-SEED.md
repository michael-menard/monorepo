---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-2030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No ADR-LOG.md found (ADRs not loaded). Baseline pre-dates WINT-0100 completion; WINT-0100 is now confirmed UAT-complete (context_cache MCP tools exist on disk).

### Relevant Existing Features

| Feature | Status | Source |
|---------|--------|--------|
| wint.context_packs table | Deployed | WINT-0010 (protected) |
| contextPackTypeEnum values: codebase, story, feature, epic, architecture, lessons_learned, test_patterns | Deployed | WINT-0010 schema |
| context_cache_put MCP tool | UAT-complete | WINT-0100 |
| context_cache_get MCP tool | UAT-complete | WINT-0100 |
| context_cache_invalidate MCP tool | UAT-complete | WINT-0100 |
| context_cache_stats MCP tool | UAT-complete | WINT-0100 |
| @repo/db package with connection pooling | Active | Baseline |
| Drizzle ORM v0.44.3 | Active | Baseline |
| Zod-first validation patterns | Active | CLAUDE.md |
| CLAUDE.md (project conventions doc) | Active | Root |
| docs/tech-stack/backend.md | Active | /docs/tech-stack/ |
| docs/tech-stack/frontend.md | Active | /docs/tech-stack/ |
| docs/tech-stack/monorepo.md | Active | /docs/tech-stack/ |
| docs/testing/ | Active | /docs/testing/ |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| WINT-2020 (Context Pack Sidecar) | pending | Blocks WINT-2030 (dependency) |
| WINT-0030 (Context Cache Tables) | pending | Blocks WINT-2030 (dependency) |
| WINT-0100 (Context Cache MCP Tools) | UAT | Required dependency — confirmed complete |

### Constraints to Respect

| Constraint | Source | Impact |
|------------|--------|--------|
| wint.context_packs table schema is protected | WINT-0010 | DO NOT MODIFY — use contextPackTypeEnum values as-is |
| packType enum: only 7 values allowed | wint schema | project_context maps to 'architecture' or 'codebase' packType — no custom enum values |
| wint schema lives in lego_dev (port 5432) | Lesson ARCH-001 | Integration tests must target DATABASE_URL with port 5432 |
| Zod-first types (no TypeScript interfaces) | CLAUDE.md | MUST use z.infer<> for all types |
| No barrel files | CLAUDE.md | Import directly from source |
| @repo/logger for logging | CLAUDE.md | Never use console.log |
| Drizzle ORM upsert pattern | WINT-0100 pattern | Use .onConflictDoUpdate() with composite unique index |

---

## Retrieved Context

### Related Endpoints
- None (backend script/tool only — no HTTP endpoints)

### Related Components

**MCP Tools (WINT-0100 — deployed, UAT-complete)**:
- `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` — upsert pattern for writing project context packs
- `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` — retrieval with TTL expiry check
- `packages/backend/mcp-tools/src/context-cache/context-cache-invalidate.ts` — soft/hard delete by packType
- `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` — ContextCachePutInputSchema, packTypeValues

**Database Schema**:
- `packages/backend/database-schema/src/schema/wint.ts` — contextPacks table, contextPackTypeEnum

**Source Documents to Extract From**:
- `CLAUDE.md` — code style, conventions, tech stack overview, Zod patterns, component structure
- `docs/tech-stack/backend.md` — AWS Lambda, Aurora PostgreSQL, API Gateway patterns
- `docs/tech-stack/frontend.md` — React 19, Tailwind, shadcn/ui, component library structure
- `docs/tech-stack/monorepo.md` — pnpm, Turborepo, workspace conventions
- `docs/testing/` (directory) — Vitest, Playwright, MSW patterns and testing strategy

### Reuse Candidates

1. **context_cache_put** (WINT-0100) — primary write mechanism for populating the cache
2. **ContextCachePutInputSchema** — Zod validation for cache write inputs
3. **SelectContextPack** from `@repo/database-schema` — auto-generated return type
4. **Error handling pattern from context-cache-put.ts** — resilient try/catch with @repo/logger, return null on failure
5. **WINT-0100 test infrastructure** — Vitest with real PostgreSQL (port 5432), cleanup patterns

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Cache write (upsert) | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Exact upsert pattern for writing project context packs via contextCachePut() |
| Zod schemas + types | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | ContextCachePutInputSchema, packTypeValues enum — inputs this story will use |
| Script/util error handling | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Resilient try/catch with @repo/logger, graceful null return on DB errors |
| Schema inspection | `packages/backend/database-schema/src/schema/wint.ts` (lines 478-526) | contextPackTypeEnum and contextPacks table — defines valid packType values |

---

## Knowledge Context

### Lessons Learned

- **[ARCH-001]** wint schema lives in lego_dev (port 5432), NOT the KB database (port 5433) (category: architecture)
  - *Applies because*: Any integration test or script that writes to wint.context_packs must use DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev

- **[WINT-0100]** contextPackTypeEnum is constrained to 7 values: codebase, story, feature, epic, architecture, lessons_learned, test_patterns (category: constraint)
  - *Applies because*: WINT-2030 must map project context (from CLAUDE.md, tech-stack docs, testing docs) into one of these enum values — no new enum variants are allowed without a schema migration

- **[WINT-0100]** MCP tool pattern not yet fully server-integrated — database operations as standalone functions work today (category: architecture)
  - *Applies because*: The populate script should call contextCachePut() directly as a function, not via a running MCP server

- **[WINT-9090]** No structured telemetry for context cache operations — no cache hit metrics available yet (category: observability)
  - *Applies because*: The populate script cannot validate effectiveness via cache stats until WINT-3xx telemetry stories land; success is verified by reading back the inserted rows

- **[WINT-0100 elab]** ON CONFLICT DO UPDATE on (packType, packKey) composite index enables safe re-runs (category: pattern)
  - *Applies because*: The population script must be idempotent — repeated runs should update existing entries, not fail or duplicate

### Blockers to Avoid (from past stories)

- **Wrong database port** — wint.context_packs is in port 5432 (lego_dev), not port 5433 (KB). Test/script env must set correct DATABASE_URL.
- **Inventing new packType enum values** — the enum is a database constraint. 'project_context' does not exist; the population must use one of the 7 existing values (likely 'architecture' or 'codebase').
- **Creating TypeScript interfaces** — use Zod schemas with z.infer<> only, per CLAUDE.md.
- **Console.log for logging** — use @repo/logger in any TypeScript code.
- **Non-idempotent writes** — the script must use upsert (ON CONFLICT DO UPDATE), not blind INSERT.
- **Treating docs as single monolith** — different doc sections should become discrete cache entries with distinct packKeys for agent-targeted retrieval.

### Architecture Decisions (ADRs)
No ADR-LOG.md found in codebase. No ADR constraints identified beyond schema constraints above.

### Patterns to Follow

- **Idempotent upsert**: Call `contextCachePut()` for every pack — safe on first run and re-runs
- **Discrete cache entries per domain area**: One packType+packKey per logical section (e.g., `packType: 'architecture', packKey: 'tech-stack-backend'`), not one giant entry for all docs
- **Reasonable TTL**: Long TTL for static docs (e.g., 30 days = 2592000 seconds) since CLAUDE.md rarely changes
- **Zod-first validation**: All script inputs and return types validated via Zod schemas
- **Resilient execution**: Individual pack write failures should log and continue, not abort the full population run
- **Token count estimation**: Populate `tokenCount` field where feasible to aid future cache hit cost analysis

### Patterns to Avoid

- **Single giant cache entry** for all docs — defeats the purpose of targeted agent retrieval
- **Hardcoded full file contents** in JSONB — summarize and extract key facts, not full document dumps
- **Blocking on WINT-2020** for implementation structure — the script can be written to use contextCachePut() directly without requiring the context-pack sidecar HTTP endpoint
- **Enum value invention** — do not add 'project_context' or any new value to contextPackTypeEnum

---

## Conflict Analysis

### Conflict: Dependency Not Yet Ready (WINT-2020, WINT-0030)

- **Severity**: warning (non-blocking for seed generation)
- **Description**: WINT-2030 lists WINT-2020 (Context Pack Sidecar) and WINT-0030 (Context Cache Tables) as dependencies. WINT-0030 is still pending. However, the actual infrastructure needed — the context_packs table and MCP tools — was delivered by WINT-0010 and WINT-0100, both of which are UAT-complete. The index dependency listing may be stale or overly conservative. WINT-2020 (the sidecar) is a higher-level HTTP wrapper; this story only needs direct database access via contextCachePut(), which works without WINT-2020.
- **Resolution Hint**: Clarify during elaboration whether WINT-2020 is a true blocker or only needed for agent-facing retrieval integration. The population script can be written and tested independently. If WINT-0030 is intended to create additional `context_cache` schema tables (beyond what WINT-0010 created), verify whether those tables are needed here — the current wint.context_packs table is sufficient for project context storage.

### Conflict: packType Enum Mismatch for "project_context"

- **Severity**: warning
- **Description**: The story index says "populate context_cache.project_context" — a table or column that does not exist in the deployed schema. The actual table is `wint.context_packs` and the enum values are: codebase, story, feature, epic, architecture, lessons_learned, test_patterns. There is no 'project_context' enum value. The population must use existing enum values.
- **Resolution Hint**: Map project context docs to `packType: 'architecture'` (for tech stack, conventions) and `packType: 'codebase'` (for code patterns, testing patterns). Define a clear packKey taxonomy during elaboration to avoid collisions with other population stories (WINT-2040, WINT-2050, WINT-2060).

---

## Story Seed

### Title
Populate Project Context Cache from CLAUDE.md and Tech-Stack Docs

### Description

**Context**:
The WINT platform's Phase 2 goal is 80% token reduction across agent invocations. A key mechanism is the context cache: the `wint.context_packs` table (deployed in WINT-0010) stores JSONB context packs that agents can retrieve instead of re-reading source documents on every invocation. The MCP tools to write and read this cache (context_cache_put, context_cache_get) were delivered by WINT-0100 (UAT-complete).

CLAUDE.md and the docs in `docs/tech-stack/` and `docs/testing/` contain project conventions, patterns, and tech-stack decisions that every agent session needs: Zod-first types, no barrel files, @repo/logger, component structure, testing strategy, etc. These are currently re-read from disk on every invocation — inefficient and token-costly.

**Problem Statement**:
Agents and orchestrator workflows that need project conventions, tech-stack facts, or testing patterns currently have no cached source to retrieve from. Each invocation must either re-read full document files (expensive) or rely on agents knowing the rules implicitly (unreliable). The context cache infrastructure is live but contains no project knowledge.

**Proposed Solution**:
Create a TypeScript populate script (or Node.js utility) that reads CLAUDE.md and the `docs/tech-stack/` and `docs/testing/` docs, extracts key facts per domain area, and writes discrete cache entries to `wint.context_packs` via `contextCachePut()`. Each entry is a targeted, summarized JSONB pack — not a raw file dump — optimized for agent injection.

Cache entry taxonomy (proposed, to be confirmed in elaboration):

| packType | packKey | Source | Content Summary |
|----------|---------|--------|-----------------|
| `architecture` | `project-conventions` | CLAUDE.md | Code style, Zod-first rule, no barrel files, logger, component structure |
| `architecture` | `tech-stack-backend` | docs/tech-stack/backend.md | AWS Lambda, Aurora PostgreSQL, API Gateway, Drizzle ORM |
| `architecture` | `tech-stack-frontend` | docs/tech-stack/frontend.md | React 19, Tailwind, shadcn/ui, app-component-library structure |
| `architecture` | `tech-stack-monorepo` | docs/tech-stack/monorepo.md | pnpm, Turborepo, workspace conventions |
| `test_patterns` | `testing-strategy` | docs/testing/ | Vitest, Playwright, MSW, coverage requirements |

The script is idempotent: re-running updates existing entries via upsert. TTL is set to 30 days (2592000 seconds) reflecting the slow rate of change of these reference docs. A re-population mechanism (manual or triggered on doc change) addresses the risk note in the story index.

### Initial Acceptance Criteria

- [ ] **AC-1**: Populate script reads `CLAUDE.md` and extracts: code style rules, Zod-first requirement, no barrel files rule, @repo/logger rule, component directory structure, quick commands. Writes to `packType: 'architecture', packKey: 'project-conventions'`.

- [ ] **AC-2**: Populate script reads `docs/tech-stack/backend.md` and extracts: Lambda patterns, Aurora PostgreSQL access patterns, Drizzle ORM usage, API Gateway conventions. Writes to `packType: 'architecture', packKey: 'tech-stack-backend'`.

- [ ] **AC-3**: Populate script reads `docs/tech-stack/frontend.md` and extracts: React 19 conventions, Tailwind usage, shadcn/ui component patterns, app-component-library structure. Writes to `packType: 'architecture', packKey: 'tech-stack-frontend'`.

- [ ] **AC-4**: Populate script reads `docs/tech-stack/monorepo.md` and extracts: pnpm workspace conventions, Turborepo task pipeline patterns, build/test commands. Writes to `packType: 'architecture', packKey: 'tech-stack-monorepo'`.

- [ ] **AC-5**: Populate script reads `docs/testing/` and extracts: testing framework choices (Vitest, Playwright, MSW), coverage minimums, query conventions, test setup patterns. Writes to `packType: 'test_patterns', packKey: 'testing-strategy'`.

- [ ] **AC-6**: All writes use `contextCachePut()` with `ttl: 2592000` (30 days). Script is idempotent — re-running updates existing entries without errors or duplicates.

- [ ] **AC-7**: Individual pack write failures are logged via `@repo/logger` and do not abort the full run. Script exits with a summary: total packs attempted, succeeded, failed.

- [ ] **AC-8**: Script is runnable via `pnpm tsx` or `ts-node` from the monorepo root (or a `packages/backend/` sub-package). Documents the run command in a README comment or inline JSDoc.

- [ ] **AC-9**: Integration test (Vitest, real PostgreSQL port 5432) verifies: after running the populate function, at least 5 entries exist in `wint.context_packs` with the expected `(packType, packKey)` pairs and non-null JSONB content.

- [ ] **AC-10**: Content JSONB for each pack is structured as a summarized object (not a raw file string). Minimum viable structure: `{ summary: string, rules?: string[], patterns?: string[], commands?: string[] }` — sized for injection (target: under 2000 tokens per pack).

### Non-Goals

- **Do not create new packType enum values** — use existing: architecture, codebase, test_patterns
- **Do not modify wint.context_packs table schema** — protected from WINT-0010
- **Do not implement the context-pack sidecar HTTP endpoint** — that is WINT-2020's scope
- **Do not implement cache warming scheduling** — that is WINT-2070/WINT-2080's scope
- **Do not implement automatic doc-change triggers** — manual re-population is sufficient for MVP
- **Do not cache agent mission data** — that is WINT-2040's scope
- **Do not cache domain KB (ADRs, blockers, lessons)** — that is WINT-2050's scope
- **Do not cache library patterns (React 19, Vitest API)** — that is WINT-2060's scope
- **Do not implement a UI or CLI command** — script is a Node.js utility, not a user-facing command
- **Do not implement token counting** — `tokenCount` field may be left null in MVP

### Reuse Plan

- **Components**: `contextCachePut()` from `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` — primary write mechanism
- **Types**: `ContextCachePutInput` from `packages/backend/mcp-tools/src/context-cache/__types__/index.ts`
- **Patterns**: Resilient try/catch with @repo/logger (from context-cache-put.ts), upsert with ON CONFLICT DO UPDATE
- **Packages**: @repo/db (database connection), @repo/logger (logging), @repo/mcp-tools (contextCachePut), zod (validation), Node.js fs/path (doc reading)
- **Test infrastructure**: Vitest with DATABASE_URL=port 5432, cleanup pattern from `packages/backend/mcp-tools/src/context-cache/__tests__/`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **Primary test concern**: Verify JSONB content shape — each pack must have non-empty, structured content (not raw file strings)
- **Port 5432 is mandatory**: All integration tests targeting wint.context_packs must use DATABASE_URL with port 5432 (lego_dev), not port 5433 (KB database). This is the #1 historical failure point for WINT integration tests.
- **Idempotency test is critical**: Run populate twice in sequence; assert entries are updated (not duplicated). Check that count of rows for those packKeys equals 5 (not 10).
- **Content size validation**: Assert that content JSON stringified length stays below a reasonable threshold (e.g., 8000 chars) to confirm packs are summaries, not raw file dumps.
- **packType enum coverage**: Assert that no inserts use an invalid packType value (guard against enum mismatch errors at runtime).
- **Coverage target**: ≥80% line coverage — consistent with WINT-0100.

### For UI/UX Advisor

- Not applicable — backend script only, no UI surface.

### For Dev Feasibility

- **Clarify packType mapping**: The story index references `context_cache.project_context` which does not exist. Implementer must confirm use of `packType: 'architecture'` and `packType: 'test_patterns'` as the valid enum values for this content. Consider adding a packKey taxonomy decision to the story.
- **Script location decision needed**: Should the populate script live in `packages/backend/mcp-tools/src/scripts/populate-project-context.ts` or as a standalone tool? The former keeps it close to the MCP tools it uses; assess co-location vs separation.
- **Content extraction strategy**: Docs are short (backend.md is ~40 lines). Simple full-doc-with-structure extraction is viable. For CLAUDE.md (longer), section-based extraction by heading is recommended to avoid oversized packs.
- **Dependency clarification**: WINT-0030 is listed as a dependency but the actual table (wint.context_packs) is already deployed. Confirm with stakeholder whether WINT-0030 creates additional tables needed here, or if this story can proceed once WINT-0100 is confirmed complete.
- **Canonical references for subtask decomposition**:
  - `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` — copy the upsert pattern exactly
  - `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` — import ContextCachePutInput, packTypeValues
  - `packages/backend/mcp-tools/src/context-cache/__tests__/integration.test.ts` — test setup pattern with real DB cleanup
- **Estimate**: 6-10 hours (simpler than WINT-0100 — no new tool code, primarily extraction logic + test)
