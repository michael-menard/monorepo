# apps/api/knowledge-base

## Overview

MCP (Model Context Protocol) server exposing 100+ tools for agent interaction with the knowledge base. PostgreSQL 15+ with pgvector for semantic search.

## CRITICAL: Always run via tsx

```bash
# CORRECT — always use tsx against source
tsx src/mcp-server/index.ts

# WRONG — dist goes stale and causes phantom bugs
node dist/mcp-server/index.js
```

The `~/.claude.json` mcpServers.knowledge-base entry must use `tsx ...src/mcp-server/index.ts`. This has been fixed multiple times and keeps regressing. Check on any MCP-related issue.

## Architecture

- **MCP server** — tool definitions in `src/mcp-server/`
- **CRUD operations** — `src/crud-operations/` (stories, artifacts, tasks, plans)
- **Hybrid search** — vector similarity (pgvector) + PostgreSQL full-text search in `src/search/`
- **Embeddings** — OpenAI text-embedding-3-small, 1536 dimensions
- **Drizzle migrations** — `src/db/migrations/`
- **Audit** — change tracking in `src/audit/`
- **Telemetry** — token usage, invocations, outcomes in `src/telemetry/`

## Known Issues

- **Error misclassification** — `isOpenAIError()` in `src/mcp-server/error-handling.ts` matches ANY error containing the word "embedding." DB errors involving the `embedding` column get misreported as "Embedding generation failed." Root cause: overly broad pattern match.
- **OpenAI embedding dependency** — embedding generation requires an OpenAI key. If the key is missing or fails, KB writes that trigger embedding generation will fail silently or crash.

## Schema

- Database on port 5433
- pgvector extension for 1536-dimensional embeddings
- Drizzle config in `drizzle.config.ts`
