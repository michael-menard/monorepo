---
generated: "2026-02-17"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0160

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Context gathered from direct codebase inspection and
  WINT story index + WINT-0150 story file.

### Relevant Existing Features

| Feature | File/Location | Status | Notes |
|---------|--------------|--------|-------|
| doc-sync agent | `.claude/agents/doc-sync.agent.md` | EXISTS (v1.1.0) | Created 2026-02-07, updated 2026-02-16 by WINT-0150 |
| doc-sync skill | `.claude/skills/doc-sync/SKILL.md` | EXISTS (v1.0.0) | Full 7-phase workflow documented |
| /doc-sync command | `.claude/commands/doc-sync.md` | EXISTS (v1.0.0) | Triggers doc-sync.agent.md |
| workflow.phases table | postgres-knowledgebase | pending (WINT-0070) | Agent has MCP tool references for it |
| workflow.components table | postgres-knowledgebase | pending (WINT-0070) | Agent has MCP tool references for it |
| WINT-0150 (Create doc-sync Skill) | `wint/UAT/WINT-0150/` | uat | Added database query support to existing agent |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-0150 | uat | Direct predecessor — WINT-0150 modified the exact agent file this story concerns |
| WINT-0170 | pending | Depends on WINT-0160 completion — adds doc-sync gate to phase/story completion |
| WINT-9020 | pending | Depends on WINT-0160 — ports doc-sync agent logic to LangGraph node |

### Constraints to Respect

- Zod-first types: no TypeScript interfaces
- No barrel files
- `@repo/logger` for logging (not console.log)
- Haiku model for doc-sync agent (performance requirement)
- Agent file follows WINT-standard frontmatter format
- No database writes in doc-sync agent (read-only access to postgres-knowledgebase)
- Graceful degradation when postgres-knowledgebase is unavailable

---

## Retrieved Context

### Related Endpoints

None — doc-sync agent uses MCP tools, not HTTP endpoints.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| doc-sync.agent.md | `.claude/agents/doc-sync.agent.md` | Primary artifact — already exists at v1.1.0 |
| doc-sync SKILL.md | `.claude/skills/doc-sync/SKILL.md` | User-facing skill documentation |
| doc-sync command | `.claude/commands/doc-sync.md` | Command that invokes the agent |
| WINT-0150 story | `wint/UAT/WINT-0150/WINT-0150.md` | Established what the agent should do |

### Reuse Candidates

- **Existing doc-sync.agent.md (v1.1.0)**: The agent file already exists and was enhanced by
  WINT-0150. Its current state should be the primary input for gap assessment.
- **WINT-2080 and WINT-2100 story patterns**: These stories follow the exact same pattern
  (context-warmer agent, session-manager agent) — skill exists first, then a haiku agent
  implements the skill. WINT-0160 follows this same pattern.
- **WINT-3030, WINT-3030, WINT-5020, WINT-5080, WINT-5090**: All similar haiku-powered worker
  agent creation stories. Same structural pattern throughout the WINT epic.

---

## Knowledge Context

### Lessons Learned

No KB lessons available (Phase 0 bootstrap in progress; KB infrastructure from WINT-0010/WINT-0120
are prerequisites). Lessons gathered from direct analysis of WINT-0150 story file and existing code.

**Key lesson from WINT-0150:** The story scope was "extend the skill and agent files" — it modified
the existing `doc-sync.agent.md` to add MCP tool references in frontmatter (specifically the
`mcp_tools` field referencing `mcp__postgres-knowledgebase__query-workflow-phases` and
`mcp__postgres-knowledgebase__query-workflow-components`). This means the agent already exists and
has been enhanced for WINT database-aware operation.

### Blockers to Avoid (from past stories)

- Do not re-create `doc-sync.agent.md` from scratch — it exists and has been through UAT (WINT-0150)
- Do not assume workflow.phases/workflow.components tables are live — they are pending (WINT-0070);
  the agent must degrade gracefully
- Do not add MCP server tools that don't exist yet — keep agent compatible with current server state

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| N/A | Zod-First Types | All TypeScript types must use Zod schemas, not interfaces |
| N/A | Haiku Model for doc-sync | Worker agents in the doc-sync role use haiku for performance |
| N/A | Graceful DB degradation | Agent must work in file-only mode when database unavailable |

### Patterns to Follow

- Haiku-powered worker agent pattern (same as WINT-2080, WINT-2100, WINT-3030)
- Frontmatter includes: created, updated, version, type, name, description, model, tools, mcp_tools
- Completable MCP tool list in frontmatter for future LangGraph porting (WINT-9020 dependency)
- 7-phase workflow structure defined in skill, agent executes it

### Patterns to Avoid

- Do NOT create a second doc-sync agent file — consolidate in the existing one
- Do NOT add hard dependencies on WINT-0070/0080 tables — these are soft/graceful-degradation deps
- Do NOT diverge the agent's completion signals from the skill's completion signals

---

## Conflict Analysis

### Conflict: pre-existing artifact

- **Severity**: warning (non-blocking)
- **Description**: The index entry for WINT-0160 states "new agent file" as the infrastructure
  deliverable. However, `doc-sync.agent.md` already exists at version 1.1.0, created on 2026-02-07
  and updated by WINT-0150 on 2026-02-16. The "new agent file" pre-dates this story. The story
  as written in the index was either authored before the agent existed, or was a placeholder that
  predates WINT-0150's scope expansion.
- **Resolution Hint**: Redefine WINT-0160 as a **validation and hardening story** for the
  existing `doc-sync.agent.md`. The goal is to confirm the agent is production-ready, meets the
  full WINT Phase 0 spec, and is a viable portability target for WINT-9020 (Create doc-sync
  LangGraph Node). This is consistent with WINT-9020's dependency on WINT-0160 — WINT-9020 needs
  a stable, complete agent to port.

---

## Story Seed

### Title

WINT-0160: Validate and Harden doc-sync Agent for Production Readiness

### Description

**Context:**

The `doc-sync` agent (`doc-sync.agent.md`) was originally created on 2026-02-07 alongside the
doc-sync skill. WINT-0150 (now in UAT) extended the agent by adding MCP tool references for the
postgres-knowledgebase workflow tables, enabling hybrid file+database documentation sync.

The index entry for WINT-0160 predates this extension and states "new agent file" as the
deliverable. The agent file now exists at v1.1.0. WINT-9020 (Create doc-sync LangGraph Node,
Phase 9) depends on WINT-0160, meaning WINT-0160 must establish a production-ready, stable agent
that is a viable porting target.

**Problem:**

The current `doc-sync.agent.md` v1.1.0 was extended by WINT-0150 but has not been formally
validated as a standalone, complete WINT Phase 0 deliverable. Specifically:

1. The agent's frontmatter MCP tool names (`mcp__postgres-knowledgebase__query-workflow-phases`,
   `mcp__postgres-knowledgebase__query-workflow-components`) were added by WINT-0150 but these
   exact tool names should be verified against the actual postgres-knowledgebase MCP server
   registration (WINT-0080 seeded the server with workflow components).
2. The agent's `version` field (1.1.0) and `updated` date should reflect the WINT-0150 changes.
3. No formal acceptance test exists specifically for the agent's standalone operation as a
   WINT-aware worker — WINT-0150's acceptance criteria focused on the skill file (SKILL.md) and
   the agent frontmatter, not on the agent's end-to-end execution behavior.
4. WINT-9020 needs the agent to have a stable, documented interface that LangGraph can mirror —
   currently there is no porting guide or interface contract for the agent's behavior.

**Proposed Solution:**

Treat WINT-0160 as a hardening and validation story:

1. **Verify** the existing `doc-sync.agent.md` meets all WINT Phase 0 requirements:
   - MCP tool names match actual postgres-knowledgebase server registrations
   - Frontmatter fields complete and correct (version, updated, tools, mcp_tools)
   - Completion signals defined (DOC-SYNC COMPLETE, DOC-SYNC COMPLETE (warnings), etc.)

2. **Validate** end-to-end operation in both file-only and hybrid modes:
   - Run `/doc-sync` against the real codebase
   - Confirm graceful degradation when workflow tables unavailable
   - Confirm SYNC-REPORT.md is generated correctly in both modes

3. **Document** the agent interface contract for WINT-9020 porting:
   - Define the canonical inputs, phases, outputs that LangGraph must replicate
   - Add a "LangGraph Porting Notes" section to the agent file or SKILL.md

4. **Update** frontmatter if any corrections found (MCP tool names, version, timestamps)

This story is deliberately narrow: it does not create new logic, only verifies the existing agent
is correct and complete.

### Initial Acceptance Criteria

- [ ] **AC-1: MCP Tool Name Verification**
  - Verify `mcp__postgres-knowledgebase__query-workflow-phases` matches the registered tool name
    in the postgres-knowledgebase MCP server (WINT-0080 registered workflow components)
  - Verify `mcp__postgres-knowledgebase__query-workflow-components` is the correct tool name
  - If names are incorrect, update the agent frontmatter with verified names
  - Document the correct tool names in SKILL.md if not already present

- [ ] **AC-2: Agent Frontmatter Completeness**
  - Agent frontmatter contains all required WINT standard fields:
    `created`, `updated`, `version`, `type`, `name`, `description`, `model`, `tools`, `mcp_tools`
  - `model` is explicitly `haiku` (not sonnet or opus)
  - `updated` field reflects 2026-02-16 (WINT-0150 modification date)
  - `version` follows semantic versioning and is at minimum 1.1.0

- [ ] **AC-3: Graceful Degradation Verification**
  - Running `/doc-sync` when postgres-knowledgebase tables (workflow.phases, workflow.components)
    do not exist completes without error
  - SYNC-REPORT.md generated with `database_status: unavailable` or equivalent
  - No unhandled exceptions from database query failure paths

- [ ] **AC-4: File-Only Mode Functional**
  - Running `/doc-sync` with only `.agent.md` files available (no database) produces valid
    documentation updates
  - AGENTS.md, COMMANDS.md or docs/workflow/ files updated from file frontmatter only
  - SYNC-REPORT.md accurately reflects file-only operation

- [ ] **AC-5: Completion Signal Consistency**
  - Agent defines the four completion signals matching the skill:
    - `DOC-SYNC COMPLETE`
    - `DOC-SYNC COMPLETE (warnings)`
    - `DOC-SYNC CHECK FAILED`
    - `DOC-SYNC BLOCKED: {reason}`
  - Completion signals are documented in the agent file under a "Completion Signals" section

- [ ] **AC-6: LangGraph Porting Interface Contract**
  - SKILL.md or doc-sync.agent.md contains a "LangGraph Porting Notes" section that defines:
    - The canonical inputs the agent expects (flags: --check-only, --force)
    - The 7-phase workflow as the logical execution contract
    - The outputs: SYNC-REPORT.md + modified documentation files
    - The MCP tools used (for LangGraph node dependency mapping)
  - This section is not implementation code — it is a porting guide for WINT-9020

- [ ] **AC-7: WINT-0170 Integration Point Documented**
  - Agent documentation notes that WINT-0170 will add it as a gate to phase/story completion
  - The check-only flag (`--check-only`) behavior is explicitly documented as the gate mechanism:
    exit 0 = docs in sync, exit 1 = docs out of sync, blocks completion

- [ ] **AC-8: Story Index Update**
  - WINT stories index updated: WINT-0160 status changed from `pending` to the appropriate
    status when story moves forward

### Non-Goals

- Do NOT re-implement or replace `doc-sync.agent.md` logic from scratch
- Do NOT create new MCP tools (that belongs to WINT-0080 and related stories)
- Do NOT implement WINT-0170 (the doc-sync gate) — that is a separate story
- Do NOT port the agent to LangGraph — that is WINT-9020
- Do NOT add new phases to the 7-phase workflow — the established structure is correct
- Do NOT modify the pre-commit hook behavior — it is working correctly
- Do NOT change the model from haiku to anything else

### Reuse Plan

- **Components**: Existing `doc-sync.agent.md` (v1.1.0) is the primary artifact — audit and
  correct, do not replace
- **Patterns**: WINT-2080/2100 as reference for what a "complete" haiku worker agent looks like
  in this epic; these are comparison targets for completeness checking
- **Packages**: No new package dependencies; uses existing MCP tools and Bash/Read/Edit tools

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Focus on two test modes: file-only (no database) and hybrid (database available with WINT-0080 data)
- The primary risk is MCP tool name mismatch — a manual verification step against the live
  postgres-knowledgebase server registration is needed (not unit-testable in isolation)
- Pre-commit hook test (--check-only mode) is a critical regression test — must verify it still
  exits with correct codes after any changes
- The LangGraph porting contract (AC-6) should be reviewed by whoever will implement WINT-9020

### For UI/UX Advisor

Not applicable — this is a documentation/agent file story with no user interface components.

### For Dev Feasibility

- **Complexity: Very Low** — This is an audit, verify, and document story. No new logic is written.
- **Key risk: MCP tool name verification** — The postgres-knowledgebase MCP server must be running
  to verify tool names. If WINT-0080 (seed workflow tables) is still pending, the tool names
  may not be live yet. Dev should check WINT-0080 status before starting.
- **Implementation approach**: (1) Read current agent file, (2) Compare against WINT-0150 ACs
  to confirm all changes were applied, (3) Check MCP tool names against server, (4) Add
  LangGraph porting section, (5) Run `/doc-sync` in both modes to validate, (6) Update
  frontmatter if any corrections needed.
- **Estimate: 1-2 story points** — This is a small validation story, not a construction story.
  If significant gaps are found, a scope escalation should be flagged before implementation.
- **WINT-9020 coordination**: Before closing WINT-0160, confirm with the WINT-9020 story owner
  (or the index) that the porting contract documented in AC-6 is sufficient for their needs.
