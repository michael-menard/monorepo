---
generated: "2026-03-09"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-0040 completion; telemetry table status updated from active stories scan below

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base MCP server | `apps/api/knowledge-base/src/mcp-server/` | This story extends the MCP server with 4 new tool handlers |
| MCP tool registration pattern | `tool-schemas.ts`, `tool-handlers.ts` | New tools must follow the exact registration pattern: schema in tool-schemas.ts, handler in tool-handlers.ts, dispatched via `toolHandlers` map |
| `agentInvocations` table | `packages/backend/database-schema/src/schema/wint.ts:658` | Primary write target for `workflow_log_invocation`; all columns verified present in schema |
| `hitlDecisions` table | `packages/backend/database-schema/src/schema/wint.ts:947` | Write target for `workflow_log_decision`; includes `embedding vector(1536)` for semantic similarity |
| `storyOutcomes` table | `packages/backend/database-schema/src/schema/wint.ts:997` | Write target for `workflow_log_outcome`; unique constraint on `storyId` (upsert semantics needed) |
| Drizzle insert/select schemas | `wint.ts:1877–1911` | `insertAgentInvocationSchema`, `insertHitlDecisionSchema`, `insertStoryOutcomeSchema` and select variants already exported |
| `@repo/db` client | `packages/backend/database-schema` | Standard Drizzle DB access via `db` export; used by all MCP tools |
| MCP integration test | `src/mcp-server/__tests__/mcp-integration.test.ts` | Tool count assertion currently `62`; adding 4 tools requires updating to `66` |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0040 | `ready-for-qa` (unblocks WINT-0120) | WINT-0040 creates `hitlDecisions` and `storyOutcomes` — this story depends on those tables existing in the DB and in the Drizzle schema. Confirmed: both tables are in `wint.ts` and their Zod insert/select schemas are exported. Dependency satisfied at schema level. |

### Constraints to Respect

- `agentInvocations`, `hitlDecisions`, `storyOutcomes` are protected production schemas — no DDL changes in this story
- MCP tool naming must follow existing snake_case convention (`workflow_log_invocation` etc.)
- No new pgSchema; tables live in the existing `wint` pgSchema
- `storyOutcomes` has a unique constraint on `storyId` — `workflow_log_outcome` must use INSERT ... ON CONFLICT DO UPDATE (upsert) semantics

---

## Retrieved Context

### Related Endpoints

None — this is a pure MCP server extension, no HTTP/Lambda handlers involved.

### Related Components

| Component | File | Notes |
|-----------|------|-------|
| MCP tool schemas | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | `getToolDefinitions()` array and `zodToJsonSchema` conversion; new tools are appended here |
| MCP tool handlers | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | `toolHandlers` dispatch map; new handler functions added here |
| Graph query tools | `packages/backend/mcp-tools/src/graph-query/` | Canonical pattern reference: Zod validation at entry, Drizzle query, resilient error handling, no raw SQL |
| MCP integration test | `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts` | Tool count assertion at line 72; currently `62`, must be incremented by 4 |
| Story tools integration test | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts` | Pattern for per-tool integration tests via `handleToolCall` |
| Artifact tools integration test | `apps/api/knowledge-base/src/mcp-server/__tests__/artifact-tools-integration.test.ts` | Same pattern |

### Reuse Candidates

- `insertAgentInvocationSchema` / `selectAgentInvocationSchema` — from `packages/backend/database-schema/src/schema/wint.ts`
- `insertHitlDecisionSchema` / `selectHitlDecisionSchema` — same file
- `insertStoryOutcomeSchema` / `selectStoryOutcomeSchema` — same file
- `withRetry` from `apps/api/knowledge-base/src/db/client.ts` — used by existing tool handlers for transient DB failures
- `createMcpLogger` from `apps/api/knowledge-base/src/mcp-server/logger.ts` — per-tool logging
- `errorToToolResult` from `apps/api/knowledge-base/src/mcp-server/error-handling.ts` — standard error response formatting
- `@repo/db` `db` client — standard Drizzle access

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool function (Zod validation + Drizzle + resilient error handling) | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Clean pattern: `Schema.parse(input)` at entry, Drizzle ORM query only, try/catch with logger.warn on failure, typed return |
| MCP tool schema registration (zodToJsonSchema, getToolDefinitions) | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Shows how to add a new tool entry to `toolDefinitions` array with name, description, inputSchema |
| MCP tool handler registration (dispatch map + handleToolCall) | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Shows how to wire a handler function into the `toolHandlers` map and use `errorToToolResult` |
| Per-tool integration test via handleToolCall | `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts` | Pattern for writing focused integration tests per tool without spinning up the full MCP server |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0080]** MCP tool count assertion in `mcp-integration.test.ts` must equal `getToolDefinitions().length` exactly at commit time. Never set it speculatively ahead of implementation. After any fix cycle, re-run the full test suite to confirm no regressions. (category: testing)
  - *Applies because*: This story adds 4 new tools. The integration test count assertion at line 72 must be updated from `62` to `66`. Must be verified at implementation start since concurrent stories may have changed the count.

- **[KBAR-0080]** Tool count drift between story claims and actual `toolDefinitions` entries is a recurring source of CI failures. (category: edge-cases)
  - *Applies because*: Implementer must count `getToolDefinitions().length` at implementation start, not rely on the count stated here.

- **[WINT-0040]** Drizzle `db:generate` fails with sets.js module resolution error in this repo. Write migration SQL manually when needed. Use `BEGIN/COMMIT` + `CREATE TABLE IF NOT EXISTS` for idempotency. (category: edge-cases)
  - *Applies because*: This story does NOT require migrations (tables already created by WINT-0040), but if any schema amendments are discovered this lesson applies.

- **[WINT-4010]** MCP wrappers should call Drizzle/DB functions directly, not via HTTP intermediary. (category: architecture)
  - *Applies because*: All four new tools write/read to the `wint` DB tables directly; no sidecar HTTP call should be introduced.

### Blockers to Avoid (from past stories)

- Setting `mcp-integration.test.ts` tool count speculatively before adding tools to `getToolDefinitions()` — causes CI failure
- Using raw SQL instead of Drizzle ORM for DB access (violates established security pattern)
- Importing from barrel files — import directly from source files

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not applicable — MCP tools, no HTTP endpoints |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks; integration tests for each tool should target real DB if possible, or mock at the DB client level consistently with existing tests |

### Patterns to Follow

- Zod-first types: define input schemas with `z.object(...)`, validate at tool entry with `Schema.parse(input)`, never use TypeScript interfaces
- Drizzle ORM only — no raw SQL for data access
- `@repo/logger` for all logging — no `console.log`
- Named exports, no barrel files
- `try/catch` in each tool handler: log with `logger.warn`, return empty/null result rather than throwing — maintain resilient behavior
- Tool schema registration: use `zodToJsonSchema(InputSchema)` in `getToolDefinitions()` array

### Patterns to Avoid

- Speculative tool count in `mcp-integration.test.ts` — always verify at implementation start
- HTTP calls from MCP tool functions (use direct Drizzle queries)
- TypeScript `interface` declarations — use `z.infer<typeof Schema>` only
- Raw SQL strings in tool handlers

---

## Conflict Analysis

### Conflict: Dependency Readiness (WINT-0040)

- **Severity**: warning
- **Description**: WINT-0040 is `ready-for-qa` (not yet `completed`/`uat`). Its Drizzle schema changes are present in `wint.ts` and the tables are exported, but the migration may not yet be applied in all environments. The `hitlDecisions` and `storyOutcomes` tables must exist in the target DB before `workflow_log_decision` and `workflow_log_outcome` can write to them.
- **Resolution Hint**: Confirm WINT-0040 migration (`0032_wint_0040_hitl_decisions_story_outcomes.sql`) is applied in the dev DB before integration testing. If WINT-0040 is still in-flight, integration tests for `workflow_log_decision` and `workflow_log_outcome` may need to run against a migrated DB or mock the DB layer. Consider making WINT-0040 completion a gate before this story moves to implementation.

---

## Story Seed

### Title

Create Telemetry MCP Tools: workflow_log_invocation, workflow_log_decision, workflow_log_outcome, workflow_get_story_telemetry

### Description

**Context**: The wint platform has three telemetry tables in the `wint` schema: `agent_invocations`, `hitl_decisions` (added by WINT-0040), and `story_outcomes` (added by WINT-0040). The Drizzle schemas and Zod insert/select schemas for all three are already defined and exported from `@repo/database-schema`. The MCP server (`apps/api/knowledge-base/src/mcp-server/`) already exposes 62 registered tools following a well-established pattern.

**Problem**: Agents have no MCP-accessible interface to write telemetry data. Logging agent invocations, HITL decisions, and story outcomes requires direct DB access — not available to agents operating via MCP. Similarly, agents cannot query telemetry for a story without a dedicated read tool.

**Proposed solution**: Extend the existing MCP server with four new tools following the established handler + schema registration pattern:
1. `workflow_log_invocation` — write a row to `wint.agent_invocations`
2. `workflow_log_decision` — write a row to `wint.hitl_decisions` (with optional embedding generation)
3. `workflow_log_outcome` — upsert a row to `wint.story_outcomes` (unique constraint on storyId)
4. `workflow_get_story_telemetry` — read telemetry summary for a given story across all three tables

The high-frequency write risk (noted in the story index) should be addressed by making these tools fire-and-forget where feasible (non-blocking on write errors) and by documenting that batching is a future optimization (Phase 3 skill layer handles volume).

### Initial Acceptance Criteria

- [ ] AC-1: `workflow_log_invocation` tool is registered in `getToolDefinitions()` with a Zod input schema covering all non-nullable `agentInvocations` columns (agentName, invocationId, status required; all others optional)
- [ ] AC-2: `workflow_log_invocation` inserts a row into `wint.agent_invocations` via Drizzle ORM; returns the new row's `id`
- [ ] AC-3: `workflow_log_decision` tool is registered with a Zod input schema covering all non-nullable `hitlDecisions` columns (decisionType, decisionText, operatorId, storyId required; invocationId, context, embedding optional)
- [ ] AC-4: `workflow_log_decision` inserts a row into `wint.hitl_decisions`; embedding field is written as-is if provided (embedding generation deferred to Phase 3 skill layer)
- [ ] AC-5: `workflow_log_outcome` tool is registered with a Zod input schema covering all `storyOutcomes` columns (storyId, finalVerdict required; all metric columns optional with defaults)
- [ ] AC-6: `workflow_log_outcome` upserts to `wint.story_outcomes` using `INSERT ... ON CONFLICT (story_id) DO UPDATE` semantics; returns the upserted row's `id`
- [ ] AC-7: `workflow_get_story_telemetry` tool is registered with `storyId` as required input
- [ ] AC-8: `workflow_get_story_telemetry` returns a structured summary object: `{ invocations: AgentInvocation[], decisions: HitlDecision[], outcome: StoryOutcome | null }` for the given storyId
- [ ] AC-9: All four tools follow the resilient error handling pattern: exceptions are caught, logged with `@repo/logger`, and returned as MCP error results via `errorToToolResult` — not thrown
- [ ] AC-10: All four tools use Drizzle ORM exclusively — no raw SQL strings
- [ ] AC-11: `mcp-integration.test.ts` tool count assertion updated to reflect +4 new tools (verify exact count at implementation start against `getToolDefinitions().length`)
- [ ] AC-12: Each new tool has at minimum one integration test via `handleToolCall` following the pattern in `story-tools-integration.test.ts`
- [ ] AC-13: Input validation uses Zod at tool entry — invalid inputs return a structured error result, not an unhandled exception
- [ ] AC-14: Explicit input validation documented in tool descriptions (SQL injection risk: Drizzle parameterizes all queries; no user-constructed SQL strings permitted)

### Non-Goals

- Embedding generation for `hitlDecisions.embedding` — WINT-3040 handles this in Phase 3
- Batching or async queue for high-frequency writes — Phase 3 telemetry-log skill (WINT-3010/3020) handles volume; these MCP tools are synchronous single-write
- UI/frontend for telemetry display — deferred to WINT-3060
- Modifying any existing telemetry table schema (DDL is frozen post-WINT-0040)
- Writing to the `wint.agent_decisions` table (that is the agent-authored decisions table, separate from HITL `hitl_decisions`)
- Adding telemetry tools to `packages/backend/mcp-tools/` — they belong in the knowledge-base MCP server which has direct DB access

### Reuse Plan

- **Components**: `insertAgentInvocationSchema`, `insertHitlDecisionSchema`, `insertStoryOutcomeSchema` from `@repo/database-schema/wint.ts`; `agentInvocations`, `hitlDecisions`, `storyOutcomes` Drizzle table objects for queries
- **Patterns**: Tool handler pattern from `graph-get-franken-features.ts` (Zod parse → Drizzle query → try/catch); tool registration pattern from `tool-schemas.ts` (`zodToJsonSchema` + `getToolDefinitions()` array entry); handler dispatch registration in `tool-handlers.ts` `toolHandlers` map
- **Packages**: `@repo/db` (Drizzle client), `@repo/logger`, `@repo/database-schema` (table and Zod schema imports)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- There are four distinct tools, each requiring its own happy-path integration test and at minimum one error-case test (invalid input rejected by Zod).
- The `storyOutcomes` upsert is the highest-risk operation: the unique constraint means a duplicate `storyId` insert must not throw — verify the ON CONFLICT clause is correct.
- The `workflow_get_story_telemetry` read tool should be tested with: (a) a storyId with all three record types present, (b) a storyId with no records (all empty/null), (c) a storyId with only invocations and no outcome.
- WINT-0040 dependency: integration tests targeting `hitlDecisions` and `storyOutcomes` require the WINT-0040 migration to be applied in the test DB. Document this as a precondition in the test plan.
- MCP integration test tool count: must be re-verified at implementation start. Story claims count goes from 62 → 66; confirm this against the actual merged `getToolDefinitions().length` before writing the assertion.
- UAT must use real DB (ADR-005 applies); no mocking of the DB layer in UAT scenarios.

### For UI/UX Advisor

- No user-facing UI in this story. These are agent-facing MCP tools only.
- Tool descriptions (the `description` field in `getToolDefinitions()`) should be clear, concise, and include parameter intent — agents rely on these descriptions to decide when to invoke each tool.
- Recommend noting in tool descriptions: "fire this after agent completion" (log_invocation), "fire this when a human operator makes a review decision" (log_decision), "fire this once at story close" (log_outcome).

### For Dev Feasibility

- **ST-1**: Add Zod input schemas for all four tools to `tool-schemas.ts`. Import `insertAgentInvocationSchema` etc. from `@repo/database-schema` as the basis. Register each in `getToolDefinitions()` array.
- **ST-2**: Implement handler functions for `workflow_log_invocation` and `workflow_log_outcome` in `tool-handlers.ts` (or a new `telemetry-tool-handlers.ts` file). Wire into `toolHandlers` dispatch map.
- **ST-3**: Implement `workflow_log_decision` handler. Note: embedding field accepted as optional `number[]`; no embedding generation in this story.
- **ST-4**: Implement `workflow_get_story_telemetry` handler. Requires three separate Drizzle queries (one per table, filtered by storyId). Consider `Promise.all` for parallelism.
- **ST-5**: Update `mcp-integration.test.ts` tool count assertion. Add per-tool integration tests in a new `telemetry-tools-integration.test.ts` file following the pattern in `story-tools-integration.test.ts`.
- **Risk**: `storyOutcomes` upsert — Drizzle's `.insert().onConflictDoUpdate()` must target the `story_id` unique index. Verify the Drizzle conflict target syntax against the existing unique index name (`story_outcomes_story_id_idx`).
- **Risk**: WINT-0040 must be merged and migration applied before integration tests pass. Verify dependency state at implementation start.
- **Canonical references for subtask decomposition**:
  - Tool schema pattern: `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts`
  - Handler pattern: `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts`
  - Integration test pattern: `apps/api/knowledge-base/src/mcp-server/__tests__/story-tools-integration.test.ts`
  - Drizzle insert/upsert: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (upsert examples)
