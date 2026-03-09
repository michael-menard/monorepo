---
created: 2026-03-08
updated: 2026-03-08
version: 1.0.0
type: utility
permission_level: docs-only
story_id: WINT-3060
---

/telemetry --story STORY_ID [--limit N]

Display a formatted, human-readable summary of agent invocations, HITL decisions, and story outcomes for a given story.

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--story STORY_ID` | Yes | — | Story ID to query telemetry for (e.g., `WINT-3010`) |
| `--limit N` | No | 20 | Maximum number of invocation rows to display |

## Usage

```bash
# Show telemetry for a specific story
/telemetry --story WINT-3010

# Show telemetry with custom row limit
/telemetry --story WINT-3010 --limit 50

# Show all invocations (no cap)
/telemetry --story WINT-3010 --limit 0
```

If invoked without `--story`, display the usage hint below and stop — do not attempt an unfiltered query:

```
Usage: /telemetry --story STORY_ID [--limit N]

Example: /telemetry --story WINT-3010
         /telemetry --story WINT-3010 --limit 50

Displays agent invocations, HITL decisions, and story outcome for the given story.
```

---

## Implementation

### Step 1: Parse Arguments

```
story_id = flags['story'] || null
limit = parseInt(flags['limit']) || 20
```

If `story_id` is null or empty, display the usage hint above and emit signal `TELEMETRY EMPTY: no_story_id`. Stop execution.

### Step 2: Call MCP Tool

Call `workflow_get_story_telemetry` with the story ID:

```
result = workflow_get_story_telemetry({ storyId: story_id })
```

The tool returns:

```typescript
{
  invocations: AgentInvocation[]  // agent_name, status, duration_ms, model_name, etc.
  decisions: HitlDecision[]      // decision_type, decision_text, operator_id, etc.
  outcome: StoryOutcome | null   // final_verdict, quality_score, etc.
}
```

### Step 3: Handle Empty Result

If `result.invocations` is empty AND `result.decisions` is empty AND `result.outcome` is null:

```
No telemetry data found for {story_id}
```

Emit signal: `TELEMETRY EMPTY: {story_id}`
Stop execution.

### Step 4: Format Invocations Table

Display invocations as a formatted Markdown table with columns: `agent_name`, `status`, `duration_ms`, `model_name`.

Cap rows at `limit` (default 20). If total invocations exceed the cap, append an advisory line.

```
## Invocations ({shown} of {total})

| Agent | Status | Duration (ms) | Model |
|-------|--------|--------------|-------|
| dev-leader | success | 4200 | claude-sonnet-4-5 |
| qa-validator | success | 1800 | claude-haiku-4-5 |
| ... | | | |

Showing {shown} of {total} invocations. Use --limit N to see more.
```

If `duration_ms` or `model_name` is null, display `—` in that cell.

### Step 5: Format Decisions Table

Display decisions as a formatted Markdown table with columns: `decision_type`, `decision_text` (truncated to 80 chars), `operator_id`.

```
## Decisions ({count})

| Type | Text | Operator |
|------|------|----------|
| approve | Implementation meets requirements | op-1 |
| defer | Needs further investigation for edge cas… | op-2 |
```

If `decision_text` exceeds 80 characters, truncate and append `…`.

If no decisions exist, display:

```
## Decisions (0)

No HITL decisions recorded for {story_id}.
```

### Step 6: Format Outcome

Display the story outcome verdict and key metrics.

```
## Outcome

| Field | Value |
|-------|-------|
| Verdict | pass |
| Quality Score | 88 |
| Review Iterations | 1 |
| QA Iterations | 0 |
| Duration | 602000 ms |
| Estimated Cost | $0.0305 |
```

If `outcome` is null, display:

```
## Outcome

No outcome recorded for {story_id}.
```

### Step 7: Emit Completion Signal

```
TELEMETRY RENDERED
```

---

## Error Handling

| Error | Message |
|-------|---------|
| No `--story` flag | Display usage hint (see Usage section above) |
| Empty result | `No telemetry data found for {story_id}` |
| MCP tool unavailable | `Telemetry service unavailable. Ensure postgres-knowledgebase is running on port 5433.` |
| MCP tool error | `TELEMETRY ERROR: {error_message}` |

When the MCP tool is unavailable (connection error, timeout, or service not running), display the service unavailable message and emit signal: `TELEMETRY ERROR: service_unavailable`. Do not throw or display raw error objects.

---

## Signals

Exactly one of the following signals is emitted per invocation:

| Signal | When |
|--------|------|
| `TELEMETRY RENDERED` | Telemetry data displayed successfully |
| `TELEMETRY EMPTY: {storyId}` | No telemetry data found for the given story |
| `TELEMETRY ERROR: {reason}` | MCP tool unavailable or returned an error |

---

## Notes

- This command is read-only. It does not modify any data.
- Data source is exclusively `workflow_get_story_telemetry` (WINT-0120). No raw SQL or direct DB connections.
- The command executes inline — no subagent spawn required.
- Decisions section may be empty if WINT-3040 (Decision Logging Skill) is not yet live. This is valid behavior.
- Default 20-row cap on invocations prevents unbounded output for high-volume stories.
