import { readFile, readdir } from 'fs/promises'
import { join, basename } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Duplication Lens Node
 *
 * Detects cross-app copy-paste patterns and shared package underuse.
 */

const APP_DIRS = [
  'apps/web/main-app',
  'apps/web/app-dashboard',
  'apps/web/app-inspiration-gallery',
  'apps/web/app-instructions-gallery',
  'apps/web/app-sets-gallery',
  'apps/web/app-wishlist-gallery',
  'apps/web/user-settings',
]

/**
 * Find files with the same name across different apps
 */
async function findCrossAppDuplicates(targetFiles: string[]): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  const filesByName = new Map<string, string[]>()

  for (const file of targetFiles) {
    // Only check app files
    if (!file.includes('apps/web/')) continue
    // Skip test files
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue

    const name = basename(file)
    const existing = filesByName.get(name) || []
    existing.push(file)
    filesByName.set(name, existing)
  }

  let counter = 0
  for (const [name, paths] of filesByName) {
    if (paths.length < 2) continue

    // Check if files are in different apps
    const apps = new Set(paths.map(p => {
      const match = p.match(/apps\/web\/([^/]+)/)
      return match ? match[1] : ''
    }).filter(Boolean))

    if (apps.size >= 2) {
      counter++
      findings.push({
        id: `DUP-${String(counter).padStart(3, '0')}`,
        lens: 'duplication',
        severity: 'high',
        confidence: 'medium',
        title: `${name} duplicated across ${apps.size} apps`,
        file: paths[0],
        evidence: `Same filename in: ${paths.join(', ')}`,
        remediation: 'Extract to shared package or verify intentional divergence',
        status: 'new',
      })
    }
  }

  return findings
}

/**
 * Check for known duplication patterns
 */
async function checkKnownDuplicationPatterns(targetFiles: string[]): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = []
  const knownDuplicates = [
    'use-module-auth',
    'useLocalStorage',
    'useUnsavedChangesPrompt',
    'useAnnouncer',
    'useRovingTabIndex',
  ]

  let counter = 100

  for (const file of targetFiles) {
    if (!file.includes('apps/web/')) continue
    const name = basename(file, '.ts').replace('.tsx', '')

    for (const known of knownDuplicates) {
      if (name === known || file.includes(`/${known}.`)) {
        counter++
        findings.push({
          id: `DUP-${String(counter).padStart(3, '0')}`,
          lens: 'duplication',
          severity: 'medium',
          confidence: 'high',
          title: `Known duplicate pattern: ${known} in app instead of shared package`,
          file,
          evidence: `${known} should be imported from shared package, not reimplemented per-app`,
          remediation: 'Move to shared package (@repo/hooks or @repo/accessibility)',
          status: 'new',
        })
      }
    }
  }

  return findings
}

export async function run(state: CodeAuditState): Promise<LensResult> {
  const files = state.targetFiles || []
  const crossAppDups = await findCrossAppDuplicates(files)
  const knownDups = await checkKnownDuplicationPatterns(files)
  const allFindings = [...crossAppDups, ...knownDups]

  // Re-number
  allFindings.forEach((f, i) => {
    f.id = `DUP-${String(i + 1).padStart(3, '0')}`
  })

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'duplication',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
