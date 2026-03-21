# Skill: /scoreboard

## Purpose

Fetch and display the composite workflow health scoreboard. Shows 5 key pipeline metrics in a structured markdown format.

## Usage

```
/scoreboard [--feature FEATURE] [--start YYYY-MM-DD] [--end YYYY-MM-DD]
```

### Options

| Flag        | Description              | Example              |
| ----------- | ------------------------ | -------------------- |
| `--feature` | Filter by feature prefix | `--feature WINT`     |
| `--start`   | Start date (ISO format)  | `--start 2026-01-01` |
| `--end`     | End date (ISO format)    | `--end 2026-03-31`   |

### Examples

```
/scoreboard
/scoreboard --feature WINT
/scoreboard --start 2026-01-01 --end 2026-03-31
/scoreboard --feature PIPE --start 2026-02-01
```

## Implementation

1. Parse optional `--feature`, `--start`, `--end` flags from the slash command arguments.
2. Call the `kb_get_scoreboard` MCP tool with the parsed parameters.
3. Format the response as 5 markdown tables (one per metric).
4. Show "No data" gracefully when values are null.

## Output Format

```markdown
## Workflow Health Scoreboard

Generated: <generated_at>
<feature filter if present>

### 1. Throughput

| Metric                     | Value |
| -------------------------- | ----- |
| Stories Completed Per Week | 3.5   |
| Total Completed            | 42    |
| Weeks Observed             | 12    |

### 2. Cycle Time

| Metric                | Value |
| --------------------- | ----- |
| Avg Cycle Time (days) | 2.4   |
| Min Cycle Time (days) | 0.5   |
| Max Cycle Time (days) | 8.1   |
| Sample Size           | 42    |

### 3. First-Pass Success

| Metric           | Value  |
| ---------------- | ------ |
| Total Completed  | 42     |
| First Pass Count | 28     |
| First Pass Rate  | 66.67% |

### 4. Cost Efficiency

| Metric             | Value  |
| ------------------ | ------ |
| Avg Cost Per Story | $0.42  |
| Total Cost         | $17.64 |
| Story Count        | 42     |

### 5. Agent Reliability

| Agent         | Total | Successful | Success Rate |
| ------------- | ----- | ---------- | ------------ |
| dev-implement | 120   | 110        | 91.67%       |
| dev-plan      | 85    | 82         | 96.47%       |
```

## Null / No-Data Handling

- If `avg_cycle_time_days` is null, show `No data`
- If `avg_cost_per_story` is null, show `No data`
- If `agent_reliability.agents` is empty, show `No agents tracked`
- If `weeks_observed` is 0, show `No completed stories in range`

## Invocation

```typescript
const result = await kb_get_scoreboard({
  feature: parsedFeature, // undefined if not provided
  start_date: parsedStart, // undefined if not provided
  end_date: parsedEnd, // undefined if not provided
})
```
