import { readdir, access } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'

import type { CodeAuditState } from '../../graphs/code-audit.js'
import type { LensResult, AuditFinding } from '../../artifacts/audit-findings.js'

/**
 * Test Coverage Lens Node
 *
 * Identifies untested files, skipped suites, and coverage gaps.
 */

function isTestFile(filePath: string): boolean {
  return filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')
}

function isSourceFile(filePath: string): boolean {
  const ext = extname(filePath)
  return (ext === '.ts' || ext === '.tsx') && !filePath.endsWith('.d.ts')
}

/**
 * Generate expected test file paths for a source file
 */
function expectedTestPaths(srcPath: string): string[] {
  const dir = dirname(srcPath)
  const name = basename(srcPath, extname(srcPath))
  const ext = extname(srcPath)

  return [
    join(dir, '__tests__', `${name}.test${ext}`),
    join(dir, '__tests__', `${name}.test.tsx`),
    join(dir, '__tests__', `${name}.test.ts`),
    join(dir, `${name}.test${ext}`),
    join(dir, `${name}.test.tsx`),
    join(dir, `${name}.test.ts`),
    join(dir, `${name}.spec${ext}`),
  ]
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a source file has a corresponding test file
 */
async function hasTestFile(srcPath: string): Promise<boolean> {
  const testPaths = expectedTestPaths(srcPath)
  for (const testPath of testPaths) {
    if (await fileExists(testPath)) return true
  }
  return false
}

/**
 * Determine if a file is critical (should have higher test coverage)
 */
function isCriticalFile(filePath: string): boolean {
  return (
    filePath.includes('/middleware/') ||
    filePath.includes('/auth/') ||
    filePath.includes('/handlers/') ||
    filePath.includes('/services/') ||
    filePath.includes('/api/')
  )
}

export async function run(state: CodeAuditState): Promise<LensResult> {
  const files = state.targetFiles || []
  const allFindings: AuditFinding[] = []
  let counter = 0

  for (const file of files) {
    if (!isSourceFile(file)) continue
    if (isTestFile(file)) continue
    // Skip index files, type files, config files
    if (basename(file) === 'index.ts' && !file.includes('/handlers/')) continue
    if (file.includes('__types__')) continue
    if (file.includes('.config.')) continue

    const hasTest = await hasTestFile(file)

    if (!hasTest) {
      const critical = isCriticalFile(file)
      counter++
      allFindings.push({
        id: `TEST-${String(counter).padStart(3, '0')}`,
        lens: 'test-coverage',
        severity: critical ? 'high' : 'medium',
        confidence: 'high',
        title: `No test file for ${basename(file)}`,
        file,
        evidence: 'No corresponding test file found',
        remediation: `Create test file at ${expectedTestPaths(file)[0]}`,
        status: 'new',
      })
    }
  }

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const f of allFindings) {
    bySeverity[f.severity]++
  }

  return {
    lens: 'test-coverage',
    total_findings: allFindings.length,
    by_severity: bySeverity,
    findings: allFindings,
  }
}
