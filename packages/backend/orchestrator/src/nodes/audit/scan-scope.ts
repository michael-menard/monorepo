import { z } from 'zod'
import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'

import type { CodeAuditConfig, CodeAuditState } from '../../graphs/code-audit.js'

/**
 * Scan Scope Node
 *
 * Phase 0: Discover files to audit based on scope and target.
 */

export const ScanScopeResultSchema = z.object({
  targetFiles: z.array(z.string()),
  fileCategories: z.record(z.string(), z.number().int().min(0)),
  previousAudit: z.string().nullable(),
})

export type ScanScopeResult = z.infer<typeof ScanScopeResultSchema>

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  'coverage',
  '.turbo',
  '.git',
])

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

/**
 * Recursively walk a directory and collect source files
 */
async function walkSourceFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      const subFiles = await walkSourceFiles(fullPath)
      files.push(...subFiles)
    } else if (entry.isFile()) {
      const ext = extname(entry.name)
      if (SOURCE_EXTENSIONS.has(ext) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Categorize a file based on its path
 */
function categorizeFile(filePath: string): string {
  if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) {
    return 'tests'
  }
  if (filePath.includes('apps/web/')) return 'frontend'
  if (filePath.includes('apps/api/')) return 'backend'
  if (filePath.includes('packages/')) return 'shared'
  if (filePath.includes('.config.') || filePath.includes('tsconfig')) return 'config'
  return 'other'
}

/**
 * Find the most recent previous audit file
 */
async function findPreviousAudit(auditDir: string): Promise<string | null> {
  try {
    const entries = await readdir(auditDir)
    const findings = entries
      .filter(f => f.startsWith('FINDINGS-') && f.endsWith('.yaml'))
      .sort()
      .reverse()

    return findings.length > 0 ? findings[0] : null
  } catch {
    return null
  }
}

/**
 * Main scan scope function
 */
export async function scanScope(
  state: CodeAuditState,
  config: CodeAuditConfig,
): Promise<Partial<CodeAuditState>> {
  const target = config.target || state.target || 'apps/'

  // Discover files based on scope
  const targetFiles = await walkSourceFiles(target)

  // Categorize
  const categories: Record<string, number> = {}
  for (const file of targetFiles) {
    const cat = categorizeFile(file)
    categories[cat] = (categories[cat] || 0) + 1
  }

  // Check for previous audit
  const previousAudit = await findPreviousAudit('plans/audit')

  return {
    targetFiles,
    fileCategories: categories,
    previousAudit,
  }
}
