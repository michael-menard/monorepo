/**
 * Orphaned Test Detector
 *
 * Finds test files under **\/__tests__\/**\/*.test.ts that have no corresponding
 * source file adjacent to their __tests__ directory. Excludes files under
 * fixtures/ and __types__/ directories.
 *
 * A test file is considered orphaned when a source file with the same base name
 * does NOT exist in the parent directory of __tests__/.
 *
 * E.g.  src/foo/__tests__/bar.test.ts  →  expects  src/foo/bar.ts  to exist
 *
 * APIP-4040 AC-4
 */

import { access } from 'node:fs/promises'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import { OrphanedTestResultSchema, type OrphanedTestResult } from './schemas.js'

// Extensions checked for source files (in order)
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']

/**
 * Determines whether a test file path should be excluded from orphan detection.
 * Excludes files under fixtures/ or __types__/ directories.
 */
function isExcluded(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/')
  return normalized.includes('/fixtures/') || normalized.includes('/__types__/')
}

/**
 * Given the relative path to a test file, derives the expected source file paths.
 *
 * src/foo/__tests__/bar.test.ts  →  src/foo/bar.{ts,tsx,...}
 */
function deriveSourcePaths(testRelPath: string, scanRoot: string): string[] {
  const absTestPath = path.join(scanRoot, testRelPath)

  // Remove .test.ts / .spec.ts suffix to get base name
  const basename = path.basename(absTestPath)
  const baseStem = basename
    .replace(/\.test\.[tj]sx?$/, '')
    .replace(/\.spec\.[tj]sx?$/, '')

  // Navigate up from __tests__/ to find the parent source dir
  const testsDir = path.dirname(absTestPath)
  const parentDir = path.dirname(testsDir)

  return SOURCE_EXTENSIONS.map(ext => path.join(parentDir, baseStem + ext))
}

/**
 * Checks whether any of the candidate source paths exist.
 */
async function sourceExists(candidatePaths: string[]): Promise<boolean> {
  for (const p of candidatePaths) {
    try {
      await access(p)
      return true
    } catch {
      // not found — try next
    }
  }
  return false
}

/**
 * Detects orphaned test files under scanRoot.
 *
 * @param scanRoot - Absolute path to scan
 * @returns OrphanedTestResult
 */
export async function collectOrphanedTests(scanRoot: string = '.'): Promise<OrphanedTestResult> {
  const detectedAt = new Date().toISOString()

  try {
    const resolvedRoot = path.resolve(scanRoot)
    const pattern = '**/__tests__/**/*.{test,spec}.{ts,tsx}'

    const fileIterator = glob(pattern, { cwd: resolvedRoot })

    const orphanedFiles: string[] = []

    for await (const relPath of fileIterator) {
      // Skip excluded directories
      if (isExcluded(relPath)) continue

      const candidateSources = deriveSourcePaths(relPath, resolvedRoot)
      const hasSource = await sourceExists(candidateSources)

      if (!hasSource) {
        orphanedFiles.push(relPath)
      }
    }

    return OrphanedTestResultSchema.parse({
      orphanedFiles,
      orphanedCount: orphanedFiles.length,
      detectedAt,
      success: true,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during orphaned test detection'

    return OrphanedTestResultSchema.parse({
      orphanedFiles: [],
      orphanedCount: 0,
      detectedAt,
      success: false,
      error: errorMessage,
    })
  }
}
