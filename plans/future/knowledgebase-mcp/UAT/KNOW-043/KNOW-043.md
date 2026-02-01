---
story_id: KNOW-043
title: Lessons Learned Migration
status: in-qa
epic: knowledgebase-mcp
created: 2026-01-31
updated: 2026-01-31
depends_on: [KNOW-006]
blocks: []
assignee: null
priority: P2
story_points: 3
tags: [knowledge-base, migration, lessons-learned, agents, workflow]
---

# KNOW-043: Lessons Learned Migration

## Context

The project currently maintains institutional knowledge in `LESSONS-LEARNED.md` files scattered across the codebase. Agents reference and append to these files during their workflows. With the Knowledge Base (KB) MCP server now operational (KNOW-006), we should migrate this knowledge to the KB and transition agents to use KB tools for capturing and retrieving lessons learned.

This story makes the KB the canonical source of institutional knowledge, replacing the fragmented markdown file approach with structured, searchable, and semantically-indexed knowledge entries.

## Goal

1. **Migrate existing LESSONS-LEARNED.md content** to the Knowledge Base using `kb_bulk_import`
2. **Update agent instructions** to write lessons learned to KB (using `kb_add`) instead of appending to markdown files
3. **Update agent instructions** to query KB for relevant lessons (using `kb_search`) before starting tasks
4. **Deprecate LESSONS-LEARNED.md files** with a migration notice pointing to KB

## Non-Goals

- **Delete LESSONS-LEARNED.md files** - Keep them with deprecation notice for historical reference
- **Migrate all documentation** - Only lessons learned; other docs remain in markdown
- **Change agent architecture** - Only update instructions, not agent structure
- **Automate continuous sync** - One-time migration; agents write directly to KB going forward
- **Create new tags/categories** - Use existing KB tagging conventions

## Scope

### Files Affected

**Modified:**
- Agent instruction files (`.claude/agents/*.agent.md`) - Add KB integration instructions
- `LESSONS-LEARNED.md` files - Add deprecation notice

**New:**
- `scripts/migrate-lessons-learned.ts` - Migration script to parse and import to KB
- `docs/knowledge-base/lessons-learned-migration.md` - Migration guide and reference

### Packages Affected

- `apps/api/knowledge-base` - May need parser updates for LESSONS-LEARNED.md format

## Acceptance Criteria

### AC1: Migration Script
- [ ] Script parses all `LESSONS-LEARNED.md` files in the codebase
- [ ] Script extracts individual lessons with metadata (date, agent, context)
- [ ] Script uses `kb_bulk_import` to add lessons to KB
- [ ] Script generates migration report (count imported, any failures)
- [ ] Script is idempotent (can re-run without duplicates)

### AC2: Content Migration & Format Variation Handling
- [ ] All existing lessons from LESSONS-LEARNED.md files imported to KB
- [ ] Parser handles multiple LESSONS-LEARNED.md formats (heading-based, markdown sections, freeform)
- [ ] Auto-discovery finds all LESSONS-LEARNED.md files in codebase
- [ ] Parser logs format variations encountered and handles gracefully
- [ ] Each lesson has appropriate tags (e.g., `lesson-learned`, source agent, category)
- [ ] Each lesson has semantic embedding generated
- [ ] Lessons are searchable via `kb_search`

### AC3: Agent Write Instructions
- [ ] Agents write new lessons to KB using `kb_add` tool
- [ ] Lesson format includes: content, tags, category, source context
- [ ] Agents no longer append to LESSONS-LEARNED.md files

### AC4: Agent Read Instructions
- [ ] Agents query KB for relevant lessons before starting tasks
- [ ] Query includes relevant context (task type, domain, technology)
- [ ] Results inform agent decisions (documented in agent instructions)

### AC5: Deprecation Notice
- [ ] All LESSONS-LEARNED.md files have deprecation notice at top
- [ ] Notice explains migration to KB
- [ ] Notice provides instructions for accessing lessons via KB
- [ ] Notice includes date of migration

### AC6: Dry-Run Support
- [ ] Migration script supports `--dry-run` flag
- [ ] Dry-run mode parses files, displays what would be imported (count, sample entries)
- [ ] No actual KB writes occur in dry-run mode

### AC7: Enhanced Migration Report
- [ ] Report includes per-file counts (lessons found, imported, skipped)
- [ ] Report lists any parsing failures or format issues
- [ ] Report provides import verification metrics (count in KB before/after)

### AC8: Documentation
- [ ] Migration guide documents the migration process
- [ ] Guide explains new KB-first workflow for lessons learned
- [ ] Guide provides examples of writing and reading lessons via KB

## Architecture Notes

### Migration Flow

```
LESSONS-LEARNED.md files → Parser → kb_bulk_import → Knowledge Base
                                                            ↓
                        Agents ← kb_search ← Semantic Search
                        Agents → kb_add → Knowledge Base
```

### Lesson Entry Schema

```typescript
// Parsed from LESSONS-LEARNED.md
const LessonEntrySchema = z.object({
  content: z.string(),           // The lesson text
  category: z.string(),          // e.g., "debugging", "architecture", "testing"
  source_file: z.string(),       // Original file path
  source_agent: z.string().optional(),  // Agent that captured the lesson
  captured_date: z.string().optional(), // When lesson was captured
  tags: z.array(z.string()),     // Additional tags
})
```

### Agent Instruction Changes

**Before (append to file):**
```markdown
When you learn something important, append to LESSONS-LEARNED.md
```

**After (use KB):**
```markdown
When you learn something important:
1. Use kb_add to store the lesson
2. Include tags: lesson-learned, [category], [your-agent-name]
3. Include context about when this lesson applies

Before starting a task:
1. Use kb_search to find relevant lessons
2. Query: "lessons learned [task type] [domain]"
3. Review top 3-5 results for applicable guidance
```

## Test Plan

### Happy Path Tests

#### Test 1: Migration Script Execution
**Setup:** LESSONS-LEARNED.md files exist with sample content

**Action:** Run migration script

**Expected:**
- All lessons parsed and imported
- Migration report shows count and any errors
- Lessons searchable in KB

#### Test 2: Agent Writes Lesson to KB
**Setup:** Agent configured with new instructions, KB running

**Action:** Agent completes task and captures lesson

**Expected:**
- Lesson added to KB via `kb_add`
- Lesson has appropriate tags
- No write to LESSONS-LEARNED.md

#### Test 3: Agent Reads Lessons from KB
**Setup:** Lessons exist in KB, agent configured with new instructions

**Action:** Agent starts task and queries for relevant lessons

**Expected:**
- Agent queries KB with relevant context
- Results include applicable lessons
- Agent references lessons in decision-making

### Error Cases

#### Error 1: Duplicate Lesson Detection
**Setup:** Migration script run twice

**Expected:** Second run detects existing entries, skips duplicates

#### Error 2: Malformed Lesson Entry
**Setup:** LESSONS-LEARNED.md has inconsistent formatting

**Expected:** Script logs warning, continues with parseable entries

## Risks / Edge Cases

1. **Inconsistent LESSONS-LEARNED.md formats:** Different agents may have used different formats; parser needs to be flexible
2. **Large file sizes:** Some files may have many entries; batch import appropriately
3. **Agent adoption:** Agents need updated instructions AND agents need to be tested with new workflow
4. **Search relevance:** Lesson tags and content must be well-structured for semantic search to work effectively

## Open Questions (Resolved)

1. ~~What is the current format of LESSONS-LEARNED.md files?~~ **Resolved**: Parser will handle discovered format variations (AC2)
2. ~~How many LESSONS-LEARNED.md files exist and where?~~ **Resolved**: Migration auto-discovers all files (AC2)
3. ~~Should lessons have an expiration or review date?~~ **Deferred**: KNOW-047 (Lesson Lifecycle Management) will address expiration strategies

---

## Related Stories

**Depends on:** KNOW-006 (Parsers and Seeding) - Provides `kb_bulk_import` functionality
**Related:** KNOW-040 (Agent Instruction Integration) - Similar agent instruction updates

---

## Notes

- This story should be done **after KNOW-040** when agent KB integration is validated
- Focus on making the migration smooth and reversible
- Keep LESSONS-LEARNED.md files for historical reference initially
- Consider follow-up story for lesson quality review and cleanup after migration

---

## Token Budget

| Phase | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| Elaboration | — | — | — |
| Implementation | — | — | — |

(To be filled during execution)

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### MVP-Critical Gaps (Now Addressed)

| # | Finding | User Decision | Resolution |
|---|---------|---------------|-----------|
| 1 | LESSONS-LEARNED.md format unknown | Add as AC | AC2: Parser handles format variations discovered during scanning |
| 2 | File count/locations unknown | Add as AC | AC2: Migration auto-discovers all LESSONS-LEARNED.md files |
| 3 | Migration idempotency strategy | Add as AC | AC1: Deduplication uses content hash to prevent reimports |

### Enhancement Opportunities Addressed

| # | Finding | User Decision | Implementation |
|---|---------|---------------|-----------------|
| 5 | Dry-run capability for safe testing | Add as AC | AC6: Script supports --dry-run flag |
| 3 | Migration report clarity | Add as AC | AC7: Enhanced report with per-file counts and failure details |

### Follow-up Stories Suggested

- [x] KNOW-044 - Migration Rollback Capability (Implement ability to rollback failed migrations) → KNOW-128
- [x] KNOW-045 - Agent KB Integration Testing (Comprehensive testing of agent KB interaction patterns) → KNOW-138
- [x] KNOW-046 - Post-Migration Quality Review (Validate migrated content quality and searchability) → KNOW-148
- [x] KNOW-047 - Lesson Lifecycle Management (Implement expiration, review dates, and cleanup) → KNOW-158
- [x] KNOW-048 - KB Usage Monitoring (Analytics for lesson adoption and popularity) → KNOW-168
- [x] KNOW-049 - Lesson Quality Metrics (Quality scoring and performance metrics) → KNOW-178

### Items Marked Out-of-Scope

- **Auto-categorization**: AI-based auto-tagging deferred; manual categorization sufficient for MVP
- **Cross-reference linking**: Linking lessons to related stories deferred; simple search sufficient for MVP
- **Gradual migration**: Full migration preferred over gradual rollout; gradual approach adds complexity
- **Lesson versioning**: Version control via KB timestamps sufficient; full versioning deferred
