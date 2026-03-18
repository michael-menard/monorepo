---
created: 2026-01-24
updated: 2026-03-14
version: 3.0.0
type: orchestrator
agents:
  [
    'dev-setup-leader.agent.md',
    'dev-fix-fix-leader.agent.md',
    'dev-verification-leader.agent.md',
    'dev-documentation-leader.agent.md',
  ]
---

/dev-fix-story {STORY_ID}

Dev Fix Orchestrator. Spawn phase leaders sequentially. Do NOT implement directly.

## Usage

```
/dev-fix-story WISH-001
```

## Phases

| #   | Agent                               | Mode  | Model  | Signal                   |
| --- | ----------------------------------- | ----- | ------ | ------------------------ |
| 0   | `dev-setup-leader.agent.md`         | `fix` | haiku  | `SETUP COMPLETE`         |
| 1   | `dev-fix-fix-leader.agent.md`       | —     | sonnet | `FIX COMPLETE`           |
| 2   | `dev-verification-leader.agent.md`  | `fix` | haiku  | `VERIFICATION COMPLETE`  |
| 3   | `dev-documentation-leader.agent.md` | `fix` | haiku  | `DOCUMENTATION COMPLETE` |

## Step 0.6: Claim Story in KB

Update phase to signal active fix work:

1. Call `kb_update_story_status({ story_id: "{STORY_ID}", state: "in_progress", phase: "implementation" })`
2. **Guard:** If already `in_progress`, STOP: "Story {STORY_ID} is already being fixed by another agent."
3. If `kb_update_story_status` returns null or throws, emit `WARNING: DB state update failed for {STORY_ID} — proceeding with fix work only.` and continue.

**Abort / Error Recovery:** If interrupted after Step 0.6, release manually:
`kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review" })`

## Execution

For each phase:

```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N Fix {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/<agent-file>
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

Phase 3 complete:

1. Invoke: `/wt:commit-and-pr {STORY_ID} "{story_title}"`
   - PR already exists, just pushing new commits
2. Confirm `pr_action: updated`
3. Update KB: `kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review", phase: "implementation" })`
4. Status: `ready-for-code-review`
5. Log telemetry (fire-and-forget — never blocks workflow):
   ```
   /telemetry-log {STORY_ID} dev-fix-story execute success
   ```
   If the call returns null or throws, log a warning and continue.

**Next**: `/dev-code-review {STORY_ID}`

## Ref

`.claude/docs/dev-fix-reference.md`
