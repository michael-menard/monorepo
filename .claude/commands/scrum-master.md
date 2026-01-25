---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["scrum-master-setup-leader.agent.md", "scrum-master-loop-leader.agent.md"]
---

/scrum-master {FEATURE_DIR} {STORY_ID} [--from=<phase>] [--to=<phase>] [--approve=<phases>] [--dry-run]

Meta-orchestrator for full story lifecycle. Each phase runs as isolated Task subagent with fresh context. Do NOT implement phases directly.

## Usage

```
/scrum-master plans/future/wishlist WISH-001
/scrum-master plans/future/wishlist WISH-001 --from=implement
/scrum-master plans/future/wishlist WISH-001 --dry-run
```

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `scrum-master-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `scrum-master-loop-leader.agent.md` | sonnet | WORKFLOW COMPLETE |

## Arguments

| Arg | Description |
|-----|-------------|
| `FEATURE_DIR` | Feature directory (required) |
| `STORY_ID` | Story ID (required) |
| `--from=N` | Start at phase N |
| `--to=N` | Stop after phase N |
| `--approve=phases` | Approval gates (comma-separated: elab,implement,qa) |
| `--dry-run` | Show plan without executing |

## Execution

### Phase 0: Setup

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Setup workflow {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/scrum-master-setup-leader.agent.md

    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Arguments:
    - from: <from_phase or null>
    - to: <to_phase or null>
    - approve: <phases or null>
    - dry_run: <boolean>

    Initialize or resume workflow state.
```

Wait for signal:
- `SETUP COMPLETE` → proceed to Phase 1
- `SETUP COMPLETE (DRY RUN)` → stop, report dry run output
- `SETUP FAILED: <reason>` → stop, report error

### Phase 1: Loop

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Execute workflow {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/scrum-master-loop-leader.agent.md

    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Context: {FEATURE_DIR}/<stage>/{STORY_ID}/_workflow/AGENT-CONTEXT.md

    Execute phases sequentially until complete, blocked, or failed.
```

Wait for signal:
- `WORKFLOW COMPLETE` → report success
- `WORKFLOW BLOCKED: <reason>` → report blocker, suggest fix
- `WORKFLOW FAILED: <reason>` → report failure, suggest resume command

## Error

Report: "{STORY_ID} workflow stopped: <reason>"

Provide resume command:
```
/scrum-master {FEATURE_DIR} {STORY_ID} --from=<failed_phase>
```

## Done

Story lifecycle complete.

```
## Workflow Complete: {STORY_ID}

All phases executed successfully.
Story status: uat

Next: Manual UAT review, then mark as done.
```

## Ref

`.claude/docs/scrum-master-reference.md`
