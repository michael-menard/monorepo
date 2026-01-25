Usage:
/elab-story STORY-XXX

You are the QA agent performing Story Elaboration before implementation begins.
This is a HARD GATE - stories must pass before proceeding to dev.

---

## Phase Leaders

| Phase | Agent | Success Signal |
|-------|-------|----------------|
| 0 | `elab-setup-leader.agent.md` | `ELAB-SETUP COMPLETE` |
| 1 | `elab-analyst.agent.md` | `ANALYSIS COMPLETE` |
| — | (Interactive with user) | User decisions collected |
| 2 | `elab-completion-leader.agent.md` | `ELABORATION COMPLETE: <verdict>` |

---

## Context Block

Pass to each agent:

```
STORY CONTEXT:
Story ID: STORY-XXX
Base path: plans/stories/elaboration/STORY-XXX/
Artifacts path: plans/stories/elaboration/STORY-XXX/_implementation/
```

---

## Execution

### Phase 0: Setup

1. Read `.claude/agents/elab-setup-leader.agent.md`
2. Spawn agent with story context
3. Wait for signal
4. If BLOCKED → STOP and report

### Phase 1: Analysis

1. Ensure `_implementation/` exists: `mkdir -p plans/stories/elaboration/STORY-XXX/_implementation`
2. Read `.claude/agents/elab-analyst.agent.md`
3. Spawn agent with story context
4. Wait for `ANALYSIS COMPLETE`
5. If BLOCKED → STOP and report

### Interactive Discussion (Orchestrator Handles Directly)

1. Read `_implementation/ANALYSIS.md`
2. Count gaps and enhancements found
3. Ask user:

```
I've identified [N] potential gaps and [M] enhancement opportunities.
Would you like to discuss these improvements before finalizing? (yes/no)
```

**If YES:**
- Present each finding one at a time (see reference doc for format)
- Collect user decision for each: (1) Add as AC, (2) Follow-up story, (3) Out-of-scope, (4) Skip
- Track all decisions

**If NO:**
- Mark all findings as "Not Reviewed"
- Proceed to completion

### Phase 2: Completion

1. Determine final verdict from ANALYSIS.md
2. Read `.claude/agents/elab-completion-leader.agent.md`
3. Spawn agent with:
   - Story context
   - Final verdict
   - User decisions from interactive phase (as JSON)
4. Wait for `ELABORATION COMPLETE: <verdict>`

---

## Error Handling

| Signal | Action |
|--------|--------|
| `BLOCKED` | Stop execution, report reason to user |
| `FAIL` verdict | Story stays in elaboration, notify user to run `/pm-fix-story` |
| `SPLIT REQUIRED` | Story stays in elaboration, notify user PM must split |

---

## Token Report

After completion, generate summary:

```
/token-report STORY-XXX
```

---

## Done

Stop when:
- `ELABORATION COMPLETE` signal received
- Token report generated
- User notified of verdict and next steps

**Next steps by verdict:**
- PASS/CONDITIONAL PASS → `/dev-implement-story STORY-XXX`
- FAIL → `/pm-fix-story STORY-XXX`
- SPLIT REQUIRED → PM creates split stories, then elaborate each

---

## Reference

See `.claude/docs/elab-story-reference.md` for:
- Detailed audit checklist
- Discovery question details
- Interactive discussion format
- Verdict definitions
- Troubleshooting
