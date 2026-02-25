# Thread ID Convention for APIP Worker Graphs

**Date:** 2026-02-25
**Story:** APIP-5007
**AC:** AC-4

---

## Overview

LangGraph worker graphs (elaboration, implementation, review, QA, merge) use a thread ID to namespace their checkpoint state in PostgreSQL. A consistent, human-readable thread ID format allows operators to:

- Query checkpoint state for a specific story and stage
- Resume interrupted graphs from the correct checkpoint
- Debug failed runs by correlating logs to checkpoint records

---

## Thread ID Format

```
{story_id}:{stage}:{attempt_number}
```

### Components

| Component | Description | Example values |
|-----------|-------------|----------------|
| `story_id` | The unique story identifier from the APIP backlog | `APIP-0010`, `WISH-2030`, `KBAR-0150` |
| `stage` | The pipeline stage/graph type executing this work | `elab`, `impl`, `review`, `qa`, `merge` |
| `attempt_number` | 1-based integer, incremented on each retry or re-run | `1`, `2`, `3` |

### Canonical Stage Names

| Stage key | Graph | Notes |
|-----------|-------|-------|
| `elab` | Elaboration graph | AC elaboration and story enrichment |
| `impl` | Implementation graph | Code generation and file writes |
| `review` | Review graph | Code review and feedback |
| `qa` | QA graph | Test execution and quality checks |
| `merge` | Merge graph | PR creation and merge coordination |

---

## Examples

```
APIP-0010:elab:1        # First elaboration attempt for APIP-0010
APIP-0010:elab:2        # Second elaboration attempt (retry after failure)
APIP-0010:impl:1        # First implementation attempt for APIP-0010
WISH-2030:review:1      # First review attempt for WISH-2030
KBAR-0150:qa:3          # Third QA attempt for KBAR-0150
```

---

## Usage in Code

```typescript
// Worker graph invocation
const threadId = `${storyId}:${stage}:${attemptNumber}`

const result = await graph.invoke(input, {
  configurable: {
    thread_id: threadId,
  },
})

// Resume from checkpoint (same thread ID)
const resumed = await graph.invoke(null, {
  configurable: {
    thread_id: threadId,
  },
})
```

---

## Checkpoint Query Patterns

```sql
-- Find all checkpoints for a specific story
SELECT thread_id, checkpoint_id, created_at
FROM public.checkpoints
WHERE thread_id LIKE 'APIP-0010:%'
ORDER BY created_at DESC;

-- Find the latest checkpoint for a specific stage
SELECT thread_id, checkpoint_id, created_at
FROM public.checkpoints
WHERE thread_id = 'APIP-0010:impl:1'
ORDER BY created_at DESC
LIMIT 1;

-- Count retry attempts for a story
SELECT
  split_part(thread_id, ':', 1) AS story_id,
  split_part(thread_id, ':', 2) AS stage,
  COUNT(DISTINCT split_part(thread_id, ':', 3)) AS attempt_count
FROM public.checkpoints
WHERE thread_id LIKE 'APIP-0010:%'
GROUP BY 1, 2;
```

---

## Constraints and Rules

1. **Immutable after creation** — Once a thread ID is assigned to a graph execution, it must not change mid-run. Checkpoints are keyed by thread ID; changing it mid-run orphans existing checkpoints.

2. **Attempt number increments on retry** — When a worker graph fails and is retried (via BullMQ retry mechanism), increment the attempt number. Do NOT reuse the previous attempt's thread ID unless explicitly resuming from checkpoint.

3. **Case-sensitive** — Thread IDs are stored as-is. Use the canonical story ID casing (uppercase prefix + hyphen + number, e.g., `APIP-0010` not `apip-0010`).

4. **No spaces or special characters** — Only alphanumeric characters, hyphens, and colons are allowed. This ensures safe use in log queries and URL paths.

5. **Maximum length** — Thread IDs should stay under 255 characters. Given the format, this is not a practical concern for normal story IDs.

---

## Relationship to ADR-001 Decision 2

ADR-001 Decision 2 specifies that the supervisor is a plain TypeScript loop (not a LangGraph graph). The thread ID convention therefore applies **only to worker graphs**, not to the supervisor process. The supervisor does not have LangGraph checkpoint state.

---

## Relationship to LangGraph Checkpoint Tables

Thread IDs map to rows in `public.checkpoints` (and associated `public.checkpoint_blobs`, `public.checkpoint_writes`). These tables are owned by `@langchain/langgraph-checkpoint-postgres` — see ADR-002 for the delegation decision.
