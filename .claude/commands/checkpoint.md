---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: utility-skill
permission_level: docs-only
---

# /checkpoint STORY-ID PHASE SIGNAL [--resume-from=N]

Update checkpoint file after phase completion for resume capability.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY-ID` | Yes | Story identifier (e.g., STORY-007, WRKF-1020) |
| `PHASE` | Yes | Phase name or number (e.g., "setup", "planning", 1, 2) |
| `SIGNAL` | Yes | Completion signal (e.g., "COMPLETE", "BLOCKED", "FAILED") |
| `--resume-from=N` | No | Override next phase for resume |

## Purpose

Maintains a checkpoint file that enables:
- Workflow resume after interruption
- Phase tracking for auditing
- Token usage aggregation
- Error state preservation

## Output Location

```
plans/stories/{STAGE}/{STORY-ID}/_implementation/CHECKPOINT.md
```

Or for epics:
```
plans/{PREFIX}.epic-elab/CHECKPOINT.md
```

## File Format

```yaml
schema: 1
story_id: {STORY-ID}
workflow: {COMMAND-NAME}
started: {ISO-TIMESTAMP}
updated: {ISO-TIMESTAMP}

phases:
  0_setup:
    status: complete
    signal: SETUP COMPLETE
    completed_at: {ISO-TIMESTAMP}
    tokens: { in: 1200, out: 450 }

  1_planning:
    status: complete
    signal: PLANNING COMPLETE
    completed_at: {ISO-TIMESTAMP}
    tokens: { in: 5400, out: 2100 }

  2_implementation:
    status: in_progress
    signal: null
    started_at: {ISO-TIMESTAMP}
    tokens: null

current_phase: 2
resume_from: 2
last_error: null
total_tokens: { in: 6600, out: 2550 }
```

## Execution Steps

### 1. Locate or Create Checkpoint

Check for existing `CHECKPOINT.md` in `_implementation/` or `_workflow/`.

If not exists, create with initial structure.

### 2. Update Phase Entry

```yaml
phases:
  {N}_{PHASE}:
    status: complete | blocked | failed
    signal: "{PHASE} {SIGNAL}"
    completed_at: {ISO-TIMESTAMP}
    tokens: { in: X, out: Y }  # from /token-log if available
```

### 3. Calculate Next Phase

| Signal | Next Phase |
|--------|------------|
| `COMPLETE` | current + 1 |
| `BLOCKED` | current (stay) |
| `FAILED` | current (stay) |

Override with `--resume-from` if provided.

### 4. Update Summary Fields

```yaml
current_phase: {N+1 or N if blocked/failed}
resume_from: {next runnable phase}
updated: {ISO-TIMESTAMP}
last_error: {error message if BLOCKED/FAILED, else null}
```

### 5. Return Result

```yaml
story: {STORY-ID}
phase: {PHASE}
signal: {SIGNAL}
status: recorded
resume_from: {N}
checkpoint_file: {path}
```

## Phase Mappings by Workflow

### `/dev-implement-story`

| # | Phase Name | Success Signal |
|---|------------|----------------|
| 0 | setup | SETUP COMPLETE |
| 1 | planning | PLANNING COMPLETE |
| 2 | implementation | IMPLEMENTATION COMPLETE |
| 3 | verification | VERIFICATION COMPLETE |
| 4 | documentation | DOCUMENTATION COMPLETE |

### `/elab-story`

| # | Phase Name | Success Signal |
|---|------------|----------------|
| 0 | setup | SETUP COMPLETE |
| 1 | analysis | ANALYSIS COMPLETE |
| 2 | completion | ELAB PASS / ELAB FAIL |

### `/qa-verify-story`

| # | Phase Name | Success Signal |
|---|------------|----------------|
| 0 | setup | SETUP COMPLETE |
| 1 | verification | VERIFICATION COMPLETE |
| 2 | completion | QA PASS / QA FAIL |

### `/elab-epic`

| # | Phase Name | Success Signal |
|---|------------|----------------|
| 0 | setup | SETUP COMPLETE |
| 1 | reviews | REVIEWS COMPLETE |
| 2 | aggregation | AGGREGATION COMPLETE |
| 3 | interactive | DECISIONS COMPLETE |
| 4 | updates | UPDATES COMPLETE |

### `/scrum-master`

| # | Phase Name | Success Signal |
|---|------------|----------------|
| 0 | setup | SETUP COMPLETE |
| 1 | pm | PM COMPLETE |
| 2 | elab | ELAB PASS |
| 3 | implement | DOCUMENTATION COMPLETE |
| 4 | review | CODE REVIEW PASS |
| 5 | qa | QA PASS |
| 6 | done | WORKFLOW COMPLETE |

## Error Handling

| Error | Action |
|-------|--------|
| Checkpoint not found | Create new checkpoint |
| Invalid phase | `CHECKPOINT FAILED: Unknown phase {name}` |
| Write error | `CHECKPOINT FAILED: Cannot write file` |

## Signal

- `CHECKPOINT RECORDED` - Phase completion logged
- `CHECKPOINT FAILED: <reason>` - Could not update

## Resume Support

To resume a workflow:

1. Read `CHECKPOINT.md`
2. Get `resume_from` value
3. Start workflow at that phase
4. Previous phase outputs should exist in `_implementation/`

Example resume command:
```bash
/scrum-master WRKF-1021 --from=3
```

## Integration Points

Called by every completion leader:
- End of each phase in `scrum-master-loop-leader`
- End of `elab-completion-leader`
- End of `qa-verify-completion-leader`
- End of `dev-documentation-leader`
- End of `dev-verification-leader`
