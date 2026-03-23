# Knowledgebase Migration Runner

Manual migration runner for the `knowledgebase` PostgreSQL database.

> **Note:** These migrations are managed with raw `psql` — **not** Drizzle ORM.
> The `app/` and `umami/` migration directories are Drizzle-managed. This
> directory is independent.

---

## Canonical psql Command

```bash
psql -h localhost -p 5433 -U kbuser -d knowledgebase -f <path-to-migration>.sql
```

| Parameter | Value             | Notes                                                         |
| --------- | ----------------- | ------------------------------------------------------------- |
| `-h`      | `localhost`       | Local Docker host                                             |
| `-p`      | `5433`            | Port mapped in `docker-compose` for `knowledge-base-postgres` |
| `-U`      | `kbuser`          | Knowledgebase DB owner                                        |
| `-d`      | `knowledgebase`   | Target database — safety preamble will reject any other DB    |
| `-f`      | `<migration>.sql` | Path to the migration file                                    |

---

## Pre-Flight Checklist

Run through these checks **before** applying any migration:

1. **Verify the port**

   ```bash
   docker ps | grep knowledge-base-postgres
   # Should show: 0.0.0.0:5433->5432/tcp
   ```

2. **Verify the database name**

   ```bash
   docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase \
     -c "SELECT current_database();"
   # Should return: knowledgebase
   ```

3. **Check schema_migrations table** (after 020 has been applied)

   ```bash
   docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase \
     -c "SELECT * FROM schema_migrations ORDER BY applied_at;"
   ```

4. **Confirm the migration has not already been applied**

   ```bash
   docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase \
     -c "SELECT filename FROM schema_migrations WHERE filename = '<NNN_name>.sql';"
   # Should return 0 rows if not yet applied
   ```

5. **Backup (recommended for production)**
   ```bash
   docker exec knowledge-base-postgres pg_dump -U kbuser knowledgebase \
     > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

---

## Execution Steps

### Local (via Docker exec)

```bash
# Copy migration into container and execute
docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase \
  < packages/backend/database-schema/src/migrations/knowledgebase/NNN_migration_name.sql
```

### Local (via psql client if installed)

```bash
psql -h localhost -p 5433 -U kbuser -d knowledgebase \
  -f packages/backend/database-schema/src/migrations/knowledgebase/NNN_migration_name.sql
```

### Expected Output

A successful migration prints:

```
DO
CREATE TABLE
INSERT 0 1
```

If the safety preamble fails (wrong database), you will see:

```
ERROR:  Safety check failed: expected database "knowledgebase" but connected to "<wrong-db>". Aborting migration.
```

---

## Rollback Procedure

Knowledgebase migrations do **not** have automatic rollback. Rollback steps must
be written manually if needed. General approach:

1. **Identify what was changed** in the migration SQL (tables created, rows inserted, etc.)
2. **Write a reverse migration** (e.g. `DROP TABLE`, `DELETE FROM schema_migrations WHERE filename = '...'`)
3. **Apply the reverse migration** using the same canonical psql command
4. **Remove or mark the entry** in `schema_migrations`:
   ```sql
   DELETE FROM schema_migrations WHERE filename = 'NNN_migration_name.sql';
   ```

---

## Post-Flight Verification Queries

After applying a migration, confirm success with:

```sql
-- 1. Verify schema_migrations row was inserted
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

-- 2. Verify the table(s) created by the migration exist
\dt

-- 3. Verify row counts are as expected
SELECT COUNT(*) FROM schema_migrations;

-- 4. Confirm no errors occurred (psql exit code)
-- Run from shell: echo $?   -- should be 0
```

---

## Migration Naming Convention

```
NNN_<slug>.sql
```

| Part     | Format                              | Example                |
| -------- | ----------------------------------- | ---------------------- |
| `NNN`    | 3-digit zero-padded sequence        | `020`, `021`, `030`    |
| `<slug>` | lowercase, underscores, descriptive | `cdts_safety_preamble` |

Migrations are applied in numeric order. Leave gaps (20, 30, …) to allow
insertion of hotfixes without renaming.

---

## Naming Registry

| File                           | Story     | Applied                  |
| ------------------------------ | --------- | ------------------------ |
| `020_cdts_safety_preamble.sql` | CDTS-0010 | Applied at initial setup |

---

## Safety Preamble Reference

Every knowledgebase migration **must** begin with the following safety DO-block:

```sql
DO $$
BEGIN
  IF current_database() <> 'knowledgebase' THEN
    RAISE EXCEPTION
      'Safety check failed: expected database "knowledgebase" but connected to "%". Aborting migration.',
      current_database();
  END IF;
END;
$$;
```

This prevents accidentally running a knowledgebase migration against the `app`
or `umami` databases.
