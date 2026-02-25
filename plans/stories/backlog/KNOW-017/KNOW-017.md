---
story_id: KNOW-017
title: Complete Parent/Sibling Entry Relationships in kb_get_related
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-017: Complete Parent/Sibling Entry Relationships in kb_get_related

## Context

`kb_get_related` currently only implements `tag_overlap` (entries sharing 2+ tags). The `parent` and `sibling` relationship types are stubbed with comments saying they are "forward-compatible when parent_id column added." This limits the KB to flat, tag-based discovery — there's no way to model hierarchical knowledge (e.g. "this constraint derives from that ADR" or "find all lessons from this epic").

## Goal

Add a `parent_id` column to `knowledge_entries`, implement `parent` and `sibling` relationship queries in `kb_get_related`, and expose a way to set parent relationships when adding or updating entries.

## Non-goals

- Multi-level hierarchy beyond parent → children (no grandparent traversal in v1)
- Graph visualization
- Automatic parent inference from tags

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — new migration adding `parent_id` column
- `apps/api/knowledge-base/src/db/schema.ts` — add `parent_id` to `knowledge_entries` table definition
- `apps/api/knowledge-base/src/search/kb-get-related.ts` — implement parent and sibling queries
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `parent_id` param to `kb_add` and `kb_update`
- `apps/api/knowledge-base/src/crud-operations/kb-add.ts` / `kb-update.ts` — persist parent_id

### Schema Change

```sql
ALTER TABLE knowledge_entries ADD COLUMN parent_id UUID REFERENCES knowledge_entries(id) ON DELETE SET NULL;
CREATE INDEX knowledge_entries_parent_id_idx ON knowledge_entries(parent_id);
```

## Acceptance Criteria

### AC1: parent_id Column Exists and is Settable
**Given** a knowledge entry is created with `parent_id` pointing to an existing entry
**When** `kb_get` retrieves it
**Then** the `parent_id` field is returned

### AC2: kb_get_related Returns Parent Entry
**Given** an entry has a `parent_id` set
**When** `kb_get_related` is called with `relationship_type: 'parent'`
**Then** the parent entry is returned

### AC3: kb_get_related Returns Sibling Entries
**Given** two entries share the same `parent_id`
**When** `kb_get_related` is called on one entry with `relationship_type: 'sibling'`
**Then** the other entry is returned (excluding the queried entry itself)

### AC4: Tag Overlap Still Works
**Given** existing tag-overlap behavior
**When** `kb_get_related` is called with `relationship_type: 'tag_overlap'`
**Then** behavior is unchanged from current implementation

### AC5: Null parent_id is Valid
**Given** an entry has no parent_id set
**When** `kb_get_related` is called with `relationship_type: 'parent'`
**Then** an empty result set is returned (no error)

## Reuse Plan

- Existing `kb_get_related` scaffolding — just wire the new queries
- Existing migration pattern from `009_add_stories_tables.sql`

## Test Plan

- Unit test: add entry with parent_id, retrieve via kb_get_related parent
- Unit test: two entries with same parent, retrieve siblings
- Unit test: entry with no parent returns empty for parent relationship
- Migration test: column added without breaking existing entries

## Risks

- **Circular references**: An entry could be set as its own parent. Add a check constraint or application-level guard.
- **Orphaned children**: If parent is deleted, `ON DELETE SET NULL` handles this safely.
