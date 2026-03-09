---
generated: "2026-03-09"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-3030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 3 telemetry work; WINT-3010 (Gatekeeper Sidecar) and WINT-3020 (Invocation Logging Skill) are not reflected in the baseline but are confirmed present in codebase via stories index read

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Knowledge Base (pgvector, port 5433) | Deployed | Agent file lives alongside other agent artifacts |
| WINT-0040: Create Telemetry Tables (`wint.agent_invocations`, `wint.hitl_decisions`, `wint.story_outcomes`) | ready-for-qa | Target DB tables for the telemetry-logger agent's logging |
| WINT-0120: Create Telemetry MCP Tools (`workflow_log_invocation`, `workflow_log_decision`, `workflow_log_outcome`, `workflow_get_story_telemetry`) | Ready to Work | MCP tools the telemetry-logger agent will call |
| WINT-3010: Gatekeeper Sidecar | ready-for-qa | Direct dependency — WINT-3030 depends on WINT-3010 |
| WINT-3020: Invocation Logging Skill (`telemetry-log`) | needs-code-review | The skill that the telemetry-logger agent will wrap and invoke; establishes the fire-and-forget pattern |
| Existing haiku worker agents (e.g., `architect-barrel-worker`, `scope-defender`) | Deployed | Pattern reference for agent file structure with LangGraph Porting Notes |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-3010: Create Gatekeeper Sidecar | ready-for-qa | Direct dependency; WINT-3030 must not be started until WINT-3010 QA passes |
| WINT-3020: Implement Invocation Logging | needs-code-review | WINT-3020 defines the `telemetry-log` skill that WINT-3030 calls; WINT-3030 should not be started until WINT-3020 code review passes |

### Constraints to Respect

- Agent file must not add significant latency to workflows — fire-and-forget, non-blocking
- The `telemetry-log` skill is fire-and-forget; if it fails, the calling workflow must continue
- Agent must be haiku-powered (low cost, low latency, fast invocation)
- LangGraph Porting Notes section is a required pattern for all new haiku worker agent files (established by WINT-2080)
- Protected: existing `.claude/agents/` file structure, existing `telemetry-log` skill once WINT-3020 lands, `wint.agent_invocations` schema (owned by WINT-0040)

---

## Retrieved Context

### Related Endpoints

None — this story creates no HTTP endpoints. The agent calls the `workflow_log_invocation` MCP tool (WINT-0120) via the `telemetry-log` skill (WINT-3020).

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `telemetry-log` skill | `.claude/skills/telemetry-log/SKILL.md` | The skill this agent invokes to persist telemetry |
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Structural template for skills that are fire-and-forget |
| `architect-barrel-worker` agent | `.claude/agents/architect-barrel-worker.agent.md` | Example haiku worker agent with canonical structure |
| `scope-defender` agent | `.claude/agents/scope-defender.agent.md` | Example haiku worker agent with LangGraph Porting Notes section |
| `kb-writer` agent | `.claude/agents/kb-writer.agent.md` | Example of a minimal, focused worker agent |
| Gatekeeper sidecar | `packages/backend/sidecars/gatekeeper/` (WINT-3010) | Triggering context — agent may be invoked post-gate-check |

### Reuse Candidates

- `scope-defender.agent.md` — Full LangGraph Porting Notes section pattern; haiku model frontmatter; non-negotiables pattern
- `architect-barrel-worker.agent.md` — Minimal haiku worker agent structure; input/output/completion signal pattern
- `telemetry-log/SKILL.md` (WINT-3020 output) — The exact skill document this agent will call; defines parameters and error handling contract
- `token-log/SKILL.md` — Fire-and-forget skill structural pattern (if telemetry-log SKILL.md not yet landed)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Haiku worker agent with LangGraph Porting Notes | `.claude/agents/scope-defender.agent.md` | Full-featured haiku worker agent with Role, Mission, Inputs, Execution Phases, Output, Non-Negotiables, and LangGraph Porting Notes sections — canonical template for all new haiku workers |
| Minimal haiku worker agent structure | `.claude/agents/architect-barrel-worker.agent.md` | Shows compact format: frontmatter, input, checks, output format, completion signal, non-negotiables — use for token-efficient implementation |
| Fire-and-forget skill invocation pattern | `.claude/skills/token-log/SKILL.md` | Demonstrates skill call with null-safe error handling; the telemetry-log skill (WINT-3020) follows this exact pattern |
| Reusable generic worker agent | `.claude/agents/kb-writer.agent.md` | Shows "spawned by any agent" pattern — telemetry-logger follows same spawning model |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2080]** LangGraph Porting Notes section pattern for haiku worker agents (*category: architecture*)
  - *Applies because*: WINT-3030 creates a new haiku worker agent; the LangGraph Porting Notes section is now a REQUIRED section in all haiku worker agent files per WINT-2080's established pattern
- **[WINT-1150]** Testing agent instruction logic as pure functions provides effective behavioral coverage (*category: testing*)
  - *Applies because*: The telemetry-logger agent's core logic (invoke skill, handle null return, log warning) is testable as a pure function without LLM execution in CI
- **[WINT-1060]** Telemetry Hook Pre-Wire pattern — pre-wiring telemetry call sites with comment hooks reduces downstream implementation effort (*category: tooling*)
  - *Applies because*: WINT-3030 creates the agent that places those telemetry calls; agent instructions should document where `telemetry-log` invocations should be inserted in caller agents (WINT-3070 scope)

### Blockers to Avoid (from past stories)

- Do not start WINT-3030 implementation before `telemetry-log` SKILL.md (WINT-3020) is code-review-complete — the agent's core invocation pattern depends on this skill document existing
- Do not create a synchronous blocking telemetry call — latency risk is explicitly called out in the story's risk notes; the agent must invoke the skill in fire-and-forget mode
- Do not omit the LangGraph Porting Notes section — it is a required section in all new haiku worker agents (WINT-2080 lesson)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT must call the real `workflow_log_invocation` MCP tool against real `postgres-knowledgebase` (port 5433); mocks are acceptable for unit tests only |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (image/CDN), ADR-004 (auth), ADR-006 (E2E) do not apply — this story creates no HTTP endpoints, no frontend, no images, no auth surface.

### Patterns to Follow

- Haiku model (`model: haiku`) for all telemetry worker agents
- Fire-and-forget invocation: skill call → if null/error → log warning → continue
- `permission_level: read-only` unless the agent needs to write files; telemetry-logger likely only calls MCP tools, so `read-only` or `mcp-only` is appropriate
- LangGraph Porting Notes section with Input Contract, Execution Contract, Output Contract, Tool Requirements tables
- Completion signal ends the agent response: `TELEMETRY-LOGGER COMPLETE` | `TELEMETRY-LOGGER COMPLETE WITH WARNINGS: {N}` | `TELEMETRY-LOGGER BLOCKED: {reason}`

### Patterns to Avoid

- Synchronous blocking on telemetry — the skill call must never gate the primary workflow
- Defining the telemetry schema inline in the agent — import from `telemetry-log` SKILL.md
- Adding telemetry instrumentation to existing agents in this story (that is WINT-3070 scope)

---

## Conflict Analysis

### Conflict: Dependency Not Yet Resolved (warning)
- **Severity**: warning (non-blocking)
- **Description**: WINT-3030 depends on WINT-3010 (Create Gatekeeper Sidecar, currently `ready-for-qa`) and transitively on WINT-3020 (Invocation Logging Skill `telemetry-log`, currently `needs-code-review`). The story's `pending` status is correct — WINT-3030 cannot be started until both dependencies clear QA/code review. The seed can be generated now but implementation must be gated.
- **Resolution Hint**: Monitor WINT-3010 QA and WINT-3020 code review. When both are `uat` or `completed`, move WINT-3030 to `ready-to-work`. The seed and story file can be written now.

---

## Story Seed

### Title

Create `telemetry-logger` Worker Agent — Haiku-Powered Fire-and-Forget Telemetry Invocation

### Description

**Context**: The WINT Phase 3 telemetry infrastructure (WINT-0040 tables, WINT-0120 MCP tools, WINT-3020 `telemetry-log` skill, WINT-3010 gatekeeper sidecar) provides the plumbing for agent observability. To make telemetry capture reusable across the workflow system, a dedicated haiku worker agent is needed that encapsulates the fire-and-forget invocation pattern.

**Problem statement**: Without a dedicated `telemetry-logger` agent, every caller that wants to log telemetry must inline the skill invocation pattern and its error-handling logic. This duplicates boilerplate, increases the risk of latency-inducing mistakes (e.g., accidentally awaiting telemetry before continuing), and makes the fire-and-forget contract invisible to downstream agents.

**Proposed solution**: Create `.claude/agents/telemetry-logger.agent.md` as a haiku-powered worker agent that:
1. Receives telemetry payload as input (agentName, storyId, phase, status, tokens, duration, model, etc.)
2. Calls the `telemetry-log` skill with the provided payload
3. Handles null/error return silently — logs a warning and signals completion
4. Never blocks the calling workflow
5. Includes LangGraph Porting Notes for future WINT-9090 migration

### Initial Acceptance Criteria

- [ ] AC-1: A new agent file exists at `.claude/agents/telemetry-logger.agent.md` with correct frontmatter (`type: worker`, `model: haiku`, `permission_level: read-only`)
- [ ] AC-2: The agent file documents its single responsibility: invoke the `telemetry-log` skill with caller-provided payload and handle failure silently
- [ ] AC-3: The agent defines a clear Input schema documenting all fields passed to the `telemetry-log` skill (agentName, storyId, phase, status, inputTokens, outputTokens, cachedTokens, durationMs, modelName, errorMessage, invocationId)
- [ ] AC-4: The agent's execution phase implements fire-and-forget: call `telemetry-log` → if null or error → emit `logger.warn` with context → continue to completion signal (never re-throws, never blocks)
- [ ] AC-5: The agent includes a LangGraph Porting Notes section documenting Input Contract (state fields table), Execution Contract (phase steps), Output Contract, and Tool Requirements (following scope-defender.agent.md pattern)
- [ ] AC-6: The agent documents `spawned_by` in frontmatter (at minimum: any workflow orchestrator agent that calls telemetry)
- [ ] AC-7: The agent's non-negotiables section explicitly states it must never add latency to the calling workflow and must never throw or re-throw exceptions
- [ ] AC-8: The agent documents graceful degradation: if `telemetry-log` skill is unavailable (WINT-3020 not yet deployed), agent emits a warning and completes — it never blocks

### Non-Goals

- Instrumenting existing agents to call telemetry-logger (that is WINT-3070 scope)
- Creating the `workflow_log_invocation` MCP tool (WINT-0120 / WINT-3020 scope)
- Creating the `telemetry-log` skill document (WINT-3020 scope)
- Creating the Telemetry Query Command `/telemetry` (WINT-3060 scope)
- Decision logging with embeddings (`workflow_log_decision`) — that is WINT-3040 scope
- Writing any TypeScript source code — this is an agent instruction file (docs-only story)
- Modifying existing agent files or workflow orchestrators

### Reuse Plan

- **Components**: `scope-defender.agent.md` (LangGraph Porting Notes template), `architect-barrel-worker.agent.md` (minimal haiku worker structure), `kb-writer.agent.md` (spawned-by-any-agent pattern)
- **Patterns**: Fire-and-forget invocation pattern from `token-log` SKILL.md; LangGraph Porting Notes section from WINT-2080; completion signal pattern from all existing worker agents
- **Packages**: None — this is a `.agent.md` file only, no TypeScript

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a **docs-only / agent-prompt-only** story. The deliverable is `.claude/agents/telemetry-logger.agent.md` — a Markdown instruction file, not executable TypeScript.

**Testing strategy**: Agent instruction files are tested by behavioral review, not automated unit tests. Following the WINT-1150 lesson, if any executable logic is extracted for the agent (e.g., a helper function), that function should be covered by unit tests. For this story specifically, there is no TypeScript to test. UAT consists of:
1. Verifying the agent file exists with all required sections
2. Spawning the agent manually with a sample telemetry payload and confirming it calls the `telemetry-log` skill correctly
3. Verifying the agent does not propagate errors when the skill returns null (ADR-005: real MCP tool via port 5433)

**Risk**: UAT requires WINT-3020 (`telemetry-log` skill) to be code-review-complete before it can be called. Gate UAT on this.

### For UI/UX Advisor

Not applicable — this story has no user-facing UI. The agent file is a developer-facing instruction document. Structure and clarity of the Markdown is the UX concern; it should follow the established section ordering and tone of existing haiku worker agents (see `scope-defender.agent.md`).

### For Dev Feasibility

**Feasibility**: High confidence. This is a docs-only story — create one Markdown file following established patterns.

**Key canonical references for subtask decomposition**:

| Pattern | File |
|---------|------|
| Full haiku worker agent template | `.claude/agents/scope-defender.agent.md` |
| Minimal haiku worker agent | `.claude/agents/architect-barrel-worker.agent.md` |
| Fire-and-forget skill pattern | `.claude/skills/token-log/SKILL.md` |
| Spawnable-by-any pattern | `.claude/agents/kb-writer.agent.md` |

**Subtask suggestion**:
- ST-1: Draft agent frontmatter and Role/Mission sections (read scope-defender.agent.md and kb-writer.agent.md as templates)
- ST-2: Define Input schema and Execution Phases (fire-and-forget pattern from token-log SKILL.md)
- ST-3: Write Non-Negotiables, Non-Goals, and Completion Signals sections
- ST-4: Write LangGraph Porting Notes section (input state fields, execution contract, output contract, tool requirements)
- ST-5: Review against AC checklist and finalize

**Gating requirement**: Confirm WINT-3010 (ready-for-qa) and WINT-3020 (needs-code-review) have both advanced before marking WINT-3030 `ready-to-work`. The `telemetry-log` SKILL.md from WINT-3020 should be read during ST-1 to ensure the Input schema exactly matches the skill's parameter spec.

**Risk**: If WINT-3020's `telemetry-log` SKILL.md parameter spec changes during code review (currently `needs-code-review`), the Input schema in this agent file will need updating. Mitigation: read the final SKILL.md as the first step of implementation.
