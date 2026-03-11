---
created: 2026-01-20
updated: 2026-02-25
version: 5.1.0
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
<!-- KSOT-3010: No filesystem move — story stays in {FEATURE_DIR}/stories/{STORY_ID}/.
     KB state update in elab-setup-leader is the authoritative state change. -->

```
Task: sonnet, "Phase 1 Analysis {STORY_ID}"
Read: .claude/agents/elab-analyst.agent.md
Output: elaboration KB artifact via kb_write_artifact (audit + gaps + opportunities + preliminary_verdict)
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
1. Read elaboration KB artifact (`kb_read_artifact`) for gaps and opportunities
2. Auto-add MVP gaps as new ACs to the story (via KB)
3. Spawn kb-writer for each non-blocking opportunity
4. Update elaboration KB artifact with decisions + verdict
5. Return verdict for completion phase

**IF interactive (default):**

1. Read elaboration KB artifact: `kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "elaboration" })`
2. Count gaps and opportunities
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
Include: verdict from elaboration KB artifact, decisions from elaboration KB artifact
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

<!-- KSOT-3010: Verdicts trigger KB state updates, not filesystem moves -->
| Verdict | Action |
|---------|--------|
| PASS | KB state → `ready`, story stays in `stories/` |
| CONDITIONAL PASS | KB state → `ready`, log risks, story stays in `stories/` |
| SPLIT REQUIRED | Spawn split workflow, recursive elab |
| FAIL | KB state → `backlog`, document gaps |

---

## On PASS / CONDITIONAL PASS

After Phase 2 returns `ELABORATION COMPLETE: PASS` or `ELABORATION COMPLETE: CONDITIONAL PASS`:

<!-- KSOT-3010: KB state update only — no filesystem move -->
1. Update KB state (PRIMARY — always run):
   ```
   kb_update_story_status({ story_id: "{STORY_ID}", state: "ready", phase: "planning" })
   ```
   If `kb_update_story_status` returns null or throws, emit `WARNING: DB state update failed for {STORY_ID}` and continue.
2. Report:
   ```
   ELABORATION COMPLETE: PASS
   Story: {STORY_ID} ready for implementation
   Location: {FEATURE_DIR}/stories/{STORY_ID}/
   Next: /dev-implement-story {FEATURE_DIR} {STORY_ID}
   ```

## On FAIL

After Phase 2 returns `ELABORATION COMPLETE: FAIL`:

<!-- KSOT-3010: KB state update only — no filesystem move -->
1. Update KB state (PRIMARY — always run):
   ```
   kb_update_story_status({ story_id: "{STORY_ID}", state: "backlog", phase: "planning" })
   ```
   If `kb_update_story_status` returns null or throws, emit `WARNING: DB state update failed for {STORY_ID}` and continue.
2. Report:
   ```
   ELABORATION COMPLETE: FAIL
   Story: {STORY_ID} returned to backlog (KB state) — address gaps and re-run /elab-story
   Location: {FEATURE_DIR}/stories/{STORY_ID}/
   ```

## On SPLIT REQUIRED

No DB state change on the parent story — it will be superseded by split children. Spawn split workflow per existing behavior (recursive `/elab-story` for each split part).

## Note on Phase 1 State

<!-- KSOT-3010: No Phase 1 directory move — story stays in stories/ -->
Phase 1 does **not** need a KB state change — `backlog` is the correct KB state during in-progress analysis. The story directory remains at `{FEATURE_DIR}/stories/{STORY_ID}/` throughout elaboration.
