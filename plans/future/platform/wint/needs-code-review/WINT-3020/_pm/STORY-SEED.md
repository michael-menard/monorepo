---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-3020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-0040 (Telemetry Tables) reaching ready-for-qa status; the `wint.agent_invocations` schema is confirmed present in codebase (from direct schema read) but may not be reflected in baseline document.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `agentInvocations` Drizzle table | `packages/backend/database-schema/src/schema/wint.ts:658` | Target write table for the skill; fully defined with all required columns |
| `telemetry.workflow_events` table | `packages/backend/database-schema/src/schema/telemetry.ts` | Parallel append-only event log; same immutable-write pattern to follow |
| Session Management MCP tools | `packages/backend/mcp-tools/src/session-management/` | Closest structural analog: Zod-validated insert → DB → resilient error handling |
| Token-log skill | `.claude/skills/token-log/SKILL.md` | Existing skill that writes token data via MCP; same interaction model |
| Knowledge Base MCP server | `apps/api/knowledge-base/src/mcp-server/` | Pattern for registering new MCP tool handlers and schemas |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0040 | ready-for-qa | Defines `wint.agent_invocations`, `wint.agent_decisions`, `wint.agent_outcomes` tables — must be fully applied to DB before WINT-3020 can write to them |
| WINT-0120 | pending | The explicit dependency: provides `workflow_log_invocation` MCP tool that WINT-3020 would call; this story is NOT yet done |

### Constraints to Respect

- `wint.agent_invocations` is an append-only log; no update or delete operations in the skill
- High-frequency write scenario: index strategy is already in place (`agent_invocations_agent_name_started_at_idx`, `agent_invocations_status_idx`)
- `invocationId` is a unique text column — the skill must generate or receive a stable, unique ID per invocation (not auto-UUID from DB)
- `status` field accepts `'success'`, `'failure'`, `'partial'` — skill must enforce this enum
- Drizzle ORM is the required query layer; raw SQL inserts are not acceptable
- `@repo/logger` required for logging; no `console.log`
- Zod-first types required; no TypeScript interfaces

---

## Retrieved Context

### Related Endpoints

None — this story creates a new skill (a `.claude/skills/telemetry-log/` directory) and a supporting MCP tool. There are no HTTP endpoints involved. The skill calls an MCP tool that writes to the `wint.agent_invocations` PostgreSQL table via Drizzle.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Structural template: skill that calls a KB MCP tool to persist data |
| `session-create` MCP tool | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Best analog for a Zod-validated insert with resilient error handling |
| Session Management `__types__` | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Pattern for Zod input schemas exported from `__types__/index.ts` |
| MCP tool handler registration | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Where new MCP tool handlers are wired in |
| MCP tool schemas | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | Where new tool parameter schemas are declared |

### Reuse Candidates

| Candidate | Path | Reuse Type |
|-----------|------|-----------|
| `SessionCreateInputSchema` pattern | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Zod schema structure for insert-only MCP tool |
| `sessionCreate()` resilience pattern | `packages/backend/mcp-tools/src/session-management/session-create.ts` | try/catch with `logger.warn` on DB error, return null |
| `insertAgentInvocationSchema` / `selectAgentInvocationSchema` | `packages/backend/database-schema/src/schema/wint.ts:1877` | Drizzle-Zod generated schemas for the target table |
| `agentInvocations` Drizzle table | `packages/backend/database-schema/src/schema/wint.ts:658` | Direct import for the insert target |
| Telemetry skill triggering pattern | `.claude/skills/token-log/SKILL.md` | How a skill calls an MCP tool and reports results |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool: Zod-validated insert with resilient error handling | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Single-responsibility insert function, Zod parse-on-entry, try/catch with logger.warn, returns null on DB error — exactly the pattern needed for `workflow_log_invocation` |
| MCP tool Zod schema definition | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Shows how to define Zod input schemas for multiple related tools in one `__types__/index.ts` export file |
| Skill that calls MCP tool | `.claude/skills/token-log/SKILL.md` | Clear skill structure: usage, arguments, MCP call block, output, error handling, examples — template for the new `telemetry-log` skill |
| Append-only DB table with indexing | `packages/backend/database-schema/src/schema/telemetry.ts` | Shows composite index strategy and `immutable` write pattern for high-volume event tables |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2050]** Structured telemetry for cache population monitoring deferred until telemetry infrastructure (Phase 3) is ready — this confirms WINT-3020 is the right phase to implement the logging skill (category: tooling)
  - *Applies because*: WINT-3020 IS the Phase 3 telemetry infrastructure story being deferred to; the lesson validates timing.

- **[WINT-1060]** Telemetry hook pre-wire for WINT-3070 — the `db_updated` field in story-move is a natural telemetry signal that should emit a `state_transition` event; a comment hook was pre-wired in story-move for WINT-3070 to use (category: observability)
  - *Applies because*: WINT-3020 delivers the telemetry-log skill that WINT-3070 and other downstream stories depend on; the pre-wired hooks are waiting for this skill.

- **[KBAR-0080]** MCP tool count in `mcp-integration.test.ts` must match `getToolDefinitions()` exactly at commit time; setting count speculatively causes AC failures and fix cycles (category: testing)
  - *Applies because*: Adding `workflow_log_invocation` (and any companion tools) will increment the MCP tool count; the test assertion must be updated to the exact post-addition count.

- **[WKFL-002/003/008/010]** KB and Task tools frequently unavailable — deferred write pattern is de facto standard; 44% of stories encountered tool availability issues (category: workflow)
  - *Applies because*: The telemetry-log skill itself should be resilient to MCP unavailability; if the skill can't reach the DB, it should log a warning and not crash the calling workflow.

### Blockers to Avoid (from past stories)

- Setting MCP tool count in integration tests speculatively (before all tools are committed) — causes test failures that require a fix cycle
- Writing to `wint.agent_invocations` before WINT-0040 telemetry tables are fully migrated to the live DB
- Calling the telemetry-log skill without WINT-0120's `workflow_log_invocation` MCP tool registered — the skill has no write path if WINT-0120 is not done first

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real PostgreSQL (wint schema on port 5433); no mocking of DB writes in UAT |
| ADR-006 | E2E Tests Required in Dev Phase | Requires at least one happy-path E2E test during dev implementation; `frontend_impacted: false` for this story so E2E may be marked not_applicable |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not applicable — this story has no HTTP endpoints and no frontend UI.

### Patterns to Follow

- Zod input schema defined in `__types__/index.ts` alongside the tool implementation file
- `parse()` at the entry point of the tool function (fail fast on invalid input)
- Drizzle ORM `.insert().values().returning()` for the write
- `try/catch` with `logger.warn(...)` and `return null` on DB errors (never throw to caller)
- Skill SKILL.md follows the same structure as `token-log`: frontmatter, usage, arguments, task steps, MCP call block, output, error handling, examples
- Append-only write only — no update, no delete, no read in the initial skill

### Patterns to Avoid

- Raw SQL for the insert — use Drizzle ORM
- `console.log` — use `@repo/logger`
- TypeScript interfaces — use Zod schemas with `z.infer<>`
- Barrel files — import directly from source
- Blocking on MCP unavailability — skill must degrade gracefully (log warning, continue)
- Speculative tool count updates in `mcp-integration.test.ts`

---

## Conflict Analysis

### Conflict: Dependency not satisfied (WINT-0120)
- **Severity**: warning
- **Description**: WINT-3020 depends on WINT-0120 (Create Telemetry MCP Tools) which is currently `pending`. WINT-0120 is the story that creates `workflow_log_invocation`, `workflow_log_decision`, `workflow_log_outcome`, and `workflow_get_story_telemetry` MCP tools. Without WINT-0120, the telemetry-log skill has no MCP tool to call. This story is being generated explicitly by user request despite the dependency status.
- **Resolution Hint**: Two options: (1) Implement WINT-0120 first, then implement WINT-3020; (2) Implement both concurrently by defining the MCP tool contract in WINT-3020's spec and wiring it once WINT-0120 delivers. The skill can be stubbed with a clear error if the MCP tool is not yet registered. The story should document the WINT-0120 precondition explicitly in its ACs.

### Conflict: Prerequisite table may not exist in live DB
- **Severity**: warning
- **Description**: WINT-0040 (Create Telemetry Tables) is in `ready-for-qa` status as of the index. The `wint.agent_invocations` table exists in the Drizzle schema (`wint.ts`) but may not be migrated to the live postgres-knowledgebase DB if WINT-0040 has not completed QA and had its migration applied. Any UAT or integration test that writes to `wint.agent_invocations` will fail if the table is absent.
- **Resolution Hint**: Verify WINT-0040 has completed QA and the migration has been applied to the local and staging DB before executing WINT-3020 UAT. Add a DB prerequisite check to the story's dev-setup phase.

---

## Story Seed

### Title

Implement Invocation Logging Skill (`telemetry-log`) with `workflow_log_invocation` MCP Tool

### Description

Every agent spawn in the WINT workflow system currently has no persistent record. Leaders spawn workers, workers execute phases, and tokens/latency/outcomes are lost after the session ends. WINT-3020 introduces the **`telemetry-log` skill** — a lightweight Claude skill that any agent or workflow leader can call at the start and end of an invocation to write a structured record to `wint.agent_invocations` via a new `workflow_log_invocation` MCP tool.

The skill wraps a Drizzle ORM insert into the `wint.agent_invocations` table (defined in WINT-0040). It captures: agent name, story ID, phase, token counts (input/output/cached), duration, model name, status (success/failure/partial), and optional error message. The skill is fire-and-forget: it logs a warning if the MCP tool is unavailable and never crashes the calling workflow.

This story delivers the foundation for Phase 3 observability — the telemetry data written here is the raw material for ML training (WINT-3xxx), cost analysis, and agent performance dashboards. The skill is designed for high-frequency invocation; batching is deferred to a follow-on story (risk noted in index).

**Dependency note**: WINT-0120 (Create Telemetry MCP Tools) must be complete before the skill has a write path. If being implemented concurrently, the MCP tool contract must be agreed up-front.

### Initial Acceptance Criteria

- [ ] AC-1: A new skill file exists at `.claude/skills/telemetry-log/SKILL.md` following the `token-log` skill structure (frontmatter, usage, arguments, task, output, error handling, examples)
- [ ] AC-2: The skill documents a call to a `workflow_log_invocation` MCP tool with parameters: `agentName` (required), `storyId` (optional), `phase` (optional), `status` (required: `'success'|'failure'|'partial'`), `inputTokens` (optional int), `outputTokens` (optional int), `cachedTokens` (optional int, default 0), `durationMs` (optional int), `modelName` (optional), `errorMessage` (optional)
- [ ] AC-3: A new `workflow_log_invocation` MCP tool is implemented in `packages/backend/mcp-tools/src/telemetry/` following the `session-create.ts` pattern: Zod input schema in `__types__/index.ts`, insert function, resilient error handling (returns null on DB failure, logs warn)
- [ ] AC-4: The MCP tool inserts exactly one row into `wint.agent_invocations` per call using Drizzle ORM; `invocationId` is a caller-provided unique string (UUID format recommended); `createdAt` and `startedAt` default to `now()` if not provided
- [ ] AC-5: The MCP tool is registered in the MCP server (`tool-handlers.ts` and `tool-schemas.ts`); `mcp-integration.test.ts` tool count is updated to reflect the new tool
- [ ] AC-6: Unit tests cover: successful insert (returns row), DB failure (returns null, logs warn), invalid input (Zod parse error thrown), missing required fields (`agentName`, `status`) rejected
- [ ] AC-7: The skill's error handling section documents that if `workflow_log_invocation` returns null or errors, the calling agent logs a warning and continues — the skill must never block the primary workflow
- [ ] AC-8: The skill documents standard `phase` values: `'setup'`, `'plan'`, `'execute'`, `'review'`, `'qa'` (matching the existing column comment in `wint.ts`)
- [ ] AC-9: TypeScript type check passes with zero errors (`pnpm check-types`) and ESLint passes with zero errors on all new/changed files
- [ ] AC-10: All new tests pass in CI (`pnpm test`)

### Non-Goals

- Batching / async write queue for high-frequency scenarios (noted as risk; deferred to a follow-on story)
- `workflow_log_decision`, `workflow_log_outcome`, `workflow_get_story_telemetry` MCP tools (these are WINT-0120 scope, not WINT-3020)
- Retroactively logging past invocations
- Dashboard or query UI for the logged data
- Any modification to existing agents to call the skill (instrumentation of existing agents is a follow-on)
- Frontend changes — this story has no UI impact
- Modification of protected production DB schemas in `packages/backend/database-schema/` beyond the new `telemetry/` MCP tool module

### Reuse Plan

- **Components**: `session-create.ts` (insert pattern), `SessionCreateInputSchema` (Zod schema pattern), `token-log` SKILL.md (skill document structure)
- **Patterns**: Zod-first input schema in `__types__/index.ts`; try/catch with `logger.warn` and `return null`; Drizzle `.insert().values().returning()`; fire-and-forget skill execution model
- **Packages**: `@repo/database-schema` (imports `agentInvocations`, `insertAgentInvocationSchema`), `@repo/db` (Drizzle client), `@repo/logger` (logging), `zod` (validation)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has **no frontend** (`frontend_impacted: false`); ADR-006 E2E test requirement is not applicable.
- Unit tests should cover the MCP tool layer (not just CRUD): valid insert, DB failure resilience, Zod validation rejection.
- Integration tests should write to the real `wint.agent_invocations` table (local postgres-knowledgebase on port 5433) and assert the row exists; this requires WINT-0040's migration to be applied.
- UAT (per ADR-005) must use the real DB — no mock inserts. Verify the row is visible after the skill is called.
- The tool count assertion in `mcp-integration.test.ts` must be updated to the exact count after the new tool is registered (see KBAR-0080 lesson).
- Consider a test that verifies the `invocationId` unique constraint is enforced (duplicate call with same ID should fail or be handled gracefully).

### For UI/UX Advisor

Not applicable — this story has no user-facing UI. The "interface" is the SKILL.md document consumed by Claude agents. Recommend the skill document follow the established tone and structure of `token-log/SKILL.md` exactly for consistency across the skills library.

### For Dev Feasibility

- **Prerequisite gate**: Confirm WINT-0040 QA is complete and the `wint.agent_invocations` migration is applied to local DB before starting implementation. If not, implementation can proceed for the skill doc and MCP tool code but UAT will be blocked.
- **WINT-0120 coordination**: The `workflow_log_invocation` MCP tool is defined in WINT-0120's scope. If WINT-0120 is still pending, WINT-3020 must either wait or implement the MCP tool itself (acceptable if the teams agree to pull that scope forward).
- **Canonical references for subtask decomposition**:
  - ST-1 (Skill doc): Model on `.claude/skills/token-log/SKILL.md`
  - ST-2 (MCP tool Zod schema): Model on `packages/backend/mcp-tools/src/session-management/__types__/index.ts`
  - ST-3 (MCP tool insert function): Model on `packages/backend/mcp-tools/src/session-management/session-create.ts`
  - ST-4 (Register in MCP server): Follow pattern in `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` and `tool-schemas.ts`
  - ST-5 (Unit tests): Model on `packages/backend/mcp-tools/src/session-management/__tests__/session-create.test.ts`
  - ST-6 (Update mcp-integration.test.ts tool count): Critical — do not skip (KBAR-0080 lesson)
- **High-frequency write risk**: The `agentInvocations` table already has the correct index strategy from WINT-0040. For Phase 3 MVP, synchronous single-row inserts are acceptable. Monitor write latency; defer batching to a follow-on if p95 insert time exceeds 50ms under load.
- **invocationId generation**: The column is `text` with a unique constraint. Recommend the skill generates a `crypto.randomUUID()` if the caller does not provide one, matching the `session-create.ts` pattern. The skill doc should recommend callers pass a stable ID for idempotency (e.g., `{agentName}-{storyId}-{timestamp}`).
