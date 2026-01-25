/workflow-run STORY-XXX [--from=<phase>] [--to=<phase>]

Meta-orchestrator for full story lifecycle. Each phase runs as isolated Task subagent with fresh context.

## Workflow Phases

| # | Phase | Command | Success Signal |
|---|-------|---------|----------------|
| 1 | PM Generate | `/pm-generate-story` | `PM COMPLETE` |
| 2 | Elaboration | `/elab-story` | `ELAB PASS` |
| 3 | Implementation | `/dev-implement-story` | `DOCUMENTATION COMPLETE` |
| 4 | Code Review | `/dev-code-review` | `CODE REVIEW PASS` |
| 5 | QA Verify | `/qa-verify-story` | `QA PASS` |
| 6 | Done | (status update) | `WORKFLOW COMPLETE` |

## State File

Workflow state persists in: `plans/stories/STORY-XXX/_workflow/STATE.md`

```yaml
story_id: STORY-XXX
workflow_version: 1.0
started_at: <timestamp>
current_phase: <1-6>
phases:
  1_pm:
    status: pending|running|complete|failed|skipped
    signal: <signal received>
    completed_at: <timestamp>
    tokens_used: <estimate>
  2_elab:
    status: ...
  # ... etc
last_error: <if failed>
resume_from: <phase number>
```

## Execution

### Step 1: Initialize or Resume

Check for existing `STATE.md`:
- **If exists**: Read state, resume from `current_phase`
- **If not exists**: Create state file, start at phase 1

If `--from` specified: Start at that phase (skip earlier)
If `--to` specified: Stop after that phase

### Step 2: Execute Phase as Task

For current phase, spawn as isolated Task:

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Phase N: <command> STORY-XXX"
  prompt: |
    Execute command: /<command> STORY-XXX

    This is phase N of the automated workflow.
    Read the command from .claude/commands/<command>.md
    Execute it fully.

    When complete, your final line must be EXACTLY one of:
    - <SUCCESS SIGNAL> (proceed to next phase)
    - <PHASE> BLOCKED: <reason> (needs human input)
    - <PHASE> FAILED: <reason> (cannot proceed)

    Do NOT summarize or add commentary after the signal.
```

### Step 3: Check Signal

Read Task output for signal:

| Signal Pattern | Action |
|----------------|--------|
| `<PHASE> COMPLETE` or `PASS` | Update state, proceed to next phase |
| `<PHASE> BLOCKED: <reason>` | Update state, STOP, report to user |
| `<PHASE> FAILED: <reason>` | Update state, STOP, report to user |
| No clear signal | Assume failed, STOP, report |

### Step 4: Update State

After each phase:
```yaml
phases:
  N_<phase>:
    status: complete|failed|blocked
    signal: "<actual signal>"
    completed_at: <now>
    tokens_used: <from /cost or estimate>
```

### Step 5: Loop or Stop

- If signal is success and not at `--to` phase: Continue to next phase
- If signal is success and at `--to` phase: STOP, report success
- If signal is blocked/failed: STOP, report issue

## Decision Points (Approval Gates)

Some phases have conditional next steps:

| After Phase | If Signal | Next Phase |
|-------------|-----------|------------|
| 2 (Elab) | `ELAB PASS` | 3 (Implement) |
| 2 (Elab) | `ELAB FAIL` | STOP, needs PM fix |
| 4 (Code Review) | `PASS` | 5 (QA Verify) |
| 4 (Code Review) | `FAIL` | STOP, needs fix |
| 5 (QA) | `PASS` | 6 (Done) |
| 5 (QA) | `FAIL` | STOP, needs fix |

## Approval Gates (Optional)

Add `--approve` to pause for user approval at critical points:

```
/workflow-run STORY-XXX --approve=elab,implement
```

At these phases, after success signal:
```
## Approval Gate: Post-Elaboration

Phase 2 (Elaboration) completed with: ELAB PASS

Artifacts created:
- ELAB-STORY-XXX.md

[Continue to Implementation] [Review First] [Stop]
```

## Resume After Failure

If workflow stopped at phase 4 (code review failed):

```
/workflow-run STORY-XXX --from=3
```

This re-runs implementation and continues.

Or after manual fix:
```
/workflow-run STORY-XXX --from=4
```

This re-runs code review and continues.

## Context Isolation Benefits

| Aspect | Without Isolation | With Task Isolation |
|--------|-------------------|---------------------|
| Context per phase | Cumulative (bloats) | Fresh 200k tokens |
| Phase 5 context | ~500k+ (unusable) | ~200k (full capacity) |
| Cost | High (reprocessing) | Lower (no history) |
| Failure recovery | Lose everything | Resume from checkpoint |

## Output

```
## Workflow Progress: STORY-XXX

| Phase | Status | Signal | Tokens |
|-------|--------|--------|--------|
| 1. PM Generate | ✓ | PM COMPLETE | 45k |
| 2. Elaboration | ✓ | ELAB PASS | 32k |
| 3. Implementation | ✓ | DOCUMENTATION COMPLETE | 180k |
| 4. Code Review | ✗ | CODE REVIEW FAIL | 28k |
| 5. QA Verify | — | — | — |
| 6. Done | — | — | — |

**Status**: STOPPED at phase 4
**Reason**: Code review failed - style violations

**To continue**:
1. Fix issues in CODE-REVIEW-STORY-XXX.md
2. Run: /workflow-run STORY-XXX --from=4

**Total tokens**: 285k (~$0.95)
```

## State File Location

All workflow state lives in:
```
plans/stories/STORY-XXX/
└── _workflow/
    ├── STATE.md           # Current workflow state
    ├── PHASE-1-OUTPUT.md  # Captured output from phase 1
    ├── PHASE-2-OUTPUT.md  # Captured output from phase 2
    └── ...
```

This allows full audit trail and debugging.

## Error Handling

| Error | Action |
|-------|--------|
| Task times out | Mark phase failed, capture partial output |
| Task crashes | Mark phase failed, log error |
| Invalid signal | Mark phase failed, capture full output for debug |
| State file corrupt | Attempt recovery from phase outputs |

## Usage Examples

```bash
# Run full workflow from start
/workflow-run STORY-007

# Run from specific phase (skip earlier)
/workflow-run STORY-007 --from=3

# Run up to specific phase (stop after)
/workflow-run STORY-007 --to=2

# Run specific range
/workflow-run STORY-007 --from=2 --to=4

# Run with approval gates
/workflow-run STORY-007 --approve=elab,qa

# Dry run (show plan without executing)
/workflow-run STORY-007 --dry-run
```
