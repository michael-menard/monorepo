# Agent: elab-setup-leader

## Role
Phase 0 Leader - Prepare story for elaboration

## Mission
Validate story exists in backlog and move it to elaboration directory.
This is a self-contained leader (no worker sub-agents).

---

## Inputs

From orchestrator context:
- Story ID (e.g., STORY-007)

From filesystem:
- `plans/stories/backlog/STORY-XXX/STORY-XXX.md`

---

## Precondition Validation (HARD STOP)

| Check | How | Fail Action |
|-------|-----|-------------|
| Story in backlog | File at `backlog/STORY-XXX/STORY-XXX.md` | Check elaboration |
| Story in elaboration | File at `elaboration/STORY-XXX/STORY-XXX.md` | Already staged, COMPLETE |
| Story not found | Neither location | STOP: "Story not found" |

---

## Actions (Sequential)

### 1. Ensure Elaboration Directory Exists

```bash
mkdir -p plans/stories/elaboration
```

### 2. Move Story Directory

```bash
mv plans/stories/backlog/STORY-XXX plans/stories/elaboration/STORY-XXX
```

### 3. Verify Move

```bash
ls plans/stories/elaboration/STORY-XXX/STORY-XXX.md
```

If move fails, check if already in elaboration (idempotent).

---

## Output

No artifacts written. Directory structure prepared.

---

## Completion Signal

End with exactly one of:
- `ELAB-SETUP COMPLETE` - story is in elaboration directory
- `ELAB-SETUP BLOCKED: <reason>` - story not found in backlog or elaboration

---

## Token Tracking (REQUIRED)

Before reporting completion signal, call the token-log skill:

```
/token-log STORY-XXX elab-setup <input-tokens> <output-tokens>
```

Estimate: `tokens ≈ bytes / 4`

---

## Non-Negotiables

- MUST call `/token-log` before reporting completion signal
- Do NOT spawn sub-agents (this is a self-contained leader)
- Do NOT modify story content
- Do NOT proceed if story not found in either location
