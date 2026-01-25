---
created: 2026-01-20
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["elab-setup-leader.agent.md", "elab-analyst.agent.md", "elab-completion-leader.agent.md"]
---

/elab-story {FEATURE_DIR} {STORY_ID}

QA agent performing Story Elaboration before implementation. HARD GATE - stories must pass before dev.

## Usage

```
/elab-story plans/future/wishlist WISH-001
```

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `elab-setup-leader.agent.md` | haiku | `ELAB-SETUP COMPLETE` |
| 1 | `elab-analyst.agent.md` | sonnet | `ANALYSIS COMPLETE` |
| — | (Interactive) | — | User decisions collected |
| 2 | `elab-completion-leader.agent.md` | haiku | `ELABORATION COMPLETE: <verdict>` |

## Execution

### Phase 0: Setup

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 0 Elab-Setup {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-setup-leader.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

Wait for `ELAB-SETUP COMPLETE`. If BLOCKED → STOP.

### Phase 1: Analysis

Move story from backlog to elaboration:
```bash
mv {FEATURE_DIR}/backlog/{STORY_ID} {FEATURE_DIR}/elaboration/{STORY_ID}
mkdir -p {FEATURE_DIR}/elaboration/{STORY_ID}/_implementation
```

```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Phase 1 Analysis {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-analyst.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
```

Wait for `ANALYSIS COMPLETE`. If BLOCKED → STOP.

### Interactive Discussion (Orchestrator Direct)

1. Read `{FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/ANALYSIS.md`
2. Count gaps and enhancements
3. Ask: "I've identified [N] gaps and [M] enhancements. Discuss before finalizing? (yes/no)"

**If YES**: Present each finding one at a time (format in reference doc). Collect decision:
- (1) Add as AC
- (2) Follow-up story
- (3) Out-of-scope
- (4) Skip

**If NO**: Mark all "Not Reviewed"

### Phase 2: Completion

Determine verdict from ANALYSIS.md preliminary verdict.

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 2 Completion {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/elab-completion-leader.agent.md
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Final verdict: <PASS|CONDITIONAL PASS|FAIL|SPLIT REQUIRED>
    User decisions: <JSON from interactive phase>
```

Wait for `ELABORATION COMPLETE: <verdict>`.

On PASS/CONDITIONAL PASS, move story to ready-to-work:
```bash
mv {FEATURE_DIR}/elaboration/{STORY_ID} {FEATURE_DIR}/ready-to-work/{STORY_ID}
```

## Error Handling

| Signal | Action |
|--------|--------|
| `BLOCKED` | Stop, report reason |
| `FAIL` verdict | Story stays in elaboration, run `/pm-fix-story` |
| `SPLIT REQUIRED` | Story stays in elaboration, PM must split |

## Token Report

After completion: `/token-report {STORY_ID}`

## Done

Stop when:
- `ELABORATION COMPLETE` received
- Token report generated
- User notified of verdict and next steps

**Next steps by verdict:**
- PASS/CONDITIONAL PASS → `/dev-implement-story {FEATURE_DIR} {STORY_ID}`
- FAIL → `/pm-fix-story {FEATURE_DIR} {STORY_ID}`
- SPLIT REQUIRED → PM creates split stories, elaborate each

## Ref

`.claude/docs/elab-story-reference.md`
