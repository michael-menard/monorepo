/**
 * Integration tests for the cohesion scanner.
 *
 * AC-13: Scans controlled __fixtures__ directory, verifies correct scores
 *        and cleanup story output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import {
  computeCategoryScore,
  assembleScanResult,
} from '../scorer.js'
import { detectImportConventionViolations } from '../detectors/import-convention.js'
import { detectZodNamingViolations } from '../detectors/zod-naming.js'
import { detectRouteHandlerViolations } from '../detectors/route-handler.js'
import { detectReactDirectoryViolations } from '../detectors/react-directory.js'
import { generateCohesionCleanupStory } from '../story-generator.js'
import { CohesionScannerConfigSchema } from '../__types__/index.js'

// ============================================================================
// Fixtures path
// ============================================================================

const FIXTURES_DIR = join(import.meta.dirname, '../__fixtures__')
const COMPLIANT_FILE = join(FIXTURES_DIR, 'compliant/sample-route.ts')
const VIOLATING_FILE = join(FIXTURES_DIR, 'violating/sample-route.ts')

// ============================================================================
// Integration: full scan pipeline
// ============================================================================

describe('Cohesion Scanner Integration', () => {
  let testRepoRoot: string

  beforeEach(() => {
    testRepoRoot = join(
      tmpdir(),
      `cohesion-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    mkdirSync(testRepoRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(testRepoRoot, { recursive: true, force: true })
  })

  it('scans compliant fixture and produces score close to 1.0 (AC-13)', () => {
    const violations = detectImportConventionViolations(COMPLIANT_FILE)
    const score = computeCategoryScore('import-convention', violations, 1, 0.8)

    // Compliant file → no violations → score = 1.0
    expect(score.score).toBe(1.0)
    expect(score.thresholdMet).toBe(true)
    expect(violations).toHaveLength(0)
  })

  it('scans violating fixture and produces violations (AC-13)', () => {
    const violations = detectImportConventionViolations(VIOLATING_FILE)
    const score = computeCategoryScore('import-convention', violations, 1, 0.8)

    // Violating file → console violations → score < 1.0
    expect(violations.length).toBeGreaterThan(0)
    expect(score.score).toBeLessThan(1.0)
    expect(score.thresholdMet).toBe(false) // score will be 0 for 1 file with violations
  })

  it('correctly identifies categoriesBelow in assembleScanResult (AC-13)', () => {
    const config = CohesionScannerConfigSchema.parse({ rootDir: FIXTURES_DIR })

    // Run all detectors on both fixture files
    const importViolationsCompliant = detectImportConventionViolations(COMPLIANT_FILE)
    const importViolationsViolating = detectImportConventionViolations(VIOLATING_FILE)
    const allImportViolations = [...importViolationsCompliant, ...importViolationsViolating]

    const zodViolations = [
      ...detectZodNamingViolations(COMPLIANT_FILE),
      ...detectZodNamingViolations(VIOLATING_FILE),
    ]
    const routeViolations = [
      ...detectRouteHandlerViolations(COMPLIANT_FILE),
      ...detectRouteHandlerViolations(VIOLATING_FILE),
    ]
    const reactViolations = [
      ...detectReactDirectoryViolations(COMPLIANT_FILE),
      ...detectReactDirectoryViolations(VIOLATING_FILE),
    ]

    const sampleSize = 2 // 2 files scanned

    const scores = [
      computeCategoryScore('import-convention', allImportViolations, sampleSize, 0.8),
      computeCategoryScore('zod-naming', zodViolations, sampleSize, 0.8),
      computeCategoryScore('route-handler', routeViolations, sampleSize, 0.8),
      computeCategoryScore('react-directory', reactViolations, sampleSize, 0.8),
    ]

    const result = assembleScanResult(scores, config, FIXTURES_DIR)

    // Import-convention should be below threshold (violating file has console.log)
    expect(result.categoriesBelow).toContain('import-convention')
    expect(result.overallThresholdMet).toBe(false)
    expect(result.totalViolations).toBeGreaterThan(0)
  })

  it('generates cleanup story for a failing category (AC-13)', async () => {
    const config = CohesionScannerConfigSchema.parse({ rootDir: FIXTURES_DIR })

    const violations = detectImportConventionViolations(VIOLATING_FILE)
    const categoryScore = computeCategoryScore('import-convention', violations, 1, 0.8)

    // Should be below threshold
    expect(categoryScore.thresholdMet).toBe(false)

    const result = await generateCohesionCleanupStory(
      {
        category: 'import-convention',
        score: categoryScore.score,
        threshold: config.thresholds['import-convention'] ?? 0.8,
        topViolations: violations.slice(0, 5),
        rootDir: FIXTURES_DIR,
        scannedAt: new Date().toISOString(),
      },
      {
        repoRoot: testRepoRoot,
        deduplicationWindowDays: 30,
      },
    )

    expect(result.created).toBe(true)
    expect(result.storyId).toMatch(/^COHCLEAN-\d{4}$/)
    expect(result.storyPath).toBeDefined()
  })

  it('verifies all detector outputs match PatternViolationSchema (AC-3)', () => {
    const allViolations = [
      ...detectImportConventionViolations(VIOLATING_FILE),
      ...detectZodNamingViolations(VIOLATING_FILE),
      ...detectRouteHandlerViolations(VIOLATING_FILE),
      ...detectReactDirectoryViolations(VIOLATING_FILE),
    ]

    for (const v of allViolations) {
      expect(v).toMatchObject({
        category: expect.stringMatching(
          /^(route-handler|zod-naming|react-directory|import-convention)$/,
        ),
        rule: expect.any(String),
        filePath: expect.any(String),
        description: expect.any(String),
        confidence: expect.stringMatching(/^(high|medium|low)$/),
      })
    }
  })
})
