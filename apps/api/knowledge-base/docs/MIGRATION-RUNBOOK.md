# Migration Runbook

## Running Migrations

```bash
# From apps/api/knowledge-base/
./scripts/run-migrations.sh

# Dry run (shows what would be applied)
./scripts/run-migrations.sh --dry-run
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KB_DB_HOST` | `localhost` | Database host |
| `KB_DB_PORT` | `5433` | Database port |
| `KB_DB_USER` | `kbuser` | Database user |
| `KB_DB_NAME` | `knowledgebase` | Database name |
| `KB_DB_PASSWORD` | _(unset)_ | Password (uses .pgpass if unset) |

## Adding a New Migration

1. Create a file in `src/db/migrations/` with the next sequence number:
   ```
   NNN_descriptive_name.sql
   ```

2. **Always** include the safety preamble at the top of every migration:
   ```sql
   BEGIN;

   DO $$
   BEGIN
     IF current_database() != 'knowledgebase' THEN
       RAISE EXCEPTION 'SAFETY: Expected database "knowledgebase", got "%". Aborting.',
         current_database();
     END IF;
   END;
   $$;

   -- ... your DDL here ...

   COMMIT;
   ```

3. Use `IF NOT EXISTS` / `IF EXISTS` guards for idempotency where possible.

4. Run the migration: `./scripts/run-migrations.sh`

## Tracking

The `schema_migrations` table records every applied migration:

```sql
SELECT filename, applied_at, checksum, applied_by
FROM schema_migrations
ORDER BY applied_at;
```

## Rollback

There is no automated rollback. To reverse a migration:

1. Write a new forward migration that undoes the changes.
2. If urgent, connect directly and reverse manually, then record the rollback migration.
3. Never delete rows from `schema_migrations` — add a new migration instead.

## CDTS Phases 0-1 Verification (migrations 023-025)

### Pre-flight (run before applying)

```sql
-- FK count baseline
SELECT count(*) AS fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- Table inventory by schema
SELECT table_schema, count(*) AS table_count
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema ORDER BY table_schema;
```

### Post-flight (run after applying)

```sql
-- Verify analytics tables exist
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'analytics'
ORDER BY table_name;
-- Expected: change_telemetry, model_assignments, model_experiments, story_token_usage

-- Verify wint schema is gone
SELECT count(*) AS wint_tables
FROM information_schema.tables
WHERE table_schema = 'wint';
-- Expected: 0

-- Verify cross-schema FK
SELECT tc.constraint_name, tc.table_schema, tc.table_name,
       ccu.table_schema AS ref_schema, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'analytics';
-- Expected: fk_story_token_usage_story_id → public.stories

-- Verify schema_migrations tracking
SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at;
```

## Conventions

- Wrap every migration in `BEGIN` / `COMMIT`.
- One logical change per migration file.
- The `meta/` subdirectory is skipped by the runner.
