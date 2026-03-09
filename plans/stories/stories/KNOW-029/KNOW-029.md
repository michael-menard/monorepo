---
story_id: KNOW-029
title: KB Retrieval Feedback Signal
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - KNOW-028  # retrieval must be instrumented before feedback can influence ranking
---

# KNOW-029: KB Retrieval Feedback Signal

## Context

When an agent calls `kb_search` and receives lessons, there is currently no signal back to the KB about whether those lessons were useful. An agent may retrieve 5 lessons, use 1, and silently ignore the other 4 — but the KB has no way to know. Over time, consistently-retrieved-but-ignored lessons continue to surface in results, adding noise without value.

There are two meaningful feedback events that agents are already positioned to emit:

1. **Cited** — the agent explicitly referenced a KB entry in its output (e.g. in `gaps[].note` as "Per KB entry {id}: ...")
2. **Applied** — the agent acted on a lesson (e.g. added an AC, flagged a risk, or changed a recommendation based on it)

Capturing these signals enables the KB to demote lessons that are consistently retrieved but never cited, and promote lessons that agents consistently find actionable.

## Goal

Add a lightweight `kb_record_retrieval_feedback` MCP tool that agents call after acting on (or ignoring) retrieved lessons, and use this signal to adjust retrieval ranking over time via a `retrieval_score` field on `knowledge_entries`.

## Non-goals

- Building a full recommendation system
- Requiring agents to evaluate every retrieved entry (feedback is optional and best-effort)
- Penalizing entries that are correctly retrieved but not applicable to the current story (false negatives are hard to detect)

## Scope

### DB Schema Change

Add to `knowledge_entries`:

```sql
ALTER TABLE knowledge_entries
  ADD COLUMN retrieval_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN citation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN retrieval_score FLOAT GENERATED ALWAYS AS (
    CASE WHEN retrieval_count = 0 THEN 0.5
    ELSE LEAST(1.0, citation_count::float / retrieval_count)
    END
  ) STORED;
```

### New MCP Tool: `kb_record_retrieval_feedback`

```typescript
kb_record_retrieval_feedback({
  entry_ids: string[],   // IDs returned by kb_search
  cited_ids: string[],   // Subset that were cited in output
  story_id?: string,     // For traceability
  agent?: string,        // e.g. 'elab-analyst', 'dev-implement-planning-leader'
})
```

Behavior:
- Increments `retrieval_count` for all `entry_ids`
- Increments `citation_count` for all `cited_ids`
- `retrieval_score` is recomputed automatically via the generated column

### Score Blending Update (extends KNOW-028)

Update the blended score formula from KNOW-028 to incorporate `retrieval_score`:

```
score = cosine_similarity * 0.5
      + confidence_score  * confidence_weight
      + retrieval_score   * retrieval_weight   // NEW
```

With default `retrieval_weight: 0.2`.

### Agent Call Site Updates

Update `elab-analyst` and `dev-implement-planning-leader` to:
1. Record the `entry_ids` returned by `kb_search`
2. After completing their analysis, call `kb_record_retrieval_feedback` with which IDs were cited

The feedback call is fire-and-forget — agents should not block on it or fail if it errors.

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — add columns migration
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_record_retrieval_feedback`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `apps/api/knowledge-base/src/crud-operations/search-operations.ts` — extend score blending
- `.claude/agents/elab-analyst.agent.md` — add feedback call
- `.claude/agents/dev-implement-planning-leader.agent.md` — add feedback call

## Acceptance Criteria

- [ ] `knowledge_entries` has `retrieval_count`, `citation_count`, and `retrieval_score` columns
- [ ] `retrieval_score` is a generated column that recomputes automatically on count updates
- [ ] `kb_record_retrieval_feedback` accepts `entry_ids`, `cited_ids`, `story_id`, and `agent`
- [ ] Calling the tool increments the correct counters without affecting other columns
- [ ] `kb_search` incorporates `retrieval_score` in blended ranking when `retrieval_weight > 0`
- [ ] An entry with `retrieval_count: 20, citation_count: 0` ranks lower than one with `retrieval_count: 5, citation_count: 4` when `retrieval_weight > 0`
- [ ] `elab-analyst` calls `kb_record_retrieval_feedback` after completing analysis
- [ ] The feedback call is non-blocking — agent proceeds even if the tool errors
- [ ] Default behavior (`retrieval_weight: 0`) is identical to KNOW-028 behavior — no regression
