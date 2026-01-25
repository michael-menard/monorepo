---
created: 2026-01-20
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["pm-story-fix-leader.agent.md"]
---

/pm-fix-story {FEATURE_DIR} {STORY_ID}

Revise stories that FAILED or received CONDITIONAL PASS during QA Elaboration. Do NOT implement directly.

## Usage

```
/pm-fix-story plans/future/wishlist WISH-001
```

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `pm-story-fix-leader.agent.md` | sonnet | PM COMPLETE |

## Execution

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "PM Fix {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/pm-story-fix-leader.agent.md

    CONTEXT:
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Story file: {FEATURE_DIR}/elaboration/{STORY_ID}/{STORY_ID}.md
    QA audit: {FEATURE_DIR}/elaboration/{STORY_ID}/ELAB-{STORY_ID}.md

    OUTPUT: Follow lean-docs.md, structured summary
```

- Wait for signal
- BLOCKED/FAILED → stop, report to user
- COMPLETE → done

## Error

Report: "{STORY_ID} blocked at PM Fix: <reason>"

## Done

Story status changed from `needs-refinement` to `backlog`.
Move story back to backlog: `{FEATURE_DIR}/elaboration/{STORY_ID}` → `{FEATURE_DIR}/backlog/{STORY_ID}`

**Next**: `/elab-story {FEATURE_DIR} {STORY_ID}`

## Ref

`.claude/docs/pm-fix-story-reference.md`
