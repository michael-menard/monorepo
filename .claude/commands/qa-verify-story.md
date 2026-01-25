---
created: 2026-01-15
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["qa-verify-setup-leader.agent.md", "qa-verify-verification-leader.agent.md", "qa-verify-completion-leader.agent.md"]
---

/qa-verify-story {FEATURE_DIR} {STORY_ID}

Post-Implementation Verification orchestrator. Final quality gate before DONE. Do NOT implement directly.

## Usage

```
/qa-verify-story plans/future/wishlist WISH-001
```

## Output

Updates: `VERIFICATION.yaml` (qa_verify + gate sections)

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `qa-verify-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `qa-verify-verification-leader.agent.md` | sonnet | VERIFICATION COMPLETE |
| 2 | `qa-verify-completion-leader.agent.md` | haiku | QA PASS / QA FAIL |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase N QA-Verify {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

- Wait for signal
- BLOCKED/FAILED → stop, report
- COMPLETE → next phase

## Error

Report: "{STORY_ID} blocked at Phase N: <reason>"

## Done

On `QA PASS`:
- Story status: `uat`
- Move story: `{FEATURE_DIR}/in-progress/{STORY_ID}` → `{FEATURE_DIR}/UAT/{STORY_ID}`
- Index updated with completion

On `QA FAIL`:
- Story status: `needs-work`
- Story stays in: `{FEATURE_DIR}/in-progress/{STORY_ID}/`

**Next (on FAIL)**: `/dev-fix-story {FEATURE_DIR} {STORY_ID}`

## Ref

`.claude/docs/qa-verify-story-reference.md`
