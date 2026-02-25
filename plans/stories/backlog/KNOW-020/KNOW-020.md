---
story_id: KNOW-020
title: Add retro as First-Class entry_type in Knowledge Base
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-020: Add `retro` as First-Class entry_type in Knowledge Base

## Context

Retrospective patterns written by `workflow-retro` currently land in `knowledge_entries` with `entry_type = 'lesson'` and tags like `retro`, `pattern`, `source:workflow-retro`. This conflates two distinct knowledge types:

- **Lessons** are individual, story-scoped insights (e.g. "reuse the auth middleware next time")
- **Retro patterns** are cross-story statistical observations (e.g. "integration stories exceed token budget by 30% across 5 stories")

Mixing them degrades search quality — a search for lessons returns retro patterns and vice versa. They also have different useful lifespans, audiences, and update semantics.

## Goal

Add `retro` as a first-class `entry_type` value, update the `workflow-retro` agent to use it, add a `kb_add_retro` typed entry tool, and update search/filter tooling to support the new type.

## Non-goals

- Migrating existing retro-tagged lesson entries automatically (too risky without knowing which are truly retro patterns vs lessons; document as a manual cleanup task)
- A dedicated `retros` table (keeping it in `knowledge_entries` is intentional — the bucket architecture should stay flat)

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — new migration adding `retro` to entry_type check constraint
- `apps/api/knowledge-base/src/__types__/index.ts` — add `retro` to `KnowledgeEntryTypeSchema` enum
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_add_retro` tool
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement `kb_add_retro` handler
- `apps/api/knowledge-base/src/mcp-server/access-control.ts` — add `kb_add_retro` to access matrix
- `.claude/agents/workflow-retro.agent.md` — update `kb_add_lesson` calls to `kb_add_retro`

### New entry_type value

```sql
ALTER TYPE ... -- or update check constraint to include 'retro'
-- entry_type IN ('note', 'decision', 'constraint', 'runbook', 'lesson', 'retro')
```

### New Tool: kb_add_retro

```typescript
{
  title: string              // e.g. "Pattern: Integration stories exceed token budget by 30%"
  story_ids: string[]        // Stories that evidence this pattern
  pattern_type: string       // token_budget | review_cycle | agent_correlation | ac_failure | other
  observation: string        // What was observed across stories
  recommendation: string     // Actionable improvement
  significance: 'high' | 'medium' | 'low'
  tags?: string[]
}
```

## Acceptance Criteria

### AC1: retro is a Valid entry_type
**Given** `kb_add` is called with `entry_type: 'retro'`
**When** the entry is saved
**Then** it is accepted without validation error

### AC2: kb_add_retro Tool Exists and Works
**Given** the `kb_add_retro` tool is called with valid inputs
**When** it executes
**Then** a `knowledge_entries` row is created with `entry_type = 'retro'` and the observation/recommendation formatted as content

### AC3: kb_search Can Filter by entry_type retro
**Given** both lesson and retro entries exist
**When** `kb_search` is called with `entry_type: 'retro'`
**Then** only retro entries are returned

### AC4: Lessons are Not Returned When Filtering for Retro
**Given** a lesson entry tagged with `retro`
**When** `kb_search` is called with `entry_type: 'retro'`
**Then** the lesson entry is NOT returned (type takes precedence over tags)

### AC5: workflow-retro Agent Uses kb_add_retro
**Given** the workflow-retro agent detects a cross-story pattern meeting threshold
**When** it writes to the KB
**Then** it calls `kb_add_retro` instead of `kb_add_lesson`

## Reuse Plan

- Existing typed entry tools (`kb_add_decision`, `kb_add_lesson`) as pattern for `kb_add_retro`
- Existing entry_type filter in `kb_search` already handles new types automatically once enum is updated

## Test Plan

- Unit test: kb_add with `entry_type: 'retro'` succeeds
- Unit test: kb_add_retro produces correct entry content and tags
- Unit test: kb_search `entry_type: 'retro'` filter excludes lessons
- Agent integration: workflow-retro uses kb_add_retro in its KB write step

## Risks

- **Migration of existing retro-tagged lessons**: Existing entries with `entry_type = 'lesson'` and `tags includes retro` will not be automatically reclassified. Document this as known technical debt and optionally provide a one-time migration script in the PR.
