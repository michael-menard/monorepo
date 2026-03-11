---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-3070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 3 telemetry work; WINT-3020 and WINT-3030 did not exist at baseline time. Active dependency (WINT-3020) is in `needs-code-review` — not yet merged to main.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `telemetry-log` skill (WINT-3020) | `.claude/skills/telemetry-log/SKILL.md` (created by WINT-3020, in needs-code-review) | The skill this story will add calls to |
| `workflow_log_invocation` MCP tool (WINT-3020) | `packages/backend/mcp-tools/src/telemetry/workflow-log-invocation.ts` | The MCP tool each agent will call |
| `wint.agent_invocations` DB table (WINT-0040) | `packages/backend/database-schema/src/schema/wint.ts` | Destination table for all telemetry records |
| `token-log` skill | `.claude/skills/token-log/SKILL.md` | Existing fire-and-forget skill pattern; structural template |
| WINT workflow commands (10 targets) | `.claude/commands/` | Files that need telemetry call additions |
| WINT workflow agents | `.claude/agents/` | Agent `.md` files that orchestrate the commands |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-3020 | needs-code-review | **Direct dependency** — produces `telemetry-log` skill and `workflow_log_invocation` MCP tool that this story calls. Must be merged before WINT-3070 UAT. |
| WINT-3030 | needs-code-review | Creates `telemetry-logger` agent; no direct overlap with WINT-3070 scope |
| WINT-3010 | ready-for-code-review | Gatekeeper sidecar; touches different agents — no overlap |

### Constraints to Respect

- **Non-breakage constraint**: Changes to 10 core workflow orchestrators must not alter any existing workflow logic. Telemetry calls are appended/injected, not replacing existing behavior.
- **Fire-and-forget only**: The `telemetry-log` skill must never be awaited in a way that blocks the workflow. Per WINT-3020 architecture: if `workflow_log_invocation` returns null or errors, the workflow continues.
- **Docs-only story**: The 10 target workflows are Markdown `.md` files (`/commands/` and/or `/agents/`). This story modifies Markdown command/agent documents, not TypeScript source code.
- Protected production DB schemas must not be touched — this story only adds Markdown instrumentation.

---

## Retrieved Context

### Related Endpoints

None. The 10 target files are Markdown command/agent definitions, not HTTP endpoints. `workflow_log_invocation` is an MCP tool call embedded in Markdown skill invocation syntax.

### Related Components

| File | Type | Role in WINT-3070 |
|------|------|-------------------|
| `.claude/commands/pm-bootstrap-workflow.md` | Orchestrator command | Target 1 — add telemetry-log call |
| `.claude/commands/elab-epic.md` | Orchestrator command | Target 2 — add telemetry-log call |
| `.claude/commands/elab-story.md` | Orchestrator command | Target 3 — add telemetry-log call |
| `.claude/commands/dev-implement-story.md` | Orchestrator command | Target 4 — add telemetry-log call |
| `.claude/commands/dev-fix-story.md` | Orchestrator command | Target 5 — add telemetry-log call |
| `.claude/commands/qa-verify-story.md` | Orchestrator command | Target 6 — add telemetry-log call |
| `.claude/commands/pm-refine-story.md` | Orchestrator command | Target 7 — add telemetry-log call |
| `.claude/commands/story-status.md` | Utility command | Target 8 — add telemetry-log call |
| `.claude/commands/story-update.md` | Utility-skill command | Target 9 — add telemetry-log call |
| `.claude/commands/story-move.md` | Utility-skill command | Target 10 — add telemetry-log call |
| `.claude/skills/telemetry-log/SKILL.md` | Skill document (from WINT-3020) | The skill to reference/invoke |
| `.claude/skills/token-log/SKILL.md` | Skill document | Existing structural template |

### Reuse Candidates

- **`telemetry-log` skill invocation pattern** from WINT-3020's SKILL.md — every target file will reference this skill in the same way
- **`token-log` placement pattern** — `token-log` is already embedded in many command files; the placement of `telemetry-log` should follow the same convention (typically at phase completion boundaries)
- **Phase name vocabulary** from WINT-3020 AC-8: `setup`, `plan`, `execute`, `review`, `qa` — use these standard values when specifying `phase` in each agent's telemetry call

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (docs-only/agent-prompt-only) — all 10 target files are Markdown command and agent documents. No TypeScript implementation patterns apply. The pattern reference is the telemetry-log SKILL.md produced by WINT-3020 and the existing token-log invocation blocks already present in command files.'

---

## Knowledge Context

### Lessons Learned

Lessons KB was not queried (MCP tool not available in this context). The following are inferred from the WINT-3020 story artifacts and the WINT project context:

- **[WINT-3020]** `telemetry-log` is fire-and-forget: null returns must never block the calling workflow. *Applies because*: every one of the 10 target commands must follow this same non-blocking pattern.
- **[WINT-3020]** Instrumentation of existing agents was explicitly listed as a non-goal for WINT-3020, deferred to WINT-3070. *Applies because*: this is exactly the scope WINT-3070 is now picking up.
- **[KBAR-0080 lesson, referenced in WINT-3020]** MCP tool count assertions must be updated in the same commit as tool registration. *Applies because*: if any follow-on story adds additional MCP registrations, this constraint remains.
- **General workflow lesson**: Changes to core orchestrator files (commands, agents) carry high blast radius — even a small syntax error in a Markdown command file can break every story that goes through that workflow stage.

### Blockers to Avoid (from past stories)

- **Breaking existing workflow logic**: Adding `telemetry-log` invocations must be purely additive. Never reorder or remove existing phase logic to accommodate the telemetry call.
- **Incorrect phase labels**: Using non-standard phase names (anything outside `setup`, `plan`, `execute`, `review`, `qa`) will produce inconsistent telemetry. Always use the vocabulary from WINT-3020 AC-8.
- **Blocking on telemetry failure**: Do not add `await` or error propagation from `telemetry-log` in a way that stops the primary workflow if the MCP tool is unavailable.
- **Depending on WINT-3020 not yet merged**: The `telemetry-log` skill and `workflow_log_invocation` MCP tool must be available before UAT for this story. Gate UAT on WINT-3020 merge.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | UAT must call real `workflow_log_invocation` MCP tool against real `wint.agent_invocations` table; no mocking |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — `frontend_impacted: false`; this is a docs-only story with no UI surface |

### Patterns to Follow

- Fire-and-forget telemetry invocation: call `telemetry-log` skill at the end of each primary workflow phase, never as a blocking gate
- Standard `phase` values: `setup`, `plan`, `execute`, `review`, `qa`
- Placement convention: add telemetry call at completion boundaries, matching where `token-log` is currently called (where applicable)
- Keep each command file's existing structure intact — telemetry calls are additions at the end of phase completion blocks

### Patterns to Avoid

- Adding telemetry calls that could throw unhandled errors and halt the workflow
- Using custom/non-standard phase names not documented in the skill
- Placing telemetry calls in the middle of logic blocks where a failure would corrupt state
- Modifying any TypeScript source files (this is a docs-only story)

---

## Conflict Analysis

### Conflict: dependency not yet merged
- **Severity**: warning (not blocking)
- **Description**: WINT-3020 is in `needs-code-review` status. The `telemetry-log` skill and `workflow_log_invocation` MCP tool it produces are required for this story's UAT step. The story can be elaborated, seeded, and the Markdown edits planned now, but UAT must be gated on WINT-3020 completing code review and being merged.
- **Resolution Hint**: Proceed with story generation. Add an explicit prerequisite check in the Dev Setup section: "Verify WINT-3020 is merged and `telemetry-log` skill is available before running UAT."

### Conflict: broad blast radius across 10 core workflow files
- **Severity**: warning (not blocking)
- **Description**: The 10 target files are the most frequently used orchestrator commands in the entire WINT system. Any error introduced (even a typo or malformed Markdown block) would affect every story going through any of those workflow stages.
- **Resolution Hint**: AC should require that each modified file is reviewed for unintended changes to existing logic. A simple "diff the existing phases against the modified file" verification step should be included. Consider a dry-run pass that reads each file and identifies the exact insertion point before committing changes.

---

## Story Seed

### Title
Update 10 Core Workflow Commands with `telemetry-log` Invocations

### Description

Every primary WINT workflow command (pm-bootstrap-workflow, elab-epic, elab-story, dev-implement-story, dev-fix-story, qa-verify-story, pm-refine-story, story-status, story-update, story-move) currently completes phases without recording any structured observability data. When an agent session ends, all knowledge of which orchestrator ran, what story it processed, and how long each phase took is lost.

WINT-3020 established the `telemetry-log` skill and `workflow_log_invocation` MCP tool to capture exactly this data. This story is the instrumentation step: add fire-and-forget `telemetry-log` invocations to each of the 10 core commands at their phase completion boundaries.

The changes are purely additive Markdown edits to existing command/agent files. No TypeScript code is written. Each file receives one or more telemetry call blocks following the `token-log` placement convention. The telemetry calls must never block the workflow — they are side-effects that log to `wint.agent_invocations` and return, regardless of success or failure.

### Initial Acceptance Criteria

- [ ] **AC-1**: `pm-bootstrap-workflow.md` includes a `telemetry-log` invocation block at the completion of its primary execution phase(s), referencing standard `phase` values from the skill
- [ ] **AC-2**: `elab-epic.md` includes a `telemetry-log` invocation block at the completion of its primary execution phase(s)
- [ ] **AC-3**: `elab-story.md` includes a `telemetry-log` invocation block at the completion of its primary execution phase(s) (both interactive and autonomous modes handled)
- [ ] **AC-4**: `dev-implement-story.md` includes a `telemetry-log` invocation block at its phase completion boundary, covering the implementation phase at minimum
- [ ] **AC-5**: `dev-fix-story.md` includes a `telemetry-log` invocation block at its phase completion boundary
- [ ] **AC-6**: `qa-verify-story.md` includes a `telemetry-log` invocation block at its phase completion boundary
- [ ] **AC-7**: `pm-refine-story.md` includes a `telemetry-log` invocation block at its phase completion boundary
- [ ] **AC-8**: `story-status.md` includes a `telemetry-log` invocation block at its completion (or documents why telemetry is not applicable for this read-only utility)
- [ ] **AC-9**: `story-update.md` includes a `telemetry-log` invocation block at its completion
- [ ] **AC-10**: `story-move.md` includes a `telemetry-log` invocation block at its completion
- [ ] **AC-11**: All 10 telemetry call blocks use only standard `phase` values (`setup`, `plan`, `execute`, `review`, `qa`) as documented in WINT-3020 AC-8
- [ ] **AC-12**: No existing workflow logic in any of the 10 files is removed or reordered — all changes are purely additive
- [ ] **AC-13**: Each telemetry invocation passes `agentName` (the orchestrator/command name), `storyId` (the story being processed), and `phase` at minimum; `status` is set to `success` or derived from the phase outcome
- [ ] **AC-14**: UAT: after running any one of the 10 modified commands against a real story, a row appears in `wint.agent_invocations` with the correct `agent_name`, `story_id`, and `phase` — prerequisite: WINT-3020 must be merged and `wint.agent_invocations` table applied

### Non-Goals

- Writing any TypeScript source code (this is a docs-only/Markdown story)
- Modifying the `telemetry-log` skill itself (that is WINT-3020's scope)
- Instrumenting agent worker files (e.g., `elab-analyst.agent.md`, `dev-execute-leader.agent.md`) — only the 10 named top-level orchestrator command files are in scope
- Adding batching, async queuing, or error escalation to the telemetry calls
- Retroactively backfilling telemetry for past story executions
- Dashboard or query UI for telemetry data (WINT-3060 scope)
- Any changes to the `wint.agent_invocations` table schema

### Reuse Plan

- **Skill**: `.claude/skills/telemetry-log/SKILL.md` (from WINT-3020) — the invocation block template
- **Patterns**: `token-log` placement convention — telemetry calls go at phase completion boundaries, same location as existing `token-log` calls where present
- **Phase vocabulary**: `setup`, `plan`, `execute`, `review`, `qa` from WINT-3020 AC-8
- **Packages**: None — this is a docs-only story

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a Markdown-only story (`touches_backend: false`, `touches_frontend: false`, `frontend_impacted: false`). ADR-006 E2E requirement does not apply.
- The single UAT case (AC-14) requires: WINT-3020 merged, MCP server running with `workflow_log_invocation` registered, and `wint.agent_invocations` table applied to local postgres-knowledgebase (port 5433).
- Testing strategy: manual review (diff each file for additive-only changes) + one UAT verification case per AC-14.
- Happy path: run any instrumented command → query `wint.agent_invocations` → assert row with correct fields.
- There are no unit tests for Markdown files — test plan should be primarily structural review + one UAT integration check.
- Consider noting `story-status.md` separately: it is a read-only utility with no state transitions; the decision of whether telemetry is meaningful for a read-only command should be documented explicitly in the AC (AC-8 leaves room for "documents why not applicable").

### For UI/UX Advisor

Not applicable. This story has no user-facing UI. All changes are Markdown edits to developer-facing command files. Consistency of documentation style and placement of telemetry blocks within each command's existing structure is the only "UX" concern (developer experience).

### For Dev Feasibility

- This is a docs-only story: all 10 files to modify are `.md` files in `.claude/commands/`. No TypeScript compilation, no build steps, no test runners beyond the UAT manual verification.
- **Critical prerequisite**: WINT-3020 must be merged before UAT. Implementation (reading the 10 files, inserting telemetry blocks) can proceed independently.
- **Insertion point strategy**: for each file, locate the phase completion signal (the Markdown block or comment that signals phase end — often where `token-log` already appears, or where the agent emits its completion signal). Insert the `telemetry-log` skill call block immediately after.
- **Subtask decomposition**: 10 files × 1 edit each = 10 subtasks. Each is a focused read-then-edit of a single file. Can be batched (5+5) to reduce context switching.
- **Key risk**: `elab-story.md` has two modes (interactive + autonomous). Verify both mode paths are covered by a single telemetry block or by mode-specific blocks as appropriate.
- **`story-status.md`** is read-only (type: utility). Discuss whether telemetry logging is appropriate for a read-only status check. If not, AC-8 should explicitly document this reasoning rather than silently skipping.
- Canonical implementation reference: the `telemetry-log/SKILL.md` document produced by WINT-3020 is the only reference needed. Read it first before editing any target file.
