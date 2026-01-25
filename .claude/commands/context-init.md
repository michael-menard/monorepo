---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
type: utility-skill
permission_level: docs-only
---

# /context-init STORY-ID COMMAND-NAME [--path=X]

Initialize AGENT-CONTEXT.md for a workflow phase.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `STORY-ID` | Yes | Story identifier (e.g., STORY-007, WRKF-1020) |
| `COMMAND-NAME` | Yes | The command/workflow being executed |
| `--path=X` | No | Override base path (default: auto-detect) |

## Purpose

Creates a standardized context file that subsequent phases can read to understand:
- Where to find artifacts
- What story is being processed
- What phase/command is active
- When the workflow started

## Output Location

```
plans/stories/{STAGE}/{STORY-ID}/_implementation/AGENT-CONTEXT.md
```

Or if `--path` provided:
```
{path}/AGENT-CONTEXT.md
```

## Generated Content

```yaml
schema: 1
story_id: {STORY-ID}
command: {COMMAND-NAME}
created: {ISO-TIMESTAMP}

paths:
  base: plans/stories/{STAGE}/{STORY-ID}/
  story_file: plans/stories/{STAGE}/{STORY-ID}/{STORY-ID}.md
  artifacts: plans/stories/{STAGE}/{STORY-ID}/_implementation/
  pm: plans/stories/{STAGE}/{STORY-ID}/_pm/

status:
  current_phase: setup
  started_at: {ISO-TIMESTAMP}
```

## Execution Steps

### 1. Locate Story

Search stage directories for `{STORY-ID}/`:
- backlog, elaboration, ready-to-work, in-progress, QA, UAT

If not found and no `--path`: `INIT FAILED: Story not found`

### 2. Ensure Directories Exist

```bash
mkdir -p {base_path}/_implementation/
mkdir -p {base_path}/_pm/  # only if PM-related command
```

### 3. Check for Existing Context

If `AGENT-CONTEXT.md` exists:
- Read it
- Check if `command` matches
- If different command: backup to `AGENT-CONTEXT.{old-command}.md`
- If same command: update `resumed_at` field

### 4. Write Context File

Write to `{base_path}/_implementation/AGENT-CONTEXT.md`

### 5. Return Result

```yaml
story: {STORY-ID}
command: {COMMAND-NAME}
context_file: {path}/AGENT-CONTEXT.md
mode: created | updated | resumed
```

## Context Fields by Command

### For `/dev-implement-story`

```yaml
schema: 1
story_id: WRKF-1021
command: dev-implement-story

paths:
  base: plans/stories/in-progress/WRKF-1021/
  story_file: plans/stories/in-progress/WRKF-1021/WRKF-1021.md
  artifacts: plans/stories/in-progress/WRKF-1021/_implementation/
  proof_file: plans/stories/in-progress/WRKF-1021/PROOF-WRKF-1021.md

status:
  current_phase: setup
  started_at: 2026-01-24T10:00:00Z
```

### For `/elab-story`

```yaml
schema: 1
story_id: WRKF-1021
command: elab-story

paths:
  base: plans/stories/elaboration/WRKF-1021/
  story_file: plans/stories/elaboration/WRKF-1021/WRKF-1021.md
  artifacts: plans/stories/elaboration/WRKF-1021/_implementation/
  elab_file: plans/stories/elaboration/WRKF-1021/ELAB-WRKF-1021.md

status:
  current_phase: setup
  started_at: 2026-01-24T10:00:00Z
```

### For `/qa-verify-story`

```yaml
schema: 1
story_id: WRKF-1021
command: qa-verify-story

paths:
  base: plans/stories/QA/WRKF-1021/
  story_file: plans/stories/QA/WRKF-1021/WRKF-1021.md
  artifacts: plans/stories/QA/WRKF-1021/_implementation/
  proof_file: plans/stories/QA/WRKF-1021/PROOF-WRKF-1021.md
  verification_file: plans/stories/QA/WRKF-1021/_implementation/VERIFICATION.yaml

status:
  current_phase: setup
  started_at: 2026-01-24T10:00:00Z
```

### For `/elab-epic`

```yaml
schema: 1
epic: WRKF
command: elab-epic

paths:
  base: plans/
  stories_index: plans/stories/WRKF.stories.index.md
  output: plans/WRKF.epic-elab/
  meta_plan: plans/WRKF.plan.meta.md
  exec_plan: plans/WRKF.plan.exec.md

status:
  current_phase: setup
  started_at: 2026-01-24T10:00:00Z
  story_count: 15
```

## Error Handling

| Error | Action |
|-------|--------|
| Story not found | `INIT FAILED: Story not found` |
| Cannot create directory | `INIT FAILED: Permission denied` |
| Invalid command | `INIT FAILED: Unknown command {name}` |

## Signal

- `CONTEXT INIT COMPLETE` - File created/updated
- `CONTEXT INIT FAILED: <reason>` - Could not initialize

## Integration Points

Called at start of every setup leader:
- `dev-setup-leader`
- `elab-setup-leader`
- `qa-verify-setup-leader`
- `ui-ux-review-setup-leader`
- `scrum-master-setup-leader`
- `elab-epic-setup-leader`
- `pm-bootstrap-setup-leader`
- `pm-harness-setup-leader`
