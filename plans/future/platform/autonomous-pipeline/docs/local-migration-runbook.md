# Local Migration Runbook — Docker Compose

**Date:** 2026-02-25
**Story:** APIP-5007
**AC:** AC-6

---

## Overview

This runbook documents the local development startup sequence for the APIP autonomous pipeline using Docker Compose (`infra/compose.lego-app.yaml`). It covers:

1. Starting the Aurora/PostgreSQL container
2. Running pipeline-owned migrations
3. Calling LangGraph's `setup()` for checkpoint tables
4. Health check verification at each stage

**Architecture reference:** ADR-001 Decision 4 (Local Dedicated Server, No Lambda) — all APIP pipeline components run via Docker Compose on a local server.

---

## Prerequisites

- Docker Desktop running
- `infra/compose.lego-app.yaml` available at repo root
- `DATABASE_URL` environment variable set (or `.env.local` with `POSTGRES_*` vars)
- Node.js + pnpm installed

---

## Step 1: Start Aurora/PostgreSQL (Docker Compose)

```bash
# Start only PostgreSQL (minimum required for migration)
docker compose -f infra/compose.lego-app.yaml up -d postgres

# Or start full stack (PostgreSQL + Redis + observability)
docker compose -f infra/compose.lego-app.yaml up -d
```

### Health Check: PostgreSQL Ready

Wait for PostgreSQL to report healthy before proceeding. The Docker Compose health check polls `pg_isready`:

```bash
# Poll until healthy (max 30 seconds)
until docker compose -f infra/compose.lego-app.yaml exec postgres \
  pg_isready -U postgres -d monorepo; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
echo "PostgreSQL is ready"
```

**What the health check does:**
- Runs `pg_isready -U postgres -d monorepo` inside the container
- Checks every 5 seconds, retries 5 times (25 seconds total)
- Container transitions to `healthy` state when `pg_isready` exits 0

**PostgreSQL connection details (local Docker Compose):**
```
Host:     localhost
Port:     5432
User:     postgres
Password: postgres
Database: monorepo
```

---

## Step 2: Run Pipeline-Owned Migrations

Pipeline migrations live in `apps/api/autonomous-pipeline/migrations/` and are tracked by `apip.schema_migrations`.

### Migration Runner Script

```bash
# Run all pending pipeline migrations
node apps/api/autonomous-pipeline/scripts/run-migrations.js

# Or using pnpm (if package.json script exists)
pnpm --filter @repo/autonomous-pipeline db:migrate
```

### What the Migration Runner Does

1. Connects to PostgreSQL using `DATABASE_URL` (or individual `POSTGRES_*` env vars)
2. Ensures `apip` schema exists (`CREATE SCHEMA IF NOT EXISTS apip`)
3. Ensures `apip.schema_migrations` table exists
4. Reads all `*.sql` files from `apps/api/autonomous-pipeline/migrations/` in ascending numeric order
5. For each file: checks if the version is in `apip.schema_migrations` — if not, applies the SQL and inserts the version

### Verify Migration Status

```sql
-- Connect: psql -h localhost -U postgres -d monorepo

-- Check applied migrations
SELECT version, applied_at
FROM apip.schema_migrations
ORDER BY applied_at ASC;

-- Expected output after initial setup:
-- version                          | applied_at
-- ---------------------------------+---------------------------
-- 001_apip_schema_baseline.sql     | 2026-02-25 16:00:00+00
```

### Health Check: Migrations Applied

```bash
psql -h localhost -U postgres -d monorepo -c \
  "SELECT COUNT(*) FROM apip.schema_migrations WHERE version = '001_apip_schema_baseline.sql';"
# Expected: count = 1
```

---

## Step 3: LangGraph Checkpoint Table Setup

Worker graph processes call `PostgresSaver.setup()` at startup. This is handled automatically by the worker graph initialization code — no manual step required for routine startups.

**What `setup()` does:**
- Connects to PostgreSQL using the same `DATABASE_URL`
- Reads `public.checkpoint_migrations` to determine LangGraph schema version
- Applies any missing LangGraph schema versions (creates `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` tables if not present)
- Is idempotent — safe to call on every restart

**Manual verification (optional):**
```sql
-- Verify LangGraph checkpoint tables exist after first worker startup
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('checkpoints', 'checkpoint_blobs', 'checkpoint_writes', 'checkpoint_migrations')
ORDER BY table_name;

-- Expected: 4 rows
```

**If checkpoint tables are missing:** The worker graph process has not yet started (or failed before calling `setup()`). Check worker process logs.

---

## Full Startup Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ APIP Local Startup Sequence                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. docker compose up -d postgres                              │
│     └── Health: pg_isready exits 0                             │
│                                                                 │
│  2. Run pipeline migrations                                     │
│     └── apip.schema_migrations has all versions               │
│     └── apip.schema_migrations table exists                   │
│                                                                 │
│  3. PostgresSaver.setup() (called by each worker process)      │
│     └── public.checkpoints table exists                       │
│     └── public.checkpoint_blobs table exists                  │
│     └── public.checkpoint_writes table exists                 │
│                                                                 │
│  4. Pipeline ready — supervisor starts, workers accept jobs    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Startup Sequence Rationale

The ordering is mandatory:

- **PostgreSQL must be healthy before migrations** — obvious; migrations connect to the database.
- **Pipeline migrations before LangGraph `setup()`** — `setup()` runs inside worker processes. Worker processes should not start until the `apip` schema infrastructure is confirmed in place. This allows worker processes to trust that `apip.schema_migrations` is queryable if they need to verify their own migration state.
- **LangGraph `setup()` before job processing** — Worker graphs cannot checkpoint without the `public.checkpoints` table. Accepting jobs before `setup()` completes would cause the first checkpoint write to fail.

---

## Stopping Services

```bash
# Stop all services, preserve volumes (data persists)
docker compose -f infra/compose.lego-app.yaml down

# Stop all services and REMOVE volumes (data destroyed)
# Use this to reset to a clean state
docker compose -f infra/compose.lego-app.yaml down -v
```

**Warning:** `down -v` destroys all migration state. After `down -v`, the next startup will re-apply all migrations from scratch (migrations are idempotent, so this is safe).

---

## Troubleshooting

### PostgreSQL fails to start

```bash
# Check container logs
docker compose -f infra/compose.lego-app.yaml logs postgres

# Common causes:
# - Port 5432 already in use (another PostgreSQL running)
# - Docker volume permissions issue (try down -v and restart)
```

### Migration fails with "relation does not exist"

The migration runner depends on PostgreSQL being healthy. Verify health check passed before running migrations. Check that `DATABASE_URL` points to `localhost:5432` (not a remote host).

### LangGraph `setup()` fails

Check that PostgreSQL is healthy and that the migration runner completed successfully. The `public` schema must exist (it's the PostgreSQL default — should always exist). Check that the connecting user has `CREATE TABLE` permissions on the `public` schema.

### "already exists" errors during migration

Migrations use `IF NOT EXISTS` — this should not occur. If it does, a migration was partially applied. Check `apip.schema_migrations` for the version and manually remove it before re-running.

---

## Reference

- Docker Compose file: `infra/compose.lego-app.yaml`
- Pipeline migrations: `apps/api/autonomous-pipeline/migrations/`
- ADR-001 Decision 4: Local Dedicated Server, No Lambda
- ADR-002: Migration Tooling and LangGraph Checkpoint Ownership
- Rollback procedures: `plans/future/platform/autonomous-pipeline/docs/migration-rollback-procedures.md`
