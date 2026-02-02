# Enum Modification Runbook

> Procedures for safely modifying PostgreSQL ENUMs in the LEGO MOC Instructions Platform

**Document Version:** 1.0.0
**Effective Date:** 2026-02-01
**Story Reference:** WISH-2057
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [PostgreSQL Enum Constraints](#2-postgresql-enum-constraints)
3. [Adding Enum Values](#3-adding-enum-values)
4. [Code Deployment Order](#4-code-deployment-order)
5. [Rollback Procedures](#5-rollback-procedures)
6. [Enum Value Removal](#6-enum-value-removal)
7. [Migration to Lookup Tables](#7-migration-to-lookup-tables)
8. [Troubleshooting](#8-troubleshooting)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

### Purpose

PostgreSQL ENUMs provide type-safe value constraints but have unique limitations:
- Values **cannot be removed** once added
- Values **cannot be renamed** directly
- `ADD VALUE` **cannot run inside a transaction**
- Changes are **immediately permanent**

This runbook provides safe procedures for all enum modifications.

### Current Enums

```sql
-- From WISH-2007
CREATE TYPE wishlist_store AS ENUM ('LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other');
CREATE TYPE wishlist_currency AS ENUM ('USD', 'EUR', 'GBP', 'CAD', 'AUD');
```

### When to Use This Runbook

- Adding a new store option (e.g., 'Amazon')
- Adding a new currency (e.g., 'JPY')
- Deprecating an existing enum value
- Planning migration from enum to lookup table

---

## 2. PostgreSQL Enum Constraints

### What You CAN Do

| Operation | Syntax | PostgreSQL Version |
|-----------|--------|-------------------|
| Add value at end | `ALTER TYPE enum_name ADD VALUE 'new_value'` | 9.1+ |
| Add value at position | `ALTER TYPE enum_name ADD VALUE 'new_value' AFTER 'existing'` | 9.1+ |
| Add idempotently | `ALTER TYPE enum_name ADD VALUE IF NOT EXISTS 'new_value'` | 9.3+ |
| Query values | `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'enum_name'::regtype` | Any |

### What You CANNOT Do

| Operation | Reason | Workaround |
|-----------|--------|------------|
| Remove value | PostgreSQL limitation | Deprecate at application level, migrate data |
| Rename value | PostgreSQL limitation | Add new value, migrate data, deprecate old |
| Reorder values | Values ordered by creation | N/A - order fixed at creation |
| ADD VALUE in transaction | PostgreSQL limitation | Execute outside BEGIN/COMMIT |
| Rollback ADD VALUE | Immediately permanent | Cannot undo - plan carefully |

### Critical Warning

```
ADD VALUE is IRREVERSIBLE. Once executed, the value permanently exists in the enum.
There is no DROP VALUE command in PostgreSQL.
```

---

## 3. Adding Enum Values

### 3.1 Pre-Addition Checklist

Before adding an enum value:

- [ ] **Business justification** documented (why is this value needed?)
- [ ] **Value doesn't exist** (query to confirm)
- [ ] **Team notified** (this cannot be undone)
- [ ] **Backend code ready** (Zod schema, TypeScript types updated)
- [ ] **Frontend code ready** (dropdowns, validation updated)
- [ ] **Deployment window** scheduled if needed

### 3.2 Step-by-Step Procedure

**Step 1: Verify Current State**

```sql
-- Check current enum values
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;

-- Expected output:
-- enumlabel  | enumsortorder
-- -----------+--------------
-- LEGO       | 1
-- Barweer    | 2
-- Cata       | 3
-- BrickLink  | 4
-- Other      | 5
```

**Step 2: Add the Enum Value**

```sql
-- IMPORTANT: This must run OUTSIDE a transaction block
-- Do NOT wrap in BEGIN/COMMIT

-- Option A: Add at end
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';

-- Option B: Add at specific position
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon' AFTER 'BrickLink';
```

**Step 3: Verify Addition**

```sql
-- Confirm new value exists
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = 'wishlist_store'::regtype
ORDER BY enumsortorder;

-- Should now include 'Amazon'
```

**Step 4: Test Insertion**

```sql
-- Verify the new value works in actual operations
INSERT INTO wishlist_items (user_id, set_number, store, title)
VALUES ('test-user', '99999', 'Amazon', 'Test Item')
RETURNING id;

-- Clean up test data
DELETE FROM wishlist_items WHERE set_number = '99999' AND store = 'Amazon';
```

**Step 5: Update Application Code**

```typescript
// packages/core/api-client/src/schemas/wishlist.ts
export const WishlistStoreSchema = z.enum([
  'LEGO',
  'Barweer',
  'Cata',
  'BrickLink',
  'Amazon',  // NEW
  'Other',
])
```

### 3.3 Migration File Template

```sql
-- Migration: 0015_add_amazon_store
-- Story: WISH-XXXX
-- Author: developer-name
-- Date: 2026-XX-XX
-- Type: Non-breaking (adding enum value)
-- Rollback: Cannot rollback - enum values are permanent

-- NOTE: This statement cannot run inside a transaction block
-- Drizzle will execute this outside of BEGIN/COMMIT automatically

ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon' AFTER 'BrickLink';
```

### 3.4 Idempotency Pattern

Always use `IF NOT EXISTS` to make migrations idempotent:

```sql
-- SAFE: Can run multiple times without error
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';

-- UNSAFE: Will error if value already exists
ALTER TYPE wishlist_store ADD VALUE 'Amazon';
-- ERROR: enum label "Amazon" already exists
```

---

## 4. Code Deployment Order

### 4.1 Critical Principle

```
DATABASE CHANGE MUST COME BEFORE CODE THAT USES IT
```

If code tries to use an enum value that doesn't exist, PostgreSQL will reject it:
```
ERROR: invalid input value for enum wishlist_store: "Amazon"
```

### 4.2 Deployment Sequence

```
Phase 1: Database Migration
├── Add enum value to PostgreSQL
├── Value now exists but unused
└── Old code continues to work (ignores new value)

Phase 2: Backend Deployment
├── Deploy backend with new Zod schema
├── API can now accept new enum value
└── Old frontend still works (doesn't send new value)

Phase 3: Frontend Deployment
├── Deploy frontend with updated dropdowns
├── Users can now select new value
└── Full feature available
```

### 4.3 Multi-Environment Coordination

| Environment | Action | Timing |
|-------------|--------|--------|
| Local | Test enum addition | Development |
| CI | Verify migration | PR |
| Staging | Deploy and test | Pre-production |
| Production | Coordinated deployment | Scheduled window |

### 4.4 Rollout Example Timeline

```
Day 1, 10:00 AM - Database migration deployed to production
Day 1, 10:05 AM - Verify enum value exists
Day 1, 10:15 AM - Backend deployment begins
Day 1, 10:30 AM - Backend deployment complete, API accepts new value
Day 1, 11:00 AM - Frontend deployment begins
Day 1, 11:15 AM - Frontend deployment complete, users can select new value
```

---

## 5. Rollback Procedures

### 5.1 The Hard Truth

```
PostgreSQL does not support removing enum values.
Once added, a value is PERMANENT.
```

### 5.2 Pre-Migration Rollback (Prevent Addition)

If issues discovered BEFORE running the migration:

1. **Do not run the migration**
2. Remove migration file from PR
3. Fix issues
4. Re-submit when ready

### 5.3 Post-Migration Rollback (Value Added)

If issues discovered AFTER the enum value was added:

**Strategy A: Application-Level Exclusion (Recommended)**

```typescript
// Exclude value from frontend dropdowns
const AVAILABLE_STORES = ['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'] as const
// Note: 'Amazon' intentionally excluded

// Reject in API validation
const StoreInputSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
```

**Strategy B: Backend Blocking**

```typescript
// Middleware to reject the value
if (input.store === 'Amazon') {
  throw new ValidationError('Amazon store is temporarily unavailable')
}
```

**Strategy C: Document as Deprecated**

```sql
-- Add comment documenting deprecation
COMMENT ON TYPE wishlist_store IS
  'Available stores. Note: Amazon is deprecated as of 2026-02-01, do not use.';
```

### 5.4 Rollback Decision Matrix

| Scenario | Rollback Possible? | Action |
|----------|-------------------|--------|
| Migration not yet run | Yes | Don't run migration |
| Migration run, no data uses value | Value exists but harmless | Exclude from UI/API |
| Migration run, data uses value | Value in use | Must keep, fix forward |
| Application code uses value | Code deployed | Roll back code, then exclude value |

---

## 6. Enum Value Removal

### 6.1 Why You Cannot Remove Values

PostgreSQL ENUMs are implemented as system catalog entries. The database guarantees referential integrity - if a row contains an enum value, that value must exist in the enum definition.

```sql
-- This command does not exist in PostgreSQL:
-- ALTER TYPE wishlist_store DROP VALUE 'Barweer';  -- NOT VALID SQL
```

### 6.2 Soft Deprecation (Recommended)

Instead of removing, deprecate the value at the application level:

**Phase 1: Stop New Usage**

```typescript
// Remove from Zod schema for input validation
const StoreInputSchema = z.enum(['LEGO', 'Cata', 'BrickLink', 'Other'])
// Note: 'Barweer' removed - API will reject new items with this value

// Keep in output schema for existing data
const StoreOutputSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
```

**Phase 2: Migrate Existing Data**

```sql
-- Update existing items to use alternative value
BEGIN;
  UPDATE wishlist_items
  SET
    store = 'Other',
    notes = COALESCE(notes, '') || E'\n[Migrated from Barweer store - ' || NOW() || ']'
  WHERE store = 'Barweer';

  -- Verify no items remain
  SELECT COUNT(*) FROM wishlist_items WHERE store = 'Barweer';
  -- Should return 0
COMMIT;
```

**Phase 3: Document Deprecation**

```sql
COMMENT ON TYPE wishlist_store IS
  'Store types. DEPRECATED VALUES: Barweer (migrated to Other on 2026-02-01)';
```

### 6.3 Hard Removal (Last Resort)

If you absolutely must remove an enum value (rare), use this multi-phase migration:

```sql
-- WARNING: This is complex and risky. Only use if absolutely necessary.

-- Step 1: Create new enum without the value
CREATE TYPE wishlist_store_new AS ENUM ('LEGO', 'Cata', 'BrickLink', 'Other');

-- Step 2: Add new column with new enum type
ALTER TABLE wishlist_items ADD COLUMN store_new wishlist_store_new;

-- Step 3: Migrate data (handle the removed value)
UPDATE wishlist_items
SET store_new = CASE
  WHEN store = 'Barweer' THEN 'Other'::wishlist_store_new
  ELSE store::text::wishlist_store_new
END;

-- Step 4: Make new column NOT NULL
ALTER TABLE wishlist_items ALTER COLUMN store_new SET NOT NULL;

-- Step 5: Drop old column
ALTER TABLE wishlist_items DROP COLUMN store;

-- Step 6: Rename new column
ALTER TABLE wishlist_items RENAME COLUMN store_new TO store;

-- Step 7: Drop old enum
DROP TYPE wishlist_store;

-- Step 8: Rename new enum
ALTER TYPE wishlist_store_new RENAME TO wishlist_store;
```

### 6.4 Deprecation Timeline

| Phase | Duration | Actions |
|-------|----------|---------|
| Announce | Day 0 | Document deprecation, notify team |
| Soft block | Week 1 | Remove from UI, reject in API |
| Data migration | Week 2 | Migrate existing data to replacement |
| Monitoring | Week 3-4 | Verify no new usage, monitor errors |
| Final | Week 5+ | Value remains in enum but unused |

---

## 7. Migration to Lookup Tables

### 7.1 When to Migrate

Consider migrating from ENUMs to lookup tables when:

| Trigger | Threshold |
|---------|-----------|
| Total enum values | > 20 values |
| Deprecated values | > 5 deprecated |
| Change frequency | > 4 changes per year |
| Need to remove values | Any time |
| Need metadata | Display names, sort order, icons |
| User-defined values | Users can add their own |

### 7.2 Trade-offs

| ENUMs | Lookup Tables |
|-------|---------------|
| Database-enforced constraints | Application-enforced (with FK) |
| Compile-time type safety | Runtime validation |
| Cannot remove values | Full CRUD operations |
| Simple schema | Additional table + joins |
| No metadata | Can store display name, icon, etc. |
| Fast (no join) | Slightly slower (join required) |

### 7.3 Migration Script

```sql
-- Migration: 0020_enum_to_lookup_table
-- Story: WISH-XXXX
-- Type: BREAKING (requires code changes)

-- Step 1: Create lookup table
CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Step 2: Populate with current enum values
INSERT INTO stores (id, display_name, sort_order, is_active) VALUES
  ('LEGO', 'LEGO', 1, true),
  ('Barweer', 'Barweer', 2, false),  -- Deprecated
  ('Cata', 'Cata', 3, true),
  ('BrickLink', 'BrickLink', 4, true),
  ('Amazon', 'Amazon', 5, true),
  ('Other', 'Other', 99, true);

-- Step 3: Add new column with foreign key
ALTER TABLE wishlist_items ADD COLUMN store_id TEXT;

-- Step 4: Migrate data
UPDATE wishlist_items SET store_id = store::text;

-- Step 5: Add foreign key constraint
ALTER TABLE wishlist_items
  ADD CONSTRAINT fk_wishlist_store
  FOREIGN KEY (store_id) REFERENCES stores(id);

-- Step 6: Make NOT NULL
ALTER TABLE wishlist_items ALTER COLUMN store_id SET NOT NULL;

-- Step 7: Drop old enum column (AFTER code deployment)
-- ALTER TABLE wishlist_items DROP COLUMN store;
-- DROP TYPE wishlist_store;
```

---

## 8. Troubleshooting

### Error: "cannot run inside a transaction block"

**Cause:** `ALTER TYPE ... ADD VALUE` was executed inside `BEGIN/COMMIT`.

**Solution:** Run outside transaction:
```sql
-- Correct: no transaction wrapper
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
```

### Error: "enum label already exists"

**Cause:** Value already exists, no `IF NOT EXISTS` used.

**Solution:** Use idempotent syntax:
```sql
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
```

### Error: "invalid input value for enum"

**Cause:** Application code uses value not in enum.

**Solution:** Add enum value BEFORE deploying code:
```sql
-- Run this first
ALTER TYPE wishlist_store ADD VALUE IF NOT EXISTS 'Amazon';
-- Then deploy code that uses 'Amazon'
```

### Enum value not showing in application

**Cause:** Code not updated with new value.

**Solution:** Update Zod schema and regenerate types:
```typescript
// Update schema
export const WishlistStoreSchema = z.enum([...existing, 'Amazon'])

// Regenerate types
pnpm check-types
```

### Cannot find enum in database

**Cause:** Looking at wrong database or schema.

**Solution:** Query system catalog:
```sql
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'wishlist_store';
```

---

## 9. Related Documentation

| Document | Description |
|----------|-------------|
| [SCHEMA-EVOLUTION-POLICY.md](./SCHEMA-EVOLUTION-POLICY.md) | Overall schema change governance |
| [SCHEMA-VERSIONING.md](./SCHEMA-VERSIONING.md) | Version numbering and tracking |
| [SCHEMA-CHANGE-SCENARIOS.md](./SCHEMA-CHANGE-SCENARIOS.md) | Common scenario guides |
| [CI-SCHEMA-VALIDATION.md](./CI-SCHEMA-VALIDATION.md) | Automated CI validation |

### External References

- [PostgreSQL CREATE TYPE](https://www.postgresql.org/docs/current/sql-createtype.html)
- [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html)
- [pg_enum System Catalog](https://www.postgresql.org/docs/current/catalog-pg-enum.html)

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Implementation Agent | Initial runbook (WISH-2057) |
