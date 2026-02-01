# Scope - KNOW-043

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Migration script (scripts/migrate-lessons-learned.ts) uses KB MCP tools |
| frontend | false | No UI changes - agents interact with KB via MCP tools |
| infra | true | Agent instruction files modified to integrate KB, deprecation notices added |

## Scope Summary

This story migrates institutional knowledge from scattered LESSONS-LEARNED.md files to the Knowledge Base MCP server. Key deliverables include:
1. A TypeScript migration script to parse and import lessons to KB via kb_bulk_import
2. Updates to agent instruction files to use kb_add for writing and kb_search for reading lessons
3. Deprecation notices added to existing LESSONS-LEARNED.md files

## Files Analysis

### LESSONS-LEARNED.md Files to Migrate
- `plans/stories/LESSONS-LEARNED.md` (primary file, ~650 lines with detailed story lessons)
- `plans/future/knowledgebase-mcp/LESSONS-LEARNED.md` (KB-specific lessons, ~139 lines)

### Agent Files to Update
Key agents that currently reference LESSONS-LEARNED.md:
- `dev-implement-learnings.agent.md` - writes lessons after story completion
- `dev-implement-planner.agent.md` - reads lessons for planning context
- `dev-setup-leader.agent.md` - may query for setup patterns
- `dev-implement-implementation-leader.agent.md` - may query for implementation patterns

### New Files
- `scripts/migrate-lessons-learned.ts` - migration script
- `docs/knowledge-base/lessons-learned-migration.md` - migration documentation
