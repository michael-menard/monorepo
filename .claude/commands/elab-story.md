---
created: 2026-01-20
updated: 2026-02-06
version: 5.0.0
type: orchestrator
agents: ["elab-setup-leader.agent.md", "elab-analyst.agent.md", "elab-autonomous-decider.agent.md", "elab-completion-leader.agent.md"]
---

/elab-story {FEATURE_DIR} {STORY_ID} [--autonomous]

QA agent performing Story Elaboration before implementation. **HARD GATE** - stories must pass before dev.

## Usage

```bash
# Interactive mode (default) - asks for decisions on each finding
/elab-story plans/future/wishlist WISH-001

# Autonomous mode - makes sensible decisions, logs non-blocking to KB
/elab-story plans/future/wishlist WISH-001 --autonomous
```

### Autonomous Mode

When `--autonomous` is specified:
- **MVP-blocking gaps** → Auto-added as new Acceptance Criteria
- **Non-blocking findings** → Written to Knowledge Base for future reference
- **Status** → Set to `ready-to-work` (if PASS/CONDITIONAL PASS)
- **No user prompts** → Fully automated decision-making

Use autonomous mode to reduce PM overhead and get stories dev-ready faster.

---

## Phases

### Interactive Mode (default)

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `elab-setup-leader` | haiku | `ELAB-SETUP COMPLETE` |
| 1 | `elab-analyst` | sonnet | `ANALYSIS COMPLETE` |
| — | (Interactive) | — | User decisions collected |
| 2 | `elab-completion-leader` | haiku | `ELABORATION COMPLETE: <verdict>` |
| 3 | `pm-story-followup-leader` (if needed) | sonnet | `PM COMPLETE` |
| 4 | Split + recursive elab (if SPLIT REQUIRED) | sonnet | per-split verdicts |

### Autonomous Mode (--autonomous)

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `elab-setup-leader` | haiku | `ELAB-SETUP COMPLETE` |
| 1 | `elab-analyst` | sonnet | `ANALYSIS COMPLETE` |
| 1.5 | `elab-autonomous-decider` | sonnet | `AUTONOMOUS DECISIONS COMPLETE: <verdict>` |
| 2 | `elab-completion-leader` | haiku | `ELABORATION COMPLETE: <verdict>` |
| 4 | Split + recursive elab (if SPLIT REQUIRED) | sonnet | per-split verdicts |

**Note**: Phase 3 (follow-up stories) is skipped in autonomous mode. Follow-ups require PM judgment.

---

## Execution

### Phase 0: Setup
```
Task: haiku, "Phase 0 Elab-Setup {STORY_ID}"
Read: .claude/agents/elab-setup-leader.agent.md
Signal: ELAB-SETUP COMPLETE
```

### Phase 1: Analysis
Move story: `backlog/{STORY_ID}` → `elaboration/{STORY_ID}`

```
Task: sonnet, "Phase 1 Analysis {STORY_ID}"
Read: .claude/agents/elab-analyst.agent.md
Signal: ANALYSIS COMPLETE
```

### Phase 1.5: Decision Making

**IF --autonomous flag:**

```
Task: sonnet, "Phase 1.5 Autonomous Decisions {STORY_ID}"
Read: .claude/agents/elab-autonomous-decider.agent.md
Signal: AUTONOMOUS DECISIONS COMPLETE: <verdict>
```

The autonomous decider will:
1. Parse ANALYSIS.md for MVP-critical gaps
2. Parse FUTURE-OPPORTUNITIES.md for non-blocking items
3. Auto-add MVP gaps as new ACs to the story
4. Spawn kb-writer for each non-blocking finding
5. Write DECISIONS.yaml with all choices made
6. Return verdict for completion phase

**IF interactive (default):**

1. Read `_implementation/ANALYSIS.md`
2. Count gaps and enhancements
3. Ask: "Discuss [N] gaps and [M] enhancements? (yes/no)"
4. For each finding, collect decision:
   - (1) Add as AC
   - (2) Follow-up story
   - (3) Out-of-scope
   - (4) Skip

### Phase 2: Completion

**IF --autonomous:**
```
Task: haiku, "Phase 2 Completion {STORY_ID}"
Read: .claude/agents/elab-completion-leader.agent.md
Include: verdict from DECISIONS.yaml, decisions from DECISIONS.yaml
Signal: ELABORATION COMPLETE: <verdict>
```

**IF interactive:**
```
Task: haiku, "Phase 2 Completion {STORY_ID}"
Read: .claude/agents/elab-completion-leader.agent.md
Include: verdict, user decisions
Signal: ELABORATION COMPLETE: <verdict>
```

---

## Verdicts

| Verdict | Action |
|---------|--------|
| PASS | Move to `ready-to-work/` |
| CONDITIONAL PASS | Move to `ready-to-work/`, log risks |
| SPLIT REQUIRED | Spawn split workflow, recursive elab |
| FAIL | Return to `backlog/`, document gaps |

---

## On Success (PASS)

```bash
mv {FEATURE_DIR}/elaboration/{STORY_ID} {FEATURE_DIR}/ready-to-work/{STORY_ID}
```

Report:
```
ELABORATION COMPLETE: PASS
Story: {STORY_ID} ready for implementation
Next: /dev-implement-story {FEATURE_DIR} {STORY_ID}
```
