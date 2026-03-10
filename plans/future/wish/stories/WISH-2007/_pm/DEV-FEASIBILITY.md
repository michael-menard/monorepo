# Dev Feasibility Review - WISH-2007: Run Migration

## Feasibility Summary
- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Drizzle migration system is well-established in the codebase. WISH-2000 schema is complete and approved. Migration is straightforward table creation with no data transformation or complex logic.

## Likely Change Surface (Core Only)

### Packages Affected
- `packages/backend/database-schema/` - Migration file generation and application
  - `src/migrations/app/` - New migration file
  - `src/migrations/app/meta/` - Migration metadata
  - `drizzle.config.ts` - Configuration (no changes needed)

### Commands Required
- `pnpm --filter @repo/database-schema db:generate` - Generate migration from schema
- `pnpm --filter @repo/database-schema db:migrate` - Apply migration to database

### Critical Deploy Touchpoints
- Local development database
- Staging database (if applicable)
- Production Aurora PostgreSQL database
- Database connection configuration (`.env.local`, `.env`)

## MVP-Critical Risks

### Risk 1: Migration Already Exists from Previous Attempts
- **Why it blocks MVP**: If `wishlist_items` table already exists (from manual testing or previous migration attempts), Drizzle will detect schema drift
- **Required mitigation**:
  - Before generating migration: Check current database state
  - Document "clean state" procedure: Drop table if exists during development
  - For production: Coordinate with ops to ensure clean migration path

### Risk 2: Enum Definitions Must Match WISH-2000 Exactly
- **Why it blocks MVP**: PostgreSQL enums are immutable after creation. If `wishlist_store` or `wishlist_currency` enums are created with wrong values, they cannot be easily modified
- **Required mitigation**:
  - Code review MUST verify enum values match WISH-2000 spec exactly:
    - `wishlist_store`: LEGO, Barweer, Cata, BrickLink, Other
    - `wishlist_currency`: USD, EUR, GBP, CAD, AUD
  - Schema verification test in WISH-2000 test suite

### Risk 3: Index Creation Performance
- **Why it blocks MVP**: Index creation locks the table. On empty table this is fast, but if migration runs after data exists, it could cause downtime
- **Required mitigation**:
  - MUST run WISH-2007 migration BEFORE any data is inserted (strict dependency enforcement)
  - For production rollout: Consider `CREATE INDEX CONCURRENTLY` if table has data
  - Document index creation as blocking operation

## Missing Requirements for MVP
None. Story scope is complete and unambiguous.

## MVP Evidence Expectations

### Proof of Migration Success
1. **Migration file generated**:
   - File exists at `packages/backend/database-schema/src/migrations/app/0007_*.sql`
   - Metadata files updated in `meta/` directory
2. **Local database verification**:
   - SQL query showing table exists: `\d wishlist_items`
   - All 19 columns present with correct types
   - 5 indexes created
   - 2 enums created (`wishlist_store`, `wishlist_currency`)
   - 1 check constraint created (`priority_range_check`)
3. **Rollback verification**:
   - Rollback script tested in local environment
   - Table and enums removed cleanly
4. **CI/deploy checkpoints**:
   - TypeScript compilation passes (schema imports work)
   - No breaking changes to existing tests
   - Migration runs successfully in CI environment (if applicable)

### Critical CI/Deploy Checkpoints
- Database schema linting (Drizzle validation)
- TypeScript compilation of database-schema package
- Integration test environment can run migration
- Migration is idempotent (re-running doesn't fail)
