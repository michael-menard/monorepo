---
story_id: KNOW-046
title: Intra-Phase Resume Guard via recent_actions Deduplication
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - WKFL-012  # story claiming/locking needed to prevent concurrent resume attempts
  - LNGG-006  # blocked until LangGraph migration completes
---

# KNOW-046: Intra-Phase Resume Guard via recent_actions Deduplication

## Context

The scrum-master workflow uses `STATE.md` for inter-phase recovery — when a workflow is interrupted between phases, the loop leader reads `resume_from` and skips completed phases. This works well.

The gap is **intra-phase recovery**. When the implementation leader is interrupted mid-phase:

1. It spawns backend worker (runs to completion, writes files + KB entries)
2. Network drops — frontend worker never starts
3. Developer resumes: `/scrum-master FEATURE STORY --from=3`
4. The implementation phase re-runs from the top — **backend worker is spawned again**

The backend worker re-writes the same code, re-calls `kb_add_constraint`, re-creates `kb_add_task` entries. The developer sees duplicate KB entries, potentially conflicting code edits, and a confusing phase log.

The `work_state.recent_actions` field already captures a chronological list of completed actions with `completed: boolean` and `timestamp`. The data needed for deduplication exists. What's missing:

- **No agent reads `recent_actions` before spawning workers** to check what already ran
- **No idempotency key** on `kb_add_lesson`, `kb_add_constraint`, etc. — re-calling them creates duplicates
- **No per-worker completion flag** in `work_state` — only the phase-level `STATUS` is tracked

This surfaces in practice whenever a long implementation phase (~60-90 min) is interrupted. The developer must manually inspect worktree files, identify what was done, and carefully re-run only the missing workers — a fragile, undocumented recovery procedure.

## Goal

Add a `completed_workers` tracking field to `work_state` so that phase leaders can skip already-completed workers on re-run. Update `kb_update_work_state` to support registering worker completions, and add a guard pattern to implementation and review leader agents.

## Non-goals

- Full transactional rollback of partial phase work (too complex, not worth it)
- Deduplicating KB entries retroactively (prevent new duplicates, don't fix existing ones)
- Intra-worker checkpointing (resuming inside a single coder worker mid-function)

## Scope

### `work_state` Schema Extension

Add `completed_workers` JSONB column to the `work_state` table:

```sql
ALTER TABLE work_state
  ADD COLUMN IF NOT EXISTS completed_workers JSONB DEFAULT '[]'::jsonb;
-- e.g. [{"worker": "backend", "phase": "implementation", "completed_at": "..."}]
```

Extend `KbUpdateWorkStateInputSchema`:

```typescript
const WorkerCompletionSchema = z.object({
  worker: z.string(),         // "backend", "frontend", "playwright", "security-review", etc.
  phase: z.string(),          // "implementation", "review", etc.
  completed_at: z.string().datetime(),
  artifact: z.string().optional(),  // e.g. "BACKEND-LOG.md"
})

// Add to KbUpdateWorkStateInputSchema:
add_completed_worker: WorkerCompletionSchema.optional(),
```

The upsert logic appends to the array (deduplicates by `worker + phase`):

```typescript
if (input.add_completed_worker) {
  const existing = current.completed_workers ?? []
  const key = `${input.add_completed_worker.worker}:${input.add_completed_worker.phase}`
  const alreadyDone = existing.some(w => `${w.worker}:${w.phase}` === key)
  if (!alreadyDone) {
    existing.push(input.add_completed_worker)
  }
  updateFields.completed_workers = existing
}
```

### Leader Agent Guard Pattern

Add a "completed workers check" step to `dev-implement-implementation-leader.agent.md` and `dev-code-review-leader.agent.md` at the top of their execution:

```
## Step 0: Check for Partial Completion

Call kb_get_work_state({ story_id: STORY_ID })
Read completed_workers array.

SKIP_BACKEND = completed_workers includes { worker: "backend", phase: "implementation" }
SKIP_FRONTEND = completed_workers includes { worker: "frontend", phase: "implementation" }
SKIP_PLAYWRIGHT = completed_workers includes { worker: "playwright", phase: "implementation" }

Report: "Resume check — completed workers: [backend✓, frontend✗, playwright✗]"
Spawn only incomplete workers.
```

### Worker Completion Registration

After each worker's `TaskOutput` resolves successfully, the leader registers completion:

```
# After backend worker completes with signal BACKEND COMPLETE:
kb_update_work_state({
  story_id: STORY_ID,
  add_completed_worker: {
    worker: "backend",
    phase: "implementation",
    completed_at: "<now>",
    artifact: "BACKEND-LOG.md"
  }
})
```

This write happens **before** spawning the next worker, so interruption between workers is always recoverable.

### Phase Reset on Phase Transition

When a phase completes successfully and the workflow advances, clear `completed_workers` for the finished phase:

```typescript
// In cascadeDependencyResolution or kb_update_work_state when phase changes:
if (previousPhase !== currentPhase) {
  // Clear workers from the now-finished phase (keep other phases)
  updateFields.completed_workers = existingWorkers.filter(
    w => w.phase !== previousPhase
  )
}
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/NNN_add_completed_workers.sql` — schema migration
- `apps/api/knowledge-base/src/crud-operations/work-state-operations.ts` — dedup append logic
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — extend input schema
- `.claude/agents/dev-implement-implementation-leader.agent.md` — Step 0 guard
- `.claude/agents/dev-code-review-leader.agent.md` — Step 0 guard for review workers

## Acceptance Criteria

- [ ] `work_state.completed_workers` column exists with `[]` default
- [ ] `kb_update_work_state` with `add_completed_worker` appends to array, deduplicated by `worker+phase`
- [ ] `dev-implement-implementation-leader` reads `completed_workers` at start and skips already-complete workers
- [ ] After each worker task resolves successfully, the leader writes a `completed_workers` entry before spawning the next worker
- [ ] Interrupting after backend but before frontend, then resuming, skips the backend worker — only frontend runs
- [ ] When a phase advances, `completed_workers` entries for the previous phase are cleared
- [ ] `kb_get_work_state` response includes `completed_workers` in the returned object
- [ ] Phase-level STATUS in `STATE.md` remains the authoritative gate for skipping entire phases — `completed_workers` only guards within a phase
