# Migration Rollback Procedures

**Date:** 2026-02-25
**Story:** APIP-5007
**AC:** AC-5

---

## Overview

Pipeline migration rollback procedures depend on the nature of the DDL change. Not all migrations are safely reversible. This document categorizes migration types by their rollback safety profile and documents the procedure for each category.

---

## Rollback Categories

### Category 1: Additive (Safe)

**Definition:** Migrations that only ADD new objects — new tables, new columns with defaults, new indexes, new schemas. No existing data is modified or removed.

**Examples:**
- `CREATE SCHEMA IF NOT EXISTS apip`
- `CREATE TABLE IF NOT EXISTS apip.schema_migrations (...)`
- `ALTER TABLE apip.thread_registry ADD COLUMN metadata JSONB`
- `CREATE INDEX IF NOT EXISTS idx_... ON ...`

**Rollback procedure:**
```sql
-- Reverse of the additive operation
-- Drop the object that was created

-- Example: undo a new table
DROP TABLE IF EXISTS apip.new_table;

-- Example: undo a new column
ALTER TABLE apip.thread_registry DROP COLUMN IF EXISTS metadata;

-- Example: undo a new index (usually auto-dropped with table)
DROP INDEX IF EXISTS apip.idx_new_index;

-- Remove the migration record
DELETE FROM apip.schema_migrations WHERE version = 'NNN_description.sql';
```

**Risk:** Low. No data loss if the column/table has no data. If the column/table has been populated, dropping it destroys that data.

**Downtime required:** No, for index drops. Yes (brief) for table/column drops on live systems.

---

### Category 2: Destructive (Requires Downtime)

**Definition:** Migrations that DROP or TRUNCATE objects, remove columns, or rename tables/columns. Data may be lost if not backed up first.

**Examples:**
- `DROP TABLE IF EXISTS apip.deprecated_table`
- `ALTER TABLE apip.thread_registry DROP COLUMN old_column`
- `TRUNCATE TABLE apip.telemetry_events`

**Rollback procedure:**

> **WARNING: Rollback from destructive migrations requires a database backup. There is no in-place undo for DROP or TRUNCATE.**

```
1. Stop all pipeline processes (supervisor, workers)
2. Identify the last backup taken before this migration was applied
3. Restore the backup to a staging database
4. Verify the restored data is intact
5. If acceptable, restore the backup to production
6. Remove the migration record from apip.schema_migrations
7. Restart pipeline processes
```

**Pre-migration checklist for destructive migrations:**
- [ ] Full database backup taken and verified (pg_dump)
- [ ] Backup stored in at least two locations
- [ ] Rollback window established (e.g., 24 hours)
- [ ] Downstream consumers of dropped objects identified and updated
- [ ] All pipeline processes stopped before migration

**Downtime required:** Yes — full pipeline shutdown and backup restore.

---

### Category 3: Enum / Type Modifications (Irreversible)

**Definition:** Migrations that add values to PostgreSQL enum types, change column types, or remove enum values. PostgreSQL does not support removing enum values once added. Type changes may require full table rewrites.

**Examples:**
- `ALTER TYPE apip.stage_status ADD VALUE 'cancelled'`
- `ALTER TABLE apip.thread_registry ALTER COLUMN status TYPE TEXT`
- Removing an enum value (NOT possible in PostgreSQL without DROP + recreate)

**Rollback procedure for adding enum values:**
```
IRREVERSIBLE — PostgreSQL does not support removing enum values.

Mitigation strategy:
1. Do NOT add enum values unless they are needed immediately
2. If an incorrectly-added value must be removed:
   a. Drop all columns and constraints referencing the enum
   b. Drop and recreate the enum without the unwanted value
   c. Recreate the columns and constraints
   d. Restore data from backup
   This is equivalent to a full table rebuild.
```

**Rollback procedure for type changes:**
```
1. If the column data fits both the old and new type:
   ALTER TABLE apip.thread_registry ALTER COLUMN status TYPE old_type USING status::old_type;
2. If not (e.g., TEXT → ENUM with values that don't map):
   Requires backup restore (same as Category 2)
```

**Pre-migration checklist for enum/type modifications:**
- [ ] Full database backup taken and verified
- [ ] All enum values reviewed — no speculative additions
- [ ] Downstream code updated to handle the new type values before migration
- [ ] Migration tested on a staging copy of production data

**Downtime required:** Yes — type changes may require table locks or full rewrites.

---

## LangGraph Checkpoint Tables: No Pipeline Rollback

The four LangGraph checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations`) are owned by the `@langchain/langgraph-checkpoint-postgres` library. See ADR-002.

**These tables are NOT rollback-able via pipeline procedures.** Options if LangGraph schema causes issues:

1. **Downgrade the package version** — `npm install @langchain/langgraph-checkpoint-postgres@<previous_version>` and redeploy. LangGraph's `setup()` does not automatically undo schema changes on downgrade.
2. **Restore from backup** — If the schema change broke existing checkpoints, restore from a backup taken before the package upgrade.
3. **Accept forward-only** — In most cases, the correct fix is to upgrade to a newer patch version that resolves the issue.

---

## Migration Runner: Rollback Not Automatic

The APIP pipeline migration runner is **forward-only**. It reads `apip.schema_migrations`, identifies pending scripts (files not in the table), and applies them in order. There is no built-in `down` migration.

**To roll back a migration:**
1. Manually execute the rollback SQL (as described per category above)
2. Remove the migration record: `DELETE FROM apip.schema_migrations WHERE version = 'NNN_description.sql'`
3. The next migration runner invocation will re-apply the removed migration if the script file still exists

This design matches the Knowledge Base API pattern (`apps/api/knowledge-base/src/db/migrations/`) which also uses forward-only sequential scripts.

---

## Backup Recommendations

For local Docker Compose development:

```bash
# Full database backup
pg_dump -h localhost -U postgres -d monorepo -F c -f backup_$(date +%Y%m%d_%H%M%S).pgdump

# Backup apip schema only
pg_dump -h localhost -U postgres -d monorepo -n apip -F c -f apip_backup_$(date +%Y%m%d_%H%M%S).pgdump

# Restore from backup
pg_restore -h localhost -U postgres -d monorepo -F c backup_YYYYMMDD_HHMMSS.pgdump
```

Before applying any Category 2 or Category 3 migration, a backup is **required**.
