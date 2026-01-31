# Scope - KNOW-007

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | MCP tool implementation, handlers, schemas, logging, tests |
| frontend | false | No UI components in this story |
| infra | false | No infrastructure changes; documentation only for deployment guidance |

## Scope Summary

KNOW-007 implements the `kb_rebuild_embeddings` admin tool for the knowledge base MCP server, adds comprehensive structured logging to all MCP tool handlers, creates a performance test suite validating operations at scale (1000+ entries), and produces production documentation (PERFORMANCE.md, CACHE-INVALIDATION.md, DEPLOYMENT.md).
