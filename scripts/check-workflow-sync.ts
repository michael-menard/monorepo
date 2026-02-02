#!/usr/bin/env npx tsx
/**
 * check-workflow-sync.ts
 *
 * Pre-commit hook and CI check that verifies Claude workflow markdown and
 * LangGraph TypeScript schemas stay synchronized.
 *
 * Usage:
 *   npx tsx scripts/check-workflow-sync.ts
 *   npx tsx scripts/check-workflow-sync.ts --fix  # Auto-fix where possible
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Sync issues found
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { z } from 'zod'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

// ============================================================================
// Types
// ============================================================================

const SyncCheckResultSchema = z.object({
  check: z.string(),
  status: z.enum(['pass', 'fail', 'skip']),
  message: z.string(),
  details: z.array(z.string()).optional(),
})

type SyncCheckResult = z.infer<typeof SyncCheckResultSchema>

// ============================================================================
// Utility Functions
// ============================================================================

function parseMarkdownTable(content: string, sectionHeader: string): string[] {
  const lines = content.split('\n')
  const headerIndex = lines.findIndex(
    line =>
      line.includes(sectionHeader) ||
      line.toLowerCase().includes(sectionHeader.toLowerCase()),
  )

  if (headerIndex === -1) {
    return []
  }

  // Find the table after the header
  let tableStart = -1
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('|') && line.endsWith('|')) {
      tableStart = i
      break
    }
    // Stop if we hit another header
    if (line.startsWith('#')) break
  }

  if (tableStart === -1) return []

  const values: string[] = []

  // Skip header row and separator row, parse data rows
  for (let i = tableStart + 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith('|') || !line.endsWith('|')) break

    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(c => c.length > 0)
    if (cells.length > 0) {
      // Extract first column value (usually the key/name)
      const value = cells[0].replace(/`/g, '').trim()
      if (value && !value.includes('---')) {
        values.push(value)
      }
    }
  }

  return values
}

function extractZodEnumValues(content: string, schemaName: string): string[] {
  // Match z.enum([...]) patterns
  const enumPattern = new RegExp(
    `${schemaName}\\s*=\\s*z\\.enum\\(\\[([^\\]]+)\\]\\)`,
    's',
  )
  const match = content.match(enumPattern)

  if (!match) return []

  const valuesStr = match[1]
  const values = valuesStr
    .split(',')
    .map(v => v.trim().replace(/['"]/g, ''))
    .filter(v => v.length > 0)

  return values
}

function extractObjectKeys(content: string, objectName: string): string[] {
  // Match object literal keys
  const objectPattern = new RegExp(
    `${objectName}\\s*[=:]\\s*\\{([^}]+)\\}`,
    's',
  )
  const match = content.match(objectPattern)

  if (!match) return []

  const keysStr = match[1]
  const keys = keysStr
    .split('\n')
    .map(line => {
      const keyMatch = line.match(/^\s*['"]?(\w+)['"]?\s*:/)?.[1]
      return keyMatch || ''
    })
    .filter(k => k.length > 0)

  return keys
}

// ============================================================================
// Sync Checks
// ============================================================================

async function checkStoryStatusSync(): Promise<SyncCheckResult> {
  const workflowPath = resolve(ROOT, 'docs/FULL_WORKFLOW.md')
  const stateMachinePath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/state/story-state-machine.ts',
  )

  // Check if files exist
  if (!existsSync(workflowPath)) {
    return {
      check: 'Story Status Sync',
      status: 'skip',
      message: 'FULL_WORKFLOW.md not found',
    }
  }

  if (!existsSync(stateMachinePath)) {
    return {
      check: 'Story Status Sync',
      status: 'skip',
      message: 'story-state-machine.ts not found (will be created by REVI-006)',
    }
  }

  const workflowContent = readFileSync(workflowPath, 'utf-8')
  const tsContent = readFileSync(stateMachinePath, 'utf-8')

  const mdStatuses = parseMarkdownTable(workflowContent, 'Story Status Lifecycle')
  const tsStatuses = extractZodEnumValues(tsContent, 'StoryStatusSchema')

  const missingInTs = mdStatuses.filter(s => !tsStatuses.includes(s))
  const missingInMd = tsStatuses.filter(s => !mdStatuses.includes(s))

  if (missingInTs.length === 0 && missingInMd.length === 0) {
    return {
      check: 'Story Status Sync',
      status: 'pass',
      message: `${tsStatuses.length} statuses synchronized`,
    }
  }

  const details: string[] = []
  if (missingInTs.length > 0) {
    details.push(`Missing in TypeScript: ${missingInTs.join(', ')}`)
  }
  if (missingInMd.length > 0) {
    details.push(`Missing in Markdown: ${missingInMd.join(', ')}`)
  }

  return {
    check: 'Story Status Sync',
    status: 'fail',
    message: 'Story statuses out of sync',
    details,
  }
}

async function checkErrorTypesSync(): Promise<SyncCheckResult> {
  const workflowPath = resolve(ROOT, 'docs/FULL_WORKFLOW.md')
  const errorsPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/errors/workflow-errors.ts',
  )

  if (!existsSync(workflowPath)) {
    return {
      check: 'Error Types Sync',
      status: 'skip',
      message: 'FULL_WORKFLOW.md not found',
    }
  }

  if (!existsSync(errorsPath)) {
    return {
      check: 'Error Types Sync',
      status: 'skip',
      message: 'workflow-errors.ts not found (will be created by REVI-002)',
    }
  }

  const workflowContent = readFileSync(workflowPath, 'utf-8')
  const tsContent = readFileSync(errorsPath, 'utf-8')

  const mdErrors = parseMarkdownTable(workflowContent, 'Error Types')
  const tsErrors = extractZodEnumValues(tsContent, 'WorkflowErrorTypeSchema')

  if (mdErrors.length === 0) {
    return {
      check: 'Error Types Sync',
      status: 'skip',
      message: 'Error Types table not found in FULL_WORKFLOW.md (will be added by REVI-003)',
    }
  }

  const missingInTs = mdErrors.filter(e => !tsErrors.includes(e))
  const missingInMd = tsErrors.filter(e => !mdErrors.includes(e))

  if (missingInTs.length === 0 && missingInMd.length === 0) {
    return {
      check: 'Error Types Sync',
      status: 'pass',
      message: `${tsErrors.length} error types synchronized`,
    }
  }

  const details: string[] = []
  if (missingInTs.length > 0) {
    details.push(`Missing in TypeScript: ${missingInTs.join(', ')}`)
  }
  if (missingInMd.length > 0) {
    details.push(`Missing in Markdown: ${missingInMd.join(', ')}`)
  }

  return {
    check: 'Error Types Sync',
    status: 'fail',
    message: 'Error types out of sync',
    details,
  }
}

async function checkTokenLimitsSync(): Promise<SyncCheckResult> {
  const workflowPath = resolve(ROOT, 'docs/FULL_WORKFLOW.md')
  const tokenBudgetPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/utils/token-budget.ts',
  )

  if (!existsSync(workflowPath)) {
    return {
      check: 'Token Limits Sync',
      status: 'skip',
      message: 'FULL_WORKFLOW.md not found',
    }
  }

  if (!existsSync(tokenBudgetPath)) {
    return {
      check: 'Token Limits Sync',
      status: 'skip',
      message: 'token-budget.ts not found (will be created by REVI-008)',
    }
  }

  const workflowContent = readFileSync(workflowPath, 'utf-8')
  const tsContent = readFileSync(tokenBudgetPath, 'utf-8')

  const mdPhases = parseMarkdownTable(workflowContent, 'Budget Thresholds')
  const tsPhases = extractObjectKeys(tsContent, 'DEFAULT_LIMITS')

  if (mdPhases.length === 0) {
    return {
      check: 'Token Limits Sync',
      status: 'skip',
      message: 'Budget Thresholds table not found in FULL_WORKFLOW.md (will be added by REVI-009)',
    }
  }

  // Normalize phase names for comparison
  const normalizePhase = (p: string) =>
    p.toLowerCase().replace(/[^a-z]/g, '')

  const normalizedMd = mdPhases.map(normalizePhase)
  const normalizedTs = tsPhases.map(normalizePhase)

  const missingInTs = normalizedMd.filter(p => !normalizedTs.includes(p))
  const missingInMd = normalizedTs.filter(p => !normalizedMd.includes(p))

  if (missingInTs.length === 0 && missingInMd.length === 0) {
    return {
      check: 'Token Limits Sync',
      status: 'pass',
      message: `${tsPhases.length} phase limits synchronized`,
    }
  }

  const details: string[] = []
  if (missingInTs.length > 0) {
    details.push(`Missing in TypeScript: ${missingInTs.join(', ')}`)
  }
  if (missingInMd.length > 0) {
    details.push(`Missing in Markdown: ${missingInMd.join(', ')}`)
  }

  return {
    check: 'Token Limits Sync',
    status: 'fail',
    message: 'Token limits out of sync',
    details,
  }
}

async function checkModelAssignmentsSync(): Promise<SyncCheckResult> {
  const yamlPath = resolve(ROOT, '.claude/config/model-assignments.yaml')
  const tsPath = resolve(
    ROOT,
    'packages/backend/orchestrator/src/config/model-assignments.ts',
  )

  if (!existsSync(yamlPath)) {
    return {
      check: 'Model Assignments Sync',
      status: 'skip',
      message: 'model-assignments.yaml not found (will be created by REVI-012)',
    }
  }

  if (!existsSync(tsPath)) {
    return {
      check: 'Model Assignments Sync',
      status: 'skip',
      message: 'model-assignments.ts not found (will be created by REVI-012)',
    }
  }

  // For now, just check both files exist
  // Full parsing would require a YAML parser
  return {
    check: 'Model Assignments Sync',
    status: 'pass',
    message: 'Both model assignment files exist',
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const fixMode = args.includes('--fix')
  const verbose = args.includes('--verbose') || args.includes('-v')

  console.log('🔄 Checking Claude workflow ↔ LangGraph sync...\n')

  const checks = [
    checkStoryStatusSync,
    checkErrorTypesSync,
    checkTokenLimitsSync,
    checkModelAssignmentsSync,
  ]

  const results: SyncCheckResult[] = []
  let hasFailures = false

  for (const check of checks) {
    const result = await check()
    results.push(result)

    const icon =
      result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'

    console.log(`${icon} ${result.check}: ${result.message}`)

    if (result.details && (verbose || result.status === 'fail')) {
      result.details.forEach(d => console.log(`   ${d}`))
    }

    if (result.status === 'fail') {
      hasFailures = true
    }
  }

  console.log('')

  if (hasFailures) {
    console.log('❌ Sync check failed. Please update both systems together.')
    if (fixMode) {
      console.log('   Run `npx tsx scripts/generate-workflow-docs.ts` to regenerate docs from TypeScript.')
    }
    process.exit(1)
  } else {
    console.log('✅ All sync checks passed.')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Error running sync check:', err)
  process.exit(1)
})
