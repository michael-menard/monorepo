---
generated: "2026-02-20"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: WINT-2100

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file found. Proceeding with codebase scanning only. WARNING: missing baseline — current reality grounded in code and stories index only.

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| sessionCreate MCP tool | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Live (WINT-0110 UAT) | Primary tool the agent will call to create sessions |
| sessionUpdate MCP tool | `packages/backend/mcp-tools/src/session-management/session-update.ts` | Live (WINT-0110 UAT) | Token metric accumulation during session lifecycle |
| sessionComplete MCP tool | `packages/backend/mcp-tools/src/session-management/session-complete.ts` | Live (WINT-0110 UAT) | Finalizing sessions — marks endedAt |
| sessionQuery MCP tool | `packages/backend/mcp-tools/src/session-management/session-query.ts` | Live (WINT-0110 UAT) | Querying active/historical sessions for state inspection |
| sessionCleanup MCP tool | `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` | Live (WINT-0110 UAT) | Archival of old completed sessions (dryRun=true default) |
| wint.contextSessions table | `packages/backend/database-schema/src/schema/wint.ts` | Deployed | Backing store; fields: sessionId, agentName, storyId, phase, inputTokens, outputTokens, cachedTokens, startedAt, endedAt |
| Session Management Zod schemas | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Live | SessionCreateInputSchema, SessionUpdateInputSchema, etc. — reuse directly |
| Session lifecycle reference patterns | `.claude/agents/_reference/patterns/session-lifecycle.md` | Live | Documents session bootstrap/close patterns (KBMEM-012/013) |
| turn-count-metrics-agent | `.claude/agents/turn-count-metrics-agent.agent.md` | Live | Exemplar haiku worker agent file for structure and frontmatter conventions |
| context-warmer agent (WINT-2080) | pending — not yet created | Pending | Direct precedent: same pattern (haiku worker, Phase 2, wraps a skill) |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2090 (Implement Session Context Management) | pending (blocks WINT-2100) | Direct dependency — WINT-2090 creates session-create and session-inherit skills that this agent wraps |
| WINT-0110 (Create Session Management MCP Tools) | UAT complete | Already live — WINT-2100 consumes its output; no overlap |
| WINT-9090 (Create Context Cache LangGraph Nodes) | pending, depends on WINT-2100 | Downstream — will port this agent to a LangGraph node at `nodes/context/` |
| WINT-1120 (Validate Foundation Phase) | pending | Different area, no overlap |

### Constraints to Respect

- WINT-2090 must be complete before WINT-2100 implementation begins (skills must exist for agent to wrap).
- `wint.contextSessions` table does not have a dedicated status column — active sessions are identified by `endedAt IS NULL`. Agent must not assume an explicit status field.
- `sessionCleanup` defaults to `dryRun=true` for safety — agent must explicitly set `dryRun: false` when performing actual cleanup. This is a hard safety constraint.
- Active sessions (endedAt IS NULL) are NEVER deleted by cleanup — cleanup only targets completed sessions older than retention period.
- `sessionUpdate` blocks updates on completed sessions (endedAt IS NOT NULL) — agent must not attempt to update a completed session.
- Session leaks occur when agents crash without calling `sessionComplete`. The agent must handle incomplete prior sessions during any session-start flow.

---

## Retrieved Context

### Related Endpoints

None — this story creates an agent file only. No HTTP endpoints involved. The agent interacts exclusively with session management MCP tools from WINT-0110.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| sessionCreate | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Creates new session records |
| sessionUpdate | `packages/backend/mcp-tools/src/session-management/session-update.ts` | Updates token metrics (incremental default) |
| sessionComplete | `packages/backend/mcp-tools/src/session-management/session-complete.ts` | Finalizes a session (sets endedAt) |
| sessionQuery | `packages/backend/mcp-tools/src/session-management/session-query.ts` | Query by agentName, storyId, activeOnly |
| sessionCleanup | `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` | Delete old completed sessions |
| session-create skill (WINT-2090) | `.claude/skills/session-create/SKILL.md` | Skill the agent wraps for session creation |
| session-inherit skill (WINT-2090) | `.claude/skills/session-inherit/SKILL.md` | Skill the agent wraps for leader→worker context inheritance |
| SessionManagement docs | `packages/backend/mcp-tools/src/session-management/SESSION-MANAGEMENT-TOOLS.md` | Full API reference for all 5 MCP tools |

### Reuse Candidates

- **SessionCreateInputSchema**: Zod schema already defined at `__types__/index.ts` — agent documents parameter shapes using this schema, does not redefine them.
- **Haiku worker agent pattern**: `turn-count-metrics-agent.agent.md` demonstrates the exact frontmatter and structural conventions for a haiku-model worker agent in this codebase.
- **Resilient error handling pattern**: All 5 session MCP tools follow the pattern: Zod validation fails fast, DB errors are logged as warnings and return `null` rather than throwing. The agent's documented error handling must align with these semantics.
- **Incremental token update mode**: `sessionUpdate` defaults to `mode: 'incremental'` — this is the correct default for concurrent-safe token accumulation. Agent documentation should recommend incremental mode.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Haiku worker agent file structure | `/Users/michaelmenard/Development/monorepo/.claude/agents/turn-count-metrics-agent.agent.md` | Complete exemplar: frontmatter (created/updated/version/type/permission_level/model/spawned_by), role section, mission, inputs, phases, output format, non-negotiables, completion signal — all present and correctly structured for a haiku worker |
| Session lifecycle full pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools/src/session-management/SESSION-MANAGEMENT-TOOLS.md` | Pattern 1 (Full Session Lifecycle) shows the canonical create→update→complete flow with correct function signatures and error handling semantics; Pattern 4 shows cleanup workflow |
| Session Zod schemas | `/Users/michaelmenard/Development/monorepo/packages/backend/mcp-tools/src/session-management/__types__/index.ts` | All 5 input schemas with field types, constraints, defaults — the agent's documented API contract must align with these exactly |

---

## Knowledge Context

### Lessons Learned

No KB search was performed (lessons_loaded: false). The following are inferred from codebase evidence:

- **[WINT-0110]** The `dryRun: true` default on `sessionCleanup` is a hard safety constraint — it was added deliberately to prevent accidental deletion. Any agent invoking cleanup must document that `dryRun: false` must be explicitly set. (category: pattern)
  - *Applies because*: WINT-2100 is responsible for lifecycle cleanup. Defaulting cleanup to dry-run prevents session leaks being "fixed" by accidentally deleting active sessions.

- **[WINT-0110]** `sessionUpdate` throws a business logic error (not null) when session is not found or already completed. This is distinct from DB errors which return null. Agent must handle these two failure modes separately. (category: blocker)
  - *Applies because*: If the session-manager agent attempts to update a session that was already completed (e.g., by a crashed prior invocation), it will throw, not return null. The agent must catch and handle this path explicitly.

- **[WINT-1140]** Worker agents that wrap infrastructure operations should document their escalation path for partial failures — if `sessionCreate` returns null (DB error), the agent must decide whether to proceed (fire-and-forget) or halt. (category: pattern)
  - *Applies because*: Index risk note: "Must prevent session leaks." A null from `sessionCreate` means the session was not recorded — the agent must define explicit behavior for this case.

### Blockers to Avoid (from past stories)

- Do NOT attempt to implement `session-create` or `session-inherit` skill logic inside this agent — those skills belong to WINT-2090. This agent wraps/invokes them; it does not implement them.
- Do NOT add status field checks on `contextSessions` records — there is no status column. Active sessions are `endedAt IS NULL` only.
- Do NOT call `sessionCleanup` without explicit `dryRun: false` in the cleanup trigger path — the default will silently preview but not delete.
- Do NOT use `sessionUpdate` on a session after calling `sessionComplete` — it will throw, not gracefully degrade.
- Do NOT assume concurrent safety from `sessionCreate` alone — the MCP tool auto-generates UUIDs but there is no uniqueness constraint on `(agentName, storyId)`. The agent must enforce its own "one active session per agent+story" invariant by querying first if needed.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real postgres-knowledgebase with real `wint.contextSessions` table; no mock sessions |
| ADR-006 | E2E Tests Required in Dev Phase | This story creates an agent `.md` file only — `frontend_impacted: false`; E2E may be `not_applicable` |

### Patterns to Follow

- **Haiku worker agent convention**: `type: worker`, `model: haiku`, `permission_level: docs-only` or `read-write` (evaluate based on whether the agent writes files), `spawned_by: [...]` listing all known leader agents that will spawn this worker.
- **Incremental token accumulation**: When documenting update behavior, recommend `mode: 'incremental'` (the default) for concurrent-safe token accumulation.
- **Resilient null handling**: When `sessionCreate` returns null, log a warning and continue (fire-and-forget mode) OR halt based on the agent's documented policy. Document which behavior applies and why.
- **Explicit cleanup opt-in**: Always document that cleanup requires `dryRun: false` — never assume implicit deletion.
- **Active-session detection**: Use `sessionQuery({ agentName, storyId, activeOnly: true })` to detect leaked sessions before creating a new one.
- **Phase tracking**: Use the `phase` field in `sessionCreate` to distinguish setup, plan, execute, review, and qa phases — enables downstream telemetry analysis.

### Patterns to Avoid

- Do NOT implement session business logic in the agent that belongs in the underlying MCP tools — the agent orchestrates, it does not re-implement CRUD.
- Do NOT make the agent a leader that spawns sub-agents — this is a worker agent invoked by leaders (context-warmer, batch-coordinator, dev-implement-story, etc.).
- Do NOT define new Zod schemas in the agent file — schemas live in `__types__/index.ts` in the mcp-tools package.

---

## Conflict Analysis

No blocking conflicts detected. No warnings raised.

WINT-2090 (the dependency providing session-create and session-inherit skills) is pending, which means WINT-2100 cannot be implemented until WINT-2090 completes. This is not a conflict — it is a correctly documented dependency. The story seed can be generated and elaborated while WINT-2090 is in progress.

WINT-9090 (Context Cache LangGraph Nodes, which will port this agent) depends on WINT-2100 being complete first. No overlap risk — that is a downstream dependency.

---

## Story Seed

### Title

Create session-manager Agent

### Description

**Context**: WINT-0110 (UAT complete) delivered five session management MCP tools — `sessionCreate`, `sessionUpdate`, `sessionComplete`, `sessionQuery`, `sessionCleanup` — backed by the `wint.contextSessions` database table. WINT-2090 (pending) will create `session-create` and `session-inherit` skills that implement the higher-level leader→worker context sharing protocol. Together these form the session infrastructure that Phase 2 agents depend on.

**Problem**: With the session MCP tools live and WINT-2090 skills incoming, there is no dedicated haiku-powered worker agent responsible for session lifecycle orchestration. Without it, leader agents must embed session lifecycle logic inline — creating duplication and making session leak prevention fragile. The index risk note is explicit: "Must prevent session leaks."

**Proposed Solution**: Create a new haiku-powered worker agent at `.claude/agents/session-manager.agent.md`. The agent's mission is to handle the three phases of session lifecycle on behalf of invoking leaders:

1. **Session Creation**: Invoke the `session-create` skill (WINT-2090) to create a new session in `wint.contextSessions`. Handle the `sessionCreate` null-return (DB error) case with configurable fire-and-forget or halt behavior. Optionally query for leaked prior sessions via `sessionQuery({ activeOnly: true })` before creating.

2. **Session Updates**: Accept token increment payloads from calling leaders and delegate to `sessionUpdate` using incremental mode. Handle the "session already completed" throw case gracefully.

3. **Session Cleanup**: When triggered at retention-check time, execute `sessionCleanup` with `dryRun: true` first (preview), report count, then proceed with `dryRun: false` only after confirmation. Protect active sessions (endedAt IS NULL) from deletion. Support configurable `retentionDays`.

The agent is designed to be spawned by any leader agent that manages session context — initially `context-warmer` (WINT-2080), and later `batch-coordinator` (WINT-6010) and any leader that inherits context via the `session-inherit` skill.

WINT-9090 will port this agent to a LangGraph node at `packages/backend/orchestrator/src/nodes/context/` for parity. The agent must be structured to make that port straightforward.

### Initial Acceptance Criteria

- [ ] AC-1: Agent file exists at `.claude/agents/session-manager.agent.md` with correct frontmatter: `type: worker`, `model: haiku`, `created`, `updated`, `version`, `permission_level`, `spawned_by`.
- [ ] AC-2: Agent documents session creation phase — invokes `session-create` skill (WINT-2090), handles `sessionCreate` null return with a documented policy (warn + continue by default, configurable to halt).
- [ ] AC-3: Agent documents leaked-session detection — before creating a new session, optionally queries `sessionQuery({ agentName, storyId, activeOnly: true })`. If an active session is found and the calling context does not match, the agent reports the leaked session and provides two options: (1) complete the leaked session and create a new one, (2) resume the leaked session.
- [ ] AC-4: Agent documents session update phase — delegates token increments to `sessionUpdate` using `mode: 'incremental'` (default). Handles the "session not found or already completed" throw case by emitting a warning and skipping the update (not crashing).
- [ ] AC-5: Agent documents session completion phase — calls `sessionComplete` with optional final token counts. Handles the "session already completed" throw case (idempotent guard).
- [ ] AC-6: Agent documents session cleanup phase — always executes `sessionCleanup` with `dryRun: true` first, reports `deletedCount` and `cutoffDate`, then requires explicit confirmation before calling with `dryRun: false`. Documents that active sessions (endedAt IS NULL) are never deleted.
- [ ] AC-7: Agent documents its completion signal format — emits structured YAML output summarizing: action performed (create/update/complete/cleanup), sessionId (if applicable), result (success/skipped/warned), and token totals where relevant.
- [ ] AC-8: Agent frontmatter `spawned_by` lists all known leader agents that will invoke it at Phase 2 completion (minimum: context-warmer agent from WINT-2080).
- [ ] AC-9: Agent non-negotiables section explicitly states: "Do NOT implement session skills — delegate to session-create and session-inherit (WINT-2090)"; "Do NOT delete active sessions (endedAt IS NULL)"; "MUST default cleanup to dryRun: true".
- [ ] AC-10: Agent is structured with clearly named phases (matching the LangGraph porting interface contract pattern from WINT-0160/WINT-9020) to facilitate the future LangGraph port in WINT-9090.

### Non-Goals

- Implementing the `session-create` or `session-inherit` skill logic — that is WINT-2090's scope.
- Creating any new MCP tools — the five from WINT-0110 are sufficient.
- Adding a `status` column to `wint.contextSessions` — active vs completed is determined by `endedAt IS NULL`.
- Integrating with leader agents (context-warmer, batch-coordinator) — this story delivers the agent file only; integration into leaders is scoped to each respective leader story.
- Implementing the LangGraph node port — that is WINT-9090's scope.
- Modifying the `contextSessions` database schema.
- Adding session analytics or aggregate queries — that is WINT-3090's scope (telemetry).
- Creating a `/session-manager` CLI command — this agent is always spawned by leaders, never invoked directly.

### Reuse Plan

- **Components**: All five session management MCP tools from WINT-0110 (`sessionCreate`, `sessionUpdate`, `sessionComplete`, `sessionQuery`, `sessionCleanup`). Session-create and session-inherit skills from WINT-2090.
- **Patterns**: Haiku worker agent frontmatter/structure from `turn-count-metrics-agent.agent.md`. Full session lifecycle pattern from `SESSION-MANAGEMENT-TOOLS.md` Pattern 1. LangGraph porting interface contract section (as established in WINT-0160) to facilitate WINT-9090.
- **Packages**: `@repo/mcp-tools` (session management tools). `@repo/logger` (error logging). `@repo/database-schema` (type reference for `SelectContextSession`).

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story produces a single `.agent.md` file — no TypeScript source code.
- UAT verification requires a live `wint.contextSessions` table (postgres-knowledgebase running). Follow ADR-005: no mock sessions in UAT.
- Test scenarios must cover all four lifecycle operations: create, update, complete, cleanup.
- Key edge cases to verify:
  - `sessionCreate` returns null (DB error) → agent emits warning and continues (documented policy verified).
  - Leaked session detected (prior active session for same agentName+storyId) → agent reports and presents options.
  - `sessionUpdate` on already-completed session → agent emits warning and skips (does not crash).
  - `sessionComplete` on already-completed session (idempotent guard) → agent handles gracefully.
  - `sessionCleanup` called without `dryRun: false` → dry run preview only; no deletion occurs.
  - `sessionCleanup` with `dryRun: false` → only sessions with `endedAt IS NOT NULL` older than retentionDays are deleted; active sessions untouched.
- E2E Playwright tests are NOT applicable (no UI changes). Mark `frontend_impacted: false`, `e2e: not_applicable`.

### For UI/UX Advisor

- This story creates an agent file only — no React components, no web UI.
- UX concern is the structured YAML output format the agent emits (consumed by invoking leader agents in their logs or telemetry display).
- The completion signal YAML should be scannable — use flat key-value fields for `action`, `sessionId`, `result`, and `token_totals`. Avoid deep nesting.
- The leaked-session detection report (AC-3) should present options in a numbered format consistent with existing worktree conflict patterns (established in WINT-1160's Case C flow).
- The cleanup preview output (AC-6) should clearly distinguish dry-run output from actual-deletion output — use a `dry_run: true` flag at the top of the YAML block to make this unambiguous.

### For Dev Feasibility

- Implementation is documentation-only: one new `.agent.md` file created. No TypeScript changes.
- The agent file should follow the exact structure of `turn-count-metrics-agent.agent.md`: frontmatter block → Role section → Mission section → Inputs section → phase-by-phase logic → Output Format → Non-Negotiables → Completion Signal.
- **Dependency gate**: WINT-2090 must be complete (session-create and session-inherit skills must exist at `.claude/skills/session-create/SKILL.md` and `.claude/skills/session-inherit/SKILL.md`) before the agent can reference those skills by canonical path.
- Complexity is LOW — the underlying MCP tool infrastructure (WINT-0110) is fully live. This story is specification and wrapping, not new infrastructure.
- **LangGraph porting interface contract**: Add a section documenting the porting interface per the pattern established in WINT-0160 (validated in WINT-9020). This is required for WINT-9090 to port the agent without reimplementing discovery.
- Subtask decomposition for implementation:
  1. ST-1: Read `SESSION-MANAGEMENT-TOOLS.md` and all five MCP tool implementations to confirm exact API signatures and error semantics.
  2. ST-2: Read WINT-2090 skill files to confirm `session-create` and `session-inherit` interfaces once that story is complete.
  3. ST-3: Draft agent frontmatter (type, model, spawned_by, permission_level).
  4. ST-4: Write Phase 1 (session creation with null-return handling and leaked-session detection).
  5. ST-5: Write Phase 2 (session update with completed-session throw handling).
  6. ST-6: Write Phase 3 (session completion with idempotent guard).
  7. ST-7: Write Phase 4 (cleanup with mandatory dry-run preview and explicit opt-in).
  8. ST-8: Write output format, non-negotiables, and completion signal sections.
  9. ST-9: Add LangGraph porting interface contract section.
- Canonical references for implementation:
  - Agent structure: `.claude/agents/turn-count-metrics-agent.agent.md`
  - MCP API: `packages/backend/mcp-tools/src/session-management/SESSION-MANAGEMENT-TOOLS.md`
  - Zod schemas: `packages/backend/mcp-tools/src/session-management/__types__/index.ts`
  - LangGraph porting section: `.claude/agents/doc-sync.agent.md` (if it contains the LangGraph porting interface contract added in WINT-0160) or `.claude/skills/doc-sync/SKILL.md`
