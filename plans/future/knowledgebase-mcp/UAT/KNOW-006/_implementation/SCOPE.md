# Scope - KNOW-006

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Parsers, bulk import, kb_stats MCP tool implementation |
| frontend | false | No UI components in this story |
| infra | false | No infrastructure changes required |

## Scope Summary

This story implements parsers for YAML seed data and LESSONS-LEARNED.md markdown files, a bulk import MCP tool for efficiently populating the knowledge base, and a kb_stats tool for statistics. All functionality is backend-only, extending the existing MCP server infrastructure from KNOW-0051.

## Key Directories

**New directories to create:**
- `apps/api/knowledge-base/src/parsers/` - YAML and markdown parsers
- `apps/api/knowledge-base/src/seed/` - Bulk import logic

**Existing files to modify:**
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` - Update kb_bulk_import schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Implement bulk import and update kb_stats

## Dependencies

- Requires `js-yaml` package for YAML parsing
- Uses existing EmbeddingClient for batch embedding generation
- Uses existing kb_add CRUD operation for individual entry creation
- Uses existing MCP server infrastructure from KNOW-0051
