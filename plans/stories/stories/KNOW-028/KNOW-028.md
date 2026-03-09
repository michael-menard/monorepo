---
story_id: KNOW-028
title: Confidence-Weighted KB Lesson Retrieval
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-026  # confidence field on knowledge_entries populated by lesson extraction
---

# KNOW-028: Confidence-Weighted KB Lesson Retrieval

## Context

`kb_search` currently ranks results by embedding cosine similarity only. A lesson extracted from a single story failure ranks equally with a pattern that has recurred across 10 stories — the KB has no way to surface higher-confidence knowledge preferentially.

As KNOW-026 populates `knowledge_entries` with auto-extracted lessons (each tagged with a `confidence` of `low`, `medium`, or `high`), retrieval quality will degrade without a way to weight results by confidence. A `low`-confidence lesson from one story should not outrank a `high`-confidence pattern just because its embedding is marginally closer to the query.

Additionally, `elab-analyst` currently hits the full KB on some queries (no `entry_type` or tag filter), meaning findings, ADRs, and tasks can surface alongside lessons in results intended for lesson retrieval.

## Goal

Update `kb_search` to support a `confidence_weight` option that boosts higher-confidence entries in the ranking, and enforce `entry_type: 'lesson'` filtering at call sites that specifically want lessons.

## Non-goals

- Changing the underlying embedding model or similarity algorithm
- Building a full learning-to-rank system (simple score blending only)
- Retroactively recomputing embeddings

## Scope

### Score Blending

Current ranking: `score = cosine_similarity`

New ranking when `confidence_weight > 0`:
```
score = cosine_similarity * (1 - confidence_weight) + confidence_score * confidence_weight
```

Where `confidence_score` maps:
- `high` → 1.0
- `medium` → 0.6
- `low` → 0.2
- `null` (no confidence field) → 0.4

Default `confidence_weight: 0` preserves current behavior — fully backwards compatible.

### `kb_search` Schema Change

```typescript
kb_search({
  query: string,
  role?: string,
  tags?: string[],
  entry_type?: EntryType | EntryType[],   // NEW — filter to one or more entry types
  confidence_weight?: number,              // NEW — 0.0-1.0, default 0
  min_confidence?: 'low' | 'medium' | 'high',  // NEW — exclude below threshold
  limit?: number,
})
```

### Agent Call Site Updates

Update the following agents to use `entry_type: 'lesson'` and `confidence_weight: 0.4` for lesson-specific queries:

- `elab-analyst.agent.md` — lesson and gap queries
- `dev-implement-planning-leader.agent.md` — lessons learned query

### Confidence Escalation Job (follow-up)

A future story will scan `knowledge_entries` for lessons that appear across multiple stories (via `source_story_id` cross-reference) and upgrade their `confidence`. This story only ensures the retrieval layer respects confidence once it exists.

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — extend `kb_search` schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement blended scoring
- `apps/api/knowledge-base/src/crud-operations/search-operations.ts` — score blending logic
- `.claude/agents/elab-analyst.agent.md` — add `entry_type` and `confidence_weight`
- `.claude/agents/dev-implement-planning-leader.agent.md` — add `entry_type` and `confidence_weight`

## Acceptance Criteria

- [ ] `kb_search` accepts `entry_type`, `confidence_weight`, and `min_confidence` parameters
- [ ] When `confidence_weight > 0`, results are reranked using the blended score formula
- [ ] When `confidence_weight: 0` (default), behavior is identical to current — no regression
- [ ] `entry_type` filter excludes non-matching entry types from results
- [ ] `min_confidence: 'medium'` excludes all `low` and null-confidence entries
- [ ] `elab-analyst` lesson queries use `entry_type: 'lesson'` and `confidence_weight: 0.4`
- [ ] `dev-implement-planning-leader` lesson queries use `entry_type: 'lesson'` and `confidence_weight: 0.4`
- [ ] Unit tests cover score blending with all confidence levels and edge cases (null confidence, weight=0, weight=1)
