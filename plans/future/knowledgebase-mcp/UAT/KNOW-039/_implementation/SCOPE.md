# Scope - KNOW-039

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | CLI scripts for config generation and validation, kb_health tool enhancement |
| frontend | false | No UI components - CLI tooling only |
| infra | true | Writes to ~/.claude/mcp.json, checks Docker/database status |

## Scope Summary

This story implements zero-friction setup automation for the Knowledge Base MCP server. It creates two CLI scripts (`generate-config.ts` and `validate-connection.ts`), enhances the `kb_health` tool with real-time connectivity checks, and adds comprehensive documentation to the README for developer onboarding and troubleshooting.

## Files to Create/Modify

### New Files
- `apps/api/knowledge-base/scripts/generate-config.ts` - Config template generator
- `apps/api/knowledge-base/scripts/validate-connection.ts` - Connection validator
- `apps/api/knowledge-base/scripts/__tests__/generate-config.test.ts` - Tests for generator
- `apps/api/knowledge-base/scripts/__tests__/validate-connection.test.ts` - Tests for validator

### Modified Files
- `apps/api/knowledge-base/package.json` - Add kb:generate-config and kb:validate-connection scripts
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` - Enhance kb_health with real-time OpenAI validation
- `apps/api/knowledge-base/README.md` - Add Claude Code integration section and troubleshooting

## Key Architectural Decisions

1. **Scripts as Adapters**: CLI scripts delegate to existing domain logic (DB client, OpenAI client)
2. **Atomic File Writes**: Config generator uses write-to-temp-then-move pattern for safety
3. **Environment Variable References**: Generated config uses ${VAR} syntax, not hardcoded values
4. **Real-time Health Checks**: kb_health tests connectivity on each invocation (not cached)
