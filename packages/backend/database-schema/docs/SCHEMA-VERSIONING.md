# Schema Versioning Strategy

> Version numbering, metadata tracking, and rollback compatibility for database schemas

**Document Version:** 1.0.0
**Effective Date:** 2026-02-01
**Story Reference:** WISH-2057
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [Version Numbering Scheme](#2-version-numbering-scheme)
3. [Schema Versions Metadata Table](#3-schema-versions-metadata-table)
4. [Migration State Tracking](#4-migration-state-tracking)
5. [Rollback Compatibility Rules](#5-rollback-compatibility-rules)
6. [Version History Management](#6-version-history-management)
7. [Tooling and Commands](#7-tooling-and-commands)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

### Purpose

Schema versioning provides:
- Clear communication about schema state across environments
- Tracking of which migrations have been applied
- Compatibility information for rollback decisions
- Audit trail of schema changes over time

### Components

| Component | Description | Location |
|-----------|-------------|----------|
| Version number | Human-readable schema version | `schema_versions` table |
| Migration files | SQL files with schema changes | `src/migrations/app/` |
| Drizzle journal | Internal migration state | `meta/_journal.json` |
| Metadata table | Custom tracking information | `schema_versions` table |

### Current Schema Version

```
Version: 1.0.0
Last Migration: 0007_create_wishlist_items.sql
Applied: 2026-01-28
```

---

## 2. Version Numbering Scheme

### Semantic Versioning for Schemas

Schema versions follow **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

| Component | When to Increment | Examples |
|-----------|------------------|----------|
| **MAJOR** | Breaking changes that require code changes | Drop column, change column type, remove enum |
| **MINOR** | New features that are backward compatible | Add table, add column, add enum value |
| **PATCH** | Non-functional changes | Add index, add comment, fix constraint name |

### Version Examples

```
1.0.0 → Initial schema (WISH-2007)
1.1.0 → Add source_url column to wishlist_items (backward compatible)
1.2.0 → Add Amazon enum value (backward compatible)
1.2.1 → Add index on user_id (no schema change)
2.0.0 → Drop deprecated column (BREAKING)
```

### Version Incrementing Rules

```
Is the change backward compatible?
├── YES → Does it add new capabilities?
│   ├── YES → Increment MINOR (e.g., 1.1.0 → 1.2.0)
│   └── NO → Increment PATCH (e.g., 1.2.0 → 1.2.1)
└── NO → Increment MAJOR (e.g., 1.2.1 → 2.0.0)
```

### Pre-release Versions

For staging/testing, use pre-release suffixes:

```
1.2.0-alpha.1  → First alpha release
1.2.0-beta.1   → Beta testing
1.2.0-rc.1     → Release candidate
1.2.0          → Production release
```

---

## 3. Schema Versions Metadata Table

### Table Design

```sql
-- Schema versions metadata table
-- Stores human-readable version information and audit trail

CREATE TABLE schema_versions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL,                -- Semantic version (e.g., "1.2.0")
  migration_file TEXT NOT NULL,         -- Migration filename
  description TEXT,                     -- Human-readable summary
  change_type TEXT NOT NULL,            -- MAJOR, MINOR, PATCH
  is_breaking BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMP NOT NULL DEFAULT now(),
  applied_by TEXT,                      -- User or CI system
  rollback_safe BOOLEAN NOT NULL DEFAULT true,
  rollback_sql TEXT,                    -- SQL to undo this migration
  story_id TEXT,                        -- Related story (e.g., WISH-2007)

  CONSTRAINT version_format CHECK (version ~ '^\d+\.\d+\.\d+(-[a-z0-9.]+)?$'),
  CONSTRAINT change_type_valid CHECK (change_type IN ('MAJOR', 'MINOR', 'PATCH'))
);

-- Index for quick version lookups
CREATE INDEX idx_schema_versions_version ON schema_versions(version);
CREATE INDEX idx_schema_versions_applied_at ON schema_versions(applied_at DESC);

-- Comment
COMMENT ON TABLE schema_versions IS
  'Tracks schema version history with rollback information. See SCHEMA-VERSIONING.md';
```

### Example Data

```sql
INSERT INTO schema_versions
  (version, migration_file, description, change_type, is_breaking, applied_by, rollback_safe, story_id)
VALUES
  ('1.0.0', '0000_initial_setup.sql', 'Initial database setup', 'MAJOR', false, 'deploy-bot', true, 'WISH-2000'),
  ('1.0.1', '0001_add_enums.sql', 'Add wishlist_store and wishlist_currency enums', 'PATCH', false, 'deploy-bot', false, 'WISH-2000'),
  ('1.1.0', '0007_create_wishlist_items.sql', 'Create wishlist_items table', 'MINOR', false, 'deploy-bot', true, 'WISH-2007');
```

### Query Current Version

```sql
-- Get current schema version
SELECT version, applied_at, description
FROM schema_versions
ORDER BY applied_at DESC
LIMIT 1;

-- Result:
-- version | applied_at          | description
-- --------+---------------------+-----------------------------
-- 1.1.0   | 2026-01-28 10:30:00 | Create wishlist_items table
```

### Query Version History

```sql
-- Get full version history
SELECT
  version,
  migration_file,
  description,
  change_type,
  is_breaking,
  rollback_safe,
  applied_at
FROM schema_versions
ORDER BY applied_at DESC;
```

---

## 4. Migration State Tracking

### Dual Tracking System

We use two tracking systems that work together:

| System | Purpose | Location |
|--------|---------|----------|
| **Drizzle Journal** | Internal migration state (which files applied) | `meta/_journal.json` |
| **schema_versions** | Human-readable metadata (version, rollback info) | Database table |

### Drizzle Journal Structure

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1706450400000,
      "tag": "0000_initial_setup",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "7",
      "when": 1706536800000,
      "tag": "0001_add_enums",
      "breakpoints": true
    },
    {
      "idx": 7,
      "version": "7",
      "when": 1706623200000,
      "tag": "0007_create_wishlist_items",
      "breakpoints": true
    }
  ]
}
```

### Synchronization

Every migration should update BOTH systems:

```sql
-- Migration: 0008_add_source_url
-- This migration adds source_url column

ALTER TABLE wishlist_items ADD COLUMN source_url TEXT;

-- Update schema_versions (at end of migration)
INSERT INTO schema_versions
  (version, migration_file, description, change_type, is_breaking, rollback_safe, rollback_sql, story_id)
VALUES
  ('1.2.0', '0008_add_source_url.sql', 'Add source_url column to wishlist_items', 'MINOR', false, true,
   'ALTER TABLE wishlist_items DROP COLUMN source_url;', 'WISH-2100');
```

### Verifying Consistency

```sql
-- Compare Drizzle journal count with schema_versions count
-- They should match (or be close, accounting for initial setup)

SELECT
  (SELECT COUNT(*) FROM schema_versions) as version_count,
  -- Journal count comes from file, but we can check last idx
  (SELECT MAX(id) FROM schema_versions) as max_id;
```

---

## 5. Rollback Compatibility Rules

### Rollback Classification

Every migration is classified by rollback safety:

| Classification | Description | Examples |
|----------------|-------------|----------|
| **Safe** | Can be rolled back without data loss | Add column, add index, add constraint |
| **Unsafe** | Rollback may cause data loss or issues | Drop column, change type, remove enum |
| **Impossible** | Cannot be rolled back at all | Add enum value (PostgreSQL limitation) |

### Rollback Compatibility Matrix

| Change Type | Rollback Safe? | Data Loss Risk | Notes |
|-------------|---------------|----------------|-------|
| Add nullable column | Yes | None | `DROP COLUMN` removes data |
| Add column with default | Yes | None | Default values lost on rollback |
| Add table | Yes | None | Table data lost on rollback |
| Add index | Yes | None | Performance only |
| Add enum value | **No** | N/A | Cannot remove enum values |
| Add constraint | Partial | None | Data may violate constraint after rollback |
| Drop column | **No** | **Yes** | Data permanently lost |
| Change column type | **No** | **Maybe** | May lose precision or fail |
| Rename column | Partial | None | Code references break |

### Rollback Decision Tree

```
Can this migration be rolled back?
├── Is it an enum ADD VALUE?
│   └── NO → Cannot rollback (PostgreSQL limitation)
├── Does it drop or remove data?
│   └── NO → Rollback loses data (unsafe)
├── Does it change data types?
│   └── MAYBE → Check if reversible without data loss
├── Is it purely additive?
│   └── YES → Safe to rollback
└── Mark as rollback_safe = false
```

### Rollback SQL Guidelines

For safe rollbacks, store the rollback SQL:

```sql
-- Good: Simple reverse operation
rollback_sql: 'ALTER TABLE wishlist_items DROP COLUMN source_url;'

-- Good: Multiple statements
rollback_sql: 'DROP INDEX idx_user_email; ALTER TABLE users DROP COLUMN email_verified;'

-- N/A: Cannot rollback
rollback_sql: NULL  -- For enum additions
```

### Version Rollback Compatibility

When rolling back to a previous version:

```
Current Version: 2.1.0
Target Version: 2.0.0

Check: Are all migrations between 2.0.0 and 2.1.0 rollback_safe?
├── YES → Proceed with rollback
│   └── Execute rollback_sql in reverse order
└── NO → Rollback blocked
    └── Report: "Migration 0015 (2.0.1) is not rollback-safe"
```

---

## 6. Version History Management

### Tagging Releases

For major releases, create git tags aligned with schema versions:

```bash
# Tag schema version in git
git tag -a schema-v1.2.0 -m "Schema version 1.2.0 - Add source_url column"
git push origin schema-v1.2.0
```

### Version Changelog

Maintain a changelog section in this document or separate file:

```markdown
## Schema Changelog

### Version 2.0.0 (2026-03-15)
- **BREAKING**: Dropped deprecated `old_field` column
- Migration: 0020_drop_old_field.sql
- Story: WISH-2200

### Version 1.2.0 (2026-02-15)
- Added `source_url` column to wishlist_items
- Migration: 0008_add_source_url.sql
- Story: WISH-2100

### Version 1.1.0 (2026-01-28)
- Created wishlist_items table
- Migration: 0007_create_wishlist_items.sql
- Story: WISH-2007
```

### Environment Version Tracking

Track versions across environments:

```sql
-- Query to check version across environments (pseudo-code)
-- Each environment has its own schema_versions table

-- Production
SELECT 'production' as env, version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;

-- Staging
SELECT 'staging' as env, version FROM schema_versions ORDER BY applied_at DESC LIMIT 1;
```

### Version Drift Detection

Check for version drift between environments:

```bash
# Compare production and staging versions
PROD_VERSION=$(psql $PROD_DB -t -c "SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1")
STAGE_VERSION=$(psql $STAGE_DB -t -c "SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1")

if [ "$PROD_VERSION" != "$STAGE_VERSION" ]; then
  echo "WARNING: Schema drift detected"
  echo "Production: $PROD_VERSION"
  echo "Staging: $STAGE_VERSION"
fi
```

---

## 7. Tooling and Commands

### Available Commands

```bash
# Check current schema version
pnpm --filter @repo/database-schema db:version

# Generate new migration
pnpm --filter @repo/database-schema db:generate

# Apply pending migrations
pnpm --filter @repo/database-schema db:migrate

# Show migration status
pnpm --filter @repo/database-schema db:status

# Validate schema consistency
pnpm --filter @repo/database-schema db:validate
```

### db:version Implementation

```typescript
// packages/backend/database-schema/scripts/version.ts
import { sql } from 'drizzle-orm'
import { db } from '../src/connection'

async function showVersion() {
  const result = await db.execute(sql`
    SELECT version, applied_at, description
    FROM schema_versions
    ORDER BY applied_at DESC
    LIMIT 1
  `)

  console.log('Current Schema Version:', result.rows[0]?.version || 'Unknown')
  console.log('Applied At:', result.rows[0]?.applied_at || 'N/A')
  console.log('Description:', result.rows[0]?.description || 'N/A')
}
```

### db:status Implementation

```typescript
// packages/backend/database-schema/scripts/status.ts
async function showStatus() {
  // Get Drizzle journal entries
  const journal = JSON.parse(fs.readFileSync('meta/_journal.json', 'utf-8'))

  // Get schema_versions entries
  const versions = await db.execute(sql`
    SELECT migration_file, version, applied_at, rollback_safe
    FROM schema_versions
    ORDER BY applied_at ASC
  `)

  console.log('Migration Status:')
  console.log('=================')

  for (const entry of journal.entries) {
    const version = versions.rows.find(v => v.migration_file.includes(entry.tag))
    const status = version ? 'Applied' : 'Pending'
    const rollback = version?.rollback_safe ? 'Safe' : 'Unsafe'

    console.log(`${entry.tag}: ${status} (Rollback: ${rollback})`)
  }
}
```

### Automated Version Bump

```bash
# Bump patch version
pnpm --filter @repo/database-schema version:bump patch

# Bump minor version
pnpm --filter @repo/database-schema version:bump minor

# Bump major version (breaking change)
pnpm --filter @repo/database-schema version:bump major
```

---

## 8. Related Documentation

| Document | Description |
|----------|-------------|
| [SCHEMA-EVOLUTION-POLICY.md](./SCHEMA-EVOLUTION-POLICY.md) | Overall schema change governance |
| [ENUM-MODIFICATION-RUNBOOK.md](./ENUM-MODIFICATION-RUNBOOK.md) | Enum-specific procedures |
| [SCHEMA-CHANGE-SCENARIOS.md](./SCHEMA-CHANGE-SCENARIOS.md) | Common scenario guides |
| [CI-SCHEMA-VALIDATION.md](./CI-SCHEMA-VALIDATION.md) | Automated CI validation |

### External References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)

---

## Schema Changelog

### Version 1.1.0 (2026-01-28)
- Created `wishlist_items` table with enums
- Migration: 0007_create_wishlist_items.sql
- Story: WISH-2007

### Version 1.0.0 (2026-01-27)
- Initial database setup
- Created base enums: `wishlist_store`, `wishlist_currency`
- Migration: 0000-0006 initial setup
- Story: WISH-2000

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-01 | Implementation Agent | Initial strategy (WISH-2057) |
