# CDTS Test Strategy Template

**Story**: CDTS-0020 — Audit Actual Table Locations and Produce Migration Manifest
**Date**: 2026-03-08
**References**: AC-11 | Resolves QA-001
**Applies To**: All subsequent CDTS migration stories (CDTS-1010 through CDTS-3020)

---

## Purpose

Every CDTS migration story that modifies the knowledgebase DB schema MUST follow this test template. This document defines the minimum verification requirements for each story. Individual stories may add additional checks but MUST NOT omit any dimension listed here.

---

## Template Dimensions

### Dimension 1: Idempotency

**Requirement**: Running the migration script twice MUST NOT produce an error on the second run.

**Why**: Migrations may be re-applied due to deployment failures, rollbacks, or partial runs. A non-idempotent migration that errors on re-run is a production incident waiting to happen.

**Implementation Pattern**:

```sql
-- Use IF NOT EXISTS / IF EXISTS guards throughout
CREATE TABLE IF NOT EXISTS public.my_table ( ... );
CREATE INDEX IF NOT EXISTS my_idx ON my_table (my_col);
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col TEXT;

-- For enum types, use DO $$ block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'analytics' AND t.typname = 'my_enum'
  ) THEN
    CREATE TYPE analytics.my_enum AS ENUM ('val1', 'val2');
  END IF;
END;
$$;
```

**Verification Command**:
```bash
# Run the migration once
psql -h localhost -p 5433 -U kbuser -d knowledgebase -f migrations/NNN.sql

# Run it again — must succeed with no errors
psql -h localhost -p 5433 -U kbuser -d knowledgebase -f migrations/NNN.sql
echo "Exit code: $?"
# Expected: Exit code: 0
```

**Pass Criteria**: Second run exits with code 0, no `ERROR:` lines in output.

---

### Dimension 2: FK Count Check

**Requirement**: The count of FK constraints in `information_schema.table_constraints` MUST match expectations before and after migration.

**Why**: Silent FK omissions are easy to miss. A count check catches regressions when a new migration accidentally drops or fails to add a constraint.

**Baseline** (from CDTS-0020 inventory): **7 FK constraints** in `public` schema before any Phase 1 work.

**Query**:
```sql
SELECT
  tc.table_schema,
  COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_catalog = 'knowledgebase'
GROUP BY tc.table_schema
ORDER BY tc.table_schema;
```

**Per-Story Expected Counts** (cumulative after each story):

| After Story | Schema | Expected FK Count | New FKs Added |
|-------------|--------|-------------------|---------------|
| Baseline (now) | public | 7 | — |
| CDTS-1010 | public | 7 | 0 (no new FKs in public) |
| CDTS-1010 | analytics | 1 | 1 (story_token_usage.story_id → public.stories.story_id) |
| CDTS-1020 | public | 9 | +2 (story_artifacts.story_id, work_state.story_id → stories.story_id) |
| CDTS-1020 | public | 9 + N | Additional FKs from plan_details, story_details, plan_dependencies, story_knowledge_links |

**Verification Command**:
```bash
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
SELECT tc.table_schema, COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_catalog = 'knowledgebase'
GROUP BY tc.table_schema
ORDER BY tc.table_schema;"
```

**Pass Criteria**: FK count matches the expected count documented in the story's verification section.

---

### Dimension 3: Drizzle Query Smoke Test

**Requirement**: After schema changes, at least one Drizzle ORM read query MUST execute successfully against each affected table.

**Why**: Drizzle schema.ts must stay in sync with the DB. A smoke test catches schema drift between the ORM model and the actual database state before the change ships.

**Note**: Code deploys before migrations run (per AGENT-CONTEXT.md). The Drizzle schema.ts must define the TARGET schema so it matches the DB after migration. Run smoke tests AFTER migration is applied.

**Implementation Pattern**:

```typescript
// Run via: ts-node smoke-test.ts (or vitest with integration config)
import { db } from './src/db/client'
import { myTable } from './src/db/schema'
import { limit } from 'drizzle-orm'

async function smokeTest() {
  // Test 1: Read from affected table
  const rows = await db.select().from(myTable).limit(1)
  console.log(`smoke test — myTable read: OK (${rows.length} rows)`)

  // Test 2: For new FK relationships, verify join works
  const joined = await db
    .select()
    .from(myTable)
    .leftJoin(otherTable, eq(myTable.foreignKeyCol, otherTable.id))
    .limit(1)
  console.log(`smoke test — join read: OK`)
}

smokeTest().catch(err => {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(1)
})
```

**Stories and Their Required Smoke Tests**:

| Story | Tables to Smoke Test |
|-------|---------------------|
| CDTS-1010 | analytics.story_token_usage, analytics.model_experiments, analytics.model_assignments, analytics.change_telemetry |
| CDTS-1020 | plan_details, story_details, plan_dependencies, story_knowledge_links, stories (with embedding col), plans (with embedding col) |
| CDTS-1030 | All tables in updated schema.ts (full schema read test) |
| CDTS-1040 | Each updated MCP tool SQL query (via tool invocation, not raw SQL) |
| CDTS-1050 | Full integration: invoke kb_list_stories, kb_get_story, kb_write_artifact, and verify FK integrity |

**Pass Criteria**: All smoke test queries return without error. Process exits with code 0.

---

## Safety Preamble (MANDATORY for all migrations)

Every migration file MUST begin with the safety preamble from CDTS-0010:

```sql
-- SAFETY: Abort if not running against the knowledge base DB
DO $$
BEGIN
  IF current_database() != 'knowledgebase' THEN
    RAISE EXCEPTION 'Safety check failed: expected knowledgebase, got %', current_database();
  END IF;
END;
$$;
```

This prevents accidental execution against the wrong database (e.g., lego_dev on port 5432).

---

## Migration File Checklist

Every migration SQL file must satisfy ALL of the following before merging:

- [ ] Safety preamble present (CDTS-0010 pattern)
- [ ] Wrapped in `BEGIN; ... COMMIT;`
- [ ] All DDL statements use `IF NOT EXISTS` / `IF EXISTS` guards
- [ ] Rollback script authored alongside migration (e.g., `NNN_rollback.sql`)
- [ ] Idempotency verified: run twice, no errors
- [ ] FK count check: actual count matches expected
- [ ] Drizzle smoke test: at least one read per affected table passes
- [ ] Migration registered in `schema_migrations` tracking table (if table exists)

---

## Running Tests Against Live DB

```bash
# Start KB database if not running
cd /Users/michaelmenard/Development/monorepo/apps/api/knowledge-base
docker-compose up -d

# Verify DB is healthy
docker exec knowledge-base-postgres pg_isready -U kbuser -d knowledgebase

# Run migration
docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase < migrations/NNN.sql

# Idempotency check — run again
docker exec -i knowledge-base-postgres psql -U kbuser -d knowledgebase < migrations/NNN.sql

# FK count check
docker exec knowledge-base-postgres psql -U kbuser -d knowledgebase -c "
SELECT tc.table_schema, COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_catalog = 'knowledgebase'
GROUP BY tc.table_schema
ORDER BY tc.table_schema;"
```

---

## QA-001 Resolution

This template was created to resolve QA-001: "No test strategy defined for migration stories." All subsequent CDTS stories (CDTS-1010 through CDTS-3020) must reference and satisfy the three dimensions defined here.
