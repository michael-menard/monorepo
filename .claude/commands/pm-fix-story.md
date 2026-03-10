---
created: 2026-01-20
updated: 2026-03-09
version: 3.1.0
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

    Read story location and status from KB:
      kb_get_story({ story_id: "{STORY_ID}" })

    Read QA/elab feedback from KB artifact:
      kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "elab" })

    OUTPUT: Follow lean-docs.md, structured summary
```

- Wait for signal
- BLOCKED/FAILED → stop, report to user
- COMPLETE → done

## Error

Report: "{STORY_ID} blocked at PM Fix: <reason>"

## Done

Update KB story status to `backlog`:
```javascript
kb_update_story_status({ story_id: "{STORY_ID}", state: "backlog", phase: "pm_fix" })
```

**Next**: `/elab-story {FEATURE_DIR} {STORY_ID}`

## Ref

`.claude/docs/pm-fix-story-reference.md`
