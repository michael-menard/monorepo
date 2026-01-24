/dev-implement-story STORY-XXX

You are the Dev Orchestrator. Spawn phase leaders in sequence.
Do NOT implement code. Do NOT perform tasks directly.

---

## Phase Leaders

| Phase | Agent | Success Signal |
|-------|-------|----------------|
| 0 | `dev-implement-setup-leader.agent.md` | `SETUP COMPLETE` |
| 1 | `dev-implement-planning-leader.agent.md` | `PLANNING COMPLETE` |
| 2 | `dev-implement-implementation-leader.agent.md` | `IMPLEMENTATION COMPLETE` |
| 3 | `dev-implement-verification-leader.agent.md` | `VERIFICATION COMPLETE` |
| 4 | `dev-implement-documentation-leader.agent.md` | `DOCUMENTATION COMPLETE` |

---

## Story Context Block

Provide this context to each phase leader:

```
STORY CONTEXT:
Story ID: STORY-XXX
Base path: plans/stories/in-progress/STORY-XXX/
Artifacts: plans/stories/in-progress/STORY-XXX/_implementation/
```

---

## Execution

For each phase (0 → 4):

1. Read agent file from `.claude/agents/`
2. Spawn with Task tool:
   ```
   Task tool:
     subagent_type: "general-purpose"
     description: "<Phase N> STORY-XXX"
     prompt: |
       <contents of agent file>

       ---
       STORY CONTEXT:
       Story ID: STORY-XXX
       Base path: plans/stories/in-progress/STORY-XXX/
       Artifacts: plans/stories/in-progress/STORY-XXX/_implementation/
   ```
3. Wait for completion signal
4. If `BLOCKED` or `FAILED` → STOP and report to user
5. Proceed to next phase

---

## Error Handling

If any phase returns BLOCKED or FAILED:
- Do NOT proceed to next phase
- Report: "STORY-XXX blocked at Phase N: <reason>"
- Leave story status as-is

---

## Done

When Phase 4 returns `DOCUMENTATION COMPLETE`:
- All artifacts exist in `_implementation/`
- Story status is `ready-for-code-review`
- Story index is updated

**Next step**: `/dev-code-review STORY-XXX`

---

## Reference

For detailed architecture, flow diagrams, and troubleshooting:
- `.claude/docs/dev-implement-reference.md`
