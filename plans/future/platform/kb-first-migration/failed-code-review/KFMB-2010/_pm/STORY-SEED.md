---
generated: "2026-02-26T00:00:00Z"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 1
---

# Story Seed: KFMB-2010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active in-progress stories at baseline time (no parallel work conflicts recorded)

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | Separate PostgreSQL at port 5433 with `stories` table, MCP server |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for story, knowledge-context, checkpoint, etc. |
| pm-bootstrap-generation-leader | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Current agent — version 4.0.0, haiku model — already has KB Mode + File Mode dual paths |
| stories table | `apps/api/knowledge-base/src/db/schema.ts` | `storyId`, `title`, `feature`, `epic`, `state`, `phase`, `priority`, `blocked`, `storyDir`, `storyFile`, etc. |
| story-crud-operations.ts | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | `kb_get_story`, `kb_list_stories`, `kb_update_story_status`, `kb_update_story`, `kb_get_next_story` — no `kb_create_story` |

### Active In-Progress Work

None recorded in baseline. All 20 KFMB stories are in backlog at time of seeding.

### Constraints to Respect

- All production DB schemas in `packages/backend/database-schema/` are protected — do not modify
- Knowledge base schemas and pgvector setup are protected — do not modify
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected
- `@repo/db` client package API surface is protected
- KFMB-2010 depends on KFMB-1020 (which introduces `kb_create_story` MCP tool) — cannot proceed until KFMB-1020 is complete

---

## Retrieved Context

### Related Endpoints

This story involves no HTTP API endpoints. All interactions are via MCP tool calls to the KB MCP server at `postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`.

### Related Components

| Component | File | Relevance |
|-----------|------|-----------|
| pm-bootstrap-generation-leader | `.claude/agents/pm-bootstrap-generation-leader.agent.md` | Primary agent to be rewritten |
| pm-bootstrap-setup-leader | `.claude/agents/pm-bootstrap-setup-leader.agent.md` | Sibling agent — context for what SETUP-CONTEXT provides |
| story-crud-operations.ts | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Contains existing story CRUD operations; `kb_create_story` will be added here by KFMB-1020 |
| tool-handlers.ts | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | Where `kb_create_story` handler will be wired (KFMB-1020 work) |
| tool-schemas.ts | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | MCP schema registry — `kb_create_story` schema will be added by KFMB-1020 |

### Reuse Candidates

- The existing KB Mode logic in `pm-bootstrap-generation-leader.agent.md` (version 4.0.0) already has a dual-mode structure — the File Mode path can be removed and the KB Mode path extended to call `kb_create_story` instead of raw psql
- The `ON CONFLICT (story_id) DO NOTHING` idempotency pattern already present in the current psql batch approach should be preserved in `kb_create_story` calls
- The existing `story-crud-operations.ts` Zod schema + db pattern is the canonical reference for how `kb_create_story` should be implemented (KFMB-1020), and this story's agent update must match that interface once known

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent definition | `/Users/michaelmenard/Development/monorepo/.claude/agents/pm-bootstrap-generation-leader.agent.md` | The exact file being rewritten — current structure with KB Mode / File Mode dual path and inline SUMMARY output is the starting point |
| MCP CRUD operation | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` | Zod input schema + typed async function pattern; `kb_create_story` will follow this exact pattern when added by KFMB-1020 |
| MCP tool handler | `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | How CRUD operations are wired into MCP server — shows the dependency injection and error handling pattern |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (KB query not available at seed time). Lessons noted from reading agent history:

- **[pm-bootstrap-generation-leader v4.0.0]** The agent already has a KB Mode that does inline psql batch inserts (raw SQL via temp file). KFMB-2010 replaces this with `kb_create_story` MCP tool calls. The raw psql fallback pattern was introduced because the MCP tool did not exist yet — this story eliminates the need for it.
  - *Applies because*: The current "DB insert" section of the agent uses psql directly; this must be replaced entirely with MCP tool calls.

- **[pm-bootstrap-generation-leader v4.0.0]** The agent currently retains File Mode alongside KB Mode. KFMB-2010 must only remove or ignore File Mode if the phase description says "no filesystem output" — verify whether File Mode should be preserved for backward compat or fully removed.
  - *Applies because*: The story states "no filesystem output" for story stubs but the `story.yaml` and `stories.index.md` files are still written to disk in the current KB Mode. Clarify whether those filesystem writes are also eliminated.

### Blockers to Avoid (from past stories)

- Do not assume `kb_create_story` MCP tool exists before KFMB-1020 ships. KFMB-2010 is blocked on KFMB-1020 completing.
- Do not hardcode psql connection strings in agent markdown files — the existing connection string pattern (`postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase`) is only for local dev and is already present in the current agent; `kb_create_story` via MCP removes the need for direct psql.
- Do not attempt to write `stories.index.md` or `story.yaml` files if the intent is truly filesystem-free — confirm scope with story.yaml `feature` field before implementing.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Not applicable — no HTTP endpoints in this story |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any UAT or integration testing of the rewritten agent must use the real KB MCP server, not mocked tool calls |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable (no frontend), but agent behavior should be verified end-to-end with a real bootstrap run |

### Patterns to Follow

- All new story CRUD input schemas in the KB layer use Zod with `z.object({ ... })` and `z.infer<typeof ...>` — no TypeScript interfaces
- `ON CONFLICT (story_id) DO NOTHING` semantics must be preserved: calling `kb_create_story` twice for the same story_id must be safe (idempotent)
- Agent files use frontmatter YAML, `## Mission`, `## Modes`, `## Inputs`, `## Files to Generate`, `## Output`, `## Error Handling`, `## Signals` sections — follow this structure when rewriting
- MCP tool calls in agent markdown are expressed as tool invocation descriptions, not code; the agent instructs Claude to call the tool

### Patterns to Avoid

- Do not use raw psql batch inserts in agent definitions once `kb_create_story` is available — the current pattern is a known workaround
- Do not write intermediate YAML files to `_bootstrap/` if the goal is KB-native — the current File Mode writes `SUMMARY.yaml` to disk; KB Mode returns SUMMARY inline
- Do not duplicate story state in both filesystem directories and the DB — the DB is the single source of truth post-migration

---

## Conflict Analysis

### Conflict: Blocking Dependency — kb_create_story Does Not Exist

- **Severity**: blocking
- **Description**: KFMB-2010 requires `kb_create_story` MCP tool which is delivered by KFMB-1020. As of the 2026-02-13 baseline, `kb_create_story` is not registered in `tool-handlers.ts`, `tool-schemas.ts`, or `story-crud-operations.ts`. KFMB-2010 cannot be elaborated into concrete implementation tasks until KFMB-1020's `kb_create_story` interface (input schema, return shape) is finalized.
- **Resolution Hint**: Start elaboration and feasibility work for KFMB-2010 in parallel with KFMB-1020, but mark KFMB-2010 as blocked until KFMB-1020 ships. The AC for KFMB-2010 should reference the `kb_create_story` input schema from KFMB-1020 as a hard input dependency.
- **Source**: codebase scan of `story-crud-operations.ts` and `tool-handlers.ts`

---

## Story Seed

### Title

KB-Native Bootstrap Generation Leader

### Description

**Context**: The `pm-bootstrap-generation-leader` agent (v4.0.0) currently operates in two modes: KB Mode (default, writes story files to disk AND inserts into the KB via raw psql batch) and File Mode (reads from `_bootstrap/` on disk). In KB Mode, the agent still writes `story.yaml` files and `stories.index.md` to the filesystem before performing a raw psql batch insert as a secondary step.

**Problem**: The raw psql approach bypasses the MCP abstraction layer, meaning the agent must know the connection string, manage a temp SQL file, and handle psql errors directly. This is a known workaround for the absence of `kb_create_story`. It also produces filesystem artifacts (story.yaml, stories.index.md) as side effects even in "KB Mode," which conflicts with the phase 2 goal of having bootstrap generation write exclusively to the stories table.

**Proposed Solution**: Once KFMB-1020 delivers `kb_create_story`, rewrite `pm-bootstrap-generation-leader` to call `kb_create_story` for each story stub via MCP (no raw psql), eliminate filesystem output for story stubs, and return the SUMMARY inline. The rewritten agent retains only KB Mode. File Mode is either removed or explicitly documented as deprecated. The `stories.index.md` file write may or may not be retained depending on whether downstream agents (KFMB-3010) still need it — this must be resolved during elaboration.

### Initial Acceptance Criteria

- [ ] AC-1: `pm-bootstrap-generation-leader` calls `kb_create_story` (via MCP tool) for each story from ANALYSIS — no raw psql batch is executed
- [ ] AC-2: `kb_create_story` calls are idempotent — re-running the agent for the same story set does not produce duplicate rows or errors
- [ ] AC-3: The agent does NOT write individual `story.yaml` files to the filesystem as part of story stub generation
- [ ] AC-4: The SUMMARY is returned inline (not written to `_bootstrap/SUMMARY.yaml`), consistent with the current KB Mode output contract
- [ ] AC-5: If the KB is unavailable when `kb_create_story` is called, the agent logs a warning and continues rather than halting (non-fatal degradation, consistent with existing behavior)
- [ ] AC-6: File Mode (reading from `_bootstrap/`) is explicitly removed or marked as no longer supported in the agent definition
- [ ] AC-7: The `stories.index.md` write behavior is explicitly decided (retained or removed) and documented in the agent definition — decision must be made during elaboration based on KFMB-3010 dependency analysis

### Non-Goals

- Do not implement `kb_create_story` itself — that is KFMB-1020's scope
- Do not migrate `_pm/` artifact reads/writes — that is KFMB-5040's scope
- Do not update the `/pm-bootstrap-workflow` command — that is KFMB-2030's scope
- Do not change `pm-bootstrap-setup-leader` — that is KFMB-2020's scope
- Do not touch any production database schemas in `packages/backend/database-schema/`
- Do not remove or modify the orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/`

### Reuse Plan

- **Components**: `pm-bootstrap-generation-leader.agent.md` (rewrite in place, preserve frontmatter version bump)
- **Patterns**: MCP tool call invocation pattern from other agents that call `kb_*` tools; Zod input validation pattern from `story-crud-operations.ts`
- **Packages**: MCP KB tools (delivered by KFMB-1020); no new packages needed

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story has no frontend or HTTP API surface — UAT and E2E are not applicable in the traditional sense. Testing should focus on:
- Dry-run validation: agent receives valid ANALYSIS, calls `kb_create_story` N times, returns correct SUMMARY with `kb_stories_inserted: N`
- Idempotency: running the agent twice for the same story set results in 0 duplicate rows (confirmed via KB query)
- Degradation: KB unavailable → agent warns and continues, SUMMARY reflects `kb_stories_inserted: 0` with warning
- File Mode removal: confirm that File Mode inputs (AGENT-CONTEXT.md, ANALYSIS.yaml) being present does NOT trigger file-based behavior in the rewritten agent

The KB MCP server must be running locally for any meaningful integration test (real KB at port 5433, not mocked).

### For UI/UX Advisor

Not applicable — this story is purely an agent definition (markdown) rewrite with no user-facing interface.

### For Dev Feasibility

Key unknowns to resolve during elaboration:

1. **`kb_create_story` input shape**: KFMB-1020 must finalize the MCP tool signature before this story can be fully specified. At minimum, the tool should accept `story_id`, `title`, `feature`, `epic`, `priority`, `state`, `phase`, `story_dir`, `story_file`, `depends_on` (for dependency edge creation), `risk_notes`, and `sizing_warning`. Confirm with KFMB-1020 implementer.

2. **`stories.index.md` fate**: The index file is referenced by KFMB-3010 (Index Elimination) and KFMB-3020. If KFMB-3010 is planned for the same sprint, writing the index may be safe to remove now. If not, removing it in KFMB-2010 would break downstream agents before KFMB-3010 ships. Recommend retaining `stories.index.md` write for now and removing it in KFMB-3010.

3. **`story.yaml` fate**: Individual `story.yaml` files are the current source of truth for story metadata on disk. Agents that read story.yaml (elab, dev, etc.) will break if these files disappear before KFMB-5010–5050 migrate those readers. Recommend retaining `story.yaml` writes for now and removing them in the artifact migration phase.

4. **Agent size**: The current agent is haiku-model (small context). Adding `kb_create_story` loop logic is straightforward, but the agent must not grow to require a larger model. Keep the MCP call loop concise.

5. **Dependency edge creation**: The current psql batch INSERT does not create rows in `story_dependencies` — it only inserts into `stories`. If `kb_create_story` should also register dependency edges (from `depends_on` fields in ANALYSIS), that must be coordinated with KFMB-1020. Clarify whether KFMB-2010 is responsible for dependency edge creation or whether that is deferred.

Canonical references for subtask decomposition:
- `/Users/michaelmenard/Development/monorepo/.claude/agents/pm-bootstrap-generation-leader.agent.md` — the file to rewrite
- `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — Zod + db pattern for `kb_create_story` implementation (KFMB-1020)
- `/Users/michaelmenard/Development/monorepo/apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — handler wiring pattern
