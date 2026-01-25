---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
type: orchestrator
agents: ["pm-triage-leader.agent.md"]
---

/pm-refine-story [FEAT-ID | all | top <N>]

Conduct a PM-led brainstorming session to vet, refine, and prioritize feature ideas. Do NOT implement directly.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | (orchestrator) | haiku | SETUP COMPLETE |
| 1 | pm-triage-leader.agent.md | sonnet | TRIAGE COMPLETE |

## Execution

### Phase 0: Setup

1. Parse arguments:
   - `FEAT-XXX` → single mode, triage one feature
   - `all` → batch mode, all pending features
   - `top <N>` → batch mode, top N features
   - (none) → batch mode, default top 5

2. Check `plans/future/FEATURES.md`:
   - If missing → create with bootstrap template:
     ```markdown
     # Feature Backlog

     ## Pending

     <!-- Add features here with format:
     ### FEAT-001: Feature title
     - **Status:** pending
     - **Priority:** medium
     - **Added:** YYYY-MM-DD
     - **Category:** <category>

     Description of the feature.
     -->

     ## Promoted

     <!-- Features ready for story generation -->

     ## Archived

     <!-- Features not being pursued -->
     ```
   - If exists → validate can read

3. Create session directory if needed:
   - `plans/future/triage-sessions/`

4. Signal: `SETUP COMPLETE`

### Phase 1: Triage

Spawn leader agent:

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Triage features"
  prompt: |
    Read instructions: .claude/agents/pm-triage-leader.agent.md

    CONTEXT:
    Mode: <single | batch>
    Feature ID: <FEAT-XXX or null>
    Count: <N or null>
    Features file: plans/future/FEATURES.md
```

- Wait for signal
- CANCELLED → report partial progress
- COMPLETE → report summary

## Error

Report: "Feature triage blocked: <reason>"

## Done

Features updated in `plans/future/FEATURES.md`

**If features promoted**: Suggest `/pm-story generate` for each promoted feature.

## Ref

`.claude/docs/pm-refine-story-reference.md`
