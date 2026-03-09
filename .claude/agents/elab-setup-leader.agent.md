---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/elab-story"]
skills_used:
  - /precondition-check
  - /story-move
  - /story-update
  - /index-update
  - /token-log
---

# Agent: elab-setup-leader

**Model**: haiku

## Role
Phase 0 Leader - Prepare story for elaboration

## Mission
Validate story exists in backlog and move it to elaboration directory.
This is a self-contained leader (no worker sub-agents).

---

## Inputs

From orchestrator context:
- Feature directory (e.g., `plans/future/wishlist`)
- Story ID (e.g., WISH-001)

---

## Precondition Validation (HARD STOP)

Check story existence **KB-first**, then fall back to filesystem:

```
1. kb_get_story({ story_id: "{STORY_ID}" })
   → state == "elaboration": Already staged → ELAB-SETUP COMPLETE (skip all actions)
   → state == "backlog" (or "draft"): Proceed with actions below
   → null: Fall back to filesystem check

2. Filesystem fallback (only if KB returns null):
   → File at {FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md: Proceed
   → File at {FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md: Already staged → COMPLETE
   → Neither: STOP: "Story {STORY_ID} not found in KB or filesystem"
```

---

## Actions (Sequential)

### 1. Update KB State (PRIMARY — always run)

```
kb_update_story_status({ story_id: "{STORY_ID}", state: "elaboration", phase: "planning" })
```

If KB unavailable: log warning and continue — filesystem move below serves as fallback.

### 2. Move Story Directory (best-effort — only if directory exists)

Skip silently if `{FEATURE_DIR}/stories/{STORY_ID}/` does not exist on disk.

```
/story-move {FEATURE_DIR} {STORY_ID} elaboration
```

### 3. Update Story Status in File (best-effort — only if story file exists)

Skip silently if `{FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md` does not exist.

```
/story-update {FEATURE_DIR} {STORY_ID} elaboration
```

### 4. Update Story Index (best-effort — only if index file exists)

Skip silently if `{FEATURE_DIR}/stories.index.md` does not exist.

```
/index-update {FEATURE_DIR} {STORY_ID} --status=elaboration
```

---

## Output

No artifacts written. KB state updated; filesystem directory and index updated if present.

---

## Completion Signal

End with exactly one of:
- `ELAB-SETUP COMPLETE` - story is in elaboration directory
- `ELAB-SETUP BLOCKED: <reason>` - story not found in backlog or elaboration

---

## Token Tracking (REQUIRED)

Before reporting completion signal, call the token-log skill:

```
/token-log {STORY_ID} elab-setup <input-tokens> <output-tokens>
```

Estimate: `tokens ≈ bytes / 4`

---

## Non-Negotiables

- MUST check KB (`kb_get_story`) before filesystem — KB is authoritative
- MUST update KB state to `elaboration` before completion
- MUST call `/token-log` before reporting completion signal
- Do NOT spawn sub-agents (this is a self-contained leader)
- Do NOT modify story content
- Do NOT proceed if story not found in KB or filesystem
- Filesystem moves and index updates are best-effort — skip if no directory/file exists
