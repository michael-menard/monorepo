---
story_id: KNOW-019
title: KB Compression and Deduplication Tooling
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-019: KB Compression and Deduplication Tooling

## Context

The `knowledge_entries` schema already has `archived`, `canonical_id`, and `is_canonical` columns, and a `kb-compressor` agent type is registered in the system. However, there is no MCP tool to actually trigger compression or deduplication. Over time — particularly as lessons-learned are imported and retro patterns are written — the KB will accumulate near-duplicate entries (the same lesson learned multiple times across stories, slightly differently worded).

Without periodic compression, semantic search quality degrades as duplicate content dilutes the ranking signal.

## Goal

Implement a `kb_compress` MCP tool that identifies near-duplicate entries using embedding similarity, marks duplicates as archived, and links them to a canonical entry. Include a dry-run mode that reports what would be compressed without making changes.

## Non-goals

- Automatic scheduled compression (manual trigger only in v1)
- Merging content from multiple entries into a single canonical entry (just archive duplicates, don't merge)
- Compressing entries of different `entry_type` (only compress within the same type)

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_compress` tool schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `apps/api/knowledge-base/src/crud-operations/compression-operations.ts` — new file
- `apps/api/knowledge-base/src/mcp-server/access-control.ts` — admin-only tool

### Algorithm

1. For each `entry_type`, fetch all non-archived entries with embeddings
2. For each pair, compute cosine similarity using stored vectors (no new API calls)
3. If similarity ≥ threshold (default: 0.92), mark the newer entry as a duplicate of the older
4. Set `archived = true`, `canonical_id = <older entry id>`, `is_canonical = false` on duplicates
5. Set `is_canonical = true` on the surviving entry

### Tool Inputs

```typescript
{
  entry_type?: EntryType        // Limit to one type (default: all types)
  similarity_threshold?: number  // 0.0-1.0, default 0.92
  dry_run?: boolean             // Report only, no mutations (default: false)
  limit?: number                // Max entries to process (default: 500)
}
```

## Acceptance Criteria

### AC1: Dry Run Reports Duplicates Without Mutations
**Given** two near-duplicate entries exist (similarity ≥ threshold)
**When** `kb_compress` is called with `dry_run: true`
**Then** the response lists the duplicate pairs and their similarity scores
**And** no entries are archived or modified

### AC2: Compression Archives Duplicates
**Given** two near-duplicate entries exist
**When** `kb_compress` is called with `dry_run: false`
**Then** the newer entry has `archived = true` and `canonical_id` pointing to the older entry
**And** the older entry has `is_canonical = true`
**And** the archived entry no longer appears in `kb_search` results

### AC3: Non-Duplicates Are Preserved
**Given** two entries with similarity below threshold
**When** `kb_compress` runs
**Then** neither entry is archived

### AC4: Compression is Scoped by Entry Type
**Given** `entry_type: 'lesson'` is specified
**When** `kb_compress` runs
**Then** only lesson entries are evaluated; decisions, constraints, etc. are untouched

### AC5: Compressed Entries Excluded from Search
**Given** an entry is archived via compression
**When** `kb_search` is called
**Then** the archived entry does not appear in results (existing `archived` filter already handles this)

### AC6: Report Includes Summary Stats
**Given** compression completes
**When** the result is returned
**Then** it includes: entries evaluated, duplicates found, entries archived, entries skipped (below threshold)

## Reuse Plan

- Existing `archived` column + filter pattern already in `kb_search` and `kb_list`
- Stored embeddings in `knowledge_entries` — no new OpenAI calls needed
- Existing admin-only access control pattern (`kb_delete`, `kb_rebuild_embeddings`)

## Test Plan

- Unit test: similarity calculation correctly identifies near-duplicates
- Unit test: dry_run returns report without mutations
- Unit test: compression archives the newer of two duplicates
- Unit test: entries below threshold are untouched
- Integration test: post-compression search excludes archived entries

## Risks

- **False positives**: A threshold of 0.92 may be too aggressive for short entries. Mitigation: dry_run mode lets admins preview before committing. Make threshold configurable.
- **Performance**: Processing 500 entries pairwise is O(n²) comparisons. For 500 entries that's 125,000 similarity checks — fast with in-memory float arrays, but set a reasonable default `limit`.
