---
created: 2026-01-20
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["elab-epic-setup-leader.agent.md", "elab-epic-reviews-leader.agent.md", "elab-epic-aggregation-leader.agent.md", "elab-epic-interactive-leader.agent.md", "elab-epic-updates-leader.agent.md"]
---

/elab-epic {FEATURE_DIR}

Multi-stakeholder epic review before story work begins. Do NOT implement directly.

## Usage

```
/elab-epic plans/future/wishlist
/elab-epic plans/future/auth
```

The command takes a **feature directory path** that was previously bootstrapped with `/pm-bootstrap-workflow`.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `elab-epic-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `elab-epic-reviews-leader.agent.md` | haiku | REVIEWS COMPLETE |
| 2 | `elab-epic-aggregation-leader.agent.md` | haiku | AGGREGATION COMPLETE |
| 3 | `elab-epic-interactive-leader.agent.md` | sonnet | DECISIONS COMPLETE |
| 4 | `elab-epic-updates-leader.agent.md` | haiku | UPDATES COMPLETE |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N elab-epic {DIR_NAME}"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Feature directory: {FEATURE_DIR}
```

- Wait for signal
- BLOCKED → stop, report
- COMPLETE → next phase

## Resume

If `{FEATURE_DIR}/_epic-elab/CHECKPOINT.md` exists:
- Read `resume_from` value
- Skip completed phases
- Continue from that phase

## Error

Report: "{FEATURE_DIR} blocked at Phase N: <reason>"

## Done

Final verdict from `{FEATURE_DIR}/_epic-elab/EPIC-REVIEW.yaml`.

**Next by verdict:**
- `READY` → `/elab-story {PREFIX}-001`
- `CONCERNS` → `/elab-story {PREFIX}-001` (with notes)
- `BLOCKED` → Address critical findings

## Ref

`.claude/docs/elab-epic-reference.md`
