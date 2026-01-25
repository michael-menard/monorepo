# /scrum-master - Reference

## Architecture

```
/scrum-master STORY-XXX [--from=N] [--to=N] [--approve=phases] [--dry-run]
    │
    ├─→ Phase 0: scrum-master-setup-leader.agent.md (haiku)
    │       ├─→ Parse arguments
    │       ├─→ Check for STATE.md (resume or new)
    │       ├─→ Validate phase range
    │       ├─→ Handle --dry-run
    │       └─→ Write STATE.md + AGENT-CONTEXT.md
    │
    └─→ Phase 1: scrum-master-loop-leader.agent.md (sonnet)
            ├─→ Load state
            ├─→ For each phase (from → to):
            │       ├─→ Check approval gate
            │       ├─→ Spawn Task for command
            │       ├─→ Capture output to PHASE-N-OUTPUT.md
            │       ├─→ Parse signal
            │       └─→ Update STATE.md
            └─→ Report final status
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

Primary artifact: `STATE.md` (YAML in markdown)

## Workflow Phases

| # | Name | Command | Success Signal |
|---|------|---------|----------------|
| 1 | PM Generate | `/pm-story generate` | `PM COMPLETE` |
| 2 | Elaboration | `/elab-story` | `ELAB PASS` |
| 3 | Implementation | `/dev-implement-story` | `DOCUMENTATION COMPLETE` |
| 4 | Code Review | `/dev-code-review` | `CODE REVIEW PASS` |
| 5 | QA Verify | `/qa-verify-story` | `QA PASS` |
| 6 | Done | (status update) | `WORKFLOW COMPLETE` |

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `_workflow/STATE.md` | Setup Leader | Workflow state, phase status, resume point |
| `_workflow/AGENT-CONTEXT.md` | Setup Leader | Context for loop leader |
| `_workflow/PHASE-N-OUTPUT.md` | Loop Leader | Captured output from each phase |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Signal | Meaning |
|--------|---------|
| `SETUP COMPLETE` | Ready to execute |
| `SETUP COMPLETE (DRY RUN)` | Dry run finished |
| `SETUP FAILED: <reason>` | Cannot start |
| `WORKFLOW COMPLETE` | All phases succeeded |
| `WORKFLOW BLOCKED: <reason>` | Needs human input |
| `WORKFLOW FAILED: <reason>` | Phase failed |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Each phase tracks tokens in STATE.md:
```yaml
phases:
  N_<phase>:
    tokens_used: ~NNNK
```

Final report includes total tokens and estimated cost.

## Arguments

| Arg | Description | Example |
|-----|-------------|---------|
| `STORY-XXX` | Story ID (required) | `STORY-007` |
| `--from=N` | Start at phase N (skip earlier) | `--from=3` |
| `--to=N` | Stop after phase N | `--to=2` |
| `--approve=phases` | Pause for approval at phases | `--approve=elab,implement` |
| `--dry-run` | Show plan without executing | `--dry-run` |

## Context Isolation

Each phase runs as isolated Task with fresh context:

| Aspect | Without Isolation | With Task Isolation |
|--------|-------------------|---------------------|
| Context per phase | Cumulative (bloats) | Fresh 200k tokens |
| Phase 5 context | ~500k+ (unusable) | ~200k (full capacity) |
| Cost | High (reprocessing) | Lower (no history) |
| Failure recovery | Lose everything | Resume from checkpoint |

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Setup | Story not found | 0 - Fail immediately |
| Setup | Invalid args | 0 - Fail immediately |
| Loop | Task timeout | 0 - Mark failed, user must resume |
| Loop | Invalid signal | 0 - Mark failed, user must resume |

## Resume After Failure

```bash
# If stopped at phase 4 (code review failed):
# 1. Fix the code issues
# 2. Resume from phase 3 (re-implement) or 4 (re-review)
/scrum-master STORY-XXX --from=4
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| "Story not found" | Verify `plans/stories/STORY-XXX/STORY-XXX.md` exists |
| "Invalid phase range" | Ensure --from <= --to, both 1-6 |
| Phase stuck | Check `_workflow/PHASE-N-OUTPUT.md` for errors |
| No signal detected | Review last 20 lines of phase output |
| State corrupt | Delete `_workflow/STATE.md`, restart with `--from=1` |

## Examples

```bash
# Run full workflow from start
/scrum-master STORY-007

# Run from specific phase (skip earlier)
/scrum-master STORY-007 --from=3

# Run up to specific phase (stop after)
/scrum-master STORY-007 --to=2

# Run specific range
/scrum-master STORY-007 --from=2 --to=4

# Run with approval gates
/scrum-master STORY-007 --approve=elab,qa

# Dry run (show plan without executing)
/scrum-master STORY-007 --dry-run
```

## Decision Points

| After Phase | If Signal | Next Phase |
|-------------|-----------|------------|
| 2 (Elab) | `ELAB PASS` | 3 (Implement) |
| 2 (Elab) | `ELAB FAIL` | STOP, needs PM fix |
| 4 (Code Review) | `PASS` | 5 (QA Verify) |
| 4 (Code Review) | `FAIL` | STOP, needs dev fix |
| 5 (QA) | `PASS` | 6 (Done) |
| 5 (QA) | `FAIL` | STOP, needs dev fix |
