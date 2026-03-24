---
created: 2026-03-23
updated: 2026-03-23
version: 1.0.0
name: weekly-report
description: >-
  Trigger the weekly analytics agent and render a formatted markdown report from the
  persisted WeeklyAnalysis KB artifact. Thin CLI wrapper over weekly-analyst.agent.md.
kb_tools:
  - kb_read_artifact
---

# /weekly-report — Weekly Analytics Report

> **CRITICAL EXECUTION RULE: After the Task tool completes, call `kb_read_artifact` directly in the main conversation — NOT inside a sub-agent Task tool. Sub-agents spawned from skills do not have reliable access to the knowledge-base MCP server (lesson from WINT-6020). The `kb_read_artifact` call for loading the WeeklyAnalysis artifact MUST happen in the main conversation.**

Thin CLI wrapper that derives the analysis week, reads `weekly-analyst.agent.md`, spawns the agent in foreground mode via the Task tool, awaits its completion signal, then loads and renders the persisted `WeeklyAnalysis` KB artifact.

---

## Prerequisites

- `weekly-analyst.agent.md` must exist at `.claude/agents/weekly-analyst.agent.md`
- **WINT-6060 must be complete** — specifically, `kb_get_scoreboard` must be registered as an MCP tool before this skill can run end-to-end. Until WINT-6060 is complete, the agent will fail with `WEEKLY ANALYSIS FAILED: kb_get_scoreboard is not a registered MCP tool`.

---

## Usage

```
/weekly-report [--week=YYYY-MM-DD] [--feature=FEATURE] [--force]
```

### Arguments

| Flag                | Required | Default            | Description                                                                                       |
| ------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `--week=YYYY-MM-DD` | no       | most recent Monday | ISO date of the Monday to analyse. If omitted, derived automatically (see Date Derivation below). |
| `--feature=FEATURE` | no       | (all features)     | Filter all analytics queries to a specific feature prefix (e.g., `WINT`, `WISH`).                 |
| `--force`           | no       | false              | Overwrite an existing analysis for the same week. Useful after data backfill.                     |

### Examples

**Example 1 — Current week (no args):**

```
/weekly-report
```

Derives `week_of` as the most recent Monday (today if today is Monday), spawns `weekly-analyst`, awaits `WEEKLY ANALYSIS COMPLETE`, calls `kb_read_artifact`, and renders the full report.

**Example 2 — Specific past week:**

```
/weekly-report --week=2026-03-17
```

Uses `week_of = "2026-03-17"` explicitly. Useful for reviewing a prior week's analysis.

**Example 3 — Feature-scoped report:**

```
/weekly-report --feature=WINT
```

Passes `feature: "WINT"` to the agent. All analytics queries (scoreboard, bottleneck, churn, tokens) are filtered to the WINT feature prefix. The rendered report shows WINT-scoped metrics only.

---

## Date Derivation Rule

When `--week` is not provided, derive `week_of` as the ISO date of the most recent Monday:

```javascript
const today = new Date()
const day = today.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
const daysToSubtract = (day + 6) % 7 // Monday→0, Tuesday→1, ..., Sunday→6
today.setDate(today.getDate() - daysToSubtract)
const week_of = today.toISOString().slice(0, 10) // YYYY-MM-DD
```

**Monday edge case**: When today is Monday, `day = 1`, so `daysToSubtract = (1 + 6) % 7 = 0`. The derived `week_of` is today's date — not the previous Monday. This is correct: the most recent Monday IS today.

---

## Execution Steps

### Step 1: Parse Arguments

Extract from the invocation:

- `week_of`: value of `--week=` if provided; otherwise derive using the Monday formula above
- `feature`: value of `--feature=` if provided; otherwise `undefined`
- `force`: `true` if `--force` is present; otherwise `false`

### Step 2: Read Agent File

Read `.claude/agents/weekly-analyst.agent.md` before invoking the agent. This confirms the invocation contract and follows the established delegation pattern.

### Step 3: Spawn weekly-analyst via Task Tool (foreground)

Invoke the agent using the Task tool in **foreground mode** (no `run_in_background: true`). The agent must complete before the skill proceeds.

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Weekly analysis {week_of}"
  prompt: |
    Read: .claude/agents/weekly-analyst.agent.md

    CONTEXT:
    week_of: {week_of}
    feature: {feature or omit if not provided}
    force: {force as boolean}
```

**Parameter types:**

- `week_of` — ISO date string, e.g. `"2026-03-17"`
- `feature` — string or omit entirely if not provided
- `force` — boolean (`true` or `false`), not a string

### Step 4: Await Completion Signal

Wait for the agent to emit one of:

- `WEEKLY ANALYSIS COMPLETE: {week_of} — {N} anomalies, {M} recommendations`
- `WEEKLY ANALYSIS COMPLETE: {week_of} — No anomalies detected`
- `WEEKLY ANALYSIS FAILED: {reason}`

Surface the signal to the operator immediately upon receipt.

### Step 5: Handle Failure (if WEEKLY ANALYSIS FAILED)

If the agent emits `WEEKLY ANALYSIS FAILED: {reason}`:

1. Display the full failure message verbatim
2. Do NOT call `kb_read_artifact`
3. Do NOT attempt to render a partial report
4. Stop

Example output:

```
Weekly analysis failed:
WEEKLY ANALYSIS FAILED: kb_get_scoreboard is not a registered MCP tool

Ensure WINT-6060 is complete before running /weekly-report end-to-end.
```

### Step 6: Load WeeklyAnalysis Artifact (MAIN CONVERSATION — not sub-agent)

After `WEEKLY ANALYSIS COMPLETE`, call `kb_read_artifact` directly in the **main conversation**:

```javascript
const artifact = await kb_read_artifact({
  story_id: 'SYSTEM',
  artifact_type: 'analysis',
  artifact_name: `WEEKLY-ANALYSIS-${week_of}`,
})
```

**If `artifact` is null or the call fails:**

```
Weekly analysis completed: WEEKLY ANALYSIS COMPLETE: {week_of} — {signal text}

WeeklyAnalysis artifact could not be loaded for display — check KB directly.
Run: kb_read_artifact({ story_id: "SYSTEM", artifact_type: "analysis", artifact_name: "WEEKLY-ANALYSIS-{week_of}" })
```

Stop — do not attempt to render from a null artifact.

### Step 7: Render Report

Render the loaded artifact as a formatted markdown report. See Output Format section below.

---

## Output Format

```markdown
## Weekly Report: {week_of}

{Feature: {feature} — only if feature filter was applied}

---

### Scoreboard Snapshot

| Metric                         | This Week | Prior Week | Delta    |
| ------------------------------ | --------- | ---------- | -------- |
| Throughput (stories/week)      | {value}   | {value}    | {delta}  |
| Avg Cycle Time (days)          | {value}   | {value}    | {delta}  |
| First-Pass Rate                | {value}%  | {value}%   | {delta}% |
| Avg Cost Per Story ($)         | {value}   | {value}    | {delta}  |
| Agent Reliability (best agent) | {value}%  | —          | —        |

When `week_over_week_delta` is null, the Prior Week and Delta columns show "—".

---

### Agent Reliability

| Agent | Total Invocations | Successful | Success Rate |
| ----- | ----------------- | ---------- | ------------ |
| ...   | ...               | ...        | ...%         |

If `agent_reliability.agents` is empty, show: `No agent reliability data for this period.`

---

### Anomalies ({N})

When anomalies array is empty:

> No anomalies detected.

When anomalies are present, list each:
**{type}** — {description}

- Metric: {metric}
- Current: {current_value} | Prior: {prior_value} | Threshold: {threshold}
- Severity: {severity}

---

### Recommendations ({M})

List each recommendation:
**[{priority}] {title}** ({category})

- Evidence: {evidence}
- Action: {action}

When no recommendations: `No recommendations this week.`

---

### Week-over-Week Delta

When `week_over_week_delta` is null:

> No prior week data available for comparison.

When prior week data is available, the delta values are already rendered inline in the Scoreboard Snapshot table above.

---

### Retro Lessons Referenced ({N})

List titles from `retro_lessons_summary`:

- {title} ({category})

When empty: `No retro lessons referenced.`
```

---

## Null / No-Data Handling

| Scenario                                              | Behavior                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `anomalies` array is `[]`                             | Section shows "No anomalies detected." — never omit the section      |
| `recommendations` array is `[]`                       | Section shows "No recommendations this week."                        |
| `week_over_week_delta` is null                        | Delta column shows "—"; WoW section shows "No prior week data"       |
| `agent_reliability.agents` is `[]`                    | Shows "No agent reliability data for this period."                   |
| `retro_lessons_summary` is `[]`                       | Shows "No retro lessons referenced."                                 |
| `avg_cycle_time_days` or `avg_cost_per_story` is null | Shows "No data" in that cell                                         |
| `kb_read_artifact` returns null after COMPLETE        | Show raw completion signal + "check KB directly" note — do not crash |

---

## Error Handling

| Scenario                         | Action                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `WEEKLY ANALYSIS FAILED` signal  | Surface verbatim, no `kb_read_artifact`, no partial report, stop                             |
| `kb_read_artifact` returns null  | Show completion signal + "WeeklyAnalysis artifact could not be loaded" note                  |
| Agent file not found             | Emit `ERROR: .claude/agents/weekly-analyst.agent.md not found — cannot spawn agent` and stop |
| `--week` is not a valid ISO date | Emit `ERROR: --week must be a valid ISO date (YYYY-MM-DD). Got: "{value}"` and stop          |

---

## Completion Signal

This skill does not emit its own completion signal. The weekly-analyst's signal (`WEEKLY ANALYSIS COMPLETE` or `WEEKLY ANALYSIS FAILED`) is the terminal signal and is surfaced verbatim.

---

## Non-Negotiables

- **No `/token-log` call** — `weekly-analyst.agent.md` handles token logging internally. The skill MUST NOT emit a second `/token-log` call (lesson from WINT-6030). Duplicate token logging corrupts telemetry.
- **Foreground Task tool only** — never use `run_in_background: true`. The skill must await agent completion before calling `kb_read_artifact`.
- **`kb_read_artifact` in main conversation** — MUST be called after the Task tool returns, not inside the Task tool prompt (lesson from WINT-6020). Sub-agents do not have reliable MCP access.
- **No analytics logic in this skill** — all computation lives in `weekly-analyst.agent.md`. The skill is orchestration only.
- **Artifact name is canonical** — always `WEEKLY-ANALYSIS-{week_of}` with `story_id: "SYSTEM"` and `artifact_type: "analysis"`. Do not invent alternate names.
- **Surface failure verbatim** — `WEEKLY ANALYSIS FAILED` messages must be shown exactly as emitted by the agent, without rewording.
