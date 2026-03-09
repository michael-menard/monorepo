# Test Plan - WISH-2007: Run Migration

## Scope Summary
- **Endpoints touched**: None (database migration only)
- **UI touched**: No
- **Data/storage touched**: Yes - creates `wishlist_items` table

## Happy Path Tests

### Test 1: Fresh Migration on Empty Database
- **Setup**:
  - Clean local PostgreSQL database without `wishlist_items` table
  - WISH-2000 schema definition present in codebase
- **Action**:
  - Run `pnpm db:generate` to generate migration file
  - Run `pnpm db:migrate` to apply migration
- **Expected outcome**:
  - Migration completes successfully
  - `wishlist_items` table exists with correct schema
  - All columns match WISH-2000 specification (19 fields)
  - Indexes created: `idx_wishlist_user_id`, `idx_wishlist_user_sort`, `idx_wishlist_user_store`, `idx_wishlist_user_priority`, `idx_wishlist_user_store_priority`
  - Enums created: `wishlist_store`, `wishlist_currency`
  - Check constraint created: `priority_range_check` (0-5)
- **Evidence**:
  - Migration output logs showing success
  - SQL query confirming table structure: `\d wishlist_items`
  - SQL query confirming indexes: `\di wishlist_items*`
  - SQL query confirming enums: `SELECT * FROM pg_type WHERE typname LIKE 'wishlist_%'`

### Test 2: Migration Idempotency
- **Setup**:
  - Database already has `wishlist_items` table from Test 1
- **Action**:
  - Re-run `pnpm db:migrate`
- **Expected outcome**:
  - Migration recognizes table already exists
  - No errors thrown
  - Schema unchanged
- **Evidence**:
  - Migration output showing "no pending migrations" or similar
  - Table structure remains identical to Test 1

### Test 3: Verify Column Types and Constraints
- **Setup**:
  - Migration applied (from Test 1)
- **Action**:
  - Query PostgreSQL catalog to verify column types
  - Attempt INSERT with invalid data (priority = 10)
- **Expected outcome**:
  - All 19 columns present with correct types
  - Priority check constraint rejects invalid values
  - Enums enforce valid store/currency values
- **Evidence**:
  - SQL query results showing column definitions
  - Error message from invalid INSERT showing constraint violation

### Test 4: Verify Indexes Performance
- **Setup**:
  - Migration applied
  - Insert 1000 test wishlist items via seed script
- **Action**:
  - Run EXPLAIN ANALYZE on queries using indexes:
    - `SELECT * FROM wishlist_items WHERE user_id = '...' ORDER BY sort_order`
    - `SELECT * FROM wishlist_items WHERE user_id = '...' AND store = 'LEGO'`
- **Expected outcome**:
  - Index scans used (not sequential scans)
  - Query performance < 10ms
- **Evidence**:
  - EXPLAIN ANALYZE output showing "Index Scan using idx_wishlist_*"

## Error Cases

### Error 1: Migration on Database with Conflicting Schema
- **Setup**:
  - Manually create `wishlist_items` table with different schema (missing priority field)
- **Action**:
  - Run `pnpm db:migrate`
- **Expected outcome**:
  - Migration detects conflict and fails safely
  - Error message indicates schema mismatch
  - Database state unchanged (transaction rollback)
- **Evidence**:
  - Error logs showing migration failure
  - SQL query confirming original table unchanged

### Error 2: Migration with Missing Database Permissions
- **Setup**:
  - PostgreSQL user without CREATE TABLE permission
- **Action**:
  - Run `pnpm db:migrate`
- **Expected outcome**:
  - Migration fails with permission error
  - Clear error message
  - No partial state (transaction rollback)
- **Evidence**:
  - Error logs showing "permission denied"
  - Database unchanged

### Error 3: Migration on Read-Only Database Connection
- **Setup**:
  - Configure database connection with read-only mode
- **Action**:
  - Run `pnpm db:migrate`
- **Expected outcome**:
  - Migration fails before attempting writes
  - Clear error message about read-only connection
- **Evidence**:
  - Error logs showing connection is read-only

## Edge Cases (Reasonable)

### Edge 1: Migration on Database with Partial Indexes
- **Setup**:
  - Manually create `wishlist_items` table without indexes
- **Action**:
  - Run `pnpm db:migrate`
- **Expected outcome**:
  - Migration detects existing table, handles gracefully
  - Either skips or adds missing indexes
- **Evidence**:
  - Migration output logs
  - Index verification query

### Edge 2: Large Data Volume Post-Migration
- **Setup**:
  - Migration applied
  - Insert 100,000 test wishlist items
- **Action**:
  - Run queries using indexes
  - Check index sizes
- **Expected outcome**:
  - Queries remain performant (< 50ms)
  - Indexes scale appropriately
- **Evidence**:
  - EXPLAIN ANALYZE output
  - Index size query: `SELECT pg_size_pretty(pg_total_relation_size('idx_wishlist_user_sort'))`

### Edge 3: Concurrent Migrations
- **Setup**:
  - Two migration processes started simultaneously
- **Action**:
  - Both attempt to run migration
- **Expected outcome**:
  - One succeeds, one waits or fails gracefully
  - No data corruption
  - Final state is consistent
- **Evidence**:
  - Migration logs from both processes
  - Table state verification

## Required Tooling Evidence

### Backend
- **Required `.http` requests**: None (database migration, not API)
- **SQL verification queries**:
  ```sql
  -- Verify table exists
  SELECT table_name FROM information_schema.tables WHERE table_name = 'wishlist_items';

  -- Verify columns
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'wishlist_items';

  -- Verify indexes
  SELECT indexname FROM pg_indexes WHERE tablename = 'wishlist_items';

  -- Verify constraints
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'wishlist_items'::regclass;

  -- Verify enums
  SELECT enumlabel FROM pg_enum WHERE enumtypid = 'wishlist_store'::regtype;
  ```

### Migration Artifacts
- **Migration file location**: `packages/backend/database-schema/src/migrations/app/0007_*.sql`
- **Drizzle metadata**: `packages/backend/database-schema/src/migrations/app/meta/0007_snapshot.json`
- **Journal entry**: `packages/backend/database-schema/src/migrations/app/meta/_journal.json`

### Rollback Plan
- **Rollback script**: Manual SQL or Drizzle rollback command
  ```sql
  DROP TABLE IF EXISTS wishlist_items CASCADE;
  DROP TYPE IF EXISTS wishlist_store CASCADE;
  DROP TYPE IF EXISTS wishlist_currency CASCADE;
  ```
- **Rollback verification**: Confirm table and enums removed

## Risks to Call Out

### Risk 1: Migration Numbering Conflict
- **Issue**: Migration file might conflict with other in-flight migrations
- **Mitigation**: Check `meta/_journal.json` before generating migration, coordinate with team

### Risk 2: Enum Migration Challenges
- **Issue**: PostgreSQL enums are difficult to modify after creation (can't easily add/remove values)
- **Mitigation**: Ensure `wishlist_store` and `wishlist_currency` enums are finalized in WISH-2000 before migration

### Risk 3: Production Downtime
- **Issue**: Creating indexes on large tables can lock the table
- **Mitigation**: For production, consider `CREATE INDEX CONCURRENTLY` (requires manual migration adjustment)

### Risk 4: Rollback Complexity
- **Issue**: If wishlist items are already in production, rollback loses data
- **Mitigation**: Ensure WISH-2007 runs BEFORE any data is written (dependency on WISH-2000 only)

### Risk 5: Database Version Compatibility
- **Issue**: Migration might behave differently on different PostgreSQL versions
- **Mitigation**: Test on same PostgreSQL version as production (Aurora PostgreSQL 14+)
