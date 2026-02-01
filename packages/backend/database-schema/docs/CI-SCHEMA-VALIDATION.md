# CI Schema Validation

## Overview

This document describes the CI job that automatically validates database schema changes against evolution policies. The validation runs on every pull request that modifies files in `packages/backend/database-schema/`.

**Related Story:** WISH-20180 - CI Job to Validate Schema Changes Against Policy

## How It Works

### Trigger

The GitHub Actions workflow runs when a PR modifies:
- `packages/backend/database-schema/src/**`
- `packages/backend/database-schema/migrations/**`

### Validation Process

1. **Change Detection**: Uses `git diff` to find modified migration and schema files
2. **Migration Naming**: Validates files match `XXXX_description.sql` pattern
3. **Journal Consistency**: Ensures `meta/_journal.json` has entries for all migrations
4. **Breaking Change Detection**: Identifies DROP, ALTER TYPE, and other breaking operations
5. **Best Practice Warnings**: Flags missing CONCURRENTLY, missing DEFAULTs, etc.
6. **PR Comment**: Posts results as a comment on the pull request
7. **CI Gate**: Fails CI if critical violations are detected

## Validation Rules

### Breaking Changes (Critical - Blocks PR)

| Pattern | Description | Policy Reference |
|---------|-------------|------------------|
| `DROP COLUMN` | Column removal breaks existing code | Section 2.1 |
| `DROP TABLE` | Table removal breaks existing code | Section 2.1 |
| `ALTER COLUMN TYPE` | Type change may break data/queries | Section 2.1 |
| `ALTER TYPE RENAME VALUE` | Enum value rename breaks existing data | Section 2.2 |

### Warnings (Non-Blocking)

| Pattern | Description | Policy Reference |
|---------|-------------|------------------|
| `CREATE INDEX` (without CONCURRENTLY) | May lock table in production | Section 4.2 |
| `ADD COLUMN NOT NULL` (without DEFAULT) | Requires backfill migration | Section 3.1 |

### Migration File Naming

Files must match pattern: `XXXX_description.sql`

- `XXXX`: Four-digit number (e.g., 0001, 0002)
- `description`: Lowercase with underscores (e.g., `add_user_table`)

**Examples:**
- Valid: `0001_add_user_table.sql`
- Invalid: `migration.sql`, `001_bad.sql`, `0001-hyphen.sql`

### Journal Consistency

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
    }
  ]
}
```

## Override Mechanisms

### Skip Validation for Approved Changes

Add a special comment to allow breaking changes that have been reviewed and approved:

```sql
-- DEPRECATED: Old field removed per migration plan
ALTER TABLE users DROP COLUMN old_field;
```

Or:

```sql
-- schema-validation: skip - Approved by DBA on 2026-01-31
DROP TABLE deprecated_table;
```

**Accepted patterns:**
- `-- DEPRECATED: <reason>`
- `-- BREAKING CHANGE APPROVED: <reason>`
- `-- schema-validation: skip`

These change critical violations to warnings, allowing the PR to merge.

## Running Locally

Test validation before pushing:

```bash
pnpm --filter @repo/database-schema validate:schema
```

This will show the same output as the CI job.

## CI Workflow Location

The workflow is defined in:
```
.github/workflows/schema-validation.yml
```

## Troubleshooting

### "Migration missing from _journal.json"

1. Run `pnpm --filter @repo/database-schema db:generate` to regenerate migrations
2. Ensure `meta/_journal.json` is committed with your migration

### "Breaking change detected"

1. Review if the change is actually breaking
2. If approved, add deprecation comment (see Override section)
3. Document the migration plan in the PR description

### "Migration file name invalid"

1. Rename file to match `XXXX_description.sql` pattern
2. Use lowercase letters and underscores only
3. Ensure 4-digit prefix

## Best Practices

1. **Test migrations locally** before pushing
2. **Use CONCURRENTLY** for index creation
3. **Add DEFAULTs** for new required columns
4. **Never delete applied migrations** - they are immutable
5. **Document breaking changes** with deprecation comments

## Related Documentation

- WISH-2057: Schema Evolution Policies (when available)
- `docs/WISHLIST-SCHEMA-EVOLUTION.md`: Wishlist-specific schema guidance
- `docs/enum-evolution-guide.md`: Enum migration patterns
