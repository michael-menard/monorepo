# Schema Change Scenarios

> Practical guides for common database schema modifications

**Document Version:** 1.0.0
**Effective Date:** 2026-02-01
**Story Reference:** WISH-2057
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [Scenario: Adding Optional Columns](#2-scenario-adding-optional-columns)
3. [Scenario: Adding Required Columns](#3-scenario-adding-required-columns)
4. [Scenario: Adding Indexes](#4-scenario-adding-indexes)
5. [Scenario: Changing Column Types](#5-scenario-changing-column-types)
6. [Scenario: Dropping Columns](#6-scenario-dropping-columns)
7. [Scenario: Adding Constraints](#7-scenario-adding-constraints)
8. [Decision Matrix](#8-decision-matrix)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

### Purpose

This document provides step-by-step guides for common schema change scenarios. Each scenario includes:
- When to use this pattern
- Step-by-step procedure
- Code examples
- Rollback considerations
- Common pitfalls

### Change Categories

| Category | Risk Level | Examples |
|----------|------------|----------|
| Additive (Safe) | Low | Add optional column, add index |
| Additive (Requires Default) | Medium | Add required column |
| Modifying | High | Change column type, rename |
| Destructive | Critical | Drop column, drop table |

---

## 2. Scenario: Adding Optional Columns

### When to Use

- Adding a new field that existing code doesn't need
- Extending a table with optional metadata
- Preparing for a future feature

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | Low |
| Backward Compatible | Yes |
| Rollback Safe | Yes |
| Requires Code Change | No (initially) |
| Table Lock | Brief (metadata only) |

### Procedure

**Step 1: Write the Migration**

```sql
-- Migration: 0015_add_source_url_column
-- Story: WISH-2100
-- Type: Non-breaking (adding optional column)
-- Rollback: ALTER TABLE wishlist_items DROP COLUMN source_url;

ALTER TABLE wishlist_items
ADD COLUMN source_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN wishlist_items.source_url IS
  'URL where the item was found. Optional field added in WISH-2100.';
```

**Step 2: Update Drizzle Schema**

```typescript
// packages/backend/database-schema/src/schema/wishlist.ts
export const wishlistItems = pgTable('wishlist_items', {
  // ... existing columns
  sourceUrl: text('source_url'),  // NEW: nullable by default
})
```

**Step 3: Update Zod Schema (Optional)**

```typescript
// packages/core/api-client/src/schemas/wishlist.ts
export const WishlistItemSchema = z.object({
  // ... existing fields
  sourceUrl: z.string().url().nullable().optional(),  // NEW
})
```

**Step 4: Apply Migration**

```bash
pnpm --filter @repo/database-schema db:migrate
```

**Step 5: Verify**

```sql
-- Confirm column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wishlist_items' AND column_name = 'source_url';
```

### Rollback

```sql
-- Safe to rollback - drops column and any data in it
ALTER TABLE wishlist_items DROP COLUMN source_url;
```

### Common Pitfalls

- **Forgetting to update TypeScript types**: Run `pnpm check-types`
- **Adding unnecessary constraints**: Keep optional columns truly optional
- **Not documenting the column**: Always add COMMENT ON COLUMN

---

## 3. Scenario: Adding Required Columns

### When to Use

- Adding a field that must have a value for all rows
- Enforcing data integrity for new fields
- Adding business-critical data points

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | Medium |
| Backward Compatible | Depends on default |
| Rollback Safe | Yes |
| Requires Code Change | Maybe |
| Table Lock | Longer (if backfill needed) |

### Pattern A: With Default Value (Recommended)

**Step 1: Add Column with Default**

```sql
-- Migration: 0016_add_status_column
-- Story: WISH-2150
-- Type: Non-breaking (adding required column with default)
-- Rollback: ALTER TABLE wishlist_items DROP COLUMN status;

ALTER TABLE wishlist_items
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Document the default
COMMENT ON COLUMN wishlist_items.status IS
  'Item status. Default: active. Values: active, purchased, archived.';
```

**Why This Works:**
- Existing rows automatically get the default value
- Old code that doesn't provide `status` uses the default
- No backfill migration needed

**Step 2: Update Code**

```typescript
// Update Drizzle schema
status: text('status').notNull().default('active'),

// Update Zod schema
status: z.enum(['active', 'purchased', 'archived']).default('active'),
```

### Pattern B: With Backfill (When Default Not Possible)

When the required value depends on existing data:

**Step 1: Add Nullable Column**

```sql
-- Migration: 0016a_add_priority_nullable
ALTER TABLE wishlist_items ADD COLUMN priority INTEGER;
```

**Step 2: Backfill Data**

```sql
-- Migration: 0016b_backfill_priority
-- Run in batches for large tables

UPDATE wishlist_items
SET priority = CASE
  WHEN store = 'LEGO' THEN 1
  WHEN store = 'BrickLink' THEN 2
  ELSE 3
END
WHERE priority IS NULL;
```

**Step 3: Add NOT NULL Constraint**

```sql
-- Migration: 0016c_make_priority_required
ALTER TABLE wishlist_items ALTER COLUMN priority SET NOT NULL;
```

### Rollback

```sql
-- Pattern A: Safe rollback
ALTER TABLE wishlist_items DROP COLUMN status;

-- Pattern B: Also safe, but backfilled data is lost
ALTER TABLE wishlist_items DROP COLUMN priority;
```

### Common Pitfalls

- **Adding NOT NULL without default on large table**: Scans entire table
- **Not batching backfill**: Can lock table for extended time
- **Deploying code before migration**: Old database rejects new inserts

---

## 4. Scenario: Adding Indexes

### When to Use

- Improving query performance
- Supporting new query patterns
- Enforcing uniqueness

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | Low |
| Backward Compatible | Yes |
| Rollback Safe | Yes |
| Requires Code Change | No |
| Table Lock | **CONCURRENTLY avoids lock** |

### Pattern: CONCURRENTLY Index Creation (Recommended)

**CRITICAL: Always use CONCURRENTLY for production tables**

```sql
-- Migration: 0017_add_user_store_index
-- Story: WISH-2175
-- Type: Non-breaking (adding index)
-- Rollback: DROP INDEX CONCURRENTLY idx_wishlist_user_store;

-- IMPORTANT: CONCURRENTLY prevents table lock during index creation
-- This allows reads and writes to continue during indexing

CREATE INDEX CONCURRENTLY idx_wishlist_user_store
ON wishlist_items (user_id, store);

-- Document the index purpose
COMMENT ON INDEX idx_wishlist_user_store IS
  'Improves performance of user wishlist queries filtered by store.';
```

### Why CONCURRENTLY Matters

| Without CONCURRENTLY | With CONCURRENTLY |
|---------------------|-------------------|
| Acquires table lock | No table lock |
| Blocks all writes | Writes continue |
| Fast but disruptive | Slower but safe |
| OK for small tables | Required for production |

### Unique Index Pattern

```sql
-- Adding unique constraint via index
CREATE UNIQUE INDEX CONCURRENTLY idx_wishlist_user_set_unique
ON wishlist_items (user_id, set_number)
WHERE deleted_at IS NULL;  -- Partial unique index

-- Document
COMMENT ON INDEX idx_wishlist_user_set_unique IS
  'Ensures one active wishlist item per set per user.';
```

### Rollback

```sql
-- Safe rollback - no data loss, only performance change
DROP INDEX CONCURRENTLY idx_wishlist_user_store;
```

### Common Pitfalls

- **Forgetting CONCURRENTLY**: Table locked, production impact
- **Too many indexes**: Slows down writes
- **Wrong column order**: Index (a, b) doesn't help queries on just (b)
- **Not analyzing query patterns**: Index may not be used

### Production Checklist

- [ ] Uses CONCURRENTLY
- [ ] Estimated index size calculated
- [ ] Disk space verified (index adds storage)
- [ ] Off-peak deployment scheduled
- [ ] Monitoring during creation

---

## 5. Scenario: Changing Column Types

### When to Use

- Expanding field capacity (e.g., VARCHAR(50) to VARCHAR(255))
- Changing data type (e.g., TEXT to INTEGER)
- Improving precision (e.g., INTEGER to NUMERIC)

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | **High** |
| Backward Compatible | Usually No |
| Rollback Safe | **Usually No** |
| Requires Code Change | Yes |
| Table Lock | Yes (full table rewrite) |

### Pattern A: Compatible Type Change (Safe)

Some type changes are implicitly compatible:

```sql
-- Safe: Expanding VARCHAR length
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(255);

-- Safe: TEXT to VARCHAR (if data fits)
ALTER TABLE items ALTER COLUMN description TYPE VARCHAR(1000);
```

### Pattern B: Type Change with Cast (Medium Risk)

```sql
-- Migration: 0018_change_price_to_numeric
-- Story: WISH-2200
-- Type: BREAKING (changing column type)
-- Rollback: Not safe - precision may be lost

-- Change from INTEGER (cents) to NUMERIC (dollars with cents)
ALTER TABLE wishlist_items
ALTER COLUMN price TYPE NUMERIC(10, 2)
USING (price::NUMERIC / 100);  -- Convert cents to dollars

-- Document the change
COMMENT ON COLUMN wishlist_items.price IS
  'Price in dollars with cents (was integer cents before WISH-2200).';
```

### Pattern C: New Column Migration (Safest for Breaking Changes)

For complex type changes, use a migration pattern:

**Phase 1: Add New Column**

```sql
-- Migration: 0018a_add_price_v2
ALTER TABLE wishlist_items ADD COLUMN price_v2 NUMERIC(10, 2);
```

**Phase 2: Backfill Data**

```sql
-- Migration: 0018b_backfill_price_v2
UPDATE wishlist_items
SET price_v2 = price::NUMERIC / 100
WHERE price_v2 IS NULL;
```

**Phase 3: Deploy Code Using New Column**

```typescript
// Update code to read from price_v2
const price = item.price_v2 ?? item.price / 100
```

**Phase 4: Make New Column Required**

```sql
-- Migration: 0018c_make_price_v2_required
ALTER TABLE wishlist_items ALTER COLUMN price_v2 SET NOT NULL;
```

**Phase 5: Drop Old Column (After Compatibility Window)**

```sql
-- Migration: 0018d_drop_old_price
ALTER TABLE wishlist_items DROP COLUMN price;
ALTER TABLE wishlist_items RENAME COLUMN price_v2 TO price;
```

### Rollback Considerations

```
Type change rollback is often NOT SAFE:
- Data may not fit in original type
- Precision may be lost
- Application code may depend on new type

Strategy: Plan forward, not backward
```

### Common Pitfalls

- **Not testing with production-like data**: Edge cases in data
- **Forgetting USING clause**: Cast may fail
- **Table locked during rewrite**: Plan maintenance window
- **Code/schema mismatch**: Deploy code after migration

---

## 6. Scenario: Dropping Columns

### When to Use

- Removing deprecated fields
- Cleaning up after migration to new structure
- Reducing storage footprint

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | **Critical** |
| Backward Compatible | **No** |
| Rollback Safe | **No** (data lost) |
| Requires Code Change | **Yes** |
| Table Lock | Yes |

### Required: Deprecation Period

**NEVER drop a column without a deprecation period**

```
Timeline:
Week 1: Mark column as deprecated in code/docs
Week 2: Remove all code references to column
Week 3: Verify no queries use column
Week 4+: Drop column
```

### Procedure

**Step 1: Deprecation Notice (Week 1)**

```sql
-- Add deprecation comment
COMMENT ON COLUMN wishlist_items.old_field IS
  'DEPRECATED as of 2026-02-01. Will be dropped on 2026-03-01. See WISH-2250.';
```

```typescript
// Add TypeScript deprecation
interface WishlistItem {
  /** @deprecated Will be removed in WISH-2250. Use newField instead. */
  oldField?: string
  newField: string
}
```

**Step 2: Remove Code References (Week 2)**

- Remove all SELECT statements using column
- Remove all INSERT/UPDATE statements setting column
- Update all tests
- Search codebase: `grep -r "old_field" --include="*.ts"`

**Step 3: Verify No Usage (Week 3)**

```sql
-- Check for recent queries using column (if query logging enabled)
-- Or add application logging to detect usage

-- Verify column is only NULL (if applicable)
SELECT COUNT(*) FROM wishlist_items WHERE old_field IS NOT NULL;
```

**Step 4: Tombstone Documentation**

```markdown
## Dropped Columns

| Column | Table | Dropped | Reason | Story |
|--------|-------|---------|--------|-------|
| old_field | wishlist_items | 2026-03-01 | Replaced by new_field | WISH-2250 |
```

**Step 5: Drop Migration**

```sql
-- Migration: 0025_drop_old_field
-- Story: WISH-2250
-- Type: BREAKING (dropping column)
-- Rollback: NOT SAFE - data permanently lost
-- Deprecation: Column marked deprecated 2026-02-01

-- DEPRECATED: old_field removed per deprecation timeline
-- See WISH-2250 for migration details

ALTER TABLE wishlist_items DROP COLUMN old_field;
```

### Rollback

```
ROLLBACK IS NOT POSSIBLE after DROP COLUMN
- Data is permanently deleted
- Must restore from backup if needed

Prevention:
- Long deprecation period
- Verify no usage before dropping
- Take backup before migration
```

### Common Pitfalls

- **Dropping too soon**: Code still references column
- **Not documenting dropped columns**: Future confusion
- **No backup**: Cannot recover if needed
- **Forgetting related indexes/constraints**: May need to drop first

---

## 7. Scenario: Adding Constraints

### When to Use

- Enforcing data integrity rules
- Preventing invalid data at database level
- Adding CHECK, UNIQUE, or FOREIGN KEY constraints

### Characteristics

| Property | Value |
|----------|-------|
| Risk Level | Medium |
| Backward Compatible | Depends on existing data |
| Rollback Safe | Yes |
| Requires Code Change | Maybe |
| Table Lock | Yes (validates all rows) |

### Pattern: Adding CHECK Constraint

**Step 1: Verify Existing Data**

```sql
-- Find violations BEFORE adding constraint
SELECT id, priority
FROM wishlist_items
WHERE priority < 0 OR priority > 5;

-- If violations exist, fix them first
UPDATE wishlist_items SET priority = 0 WHERE priority < 0;
UPDATE wishlist_items SET priority = 5 WHERE priority > 5;
```

**Step 2: Add Constraint**

```sql
-- Migration: 0020_add_priority_constraint
-- Story: WISH-2300
-- Type: Non-breaking (constraint on valid data)
-- Rollback: ALTER TABLE wishlist_items DROP CONSTRAINT priority_range_check;

ALTER TABLE wishlist_items
ADD CONSTRAINT priority_range_check
CHECK (priority >= 0 AND priority <= 5);

COMMENT ON CONSTRAINT priority_range_check ON wishlist_items IS
  'Priority must be between 0 (lowest) and 5 (highest).';
```

### Pattern: Adding UNIQUE Constraint

```sql
-- First check for duplicates
SELECT user_id, set_number, COUNT(*)
FROM wishlist_items
WHERE deleted_at IS NULL
GROUP BY user_id, set_number
HAVING COUNT(*) > 1;

-- Resolve duplicates (merge or delete)
-- Then add constraint
ALTER TABLE wishlist_items
ADD CONSTRAINT unique_user_set
UNIQUE (user_id, set_number);
```

### Pattern: Adding FOREIGN KEY Constraint

```sql
-- Verify referential integrity first
SELECT wi.id
FROM wishlist_items wi
LEFT JOIN users u ON wi.user_id = u.id
WHERE u.id IS NULL;

-- Add foreign key
ALTER TABLE wishlist_items
ADD CONSTRAINT fk_wishlist_user
FOREIGN KEY (user_id) REFERENCES users(id);
```

### NOT VALID Option (For Large Tables)

```sql
-- Add constraint without validating existing rows
-- Useful for large tables - validates new rows only
ALTER TABLE wishlist_items
ADD CONSTRAINT priority_range_check
CHECK (priority >= 0 AND priority <= 5)
NOT VALID;

-- Later, validate existing rows (can run during low traffic)
ALTER TABLE wishlist_items
VALIDATE CONSTRAINT priority_range_check;
```

### Rollback

```sql
-- Constraints can be safely dropped
ALTER TABLE wishlist_items DROP CONSTRAINT priority_range_check;
```

### Common Pitfalls

- **Adding constraint without checking data**: Migration fails
- **Not using NOT VALID for large tables**: Long lock
- **Forgetting to validate later**: Constraint partially enforced
- **Not updating application validation**: Mismatched rules

---

## 8. Decision Matrix

### Quick Reference: What Pattern to Use?

| Change | Pattern | Risk | Lock Time | Rollback |
|--------|---------|------|-----------|----------|
| Add optional column | Direct ALTER | Low | Brief | Safe |
| Add required column with default | Direct ALTER | Low | Brief | Safe |
| Add required column (computed) | Multi-phase | Medium | Varies | Safe |
| Add index | CONCURRENTLY | Low | None | Safe |
| Add unique index | CONCURRENTLY + check | Medium | None | Safe |
| Add CHECK constraint | Verify + ALTER | Medium | Table scan | Safe |
| Add FOREIGN KEY | Verify + ALTER | Medium | Table scan | Safe |
| Change column type (compatible) | Direct ALTER | Low | Brief | Usually safe |
| Change column type (incompatible) | Multi-phase migration | High | Long | Not safe |
| Drop column | Deprecate + ALTER | Critical | Brief | **Not safe** |
| Rename column | Not recommended | Critical | Brief | Partial |

### Production Deployment Timing

| Risk Level | When to Deploy |
|------------|----------------|
| Low | Any time, normal deployment |
| Medium | Off-peak hours, monitor closely |
| High | Scheduled maintenance window |
| Critical | Planned downtime or blue-green |

### Lock Duration Guidelines

| Operation | Expected Lock Time |
|-----------|-------------------|
| Add nullable column | < 1 second |
| Add column with default | < 1 second |
| Create index CONCURRENTLY | No lock (background) |
| Add constraint | Proportional to table size |
| Change column type | Full table rewrite |
| Drop column | < 1 second |

---

## 9. Related Documentation

| Document | Description |
|----------|-------------|
| [SCHEMA-EVOLUTION-POLICY.md](./SCHEMA-EVOLUTION-POLICY.md) | Approval process and governance |
| [ENUM-MODIFICATION-RUNBOOK.md](./ENUM-MODIFICATION-RUNBOOK.md) | Enum-specific procedures |
| [SCHEMA-VERSIONING.md](./SCHEMA-VERSIONING.md) | Version numbering and tracking |
| [CI-SCHEMA-VALIDATION.md](./CI-SCHEMA-VALIDATION.md) | Automated CI validation |

### External References

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Implementation Agent | Initial scenarios guide (WISH-2057) |
