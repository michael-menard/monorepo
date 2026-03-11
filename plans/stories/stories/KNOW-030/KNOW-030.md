---
story_id: KNOW-030
title: PO Approval Queue - Data Model and MCP Tools
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
---

# KNOW-030: PO Approval Queue - Data Model and MCP Tools

## Context

The Product Owner grooming agent (KNOW-031) needs a structured queue where it can stage story recommendations that require human approval before being written to the backlog. Low-scope findings get promoted autonomously; larger architectural or feature changes get placed in this queue for a human to review via the KB UI.

Without a DB-backed queue, pending recommendations exist only in agent output — they're not visible in the UI, not queryable, and not actionable without re-running the agent.

## Goal

Create a `po_approval_queue` table and associated MCP tools so the PO grooming agent can write pending story recommendations to the DB, and the KB UI can read and act on them.

## Non-goals

- The UI itself (separate story)
- The PO agent logic (KNOW-031)
- Automatic story creation from approved items (the approval action triggers story creation via existing `/pm-story` tooling)

## Scope

### DB Schema

```sql
CREATE TABLE po_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Source
  source_entry_id UUID REFERENCES knowledge_entries(id),  -- The KB finding that prompted this
  source_story_id TEXT,                                    -- Story where the finding originated

  -- Recommendation
  proposed_title TEXT NOT NULL,
  proposed_epic TEXT NOT NULL,
  proposed_type TEXT NOT NULL CHECK (proposed_type IN ('feature', 'tech-debt', 'bug', 'spike')),
  proposed_priority TEXT NOT NULL CHECK (proposed_priority IN ('low', 'medium', 'high', 'critical')),
  rationale TEXT NOT NULL,              -- Why the PO agent thinks this is worth doing
  estimated_effort TEXT CHECK (estimated_effort IN ('low', 'medium', 'high')),
  estimated_impact TEXT CHECK (estimated_impact IN ('low', 'medium', 'high')),

  -- Autonomy decision
  autonomy_tier TEXT NOT NULL CHECK (autonomy_tier IN ('autonomous', 'approval-required')),
  tier_reason TEXT NOT NULL,            -- Why this tier was assigned

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'auto-created')),
  reviewed_at TIMESTAMPTZ,
  reviewer_note TEXT,

  -- Output
  created_story_id TEXT                 -- Set when story is created from this recommendation
);

CREATE INDEX ON po_approval_queue (status);
CREATE INDEX ON po_approval_queue (source_entry_id);
CREATE INDEX ON po_approval_queue (created_at DESC);
```

### MCP Tools

**`kb_po_queue_add`** — PO agent writes a recommendation:
```typescript
{
  source_entry_id?: string
  source_story_id?: string
  proposed_title: string
  proposed_epic: string
  proposed_type: 'feature' | 'tech-debt' | 'bug' | 'spike'
  proposed_priority: 'low' | 'medium' | 'high' | 'critical'
  rationale: string
  estimated_effort: 'low' | 'medium' | 'high'
  estimated_impact: 'low' | 'medium' | 'high'
  autonomy_tier: 'autonomous' | 'approval-required'
  tier_reason: string
}
```

**`kb_po_queue_list`** — UI reads pending items:
```typescript
{
  status?: 'pending' | 'approved' | 'rejected' | 'auto-created'
  autonomy_tier?: 'autonomous' | 'approval-required'
  limit?: number
  offset?: number
}
```

**`kb_po_queue_update`** — UI approves or rejects:
```typescript
{
  id: string
  status: 'approved' | 'rejected'
  reviewer_note?: string
}
```

**`kb_po_queue_mark_created`** — PO agent marks auto-created items:
```typescript
{
  id: string
  created_story_id: string
}
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — new table migration
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 4 new tools
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handlers
- `apps/api/knowledge-base/src/crud-operations/po-queue-operations.ts` — new file

## Acceptance Criteria

- [ ] `po_approval_queue` table exists with all specified columns and constraints
- [ ] `kb_po_queue_add` writes a recommendation and returns the new row ID
- [ ] `kb_po_queue_list` returns pending items filtered by status and tier
- [ ] `kb_po_queue_update` transitions status to `approved` or `rejected` and sets `reviewed_at`
- [ ] `kb_po_queue_mark_created` sets `created_story_id` and status to `auto-created`
- [ ] Status constraint prevents invalid transitions
- [ ] Indexes support efficient UI queries by status and recency
- [ ] All tools return structured responses suitable for UI consumption
