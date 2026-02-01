# Implementation Plan - KNOW-043

## Overview

Migrate LESSONS-LEARNED.md content to Knowledge Base and update agent instructions to use KB tools.

## Existing Patterns to Reuse

### From `apps/api/knowledge-base/src/seed/`
- `kb-bulk-import.ts` - Bulk import function with batch processing
- `__types__/index.ts` - BulkImportInput/Result schemas
- `db-seed.ts` - Script pattern for DB operations

### From `apps/api/knowledge-base/src/parsers/`
- `__types__/index.ts` - ParsedEntrySchema for entry format
- Content sanitization utilities

## Chunks

### Chunk 1: Create Migration Script Types
**Files:**
- CREATE: `apps/api/knowledge-base/src/migration/__types__/index.ts`

**Content:**
```typescript
// LessonEntrySchema - parsed lesson from LESSONS-LEARNED.md
// MigrationOptionsSchema - CLI options (dry_run, source_paths)
// MigrationReportSchema - detailed import report
```

### Chunk 2: Create LESSONS-LEARNED.md Parser
**Files:**
- CREATE: `apps/api/knowledge-base/src/migration/lessons-parser.ts`

**Content:**
- Parse markdown heading-based structure (## STORY-XXX sections)
- Extract date, subsections (Reuse Discoveries, Blockers Hit, etc.)
- Handle format variations gracefully
- Generate tags from context (story ID, categories)

### Chunk 3: Create Migration Script
**Files:**
- CREATE: `apps/api/knowledge-base/src/scripts/migrate-lessons.ts`

**Content:**
- Auto-discover LESSONS-LEARNED.md files via glob
- Parse each file using lessons-parser
- Use kb_bulk_import for batch import
- Generate detailed migration report
- Support --dry-run flag (AC6)
- Content hash deduplication (AC1)

### Chunk 4: Create Migration Script Tests
**Files:**
- CREATE: `apps/api/knowledge-base/src/migration/__tests__/lessons-parser.test.ts`

**Content:**
- Test heading-based parsing
- Test format variation handling
- Test tag extraction

### Chunk 5: Update Agent Instructions - Learnings Agent
**Files:**
- MODIFY: `.claude/agents/dev-implement-learnings.agent.md`

**Content:**
- Replace LESSONS-LEARNED.md append with kb_add
- Add KB query section
- Include lesson format guidelines

### Chunk 6: Update Agent Instructions - Setup/Planner Leaders
**Files:**
- MODIFY: `.claude/agents/dev-setup-leader.agent.md`
- MODIFY: `.claude/agents/dev-implement-planner.agent.md`
- MODIFY: `.claude/agents/dev-implement-planning-leader.agent.md`
- MODIFY: `.claude/agents/dev-implement-implementation-leader.agent.md`

**Content:**
- Add KB Integration section with query patterns
- Remove LESSONS-LEARNED.md references

### Chunk 7: Add Deprecation Notices
**Files:**
- MODIFY: `plans/stories/LESSONS-LEARNED.md`
- MODIFY: `plans/future/knowledgebase-mcp/LESSONS-LEARNED.md`

**Content:**
```markdown
> **DEPRECATED**: This file is deprecated as of KNOW-043 (2026-01-31).
> Lessons are now stored in the Knowledge Base and accessed via `kb_search`.
>
> To query lessons:
> ```javascript
> kb_search({ query: "lesson category topic", role: "dev", limit: 5 })
> ```
>
> To add new lessons:
> ```javascript
> kb_add({ content: "...", role: "dev", tags: ["lesson-learned", "category"] })
> ```
```

### Chunk 8: Create Migration Documentation
**Files:**
- CREATE: `docs/knowledge-base/lessons-learned-migration.md`

**Content:**
- Migration process overview
- How to run migration script
- KB-first workflow for lessons
- Query and write examples

## Files Summary

### New Files (7)
1. `apps/api/knowledge-base/src/migration/__types__/index.ts`
2. `apps/api/knowledge-base/src/migration/lessons-parser.ts`
3. `apps/api/knowledge-base/src/scripts/migrate-lessons.ts`
4. `apps/api/knowledge-base/src/migration/__tests__/lessons-parser.test.ts`
5. `docs/knowledge-base/lessons-learned-migration.md`

### Modified Files (7)
1. `.claude/agents/dev-implement-learnings.agent.md`
2. `.claude/agents/dev-setup-leader.agent.md`
3. `.claude/agents/dev-implement-planner.agent.md`
4. `.claude/agents/dev-implement-planning-leader.agent.md`
5. `.claude/agents/dev-implement-implementation-leader.agent.md`
6. `plans/stories/LESSONS-LEARNED.md`
7. `plans/future/knowledgebase-mcp/LESSONS-LEARNED.md`

## Acceptance Criteria Mapping

| AC | Deliverable | Chunk |
|----|-------------|-------|
| AC1 | Migration script parses LESSONS-LEARNED.md | 2, 3 |
| AC1 | Idempotent (content hash dedup) | 3 |
| AC2 | Parser handles format variations | 2 |
| AC2 | Auto-discovers all files | 3 |
| AC3 | Agents write via kb_add | 5 |
| AC4 | Agents query via kb_search | 5, 6 |
| AC5 | Deprecation notices added | 7 |
| AC6 | --dry-run flag support | 3 |
| AC7 | Enhanced migration report | 3 |
| AC8 | Migration documentation | 8 |

## Dependencies

- KNOW-006: kb_bulk_import functionality (COMPLETED)
- KB MCP server running for testing

## Verification Commands

```bash
# Type check
pnpm check-types --filter knowledge-base

# Lint
pnpm lint --filter knowledge-base

# Tests
pnpm test --filter knowledge-base

# Migration dry-run
pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts --dry-run
```

## Notes

- The migration script is placed inside the knowledge-base package for access to KB internals
- Parser is separate from script for testability
- Agent updates include KB Integration sections at the top for visibility
