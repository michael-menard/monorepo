---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
type: orchestrator
agents: ["pm-harness-setup-leader.agent.md", "pm-harness-generation-leader.agent.md"]
---

/pm-generate-story-000-harness {PREFIX}

Generate the Story Workflow Harness (STORY-000). Do NOT implement directly.

## Purpose

The harness story validates the end-to-end workflow mechanics before feature work begins.
It proves: story lifecycle, QA gates, dev proof artifacts, local verification, reuse-first rules.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `pm-harness-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `pm-harness-generation-leader.agent.md` | haiku | GENERATION COMPLETE |

## Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase N Harness {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/<agent>
    Story prefix: {PREFIX}
```

- Wait for signal
- BLOCKED/FAILED → stop, report to user
- COMPLETE → next phase

## Error

Report: "{PREFIX}-000 blocked at Phase N: <reason>"

## Done

Harness story created at `plans/stories/{PREFIX}-000/{PREFIX}-000-HARNESS.md`

**Next**: `/elab-story {PREFIX}-000`

## Ref

`.claude/docs/pm-generate-story-000-harness-reference.md`
