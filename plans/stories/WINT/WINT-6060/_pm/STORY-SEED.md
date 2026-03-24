---
generated: "2026-03-23"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-6060

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline file found at any baseline path. Context derived entirely from codebase scan and KB search.

### Relevant Existing Features

| Feature | Location | Status |
|---------|----------|--------|
| `kb_get_token_summary` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 3295), `tool-handlers.ts` (line 4348) | Registered and active |
| `kb_get_bottleneck_analysis` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 3337), `tool-handlers.ts` (line 4394) | Registered and active |
| `kb_get_churn_analysis` MCP tool | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` (line 3381), `tool-handlers.ts` (line 4439) | Registered and active |
| `kb_get_scoreboard` function | `apps/api/knowledge-base/src/crud-operations/analytics-operations.ts` (line 392) | IMPLEMENTED but NOT MCP-registered (not in tool-schemas.ts or tool-handlers.ts) |
| `workflow-retro` agent | `.claude/agents/workflow-retro.agent.md` | Active — reads KB lessons, produces RETRO artifacts |
| `elab-analyst` agent | `.claude/agents/elab-analyst.agent.md` | Active — uses `kb_write_artifact` for outputs |

### Active In-Progress Work

No baseline available to enumerate active in-progress stories. From KB context: WINT-3090 produced the `kb_get_scoreboard` function implementation in `analytics-operations.ts`. WINT-3090 elaboration decisions are present in the KB dated 2026-03-21, indicating that story is recently completed or in late stages.

### Constraints to Respect

- No baseline available; constraints derived from codebase scan and KB entries
- `kb_get_scoreboard` is implemented in `analytics-operations.ts` but has zero MCP server registration entries in `tool-schemas.ts` and `tool-handlers.ts` — confirmed by grep
- WINT-3090 deferred week-over-week trend comparison to a follow-on story (KB entry 8cb2beb9): "For MVP, return a flat scoreboard with a configurable time window"
- Agent markdown files are exempt from the 45% coverage threshold (KB lesson 6bc29a85): build and coverage exemptions apply to `.agent.md` files
- Agent instruction files must follow the structural pattern: YAML frontmatter, Role, Mission, Inputs, Execution Phases, Completion Signals, Non-Goals, Non-Negotiables (KB lesson fc7a5e94)
- WINT-6060 prior elaboration FAILED with blocker: "kb_get_scoreboard not MCP-registered — requires prerequisite story WINT-6055". WINT-6055 does NOT exist in the KB.

---

## Retrieved Context

### Related Endpoints

This is an agent-creation story (docs/config artifact only). No HTTP endpoints are created or consumed.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `analytics-operations.ts` | `apps/api/knowledge-base/src/crud-operations/analytics-operations.ts` | Defines all 4 analytics functions the agent will call via MCP |
| `tool-schemas.ts` | `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` | MCP registration point — confirms 3 tools registered, `kb_get_scoreboard` absent |
| `tool-handlers.ts` | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` | MCP handler dispatch — confirms `kb_get_scoreboard` absent |
| `workflow-retro.agent.md` | `.claude/agents/workflow-retro.agent.md` | Nearest structural peer — also a sonnet leader agent consuming KB analytics data |
| `elab-analyst.agent.md` | `.claude/agents/elab-analyst.agent.md` | Exemplar for `kb_write_artifact` output pattern |

### Reuse Candidates

- **Agent frontmatter structure**: Reuse `workflow-retro.agent.md` YAML frontmatter pattern (created/updated/version/type/permission_level/triggers/name/description/model/kb_tools/shared/story_id)
- **`kb_search` query patterns**: `workflow-retro.agent.md` shows the pattern for querying lessons tagged by category
- **`kb_write_artifact` output**: `elab-analyst.agent.md` shows the pattern for writing structured artifacts to KB instead of filesystem paths
- **Completion signal format**: All agents end with one of three exact signal strings — reuse the pattern from any existing agent
- **`_shared/decision-handling.md` and `_shared/autonomy-tiers.md`**: Leader agents include these in `shared:` frontmatter (KB entry dd530bd1 — OPP-004 promoted to AC-3 in WINT-6010)

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (agent-prompt-only) — the deliverable is a single .agent.md file in .claude/agents/. No TypeScript source files are produced. No implementation pattern refs applicable. The story is structurally equivalent to WINT-2080 and other agent-only stories.'

---

## Knowledge Context

### Lessons Learned

- **[6bc29a85]** Build and coverage exemptions for agent markdown specifications (category: architecture)
  - *Applies because*: WINT-6060 delivers only a `.agent.md` file. The 45% coverage threshold in CLAUDE.md does not apply. No TypeScript compilation surface. QA verifies by content inspection of the agent file against ACs.

- **[0ab021f7]** Agent-only stories verification pattern (category: testing)
  - *Applies because*: QA for this story can use the fast, low-token pattern: grep + read tool inspection of the generated `.agent.md` file. Tests are exempt. This was established for WINT-2080.

- **[fc7a5e94]** Standard structure for agent instruction files (category: architecture)
  - *Applies because*: The `weekly-analyst.agent.md` must follow the standard pattern: YAML frontmatter, Role section, Mission statement, Inputs schema, Execution Phases, Completion Signals, Non-Goals, Non-Negotiables.

- **[fac0d1b6]** Agent Output sections need cleanup after KB migration (category: workflow)
  - *Applies because*: Output section prose should describe `kb_write_artifact` calls rather than filesystem paths. The new agent must be written KB-first from the start — no `_implementation/` path references.

### Blockers to Avoid (from past stories and current context)

- **CRITICAL — Prior elaboration blocker**: Previous elab attempt failed because `kb_get_scoreboard` was not MCP-registered. The codebase scan confirms this is still true: zero references to `kb_get_scoreboard` in `tool-schemas.ts` and `tool-handlers.ts`. The invented prerequisite "WINT-6055" does not exist in KB.
- **Resolution path**: WINT-6060 scope must be adjusted. The agent should describe `kb_get_scoreboard` consumption with a guard: "call `kb_get_scoreboard` if available (MCP-registered); otherwise derive scoreboard metrics from the three available analytics tools as a fallback." OR — and this is the correct resolution — the seed should recommend that WINT-6060 scope be split: WINT-6060-A registers `kb_get_scoreboard` as an MCP tool (a small dev story adding it to `tool-schemas.ts` and `tool-handlers.ts`), then WINT-6060 creates the agent that calls it. See Conflict Analysis section below.
- **Do not invent prerequisite stories**: WINT-6055 does not exist and should not be referenced.

### Architecture Decisions (ADRs)

ADR-LOG.md was not found at `plans/stories/ADR-LOG.md`. ADRs below are sourced from KB and CLAUDE.md.

| Source | Constraint |
|--------|------------|
| CLAUDE.md | Zod schemas only — no TypeScript interfaces. Use `z.infer<typeof Schema>` |
| CLAUDE.md | No barrel files — import directly from source files |
| CLAUDE.md | `@repo/logger` for logging, never `console.log` |
| KB (dd530bd1) | Leader agents must include `_shared/decision-handling.md` and `_shared/autonomy-tiers.md` in frontmatter `shared:` field |
| KB (fc7a5e94) | Agent instruction files must follow consistent structural pattern across codebase |

### Patterns to Follow

- Leader agents declare `type: leader` and `permission_level: orchestrator` in frontmatter
- The `kb_tools` frontmatter lists every MCP tool the agent invokes
- Completion signals are exactly one of three strings (COMPLETE, COMPLETE WITH WARNINGS, BLOCKED)
- Output artifacts go to KB via `kb_write_artifact`, not to filesystem paths
- Agents targeting analytics data use `kb_search` with `tags: ["lesson-learned"]` to surface retro patterns before running queries

### Patterns to Avoid

- Referencing `_implementation/` or `plans/stories/` filesystem paths in agent Output sections
- Calling `kb_get_scoreboard` without verifying MCP registration (will fail silently or produce error)
- Creating prerequisite stories that don't exist (`WINT-6055` is not in KB — do not re-introduce it)
- Invoking analytics tools with date ranges as strings — use `z.coerce.date()` compatible ISO format

---

## Conflict Analysis

### Conflict: kb_get_scoreboard Not MCP-Registered

- **Severity**: blocking
- **Description**: The `kb_get_scoreboard` function exists in `apps/api/knowledge-base/src/crud-operations/analytics-operations.ts` and was implemented as part of WINT-3090. However, it is not registered in the MCP server:
  - `tool-schemas.ts`: zero occurrences of `kb_get_scoreboard`
  - `tool-handlers.ts`: zero occurrences of `kb_get_scoreboard`
  The story description for WINT-6060 lists `kb_get_scoreboard` as one of the four MCP tools the agent will consume. If the agent calls a non-existent MCP tool, it will fail at runtime.
- **Resolution Hint**: Two options: (A) WINT-6060 scope expands to include MCP registration of `kb_get_scoreboard` as a sub-task (add schema + handler entries analogous to `kb_get_churn_analysis` patterns at lines 3381 and 4439); (B) WINT-6060 is split — a new micro-story (WINT-6055 or similar) handles MCP registration, then WINT-6060 proceeds. Option A is preferred: the registration is ~50 lines of boilerplate following the exact pattern already established. Designating it as a sub-task of WINT-6060 avoids creating a new dependency story for what is a 10-minute implementation task.

### Conflict: WINT-6055 Phantom Prerequisite

- **Severity**: warning
- **Description**: The previous elaboration attempt cited "WINT-6055" as a prerequisite for this story. WINT-6055 does not exist in the KB. Creating a dependency on a non-existent story will block elab from completing again. This was the cause of the prior FAIL.
- **Resolution Hint**: Do not create or reference WINT-6055. If MCP registration is needed, it should be a sub-task within WINT-6060 itself (see above), not an external dependency.

---

## Story Seed

### Title

Create weekly-analyst Agent (with kb_get_scoreboard MCP registration sub-task)

### Description

The WINT workflow platform has three analytics MCP tools currently registered and callable: `kb_get_token_summary`, `kb_get_bottleneck_analysis`, and `kb_get_churn_analysis`. A fourth tool, `kb_get_scoreboard`, has been implemented in `analytics-operations.ts` as part of WINT-3090 but is not yet MCP-registered (absent from `tool-schemas.ts` and `tool-handlers.ts`).

This story delivers two tightly coupled artifacts:
1. MCP registration of `kb_get_scoreboard` (sub-task, ~50 lines boilerplate following the established `kb_get_churn_analysis` pattern)
2. Creation of `.claude/agents/weekly-analyst.agent.md` — a sonnet leader agent that calls all four analytics tools plus `kb_search` (for retro lessons), aggregates the results into a structured `WeeklyAnalysis` KB artifact, and surfaces trend summaries, anomaly detection, actionable recommendations, and week-over-week comparisons

The agent is the analytical engine that WINT-6070 (Weekly Report Command) will invoke. It bridges raw telemetry data with human-consumable weekly insights.

The sub-task (MCP registration) is a required precondition for the agent to function. Including it within this story's scope eliminates the phantom WINT-6055 prerequisite that caused the prior elaboration failure.

### Initial Acceptance Criteria

- [ ] AC-1: `kb_get_scoreboard` is registered in `tool-schemas.ts` following the exact same pattern as `kb_get_churn_analysis` (schema definition, tool definition object, push to `toolDefinitions` array)
- [ ] AC-2: `kb_get_scoreboard` is registered in `tool-handlers.ts` following the exact same pattern as `kb_get_churn_analysis` (import, handler function, case in dispatch)
- [ ] AC-3: `.claude/agents/weekly-analyst.agent.md` exists with valid YAML frontmatter including `type: leader`, `permission_level: orchestrator`, `model: sonnet`, `kb_tools: [kb_get_scoreboard, kb_get_token_summary, kb_get_bottleneck_analysis, kb_get_churn_analysis, kb_search, kb_write_artifact]`, and `story_id: WINT-6060`
- [ ] AC-4: The agent frontmatter includes `shared: [_shared/decision-handling.md, _shared/autonomy-tiers.md]` (required for leader agents per KB entry dd530bd1)
- [ ] AC-5: The agent defines a Mission that covers aggregation from all four analytics tools plus KB retro lessons
- [ ] AC-6: The agent defines an Inputs section specifying optional `week_start_date`, `week_end_date`, and `feature` parameters
- [ ] AC-7: The agent defines execution phases covering: (1) load retro lessons from KB, (2) call all four analytics tools with the week's date range, (3) synthesize results, (4) write `WeeklyAnalysis` artifact via `kb_write_artifact`
- [ ] AC-8: The agent specifies the `WeeklyAnalysis` artifact schema with fields: `week_of`, `throughput`, `cycle_time`, `first_pass_rate`, `cost_efficiency`, `agent_reliability`, `high_churn_stories`, `bottlenecks`, `stuck_stories`, `token_summary`, `retro_lessons_applied`, `anomalies`, `recommendations`
- [ ] AC-9: The agent defines week-over-week comparison behavior using the prior week's `WeeklyAnalysis` artifact as baseline (queried via `kb_search` with `artifact_type: WeeklyAnalysis`)
- [ ] AC-10: The agent ends with a valid Completion Signal section (one of three standard strings)
- [ ] AC-11: The agent Output section references `kb_write_artifact` (not filesystem paths) for the WeeklyAnalysis artifact
- [ ] AC-12: A `__tests__/weekly-analyst.test.ts` content-validation test verifies the agent file's required sections and frontmatter fields are present (same pattern as WINT-2080's agent-only verification)

### Non-Goals

- Do NOT implement `kb_get_scoreboard` business logic — the function already exists in `analytics-operations.ts`. This story only adds MCP registration plumbing.
- Do NOT implement week-over-week trend bucketing in the MCP tool itself (deferred per WINT-3090 KB entry 8cb2beb9) — the agent handles this by comparing two artifact snapshots
- Do NOT create WINT-6055 or any other prerequisite story — the MCP registration is a sub-task here
- Do NOT add feature-scoped per-feature breakdowns within the weekly artifact (deferred per KB entry 934a41ab — O2 future opportunity)
- Do NOT implement the `/weekly-report` skill — that is WINT-6070
- Do NOT modify `workflow-retro.agent.md` or other existing agents

### Reuse Plan

- **Components**: `kb_get_churn_analysis` registration pattern in `tool-schemas.ts` (lines 3381-3425) and `tool-handlers.ts` (lines 4439-4479) as the exact template for `kb_get_scoreboard` MCP registration
- **Patterns**: `workflow-retro.agent.md` frontmatter and structural pattern as agent template; agent-only story verification pattern from WINT-2080 (KB entry 0ab021f7)
- **Packages**: No new packages required. Uses existing `apps/api/knowledge-base` MCP server infrastructure

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is an agent-only story with one small TypeScript addition (MCP registration boilerplate). The TypeScript changes are pure plumbing (no business logic), so test coverage for the MCP registration follows the same pattern as existing analytics tool tests in `apps/api/knowledge-base/src/mcp-server/__tests__/mcp-integration.test.ts`. The agent file itself is verified by content-inspection tests (AC-12). The 45% coverage threshold does not apply to `.agent.md` files. The key test surface is: (1) MCP integration test confirming `kb_get_scoreboard` appears in tool list and dispatches correctly, (2) agent file content validation test confirming required sections and frontmatter fields.

### For UI/UX Advisor

This story has no UI surface. N/A.

### For Dev Feasibility

The MCP registration sub-task (AC-1, AC-2) is mechanical boilerplate. The implementer should open `tool-schemas.ts` at line 3381 and `tool-handlers.ts` at line 4439 to copy the `kb_get_churn_analysis` pattern verbatim, replacing `churn` with `scoreboard` throughout. The input schema is already defined as `KbGetScoreboardInputSchema` in `analytics-operations.ts` (line 82). The function signature and return type are fully defined (lines 392-427). The agent file creation (AC-3 through AC-12) is the primary creative work. Estimated token budget: 80,000–120,000 (agent-only stories run lean; the MCP registration adds ~10,000). Canonical references for the MCP registration sub-task: `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` lines 3381-3425 (churn schema definition) and `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` lines 4439-4479 (churn handler). Canonical reference for agent structure: `.claude/agents/workflow-retro.agent.md`.
