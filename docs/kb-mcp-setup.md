# Knowledge Base MCP Server Setup for Claude Code

This document describes how to configure the Knowledge Base MCP server for use with Claude Code CLI.

## Prerequisites

1. **Docker Desktop** running
2. **Node.js 18+** installed
3. **pnpm** installed
4. **OpenAI API key** with embeddings access

## Quick Setup

```bash
# 1. Start the KB database
cd apps/api/knowledge-base
docker-compose up -d

# 2. Wait for healthy status
docker-compose ps
# Should show: knowledge-base-postgres with "healthy" status

# 3. Initialize database (run migrations)
pnpm db:init

# 4. Build the MCP server
pnpm build

# 5. Verify the server can start
pnpm test
```

## Claude Code Configuration

### Create MCP Configuration

Create `~/.claude/mcp.json` with the following content:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["/path/to/monorepo/apps/api/knowledge-base/dist/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://kbuser:YOUR_PASSWORD@localhost:5433/knowledgebase",
        "OPENAI_API_KEY": "sk-your-openai-api-key"
      }
    }
  }
}
```

Replace:
- `/path/to/monorepo` with your actual monorepo path
- `YOUR_PASSWORD` with the password from `apps/api/knowledge-base/.env`
- `sk-your-openai-api-key` with your actual OpenAI API key

### Restart Claude Code

After creating the config, restart Claude Code for it to load the new MCP server:

```bash
# Exit and restart Claude Code
# The KB tools should now be available
```

## Verification

### Check Server Health

Once Claude Code is restarted with the MCP configuration, you can verify connectivity:

```
Use kb_health to check the Knowledge Base server status
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "db": { "status": "pass", "latency_ms": 5 },
    "openai_api": { "status": "pass", "latency_ms": 200 },
    "mcp_server": { "status": "pass", "uptime_ms": 3600000 }
  }
}
```

### Test Basic Operations

```
# Search existing knowledge
Use kb_search to find entries about "architecture decisions"

# Add a test entry
Use kb_add to create a test entry with content "Test entry from Claude Code"

# Verify the entry was created
Use kb_stats to see the current KB statistics
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `kb_add` | Add knowledge entry with auto-embedding |
| `kb_get` | Retrieve entry by ID |
| `kb_update` | Update entry (re-embeds if content changed) |
| `kb_delete` | Delete entry (idempotent) |
| `kb_list` | List entries with filtering |
| `kb_search` | Hybrid semantic + keyword search |
| `kb_get_related` | Find related entries |
| `kb_bulk_import` | Batch import entries |
| `kb_rebuild_embeddings` | Rebuild embedding cache |
| `kb_stats` | Get KB statistics |
| `kb_health` | Check server health |
| `kb_audit_by_entry` | Get audit history for entry |
| `kb_audit_query` | Query audit log |

## Troubleshooting

### MCP Tools Not Available

1. Verify `~/.claude/mcp.json` exists and is valid JSON:
   ```bash
   cat ~/.claude/mcp.json | jq .
   ```

2. Check the path to `index.js` is correct:
   ```bash
   ls /path/to/monorepo/apps/api/knowledge-base/dist/mcp-server/index.js
   ```

3. Restart Claude Code completely

### Database Connection Failed

1. Check Docker is running:
   ```bash
   docker ps | grep knowledge-base
   ```

2. Check container is healthy:
   ```bash
   docker-compose -f apps/api/knowledge-base/docker-compose.yml ps
   ```

3. Test database connectivity:
   ```bash
   docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "SELECT 1"
   ```

### OpenAI API Key Invalid

1. Verify key format starts with `sk-`
2. Test key validity:
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

### Server Crashes on Startup

Run the server directly to see error messages:
```bash
cd apps/api/knowledge-base
export DATABASE_URL="postgresql://kbuser:password@localhost:5433/knowledgebase"
export OPENAI_API_KEY="sk-..."
node dist/mcp-server/index.js
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |
| `AGENT_ROLE` | No | Agent role filter (pm/dev/qa/all). Default: all |
| `LOG_LEVEL` | No | Logging level (debug/info/warn/error). Default: info |

## Database Schema

The KB uses PostgreSQL with pgvector extension for semantic search:

- `knowledge_entries` - Main KB storage with vector embeddings
- `embedding_cache` - SHA-256 hash-based embedding cache
- `audit_log` - Change history for all entries

## Related Documentation

- [Knowledge Base README](../apps/api/knowledge-base/README.md) - Full package documentation
- [KB Agent Integration Guide](../.claude/KB-AGENT-INTEGRATION.md) - How agents use KB
- [3-Bucket Architecture Plan](../plans/future/kb-memory-architecture/PLAN.md) - Future enhancements
