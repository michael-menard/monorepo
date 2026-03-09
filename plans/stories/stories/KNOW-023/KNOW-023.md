---
story_id: KNOW-023
title: LESSONS-LEARNED.md Sync Strategy - Establish KB as Source of Truth
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: low
---

# KNOW-023: LESSONS-LEARNED.md Sync Strategy - Establish KB as Source of Truth

## Context

Lessons learned are currently a dual-write system with no sync mechanism:

1. Agents write to `LESSONS-LEARNED.md` files on disk (per story/feature)
2. A separate migration script (`src/scripts/migrate-lessons.ts`) parses these files and imports them into `knowledge_entries`

This creates divergence: if a `LESSONS-LEARNED.md` file is updated after import, the KB is stale. If a KB lesson is updated via `kb_update`, the file is stale. There's no way to know which is authoritative.

There are two valid strategies to resolve this:
1. **KB is authoritative**: Agents write lessons directly to the KB via `kb_add_lesson`. Markdown files become optional exports/views. One-time migration imports all existing files.
2. **Files are authoritative**: A sync job watches for file changes and re-imports to KB automatically (similar to `kb_sync_working_set`).

## Goal

Decide on and implement one authoritative source for lessons learned, eliminate the divergence, and update agent instructions accordingly.

## Recommendation

**Strategy 1 (KB-first)** is preferred because:
- The KB already has semantic search, audit log, and deduplication capability that files cannot match
- `kb_add_lesson` already exists and is used by some agents
- Files become hard to search across stories at scale
- Aligns with the direction taken for artifacts (migration 010 moved from file-based to DB-first)

Under this strategy: agents call `kb_add_lesson` directly. `LESSONS-LEARNED.md` files are generated as human-readable exports, not inputs.

## Non-goals

- Real-time bidirectional sync (too complex, choose one direction)
- Deleting existing `LESSONS-LEARNED.md` files (keep as read-only archives)
- Changing the `kb_add_lesson` tool interface

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_export_lessons` tool (generate markdown from KB entries)
- `.claude/agents/` — audit and update any agents still writing to LESSONS-LEARNED.md files instead of calling `kb_add_lesson`
- `apps/api/knowledge-base/src/scripts/migrate-lessons.ts` — run one-time import of all existing files, then mark as deprecated
- Agent documentation — update to reflect KB-first lesson capture

### New Tool: kb_export_lessons

Generates a `LESSONS-LEARNED.md` file from KB entries for a given story or feature, for human readability and archival purposes.

```typescript
{
  story_id?: string       // Export lessons for one story
  story_prefix?: string   // Export lessons for a feature (e.g. 'WISH')
  output_path?: string    // Where to write the file (default: stdout)
}
```

## Acceptance Criteria

### AC1: One-Time Migration Imports All Existing LESSONS-LEARNED.md Files
**Given** existing LESSONS-LEARNED.md files across the monorepo
**When** the migration script is run
**Then** all parseable lessons are imported to KB as `entry_type = 'lesson'` entries
**And** the script reports: files found, lessons imported, duplicates skipped, failures

### AC2: kb_export_lessons Generates Valid Markdown
**Given** lesson entries exist in the KB for a story or feature
**When** `kb_export_lessons` is called
**Then** a LESSONS-LEARNED.md formatted markdown file is generated with lessons grouped by category

### AC3: No Agent Writes Directly to LESSONS-LEARNED.md Files
**Given** all agent instructions have been updated
**When** agents record lessons
**Then** they call `kb_add_lesson` (verified by auditing agent .md files)

### AC4: Duplicate Detection Prevents Re-Import
**Given** a lesson already exists in the KB (matched by content hash)
**When** the migration script or an agent tries to add the same lesson again
**Then** the duplicate is skipped without error

### AC5: Existing Files Are Preserved as Archives
**Given** LESSONS-LEARNED.md files exist on disk
**When** the migration is complete
**Then** the files are left in place (not deleted), with a header comment noting they are archived

## Reuse Plan

- `src/migration/lessons-parser.ts` — already parses LESSONS-LEARNED.md, reuse for migration
- `src/scripts/migrate-lessons.ts` — extend with one-time full-scan mode
- Existing deduplication via `embedding_cache` content hash
- `kb_add_lesson` MCP tool — unchanged

## Test Plan

- Unit test: `kb_export_lessons` produces correctly formatted markdown
- Unit test: duplicate lesson detection via content hash
- Integration test: full migration run on sample files produces expected KB entries
- Audit: grep all agent .md files for direct LESSONS-LEARNED.md writes, verify none remain

## Risks

- **Agent compliance**: If agents still write to files after this change, lessons will be lost unless exported to KB manually. The audit in AC3 is critical.
- **Duplicate content**: The one-time migration may import lessons that were already in the KB from prior imports. Content-hash deduplication handles this but should be verified before running in production.
