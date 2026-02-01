# Agent Context - KNOW-043

## Story Reference
- **Story ID**: KNOW-043
- **Title**: Lessons Learned Migration
- **Status**: in-qa
- **Epic**: knowledgebase-mcp

## Paths
- **Feature Directory**: plans/future/knowledgebase-mcp
- **Story Directory**: plans/future/knowledgebase-mcp/UAT/KNOW-043
- **Artifacts Directory**: plans/future/knowledgebase-mcp/UAT/KNOW-043/_implementation

## Mode
- **Mode**: qa-verify
- **Phase**: QA Verification (Setup)

## Scope Flags
- **backend_impacted**: true
- **frontend_impacted**: false
- **infra_impacted**: true

## Key Dependencies
- KNOW-006 (Parsers and Seeding) - provides kb_bulk_import functionality
- Knowledge Base MCP server operational at apps/api/knowledge-base

## Implementation Context

### Migration Script Location
Target: `scripts/migrate-lessons-learned.ts`

### KB Tools to Use
- `kb_bulk_import` - for batch importing parsed lessons
- `kb_add` - for adding individual lessons (agent workflow)
- `kb_search` - for querying lessons (agent workflow)

### Agent Files to Modify
Primary targets in `.claude/agents/`:
- dev-implement-learnings.agent.md
- dev-implement-planner.agent.md
- dev-setup-leader.agent.md
- dev-implement-implementation-leader.agent.md

### LESSONS-LEARNED.md Files
- plans/stories/LESSONS-LEARNED.md
- plans/future/knowledgebase-mcp/LESSONS-LEARNED.md
