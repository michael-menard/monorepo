---
generated: "2026-02-24"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-9090

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: ADR-LOG.md not found at expected path (plans/stories/ADR-LOG.md); no domain-specific lessons available for context cache / session LangGraph porting domain

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Context Cache MCP Tools | `packages/backend/mcp-tools/src/context-cache/` | `contextCacheGet`, `contextCachePut`, `contextCacheInvalidate`, `contextCacheStats` — WINT-0100, QA: PASS |
| Session Management MCP Tools | `packages/backend/mcp-tools/src/session-management/` | `sessionCreate`, `sessionUpdate`, `sessionQuery`, `sessionComplete`, `sessionCleanup` — WINT-2100, ready-to-work |
| Context Cache Tables | `context_cache` schema (WINT-0030) | `contextPacks`, `contextSessions` tables in postgres-knowledgebase |
| Shared Business Logic Package | `packages/backend/workflow-logic/` | `@repo/workflow-logic` — WINT-9010, currently in-qa |
| doc-sync LangGraph Node | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Canonical porting example, WINT-9020, QA: PASS |
| Existing Reality Nodes | `packages/backend/orchestrator/src/nodes/reality/` | `load-knowledge-context.ts` already wraps context cache semantics via `loadKnowledgeContext` |
| Node Factory Pattern | `packages/backend/orchestrator/src/runner/node-factory.ts` | `createToolNode` — standard node creation pattern used by all existing nodes |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-9010 | in-qa | **Direct dependency** — shared business logic package (`@repo/workflow-logic`) must be in-qa passing or released before WINT-9090 can implement against it |
| WINT-2100 | ready-to-work | **Direct dependency** — session-manager agent logic being ported; must be elaborated/complete to understand full session lifecycle to port |

### Constraints to Respect

- `packages/backend/database-schema/` schemas are protected — no schema changes in this story
- `@repo/db` client API is protected — no changes to DB client package
- Orchestrator artifact schemas are protected — no changes to existing artifact Zod schemas
- Session management MCP tools (`packages/backend/mcp-tools/src/session-management/`) must not be modified — port behavior, don't change source
- Context cache MCP tools (`packages/backend/mcp-tools/src/context-cache/`) must not be modified — port behavior, don't change source

---

## Retrieved Context

### Related Endpoints
- No HTTP endpoints (backend node package — internal orchestrator only)

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `contextCacheGet` | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Business logic to port: retrieval with TTL + hit tracking |
| `contextCachePut` | `packages/backend/mcp-tools/src/context-cache/context-cache-put.ts` | Business logic to port: upsert with TTL calculation |
| `contextCacheInvalidate` | `packages/backend/mcp-tools/src/context-cache/context-cache-invalidate.ts` | Business logic to port: invalidation by type/key/pattern |
| `contextCacheStats` | `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` | Business logic to port: cache statistics/health |
| `sessionCreate` | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Business logic to port: UUID generation + session lifecycle start |
| `sessionUpdate` | `packages/backend/mcp-tools/src/session-management/session-update.ts` | Business logic to port: token tracking updates |
| `sessionQuery` | `packages/backend/mcp-tools/src/session-management/session-query.ts` | Business logic to port: by-story or by-agent retrieval |
| `sessionComplete` | `packages/backend/mcp-tools/src/session-management/session-complete.ts` | Business logic to port: lifecycle close + outcomes |
| `sessionCleanup` | `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` | Business logic to port: stale session pruning |
| `load-knowledge-context.ts` | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` | Existing node that partially replicates context cache pattern — consult for state extension approach |

### Reuse Candidates

- `createToolNode` from `packages/backend/orchestrator/src/runner/node-factory.ts` — mandatory pattern for all LangGraph nodes
- `updateState` from `packages/backend/orchestrator/src/runner/state-helpers.ts` — state update helper used by all existing nodes
- `GraphStateWithContext` interface from `packages/backend/orchestrator/src/nodes/reality/retrieve-context.ts` — state extension pattern to follow
- `@repo/workflow-logic` (`packages/backend/workflow-logic/`) — import shared types/validation from here once WINT-9010 passes QA
- `@repo/logger` — mandatory for all logging
- `@repo/database-schema` — import `contextPacks`, `contextSessions` table schemas (already used in MCP tools)
- `@repo/db` — db client for node implementations
- Zod schemas from `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` and `packages/backend/mcp-tools/src/session-management/__types__/index.ts` — reuse input/output schemas directly (don't duplicate)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph node porting (MCP agent → TypeScript node) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Canonical Phase 9 porting example — shows Config schema, Result schema, extended GraphState interface, `createToolNode` usage, factory function pattern, and dependency injection for testability (WINT-9020, QA: PASS) |
| Extended graph state with optional fields | `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts` | Shows `GraphStateWithKnowledge extends GraphStateWithContext` state extension pattern, factory function with config injection, and graceful fallback when dependencies unavailable |
| DB-backed node with dependency injection | `packages/backend/orchestrator/src/nodes/persistence/load-from-db.ts` | Shows injected repository pattern (`createLoadFromDbNode(storyRepo, workflowRepo)`), fallback to alternative source, and LoadFromDbConfig schema approach |
| MCP tool business logic to reference for porting | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Clean implementation: Zod input validation, Drizzle query, atomic hit tracking update, resilient error handling (log + return null) — the exact logic to encapsulate in the LangGraph node |

---

## Knowledge Context

### Lessons Learned
KB not queried (no KB deps available in this seeding context). Applying structural defaults based on Phase 9 porting patterns observed in codebase.

- **[WINT-9020]** Destination path for new nodes must be decided before implementation starts, not during. WINT-9020 discovered a path discrepancy (nodes/workflow/ vs nodes/sync/) during implementation that required elaboration to resolve.
  - *Applies because*: WINT-9090 targets a new `nodes/context/` directory — confirm this path in elaboration before any file creation.

- **[WINT-9020]** The `nodes/workflow/doc-sync.ts` subprocess delegation approach was preserved as fallback alongside the new native port. The story correctly scoped to "new directory, native implementation" without modifying the old fallback.
  - *Applies because*: If any existing orchestrator code calls context-warmer or session-manager via subprocess delegation, that code should remain untouched. New nodes go in `nodes/context/`.

- **[WINT-9010]** `@repo/workflow-logic` is the dependency gate for Phase 9 stories. WINT-9010 must be QA-passing before any Phase 9 story that imports from it should proceed to implementation.
  - *Applies because*: WINT-9090 is listed as depending on WINT-9010. If workflow-logic exports are needed for context cache types, implementation must wait for WINT-9010 completion.

### Blockers to Avoid (from past stories)
- Starting implementation before WINT-9010 passes QA — if context cache types are to be shared via `@repo/workflow-logic`, implementing against an unstable package will cause type resolution failures
- Creating node files without first confirming the `nodes/context/` directory convention with the WINT-9020 precedent in `nodes/sync/`
- Duplicating Zod schemas from MCP tools — reuse `__types__/index.ts` from `packages/backend/mcp-tools/src/context-cache/` and `packages/backend/mcp-tools/src/session-management/` rather than redefining them in the orchestrator
- Implementing session cleanup as part of the session node without confirming WINT-2100's session lifecycle contract — the agent defines the behavior being ported

### Architecture Decisions (ADRs)
ADR-LOG.md not loaded (path not found). Applying known active constraints:

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 (inferred) | Testing Strategy | UAT must use real services, not mocks — context cache nodes need integration tests against live DB in UAT |

### Patterns to Follow
- `createToolNode('node-name', async (state) => Partial<ExtendedState>)` — mandatory node creation pattern
- Extended state interface: `interface GraphStateWithContextCache extends GraphStateWithContext { ... }` — extend from the richest relevant existing state type
- Factory function: `export function createContextCacheNode(config: Partial<Config>)` — enables dependency injection for testing
- Default node export: `export const contextCacheNode = createToolNode(...)` — provides a zero-config version alongside the factory
- Config schema with sensible defaults via Zod `.default()` — all config fields should have defaults
- Graceful degradation: return `null` or `false` state fields on DB errors, never throw from node (log with `@repo/logger`)
- Dependency injection for DB client: pass `db` as injectable rather than importing directly, mirroring `load-from-db.ts` pattern for testability

### Patterns to Avoid
- Direct `db` import at module scope without injection option — makes nodes impossible to test without live DB
- Subprocess delegation (spawning MCP tools as child processes from within LangGraph nodes)
- Duplicating business logic from MCP tools — nodes should call the same underlying functions or reuse their schemas/types
- Monolithic single-file node containing both context-warmer AND session-manager logic — keep them in separate files (`context-warmer.ts` and `session-manager.ts` under `nodes/context/`)

---

## Conflict Analysis

### Conflict: Dependency Not Yet Complete (WINT-9010)
- **Severity**: blocking
- **Description**: WINT-9010 (Create Shared Business Logic Package) is currently `in-qa`. Its `@repo/workflow-logic` package is the shared foundation for Phase 9 stories. WINT-9090 cannot safely begin implementation until WINT-9010 clears QA, as any Phase 9 story that imports from workflow-logic needs stable types.
- **Resolution Hint**: Move WINT-9090 to elaboration now (story generation is safe), but gate implementation start on WINT-9010 reaching `uat` or `completed` status. Elaboration should confirm whether workflow-logic exports are actually needed for context cache nodes (they may not be — MCP tools already have their own schemas).

### Conflict: Source Agent Not Yet Complete (WINT-2100)
- **Severity**: warning
- **Description**: WINT-2100 (Create session-manager Agent) is `ready-to-work` — the agent file does not yet exist. WINT-9090 must port the session-manager agent's logic to a LangGraph node, but if the agent hasn't been implemented yet, the "source of truth" for session management behavior is the MCP tools (`packages/backend/mcp-tools/src/session-management/`) rather than the agent spec.
- **Resolution Hint**: During elaboration, clarify: is WINT-9090 porting the MCP tool business logic (already exists and is QA-passing) or waiting for WINT-2100's agent to be written first? If the intent is to port the agent logic, add a hard dependency gate on WINT-2100 completion. If the intent is to wrap the existing MCP tool operations as a node, WINT-2100 is only a soft dependency.

---

## Story Seed

### Title
Create Context Cache LangGraph Nodes — Port context-warmer and session-manager to `nodes/context/`

### Description
Phase 9 of the WINT epic is converting Claude Code agent logic into native LangGraph TypeScript nodes so that context caching and session management work identically in both execution paths. Currently, context warming (pre-populating `context_cache.project_context`, `agent_missions`, `domain_kb`, `library_cache`) and session lifecycle management (create/update/complete/cleanup of `context_cache.sessions`) are implemented as Claude Code agent skills and MCP tools.

This story ports those behaviors to two LangGraph nodes: one for context cache operations (`context-warmer.ts`) and one for session management (`session-manager.ts`), both in the new `packages/backend/orchestrator/src/nodes/context/` directory established by this story's index entry.

The MCP tool implementations in `packages/backend/mcp-tools/src/context-cache/` and `packages/backend/mcp-tools/src/session-management/` are the behavioral source of truth. The nodes wrap or replicate that logic in a form that fits the LangGraph state machine pattern: accepting `GraphState`, returning `Partial<ExtendedState>`, with injectable DB dependencies for testability.

Success means both workflows (Claude Code agents via MCP and LangGraph via nodes) produce identical cache read/write/invalidation and session lifecycle behavior for the same inputs.

### Initial Acceptance Criteria
- [ ] AC-1: `packages/backend/orchestrator/src/nodes/context/context-warmer.ts` exists with a default export `contextWarmerNode` and a factory `createContextWarmerNode(config)`
- [ ] AC-2: `packages/backend/orchestrator/src/nodes/context/session-manager.ts` exists with a default export `sessionManagerNode` and a factory `createSessionManagerNode(config)`
- [ ] AC-3: `packages/backend/orchestrator/src/nodes/context/index.ts` re-exports both nodes (consistent with other `nodes/*/index.ts` files)
- [ ] AC-4: Context warmer node reads from `context_cache.contextPacks` (via `contextCacheGet` logic or equivalent) and populates LangGraph state with cache hit/miss results
- [ ] AC-5: Context warmer node writes to `context_cache.contextPacks` (via `contextCachePut` logic or equivalent) when cache miss detected and new context is generated
- [ ] AC-6: Session manager node creates new sessions in `context_cache.contextSessions` (via `sessionCreate` logic or equivalent), returning session ID in state
- [ ] AC-7: Session manager node supports update and complete operations that mirror `sessionUpdate` and `sessionComplete` MCP tool behavior
- [ ] AC-8: Both nodes use `createToolNode` from `packages/backend/orchestrator/src/runner/node-factory.ts`
- [ ] AC-9: Both nodes define an extended `GraphState` interface (e.g., `GraphStateWithContextCache`, `GraphStateWithSession`) following the pattern in `load-knowledge-context.ts`
- [ ] AC-10: DB client is injectable (not hard-wired at module scope) — factory functions accept a `db` option for test isolation
- [ ] AC-11: Both nodes degrade gracefully on DB failure — return `null`/`false` state fields and log via `@repo/logger`, never throw
- [ ] AC-12: Unit tests in `nodes/context/__tests__/` achieve minimum 80% coverage across context-warmer and session-manager
- [ ] AC-13: Cache invalidation behavior from `contextCacheInvalidate` is accessible via the context-warmer node or a companion utility (synchronization concern from index Risk Notes)
- [ ] AC-14: Zod schemas for node Config and Result are defined (do not duplicate MCP tool schemas — import from `packages/backend/mcp-tools/src/context-cache/__types__/` and session `__types__/`)

### Non-Goals
- Do NOT modify `packages/backend/mcp-tools/src/context-cache/` — source of truth, read-only
- Do NOT modify `packages/backend/mcp-tools/src/session-management/` — source of truth, read-only
- Do NOT modify `packages/backend/database-schema/` — no schema changes
- Do NOT create the context-warmer or session-manager Claude Code agents (those are WINT-2080 and WINT-2100 respectively)
- Do NOT implement the cache warming skill logic (WINT-2070) — only port to LangGraph node
- Do NOT integrate nodes into full LangGraph workflow graphs (that is WINT-9110)
- Do NOT add LangGraph nodes to existing orchestrator graphs — isolated deliverable for this story

### Reuse Plan
- **Components**: `createToolNode`, `updateState` from `packages/backend/orchestrator/src/runner/`; Zod schemas from MCP tool `__types__/` directories; `contextPacks` + `contextSessions` from `@repo/database-schema`
- **Patterns**: Extended GraphState interface pattern from `load-knowledge-context.ts`; factory function with config injection from `load-from-db.ts`; graceful degradation (log + return null) from `context-cache-get.ts`
- **Packages**: `@repo/logger`, `@repo/db` (injectable), `@repo/database-schema`, `@repo/workflow-logic` (once WINT-9010 passes QA — verify if actually needed)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- Two distinct node behaviors require separate test suites: `context-warmer.test.ts` and `session-manager.test.ts` under `nodes/context/__tests__/`
- Key test paths for context warmer: (1) cache hit — returns cached content, updates hit count; (2) cache miss — triggers population, stores result; (3) DB unavailable — returns null state fields without throwing; (4) invalidation — clears affected packs
- Key test paths for session manager: (1) create new session — returns session ID in state; (2) update session (token tracking); (3) complete session — captures outcome; (4) cleanup stale sessions; (5) DB unavailable — graceful null return
- Integration tests require live postgres-knowledgebase DB (ADR-005 equivalent: no mocks for UAT) — flag this as a setup prerequisite in the test plan
- The existing MCP tool test suites (`__tests__/integration.test.ts` in context-cache and session-management) demonstrate the expected behaviors — use them as behavioral specification for what the node tests must validate

### For UI/UX Advisor
- No UI/UX concerns: this is a pure backend TypeScript node implementation
- The only user-facing consideration is LangGraph state visibility — ensure state extension fields have clear, self-documenting names (e.g., `contextCacheHit: boolean`, `sessionId: string | null`) so downstream nodes and debugging tools can interpret state clearly

### For Dev Feasibility
- **Dependency gate**: WINT-9010 in-qa status is the implementation blocker. Elaborate the story now, but do not start implementation until WINT-9010 is `uat` or `completed`. Confirm during setup whether `@repo/workflow-logic` exports are actually needed (the MCP tools have their own `__types__/` that may be sufficient).
- **Source clarity**: WINT-2100 (session-manager agent) is `ready-to-work` — the agent doesn't exist yet. The implementation source for session management behavior should be the `packages/backend/mcp-tools/src/session-management/` files (QA-passing, well-tested). Raise this in elaboration to get a formal decision.
- **Directory creation**: `nodes/context/` does not yet exist. First task is creating the directory structure (`nodes/context/`, `nodes/context/__tests__/`) consistent with other node directories (see `nodes/sync/`, `nodes/reality/` as references).
- **Canonical references for subtask decomposition**:
  - Porting pattern → `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (7-phase port from WINT-9020)
  - State extension → `packages/backend/orchestrator/src/nodes/reality/load-knowledge-context.ts`
  - DB injection → `packages/backend/orchestrator/src/nodes/persistence/load-from-db.ts`
  - Business logic source (cache) → `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts`
  - Business logic source (session) → `packages/backend/mcp-tools/src/session-management/session-create.ts`
- **Estimated complexity**: Medium. Two nodes, clear business logic source (MCP tools), well-established patterns. Primary risk is the WINT-9010 dependency and the WINT-2100 source ambiguity.
