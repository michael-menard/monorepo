---
story_id: KNOW-022
title: Cross-Story and Date-Range Search Filtering for KB
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-022: Cross-Story and Date-Range Search Filtering for KB

## Context

`kb_search` and `kb_list` currently filter by `role`, `entry_type`, and `tags`. There is no way to scope searches to a specific feature prefix (e.g. "only WISH stories"), a date range (e.g. "lessons from the last 60 days"), or a specific story (e.g. "all artifacts for WISH-2045").

This limits usefulness for:
- Epic-scoped retrospectives (need to find all lessons from WISH stories)
- Recency-weighted planning (find recent decisions, not ones from 6 months ago)
- Story-specific context loading (load all KB entries linked to a specific story)

## Goal

Add `story_prefix`, `story_id`, `created_after`, and `created_before` filter parameters to `kb_search` and `kb_list`, applied as pre-filters before semantic ranking.

## Non-goals

- Full-text date parsing ("last quarter", "this sprint") — ISO date strings only
- Filtering by `updated_at` (only `created_at` in v1)
- Story prefix inference from the query text

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/search/schemas.ts` — add new filter fields to search input schema
- `apps/api/knowledge-base/src/search/semantic.ts` — apply new filters to SQL WHERE clause
- `apps/api/knowledge-base/src/search/keyword.ts` — apply new filters to FTS query
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — expose new params on `kb_search` and `kb_list`
- `apps/api/knowledge-base/src/crud-operations/kb-list.ts` — add filter params to list query

### New Filter Parameters

```typescript
{
  // Existing filters
  role?: KnowledgeRole
  tags?: string[]
  entry_type?: EntryType

  // New filters
  story_id?: string           // Exact match on knowledge_entries.story_id (e.g. 'WISH-2045')
  story_prefix?: string       // LIKE match on story_id prefix (e.g. 'WISH' matches 'WISH-*')
  created_after?: string      // ISO 8601 date string
  created_before?: string     // ISO 8601 date string
}
```

## Acceptance Criteria

### AC1: story_id Filter Returns Only Entries for That Story
**Given** entries exist for WISH-2045 and WISH-2046
**When** `kb_search` is called with `story_id: 'WISH-2045'`
**Then** only entries with `story_id = 'WISH-2045'` are returned

### AC2: story_prefix Filter Returns Entries Across All Stories in Feature
**Given** entries exist for WISH-2045, WISH-2046, and KBAR-001
**When** `kb_search` is called with `story_prefix: 'WISH'`
**Then** only WISH-* entries are returned; KBAR-001 entries are excluded

### AC3: created_after Filter Excludes Older Entries
**Given** entries exist created at various dates
**When** `kb_search` is called with `created_after: '2026-01-01'`
**Then** only entries created on or after 2026-01-01 are returned

### AC4: created_before Filter Excludes Newer Entries
**Given** entries exist created at various dates
**When** `kb_search` is called with `created_before: '2026-01-01'`
**Then** only entries created before 2026-01-01 are returned

### AC5: Filters Combine Correctly
**Given** multiple filters are specified
**When** `kb_search` runs
**Then** all filters are applied as AND conditions (intersection, not union)

### AC6: kb_list Supports the Same New Filters
**Given** the new filter params
**When** `kb_list` is called with any combination
**Then** it applies the same filtering logic as `kb_search`

### AC7: Invalid Date Strings are Rejected
**Given** `created_after: 'not-a-date'` is passed
**When** the tool validates input
**Then** a validation error is returned before any DB query

## Reuse Plan

- Existing Zod schema validation pattern in search input
- Existing SQL WHERE clause construction in `semantic.ts` and `keyword.ts`
- `story_id` column already exists and is indexed on `knowledge_entries`

## Test Plan

- Unit test: story_id filter returns correct subset
- Unit test: story_prefix LIKE query matches all WISH-* entries
- Unit test: created_after/before filters applied correctly
- Unit test: combined filters use AND logic
- Unit test: invalid date string returns validation error
- Integration test: filters work end-to-end through kb_search MCP tool

## Risks

- **story_prefix LIKE performance**: LIKE 'WISH%' on `story_id` (TEXT column) is efficiently supported by the existing `knowledge_entries_story_id_idx` index. No full-table scan.
