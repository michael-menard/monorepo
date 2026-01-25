---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["ui-ux-review-setup-leader.agent.md", "ui-ux-review-reviewer.agent.md", "ui-ux-review-report-leader.agent.md"]
---

/ui-ux-review {FEATURE_DIR} {STORY_ID}

UI/UX review orchestrator for design system compliance and accessibility. Do NOT implement directly.

## Usage

```
/ui-ux-review plans/future/wishlist WISH-001
```

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `ui-ux-review-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `ui-ux-review-reviewer.agent.md` | sonnet | REVIEW COMPLETE |
| 2 | `ui-ux-review-report-leader.agent.md` | haiku | REPORT COMPLETE |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N UI/UX Review {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

- Wait for signal
- `SETUP COMPLETE: SKIPPED` → STOP (no further phases)
- `BLOCKED/FAILED` → stop, report
- `COMPLETE` → next phase

## Error

Report: "{STORY_ID} UI/UX review blocked at Phase N: <reason>"

## Done

Final artifact: `{FEATURE_DIR}/<stage>/{STORY_ID}/UI-UX-REVIEW-{STORY_ID}.md`

## Ref

`.claude/docs/ui-ux-review-reference.md`
