# Lessons Learned Migration Guide

This document describes the migration of institutional knowledge from `LESSONS-LEARNED.md` files to the Knowledge Base MCP server.

## Overview

As of KNOW-043 (2026-01-31), lessons learned from story implementations are stored in the Knowledge Base rather than markdown files. This enables:

- **Semantic search**: Find relevant lessons by topic, not just keywords
- **Role-based filtering**: Query lessons relevant to PM, dev, or QA workflows
- **Tag-based organization**: Browse lessons by category, story, or date
- **Cross-project knowledge**: Shared lessons across all features

## Running the Migration

### Prerequisites

1. Knowledge Base MCP server running with database initialized
2. Environment variables configured:
   - `KB_DB_PASSWORD` - Database password
   - `OPENAI_API_KEY` - For embedding generation

### Migration Command

```bash
# From monorepo root
pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts

# Dry run (parse without importing)
pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts --dry-run

# Verbose output
pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts --verbose

# Specific files
pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts --source ./plans/stories/LESSONS-LEARNED.md
```

### Migration Output

The script produces a detailed report:

```
============================================================
  Migration Summary
============================================================

Files discovered:     2
Files processed:      2

Total lessons found:  45
Lessons imported:     42
Lessons skipped:      3
Lessons failed:       0

KB entries before:    150
KB entries after:     192
Net new entries:      42

Duration:             12.34s
Session ID:           abc-123-def
```

## KB-First Workflow for Agents

### Writing Lessons

After completing a story, agents use `kb_add` to store lessons:

```javascript
kb_add({
  content: `**[STORY-007] Reuse Discoveries**

- **DI pattern for core functions**: The dependency injection pattern was highly reusable.
- **Discriminated union result types**: Works seamlessly for all operations.`,
  role: "dev",
  tags: ["lesson-learned", "story:story-007", "category:reuse-discoveries", "date:2026-01"]
})
```

### Querying Lessons

Agents query KB for context before planning or implementation:

```javascript
// Find lessons about a specific topic
kb_search({ query: "drizzle migration patterns", role: "dev", limit: 5 })

// Find lessons from specific categories
kb_search({ query: "implementation blockers", tags: ["lesson-learned", "category:blockers-hit"], limit: 3 })

// Find lessons from a specific story
kb_search({ query: "token optimization", tags: ["story:wrkf-1020"], limit: 3 })
```

## Tag Conventions

All lesson entries use consistent tags for organization:

| Tag Type | Format | Example |
|----------|--------|---------|
| Base tag | `lesson-learned` | `lesson-learned` |
| Story ID | `story:{id}` | `story:story-007` |
| Category | `category:{name}` | `category:reuse-discoveries` |
| Date | `date:YYYY-MM` | `date:2026-01` |
| Special | `high-cost-operation` | For token optimization lessons |

## Standard Categories

Lessons are organized into these categories:

1. **Reuse Discoveries** - New reusable patterns/utilities found
2. **Blockers Hit** - What blocked progress and how to avoid
3. **Plan vs Reality** - Planned vs actual files touched
4. **Time Sinks** - What took longer than expected
5. **Verification Notes** - What fast-fail/final verification caught
6. **Token Usage Analysis** - High-cost operations and optimizations
7. **Recommendations** - Actionable advice for future stories
8. **What Went Well** - Successful approaches to replicate
9. **Patterns Established** - New patterns for the codebase
10. **Key Decisions Made** - Important architectural decisions

## Deprecated Files

The following files are deprecated and should NOT be modified:

- `plans/stories/LESSONS-LEARNED.md`
- `plans/future/*/LESSONS-LEARNED.md`

These files are preserved for historical reference only.

## Troubleshooting

### Migration script fails

1. Check database connection: `pnpm --filter knowledge-base tsx src/scripts/validate-env.ts`
2. Ensure OpenAI API key is valid
3. Run with `--verbose` for detailed output

### Duplicate entries

The migration script uses content hashing to detect duplicates. Re-running is safe.

### Parse failures

Check the migration report for files with warnings. Some format variations may not parse correctly. You can manually add those lessons using `kb_add`.
