# Implementation Plan - WISH-2007

## Scope Surface

- backend/API: no
- frontend/UI: no
- infra/config: yes (database migration)
- notes: Pure database migration execution using existing Drizzle tooling

## Acceptance Criteria Checklist

- [ ] AC 1: Migration file generated at `0007_*.sql`
- [ ] AC 2: Migration metadata updated in `meta/` directory
- [ ] AC 3: Migration contains CREATE TABLE with all 19 columns
- [ ] AC 4: Migration runs successfully in local dev
- [ ] AC 5: Table `wishlist_items` exists with correct schema
- [ ] AC 6: All 5 indexes created
- [ ] AC 7: Enums created with correct values
- [ ] AC 8: Check constraint enforces priority 0-5 range
- [ ] AC 9: Migration is idempotent
- [ ] AC 10: Rollback script documented
- [ ] AC 11: Rollback tested in local environment
- [ ] AC 14: Column types match WISH-2000 exactly
- [ ] AC 15: Enum values match WISH-2000 exactly

## Files To Touch (Expected)

### Generated Files
- `packages/backend/database-schema/src/migrations/app/0007_*.sql` - New migration (auto-generated)
- `packages/backend/database-schema/src/migrations/app/meta/0007_snapshot.json` - Migration metadata (auto-generated)
- `packages/backend/database-schema/src/migrations/app/meta/_journal.json` - Updated journal (auto-generated)

### Existing Files (No Changes)
- `packages/backend/database-schema/src/schema/index.ts` - Schema already defined (WISH-2000)
- `packages/backend/database-schema/drizzle.config.ts` - Already configured
- `packages/backend/database-schema/package.json` - Already has scripts

### Documentation Files
- `plans/future/wish/in-progress/WISH-2007/_implementation/ROLLBACK-SCRIPT.sql` - Manual rollback procedure

## Reuse Targets

- Drizzle ORM migration system (already installed)
- Existing migration patterns from `0000_*.sql` through `0006_*.sql`
- Existing database connection configuration in `.env.local`
- pnpm workspace scripts in `database-schema/package.json`

## Architecture Notes (Ports & Adapters)

Not applicable - this is a database migration story with no application layer changes.

Migration is purely infrastructure:
- Schema definition already exists in `src/schema/index.ts` (WISH-2000)
- Drizzle generates SQL from schema
- Migration applies SQL to database

## Step-by-Step Plan (Small Steps)

### Step 1: Verify Database Connection
**Objective**: Ensure local PostgreSQL is running and accessible
**Files**: None (environment check)
**Verification**: Connect to database using `.env.local` credentials

### Step 2: Generate Migration File
**Objective**: Run `pnpm --filter @repo/database-schema db:generate` to create migration
**Files**:
- Creates `src/migrations/app/0007_*.sql`
- Creates `src/migrations/app/meta/0007_snapshot.json`
- Updates `src/migrations/app/meta/_journal.json`
**Verification**: Migration file exists and contains expected SQL

### Step 3: Inspect Generated Migration
**Objective**: Verify migration SQL matches WISH-2000 schema spec
**Files**: `0007_*.sql`
**Verification**:
- Contains CREATE TYPE for `wishlist_store` and `wishlist_currency`
- Contains CREATE TABLE for `wishlist_items` with 19 columns
- Contains 5 CREATE INDEX statements
- Contains priority_range_check constraint

### Step 4: Apply Migration to Local Database
**Objective**: Run `pnpm --filter @repo/database-schema db:migrate` to execute migration
**Files**: None (database state change)
**Verification**: Command exits successfully with no errors

### Step 5: Verify Table Creation
**Objective**: Confirm `wishlist_items` table exists in database
**Files**: None (database query)
**Verification**: Query `information_schema.tables` shows `wishlist_items`

### Step 6: Verify Column Structure
**Objective**: Confirm all 19 columns present with correct types
**Files**: None (database query)
**Verification**: Query `information_schema.columns` for table, compare to WISH-2000 spec

### Step 7: Verify Indexes Created
**Objective**: Confirm all 5 indexes exist
**Files**: None (database query)
**Verification**: Query `pg_indexes` shows all 5 indexes on `wishlist_items`

### Step 8: Verify Enums Created
**Objective**: Confirm enums have correct values
**Files**: None (database query)
**Verification**:
- `wishlist_store` has: LEGO, Barweer, Cata, BrickLink, Other
- `wishlist_currency` has: USD, EUR, GBP, CAD, AUD

### Step 9: Test Check Constraint
**Objective**: Verify priority_range_check rejects invalid values
**Files**: None (database test)
**Verification**: INSERT with priority=10 fails, INSERT with priority=3 succeeds

### Step 10: Test Migration Idempotency
**Objective**: Re-run `db:migrate` and verify no errors
**Files**: None (database command)
**Verification**: Command exits successfully, reports "No pending migrations"

### Step 11: Create Rollback Script
**Objective**: Document rollback procedure
**Files**: `_implementation/ROLLBACK-SCRIPT.sql`
**Verification**: File contains DROP TABLE and DROP TYPE statements

### Step 12: Test Rollback in Local Environment
**Objective**: Execute rollback script and verify clean removal
**Files**: None (database test)
**Verification**: Table and enums removed, no orphaned objects

## Test Plan

### Commands to Run

```bash
# Generate migration
pnpm --filter @repo/database-schema db:generate

# Apply migration
pnpm --filter @repo/database-schema db:migrate

# Check migration status
pnpm --filter @repo/database-schema db:status
```

### Database Verification Queries

```sql
-- Verify table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'wishlist_items';

-- Verify columns (expect 19 rows)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'wishlist_items'
ORDER BY ordinal_position;

-- Verify indexes (expect 5 rows)
SELECT indexname FROM pg_indexes WHERE tablename = 'wishlist_items';

-- Verify enums
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'wishlist_store'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'wishlist_currency'::regtype;

-- Verify constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'wishlist_items'::regclass;
```

### Test Constraint Behavior

```sql
-- Should FAIL (priority > 5)
INSERT INTO wishlist_items (user_id, title, store, priority)
VALUES ('test-user', 'Test Item', 'LEGO', 10);

-- Should SUCCEED (priority in range)
INSERT INTO wishlist_items (user_id, title, store, priority)
VALUES ('test-user', 'Test Item', 'LEGO', 3);

-- Clean up test data
DELETE FROM wishlist_items WHERE user_id = 'test-user';
```

### Lint/Typecheck

Not applicable - no TypeScript code changes

## Stop Conditions / Blockers

None identified. All requirements are clear:
- Schema is fully defined in WISH-2000
- Drizzle tooling is installed and configured
- Database connection details are in `.env.local`

## Architectural Decisions

None required - using established Drizzle migration workflow with no deviations.

## Worker Token Summary

- Input: ~3500 tokens (story files, schema file, drizzle config, package.json)
- Output: ~1400 tokens (IMPLEMENTATION-PLAN.md)
