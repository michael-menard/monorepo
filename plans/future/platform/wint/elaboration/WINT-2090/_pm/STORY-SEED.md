---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-2090

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the WINT phase work. The baseline captures application-level reality (Drizzle schemas, pgvector KB, Docker Compose) but does not reflect WINT-specific session infrastructure. Gap is expected and non-blocking — codebase scan supplements.

### Relevant Existing Features

| Feature | Status | Location |
|---------|--------|----------|
| `wint.contextSessions` DB table | Implemented (WINT-0010) | `packages/backend/database-schema/src/schema/wint.ts` |
| `sessionCreate` MCP tool | Implemented (WINT-0110) | `packages/backend/mcp-tools/src/session-management/session-create.ts` |
| `sessionUpdate` MCP tool | Implemented (WINT-0110) | `packages/backend/mcp-tools/src/session-management/session-update.ts` |
| `sessionComplete` MCP tool | Implemented (WINT-0110) | `packages/backend/mcp-tools/src/session-management/session-complete.ts` |
| `sessionQuery` MCP tool | Implemented (WINT-0110) | `packages/backend/mcp-tools/src/session-management/session-query.ts` |
| `sessionCleanup` MCP tool | Implemented (WINT-0110) | `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` |
| `context_cache.project_context` table | Implemented (WINT-0030) | `packages/backend/database-schema/src/schema/wint.ts` |
| `contextCacheGet` / `contextCachePut` MCP tools | Implemented (WINT-0100) | `packages/backend/mcp-tools/src/context-cache/` |
| Existing skills in `.claude/skills/` | Active | `.claude/skills/wt-new/`, `.claude/skills/doc-sync/`, etc. |
| `@repo/mcp-tools` package exports | Active | `packages/backend/mcp-tools/src/index.ts` |

**Key Discovery**: WINT-0110 is listed as `pending` in the stories index but the implementation exists on disk with 5 tools, full test suites, and a `SESSION-MANAGEMENT-TOOLS.md` doc. The tools are implemented but the story status has not been formally promoted. This is the **blocking conflict** for WINT-2090.

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0110 | pending (but code exists) | **HIGH** — WINT-2090 depends on WINT-0110 being formally complete |
| WINT-2070 | pending | Upstream dependency chain (WINT-2090 does not depend on it) |
| WINT-2080 | pending | Upstream dependency chain |
| WINT-1120 | pending | Phase 2 gate; WINT-2090 belongs to Phase 2 |

### Constraints to Respect

- Session cleanup strategy is flagged in index as a risk — the `sessionCleanup` tool exists (dry-run safe by default) but an ownership rule and scheduled invocation strategy are not yet defined
- WINT-0030 (`context_cache.sessions` table) is the backing store; its schema is fixed and cannot be modified by this story
- No barrel files — import directly from source per CLAUDE.md
- All new code must use Zod schemas (no TypeScript interfaces)
- Skills live in `.claude/skills/{skill-name}/SKILL.md` format
- Skills are markdown procedural documents, not TypeScript packages

---

## Retrieved Context

### Related Endpoints

Not applicable — this story creates Claude Code skills (markdown files), not HTTP endpoints. The session MCP tools are called by the skills at runtime.

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `sessionCreate` | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Primary skill dependency |
| `sessionUpdate` | `packages/backend/mcp-tools/src/session-management/session-update.ts` | Used in session-create skill for token accumulation |
| `sessionComplete` | `packages/backend/mcp-tools/src/session-management/session-complete.ts` | Used in session-inherit to finalize a session |
| `sessionQuery` | `packages/backend/mcp-tools/src/session-management/session-query.ts` | Used in session-inherit to look up leader session |
| `sessionCleanup` | `packages/backend/mcp-tools/src/session-management/session-cleanup.ts` | Referenced in cleanup strategy section |
| `contextCacheGet` | `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` | Pattern reference for session-based context retrieval |
| `/wt-new` skill | `.claude/skills/wt-new/SKILL.md` | Canonical skill structure example |
| `/doc-sync` skill | `.claude/skills/doc-sync/SKILL.md` | Canonical skill structure example (more complex) |

### Reuse Candidates

- **`@repo/mcp-tools` session management tools** — the five tools from WINT-0110 are the foundation; both skills are thin wrappers around these tools
- **Existing skill markdown structure** — `/wt-new/SKILL.md` and `/doc-sync/SKILL.md` demonstrate the frontmatter + usage + execution instructions pattern
- **`SelectContextSession` type** (auto-generated Drizzle Zod schema from `@repo/database-schema`) — skills pass session IDs as string handles; no raw DB types needed in skill layer
- **`@repo/logger`** — referenced in tool implementations; skills may surface structured output for leader consumption

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Skill SKILL.md structure (simple) | `.claude/skills/wt-new/SKILL.md` | Clean frontmatter, Usage block, step-by-step workflow, structured output format |
| Skill SKILL.md structure (complex multi-phase) | `.claude/skills/doc-sync/SKILL.md` | Phase-based execution sections, graceful degradation, integration patterns |
| Session MCP tool (creation) | `packages/backend/mcp-tools/src/session-management/session-create.ts` | Zod validation at entry, resilient null return on DB error, `@repo/logger` warn pattern |
| Session MCP tool types | `packages/backend/mcp-tools/src/session-management/__types__/index.ts` | Zod-first input schemas, optional UUID generation, incremental vs absolute mode |

---

## Knowledge Context

### Lessons Learned

No directly matching KB lessons exist for session-create or session-inherit skill patterns (these are new). The following apply by analogy from the existing skills:

- **[doc-sync]** Skill markdown must include both a usage section (for developers invoking it) and an execution instructions section (for the agent executing it). Skills without clear execution steps tend to be misused by calling agents.
  - *Applies because*: session-create and session-inherit are meant to be called by leader agents; the execution instructions must be precise about what MCP tools to call and in what order.

- **[wt-new]** Skills that produce structured output (e.g., `WORKTREE CREATED / branch: ... / path: ...`) allow calling orchestrators to parse results programmatically.
  - *Applies because*: session-create skill should output a `SESSION CREATED / session_id: ...` block so leader agents can capture the session ID for downstream use.

- **[WINT-1011 / shim work]** DB-first patterns must handle null returns gracefully. The session tools already return null on DB error; the skills must surface these failures clearly rather than silently continuing.
  - *Applies because*: if `sessionCreate` returns null (DB error), the skill must not pretend a session was created.

### Blockers to Avoid (from past stories)

- **WINT-0110 not formally complete**: Working on WINT-2090 before WINT-0110 is promoted to a complete/UAT state risks building on tools whose APIs may still change. Verify tool API stability before writing skill execution instructions.
- **Session lifecycle ownership ambiguity**: Risk Note from index — "Session cleanup strategy needed." The skills must clearly document who is responsible for calling `sessionComplete` and when. If both a leader and a worker call `sessionComplete`, double-completion errors will be thrown.
- **Token accumulation race conditions**: `sessionUpdate` in incremental mode is concurrency-safe (SQL arithmetic), but absolute mode is not. Skills must enforce incremental mode for worker token reporting.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If a UAT is required for these skills, it must use the real postgres-knowledgebase DB, not mocks. Skills themselves are markdown and don't have unit tests; integration/UAT must use live DB. |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no UI). However, if an agent is built to execute these skills, integration tests for the agent invocation flow should be added in dev phase. |

These skills do not involve API paths (ADR-001), infrastructure stacks (ADR-002), images (ADR-003), or auth (ADR-004).

### Patterns to Follow

- Skill frontmatter must include `name` and `description` fields (see `/wt-new/SKILL.md` line 1-4)
- Execution instructions must be numbered and sequential
- Structured output blocks (e.g., `SESSION CREATED\n  session_id: {uuid}`) allow orchestrators to parse results
- Graceful degradation: if DB is unavailable, skill should emit a warning and allow the workflow to continue in degraded mode (no telemetry), not fail hard
- Session IDs must be UUID strings — never fabricate them; always use the value returned by `sessionCreate`

### Patterns to Avoid

- Do not call `sessionComplete` from both the leader and the worker — this causes a double-completion error (Business Logic Error from WINT-0110 docs)
- Do not use absolute mode for incremental token updates — use `mode: 'incremental'` (default) to prevent race conditions in parallel workers
- Do not store session IDs in files — pass them as arguments to spawned workers via system prompt injection or initial context
- Do not create a barrel file for the skills — each skill is a standalone SKILL.md in its own directory

---

## Conflict Analysis

### Conflict: Blocking Dependency — WINT-0110 Status Mismatch
- **Severity**: blocking
- **Description**: WINT-0110 ("Create Session Management MCP Tools") is listed as `status: pending` in the stories index, which formally means it has not been completed. However, the implementation is fully present on disk at `packages/backend/mcp-tools/src/session-management/` with 5 tools, 7 test suites, and a `SESSION-MANAGEMENT-TOOLS.md` documentation file. WINT-2090's index entry states `Depends On: WINT-0110` and the dependency gate has not been officially cleared.
- **Resolution Hint**: Before proceeding with WINT-2090 implementation, verify WINT-0110 readiness:
  1. Run `pnpm test --filter @repo/mcp-tools` to confirm all session-management tests pass
  2. If tests pass, update WINT-0110 status to `uat` or `completed` in `stories.index.md`
  3. Only after WINT-0110 is formally promoted can WINT-2090 begin implementation

### Conflict: Session Cleanup Ownership Undefined
- **Severity**: warning
- **Description**: The index risk note says "Session cleanup strategy needed." The `sessionCleanup` tool exists (dryRun=true by default as safety), but there is no defined owner, schedule, or trigger for cleanup. If WINT-2090 creates the `session-create` and `session-inherit` skills without also defining the cleanup contract, sessions will accumulate indefinitely. This is a non-blocking gap — WINT-2090 can document the cleanup strategy without implementing a scheduler, but the ACs must include the strategy definition.
- **Resolution Hint**: Include a "Session Lifecycle" section in both skill files that explicitly states: (1) leader calls `session-create`, (2) workers inherit via `session-inherit`, (3) leader calls `sessionComplete` at workflow end, (4) `sessionCleanup` is invoked periodically with `retentionDays: 90` (by a future WINT-2100 agent or scheduled script). This documents the contract even before WINT-2100 is built.

---

## Story Seed

### Title

Implement Session Context Management — session-create and session-inherit Skills

### Description

**Context**: The WINT platform requires stateful workflow coordination between leader agents and their spawned workers. Without shared session context, each worker agent starts cold — it has no knowledge of the story being worked, the phase, or the token budget consumed so far. This limits observability and makes token accounting per-story impossible at the leader level.

**Problem Statement**: Leader agents in Phase 2+ workflows (context cache, telemetry) need to open a session at the start of a story workflow and pass that session ID to each spawned worker. Workers need a standard way to "inherit" a session (register their contribution to it via incremental token updates) and report their results back through the session record. Without this, the `wint.contextSessions` table (and the 5 MCP tools from WINT-0110) are operational but unused.

**Proposed Solution Direction**: Create two Claude Code skills:
1. **`session-create`** — Called by a leader agent at workflow start. Invokes `sessionCreate` MCP tool to open a record in `wint.contextSessions`. Emits a structured `SESSION CREATED / session_id: {uuid}` output block that the leader captures and injects into worker system prompts.
2. **`session-inherit`** — Called by a worker agent upon receiving a session ID. Invokes `sessionQuery` to verify the session exists and is active. Worker accumulates token counts during its execution and calls `sessionUpdate` (incremental mode) to report usage. On worker completion, documents the session ID in its output for the leader.

Both skills must handle the case where the database is unavailable (graceful degradation: log a warning, proceed without session tracking).

The skills do not implement the cleanup scheduler — that is the responsibility of WINT-2100 (session-manager Agent). This story defines the cleanup contract as documentation only.

### Initial Acceptance Criteria

- [ ] AC-1: `session-create` skill file created at `.claude/skills/session-create/SKILL.md` with valid YAML frontmatter (`name`, `description`)
- [ ] AC-2: `session-create` skill invokes `sessionCreate` MCP tool with `agentName`, `storyId`, and `phase` as inputs; emits structured output: `SESSION CREATED\n  session_id: {uuid}\n  agent: {agentName}\n  story: {storyId}`
- [ ] AC-3: `session-create` skill handles null return from `sessionCreate` (DB error) by emitting `SESSION UNAVAILABLE — continuing without session tracking` and proceeding without failing the workflow
- [ ] AC-4: `session-inherit` skill file created at `.claude/skills/session-inherit/SKILL.md` with valid YAML frontmatter
- [ ] AC-5: `session-inherit` skill accepts a `session_id` argument, invokes `sessionQuery` to confirm the session is active (`activeOnly: true`), and emits a confirmation or a `SESSION NOT FOUND` warning
- [ ] AC-6: `session-inherit` skill documents how a worker calls `sessionUpdate` (incremental mode) to report token usage — with an explicit example showing `mode: 'incremental'` and the fields (`inputTokens`, `outputTokens`, `cachedTokens`)
- [ ] AC-7: Both skills include a "Session Lifecycle" section documenting the full contract: leader opens (session-create) → workers inherit (session-inherit) → leader closes (sessionComplete) → periodic cleanup (sessionCleanup, future WINT-2100)
- [ ] AC-8: Both skills include a "Graceful Degradation" section: if the DB is unavailable or session creation returns null, the workflow continues without session tracking (warning emitted, not an error)
- [ ] AC-9: `session-create` skill output format is parseable by a calling leader orchestrator — structured block, not prose
- [ ] AC-10: `session-inherit` skill explicitly states that workers must NOT call `sessionComplete` — only the leader that opened the session may complete it (prevents double-completion errors)

### Non-Goals

- **Do not implement a session cleanup scheduler** — deferred to WINT-2100 (session-manager Agent)
- **Do not modify `wint.contextSessions` schema** — the DB table is fixed from WINT-0010/WINT-0110
- **Do not create TypeScript code** — skills are markdown procedural documents only
- **Do not update existing leader agents** to use these skills — that is the scope of WINT-2110 (Update 5 High-Volume Agents to Use Cache)
- **Do not implement the context-pack sidecar** (WINT-2020) or role-pack sidecar (WINT-2010) — those are separate stories
- **Do not touch the context-cache MCP tools** (WINT-0100) — this story is session-only

### Reuse Plan

- **Tools**: Invoke `sessionCreate`, `sessionQuery`, `sessionUpdate`, `sessionComplete`, `sessionCleanup` from `@repo/mcp-tools/session-management/` — do not reimplement
- **Patterns**: Follow `/wt-new/SKILL.md` for single-purpose skill structure; follow `/doc-sync/SKILL.md` for multi-phase execution instructions
- **Packages**: `@repo/mcp-tools`, `@repo/database-schema` (types only, via tool layer — skills themselves are markdown)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

Skills (markdown `.md` files) are not directly unit-testable. The test plan should focus on:
- **Integration verification**: Run the skill manually against the real postgres-knowledgebase DB (`wint.contextSessions` table) and confirm session records are created and queryable
- **Graceful degradation test**: Simulate a DB-unavailable scenario (stop postgres) and confirm the skill emits the warning message rather than failing
- **Double-completion prevention**: Verify that if a worker incorrectly attempts to call `sessionComplete`, the tool throws a clear error (this is already enforced by WINT-0110 tooling — the test verifies the skill's documentation is correct)
- **UAT (per ADR-005)**: Must use real postgres-knowledgebase, not mocks. The `wint.contextSessions` table must be live.
- Per ADR-006: If an agent is built to execute these skills in dev phase, a happy-path integration test must run against the live DB.

### For UI/UX Advisor

Not applicable — these are backend infrastructure skills with no UI surface. The skills produce structured text output consumed by other agents, not by users directly. No UI/UX review is required.

However, note that the session ID output format (structured block) should be consistent with how worktree-related skills emit their output (see `wt-new` WORKTREE CREATED block). Consistency in structured output across skills reduces parsing complexity for orchestrators.

### For Dev Feasibility

**Effort estimate**: Low — 2 markdown files, no TypeScript code.

**Subtasks**:
1. **ST-1 (Prerequisite)**: Verify WINT-0110 is formally complete (run tests, check tool API stability). If not promoted, block and raise.
2. **ST-2**: Write `.claude/skills/session-create/SKILL.md` — frontmatter, usage, execution steps (invoke `sessionCreate`, emit structured block, handle null return)
3. **ST-3**: Write `.claude/skills/session-inherit/SKILL.md` — frontmatter, usage, execution steps (accept `session_id` arg, verify via `sessionQuery`, document incremental `sessionUpdate` pattern, document leader-owns-complete rule)
4. **ST-4**: Add "Session Lifecycle" and "Graceful Degradation" sections to both skills
5. **ST-5**: Verify skill frontmatter passes any lint or validation used by doc-sync skill (check for required fields: `name`, `description`)

**Canonical references for implementation**:
- Session tool API: `packages/backend/mcp-tools/src/session-management/SESSION-MANAGEMENT-TOOLS.md`
- Session types: `packages/backend/mcp-tools/src/session-management/__types__/index.ts`
- Skill structure: `.claude/skills/wt-new/SKILL.md`
- Complex skill structure: `.claude/skills/doc-sync/SKILL.md`

**Risk**: The only non-trivial risk is the WINT-0110 dependency. If the session tools are not formally promoted, implementation should pause until they are. The tools appear fully implemented on disk — this is likely just a status tracking gap, not a real blocker.
