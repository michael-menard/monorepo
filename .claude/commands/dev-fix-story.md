/dev-fix-story STORY-XXX

Dev Fix Orchestrator. Spawn phase leaders sequentially. Do NOT implement directly.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `dev-fix-setup-leader.agent.md` | haiku | `SETUP COMPLETE` |
| 1 | `dev-fix-fix-leader.agent.md` | sonnet | `FIX COMPLETE` |
| 2 | `dev-fix-verification-leader.agent.md` | haiku | `VERIFICATION COMPLETE` |
| 3 | `dev-fix-documentation-leader.agent.md` | haiku | `DOCUMENTATION COMPLETE` |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N Fix STORY-XXX"
  prompt: |
    Read instructions: .claude/agents/<agent-file>
    Story ID: STORY-XXX
```

- Wait for signal
- BLOCKED/FAILED → stop, report
- COMPLETE → next phase

## Error
Report: "STORY-XXX fix blocked at Phase N: <reason>"

## Done
Phase 3 complete → status is `ready-for-code-review`
**Next**: `/dev-code-review STORY-XXX`

## Ref
`.claude/docs/dev-fix-reference.md`
