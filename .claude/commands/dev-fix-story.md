---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
type: orchestrator
agents: ["dev-setup-leader.agent.md", "dev-fix-fix-leader.agent.md", "dev-verification-leader.agent.md", "dev-documentation-leader.agent.md"]
---

/dev-fix-story {FEATURE_DIR} {STORY_ID}

Dev Fix Orchestrator. Spawn phase leaders sequentially. Do NOT implement directly.

## Usage

```
/dev-fix-story plans/future/wishlist WISH-001
```

## Phases

| # | Agent | Mode | Model | Signal |
|---|-------|------|-------|--------|
| 0 | `dev-setup-leader.agent.md` | `fix` | haiku | `SETUP COMPLETE` |
| 1 | `dev-fix-fix-leader.agent.md` | — | sonnet | `FIX COMPLETE` |
| 2 | `dev-verification-leader.agent.md` | `fix` | haiku | `VERIFICATION COMPLETE` |
| 3 | `dev-documentation-leader.agent.md` | `fix` | haiku | `DOCUMENTATION COMPLETE` |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N Fix {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/<agent-file>
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Mode: fix
```

**Note:** For consolidated agents (Phase 0, 2, 3), the `Mode: fix` parameter is REQUIRED.

- Wait for signal
- BLOCKED/FAILED → stop, report
- COMPLETE → next phase

## Error
Report: "{STORY_ID} fix blocked at Phase N: <reason>"

## Done
Phase 3 complete → status is `ready-for-code-review`
**Next**: `/dev-code-review {FEATURE_DIR} {STORY_ID}`

## Ref
`.claude/docs/dev-fix-reference.md`
