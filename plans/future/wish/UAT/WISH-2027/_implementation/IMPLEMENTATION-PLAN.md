# Implementation Plan - WISH-2027

## Summary

Create comprehensive documentation for PostgreSQL enum evolution procedures, including:
1. Enum Evolution Runbook (`enum-evolution-guide.md`)
2. Four example migration scripts in `enum-migration-examples/` directory

This is a **documentation-only** story with no code changes.

## Implementation Steps

### Step 1: Create Documentation Directory Structure

**Location**: `packages/backend/database-schema/docs/`

```
docs/
  enum-evolution-guide.md          # New runbook
  enum-migration-examples/         # New directory
    add-store-example.sql
    add-currency-example.sql
    deprecate-store-example.sql
    enum-to-table-migration.sql
```

### Step 2: Create Enum Evolution Runbook

**File**: `packages/backend/database-schema/docs/enum-evolution-guide.md`

**Content Sections**:
1. Overview - Purpose and scope of this runbook
2. PostgreSQL Enum Constraints - What you can/cannot do
3. Safe Enum Addition Procedure - Step-by-step with `ALTER TYPE ... ADD VALUE`
4. Idempotency Patterns - Using `IF NOT EXISTS`
5. Transaction Semantics - Warning about non-transactional nature
6. Enum Deprecation Procedure - Soft-delete pattern
7. Multi-Environment Coordination Checklist
8. Rollback Strategy (or lack thereof)
9. When to Migrate to Lookup Tables
10. Verification Queries - How to check enum state

**Acceptance Criteria Coverage**:
- AC 1: File exists at specified path
- AC 2: Documents immutability constraints
- AC 3: Step-by-step procedure for adding values
- AC 4: Rollback strategy documented
- AC 5: Multi-environment checklist included
- AC 14: Idempotency behavior documented
- AC 15: Transaction semantics documented

### Step 3: Create add-store-example.sql

**File**: `packages/backend/database-schema/docs/enum-migration-examples/add-store-example.sql`

**Content**:
- Add "Amazon" to `wishlist_store` enum
- Use `IF NOT EXISTS` for idempotency
- Include verification query
- Document transaction limitations

**Acceptance Criteria Coverage**: AC 6

### Step 4: Create add-currency-example.sql

**File**: `packages/backend/database-schema/docs/enum-migration-examples/add-currency-example.sql`

**Content**:
- Add "JPY" to `wishlist_currency` enum
- Use `IF NOT EXISTS` for idempotency
- Include verification query
- Document transaction limitations

**Acceptance Criteria Coverage**: AC 7

### Step 5: Create deprecate-store-example.sql

**File**: `packages/backend/database-schema/docs/enum-migration-examples/deprecate-store-example.sql`

**Content**:
- Migrate items from deprecated store (e.g., "Barweer") to "Other"
- Update notes field with migration message
- Include transaction for data migration
- Document that enum value cannot be removed

**Acceptance Criteria Coverage**: AC 8

### Step 6: Create enum-to-table-migration.sql

**File**: `packages/backend/database-schema/docs/enum-migration-examples/enum-to-table-migration.sql`

**Content**:
- Create `wishlist_stores` lookup table
- Create `wishlist_currencies` lookup table
- Migrate existing data
- Convert enum columns to text
- Drop old enums
- Add foreign key constraints

**Acceptance Criteria Coverage**: AC 9

### Step 7: Verification

**Manual Verification Steps**:
1. Verify all files exist at correct paths
2. Verify SQL syntax is valid (no errors in PostgreSQL-compatible format)
3. Verify documentation is complete and well-formatted
4. Verify cross-references to story are correct

**Acceptance Criteria Coverage**: AC 10-13 (scripts are copy-paste ready)

## Architectural Decisions

**None Required** - This is a documentation-only story with no code changes. File locations are specified in the story requirements.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| SQL syntax errors in examples | Use standard PostgreSQL 14+ syntax |
| Missing acceptance criteria | Cross-check each AC during verification |
| Inconsistent documentation style | Follow existing `WISHLIST-SCHEMA-EVOLUTION.md` format |

## Acceptance Criteria Mapping

| AC | Implementation Step | Deliverable |
|----|---------------------|-------------|
| AC 1 | Step 2 | enum-evolution-guide.md exists |
| AC 2 | Step 2 | Immutability section in runbook |
| AC 3 | Step 2 | Step-by-step ADD VALUE procedure |
| AC 4 | Step 2 | Rollback strategy section |
| AC 5 | Step 2 | Multi-environment checklist |
| AC 6 | Step 3 | add-store-example.sql |
| AC 7 | Step 4 | add-currency-example.sql |
| AC 8 | Step 5 | deprecate-store-example.sql |
| AC 9 | Step 6 | enum-to-table-migration.sql |
| AC 10-13 | Step 7 | Scripts are copy-paste ready |
| AC 14 | Step 2 | Idempotency section in runbook |
| AC 15 | Step 2 | Transaction semantics section |

## Estimated Effort

- Step 1: 1 minute (create directory)
- Step 2: 15 minutes (write runbook)
- Step 3-6: 5 minutes each (write SQL examples)
- Step 7: 5 minutes (verification)
- **Total**: ~40 minutes

## Dependencies

- WISH-2007 must be complete (defines the enums being documented)
- No runtime dependencies (documentation only)
