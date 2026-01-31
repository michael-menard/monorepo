# Wishlist Schema Evolution Strategy

## Overview

This document describes the schema evolution strategy for the `wishlist_items` table, including migration procedures, backward compatibility guidelines, and rollback procedures.

## Current Schema Version

- **Initial Version**: WISH-2000 (Database Schema and Types)
- **Migration Story**: WISH-2007 (Run Migration)

## Schema Change Process

### 1. Pre-Change Requirements

Before making schema changes:

1. **Document the change** in the story description
2. **Assess impact** on existing data and queries
3. **Plan backward compatibility** if the change is breaking
4. **Create rollback procedure** before applying

### 2. Change Categories

| Category | Examples | Approach |
|----------|----------|----------|
| Additive | New column, new index | Forward-compatible, no downtime |
| Modifying | Change column type, add constraint | May require migration window |
| Destructive | Remove column, drop table | Requires careful planning |

### 3. Drizzle Migration Workflow

```bash
# Generate migration from schema changes
pnpm drizzle-kit generate

# Review generated SQL in migrations/
ls packages/backend/database-schema/src/migrations/app/

# Apply migrations
pnpm drizzle-kit push
```

## Backward Compatibility Guidelines

### Adding New Columns

1. **Make nullable** initially to avoid breaking inserts
2. **Add default values** where appropriate
3. **Backfill data** before making column required

Example:
```typescript
// Step 1: Add nullable column
newField: text('new_field'), // nullable

// Step 2: After data migration, if needed:
newField: text('new_field').notNull().default(''),
```

### Adding Constraints

1. **Validate existing data** before adding constraint
2. **Fix invalid data** or handle exceptions
3. **Add constraint** in separate migration

Example for check constraint:
```sql
-- First, identify any violating rows
SELECT id FROM wishlist_items WHERE priority < 0 OR priority > 5;

-- Fix violations
UPDATE wishlist_items SET priority = 0 WHERE priority < 0;
UPDATE wishlist_items SET priority = 5 WHERE priority > 5;

-- Then add constraint
ALTER TABLE wishlist_items ADD CONSTRAINT priority_range_check
  CHECK (priority >= 0 AND priority <= 5);
```

### Modifying Column Types

1. **Create new column** with desired type
2. **Migrate data** from old to new column
3. **Update application** to use new column
4. **Drop old column** after verification period

## Rollback Procedures

### Before Migration

1. Take database backup
2. Document current schema state
3. Prepare rollback SQL

### Rollback Steps

```bash
# Option 1: Drizzle rollback (if supported)
pnpm drizzle-kit drop

# Option 2: Manual rollback
psql -f rollback/WISH-2000-rollback.sql
```

### Rollback SQL Template

```sql
-- WISH-2000 Rollback SQL
-- Generated: <timestamp>

-- Remove check constraint
ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS priority_range_check;

-- Remove composite index
DROP INDEX IF EXISTS idx_wishlist_user_store_priority;

-- Remove audit columns
ALTER TABLE wishlist_items DROP COLUMN IF EXISTS created_by;
ALTER TABLE wishlist_items DROP COLUMN IF EXISTS updated_by;

-- Revert store column to text (from enum)
-- Note: This is destructive - enum values will be lost
ALTER TABLE wishlist_items
  ALTER COLUMN store TYPE text USING store::text;

-- Drop enums
DROP TYPE IF EXISTS wishlist_store;
DROP TYPE IF EXISTS wishlist_currency;
```

## Testing Schema Changes

### Local Testing

1. Run migrations against local database
2. Execute test suite
3. Verify data integrity

### Pre-Production Testing

1. Apply to staging environment
2. Run integration tests
3. Verify application compatibility

## Version History

| Version | Story | Changes | Date |
|---------|-------|---------|------|
| 1.0 | WISH-2000 | Initial schema with enums, constraints, audit fields | 2026-01-27 |

## Contact

For schema questions, contact the platform team or refer to the WISH epic documentation.
