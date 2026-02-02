# Schema Evolution Policy

> Comprehensive policy for database schema modifications in the LEGO MOC Instructions Platform

**Policy Version:** 1.0.0
**Effective Date:** 2026-02-01
**Story Reference:** WISH-2057
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [Change Classification](#2-change-classification)
3. [Approval Process](#3-approval-process)
4. [Testing Requirements](#4-testing-requirements)
5. [Backward Compatibility Policy](#5-backward-compatibility-policy)
6. [Migration File Standards](#6-migration-file-standards)
7. [Risk Assessment Template](#7-risk-assessment-template)
8. [Governance Matrix](#8-governance-matrix)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

### Purpose

This policy establishes governance for all database schema modifications to ensure:
- Safe, predictable schema changes across all environments
- Backward compatibility with deployed application code
- Clear approval workflows and accountability
- Consistent migration practices across the engineering team

### Scope

This policy applies to:
- All PostgreSQL schema changes (tables, columns, indexes, constraints)
- All enum type modifications
- All migration files in `packages/backend/database-schema/`
- All environments (local, staging, production)

### Guiding Principles

1. **Database changes are permanent** - Rollbacks are not always possible
2. **Database before code** - Schema must support new code before deployment
3. **Backward compatibility by default** - Old code must work with new schema
4. **Test before production** - All migrations verified on fresh database
5. **Document all decisions** - Risk assessments required for breaking changes

---

## 2. Change Classification

### 2.1 Non-Breaking Changes (Safe)

Non-breaking changes can be deployed without coordinated code changes. Old code continues to function.

| Change Type | Example | Safety Notes |
|-------------|---------|--------------|
| Add optional column | `ALTER TABLE users ADD COLUMN nickname TEXT` | Old code ignores new column |
| Add column with default | `ALTER TABLE items ADD COLUMN active BOOLEAN DEFAULT true` | Old inserts get default |
| Add new enum value | `ALTER TYPE status ADD VALUE 'archived'` | Old code ignores new value |
| Add index | `CREATE INDEX CONCURRENTLY idx_user_email ON users(email)` | No schema change, performance only |
| Add constraint (data valid) | `ALTER TABLE items ADD CONSTRAINT positive_price CHECK (price >= 0)` | Only if all existing data satisfies constraint |
| Create new table | `CREATE TABLE audit_logs (...)` | No impact on existing tables |

**Example - Adding an optional column:**

```sql
-- Non-breaking: New column is nullable, old code ignores it
ALTER TABLE wishlist_items
ADD COLUMN source_url TEXT;

-- Old code continues to work:
-- INSERT INTO wishlist_items (user_id, set_number, store) VALUES (...);
-- New column defaults to NULL
```

### 2.2 Breaking Changes (Requires Coordination)

Breaking changes require coordinated deployment with application code. Old code may fail.

| Change Type | Example | Impact |
|-------------|---------|--------|
| Drop column | `ALTER TABLE users DROP COLUMN old_field` | Old code SELECT/INSERT fails |
| Rename column | `ALTER TABLE users RENAME COLUMN name TO full_name` | Old code references fail |
| Change column type | `ALTER TABLE items ALTER COLUMN price TYPE NUMERIC(10,2)` | May lose data precision |
| Add NOT NULL to existing column | `ALTER TABLE users ALTER COLUMN email SET NOT NULL` | Existing NULLs cause error |
| Remove enum value | Not directly supported in PostgreSQL | Multi-phase migration required |
| Rename enum value | Not directly supported in PostgreSQL | Multi-phase migration required |
| Drop table | `DROP TABLE deprecated_table` | All code referencing table fails |
| Remove constraint | `ALTER TABLE items DROP CONSTRAINT price_check` | May allow invalid data |

**Example - Breaking change requiring coordination:**

```sql
-- BREAKING: Dropping a column
-- Step 1: Deploy code that doesn't use the column
-- Step 2: Wait for all old instances to drain (deployment complete)
-- Step 3: Drop the column
ALTER TABLE wishlist_items
DROP COLUMN deprecated_field;
```

### 2.3 Change Classification Decision Tree

```
Is the change additive (adding new things)?
├── YES → Is the new element optional or has a safe default?
│   ├── YES → NON-BREAKING
│   └── NO → BREAKING (e.g., adding NOT NULL without default)
└── NO → Is the change removing or modifying existing elements?
    ├── Removing → BREAKING
    └── Modifying → Does old code still work?
        ├── YES → NON-BREAKING (rare)
        └── NO → BREAKING
```

---

## 3. Approval Process

### 3.1 Approval Authorities

Schema changes require approval based on risk level:

| Risk Level | Change Types | Required Approvers |
|------------|--------------|-------------------|
| **Low** | Add optional column, add index, add enum value | Code review (1 engineer) |
| **Medium** | Add required column with default, add constraint, create table | Tech Lead + Code review |
| **High** | Drop column, change column type, modify enum, drop table | Tech Lead + DBA review + Product awareness |
| **Critical** | Schema affecting multiple services, large table modifications | Tech Lead + DBA + Architecture review |

### 3.2 Approval Workflow

```
1. Engineer creates migration PR
   └── Runs local tests, verifies migration

2. CI validation runs automatically
   └── See CI-SCHEMA-VALIDATION.md for automated checks

3. Code review (required for all changes)
   └── Reviewer checks: correctness, naming, rollback plan

4. Tech Lead review (Medium+ risk)
   └── Verifies alignment with architecture, backward compatibility

5. DBA review (High+ risk)
   └── Verifies production safety, performance impact, lock considerations

6. Product awareness (High+ risk)
   └── Confirms deployment timing, user impact communication

7. Merge and deploy
   └── Following deployment order (see section 5.3)
```

### 3.3 Emergency Changes

For production incidents requiring immediate schema changes:

1. **Verbal approval** from Tech Lead (can be async via Slack)
2. **Document justification** in PR description
3. **Post-incident review** within 48 hours
4. **Formalize approval** in writing after the fact

Emergency changes still require:
- Testing on staging (abbreviated if necessary)
- Rollback plan documented
- Monitoring during deployment

---

## 4. Testing Requirements

### 4.1 Required Tests for All Migrations

Every migration must pass these tests before production:

| Test | Description | When |
|------|-------------|------|
| **Fresh database migration** | Apply all migrations to empty database | CI (every PR) |
| **Type check** | Drizzle schema compiles without errors | CI (every PR) |
| **Unit tests** | All database-related tests pass | CI (every PR) |
| **Local verification** | Developer runs migration locally | Before PR |
| **Staging deployment** | Migration applied to staging | Before production |

### 4.2 Fresh Database Test

Migrations must be tested against a fresh database to catch issues like:
- Missing migrations in sequence
- Dependencies on data that doesn't exist
- Incorrect migration ordering

```bash
# CI runs this automatically
pnpm --filter @repo/database-schema test:fresh-db

# Local equivalent
docker run -d --name test-pg -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:15
DATABASE_URL="postgresql://postgres:test@localhost:5433/test" pnpm db:migrate
docker rm -f test-pg
```

### 4.3 Breaking Change Tests

For breaking changes, additional testing required:

| Test | Description |
|------|-------------|
| **Backward compatibility check** | Verify N-1 code version works with new schema |
| **Data migration verification** | If data transform required, verify no data loss |
| **Performance benchmark** | For large tables, measure migration time |
| **Lock analysis** | Identify statements that acquire table locks |

### 4.4 Production Deployment Checklist

Before deploying to production:

- [ ] All CI checks passing
- [ ] Staging deployment successful
- [ ] No errors in staging logs for 24 hours (or abbreviated for low-risk)
- [ ] Rollback procedure documented and tested
- [ ] Deployment window scheduled (if High risk)
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment

---

## 5. Backward Compatibility Policy

### 5.1 Compatibility Window

**Policy: Support N-1 application version compatibility**

When deploying a schema change:
- The **new schema** must work with the **previous application version**
- The **new schema** must work with the **new application version**
- This provides a safe rollback window if the new application has issues

### 5.2 Compatibility Duration

| Environment | Minimum Compatibility Window |
|-------------|------------------------------|
| Local/Dev | None required |
| Staging | 1 deployment cycle |
| Production | 7 days minimum |

After the compatibility window expires, deprecated columns/features can be removed.

### 5.3 Deployment Order

For schema changes affecting application code:

```
1. Deploy schema change (database migration)
   └── Schema now supports BOTH old and new code

2. Deploy backend application code
   └── Backend uses new schema features

3. Deploy frontend application code
   └── Frontend uses new API features

4. (After compatibility window) Remove deprecated schema elements
   └── Old code no longer needs to work
```

### 5.4 Code Compatibility Strategies

**Strategy A: Feature flags**
```typescript
// Code checks for column existence before using it
if (schemaVersion >= '1.2.0') {
  // Use new column
} else {
  // Fallback behavior
}
```

**Strategy B: Optional fields**
```typescript
// New fields are optional in types
type WishlistItem = {
  id: string
  title: string
  sourceUrl?: string  // Optional: may not exist in old schema
}
```

**Strategy C: Database defaults**
```sql
-- New required column has default, old code doesn't need to provide it
ALTER TABLE items ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
```

---

## 6. Migration File Standards

### 6.1 File Naming Convention

Migration files must follow this pattern:

```
XXXX_description.sql
```

Where:
- `XXXX` = Four-digit sequential number (0001, 0002, etc.)
- `description` = Lowercase with underscores, describing the change

**Valid examples:**
- `0001_create_users_table.sql`
- `0002_add_wishlist_items.sql`
- `0003_add_store_enum.sql`
- `0010_add_user_email_index.sql`

**Invalid examples:**
- `migration.sql` (no number)
- `001_bad.sql` (3-digit number)
- `0001-hyphen-name.sql` (hyphen instead of underscore)
- `0001_AddUsersTable.sql` (camelCase)

### 6.2 Migration File Structure

```sql
-- Migration: 0008_add_source_url_column
-- Story: WISH-2100
-- Author: developer-name
-- Date: 2026-02-01
-- Type: Non-breaking (adding optional column)
-- Rollback: ALTER TABLE wishlist_items DROP COLUMN source_url;

-- Migration SQL
ALTER TABLE wishlist_items
ADD COLUMN source_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN wishlist_items.source_url IS 'Optional URL where the item was found';
```

### 6.3 Journal Consistency

Every migration file must have a corresponding entry in `meta/_journal.json`:

```json
{
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1700000000000,
      "tag": "0000_initial",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "8",
      "when": 1700100000000,
      "tag": "0001_add_source_url",
      "breakpoints": true
    }
  ]
}
```

The CI validation job checks journal consistency automatically.

### 6.4 Drizzle Integration

For Drizzle ORM, schema changes follow this workflow:

```bash
# 1. Modify schema file
# packages/backend/database-schema/src/schema/wishlist.ts

# 2. Generate migration
pnpm --filter @repo/database-schema db:generate

# 3. Review generated SQL
cat packages/backend/database-schema/src/migrations/app/XXXX_*.sql

# 4. Apply migration (local)
pnpm --filter @repo/database-schema db:migrate

# 5. Verify types
pnpm check-types
```

---

## 7. Risk Assessment Template

For Medium+ risk changes, complete this template in the PR description:

```markdown
## Schema Change Risk Assessment

### Change Summary
- **Migration file:** `XXXX_description.sql`
- **Change type:** [Add column | Drop column | Modify type | etc.]
- **Risk level:** [Low | Medium | High | Critical]

### Impact Analysis
- **Tables affected:** [list tables]
- **Estimated rows affected:** [count or estimate]
- **Services affected:** [backend, frontend, jobs, etc.]

### Breaking Change Assessment
- [ ] Is this a breaking change?
- [ ] If yes, what code changes are required?
- [ ] Deployment coordination needed?

### Testing Evidence
- [ ] Fresh database migration test passed
- [ ] Unit tests passed
- [ ] Local manual verification completed
- [ ] Staging deployment successful

### Rollback Plan
- **Can this be rolled back?** [Yes | No | Partial]
- **Rollback SQL:**
  ```sql
  -- Rollback command here
  ```
- **Data loss on rollback?** [Yes | No | Describe]

### Deployment Plan
- **Deployment window:** [time if applicable]
- **Deployment order:** [database, backend, frontend]
- **Monitoring:** [what to watch]

### Approvals
- [ ] Code reviewer: @name
- [ ] Tech Lead (if Medium+): @name
- [ ] DBA (if High+): @name
```

---

## 8. Governance Matrix

### 8.1 RACI Matrix for Schema Changes

| Activity | Engineer | Tech Lead | DBA | Product |
|----------|----------|-----------|-----|---------|
| Write migration | **R** | C | C | I |
| Test migration | **R** | I | I | - |
| Code review | A | **R** | C | - |
| Risk assessment | **R** | **A** | C | I |
| Approve Low risk | A | - | - | - |
| Approve Medium risk | R | **A** | I | - |
| Approve High risk | R | **A** | **A** | I |
| Approve Critical risk | R | **A** | **A** | **A** |
| Deploy to staging | **R** | I | I | - |
| Deploy to production | **R** | **A** | C | I |
| Monitor deployment | **R** | C | C | I |

**Legend:** R=Responsible, A=Accountable, C=Consulted, I=Informed

### 8.2 Escalation Path

```
Issue during migration deployment:
├── Engineer attempts resolution (15 min)
│   └── If unresolved → Tech Lead
│       └── If unresolved → DBA + rollback consideration
│           └── If critical → Incident response team
```

### 8.3 Policy Exceptions

Exceptions to this policy require:
1. Written justification
2. Tech Lead + DBA approval
3. Documentation in ADR (Architecture Decision Record)
4. Monitoring plan for exception

---

## 9. Related Documentation

| Document | Description |
|----------|-------------|
| [ENUM-MODIFICATION-RUNBOOK.md](./ENUM-MODIFICATION-RUNBOOK.md) | Procedures for PostgreSQL enum changes |
| [SCHEMA-VERSIONING.md](./SCHEMA-VERSIONING.md) | Version numbering and metadata tracking |
| [SCHEMA-CHANGE-SCENARIOS.md](./SCHEMA-CHANGE-SCENARIOS.md) | Common scenario guides with examples |
| [CI-SCHEMA-VALIDATION.md](./CI-SCHEMA-VALIDATION.md) | Automated CI validation rules |

### External References

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [GitHub Schema Migrations Best Practices](https://github.blog/2021-09-27-partitioning-githubs-relational-databases-scale/)

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Implementation Agent | Initial policy (WISH-2057) |
