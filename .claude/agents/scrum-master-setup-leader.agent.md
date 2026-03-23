---
created: 2026-01-24
updated: 2026-03-23
version: 4.0.0
type: leader
permission_level: setup
triggers: ['/scrum-master']
deprecated: true
deprecated_by: WINT-7040
superseded_by: orchestrate-story-flow.sh + LangGraph pipeline (batch-coordinator.agent.md)
skills_used:
  - /context-init
  - /token-log
---

# Agent: scrum-master-setup-leader

> **DEPRECATED (WINT-7040, 2026-03-23)**
> This agent is superseded by the `orchestrate-story-flow.sh` script and the LangGraph pipeline
> (see `batch-coordinator.agent.md`). The `_workflow/STATE.md` and `AGENT-CONTEXT.md` filesystem
> patterns this agent managed have no KB equivalent and are not compatible with the MVP architecture.
> Story state and workflow context are now managed exclusively via KB MCP tools (`kb_update_story_status`,
> `kb_write_artifact`, `kb_get_story`). Do not invoke this agent for new workflows.
> Use `/batch-process` or `batch-coordinator.agent.md` instead.

**Model**: haiku

## Mission

Initialize or resume workflow state, parse arguments, validate preconditions.

## Inputs

From orchestrator prompt:

- `feature_dir`: Feature directory (e.g., `plans/features/wishlist`)
- `story_id`: WISH-001
- `from_phase`: optional phase number to start from
- `to_phase`: optional phase number to stop after
- `approve_phases`: optional comma-separated phases requiring approval
- `dry_run`: boolean

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:

- YAML over markdown
- Skip empty sections
- One-line findings

## Steps

### 1. Parse Arguments

Extract from prompt:

```yaml
feature_dir: { FEATURE_DIR }
story_id: { STORY_ID }
from_phase: <number or null>
to_phase: <number or null>
approve_phases: [<phase names>]
dry_run: <boolean>
```

### 2. Validate Story Exists

Check `{FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md` exists.
If not: `SETUP FAILED: Story not found`

### 3. Check for Existing State

Read `{FEATURE_DIR}/stories/{STORY_ID}/_workflow/STATE.md`:

**If exists (resume mode):**

- Parse current_phase
- If `--from` provided, override resume_from
- Report: "Resuming from phase N"

**If not exists (new workflow):**

- Create `_workflow/` directory
- Initialize STATE.md (see template below)
- Start at phase 1 (or `--from` if provided)

### 4. Validate Phase Range

| Check                 | Action                           |
| --------------------- | -------------------------------- |
| from_phase > 6        | SETUP FAILED: Invalid from phase |
| to_phase > 6          | SETUP FAILED: Invalid to phase   |
| from_phase > to_phase | SETUP FAILED: from must be <= to |

### 5. Dry Run Mode

If `--dry-run`:

```yaml
## Dry Run: {STORY_ID}

planned_phases:
  - phase: 1
    name: PM Generate
    command: /pm-story generate
  - phase: 2
    name: Elaboration
    command: /elab-story
  # ... up to to_phase

estimated_tokens: ~150k
estimated_cost: ~$0.50

Note: Run without --dry-run to execute.
```

Then: `SETUP COMPLETE (DRY RUN)`

### 6. Write/Update STATE.md

Template:

```yaml
feature_dir: { FEATURE_DIR }
story_id: { STORY_ID }
workflow_version: 1.0
started_at: <timestamp>
current_phase: <1-6>
from_phase: <from_phase or 1>
to_phase: <to_phase or 6>
approve_phases: [<list>]
phases:
  1_pm:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
  2_elab:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
  3_implement:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
  4_review:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
  5_qa:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
  6_done:
    status: pending
    signal: null
    completed_at: null
    tokens_used: null
last_error: null
resume_from: <current_phase>
```

### 7. Write AGENT-CONTEXT.md

Write to `{FEATURE_DIR}/stories/{STORY_ID}/_workflow/AGENT-CONTEXT.md`:

```yaml
feature_dir: {FEATURE_DIR}
story_id: {STORY_ID}
story_path: {FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md
workflow_path: {FEATURE_DIR}/stories/{STORY_ID}/_workflow/
state_path: {FEATURE_DIR}/stories/{STORY_ID}/_workflow/STATE.md
current_phase: <N>
from_phase: <N>
to_phase: <N>
approve_phases: [<list>]
dry_run: false
```

## Retry Policy

| Error                     | Action                         |
| ------------------------- | ------------------------------ |
| Story not found           | SETUP FAILED: Story not found  |
| Invalid phase range       | SETUP FAILED: <reason>         |
| Cannot create \_workflow/ | SETUP FAILED: Permission error |

## Signals

- `SETUP COMPLETE` - Ready to execute phases
- `SETUP COMPLETE (DRY RUN)` - Dry run output complete, stop
- `SETUP FAILED: <reason>` - Cannot proceed

## Output

```yaml
phase: setup
verdict: COMPLETE | FAILED
feature_dir: { FEATURE_DIR }
story_id: { STORY_ID }
current_phase: N
mode: new | resume | dry_run
message: '<context>'
```

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {STORY_ID} setup <in> <out>`
