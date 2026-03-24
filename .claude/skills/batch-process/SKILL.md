---
created: 2026-03-23
updated: 2026-03-23
version: 1.0.0
name: batch-process
description: 'Trigger batch story processing for one or more plan slugs. Delegates to batch-coordinator.agent.md via the Task tool. Accepts optional --max=N cap and --dry-run preview flag.'
kb_tools:
  - kb_list_stories
  - kb_get_story
---

# /batch-process — Batch Story Processing

Thin CLI wrapper that accepts plan slugs and optional flags, then delegates all batch coordination logic to `batch-coordinator.agent.md` via the Task tool.

## Usage

```
/batch-process <plan-slug> [<plan-slug>...] [--max=N] [--dry-run]
```

### Examples

**Example 1 — Single plan slug (default max, live run):**

```
/batch-process workflow-intelligence-wint
```

Coordinator spawned with `plan_slugs: ["workflow-intelligence-wint"]`, `max_stories: 20`, `dry_run: false`.

**Example 2 — Multiple plan slugs with cap:**

```
/batch-process workflow-intelligence-wint pipeline-orchestrator-activation --max=5
```

Coordinator spawned with `plan_slugs: ["workflow-intelligence-wint", "pipeline-orchestrator-activation"]`, `max_stories: 5`, `dry_run: false`.

**Example 3 — Dry-run to preview execution plan:**

```
/batch-process workflow-intelligence-wint --dry-run
```

Emits dry-run notice, then coordinator dry-run table, then `BATCH BLOCKED: dry_run=true`.

## Arguments

| Argument    | Required | Default | Description                                                                         |
| ----------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `plan-slug` | yes      | —       | One or more plan slugs (space-separated or comma-separated). At least one required. |
| `--max=N`   | no       | 20      | Maximum number of stories to process. Must be a positive integer.                   |
| `--dry-run` | no       | false   | Preview execution plan without spawning workers or mutating KB state.               |

---

## Execution Steps

### Step 1: Parse Arguments

Extract all tokens from the invocation:

- **Positional arguments** (anything not starting with `--`) are plan slugs.
  - Comma-separated values within a single token must be split into individual slugs.
    - `"slug-a,slug-b"` → `["slug-a", "slug-b"]`
    - `"slug-a"` → `["slug-a"]`
  - Accumulate all positional tokens (after comma normalisation) into the `plan_slugs` array.
- **`--max=N`**: parse the value with `parseInt(N, 10)`. If the result is `NaN` or not a positive integer, emit a validation error (see Step 2) and stop.
- **`--dry-run`**: if present, set `dry_run = true`.

After parsing:

- `plan_slugs`: string[] (one or more slugs, normalised from comma-separated input)
- `max_stories`: number (default: 20)
- `dry_run`: boolean (default: false)

### Step 2: Validate Arguments

**No plan slugs provided:**

```
ERROR: at least one plan slug is required. Usage: /batch-process <plan-slug> [<plan-slug>...] [--max=N] [--dry-run]
```

Stop — do not spawn the coordinator.

**`--max` value is not a valid positive integer:**

```
ERROR: --max must be a positive integer. Got: "<value>"
```

Stop — do not spawn the coordinator.

### Step 3: Read Agent File

Read `.claude/agents/batch-coordinator.agent.md` before invoking the coordinator. This follows the established delegation pattern: always read the agent file first to confirm the invocation contract before spawning.

### Step 4: Emit Dry-Run Notice (conditional)

If `dry_run` is `true`, emit the following notice **before** invoking the coordinator:

```
DRY RUN MODE — no workers will be spawned and no KB state will be mutated
```

This notice must appear as the first line of skill output when `--dry-run` is passed.

### Step 5: Spawn Coordinator via Task Tool (foreground)

Invoke the coordinator using the Task tool in **foreground mode** (not background). The coordinator must complete before the skill returns — batch coordination is sequential.

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Batch coordinate"
  prompt: |
    Read: .claude/agents/batch-coordinator.agent.md

    CONTEXT:
    plan_slugs: {JSON string array of plan_slugs}
    max_stories: {max_stories as number}
    dry_run: {dry_run as boolean}
```

**Parameter types (enforced):**

- `plan_slugs` — JSON string array, e.g. `["slug-a", "slug-b"]`
- `max_stories` — number (integer), e.g. `20` not `"20"`
- `dry_run` — boolean, e.g. `false` not `"false"`

### Step 6: Await Completion Signal

Wait for the coordinator to emit one of:

- `BATCH COMPLETE` — all stories processed
- `BATCH COMPLETE: {N} processed, {M} succeeded, {K} failed, {J} skipped` — with summary counts
- `BATCH BLOCKED: <reason>` — cannot proceed (e.g., no actionable stories, KB unavailable, dry_run=true)
- `BATCH COMPLETE WITH WARNINGS` — processed with non-fatal issues

### Step 7: Surface Signal Verbatim

Echo the coordinator's completion signal to the user **without modification**. Do not reword, summarise, or augment it.

---

## Output

The skill produces no output of its own beyond:

1. The dry-run notice (Step 4, only when `--dry-run` is passed)
2. The coordinator's completion signal verbatim (Step 7)

All batch coordination output (story tables, progress lines, per-story results) is produced by the coordinator and flows through naturally.

---

## Error Handling

| Scenario                        | Action                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| No plan slugs provided          | Emit `ERROR: at least one plan slug is required. Usage: ...` and stop                        |
| `--max` is not a valid integer  | Emit `ERROR: --max must be a positive integer. Got: "<value>"` and stop                      |
| Coordinator not found           | Emit `ERROR: .claude/agents/batch-coordinator.agent.md not found — cannot spawn coordinator` |
| Coordinator emits BATCH BLOCKED | Surface verbatim — this is not a skill-level error                                           |
| Coordinator task fails to start | Emit `ERROR: coordinator task failed to start — <reason>`                                    |

---

## Completion Signal

This skill does not emit its own completion signal. The coordinator's signal (`BATCH COMPLETE`, `BATCH COMPLETE WITH WARNINGS`, or `BATCH BLOCKED`) is surfaced verbatim and serves as the terminal output.

---

## Non-Negotiables

- **No `/token-log` call** — the coordinator calls `/token-log` internally (per batch-coordinator Non-Negotiable #6). The skill must not emit a second `/token-log` call.
- **Foreground Task tool only** — never use background mode. The coordinator's sequential processing model requires the skill to await completion.
- **Comma-separated slugs must be normalised** — `"slug-a,slug-b"` must produce `["slug-a", "slug-b"]`, not `["slug-a,slug-b"]`.
- **`--max` must be a number** — `max_stories: 5` not `max_stories: "5"`. A string value fails the coordinator's parameter validation.
- **No batch logic in this skill** — all orchestration (KB querying, story ordering, worker spawning, retry budget) lives in `batch-coordinator.agent.md`.
