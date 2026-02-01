#!/usr/bin/env tsx
/**
 * Schema Validation Script for CI
 *
 * Validates database schema changes against evolution policies.
 * Detects breaking changes, validates migration naming, and ensures journal consistency.
 *
 * @see WISH-20180 - CI Job to Validate Schema Changes Against Policy
 * @see SCHEMA-EVOLUTION-POLICY.md for policy documentation
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, basename } from 'path'

// ============================================================================
// Types
// ============================================================================

type ViolationType =
  | 'breaking_change'
  | 'naming_convention'
  | 'journal_missing'
  | 'journal_duplicate'
  | 'syntax_warning'
  | 'migration_deleted'

type Severity = 'critical' | 'warning' | 'info'

interface Violation {
  type: ViolationType
  severity: Severity
  file: string
  line?: number
  message: string
  details?: string
  policyRef?: string
}

interface ValidationResult {
  status: 'pass' | 'warn' | 'fail'
  violations: Violation[]
  filesChecked: number
  summary: string
}

interface JournalEntry {
  idx: number
  version: string
  when: number
  tag: string
  breakpoints: boolean
}

interface MigrationJournal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

// ============================================================================
// Constants
// ============================================================================

const MIGRATION_DIR = 'packages/backend/database-schema/src/migrations/app'
const JOURNAL_PATH = `${MIGRATION_DIR}/meta/_journal.json`
const SCHEMA_DIR = 'packages/backend/database-schema/src'

// Migration file naming pattern: XXXX_description.sql (4 digits + underscore + description)
const MIGRATION_NAME_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/

// Breaking change patterns (case-insensitive)
const BREAKING_CHANGE_PATTERNS = [
  { pattern: /DROP\s+COLUMN/i, type: 'DROP COLUMN', policyRef: 'Section 2.1 - Breaking Changes' },
  { pattern: /DROP\s+TABLE/i, type: 'DROP TABLE', policyRef: 'Section 2.1 - Breaking Changes' },
  {
    pattern: /ALTER\s+(?:TABLE\s+\w+\s+)?(?:ALTER\s+)?COLUMN\s+\w+\s+(?:SET\s+DATA\s+)?TYPE/i,
    type: 'ALTER COLUMN TYPE',
    policyRef: 'Section 2.1 - Breaking Changes',
  },
  {
    pattern: /ALTER\s+TYPE\s+\w+\s+RENAME\s+VALUE/i,
    type: 'RENAME ENUM VALUE',
    policyRef: 'Section 2.2 - Enum Changes',
  },
]

// Warning patterns for non-breaking but risky changes
const WARNING_PATTERNS = [
  {
    pattern: /CREATE\s+INDEX(?!\s+CONCURRENTLY)/i,
    antiPattern: /CREATE\s+INDEX\s+CONCURRENTLY/i,
    type: 'INDEX WITHOUT CONCURRENTLY',
    message: 'Consider using CREATE INDEX CONCURRENTLY for production safety',
    policyRef: 'Section 4.2 - Index Creation',
  },
  {
    pattern: /ADD\s+COLUMN\s+\w+\s+\w+\s+NOT\s+NULL(?!\s+DEFAULT)/i,
    type: 'REQUIRED COLUMN WITHOUT DEFAULT',
    message: 'Required column added without DEFAULT - ensure backfill migration exists',
    policyRef: 'Section 3.1 - Adding Columns',
  },
]

// Deprecation comment patterns that allow breaking changes
const DEPRECATION_PATTERNS = [
  /--\s*DEPRECATED:/i,
  /--\s*BREAKING\s+CHANGE\s+APPROVED:/i,
  /--\s*schema-validation:\s*skip/i,
]

// ============================================================================
// Git Operations
// ============================================================================

function getBaseBranch(): string {
  // In GitHub Actions, GITHUB_BASE_REF is the target branch of PR
  // Fallback to main for local testing
  return process.env.GITHUB_BASE_REF || 'main'
}

function getChangedFiles(baseBranch: string): string[] {
  try {
    // Fetch the base branch to ensure we have it
    try {
      execSync(`git fetch origin ${baseBranch}`, { encoding: 'utf-8', stdio: 'pipe' })
    } catch {
      // Might already be fetched or in local testing
    }

    // Get files changed compared to base branch
    const diffOutput = execSync(
      `git diff --name-only --diff-filter=ADMR origin/${baseBranch}...HEAD -- "${SCHEMA_DIR}" "${MIGRATION_DIR}"`,
      { encoding: 'utf-8' },
    )

    return diffOutput
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0)
  } catch (error) {
    // Fallback: check for any staged/unstaged changes
    console.warn('Warning: Could not compare with base branch, checking local changes')
    try {
      const diffOutput = execSync(
        `git diff --name-only HEAD -- "${SCHEMA_DIR}" "${MIGRATION_DIR}"`,
        {
          encoding: 'utf-8',
        },
      )
      return diffOutput
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0)
    } catch {
      return []
    }
  }
}

function getDeletedMigrationFiles(baseBranch: string): string[] {
  try {
    const diffOutput = execSync(
      `git diff --name-only --diff-filter=D origin/${baseBranch}...HEAD -- "${MIGRATION_DIR}"`,
      { encoding: 'utf-8' },
    )

    return diffOutput
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.endsWith('.sql'))
  } catch {
    return []
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateMigrationNaming(file: string): Violation | null {
  const filename = basename(file)

  // Only validate .sql files in migrations directory
  if (!file.includes('/migrations/') || !file.endsWith('.sql')) {
    return null
  }

  // Skip meta directory
  if (file.includes('/meta/')) {
    return null
  }

  if (!MIGRATION_NAME_PATTERN.test(filename)) {
    return {
      type: 'naming_convention',
      severity: 'critical',
      file,
      message: `Migration file name "${filename}" does not match required pattern XXXX_description.sql`,
      details: 'Migration files must start with 4 digits, followed by underscore and description',
      policyRef: 'WISH-2057 AC 5 - Migration Naming Convention',
    }
  }

  return null
}

function validateJournalUpdated(changedFiles: string[], journal: MigrationJournal): Violation[] {
  const violations: Violation[] = []

  // Get new migration files
  const newMigrations = changedFiles.filter(
    f => f.includes('/migrations/app/') && f.endsWith('.sql') && !f.includes('/meta/'),
  )

  for (const migrationFile of newMigrations) {
    const filename = basename(migrationFile, '.sql')

    // Check if journal has entry for this migration
    const hasEntry = journal.entries.some(entry => entry.tag === filename)

    if (!hasEntry) {
      violations.push({
        type: 'journal_missing',
        severity: 'critical',
        file: JOURNAL_PATH,
        message: `Migration "${filename}" is missing from _journal.json`,
        details: `Add entry with tag: "${filename}" to meta/_journal.json`,
        policyRef: 'Section 5.1 - Migration Journal',
      })
    }
  }

  return violations
}

function validateJournalConsistency(journal: MigrationJournal): Violation[] {
  const violations: Violation[] = []
  const seenIdx = new Set<number>()

  for (const entry of journal.entries) {
    if (seenIdx.has(entry.idx)) {
      violations.push({
        type: 'journal_duplicate',
        severity: 'critical',
        file: JOURNAL_PATH,
        message: `Duplicate migration index ${entry.idx} found in _journal.json`,
        details: `Migration tag: "${entry.tag}" has duplicate idx`,
        policyRef: 'Section 5.1 - Migration Journal',
      })
    }
    seenIdx.add(entry.idx)
  }

  // Check for gaps in idx sequence
  const sortedIdx = Array.from(seenIdx).sort((a, b) => a - b)
  for (let i = 0; i < sortedIdx.length; i++) {
    if (sortedIdx[i] !== i) {
      violations.push({
        type: 'journal_duplicate',
        severity: 'warning',
        file: JOURNAL_PATH,
        message: `Gap in migration index sequence at position ${i}`,
        details: 'Migration indices should be sequential starting from 0',
        policyRef: 'Section 5.1 - Migration Journal',
      })
      break
    }
  }

  return violations
}

function detectBreakingChanges(file: string, sql: string): Violation[] {
  const violations: Violation[] = []
  const lines = sql.split('\n')

  // Check for deprecation/skip comments in file
  const hasDeprecationComment = DEPRECATION_PATTERNS.some(pattern => pattern.test(sql))

  for (const { pattern, type, policyRef } of BREAKING_CHANGE_PATTERNS) {
    const matches = sql.match(new RegExp(pattern, 'gi'))
    if (matches) {
      for (const match of matches) {
        // Find line number
        let lineNum = 1
        for (const line of lines) {
          if (line.includes(match.trim().split(/\s+/)[0])) {
            break
          }
          lineNum++
        }

        if (hasDeprecationComment) {
          violations.push({
            type: 'breaking_change',
            severity: 'warning',
            file,
            line: lineNum,
            message: `Breaking change (${type}) with deprecation notice`,
            details: `Statement: ${match.substring(0, 100)}...`,
            policyRef,
          })
        } else {
          violations.push({
            type: 'breaking_change',
            severity: 'critical',
            file,
            line: lineNum,
            message: `Breaking change detected: ${type}`,
            details: `Statement: ${match.substring(0, 100)}. Add deprecation comment to override.`,
            policyRef,
          })
        }
      }
    }
  }

  return violations
}

function detectWarnings(file: string, sql: string): Violation[] {
  const violations: Violation[] = []

  for (const { pattern, antiPattern, type, message, policyRef } of WARNING_PATTERNS) {
    // Check if pattern matches but anti-pattern doesn't
    if (pattern.test(sql)) {
      if (antiPattern && antiPattern.test(sql)) {
        continue // Has the safe version, skip warning
      }

      violations.push({
        type: 'syntax_warning',
        severity: 'warning',
        file,
        message: `${type}: ${message}`,
        policyRef,
      })
    }
  }

  return violations
}

function validateDeletedMigrations(deletedFiles: string[]): Violation[] {
  return deletedFiles.map(file => ({
    type: 'migration_deleted' as ViolationType,
    severity: 'critical' as Severity,
    file,
    message: 'Migration file deletion detected',
    details: 'Applied migrations must not be deleted. Revert this deletion.',
    policyRef: 'Section 5.2 - Migration Immutability',
  }))
}

// ============================================================================
// Main Validation
// ============================================================================

async function validateMigrations(): Promise<ValidationResult> {
  const violations: Violation[] = []
  const baseBranch = getBaseBranch()

  console.log(`\n## Schema Validation`)
  console.log(`Base branch: ${baseBranch}`)
  console.log('')

  // Get changed files
  const changedFiles = getChangedFiles(baseBranch)
  const deletedFiles = getDeletedMigrationFiles(baseBranch)

  if (changedFiles.length === 0 && deletedFiles.length === 0) {
    console.log('No schema changes detected.')
    return {
      status: 'pass',
      violations: [],
      filesChecked: 0,
      summary: 'No schema changes detected',
    }
  }

  console.log(`Files to validate: ${changedFiles.length}`)
  changedFiles.forEach(f => console.log(`  - ${f}`))
  console.log('')

  // Check for deleted migrations
  if (deletedFiles.length > 0) {
    violations.push(...validateDeletedMigrations(deletedFiles))
  }

  // Load journal
  let journal: MigrationJournal = { version: '7', dialect: 'postgresql', entries: [] }
  const journalPath = join(process.cwd(), JOURNAL_PATH)

  if (existsSync(journalPath)) {
    try {
      journal = JSON.parse(readFileSync(journalPath, 'utf-8'))
    } catch (error) {
      violations.push({
        type: 'journal_missing',
        severity: 'critical',
        file: JOURNAL_PATH,
        message: 'Failed to parse _journal.json',
        details: String(error),
      })
    }
  }

  // Validate journal consistency
  violations.push(...validateJournalConsistency(journal))

  // Validate journal has entries for new migrations
  violations.push(...validateJournalUpdated(changedFiles, journal))

  // Validate each changed file
  for (const file of changedFiles) {
    // Validate naming
    const namingViolation = validateMigrationNaming(file)
    if (namingViolation) {
      violations.push(namingViolation)
    }

    // Validate SQL content for migration files
    if (file.endsWith('.sql') && !file.includes('/meta/')) {
      const filePath = join(process.cwd(), file)
      if (existsSync(filePath)) {
        const sql = readFileSync(filePath, 'utf-8')
        violations.push(...detectBreakingChanges(file, sql))
        violations.push(...detectWarnings(file, sql))
      }
    }
  }

  // Determine status
  const hasCritical = violations.some(v => v.severity === 'critical')
  const hasWarning = violations.some(v => v.severity === 'warning')
  const status = hasCritical ? 'fail' : hasWarning ? 'warn' : 'pass'

  // Generate summary
  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const warningCount = violations.filter(v => v.severity === 'warning').length
  const summary = `Files: ${changedFiles.length}, Critical: ${criticalCount}, Warnings: ${warningCount}`

  return {
    status,
    violations,
    filesChecked: changedFiles.length,
    summary,
  }
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatResults(result: ValidationResult): string {
  const lines: string[] = []

  lines.push('## Schema Validation Results')
  lines.push('')
  lines.push('### Summary')
  lines.push(`- **Status**: ${result.status.toUpperCase()}`)
  lines.push(`- **Files checked**: ${result.filesChecked}`)
  lines.push(
    `- **Critical violations**: ${result.violations.filter(v => v.severity === 'critical').length}`,
  )
  lines.push(`- **Warnings**: ${result.violations.filter(v => v.severity === 'warning').length}`)
  lines.push('')

  // Group violations by severity
  const critical = result.violations.filter(v => v.severity === 'critical')
  const warnings = result.violations.filter(v => v.severity === 'warning')

  if (critical.length > 0) {
    lines.push('### Critical Violations')
    lines.push('')
    for (const v of critical) {
      lines.push(`#### ${v.type.toUpperCase().replace(/_/g, ' ')}`)
      lines.push(`- **File**: \`${v.file}${v.line ? `:${v.line}` : ''}\``)
      lines.push(`- **Message**: ${v.message}`)
      if (v.details) {
        lines.push(`- **Details**: ${v.details}`)
      }
      if (v.policyRef) {
        lines.push(`- **Policy**: ${v.policyRef}`)
      }
      lines.push('')
    }
  }

  if (warnings.length > 0) {
    lines.push('### Warnings')
    lines.push('')
    for (const v of warnings) {
      lines.push(`#### ${v.type.toUpperCase().replace(/_/g, ' ')}`)
      lines.push(`- **File**: \`${v.file}${v.line ? `:${v.line}` : ''}\``)
      lines.push(`- **Message**: ${v.message}`)
      if (v.details) {
        lines.push(`- **Details**: ${v.details}`)
      }
      if (v.policyRef) {
        lines.push(`- **Policy**: ${v.policyRef}`)
      }
      lines.push('')
    }
  }

  if (result.status === 'pass') {
    lines.push('### All Checks Passed')
    lines.push('')
    lines.push('Schema changes comply with evolution policies.')
  }

  return lines.join('\n')
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  try {
    const result = await validateMigrations()
    const output = formatResults(result)

    console.log(output)

    // Write output to file for GitHub Actions to read
    const outputPath = process.env.GITHUB_OUTPUT
    if (outputPath) {
      // Use delimiter for multiline output
      writeFileSync(outputPath, `result<<EOF\n${output}\nEOF\n`, { flag: 'a' })
    }

    // Also write to a known location for PR comments
    const artifactPath = join(process.cwd(), 'schema-validation-results.md')
    writeFileSync(artifactPath, output)

    // Exit with appropriate code
    if (result.status === 'fail') {
      console.error('\n SCHEMA VALIDATION FAILED - Critical violations detected')
      process.exit(1)
    } else if (result.status === 'warn') {
      console.warn('\n SCHEMA VALIDATION PASSED WITH WARNINGS')
      process.exit(0)
    } else {
      console.log('\n SCHEMA VALIDATION PASSED')
      process.exit(0)
    }
  } catch (error) {
    console.error('Schema validation failed with error:', error)
    process.exit(1)
  }
}

// Run if executed directly (not when imported for testing)
// Check if this is the main module being run
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  main()
}

// Export for testing
export {
  validateMigrationNaming,
  validateJournalUpdated,
  validateJournalConsistency,
  detectBreakingChanges,
  detectWarnings,
  validateDeletedMigrations,
  formatResults,
  type Violation,
  type ValidationResult,
  type MigrationJournal,
}
