# Story wish-2007: Run Wishlist Schema Migration

## Status

Approved

## Story

**As a** developer,
**I want** to apply the wishlist schema migration to the database,
**so that** the wishlist_items table matches the Epic 6 PRD data model.

## Dependencies

- wish-2000: Database Schema & Shared Types (completed)

## Acceptance Criteria

1. Migration 0005_wishlist_schema_update.sql applies successfully
2. Existing wishlist data is migrated correctly
3. All new columns exist with correct types and defaults
4. Old columns are removed
5. New indexes are created
6. No data loss during migration

## Tasks / Subtasks

### Task 1: Apply Migration

- [ ] Ensure database connection is available
- [ ] Run `pnpm db:migrate` from apps/api directory
- [ ] Verify migration completes without errors

### Task 2: Verify Schema

- [ ] Confirm new columns exist: store, setNumber, sourceUrl, price, currency, pieceCount, releaseDate, tags, priority, notes
- [ ] Confirm sortOrder is now integer type
- [ ] Confirm old columns removed: description, productLink, category, imageWidth, imageHeight
- [ ] Verify indexes created: idx_wishlist_user_sort, idx_wishlist_user_store, idx_wishlist_user_priority

### Task 3: Verify Data Migration

- [ ] Check existing items have store populated (defaulted to 'LEGO' or migrated from category)
- [ ] Check description values migrated to notes
- [ ] Check productLink values migrated to sourceUrl
- [ ] Check sortOrder converted from timestamp strings to sequential integers

## Dev Notes

### Migration File

The migration is located at:
```
apps/api/core/database/migrations/app/0005_wishlist_schema_update.sql
```

### Migration Steps

1. Add new columns with defaults
2. Migrate data from old columns to new columns
3. Convert sortOrder from text to integer
4. Drop old columns
5. Set NOT NULL constraints
6. Create new indexes

### Rollback

If needed, the migration can be rolled back by:
1. Re-adding old columns
2. Migrating data back
3. Dropping new columns

## Testing

- [ ] Migration applies without errors
- [ ] Existing wishlist items still accessible via API
- [ ] New API endpoints work with updated schema
- [ ] No 500 errors in CloudWatch logs

## Definition of Done

- [ ] Migration applied successfully
- [ ] Schema verified in database
- [ ] Data migration verified
- [ ] API tested with new schema

## Change Log

| Date       | Version | Description                     | Author    |
| ---------- | ------- | ------------------------------- | --------- |
| 2025-12-27 | 0.1     | Split from wish-2000            | Dev Agent |
