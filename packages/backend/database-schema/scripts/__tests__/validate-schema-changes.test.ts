import { describe, it, expect } from 'vitest'
import {
  validateMigrationNaming,
  validateJournalUpdated,
  validateJournalConsistency,
  detectBreakingChanges,
  detectWarnings,
  validateDeletedMigrations,
  formatResults,
  type MigrationJournal,
  type ValidationResult,
} from '../validate-schema-changes'

describe('validate-schema-changes', () => {
  describe('validateMigrationNaming', () => {
    it('should pass for valid migration file names', () => {
      const validNames = [
        'packages/backend/database-schema/src/migrations/app/0001_add_user_table.sql',
        'packages/backend/database-schema/src/migrations/app/0099_update_schema.sql',
        'packages/backend/database-schema/src/migrations/app/1234_complex_migration_name.sql',
      ]

      for (const file of validNames) {
        expect(validateMigrationNaming(file)).toBeNull()
      }
    })

    it('should fail for invalid migration file names', () => {
      const invalidNames = [
        {
          file: 'packages/backend/database-schema/src/migrations/app/migration.sql',
          reason: 'no prefix',
        },
        {
          file: 'packages/backend/database-schema/src/migrations/app/001_bad.sql',
          reason: 'only 3 digits',
        },
        {
          file: 'packages/backend/database-schema/src/migrations/app/12345_too_many.sql',
          reason: '5 digits',
        },
        {
          file: 'packages/backend/database-schema/src/migrations/app/0001-hyphen.sql',
          reason: 'hyphen instead of underscore',
        },
        {
          file: 'packages/backend/database-schema/src/migrations/app/0001_CamelCase.sql',
          reason: 'uppercase letters',
        },
      ]

      for (const { file } of invalidNames) {
        const result = validateMigrationNaming(file)
        expect(result).not.toBeNull()
        expect(result?.type).toBe('naming_convention')
        expect(result?.severity).toBe('critical')
      }
    })

    it('should skip non-SQL files', () => {
      expect(validateMigrationNaming('packages/backend/database-schema/src/schema/index.ts')).toBeNull()
    })

    it('should skip meta directory files', () => {
      expect(
        validateMigrationNaming('packages/backend/database-schema/src/migrations/app/meta/_journal.json')
      ).toBeNull()
    })
  })

  describe('validateJournalUpdated', () => {
    const baseJournal: MigrationJournal = {
      version: '7',
      dialect: 'postgresql',
      entries: [
        { idx: 0, version: '7', when: 1700000000000, tag: '0000_initial', breakpoints: true },
        { idx: 1, version: '7', when: 1700000001000, tag: '0001_add_users', breakpoints: true },
      ],
    }

    it('should pass when journal has all migration entries', () => {
      const changedFiles = [
        'packages/backend/database-schema/src/migrations/app/0000_initial.sql',
        'packages/backend/database-schema/src/migrations/app/0001_add_users.sql',
      ]

      const violations = validateJournalUpdated(changedFiles, baseJournal)
      expect(violations).toHaveLength(0)
    })

    it('should fail when migration is missing from journal', () => {
      const changedFiles = [
        'packages/backend/database-schema/src/migrations/app/0002_new_migration.sql',
      ]

      const violations = validateJournalUpdated(changedFiles, baseJournal)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('journal_missing')
      expect(violations[0].severity).toBe('critical')
      expect(violations[0].message).toContain('0002_new_migration')
    })

    it('should ignore non-migration files', () => {
      const changedFiles = [
        'packages/backend/database-schema/src/schema/index.ts',
        'packages/backend/database-schema/src/migrations/app/meta/_journal.json',
      ]

      const violations = validateJournalUpdated(changedFiles, baseJournal)
      expect(violations).toHaveLength(0)
    })
  })

  describe('validateJournalConsistency', () => {
    it('should pass for consistent journal', () => {
      const journal: MigrationJournal = {
        version: '7',
        dialect: 'postgresql',
        entries: [
          { idx: 0, version: '7', when: 1700000000000, tag: '0000_initial', breakpoints: true },
          { idx: 1, version: '7', when: 1700000001000, tag: '0001_add_users', breakpoints: true },
          { idx: 2, version: '7', when: 1700000002000, tag: '0002_add_posts', breakpoints: true },
        ],
      }

      const violations = validateJournalConsistency(journal)
      expect(violations).toHaveLength(0)
    })

    it('should detect duplicate idx values', () => {
      const journal: MigrationJournal = {
        version: '7',
        dialect: 'postgresql',
        entries: [
          { idx: 0, version: '7', when: 1700000000000, tag: '0000_initial', breakpoints: true },
          { idx: 1, version: '7', when: 1700000001000, tag: '0001_add_users', breakpoints: true },
          { idx: 1, version: '7', when: 1700000002000, tag: '0001_duplicate', breakpoints: true },
        ],
      }

      const violations = validateJournalConsistency(journal)
      expect(violations.some(v => v.type === 'journal_duplicate' && v.severity === 'critical')).toBe(true)
    })

    it('should warn about gaps in sequence', () => {
      const journal: MigrationJournal = {
        version: '7',
        dialect: 'postgresql',
        entries: [
          { idx: 0, version: '7', when: 1700000000000, tag: '0000_initial', breakpoints: true },
          { idx: 2, version: '7', when: 1700000002000, tag: '0002_skipped', breakpoints: true },
        ],
      }

      const violations = validateJournalConsistency(journal)
      expect(violations.some(v => v.message.includes('Gap'))).toBe(true)
    })
  })

  describe('detectBreakingChanges', () => {
    it('should detect DROP COLUMN as breaking change', () => {
      const sql = `
        ALTER TABLE wishlist_items DROP COLUMN old_field;
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('breaking_change')
      expect(violations[0].severity).toBe('critical')
      expect(violations[0].message).toContain('DROP COLUMN')
    })

    it('should detect DROP TABLE as breaking change', () => {
      const sql = `
        DROP TABLE deprecated_table;
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('breaking_change')
      expect(violations[0].message).toContain('DROP TABLE')
    })

    it('should detect ALTER COLUMN TYPE as breaking change', () => {
      const sql = `
        ALTER TABLE wishlist_items ALTER COLUMN price TYPE INTEGER;
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('breaking_change')
      expect(violations[0].message).toContain('ALTER COLUMN TYPE')
    })

    it('should downgrade to warning when deprecation comment present', () => {
      const sql = `
        -- DEPRECATED: This column is being removed as part of cleanup
        ALTER TABLE wishlist_items DROP COLUMN old_field;
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].severity).toBe('warning')
    })

    it('should allow skip via schema-validation comment', () => {
      const sql = `
        -- schema-validation: skip - approved by DBA
        ALTER TABLE wishlist_items DROP COLUMN old_field;
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].severity).toBe('warning')
    })

    it('should pass for safe operations', () => {
      const sql = `
        ALTER TABLE wishlist_items ADD COLUMN new_field TEXT DEFAULT 'default';
        CREATE INDEX idx_new ON wishlist_items(new_field);
      `

      const violations = detectBreakingChanges('test.sql', sql)
      expect(violations).toHaveLength(0)
    })
  })

  describe('detectWarnings', () => {
    it('should warn about CREATE INDEX without CONCURRENTLY', () => {
      const sql = `
        CREATE INDEX idx_user_id ON wishlist_items(user_id);
      `

      const violations = detectWarnings('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('syntax_warning')
      expect(violations[0].message).toContain('CONCURRENTLY')
    })

    it('should pass for CREATE INDEX CONCURRENTLY', () => {
      const sql = `
        CREATE INDEX CONCURRENTLY idx_user_id ON wishlist_items(user_id);
      `

      const violations = detectWarnings('test.sql', sql)
      expect(violations).toHaveLength(0)
    })

    it('should warn about NOT NULL column without DEFAULT', () => {
      const sql = `
        ALTER TABLE wishlist_items ADD COLUMN required_field TEXT NOT NULL;
      `

      const violations = detectWarnings('test.sql', sql)
      expect(violations).toHaveLength(1)
      expect(violations[0].message).toContain('backfill')
    })

    it('should pass for NOT NULL column with DEFAULT', () => {
      const sql = `
        ALTER TABLE wishlist_items ADD COLUMN required_field TEXT NOT NULL DEFAULT 'value';
      `

      const violations = detectWarnings('test.sql', sql)
      expect(violations).toHaveLength(0)
    })

    it('should pass for nullable column', () => {
      const sql = `
        ALTER TABLE wishlist_items ADD COLUMN optional_field TEXT;
      `

      const violations = detectWarnings('test.sql', sql)
      expect(violations).toHaveLength(0)
    })
  })

  describe('validateDeletedMigrations', () => {
    it('should flag deleted migration files as critical', () => {
      const deletedFiles = [
        'packages/backend/database-schema/src/migrations/app/0001_old_migration.sql',
      ]

      const violations = validateDeletedMigrations(deletedFiles)
      expect(violations).toHaveLength(1)
      expect(violations[0].type).toBe('migration_deleted')
      expect(violations[0].severity).toBe('critical')
    })

    it('should handle multiple deleted files', () => {
      const deletedFiles = [
        'packages/backend/database-schema/src/migrations/app/0001_first.sql',
        'packages/backend/database-schema/src/migrations/app/0002_second.sql',
      ]

      const violations = validateDeletedMigrations(deletedFiles)
      expect(violations).toHaveLength(2)
    })
  })

  describe('formatResults', () => {
    it('should format passing results correctly', () => {
      const result: ValidationResult = {
        status: 'pass',
        violations: [],
        filesChecked: 2,
        summary: 'Files: 2, Critical: 0, Warnings: 0',
      }

      const output = formatResults(result)
      expect(output).toContain('## Schema Validation Results')
      expect(output).toContain('**Status**: PASS')
      expect(output).toContain('All Checks Passed')
    })

    it('should format failing results with violations', () => {
      const result: ValidationResult = {
        status: 'fail',
        violations: [
          {
            type: 'breaking_change',
            severity: 'critical',
            file: 'test.sql',
            line: 5,
            message: 'DROP COLUMN detected',
            policyRef: 'Section 2.1',
          },
        ],
        filesChecked: 1,
        summary: 'Files: 1, Critical: 1, Warnings: 0',
      }

      const output = formatResults(result)
      expect(output).toContain('**Status**: FAIL')
      expect(output).toContain('### Critical Violations')
      expect(output).toContain('DROP COLUMN detected')
      expect(output).toContain('test.sql:5')
    })

    it('should format warnings separately', () => {
      const result: ValidationResult = {
        status: 'warn',
        violations: [
          {
            type: 'syntax_warning',
            severity: 'warning',
            file: 'test.sql',
            message: 'Consider CONCURRENTLY',
          },
        ],
        filesChecked: 1,
        summary: 'Files: 1, Critical: 0, Warnings: 1',
      }

      const output = formatResults(result)
      expect(output).toContain('**Status**: WARN')
      expect(output).toContain('### Warnings')
      expect(output).toContain('Consider CONCURRENTLY')
    })
  })
})
