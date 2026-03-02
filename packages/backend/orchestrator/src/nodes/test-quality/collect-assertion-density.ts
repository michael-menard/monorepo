/**
 * Assertion Density Collector
 *
 * Scans all *.test.ts / *.spec.ts files under a configurable root,
 * counts expect()-style assertions and it()/test() declarations,
 * and returns a Zod-validated AssertionDensityResultSchema result.
 *
 * APIP-4040 AC-2
 */

import { readFile } from 'node:fs/promises'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import {
  AssertionDensityResultSchema,
  type FileDensityStat,
} from './schemas.js'

// Patterns used to count assertions and test declarations
// Matches expect(...), assert(...), assertThat(...)
const ASSERTION_PATTERN = /\bexpect\s*\(|\bassert\s*\(|\bassertThat\s*\(/g

// Matches it('...'), test('...'), it.each, test.each, it.only, test.only, etc.
const TEST_CASE_PATTERN = /\b(?:it|test)\s*(?:\.(?:each|only|skip|todo|concurrent))?\s*\(/g

/**
 * Counts assertion calls and test declarations in a single file's source.
 */
function countInSource(source: string): { assertionCount: number; testCount: number } {
  const assertionMatches = source.match(ASSERTION_PATTERN)
  const testMatches = source.match(TEST_CASE_PATTERN)
  return {
    assertionCount: assertionMatches?.length ?? 0,
    testCount: testMatches?.length ?? 0,
  }
}

/**
 * Collects assertion density metrics by scanning all test files under scanRoot.
 * Finds all *.test.ts / *.test.tsx / *.spec.ts / *.spec.tsx files recursively.
 *
 * @param scanRoot - Absolute or relative path to the directory to scan (default: cwd)
 * @returns AssertionDensityResult
 */
export async function collectAssertionDensity(scanRoot: string = '.'): Promise<import('./schemas.js').AssertionDensityResult> {
  const collectedAt = new Date().toISOString()

  try {
    const resolvedRoot = path.resolve(scanRoot)

    // Scan all test files (not restricted to __tests__/ subdirs)
    const pattern = '**/*.{test,spec}.{ts,tsx}'
    const fileIterator = glob(pattern, { cwd: resolvedRoot })

    const filePaths: string[] = []
    for await (const file of fileIterator) {
      filePaths.push(file)
    }

    // Process each file
    const fileStats: FileDensityStat[] = []
    let totalAssertions = 0
    let totalTests = 0

    for (const relPath of filePaths) {
      const absPath = path.join(resolvedRoot, relPath)
      try {
        const source = await readFile(absPath, 'utf-8')
        const { assertionCount, testCount } = countInSource(source)
        const densityRatio = testCount > 0 ? assertionCount / testCount : 0

        fileStats.push(
          AssertionDensityResultSchema.shape.fileStats.element.parse({
            filePath: relPath,
            assertionCount,
            testCount,
            densityRatio,
          }),
        )

        totalAssertions += assertionCount
        totalTests += testCount
      } catch {
        // Skip unreadable files
      }
    }

    const overallDensityRatio = totalTests > 0 ? totalAssertions / totalTests : 0

    return AssertionDensityResultSchema.parse({
      assertionCount: totalAssertions,
      testCount: totalTests,
      densityRatio: overallDensityRatio,
      fileStats,
      collectedAt,
      success: true,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during assertion density collection'
    return AssertionDensityResultSchema.parse({
      assertionCount: 0,
      testCount: 0,
      densityRatio: 0,
      fileStats: [],
      collectedAt,
      success: false,
      error: errorMessage,
    })
  }
}
