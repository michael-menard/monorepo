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
