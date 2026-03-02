/**
 * Decay Detector
 *
 * Compares two TestQualitySnapshots to detect metric regressions.
 * Returns a DecayDetectionResult indicating which metrics (if any) have
 * decayed below their configured floors.
 *
 * Mutation score comparison is included for future use (APIP-4040-B)
 * but only fires when both snapshots have non-null mutation scores.
 *
 * APIP-4040 AC-7
 */

import {
  DecayDetectionResultSchema,
  type DecayDetectionResult,
  type DecayedMetric,
  type TestQualitySnapshot,
} from './schemas.js'

/**
 * Compares a current snapshot against a previous snapshot and identifies
 * metrics that have decayed below their configured floors.
 *
 * @param current - The most recent TestQualitySnapshot
 * @param previous - The prior TestQualitySnapshot (null if first run)
 * @returns DecayDetectionResult
 */
export function detectDecay(
  current: TestQualitySnapshot,
  previous: TestQualitySnapshot | null,
): DecayDetectionResult {
  const decayedMetrics: DecayedMetric[] = []
  const config = current.config

  // ── Assertion density ────────────────────────────────────────────────────
  if (previous !== null && current.assertionDensityRatio < config.minAssertionDensity) {
    decayedMetrics.push({
      metric: 'assertionDensityRatio',
      previousValue: previous.assertionDensityRatio,
      currentValue: current.assertionDensityRatio,
      floor: config.minAssertionDensity,
      description: `Assertion density ${current.assertionDensityRatio.toFixed(2)} is below the floor ${config.minAssertionDensity}`,
    })
  }

  // ── Orphaned tests ───────────────────────────────────────────────────────
  if (previous !== null && current.orphanedTestCount > config.maxOrphanedTests) {
    decayedMetrics.push({
      metric: 'orphanedTestCount',
      previousValue: previous.orphanedTestCount,
      currentValue: current.orphanedTestCount,
      floor: config.maxOrphanedTests,
      description: `Orphaned test count ${current.orphanedTestCount} exceeds maximum ${config.maxOrphanedTests}`,
    })
  }

  // ── Critical path coverage ───────────────────────────────────────────────
  const coverageFloorPct = config.criticalPathCoverageFloor * 100
  if (previous !== null && current.criticalPathLineCoverage < coverageFloorPct) {
    decayedMetrics.push({
      metric: 'criticalPathLineCoverage',
      previousValue: previous.criticalPathLineCoverage,
      currentValue: current.criticalPathLineCoverage,
      floor: coverageFloorPct,
      description: `Critical-path line coverage ${current.criticalPathLineCoverage.toFixed(1)}% is below the floor ${coverageFloorPct}%`,
    })
  }

  // ── Mutation score (APIP-4040-B) ─────────────────────────────────────────
  // Only compare when both snapshots have a non-null mutation score
  if (
    previous !== null &&
    current.mutationScore !== null &&
    previous.mutationScore !== null &&
    current.mutationScore < config.mutationScoreFloor
  ) {
    decayedMetrics.push({
      metric: 'mutationScore',
      previousValue: previous.mutationScore,
      currentValue: current.mutationScore,
      floor: config.mutationScoreFloor,
      description: `Mutation score ${current.mutationScore.toFixed(2)} is below the floor ${config.mutationScoreFloor}`,
    })
  }

  return DecayDetectionResultSchema.parse({
    decayed: decayedMetrics.length > 0,
    decayedMetrics,
    previousSnapshotAt: previous?.snapshotAt ?? null,
    currentSnapshotAt: current.snapshotAt,
  })
}
