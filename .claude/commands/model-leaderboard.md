---
created: 2026-02-18
updated: 2026-02-18
version: 1.0.0
type: utility-skill
permission_level: docs-only
---

# /model-leaderboard [--task TASK_ID] [--model MODEL_NAME]

Display the model leaderboard for observability into per-task, per-model quality/cost/latency metrics.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--task TASK_ID` | No | Filter report to a specific task ID (e.g., `code_generation_medium`) |
| `--model MODEL_NAME` | No | Filter report to a specific model (e.g., `anthropic/claude-sonnet-4.5`) |

If neither `--task` nor `--model` is provided, a full summary report sorted by value_score descending is shown.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MODEL_LEADERBOARD_PATH` | Yes | Absolute path to the leaderboard YAML file (e.g., `/data/model-leaderboard.yaml`) |

The leaderboard YAML is loaded from `MODEL_LEADERBOARD_PATH`. If the file does not exist, an empty leaderboard message is shown.

## Usage Examples

```bash
# Show full summary (all tasks, all models, sorted by value_score desc)
/model-leaderboard

# Show all models for a specific task
/model-leaderboard --task code_generation_medium

# Show all tasks for a specific model
/model-leaderboard --model anthropic/claude-sonnet-4.5

# Combine filters (shows only that task+model pair)
/model-leaderboard --task security_analysis --model anthropic/claude-opus-4-5
```

## Report Format

The leaderboard is rendered as a Markdown table with the following columns:

| Column | Description |
|--------|-------------|
| Task ID | Human-readable task identifier |
| Model | Model identifier string |
| Runs | Total number of runs recorded |
| Avg Quality | Running average quality score (0–100) |
| Avg Cost (USD) | Running average cost per run in USD |
| Avg Latency | Running average inference latency |
| Value Score | `avg_quality / avg_cost_usd` (or `avg_quality` for zero-cost Ollama models) |
| Convergence | `CONVERGED (95%)`, `converging`, or `exploring` |
| Trend | `improving`, `stable`, or `degrading` |

Entries with `quality_trend === 'degrading'` are prefixed with **[ALERT]** in the report.

## Execution Steps

### 1. Resolve Leaderboard Path

Read `MODEL_LEADERBOARD_PATH` from environment. If unset, emit:

```
Error: MODEL_LEADERBOARD_PATH environment variable is not set.
Set it to the absolute path of the leaderboard YAML file.
```

### 2. Load Leaderboard

Read the YAML file at `MODEL_LEADERBOARD_PATH`. If the file does not exist, treat as empty leaderboard and display empty-state message.

### 3. Select Report Mode

| Arguments Present | Report Mode |
|-------------------|-------------|
| Neither `--task` nor `--model` | `generateSummaryReport(leaderboard)` |
| `--task TASK_ID` only | `generateByTaskReport(leaderboard, TASK_ID)` |
| `--model MODEL_NAME` only | `generateByModelReport(leaderboard, MODEL_NAME)` |
| Both `--task` and `--model` | `generateByTaskReport` filtered further by model |

### 4. Render Report

Display the generated Markdown report directly in the conversation.

## Signal

- `LEADERBOARD RENDERED` — Report displayed successfully
- `LEADERBOARD EMPTY` — No entries found (file absent or no runs yet)
- `LEADERBOARD ERROR: <reason>` — Could not load or parse the leaderboard file

## Implementation Reference

Report generation functions are implemented in:
- `packages/backend/orchestrator/src/model-selector/reports.ts`
  - `generateSummaryReport(leaderboard: Leaderboard): string`
  - `generateByTaskReport(leaderboard: Leaderboard, taskId: string): string`
  - `generateByModelReport(leaderboard: Leaderboard, modelName: string): string`

Leaderboard persistence is in:
- `packages/backend/orchestrator/src/model-selector/leaderboard.ts`
  - `loadLeaderboard(filePath: string): Promise<Leaderboard>`
