---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-2020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 1 UAT completions (WINT-1011, WINT-1012, WINT-1030, WINT-1130, WINT-1140, WINT-1150 all moved to UAT after baseline was cut). Phase 2 sidecar infrastructure does not yet exist.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Source of kb_facts, kb_rules, kb_links via semantic search |
| Context Cache MCP Tools | `packages/backend/mcp-tools/src/context-cache/` | WINT-0100: contextCacheGet/Put — directly reusable for caching assembled context packs |
| contextPacks DB table | `packages/backend/database-schema/` | Already exists with packType, packKey, content (JSONB), TTL, hitCount |
| KB hybrid search | `apps/api/knowledge-base/src/search/kb-search.ts` | Semantic + keyword search with RRF; used to query kb_facts, kb_rules |
| Session Management MCP Tools | `packages/backend/mcp-tools/src/session-management/` | node-scoped session context; provides story_brief source data |
| Story Management MCP Tools | `packages/backend/mcp-tools/src/story-management/` | storyGetStatus — source for story_brief assembly |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas; story scope, checkpoint artifacts contain repo context |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-1120 | needs-code-review | Blocks WINT-2010, which blocks this story. WINT-1120 must reach UAT/completed for Phase 2 to begin. |
| WINT-2010 | pending | Direct dependency. Context pack sidecar requires role pack sidecar to exist first (shared sidecar infrastructure pattern). |

### Constraints to Respect

- `packages/backend/database-schema/` schemas are protected — do not modify existing tables unless adding new columns with migration
- `@repo/db` client API surface is protected
- Orchestrator artifact schemas are protected
- No barrel files (import directly from source)
- Zod-first types required (no TypeScript interfaces)
- `@repo/logger` for all logging
- Token budget must be respected in context assembly — this is the core design constraint of this story

---

## Retrieved Context

### Related Endpoints

| Endpoint | Location | Notes |
|----------|----------|-------|
| None yet | — | sidecars/context-pack/ does not exist — this story creates it |
| Existing KB search | `apps/api/knowledge-base/src/search/` | POST-style query interface; context pack sidecar will call internally |

### Related Components

| Component | Location | Notes |
|-----------|----------|-------|
| contextCacheGet | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Cache-first retrieval pattern for assembled packs |
| contextCachePut | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Upsert pattern for persisting assembled packs |
| kb_search | `apps/api/knowledge-base/src/search/kb-search.ts` | Hybrid semantic+keyword search with RRF fallback |
| storyGetStatus | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Retrieve story metadata for story_brief |
| session-query | `packages/backend/mcp-tools/src/session-management/session-query.ts` | Retrieve session data for node-scoped context |
| contextPackTypeEnum | `packages/backend/database-schema/` | 'story' packType already defined — key for caching assembled context packs |

### Reuse Candidates

| Candidate | Package | Why |
|-----------|---------|-----|
| contextCacheGet/Put pattern | `@repo/mcp-tools` | Exact cache-check-then-assemble-then-store pattern this sidecar uses |
| Zod input schema pattern | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Template for request/response schemas |
| kb_search hybrid search | `apps/api/knowledge-base/src/search/` | Direct reuse for kb_facts, kb_rules, kb_links queries |
| @repo/logger | `packages/core/logger/` | Required for all logging |
| @repo/db | `packages/backend/db/` | Database client for contextPacks upsert |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool with Zod validation + DB operation | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Clean Zod validation, resilient error handling returning null on failure, @repo/db usage |
| Zod input/output schema definitions | `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` | Zod-first types with enum validation, inferred types, no interfaces |
| Cache upsert pattern | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | ON CONFLICT DO UPDATE pattern for idempotent cache writes |
| Hybrid semantic search | `apps/api/knowledge-base/src/search/kb-search.ts` | Semantic+keyword RRF search with fallback mode; direct integration target |

---

## Knowledge Context

### Lessons Learned

- **[WKFL-004/007/010]** Code stories with agents + schemas + CLI commands exceed token estimates by 4-8x (category: workflow)
  - *Applies because*: This story delivers a TypeScript HTTP sidecar service with Zod schemas, KB query logic, cache integration, and test suite — squarely in the 4-6x overrun category. Estimate accordingly.

- **[WINT-9090]** Concurrent cache-miss race condition on INSERT path not addressed for contextPacks
  - *Applies because*: The context pack sidecar will assemble and cache packs on cache miss. Under concurrent LangGraph invocations hitting the same story/node combination simultaneously, the INSERT path could produce duplicate rows. Must add ON CONFLICT DO NOTHING or use existing WINT-0100's upsert strategy.

- **[WINT-9090]** No structured telemetry/metrics for context cache operations
  - *Applies because*: Context pack assembly latency and KB query cost are critical observability signals for the 80% token reduction goal. No metrics means no validation of the goal.

### Blockers to Avoid (from past stories)

- Do not implement before WINT-2010 (role pack sidecar) is in UAT — the sidecar infrastructure pattern (package structure, HTTP server, MCP tool wrapper) must be established there first
- Do not query the KB without token budget enforcement — unconstrained KB queries are the central risk the story notes identify
- Do not skip the context cache layer — assembling fresh context on every call defeats the token reduction goal
- Do not use TypeScript interfaces for request/response types — Zod schemas only (CLAUDE.md requirement)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | If an HTTP endpoint is exposed externally, follow `/api/v2/{domain}` pattern. Internal sidecar calls may use simpler paths. |
| ADR-005 | Testing Strategy | UAT must use real services — no MSW mocking of KB queries or DB operations |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per UI-facing AC (N/A for backend-only story; unit + integration tests required) |

### Patterns to Follow

- Zod input validation at entry point — fail fast with clear error messages
- Cache-first pattern: check contextPacks cache before assembling from KB
- Upsert on cache write (ON CONFLICT DO UPDATE) to handle concurrent callers
- Resilient error handling: return null/error object rather than throwing, log with `@repo/logger`
- Separate `__types__/index.ts` for all Zod schemas in the tool directory
- Integration tests against real postgres-knowledgebase (port 5433) — no mocked DB

### Patterns to Avoid

- No barrel files — import directly from source paths
- Do not use console.log — use `@repo/logger`
- Do not mock the database in UAT/integration tests (ADR-005)
- Do not hardcode token budget numbers in multiple places — single configuration constant
- Do not make unbounded KB queries — always pass limit and token_budget parameters

---

## Conflict Analysis

### Conflict: dependency_not_ready
- **Severity**: warning
- **Description**: WINT-2020 depends on WINT-2010 (role pack sidecar), which in turn depends on WINT-1120 (currently `needs-code-review`). The sidecar package structure and HTTP server pattern WINT-2010 establishes are expected to be the template WINT-2020 follows. If WINT-2010 changes the package layout during implementation, WINT-2020's design may need adjustment.
- **Resolution Hint**: Seed is generated now for PM artifact pipeline purposes. Implementation must not begin until WINT-2010 reaches UAT. Review WINT-2010's `packages/backend/sidecars/role-pack/` structure before implementing.

---

## Story Seed

### Title

Create Context Pack Sidecar

### Description

**Context**: Phase 2 of the WINT initiative targets 80% token reduction by eliminating repeated context re-injection across agent invocations. Phase 1 established a database-first story lifecycle with MCP tools for story/session/worktree management. The context cache infrastructure (WINT-0030 + WINT-0100) provides a `contextPacks` table and cache get/put tools. WINT-2010 will establish the sidecar package pattern with `packages/backend/sidecars/role-pack/`.

**Problem**: Agents currently receive large system prompts with project context on every invocation. Each spawn re-reads CLAUDE.md, re-queries the KB, and re-assembles the same facts repeatedly. This is wasteful and prevents the token efficiency goals of Phase 2.

**Proposed Solution**: Create a context pack sidecar service at `packages/backend/sidecars/context-pack/` that accepts a POST request identifying the agent node (story_id, node_type, role), assembles a node-scoped context bundle (story_brief, kb_facts, kb_rules, kb_links, repo_snippets), caches the assembled bundle in the existing `contextPacks` table, and returns it as a compact JSON response. An MCP tool wrapper makes the sidecar callable from within Claude Code agent sessions. Token budget enforcement prevents context bloat — the sidecar must refuse to return bundles exceeding the configured token limit and must trim lower-priority sections first.

### Initial Acceptance Criteria

- [ ] AC-1: POST /context-pack accepts a request body with at minimum: `story_id` (string), `node_type` (string identifying the agent phase, e.g., `pm_seed`, `dev_execute`), `role` (enum: pm|dev|qa|po), and returns a JSON response containing: `story_brief`, `kb_facts` (array), `kb_rules` (array), `kb_links` (array), `repo_snippets` (array)
- [ ] AC-2: All request/response types are defined as Zod schemas in `__types__/index.ts` — no TypeScript interfaces
- [ ] AC-3: Assembled context packs are cached in the existing `contextPacks` table using `packType: 'story'` and `packKey: '{story_id}:{node_type}:{role}'` — cache hit returns cached content without re-querying KB
- [ ] AC-4: Cache miss path queries the KB (hybrid search) using the story_id + node_type as the query, with a configurable result limit (default: 10 items per category)
- [ ] AC-5: Token budget enforcement: assembled context must not exceed a configurable max_tokens value (default: 2000 tokens); if assembly would exceed budget, lower-priority sections (repo_snippets first, then kb_links) are trimmed
- [ ] AC-6: An MCP tool `context_pack_get` is exported and registered in the knowledge-base MCP server, accepting the same parameters as the HTTP endpoint and returning the same response shape
- [ ] AC-7: Cache TTL for assembled context packs defaults to 1 hour (3600 seconds) — configurable per-request via optional `ttl` parameter
- [ ] AC-8: If KB query returns no results for a section, that section returns an empty array (not null/undefined) — response shape is always consistent
- [ ] AC-9: Integration tests run against real postgres-knowledgebase (port 5433) — no DB mocking (ADR-005)
- [ ] AC-10: Unit tests cover: Zod schema validation, token budget enforcement logic, cache key generation, and section trimming logic
- [ ] AC-11: If the cache write fails (DB error), the sidecar still returns the freshly-assembled context — cache write failure is a warning, not a blocking error
- [ ] AC-12: Response time for a cache hit is under 100ms; response time for a cache miss (KB query + cache write) is under 2000ms (measurable via integration test timing assertions)

### Non-Goals

- Implementing the HTTP server infrastructure itself — follow the pattern established by WINT-2010 (`packages/backend/sidecars/role-pack/`)
- Populating the context cache with project context (WINT-2030), agent missions (WINT-2040), or domain KB (WINT-2050) — those are downstream stories
- Modifying existing contextPacks schema — reuse the existing `story` packType
- Authentication/authorization on the sidecar endpoint — deferred to later phase
- Modifying any protected schemas in `packages/backend/database-schema/`
- Modifying the `@repo/db` client API surface
- Frontend UI for context pack inspection
- Real-time streaming of context pack assembly

### Reuse Plan

- **Components**: `contextCacheGet` and `contextCachePut` from `packages/backend/mcp-tools/src/context-cache/` — cache-first assembly pattern; `kb_search` from `apps/api/knowledge-base/src/search/kb-search.ts` — KB query engine
- **Patterns**: Zod input validation at entry; resilient null-returning error handling; `__types__/index.ts` for schema definitions; ON CONFLICT DO UPDATE upsert for cache writes; integration tests against live postgres-knowledgebase
- **Packages**: `@repo/db` for database access; `@repo/logger` for structured logging; `@repo/database-schema` for contextPacks table reference; `zod` for all type definitions

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Story is backend-only (no frontend impact) — E2E test requirement from ADR-006 does not apply; focus on unit + integration tests
- Integration tests must connect to real postgres-knowledgebase (port 5433) per ADR-005 — no MSW mocking
- Key test scenarios: cache hit path (return cached content), cache miss path (query KB, write to cache, return), token budget enforcement (trim repo_snippets first, then kb_links when over budget), concurrent cache-miss race condition (two simultaneous requests for same story_id + node_type)
- Timing assertions for cache hit (<100ms) and cache miss (<2000ms) should be included as integration test assertions
- Test helper fixtures needed: a valid contextPacks row for cache-hit testing; a mock KB search result for unit-level token budget testing

### For UI/UX Advisor

- This is a pure backend service with no user-facing UI. N/A for UX review.
- The MCP tool wrapper (AC-6) has an implicit developer UX: the tool name, parameter names, and response shape should be intuitive for Claude Code agents calling it. Recommend using snake_case parameter names consistent with existing KB MCP tools (e.g., `story_id`, `node_type`).

### For Dev Feasibility

- **Canonical references for subtask decomposition**:
  1. `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` — template for cache-first retrieval logic
  2. `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` — template for Zod schema organization
  3. `apps/api/knowledge-base/src/search/kb-search.ts` — KB search integration target (inject as dependency)
  4. `packages/backend/sidecars/role-pack/` — (created by WINT-2010, use for HTTP server and package structure)
- **Key implementation risk**: Token budget enforcement logic — need a simple token estimator (character count / 4 is acceptable for budget enforcement; no need for tiktoken). Define a `estimateTokens(text: string): number` utility.
- **Dependency gate**: Must not begin implementation until WINT-2010 is at UAT or completed. Review WINT-2010's package structure before starting.
- **KB search integration**: The `kb_search` function requires both `db` and `embeddingClient` dependencies injected — the sidecar will need to initialize these at startup (follow WINT-2010's initialization pattern).
- **Story type**: This is a backend service delivery story (TypeScript + tests + HTTP endpoint + MCP tool). Apply 4-6x token multiplier to any estimate. A 200,000 token budget is a reasonable floor.
- **Cache key format**: `{story_id}:{node_type}:{role}` — this is a convention decision; define it as a constant in the `__types__` directory to avoid drift.
