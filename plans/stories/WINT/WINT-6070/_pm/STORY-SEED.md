---
generated: '2026-03-23'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-6070

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline file found. Context derived from codebase scan, KB search, and direct inspection of sibling stories (WINT-6020, WINT-6030, WINT-6060) and the dependency `weekly-analyst.agent.md`.

### Relevant Existing Features

| Feature                   | Status                               | Notes                                                                                                                                              |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weekly-analyst.agent.md` | Exists (WINT-6060 delivered)         | Leader agent at `.claude/agents/weekly-analyst.agent.md` — aggregates all 4 analytics tools + KB retro lessons into a `WeeklyAnalysis` KB artifact |
| `/scoreboard` skill       | Exists                               | `.claude/skills/scoreboard/SKILL.md` — thin wrapper around `kb_get_scoreboard`; strong structural peer                                             |
| `/batch-process` skill    | Exists                               | `.claude/skills/batch-process/SKILL.md` — delegation pattern (read agent → Task tool → surface completion signal)                                  |
| `/batch-status` skill     | Exists                               | `.claude/skills/batch-status/SKILL.md` — direct MCP read-only pattern; graceful degradation                                                        |
| `/next-actions` skill     | Exists                               | Direct MCP call pattern; CRITICAL EXECUTION RULE block; no-sub-agent constraint                                                                    |
| `kb_get_scoreboard`       | MCP-registered (WINT-6060 ST-1/ST-2) | Schema in `tool-schemas.ts`; handler in `tool-handlers.ts`                                                                                         |
| `kb_read_artifact`        | MCP-registered                       | Used by `weekly-analyst` to load existing `WeeklyAnalysis` artifacts                                                                               |
| `kb_write_artifact`       | MCP-registered                       | Used by `weekly-analyst` to persist the `WeeklyAnalysis` artifact                                                                                  |

### Active In-Progress Work

| Story     | State   | Potential Overlap                                                                                                                                                                                  |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WINT-6060 | backlog | Dependency — delivers `weekly-analyst.agent.md`. Must be completed before WINT-6070 can be exercised end-to-end. No file overlap (WINT-6070 creates only `.claude/skills/weekly-report/SKILL.md`). |

### Constraints to Respect

- Skills are Markdown files only — no TypeScript source files, no Lambda handlers, no DB migrations.
- Sub-agents must NOT be spawned from skills that need direct MCP access. However, `weekly-analyst` is an agent (not a MCP tool), so delegation via Task tool is the correct pattern (matches `/batch-process` model).
- KB is the sole source of truth. This skill must not read or write flat-file state.
- Token logging is handled by the `weekly-analyst` agent internally — the skill must not emit a duplicate `/token-log` call.
- All output (the WeeklyAnalysis artifact) goes to KB via `kb_write_artifact` inside the agent — the skill only surfaces the human-readable report derived from the artifact.
- MEMORY.md critical note: MCP server runs via `tsx` — never from `dist/`.

---

## Retrieved Context

### Related Endpoints

None — this story creates no HTTP endpoints. All interactions are via MCP tools called by the delegated agent.

### Related Components

| Component                 | Path                                     | Relevance                                                                                                                                                                                                                                   |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weekly-analyst.agent.md` | `.claude/agents/weekly-analyst.agent.md` | The engine this skill invokes. Accepts `week_of` (required), `feature` (optional), `force` (optional). Completion signal: `WEEKLY ANALYSIS COMPLETE: {week_of} — {N} anomalies, {M} recommendations` or `WEEKLY ANALYSIS FAILED: {reason}`. |
| `/scoreboard` skill       | `.claude/skills/scoreboard/SKILL.md`     | Structural peer — argument table format, output format, flag parsing pattern                                                                                                                                                                |
| `/batch-process` skill    | `.claude/skills/batch-process/SKILL.md`  | Delegation pattern — read agent file → build CONTEXT block → invoke via Task tool (foreground) → await completion signal → surface verbatim                                                                                                 |
| `/next-actions` skill     | `.claude/skills/next-actions/SKILL.md`   | CRITICAL EXECUTION RULE pattern for prohibiting sub-agents when direct MCP is needed                                                                                                                                                        |
| `/done` skill             | `.claude/skills/done/SKILL.md`           | Delegation-to-agent template; Task tool invocation contract                                                                                                                                                                                 |

### Reuse Candidates

| Candidate                       | Source                                   | Pattern                                                                                     |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- | ---- | ----------- | ------- | -------------------- |
| YAML frontmatter schema         | `.claude/skills/story-state/SKILL.md`    | `created`, `updated`, `version`, `name`, `description`, `kb_tools` fields                   |
| Argument table format           | `.claude/skills/scoreboard/SKILL.md`     | `                                                                                           | Flag | Description | Example | ` three-column table |
| Task tool delegation block      | `.claude/skills/batch-process/SKILL.md`  | `Read: .claude/agents/weekly-analyst.agent.md` → CONTEXT block → foreground Task invocation |
| Date derivation for `week_of`   | `.claude/agents/weekly-analyst.agent.md` | `week_of` must be ISO date for Monday of target week; skill derives or prompts for this     |
| Human-readable report rendering | `.claude/skills/scoreboard/SKILL.md`     | Markdown tables per metric group from artifact data                                         |
| No-token-log constraint         | `.claude/skills/batch-process/SKILL.md`  | Skill must not emit `/token-log` — agent handles telemetry internally                       |

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (skill-prompt-only) — no implementation pattern refs applicable. The deliverable is a single SKILL.md file in `.claude/skills/weekly-report/`. No TypeScript source files are produced. Structural peers are `.claude/skills/batch-process/SKILL.md` (delegation pattern) and `.claude/skills/scoreboard/SKILL.md` (output formatting and flag parsing).'

---

## Knowledge Context

### Lessons Learned

- **[WINT-6020]** The batch-process skill's `--max` flag must be parsed as a number, not a string, when passed to the agent invocation context. Apply the same discipline to any numeric flags (e.g., if a `--limit` flag is added to weekly-report for anomaly display, parseInt it before embedding in the CONTEXT block).
  - _Applies because_: WINT-6070's CONTEXT block will pass `week_of` and optionally `feature` to the agent. Type fidelity in the Task tool CONTEXT block is required.

- **[WINT-6020]** Sub-agents spawned via Task tool do not have reliable access to the knowledge-base MCP server. For skills that need direct KB reads (e.g., to display the artifact after it's written), those reads must be made in the main conversation, not in a sub-agent.
  - _Applies because_: If the skill fetches and renders the WeeklyAnalysis artifact for display, it must do so via a direct `kb_read_artifact` call in the main conversation after the agent completes.

- **[WINT-6030]** Token logging must not be duplicated. The agent handles telemetry internally. The skill must explicitly state it does NOT call `/token-log`.
  - _Applies because_: `weekly-analyst.agent.md` may internally log tokens. WINT-6070 SKILL.md must include a non-negotiable prohibiting a second token-log call.

- **[WINT-6020, WINT-6030]** Skill files are exempt from the 45% Vitest coverage threshold. No `__tests__/` directory is needed. Verification is via direct file inspection and AC cross-referencing.
  - _Applies because_: WINT-6070 is a skill-prompt-only story — same exemption applies.

### Blockers to Avoid (from past stories)

- Do not invoke `weekly-analyst` via a background Task tool call — the agent must complete before the skill can surface results. Foreground mode is required.
- Do not attempt to compute `week_of` from the current date algorithmically inside the skill without documenting the derivation rule (most recent Monday or explicit user-provided date).
- Do not list `kb_write_artifact` in the skill's `kb_tools` frontmatter — the skill itself never writes artifacts; only the delegated agent does.

### Architecture Decisions (ADRs)

| ADR                    | Title                   | Constraint                                                                                        |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| (ADR-LOG.md not found) | Testing Strategy        | Skills are exempt from 45% coverage threshold; verification is manual                             |
| (from MEMORY.md)       | KB is source of truth   | No filesystem story state. WeeklyAnalysis lives in KB artifacts, not flat files.                  |
| (from MEMORY.md)       | MCP server runs via tsx | After any MCP registration changes, server must be restarted — relevant to WINT-6060 prerequisite |

### Patterns to Follow

- **Thin CLI wrapper**: All analytical logic lives in `weekly-analyst.agent.md`. The skill is purely orchestration (parse args → validate → read agent → delegate → surface result).
- **Delegation via Task tool (foreground)**: Read `weekly-analyst.agent.md` before invoking, build CONTEXT block, spawn agent in foreground, await `WEEKLY ANALYSIS COMPLETE` or `WEEKLY ANALYSIS FAILED` signal.
- **Human-readable artifact rendering**: After the agent writes the `WeeklyAnalysis` artifact, the skill reads it via `kb_read_artifact` in the main conversation and renders the key metrics (scoreboard snapshot, anomalies, recommendations) as formatted markdown tables.
- **Argument table format**: Use the three-column `| Flag | Description | Example |` table matching `/scoreboard` and `/batch-process` conventions.
- **Graceful degradation**: If the agent returns `WEEKLY ANALYSIS FAILED`, surface the failure reason verbatim. If `kb_read_artifact` returns null for the artifact post-completion, show the raw completion signal from the agent.
- **No-emoji output**: Consistent with WINT-6020/6030 conventions — no emoji in output.

### Patterns to Avoid

- Do not spawn sub-agents for any direct MCP reads needed by the skill itself.
- Do not implement any analytics aggregation logic in the skill — that belongs in `weekly-analyst.agent.md`.
- Do not create filesystem files for the WeeklyAnalysis output — all state is in KB artifacts.
- Do not add wint._ or kbar._ DB schema references (per MEMORY.md — these schemas are dead).

---

## Conflict Analysis

### Conflict: dependency not yet complete

- **Severity**: warning (non-blocking for seed generation; blocking for end-to-end exercising)
- **Description**: WINT-6060 (which delivers `weekly-analyst.agent.md` and MCP-registers `kb_get_scoreboard`) is in `backlog` state. The `weekly-analyst.agent.md` file exists on disk (WINT-6060 was partially delivered), but `kb_get_scoreboard` MCP registration may not be complete. The skill can be authored independently, but cannot be fully exercised until WINT-6060 is complete.
- **Resolution Hint**: Author WINT-6070's SKILL.md referencing the invocation contract of `weekly-analyst.agent.md` as it exists. Note in the skill's prerequisites or footer that `kb_get_scoreboard` must be MCP-registered (WINT-6060 AC-1 and AC-2). Proceed with story generation — no blocking conflicts.

---

## Story Seed

### Title

Create `/weekly-report` Skill (CLI Command for Weekly Analyst Agent)

### Description

The `weekly-analyst.agent.md` agent (delivered by WINT-6060) aggregates telemetry from all four analytics tools (`kb_get_scoreboard`, `kb_get_bottleneck_analysis`, `kb_get_churn_analysis`, `kb_get_token_summary`) plus KB retro lessons into a structured `WeeklyAnalysis` KB artifact. The agent is the analytical engine, but it has no user-facing entry point — it can only be invoked by other agents that know its invocation contract.

WINT-6070 creates the thin CLI wrapper skill at `.claude/skills/weekly-report/SKILL.md` that allows operators to trigger the weekly analysis from the Claude Code command line with a single command. The skill parses date and feature arguments, delegates to `weekly-analyst.agent.md` via the Task tool, awaits the completion signal, and renders the resulting `WeeklyAnalysis` artifact as a formatted human-readable report.

This follows the same delegation pattern established by `/batch-process` (WINT-6020): thin CLI wrapper → read agent file → build CONTEXT block → spawn foreground Task → await signal → surface result.

### Initial Acceptance Criteria

- [ ] **AC-1**: A file `.claude/skills/weekly-report/SKILL.md` exists with valid YAML frontmatter containing fields: `created`, `updated`, `version`, `name: weekly-report`, `description`, `kb_tools`
- [ ] **AC-2**: The `kb_tools` frontmatter includes only `kb_read_artifact` (the skill reads the WeeklyAnalysis artifact post-completion) — it does NOT include `kb_write_artifact` (writing is done by the delegated agent, not the skill)
- [ ] **AC-3**: The skill defines a `## Usage` section with command signature `/weekly-report [--week=YYYY-MM-DD] [--feature=FEATURE] [--force]` and a flag argument table covering all three flags with defaults documented
- [ ] **AC-4**: The skill defines a prerequisite or note that `weekly-analyst.agent.md` must exist at `.claude/agents/weekly-analyst.agent.md` and that WINT-6060 must be complete (specifically `kb_get_scoreboard` MCP-registered) before the skill can run end-to-end
- [ ] **AC-5**: If `--week` is not provided, the skill derives `week_of` as the ISO date of the most recent Monday (current date minus days since Monday) and documents this derivation rule explicitly
- [ ] **AC-6**: The skill reads `.claude/agents/weekly-analyst.agent.md` before invoking the agent (follows the established pattern of reading agent files before delegation — AC-6 of WINT-6020)
- [ ] **AC-7**: The skill spawns `weekly-analyst` via the Task tool in **foreground mode**, passing `week_of` as a string, `feature` as an optional string, and `force` as an optional boolean in the CONTEXT block
- [ ] **AC-8**: The skill awaits the agent's completion signal (`WEEKLY ANALYSIS COMPLETE: ...` or `WEEKLY ANALYSIS FAILED: ...`) and surfaces it to the operator
- [ ] **AC-9**: After `WEEKLY ANALYSIS COMPLETE`, the skill calls `kb_read_artifact` directly in the main conversation to load the `WeeklyAnalysis` artifact (`artifact_name: WEEKLY-ANALYSIS-{week_of}`, `story_id: SYSTEM`, `artifact_type: analysis`) and renders the key sections as formatted markdown
- [ ] **AC-10**: The rendered report includes: a scoreboard summary table (throughput, cycle time, first-pass rate, cost, agent reliability), an anomalies section (if any), a recommendations section (if any), and a week-over-week delta section (if prior-week data was available)
- [ ] **AC-11**: If the artifact's `anomalies` array is empty, the anomalies section shows "No anomalies detected" rather than an empty section
- [ ] **AC-12**: If `kb_read_artifact` returns null or fails after `WEEKLY ANALYSIS COMPLETE`, the skill shows the raw completion signal from the agent rather than crashing, with a note: "WeeklyAnalysis artifact could not be loaded for display — check KB directly"
- [ ] **AC-13**: The skill does NOT call `/token-log` — token logging is handled by the `weekly-analyst` agent internally; the skill must not emit a duplicate token-log entry
- [ ] **AC-14**: The skill's Usage section includes at least three concrete examples: current week, specific date, and feature-scoped

### Non-Goals

- This skill does NOT implement any analytics aggregation logic — all computation lives in `weekly-analyst.agent.md`
- This skill does NOT produce TypeScript source files, DB migrations, API routes, or frontend components
- This skill does NOT modify `weekly-analyst.agent.md` — WINT-6060 owns that file
- This skill does NOT replace or wrap the `/scoreboard` skill — `/scoreboard` is an on-demand live view; `/weekly-report` produces a persisted archived artifact
- This skill does NOT implement the MCP registration of `kb_get_scoreboard` — that is WINT-6060 ST-1 and ST-2
- This skill does NOT add per-feature breakdown tables beyond what the `WeeklyAnalysis` artifact already contains (deferred per KB entry 934a41ab)
- No shell scripts are created — the SKILL.md system is the correct vehicle

### Reuse Plan

- **Components**: `weekly-analyst.agent.md` (delegated-to agent), `/scoreboard` SKILL.md (output table format), `/batch-process` SKILL.md (Task tool delegation pattern)
- **Patterns**: Task tool foreground delegation → await completion signal → direct `kb_read_artifact` in main conversation → render formatted tables
- **Packages**: No npm packages — skill is a Markdown file; no dependencies

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a skill-prompt-only story (no Vitest coverage target). Manual verification via file inspection is the correct QA approach — same as WINT-6020 and WINT-6030.
- Test plan should include: (1) file existence check at `.claude/skills/weekly-report/SKILL.md`; (2) YAML frontmatter validation; (3) AC cross-reference table; (4) live invocation trace (dry-run or actual with `week_of` for a prior week that has story data).
- QA agent must read the SKILL.md file directly — if on a feature branch, use `git show story/WINT-6070:./.claude/skills/weekly-report/SKILL.md`.
- Mark `tests_executed: false`, `tests_not_applicable: true` with explanation in QA-VERIFY.yaml.
- Key edge case to verify: `--week` flag omitted → skill correctly derives most recent Monday; `WEEKLY ANALYSIS FAILED` from agent → skill surfaces failure verbatim without crash.

### For UI/UX Advisor

- skipped: true — no UI surface. This story delivers a single SKILL.md file for CLI use.
- Output formatting conventions to verify: no emoji in tables, consistent column widths, section headers match `/scoreboard` and `/batch-status` style (dashes, not bold).
- The rendered report is the user-facing deliverable — ensure the scoreboard table labels match the `/scoreboard` skill's column names for consistency (operators will compare the two outputs).

### For Dev Feasibility

- **Scope is minimal**: one Markdown file. No TypeScript, no DB, no infrastructure.
- **Dependency risk**: WINT-6060 must be complete before the skill can be end-to-end tested. The skill can be authored and reviewed independently.
- **`week_of` derivation**: The skill needs to document a reliable algorithm for "most recent Monday" since JavaScript's `Date` object day-of-week is 0-indexed Sunday-start. Ensure the derivation handles the edge case where today is Monday (should return today, not 7 days ago).
- **Artifact rendering after agent completion**: The skill must call `kb_read_artifact` in the main conversation (not in a sub-agent) after the Task tool returns. Sub-agents spawned from skills do not have reliable MCP access. Direct call pattern from `/next-actions` SKILL.md is the authoritative reference.
- **Canonical references for the single subtask**:

| Pattern                           | File                                     | Why                                                                                          |
| --------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Task tool delegation (foreground) | `.claude/skills/batch-process/SKILL.md`  | Complete invocation contract template: read agent → CONTEXT block → Task tool → await signal |
| Output table format               | `.claude/skills/scoreboard/SKILL.md`     | Markdown table structure, null/no-data handling, section headers                             |
| Direct MCP execution rule         | `.claude/skills/next-actions/SKILL.md`   | CRITICAL EXECUTION RULE block pattern prohibiting sub-agents for post-completion reads       |
| Frontmatter schema                | `.claude/skills/story-state/SKILL.md`    | `created`, `updated`, `version`, `name`, `description`, `kb_tools` field structure           |
| Agent invocation contract         | `.claude/agents/weekly-analyst.agent.md` | Inputs (`week_of`, `feature`, `force`), CONTEXT block format, completion signals             |
