# @repo/knowledge-base

Knowledge Base MCP Server infrastructure package with PostgreSQL and pgvector for semantic search.

## Quick Start

Get up and running in 30 seconds:

```bash
# 1. Navigate to package directory
cd apps/api/knowledge-base

# 2. Copy environment template
cp .env.example .env

# 3. Initialize database (starts Docker, runs migrations)
pnpm db:init

# 4. Run tests to verify setup
pnpm test

# 5. (Optional) Seed sample data
pnpm db:seed
```

That's it! See below for detailed documentation.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Detailed Setup](#detailed-setup)
- [Scripts](#scripts)
- [Claude Code Integration](#claude-code-integration)
- [Database Schema](#database-schema)
- [Vector Embeddings](#vector-embeddings)
- [Troubleshooting](#troubleshooting)
- [Disaster Recovery](#disaster-recovery)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

- **Docker Desktop** (or equivalent container runtime)
  - Download: https://www.docker.com/products/docker-desktop
- **pnpm 8.x+** (package manager)
  - Install: `npm install -g pnpm`
- **Node.js 18+**
  - Download: https://nodejs.org/

Optional:
- **PostgreSQL client tools** (for manual database inspection)
  - macOS: `brew install postgresql`
  - Provides `psql` command

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Knowledge Base MCP Server                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐     ┌──────────────────────────────────────┐ │
│  │  MCP Tools    │     │  PostgreSQL + pgvector               │ │
│  │  (KNOW-005)   │────▶│  ┌──────────────────────────────────┐ │ │
│  └───────────────┘     │  │  knowledge_entries               │ │ │
│                        │  │  - id: UUID                      │ │ │
│  ┌───────────────┐     │  │  - content: TEXT                 │ │ │
│  │  Embedding    │     │  │  - embedding: VECTOR(1536)       │ │ │
│  │  Client       │────▶│  │  - role: TEXT                    │ │ │
│  │  (KNOW-002)   │     │  │  - tags: TEXT[]                  │ │ │
│  └───────────────┘     │  └──────────────────────────────────┘ │ │
│                        │                                        │ │
│                        │  ┌──────────────────────────────────┐ │ │
│                        │  │  embedding_cache                 │ │ │
│                        │  │  - content_hash: TEXT (PK)       │ │ │
│                        │  │  - embedding: VECTOR(1536)       │ │ │
│                        │  └──────────────────────────────────┘ │ │
│                        └──────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

- **pgvector**: PostgreSQL extension for vector similarity search
- **Drizzle ORM**: Type-safe database operations
- **IVFFlat Index**: Approximate nearest neighbor search for embeddings
- **Connection Pooling**: Optimized for Lambda/serverless context

---

## Detailed Setup

### 1. Environment Configuration {#environment-setup}

Copy the environment template:

```bash
cp .env.example .env
```

#### Required Environment Variables

| Variable | Required | Description | Format |
|----------|----------|-------------|--------|
| `DATABASE_URL` | Yes* | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings | Starts with `sk-` |
| `EMBEDDING_MODEL` | No | Embedding model (default: text-embedding-3-small) | String |
| `EMBEDDING_BATCH_SIZE` | No | Batch size (default: 100) | Positive integer |
| `LOG_LEVEL` | No | Logging level (default: info) | `debug`, `info`, `warn`, `error` |

*Or use `KB_DB_*` variables below for backward compatibility.

#### Alternative: KB_DB_* Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KB_DB_HOST` | `localhost` | Database host |
| `KB_DB_PORT` | `5433` | Database port (5433 to avoid conflict with root docker-compose) |
| `KB_DB_NAME` | `knowledgebase` | Database name |
| `KB_DB_USER` | `kbuser` | Database user |
| `KB_DB_PASSWORD` | **(required)** | Database password - MUST be set explicitly |
| `KB_DB_MAX_CONNECTIONS` | `10` | Max pool connections |
| `KB_DB_IDLE_TIMEOUT_MS` | `10000` | Idle connection timeout |
| `KB_DB_CONNECTION_TIMEOUT_MS` | `5000` | Connection timeout |

**Note:** If both `DATABASE_URL` and `KB_DB_*` variables are set, `DATABASE_URL` takes precedence.

#### Startup Validation

The package validates environment variables at startup using Zod schemas. If required variables are missing or invalid, the server fails fast with a clear error message:

```
ERROR: Invalid environment configuration

The following environment variables are missing or invalid:

  DATABASE_URL: DATABASE_URL is required
  OPENAI_API_KEY: OPENAI_API_KEY is required

See: apps/api/knowledge-base/README.md#environment-setup
```

### 2. Start Database

Start PostgreSQL with pgvector:

```bash
docker-compose up -d
```

Verify container is healthy:

```bash
docker-compose ps
# Should show: knowledge-base-postgres with "healthy" status
```

### 3. Run Migrations

Apply database schema:

```bash
pnpm db:init
```

Or manually:

```bash
docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase < src/db/migrations/0000_initial_schema.sql
```

### 4. Verify Setup

Validate environment:

```bash
pnpm validate:env
```

Run tests:

```bash
pnpm test
```

### 5. Explore with Drizzle Studio

Open the visual database browser:

```bash
pnpm db:studio
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm db:init` | Initialize database (Docker + migrations) |
| `pnpm db:migrate` | Apply pending Drizzle migrations |
| `pnpm db:generate` | Generate migrations from schema changes |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:seed` | Seed sample knowledge entries |
| `pnpm db:analyze` | Run PostgreSQL ANALYZE for optimization |
| `pnpm db:studio` | Open Drizzle Studio web UI |
| `pnpm validate:env` | Check required environment variables |
| `pnpm test` | Run smoke tests |
| `pnpm build` | Build TypeScript |
| `pnpm check-types` | Type check without emit |
| `pnpm kb:generate-config` | Generate ~/.claude/mcp.json for Claude Code |
| `pnpm kb:validate-connection` | Validate all MCP server prerequisites |

---

## Claude Code Integration

Register the Knowledge Base MCP server with Claude Code for seamless access to kb_* tools.

### Prerequisites

Before setting up Claude Code integration:

1. **Docker running** - Knowledge Base requires PostgreSQL with pgvector
2. **Database initialized** - Run `pnpm db:init` first
3. **Environment variables set** - `DATABASE_URL` and `OPENAI_API_KEY`
4. **MCP server built** - Run `pnpm build`

### Quick Setup (30 seconds)

```bash
# 1. Generate Claude Code config
pnpm kb:generate-config

# 2. Validate everything works
pnpm kb:validate-connection

# 3. Restart Claude Code to load the MCP server
```

### Manual Setup

If you prefer manual configuration or need to merge with existing config:

1. Open `~/.claude/mcp.json`
2. Add the following under `mcpServers`:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": ["/path/to/monorepo/apps/api/knowledge-base/dist/mcp-server/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

3. Set environment variables in your shell profile:

```bash
export DATABASE_URL="postgresql://kbuser:password@localhost:5433/knowledgebase"
export OPENAI_API_KEY="sk-..."
```

4. Restart Claude Code

### Validate Connection

Run the connection validator to check all prerequisites:

```bash
pnpm kb:validate-connection
```

Expected output when everything is working:

```
MCP Connection Validator
Checking all prerequisites for Knowledge Base MCP server

Monorepo root: /path/to/monorepo
Docker platform: Docker Desktop

Running checks...

OK Docker daemon running
OK KB database container healthy
OK MCP server built
OK Build freshness
OK DATABASE_URL set (postgresql://...)
OK OPENAI_API_KEY set (sk-proj...)
OK Database connectivity
OK OpenAI API key valid
OK No conflicting MCP process
OK MCP server responds

All 10 checks passed!

The Knowledge Base MCP server is ready to use with Claude Code.
```

### Available MCP Tools

Once connected, Claude Code can use these tools:

| Tool | Description |
|------|-------------|
| `kb_add` | Add knowledge entry |
| `kb_get` | Get entry by ID |
| `kb_update` | Update entry |
| `kb_delete` | Delete entry |
| `kb_list` | List entries with filters |
| `kb_search` | Hybrid semantic + keyword search |
| `kb_get_related` | Find related entries |
| `kb_bulk_import` | Bulk import entries |
| `kb_rebuild_embeddings` | Rebuild embedding cache |
| `kb_stats` | Get KB statistics |
| `kb_health` | Check server health |

### Health Check

Check MCP server health from Claude Code:

```
Use kb_health to check the server status
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "db": { "status": "pass", "latency_ms": 5 },
    "openai_api": { "status": "pass", "latency_ms": 200 },
    "mcp_server": { "status": "pass", "uptime_ms": 3600000 }
  },
  "uptime_ms": 3600000,
  "version": "1.0.0"
}
```

Status values:
- **healthy**: All checks pass
- **degraded**: Non-critical check failed (OpenAI unavailable but fallback mode works)
- **unhealthy**: Critical check failed (database down)

---

## Database Schema

### knowledge_entries

Stores knowledge content with vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `content` | TEXT | Knowledge content |
| `embedding` | VECTOR(1536) | OpenAI embedding |
| `role` | TEXT | Target role: `pm`, `dev`, `qa`, `all` |
| `tags` | TEXT[] | Categorization tags |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

Indexes:
- `knowledge_entries_embedding_idx`: IVFFlat index for vector similarity
- `knowledge_entries_role_idx`: For role filtering
- `knowledge_entries_created_at_idx`: For ordering

### embedding_cache

Caches embeddings to avoid redundant API calls.

| Column | Type | Description |
|--------|------|-------------|
| `content_hash` | TEXT | SHA-256 hash (primary key) |
| `embedding` | VECTOR(1536) | Cached embedding |
| `created_at` | TIMESTAMP | Cache entry time |

---

## Vector Embeddings

### Dimension: 1536

The VECTOR(1536) dimension is tied to **OpenAI text-embedding-3-small** model.

Common dimensions by model:
- `text-embedding-3-small`: **1536** (used here)
- `text-embedding-3-large`: 3072
- `text-embedding-ada-002`: 1536 (legacy)

### Dimension Mismatch Errors

If you see an error like:

```
ERROR: expected 1536 dimensions, got 3072
```

This means the embedding model output doesn't match the schema. To fix:

1. Update schema dimension in `src/db/schema.ts`
2. Generate new migration: `pnpm db:generate`
3. Apply migration: `pnpm db:migrate`
4. Re-generate all embeddings

### IVFFlat Index

The schema uses IVFFlat index with `lists=100` for approximate nearest neighbor search.

Query pattern:

```sql
SELECT id, content
FROM knowledge_entries
ORDER BY embedding <=> '[query_vector]'::vector
LIMIT 10;
```

To verify index is being used:

```bash
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  EXPLAIN SELECT * FROM knowledge_entries
  ORDER BY embedding <=> '[0.1,0.2,...]'::vector LIMIT 10;
"
```

Expected: Plan should show "Index Scan" (not "Seq Scan").

### When to Run ANALYZE

Run `pnpm db:analyze` after:
- Bulk data imports (KNOW-006)
- Significant data changes (>10% of rows)
- When query performance degrades

---

## Troubleshooting

### Docker not running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
1. Start Docker Desktop
2. Wait for Docker to fully start
3. Retry the command

### Port 5433 already in use

**Error:**
```
Bind for 0.0.0.0:5433 failed: port is already allocated
```

**Solution:**
1. Find what's using the port: `lsof -i :5433`
2. Either stop that process, or change `KB_DB_PORT` in `.env`

### pgvector extension not available

**Error:**
```
ERROR: extension "vector" is not available
```

**Solution:**
You're using the wrong PostgreSQL image. Use `pgvector/pgvector:0.5.1-pg16`, not `postgres:16`.

Check your docker-compose.yml:
```yaml
image: pgvector/pgvector:0.5.1-pg16  # Correct
# NOT: postgres:16  # Wrong - no pgvector
```

### Connection refused

**Error:**
```
ECONNREFUSED 127.0.0.1:5433
```

**Solutions:**
1. Check Docker is running: `docker ps`
2. Check container is healthy: `docker-compose ps`
3. Check logs: `docker-compose logs kb-postgres`
4. Verify port mapping: `docker port knowledge-base-postgres`

### Authentication failed

**Error:**
```
password authentication failed for user "kbuser"
```

**Solution:**
1. Check `.env` has correct `KB_DB_USER` and `KB_DB_PASSWORD`
2. They should match values in `docker-compose.yml`
3. If you changed them, recreate the container:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

### Migration failed

**Error:**
```
relation "knowledge_entries" already exists
```

**Solution:**
The migration is idempotent. If you need to reset:
```bash
docker-compose down -v  # Remove volume
docker-compose up -d     # Fresh start
pnpm db:init            # Re-run migrations
```

### Tests failing

**Error:**
```
Connection timeout
```

**Solution:**
1. Ensure Docker is running: `docker-compose up -d`
2. Wait for healthy status: `docker-compose ps`
3. Check database is accessible: `pnpm validate:env`

---

## Claude Code Troubleshooting

### MCP server not appearing in Claude Code

**Symptoms:**
- kb_* tools not available after restart
- "Unknown tool" errors

**Solutions:**
1. Verify config exists: `cat ~/.claude/mcp.json`
2. Check config is valid JSON: `jq . ~/.claude/mcp.json`
3. Ensure absolute path to index.js is correct
4. Restart Claude Code (not just refresh)
5. Run: `pnpm kb:validate-connection`

### Environment variables not loaded

**Error:**
```
DATABASE_URL is required
```

**Solutions:**
1. Ensure variables are set in your shell profile (`~/.zshrc` or `~/.bashrc`)
2. Verify with: `echo $DATABASE_URL`
3. If using dotenv, ensure .env file is in correct location
4. Claude Code inherits env from your terminal - restart terminal first

### MCP server crashes on startup

**Symptoms:**
- Tools appear briefly then disappear
- "Server disconnected" errors

**Solutions:**
1. Check server logs: Run MCP server directly to see errors
   ```bash
   node dist/mcp-server/index.js
   ```
2. Verify database is running and accessible
3. Check for port conflicts with existing MCP server
4. Run: `pnpm kb:validate-connection` to diagnose

### Invalid OpenAI API key

**Error:**
```
OpenAI API key invalid (status 401)
```

**Solutions:**
1. Verify key is correct: Check OpenAI dashboard
2. Check key hasn't expired or been revoked
3. Ensure key has correct permissions for embeddings
4. Try: `curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models`

### Stale build

**Error:**
```
Build freshness check failed: Source files are newer than build
```

**Solution:**
```bash
cd apps/api/knowledge-base
pnpm build
pnpm kb:validate-connection
```

### Existing config conflicts

**Error:**
```
Config file already exists: ~/.claude/mcp.json
```

**Solutions:**
1. Use `--force` flag to overwrite: `pnpm kb:generate-config -- --force`
2. Or manually merge configs:
   ```bash
   pnpm kb:generate-config -- --dry-run  # See what would be generated
   # Then manually add to existing config
   ```

### Backup recovery

If you accidentally overwrote a config:
```bash
# Restore from backup
cp ~/.claude/mcp.json.backup ~/.claude/mcp.json

# Restart Claude Code
```

### kb_health shows degraded

**Symptoms:**
- `"status": "degraded"` in health check

**Causes and solutions:**
1. **OpenAI API unavailable**: Check internet connection, API key validity
2. **High database latency**: Check database performance, connection count
3. **Non-critical service down**: System is still functional, search uses fallback mode

### kb_health shows unhealthy

**Symptoms:**
- `"status": "unhealthy"` in health check

**Causes and solutions:**
1. **Database connection failed**: Restart database container
   ```bash
   docker-compose restart kb-postgres
   ```
2. **Database credentials wrong**: Verify DATABASE_URL matches container config
3. **Container crashed**: Check container logs and restart

---

## Disaster Recovery

The Knowledge Base has comprehensive backup and restore capabilities. For detailed procedures, see the full documentation.

### Quick Commands

| Action | Command |
|--------|---------|
| Create backup | `./scripts/backup-kb.sh` |
| Validate backup | `./scripts/validate-backup.sh --backup-file=<path>` |
| Restore from backup | `./scripts/restore-kb.sh --backup-file=<path>` |
| Cleanup old backups | `./scripts/cleanup-backups.sh` |
| Monthly validation | `./scripts/monthly-validate-all.sh` |

### Recovery Targets

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 24 hours (daily backups)

### Documentation

| Document | Purpose |
|----------|---------|
| [Disaster Recovery Runbook](./docs/DISASTER-RECOVERY-RUNBOOK.md) | Step-by-step backup and restore procedures |
| [Backup Sizing Guide](./docs/BACKUP-SIZING.md) | Capacity planning and cost estimation |
| [Validation Schedule](./docs/BACKUP-VALIDATION-SCHEDULE.md) | Monthly backup integrity checks |
| [DR Drill Procedure](./docs/DR-DRILL-PROCEDURE.md) | Disaster recovery testing procedures |

### Backup Location

Backups are stored in `./backups/`:

```bash
# List backups
ls -lt ./backups/kb-backup-*.sql.gz

# Backup format: kb-backup-YYYYMMDD-HHMMSS.sql.gz
# Example: kb-backup-20260125-143000.sql.gz
```

### Retention Policy

| Tier | Retention | Kept Backups |
|------|-----------|--------------|
| Daily | 7 days | All backups from last week |
| Weekly | 4 weeks | Sunday backups |
| Monthly | 12 months | 1st-of-month backups |

### Environment Variables (Disaster Recovery)

Add these to your `.env` file:

```bash
# Backup storage path
KB_BACKUP_LOCAL_PATH=./backups

# PostgreSQL SSL mode (disable for local, require for production)
KB_DB_SSLMODE=disable

# Retention settings
KB_BACKUP_RETENTION_DAILY=7
KB_BACKUP_RETENTION_WEEKLY=4
KB_BACKUP_RETENTION_MONTHLY=12
```

---

## Rollback Procedures

### Reset Database to Clean State

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
pnpm db:init
```

### Rollback Last Migration

Currently manual process:

```bash
# Connect to database
docker exec -it knowledge-base-postgres psql -U kbuser -d knowledgebase

# In psql, drop tables (destructive!)
DROP TABLE IF EXISTS embedding_cache;
DROP TABLE IF EXISTS knowledge_entries;
DROP EXTENSION IF EXISTS vector;

# Exit and re-run migrations
\q
pnpm db:init
```

### Connection Pool Cleanup

If connections are stuck:

```bash
# Restart the container (releases all connections)
docker-compose restart kb-postgres

# Or, force kill connections in psql
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'knowledgebase' AND pid <> pg_backend_pid();
"
```

### Recovery After Disk Full

If disk fills up:

```bash
# Check disk usage
docker system df

# Remove unused Docker resources
docker system prune -a

# Restart container
docker-compose restart kb-postgres
```

---

## Related Stories

- **KNOW-001**: Package Infrastructure Setup (this story)
- **KNOW-002**: Embedding Client Implementation
- **KNOW-003**: CRUD Operations
- **KNOW-004**: Semantic Search
- **KNOW-005**: MCP Server Implementation
- **KNOW-006**: Parsers and Seeding
- **KNOW-007**: Performance Tuning

---

## License

MIT
