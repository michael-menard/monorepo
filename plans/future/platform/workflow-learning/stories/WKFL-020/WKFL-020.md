---
story_id: WKFL-020
title: Auto-Trigger Follow-Up Story Generation on Story Completion
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: medium
depends_on:
  - WKFL-013  # OUTCOME.yaml must be written on completion before follow-up can be triggered
  - WKFL-014  # dependency cascade must run first so follow-up stories are immediately unblocked
  - LNGG-006  # blocked until LangGraph migration completes
---

# WKFL-020: Auto-Trigger Follow-Up Story Generation on Story Completion

## Context

`pm-story-followup-leader` generates backlog stories from findings identified during QA. It reads `## QA Discovery Notes` in the completed story and creates follow-up story files for any item marked with decision "Follow-up".

The problem: this agent requires **manual invocation** via `/pm-story followup {FEATURE_DIR} {STORY_ID}`. It is not automatically triggered when a story is marked complete.

In practice, the flow looks like:
1. QA passes → story marked `uat`
2. Developer manually writes QA Discovery Notes (if they remember)
3. Developer manually runs `/pm-story followup` (if they remember)
4. Follow-up stories are created

Two manual memory dependencies means follow-up stories are frequently never created. QA findings with decisions of "Follow-up" accumulate in completed story files but never become actionable backlog items.

Additionally, the `follow_ups` DB table (schema in `002_workflow_tables.sql`) is populated only by historical migration scripts and never queried at runtime — the real tracking happens via `story.follow_up_from` and `story_dependencies`. This table is dead infrastructure.

## Goal

Auto-trigger `pm-story-followup-leader` as part of the story completion sequence — after QA verification passes and the story transitions to `uat`. Retire the unused `follow_ups` DB table.

## Non-goals

- Creating follow-up stories from mid-implementation discoveries (those go through the commitment gate gap path per KNOW-047)
- Changing what `pm-story-followup-leader` generates (the agent logic is correct; just the invocation timing)
- Keeping the `follow_ups` DB table (it is dead; drop it)

## Scope

### `qa-verify-completion-leader` Extension

After QA passes and the story state is set to `uat`, add a follow-up sweep step:

```
## Step: Auto Follow-Up Generation

After QA PASS signal:

1. Check if story has "## QA Discovery Notes" section with any "Follow-up" decisions
   - Read story file
   - If no QA Discovery Notes or no "Follow-up" items → skip, log "No follow-up items found"

2. If follow-up items exist:
   - Spawn pm-story-followup-leader as background task:
     story_id: {STORY_ID}
     feature_dir: {FEATURE_DIR}
     trigger: auto (post-qa-completion)
   - Log: "Auto-triggering follow-up story generation for {N} QA discovery items"

3. Wait for completion signal:
   - FOLLOW-UP COMPLETE: {N} stories created → log created story IDs
   - FOLLOW-UP SKIPPED: no items → log and continue
   - FOLLOW-UP FAILED: {reason} → log warning, DO NOT block QA completion signal
```

The follow-up generation failure must never block QA completion — it is a best-effort enrichment step.

### `pm-story-followup-leader` Trigger Modes

Add `trigger` parameter to distinguish manual vs. auto invocation:

```yaml
# Auto-invocation (from qa-verify-completion-leader):
trigger: auto
behavior: skip confirmation prompts, run silently

# Manual invocation (developer runs /pm-story followup):
trigger: manual
behavior: existing interactive behavior with confirmation
```

### `follow_ups` Table Retirement

Drop the dead `follow_ups` table via migration:

```sql
-- Migration: drop legacy follow_ups table
-- Replaced by: story.follow_up_from field + story_dependencies table
-- All follow-up tracking now in story_dependencies with dependency_type = 'follow_up_from'

DROP TABLE IF EXISTS follow_ups;
```

Add a comment in `story-crud-operations.ts` noting that follow-ups are tracked via `story_dependencies` with `dependency_type = 'follow_up_from'`, not the dropped table.

### Packages Affected

- `.claude/agents/qa-verify-completion-leader.agent.md` — add auto-trigger step after QA PASS
- `.claude/agents/pm-story-followup-leader.agent.md` — add `trigger` parameter for auto/manual modes
- `apps/api/knowledge-base/src/db/migrations/NNN_drop_follow_ups.sql` — retire dead table
- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — comment noting follow-up tracking location

## Acceptance Criteria

- [ ] When a story transitions to `uat` and has QA Discovery Notes with "Follow-up" decisions, `pm-story-followup-leader` runs automatically without developer intervention
- [ ] Follow-up stories appear in the feature backlog within the same workflow run that completes QA
- [ ] If `pm-story-followup-leader` fails, the QA completion signal is still emitted and the workflow continues
- [ ] If the completed story has no "Follow-up" items in QA Discovery Notes, the auto-trigger is skipped silently
- [ ] Manual `/pm-story followup` invocation still works with existing interactive behavior
- [ ] The `follow_ups` DB table is dropped and no code references it
- [ ] Auto-created follow-up stories have `follow_up_from` set to the parent story ID and appear in `story_dependencies`
- [ ] `/next-actions` surfaces the new follow-up stories once the parent story's dependency cascade runs (via WKFL-014)
