# PostgreSQL Enum Evolution Guide

> **SUPERSEDED**: This document has been superseded by a comprehensive enum modification runbook.
> Please refer to the following document instead:
>
> - [ENUM-MODIFICATION-RUNBOOK.md](./ENUM-MODIFICATION-RUNBOOK.md) - Complete procedures for enum modifications
>
> Related documentation:
> - [SCHEMA-EVOLUTION-POLICY.md](./SCHEMA-EVOLUTION-POLICY.md) - Approval process and governance
> - [SCHEMA-CHANGE-SCENARIOS.md](./SCHEMA-CHANGE-SCENARIOS.md) - Common scenario guides
>
> **Superseded by:** WISH-2057 (2026-02-01)
> **Status:** Archived for historical reference

---

## Overview

This runbook provides procedures for safely evolving PostgreSQL ENUMs used in the wishlist schema. PostgreSQL ENUMs (`wishlist_store`, `wishlist_currency`) are immutable by design, requiring careful planning for schema evolution.

**Related Stories**:
- WISH-2007: Defines `wishlist_store` and `wishlist_currency` enums
- WISH-2027: This runbook

## PostgreSQL Enum Constraints and Limitations

### What You CAN Do

| Operation | Syntax | Notes |
|-----------|--------|-------|
| Add values at end | `ALTER TYPE wishlist_store ADD VALUE 'Amazon'` | PostgreSQL 10+ |
| Add values at position | `ALTER TYPE wishlist_store ADD VALUE 'Amazon' AFTER 'BrickLink'` | PostgreSQL 10+ |
| Add values idempotently | `ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon'` | PostgreSQL 10+ |
| Query enum values | `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'wishlist_store'::regtype` | Any version |

### What You CANNOT Do

| Operation | Why Not | Workaround |
|-----------|---------|------------|
| Remove enum values | PostgreSQL limitation | Migrate data to another value, document deprecation |
| Rename enum values | PostgreSQL limitation | Add new value, migrate data, document old value as deprecated |
| Reorder existing values | PostgreSQL limitation | N/A - order is set at creation |
| Run `ADD VALUE` in transaction | PostgreSQL limitation | Execute outside transaction block |
| Rollback `ADD VALUE` | PostgreSQL limitation | Cannot undo - plan carefully |

### Current Wishlist Enums

```sql
-- wishlist_store (from WISH-2007)
CREATE TYPE wishlist_store AS ENUM ('LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other');

-- wishlist_currency (from WISH-2007)
CREATE TYPE wishlist_currency AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD');
```

## Safe Enum Addition Procedure

### Step-by-Step Process

**1. Plan the Change**

Before adding a new enum value:
- [ ] Document the business reason for the new value
- [ ] Verify the value doesn't already exist
- [ ] Coordinate with team (this cannot be rolled back)
- [ ] Schedule deployment window if needed

**2. Verify Current State**

```sql
-- Check current enum values
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;
```

**3. Add the Enum Value**

```sql
-- IMPORTANT: This must run OUTSIDE a transaction
-- It will fail inside BEGIN/COMMIT block

ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';

-- Or, to specify position:
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon' AFTER 'BrickLink';
```

**4. Verify the Addition**

```sql
-- Confirm new value exists
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;
```

**5. Test Insertion**

```sql
-- Verify the new value works in actual table operations
INSERT INTO wishlist_items (user_id, set_number, store)
VALUES ('test-user-id', '12345', 'Amazon')
RETURNING id;

-- Clean up test data
DELETE FROM wishlist_items WHERE set_number = '12345' AND store = 'Amazon';
```

### Example Scripts

See `enum-migration-examples/` directory for ready-to-use scripts:
- `add-store-example.sql` - Add new store to wishlist_store
- `add-currency-example.sql` - Add new currency to wishlist_currency

## Idempotency Patterns

### Safe Idempotent Addition

The `IF NOT EXISTS` clause prevents errors when running the same migration multiple times:

```sql
-- Safe to run multiple times
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
```

Without `IF NOT EXISTS`:

```sql
-- Will ERROR if 'Amazon' already exists
ALTER TYPE wishlist_store ADD VALUE 'Amazon';
-- ERROR: enum label "Amazon" already exists
```

### Checking If Value Exists

```sql
-- Check before adding (useful for complex scripts)
SELECT EXISTS (
  SELECT 1 FROM pg_enum
  WHERE enumtypid = 'wishlist_store'::regtype
  AND enumlabel = 'Amazon'
) AS value_exists;
```

## Transaction Semantics

### Critical Limitation

`ALTER TYPE ... ADD VALUE` **cannot run inside a transaction block**:

```sql
-- THIS WILL FAIL
BEGIN;
  ALTER TYPE wishlist_store ADD VALUE 'Amazon';
COMMIT;
-- ERROR: ALTER TYPE ... ADD VALUE cannot run inside a transaction block
```

### Hybrid Approach for Data Migrations

When adding an enum value AND migrating data, use this two-phase approach:

```sql
-- Phase 1: Outside transaction (non-transactional)
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';

-- Phase 2: Inside transaction (transactional, can rollback)
BEGIN;
  UPDATE wishlist_items
  SET store = 'Amazon'
  WHERE source_url LIKE '%amazon.com%';
COMMIT;
```

**Why This Works**:
- Enum addition is permanent (no rollback needed)
- Data migration is protected by transaction
- If data migration fails, enum value still exists but is unused

## Enum Deprecation Procedure (Soft Delete)

PostgreSQL does not support removing enum values. Instead, use this soft-delete pattern:

### Step-by-Step Process

**1. Identify Data Using Deprecated Value**

```sql
SELECT COUNT(*), store
FROM wishlist_items
WHERE store = 'Barweer'
GROUP BY store;
```

**2. Migrate Data to Alternative Value**

```sql
BEGIN;
  -- Update items to use 'Other' store
  UPDATE wishlist_items
  SET
    store = 'Other',
    notes = COALESCE(notes, '') || E'\n[Migrated from Barweer - store discontinued ' || NOW() || ']'
  WHERE store = 'Barweer';

  -- Verify migration
  SELECT COUNT(*) FROM wishlist_items WHERE store = 'Barweer';
  -- Should return 0
COMMIT;
```

**3. Document the Deprecation**

Add to schema documentation and code comments:
- Mark 'Barweer' as deprecated in API documentation
- Update frontend dropdowns to exclude deprecated value
- Add warning in code if deprecated value is used

**4. Verify No New Usage**

Add application-level validation to prevent new items with deprecated store:

```typescript
// In Zod schema (example)
const storeSchema = z.enum(['LEGO', 'Cata', 'BrickLink', 'Other']);
// Note: 'Barweer' intentionally excluded
```

### Example Script

See `enum-migration-examples/deprecate-store-example.sql` for a ready-to-use script.

## Multi-Environment Coordination Checklist

When evolving enums across environments (local, staging, production):

### Pre-Deployment Checklist

- [ ] **Local**: Test enum addition in local dev environment
- [ ] **Local**: Verify application works with new value
- [ ] **Staging**: Apply migration to staging
- [ ] **Staging**: Run integration tests
- [ ] **Staging**: Verify no errors in logs for 24 hours
- [ ] **Production**: Schedule deployment window
- [ ] **Production**: Notify team of schema change

### Deployment Order

```
1. Add enum value to database (all environments in order)
2. Deploy backend code that uses new value
3. Deploy frontend code that displays new value
```

**Why This Order?**
- Database change must happen first (code will fail if enum value doesn't exist)
- Backend deployment enables API to accept new value
- Frontend deployment enables users to select new value

### Rollback Strategy

**You cannot rollback enum additions.** Plan accordingly:

If deployment fails AFTER enum addition:
1. Roll back application code (frontend/backend)
2. The unused enum value remains in database
3. Document the orphaned value
4. Plan removal in future lookup table migration (if needed)

## Rollback Strategy

### The Hard Truth

**PostgreSQL does not support removing enum values.** Once you run:

```sql
ALTER TYPE wishlist_store ADD VALUE 'Amazon';
```

The value 'Amazon' is **permanently** part of the enum. There is no `DROP VALUE` command.

### Mitigation Strategies

**Strategy 1: Careful Planning**

Before adding enum values:
- Test thoroughly in staging
- Coordinate with team
- Ensure backend/frontend are ready
- Have monitoring in place

**Strategy 2: Application-Level Exclusion**

If an enum value should no longer be used:
- Exclude from frontend dropdowns
- Reject in API validation
- Document as deprecated
- The value still exists in database but is unusable

**Strategy 3: Migrate to Lookup Tables**

If enum management becomes problematic:
- Create lookup tables (more flexible)
- Migrate data from enum to text + foreign key
- See `enum-migration-examples/enum-to-table-migration.sql`

## When to Migrate to Lookup Tables

Consider migrating from ENUMs to lookup tables when:

| Trigger | Threshold |
|---------|-----------|
| Total enum values | > 20 values |
| Deprecated values | > 5 deprecated values |
| Change frequency | > 4 changes per year |
| Need to remove values | Any time you need to remove |
| Need user-defined values | Users can add their own stores |

### Trade-offs

| ENUMs | Lookup Tables |
|-------|---------------|
| Database-enforced constraints | Application-enforced constraints |
| Compile-time type safety | Runtime validation |
| Cannot remove values | Full CRUD operations |
| Simple schema | Additional tables/joins |
| No metadata | Can store display names, sort order, etc. |

### Migration Script

See `enum-migration-examples/enum-to-table-migration.sql` for a complete migration script.

## Verification Queries

### Check Enum Values

```sql
-- List all values for wishlist_store
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;

-- List all values for wishlist_currency
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_currency'::regtype
ORDER BY enumsortorder;
```

### Count Usage by Enum Value

```sql
-- Distribution of items by store
SELECT store, COUNT(*) as count
FROM wishlist_items
GROUP BY store
ORDER BY count DESC;

-- Distribution of items by currency
SELECT currency, COUNT(*) as count
FROM wishlist_items
GROUP BY currency
ORDER BY count DESC;
```

### Find Orphaned Data (Sanity Check)

```sql
-- This should always return 0
-- (PostgreSQL enforces enum constraints, but good to verify)
SELECT COUNT(*)
FROM wishlist_items
WHERE store::text NOT IN (
  SELECT enumlabel FROM pg_enum
  WHERE enumtypid = 'wishlist_store'::regtype
);
```

### Enum Definition for pg_dump

When exporting schema, ENUMs are included:

```bash
# Export schema including enums
pg_dump --schema-only --no-owner dbname > schema.sql

# Verify enum in export
grep -A5 "CREATE TYPE wishlist_store" schema.sql
```

## Troubleshooting

### Error: "cannot run inside a transaction block"

**Cause**: You tried to run `ALTER TYPE ... ADD VALUE` inside `BEGIN/COMMIT`.

**Solution**: Run the ALTER TYPE statement outside any transaction:
```sql
-- Correct: no transaction
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
```

### Error: "enum label already exists"

**Cause**: You tried to add a value that already exists without `IF NOT EXISTS`.

**Solution**: Use idempotent syntax:
```sql
-- Correct: won't error if exists
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
```

### Error: "invalid input value for enum"

**Cause**: Application is trying to use an enum value that doesn't exist yet.

**Solution**: Add the enum value to database BEFORE deploying code that uses it:
```sql
-- Step 1: Add to database
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';

-- Step 2: Then deploy code
```

## References

- [PostgreSQL CREATE TYPE documentation](https://www.postgresql.org/docs/current/sql-createtype.html)
- [PostgreSQL ALTER TYPE documentation](https://www.postgresql.org/docs/current/sql-altertype.html)
- [pg_enum system catalog](https://www.postgresql.org/docs/current/catalog-pg-enum.html)

---

**Last Updated**: 2026-01-31
**Story**: WISH-2027
**Author**: Implementation Agent
