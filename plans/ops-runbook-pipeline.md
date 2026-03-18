# Pipeline Ops Runbook

> AUDIT-7 — Operational Visibility Baseline
> Last updated: 2026-03-16

This runbook answers "what's running, what's blocked, what's failed" without manual DB reconstruction.

---

## 1. Check Pipeline Status (Quick View)

### Dashboard (preferred)

Navigate to the Pipeline Monitor dashboard at `/monitor`. It shows:

- **Pipeline Kanban** — 5 columns: Ready → In Progress → In Review → Ready for QA → In QA
- **Needs Attention** — failed_code_review, failed_qa, blocked stories requiring action
- **Cost Panel** — token usage per story/phase
- **Blocked Queue** — stories in `blocked` state
- Auto-refreshes every 30 seconds.

### Via KB MCP Tool (CLI/agents)

```typescript
// Query 1 — Pipeline Kanban: stories in active pipeline states
mcp__knowledge -
  base__kb_list_stories({
    states: ['ready', 'in_progress', 'ready_for_review', 'in_review', 'ready_for_qa', 'in_qa'],
    limit: 100,
  })
// Returns: story_id, title, feature, state, priority, blockedByStory, updatedAt
// Note: "needs_code_review" is a ghost state that maps to "in_review" in the KB API

// Query 2 — Blocked stories (state=blocked OR blockedByStory set)
mcp__knowledge -
  base__kb_list_stories({
    blocked: true,
    limit: 50,
  })
// Returns: story_id, title, state, blockedReason, blockedByStory

// Query 3 — Stories requiring human attention (failed states)
mcp__knowledge -
  base__kb_list_stories({
    states: ['failed_code_review', 'failed_qa'],
    limit: 50,
  })
// Returns: story_id, title, state, priority, updatedAt
// Note: add blocked query above to get full "needs attention" list

// Query 4 — Scheduler readiness (truly dispatchable stories)
mcp__knowledge -
  base__kb_list_stories({
    state: 'ready',
    blocked: false,
    limit: 50,
  })
// Returns ready + unblocked stories. For full dependency check, use SQL below.
```

### Via Direct SQL (read-only, for deeper inspection)

```sql
-- Pipeline Kanban: active stories grouped by state
SELECT s.story_id, s.title, s.feature, s.state, s.priority,
       sd.blocked_reason, s.updated_at
FROM workflow.stories s
LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
WHERE s.state IN (
  'ready', 'in_progress', 'needs_code_review',
  'in_review', 'ready_for_review', 'ready_for_qa', 'in_qa'
)
ORDER BY
  CASE s.state
    WHEN 'in_progress' THEN 1
    WHEN 'needs_code_review' THEN 2 WHEN 'in_review' THEN 2 WHEN 'ready_for_review' THEN 2
    WHEN 'ready_for_qa' THEN 3 WHEN 'in_qa' THEN 3
    WHEN 'ready' THEN 4 ELSE 5
  END,
  CASE s.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
  s.updated_at DESC;

-- Blocked stories (with how long blocked)
SELECT s.story_id, s.title, sd.blocked_reason, sd.blocked_by_story,
       NOW() - s.updated_at AS how_long_stuck
FROM workflow.stories s
LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
WHERE s.state = 'blocked'
ORDER BY how_long_stuck DESC;

-- Needs attention: failed + blocked
SELECT s.story_id, s.title, s.state, s.priority, sd.blocked_reason, s.updated_at
FROM workflow.stories s
LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
WHERE s.state IN ('failed_code_review', 'failed_qa', 'blocked')
ORDER BY
  CASE s.state WHEN 'failed_qa' THEN 1 WHEN 'failed_code_review' THEN 2 WHEN 'blocked' THEN 3 END,
  CASE s.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END;

-- Truly dispatchable: ready + all deps completed
SELECT s.story_id, s.title, s.priority
FROM workflow.stories s
WHERE s.state = 'ready'
  AND NOT EXISTS (
    SELECT 1
    FROM workflow.story_dependencies sd
    JOIN workflow.stories dep ON dep.story_id = sd.depends_on_id
    WHERE sd.story_id = s.story_id
      AND dep.state != 'completed'
  )
ORDER BY
  CASE s.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END;
```

---

## 2. Identify Why a Story Is Stuck

### Step-by-step investigation

```typescript
// 1. Get story details from KB
mcp__knowledge - base__kb_get_story({ storyId: 'STORY-ID' })
// Check: state, blockedReason, blockedByStory, startedAt, updatedAt

// 2. Check story state history (SQL)
// SELECT from_state, to_state, created_at FROM workflow.story_state_history
// WHERE story_id = 'STORY-ID' ORDER BY created_at DESC LIMIT 20;

// 3. Check artifacts
mcp__knowledge - base__kb_list_artifacts({ storyId: 'STORY-ID' })

// 4. Check KB entries for this story
mcp__knowledge - base__kb_list({ storyId: 'STORY-ID', limit: 20 })
```

### Common stuck patterns

| Symptom                                     | Likely Cause                            | Fix                                                                   |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| State: `ready` for > 24h                    | Scheduler not dispatching               | Check BullMQ queue; confirm `blocked: false` and deps all `completed` |
| State: `in_progress` for > 2h               | LangGraph graph hung or never triggered | Check orchestrator logs; re-queue if needed                           |
| State: `failed_code_review`                 | TypeScript/lint errors in PR            | Dev must fix and re-push; advance to `in_progress`                    |
| State: `failed_qa`                          | QA test failures                        | Dev must investigate test output; advance to `in_progress`            |
| State: `blocked`                            | Dependency not resolved                 | Resolve `blockedReason`; advance to `ready` manually                  |
| State: ghost (`uat`, `ready_to_work`, etc.) | Pre-migration story                     | Run migration 1001 or manually update state                           |

---

## 3. Manually Advance a Stuck Story

### Via KB MCP Tool

```typescript
// Advance state directly (bypass trigger — use carefully)
mcp__knowledge -
  base__kb_update_story_status({
    storyId: 'STORY-ID',
    state: 'ready', // or in_progress, failed_code_review, etc.
  })
```

### Via SQL (direct DB access)

```sql
-- Unblock a story and move back to ready
UPDATE workflow.stories
SET state = 'ready', updated_at = NOW()
WHERE story_id = 'STORY-ID'
  AND state = 'blocked';

-- Reset a failed story to in_progress for retry
UPDATE workflow.stories
SET state = 'in_progress', updated_at = NOW()
WHERE story_id = 'STORY-ID'
  AND state IN ('failed_code_review', 'failed_qa');
```

> **Warning**: Direct SQL bypasses the state transition trigger. Use only when the trigger itself is broken. Prefer the KB MCP tool which goes through the API.

---

## 4. Check the BullMQ Queue

BullMQ dashboard is not yet exposed via a web UI. Use the CLI or DB-level inspection.

### Check queue depth (SQL via pipeline DB)

```sql
-- LangGraph checkpoint counts (proxy for queue activity)
SELECT COUNT(*) FROM checkpoints;

-- Recent checkpoint threads
SELECT thread_id, checkpoint_ns, created_at
FROM checkpoints
ORDER BY created_at DESC
LIMIT 20;
```

### Check orchestrator dispatch status

The BullMQ scheduler (`pipeline/scheduler.ts`) has not been wired to auto-trigger yet (AUDIT-4 progress). To manually trigger a story run:

1. Ensure story is in `ready` state and not blocked
2. The scheduler polls `ready` stories and enqueues them to BullMQ
3. Check `packages/backend/orchestrator/src/pipeline/` for the scheduler entry point

### Current known issue

**LangGraph has never run end-to-end.** The 23 graphs and BullMQ supervisor are built but not yet triggered. First proof-of-life target: ORCH-2010 through ORCH-4020.

---

## 5. KB Query Summary for AUDIT-7

| Query                      | KB Tool                                                                               | Result                                      |
| -------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Pipeline Kanban (5 states) | `kb_list_stories` with `states: [ready, in_progress, in_review, ready_for_qa, in_qa]` | Active stories by state                     |
| Blocked stories            | `kb_list_stories` with `blocked: true`                                                | Stories with blockedBy set or state=blocked |
| Failed + needs attention   | `kb_list_stories` with `states: [failed_code_review, failed_qa]`                      | Stories requiring human action              |
| Truly dispatchable         | `kb_list_stories` with `state: ready, blocked: false` + SQL dep check                 | Stories safe to enqueue                     |

> **Note**: The KB API does not recognize the `needs_code_review` state (ghost state). Stories in that DB state appear in SQL but not in KB API results. Use `in_review` as the canonical equivalent when using KB MCP tools.

---

## 6. Useful Shortcuts

```bash
# Type-check after changes
pnpm check-types

# Run dashboard tests
pnpm --filter app-dashboard test

# Start local dev (API + frontend)
pnpm dev
```
