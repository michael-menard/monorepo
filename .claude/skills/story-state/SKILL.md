---
created: 2026-03-14
updated: 2026-03-14
version: 1.0.0
name: story-state
description: 'Update story state, metadata, or elaboration verdict directly in the KB. No filesystem required — KB is the only source of truth.'
kb_tools:
  - kb_update_story_status
  - kb_update_story
  - kb_write_artifact
  - kb_read_artifact
---

# /story-state — Update Story State in KB

Lightweight KB-only story update. No feature directory needed. No filesystem writes.

## Usage

```
/story-state STORY-ID [--state=X] [--phase=X] [--priority=X] [--verdict=X] [--resolve-gap=N --note="reason"] [--title=X] [--epic=X] [--feature=X]
```

## Arguments

| Argument          | Required | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `STORY-ID`        | yes      | Story identifier (e.g., CDBN-3020)                                   |
| `--state=X`       | no       | New workflow state (see states below)                                |
| `--phase=X`       | no       | New phase (see phases below)                                         |
| `--priority=X`    | no       | New priority: critical, high, medium, low                            |
| `--verdict=X`     | no       | Override elaboration verdict: PASS, CONDITIONAL_PASS, FAIL           |
| `--resolve-gap=N` | no       | Gap ID to mark as resolved (e.g., gap-2). Combine with `--note`      |
| `--note="..."`    | no       | Reason/note for the change (used with `--resolve-gap` or standalone) |
| `--title=X`       | no       | New story title                                                      |
| `--epic=X`        | no       | New epic value                                                       |
| `--feature=X`     | no       | New feature value                                                    |

### Valid States

```
backlog → ready → in_progress → ready_for_review → in_review → ready_for_qa → in_qa → completed
```

| State              | Meaning                    |
| ------------------ | -------------------------- |
| `backlog`          | Queued, not yet ready      |
| `ready`            | Elaborated, ready for dev  |
| `in_progress`      | Dev actively working       |
| `ready_for_review` | Implementation complete    |
| `in_review`        | Code review in progress    |
| `ready_for_qa`     | Code reviewed, awaiting QA |
| `in_qa`            | QA in progress             |
| `completed`        | All phases done            |
| `cancelled`        | Superseded or abandoned    |
| `deferred`         | Parked for later           |

### Valid Phases

`setup`, `analysis`, `planning`, `implementation`, `code_review`, `qa_verification`, `completion`

---

## Execution Steps

### Step 1: Fetch current story

Call `kb_get_story({ story_id: "STORY-ID" })` to confirm story exists and get current state.

If story not found: `UPDATE FAILED: Story STORY-ID not found in KB`

### Step 2: Apply state/phase/priority update (if provided)

If any of `--state`, `--phase`, `--priority` were provided:

```javascript
kb_update_story_status({
  story_id: 'STORY-ID',
  state: '--state value', // omit if not provided
  phase: '--phase value', // omit if not provided
  priority: '--priority value', // omit if not provided
})
```

### Step 3: Apply metadata update (if provided)

If any of `--title`, `--epic`, `--feature` were provided:

```javascript
kb_update_story({
  story_id: 'STORY-ID',
  title: '--title value', // omit if not provided
  epic: '--epic value', // omit if not provided
  feature: '--feature value', // omit if not provided
})
```

### Step 4: Apply elaboration artifact update (if `--verdict` or `--resolve-gap` provided)

Read the current artifact first:

```javascript
kb_read_artifact({ story_id: 'STORY-ID', artifact_type: 'elaboration' })
```

If artifact not found: emit warning `"No elaboration artifact found for STORY-ID — skipping verdict/gap update"` and continue.

**If `--resolve-gap=N`:**
Find the gap with `id: "gap-N"` in `content.gaps[]` and set:

```yaml
decision: 'resolved'
note: "<--note value or 'Resolved manually'>"
```

**If `--verdict=X`:**
Set `content.verdict` to the new verdict value.
Set `content.decided_at` to current ISO timestamp.

Write updated artifact back:

```javascript
kb_write_artifact({
  story_id: 'STORY-ID',
  artifact_type: 'elaboration',
  phase: 'planning',
  content: { ...existing_content, ...changes },
})
```

### Step 5: Report result

```
Story STORY-ID updated.

  State:   old → new        (if changed)
  Phase:   old → new        (if changed)
  Priority: old → new       (if changed)
  Verdict: old → new        (if changed)
  Gap resolved: gap-N — <note>  (if --resolve-gap used)
```

---

## Examples

```bash
# Move to ready state after elaboration
/story-state CDBN-3020 --state=ready --phase=planning

# Upgrade verdict from CONDITIONAL_PASS to PASS
/story-state CDBN-3020 --verdict=PASS

# Resolve a specific gap with a note
/story-state CDBN-3020 --resolve-gap=2 --note="CDBN-2013 confirmed complete"

# Resolve gap and upgrade verdict in one command
/story-state CDBN-3020 --resolve-gap=2 --note="CDBN-2013 confirmed complete" --verdict=PASS

# Update priority
/story-state CDBN-3020 --priority=high

# Correct epic assignment
/story-state CDBN-3020 --epic=CDBN --feature=consolidate-db-normalized
```

---

## Error Handling

| Error                | Action                                    |
| -------------------- | ----------------------------------------- |
| Story not found      | `UPDATE FAILED: Story not found in KB`    |
| Invalid state value  | `UPDATE FAILED: Invalid state "{value}"`  |
| No changes specified | `UPDATE FAILED: No update flags provided` |
| KB tool unavailable  | Emit warning, report partial success      |

## Signal

- `UPDATE COMPLETE` — all requested changes applied
- `UPDATE PARTIAL: <reason>` — some changes applied, some failed
- `UPDATE FAILED: <reason>` — no changes applied
