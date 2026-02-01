# Implementation Plan - WISH-20180

## Overview

Implement CI job to validate database schema changes against evolution policies. This includes:
1. GitHub Actions workflow for automated validation
2. TypeScript validation script for policy enforcement
3. Documentation for developers

## Implementation Chunks

### Chunk 1: Validation Script Core (AC 6-9, 10-14, 15-18)

**File:** `packages/backend/database-schema/scripts/validate-schema-changes.ts`

**Description:** Core validation logic for schema changes.

**Implementation Details:**

```typescript
// Key types
interface ValidationResult {
  status: 'pass' | 'warn' | 'fail'
  violations: Violation[]
  warnings: Warning[]
  summary: string
}

interface Violation {
  type: 'breaking_change' | 'naming_convention' | 'journal_missing' | 'syntax_error'
  severity: 'critical' | 'warning'
  file: string
  line?: number
  message: string
  policyRef?: string
}
```

**Key Functions:**

1. `detectMigrationChanges()` - Use git diff to find changed migration files
2. `validateMigrationNaming(file: string)` - Check `XXXX_description.sql` pattern (AC 6)
3. `validateJournalEntry(migrationTag: string)` - Verify `_journal.json` updated (AC 7)
4. `parseMigrationSQL(sql: string)` - Parse SQL for analysis (AC 8)
5. `detectBreakingChanges(sql: string)` - Find DROP COLUMN, DROP TABLE, ALTER TYPE (AC 10-14)
6. `validateNonBreakingChanges(sql: string)` - Check defaults, CONCURRENTLY (AC 15-18)
7. `detectDuplicateMigrationNumbers()` - Collision detection (AC 9)

**Breaking Change Detection (AC 10-14):**
- DROP COLUMN → Critical violation
- DROP TABLE → Critical violation
- ALTER COLUMN ... TYPE → Critical violation
- ALTER TYPE ... DROP VALUE → Critical violation (enum removal)
- Check for deprecation comments in SQL

**Non-Breaking Validation (AC 15-18):**
- ADD COLUMN with NULL or DEFAULT → Pass
- ADD COLUMN NOT NULL without DEFAULT → Warning (needs backfill)
- CREATE INDEX without CONCURRENTLY → Warning
- ALTER TYPE ... ADD VALUE → Pass (enum addition)

### Chunk 2: Script Entry Point and CLI

**File:** `packages/backend/database-schema/scripts/validate-schema-changes.ts` (continued)

**Implementation Details:**

```typescript
// Main entry point
async function main() {
  const baseBranch = process.env.GITHUB_BASE_REF || 'main'

  // 1. Get changed files using git diff
  const changedFiles = await getChangedMigrationFiles(baseBranch)

  // 2. Run validations
  const results = await validateMigrations(changedFiles)

  // 3. Output results
  outputResults(results)

  // 4. Exit with appropriate code
  process.exit(results.status === 'fail' ? 1 : 0)
}
```

**Output Format:**
```
## Schema Validation Results

### Summary
- Files checked: 3
- Breaking changes: 1 (FAIL)
- Warnings: 2
- Passed checks: 15

### Violations

#### CRITICAL: Breaking change detected
- File: 0009_remove_old_column.sql:5
- Type: DROP COLUMN
- Details: `ALTER TABLE wishlist_items DROP COLUMN old_field`
- Policy: See SCHEMA-EVOLUTION-POLICY.md Section 2.1

### Warnings

#### WARNING: Index not created concurrently
- File: 0009_remove_old_column.sql:10
- Type: CREATE INDEX
- Details: Consider using CREATE INDEX CONCURRENTLY for production safety
- Policy: See SCHEMA-EVOLUTION-POLICY.md Section 4.2
```

### Chunk 3: GitHub Actions Workflow (AC 1-5)

**File:** `.github/workflows/schema-validation.yml`

**Implementation Details:**

```yaml
name: Schema Validation

on:
  pull_request:
    paths:
      - 'packages/backend/database-schema/src/**'
      - 'packages/backend/database-schema/migrations/**'

jobs:
  validate-schema:
    name: Validate Schema Changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git diff

      - uses: pnpm/action-setup@v4
        with:
          version: 9.0.0

      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install --no-frozen-lockfile

      - name: Validate schema changes
        id: validate
        run: pnpm --filter @repo/database-schema validate:schema
        continue-on-error: true

      - name: Post PR comment
        uses: actions/github-script@v7
        with:
          script: |
            // Read validation output and post as PR comment
            const fs = require('fs')
            const output = '${{ steps.validate.outputs.result }}'
            // Post formatted comment

      - name: Fail if critical violations
        if: steps.validate.outcome == 'failure'
        run: exit 1
```

### Chunk 4: Package.json Script and Dependencies

**File:** `packages/backend/database-schema/package.json`

**Changes:**
```json
{
  "scripts": {
    "validate:schema": "tsx scripts/validate-schema-changes.ts"
  }
}
```

**No new dependencies needed** - uses existing tsx for TypeScript execution.

### Chunk 5: Unit Tests

**File:** `packages/backend/database-schema/scripts/__tests__/validate-schema-changes.test.ts`

**Test Categories:**

1. **Migration Naming Tests**
   - Valid: `0001_add_user_table.sql` → Pass
   - Invalid: `migration.sql` → Fail
   - Invalid: `001_bad.sql` (3 digits) → Fail

2. **Breaking Change Detection Tests**
   - DROP COLUMN → Critical violation
   - DROP TABLE → Critical violation
   - ALTER COLUMN TYPE → Critical violation
   - With deprecation comment → Pass with warning

3. **Non-Breaking Change Tests**
   - ADD COLUMN with DEFAULT → Pass
   - ADD COLUMN nullable → Pass
   - CREATE INDEX CONCURRENTLY → Pass
   - CREATE INDEX without CONCURRENTLY → Warning

4. **Journal Validation Tests**
   - Journal updated correctly → Pass
   - Journal missing entry → Fail
   - Duplicate idx → Fail

### Chunk 6: Documentation (AC 19-20)

**File:** `packages/backend/database-schema/docs/CI-SCHEMA-VALIDATION.md`

**Content:**
- Overview of CI validation
- Validation rules with examples
- How to fix common violations
- Escape hatch mechanism (skip comment)
- Links to SCHEMA-EVOLUTION-POLICY.md

## Execution Order

1. Chunk 4: Package.json script setup
2. Chunk 1: Core validation logic
3. Chunk 2: CLI entry point
4. Chunk 5: Unit tests (parallel with development)
5. Chunk 3: GitHub Actions workflow
6. Chunk 6: Documentation

## Dependencies Between Chunks

```
Chunk 4 (package.json) ─┐
                        ├─► Chunk 1 (core) ─► Chunk 2 (CLI) ─► Chunk 5 (tests)
                        │                                            │
                        └──────────────────────► Chunk 3 (workflow) ◄─┘
                                                        │
                                                        ▼
                                                 Chunk 6 (docs)
```

## Verification Steps

1. `pnpm --filter @repo/database-schema validate:schema` runs without error on clean repo
2. Type checking passes: `pnpm check-types`
3. Linting passes: `pnpm lint`
4. Unit tests pass: `pnpm test`
5. Workflow YAML is valid (use actionlint or manual review)

## Risk Mitigations

1. **SQL Parsing Complexity**: Use simple regex-based detection for MVP; avoid complex AST parsing
2. **False Positives**: Provide clear error messages and escape hatch via comments
3. **Performance**: Script should complete in <30 seconds

## Notes

- No external SQL parser dependency needed for MVP
- Regex patterns sufficient for detecting breaking changes
- Journal validation reads JSON directly
- Git commands for change detection work locally and in CI
