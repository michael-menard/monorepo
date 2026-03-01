# Pipeline Database — LangGraph Checkpoint Storage

This package provides the PostgreSQL database layer for LangGraph checkpoint storage
used by the autonomous agent pipeline.

## Quick Start

### 1. Start the Test Database

```bash
pnpm db:test:start
```

This starts a PostgreSQL 15 container on **port 5434** (isolated from the
knowledge-base DB on port 5433).

### 2. Apply Migrations

```bash
pnpm db:migrate:test
```

This applies all SQL files from `src/db/migrations/` in sequence.
It is idempotent — safe to run multiple times.

### 3. Run Tests

```bash
pnpm test
```

Unit tests (`checkpoint-schema.test.ts`) run without a live DB.
Integration tests (`checkpoint-integration.test.ts`) require the DB to be running.

---

## Database Configuration

All environment variables use the `PIPELINE_DB_*` prefix:

| Variable              | Default          | Description               |
|-----------------------|------------------|---------------------------|
| `PIPELINE_DB_HOST`    | `localhost`      | PostgreSQL host            |
| `PIPELINE_DB_PORT`    | `5434`           | PostgreSQL port            |
| `PIPELINE_DB_NAME`    | `pipeline_test`  | Database name              |
| `PIPELINE_DB_USER`    | `pipelineuser`   | Database user              |
| `PIPELINE_DB_PASSWORD`| *(required)*     | Database password          |

Create a `.env` file in `apps/api/pipeline/` for local development:

```env
PIPELINE_DB_HOST=localhost
PIPELINE_DB_PORT=5434
PIPELINE_DB_NAME=pipeline_test
PIPELINE_DB_USER=pipelineuser
PIPELINE_DB_PASSWORD=TestPassword123!
```

---

## Schema Tables

The schema mirrors [LangGraph's PostgreSQL checkpoint saver](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-postgres) conventions.

| Table                   | Purpose                                              |
|-------------------------|------------------------------------------------------|
| `checkpoints`           | Point-in-time snapshots of graph state               |
| `checkpoint_blobs`      | Binary data blobs referenced by checkpoints          |
| `checkpoint_writes`     | Pending task writes before checkpoint commit         |
| `checkpoint_migrations` | Migration version tracking                           |

**Column names must NOT be renamed** — LangGraph uses them by convention.

---

## Migration Convention

Migrations follow the numbered prefix convention:

```
src/db/migrations/
  001_langgraph_checkpoint_schema.sql   # Core checkpoint tables
  002_...sql                             # Future migrations
```

- Files are sorted lexicographically by filename
- Prefix format: `NNN_description.sql` (e.g., `001_`, `002_`)
- Each migration is wrapped in a transaction
- Version is recorded in `checkpoint_migrations` on success

---

## Pool Isolation

This package uses a **standalone `pg.Pool`** with zero imports from `@repo/db`.
This ensures:

1. Pipeline storage is fully decoupled from the main application database
2. Independent connection limits (max: 3 per process)
3. No accidental cross-contamination of schema or migrations

---

## Test DB Isolation

The test DB runs on **port 5434**, separate from:
- Knowledge-base DB: port 5433

This prevents test interference between packages.

---

## APIP-5007 Note

The migration runner in `scripts/apply-migrations.ts` is **provisional**.

APIP-5007 will supersede it by integrating
`@langchain/langgraph-checkpoint-postgres` directly, which provides its own
`setup()` method for schema initialization.

When APIP-5007 is implemented:
- The `apply-migrations.ts` script can be retired
- `db:migrate:test` will delegate to the LangGraph setup() call
- The SQL migration files here serve as documentation of the expected schema

---

## Troubleshooting

### Connection refused on port 5434

The test database is not running. Start it:

```bash
pnpm db:test:start
```

### password authentication failed

Check your `.env` file. The test DB password is `TestPassword123!`.

### Tables do not exist

Run the migration:

```bash
pnpm db:migrate:test
```

### Port 5434 already in use

Another process is using port 5434. Stop it or change `PIPELINE_DB_PORT`.
