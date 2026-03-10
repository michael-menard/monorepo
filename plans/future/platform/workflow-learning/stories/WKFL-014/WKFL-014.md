---
story_id: WKFL-014
title: Write-Time Dependency Cascade on Story Completion
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: critical
---

# WKFL-014: Write-Time Dependency Cascade on Story Completion

## Context

Story dependencies are modelled as a directed graph in `story_dependencies`. The `/next-actions` work queue uses `kb_get_next_story` which correctly traverses this graph at query time — checking if target stories have `state='completed'` to determine unblocked candidates.

However, three fields that *should* reflect resolved dependency state are never being written:

1. **`story_dependencies.satisfied`** — always `false`, even when the dependency target has been `completed` for months. Every queue query re-traverses the full unsatisfied dependency list from scratch.
2. **`stories.blocked`** — never cleared when blocking dependencies resolve. Stories stay `blocked=true` in the DB after their blockers complete, making them invisible to queries that filter on `blocked=false`.
3. **`stories.blocked_by_story`** — single-story blocker reference, not cleared on resolution.

The result: the dependency graph is structurally correct but its materialized state is always stale. Downstream stories don't become visible in the work queue until `kb_get_next_story` happens to re-check — and developers relying on `blocked=false` filters see an inaccurate picture.

The user's mental model is correct: **story completion should trigger a graph traversal forward from that node**, marking resolved dependencies and unblocking the next hop.

## Goal

When `kb_update_story_status` transitions a story to a terminal state (`completed`, `uat`), automatically:
1. Mark all `story_dependencies` rows where `target_story_id = this story` as `satisfied = true`
2. For each story that now has ALL dependencies satisfied, clear `blocked = false` and `blocked_by_story = null`
3. Surface newly-unblocked stories in the next `/next-actions` call without requiring any manual intervention

## Non-goals

- Multi-hop cascade (only walk one hop forward — the next `/next-actions` call handles further hops)
- Modifying the query-time traversal in `kb_get_next_story` (keep as a safety net)
- Dependency resolution for non-terminal status transitions (only `completed` and `uat` trigger cascade)
- Migrating or reconciling the WINT schema `story_dependencies` table (KB schema only)

## Scope

### `kb_update_story_status` Extension

Add a post-update cascade step to `story-crud-operations.ts`:

```typescript
// After updating story state to 'completed' or 'uat':
if (newState === 'completed' || newState === 'uat') {
  await cascadeDependencyResolution(db, storyId)
}
```

### `cascadeDependencyResolution` Function

```typescript
async function cascadeDependencyResolution(db, resolvedStoryId: string) {
  // Step 1: Mark all dependencies on this story as satisfied
  await db
    .update(storyDependencies)
    .set({ satisfied: true })
    .where(
      and(
        eq(storyDependencies.targetStoryId, resolvedStoryId),
        eq(storyDependencies.satisfied, false),
        inArray(storyDependencies.dependencyType, ['depends_on', 'blocked_by'])
      )
    )

  // Step 2: Find stories that had this as their ONLY unsatisfied dependency
  // (now fully unblocked)
  const nowUnblocked = await db
    .select({ storyId: storyDependencies.storyId })
    .from(storyDependencies)
    .where(
      and(
        eq(storyDependencies.targetStoryId, resolvedStoryId),
        eq(storyDependencies.satisfied, true),  // Just set above
        inArray(storyDependencies.dependencyType, ['depends_on', 'blocked_by'])
      )
    )

  for (const { storyId } of nowUnblocked) {
    // Check if this story has any OTHER unsatisfied dependencies
    const remainingBlocks = await db
      .select()
      .from(storyDependencies)
      .where(
        and(
          eq(storyDependencies.storyId, storyId),
          eq(storyDependencies.satisfied, false),
          inArray(storyDependencies.dependencyType, ['depends_on', 'blocked_by'])
        )
      )

    if (remainingBlocks.length === 0) {
      // Fully unblocked — clear blocked flags
      await db
        .update(stories)
        .set({
          blocked: false,
          blockedReason: null,
          blockedByStory: null,
          updatedAt: new Date()
        })
        .where(eq(stories.storyId, storyId))

      // Emit workflow event for observability
      await emitWorkflowEvent({
        eventType: 'item_state_changed',
        storyId,
        source: 'dependency-cascade',
        metadata: { unblocked_by: resolvedStoryId }
      })
    }
  }
}
```

### Backfill Migration

A one-time migration that resolves the current stale state:

```sql
-- Mark satisfied for all dependencies where target is completed/uat
UPDATE story_dependencies sd
SET satisfied = true
FROM stories s
WHERE sd.target_story_id = s.story_id
  AND sd.satisfied = false
  AND s.state IN ('completed', 'uat')
  AND sd.dependency_type IN ('depends_on', 'blocked_by');

-- Clear blocked flag for stories with no remaining unsatisfied deps
UPDATE stories s
SET blocked = false, blocked_reason = null, blocked_by_story = null
WHERE s.blocked = true
  AND NOT EXISTS (
    SELECT 1 FROM story_dependencies sd
    WHERE sd.story_id = s.story_id
      AND sd.satisfied = false
      AND sd.dependency_type IN ('depends_on', 'blocked_by')
  );
```

### `/next-actions` Optimization

Now that `satisfied` is kept current, update `kb_get_next_story` to filter on `satisfied=false` directly rather than re-checking target story state at query time. This reduces the query from O(candidates × dependencies) to a single indexed filter.

### `workflow_events` Integration

Emit a `item_state_changed` event when a story is automatically unblocked. This gives observability into when the cascade fired and what it unblocked — useful for debugging and for the retro.

### Packages Affected

- `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` — add cascade to `kb_update_story_status`
- `apps/api/knowledge-base/src/db/migrations/` — backfill migration
- `apps/api/knowledge-base/src/crud-operations/dependency-operations.ts` — new file for `cascadeDependencyResolution`
- `packages/backend/db/src/workflow-events.ts` — emit unblock events

## Acceptance Criteria

- [ ] When a story transitions to `completed` or `uat`, all `story_dependencies` rows with `target_story_id = that story` are immediately set to `satisfied = true`
- [ ] Stories that have zero remaining unsatisfied dependencies are immediately set to `blocked = false`
- [ ] The backfill migration correctly resolves all stale satisfied/blocked state for existing completed stories
- [ ] `/next-actions` returns newly-unblocked stories immediately after their blocker completes — no manual step required
- [ ] Stories with partial dependency resolution (some deps satisfied, some not) remain `blocked = true`
- [ ] A `workflow_events` row is emitted for each story automatically unblocked by the cascade
- [ ] The cascade does not trigger for non-terminal status transitions (e.g. `in_progress`, `ready_for_qa`)
- [ ] `kb_get_next_story` query performance improves by filtering on `satisfied=false` directly
- [ ] Cascade runs inside the same transaction as the status update — either both commit or both roll back
