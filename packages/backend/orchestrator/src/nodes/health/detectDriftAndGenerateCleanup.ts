/**
 * detectDriftAndGenerateCleanup
 *
 * Pure function — no DB, no FS, no CLI dependencies.
 * Compares snapshot against baseline using thresholds.
 * Returns array of CLEANUP story objects (StoryArtifact shape) or empty array.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-06)
 * AC: AC-7, AC-8, AC-9
 *
 * Architecture:
 * - Pure function enables 100% branch coverage without mocking
 * - CLEANUP story IDs use APIP-CLEANUP-NNNN format (4-digit zero-padding)
 * - Uses createStoryArtifact() helper from story-v2-compatible.ts
 * - logger.warn when baseline is null (OPP-002 from ELAB.yaml)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createStoryArtifact } from '../../artifacts/story-v2-compatible.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'
import type { CodebaseHealthSnapshot, HealthGateThresholds } from './schemas/index.js'

// ============================================================================
// Drift detection helpers
// ============================================================================

/**
 * DriftedMetric — describes a single metric that exceeded its threshold.
 */
const DriftedMetricSchema = z.object({
  name: z.string(),
  baseline: z.number().nullable(),
  current: z.number().nullable(),
  delta: z.number(),
  threshold: z.number(),
  label: z.string(),
})

type DriftedMetric = z.infer<typeof DriftedMetricSchema>

/**
 * Check if a metric has drifted beyond its threshold.
 * For "increase metrics" (more = worse): drift when current - baseline > threshold
 * For "decrease metrics" (test_coverage): drift when current - baseline < threshold (threshold is negative)
 */
function hasDrifted(
  baseline: number | null,
  current: number | null,
  threshold: number,
): { drifted: boolean; delta: number } {
  if (baseline === null || current === null) {
    // Can't detect drift without both values
    return { drifted: false, delta: 0 }
  }

  const delta = current - baseline

  if (threshold < 0) {
    // Decrease metric (e.g., test_coverage): drift when delta < threshold
    return { drifted: delta < threshold, delta }
  } else {
    // Increase metric: drift when delta > threshold
    return { drifted: delta > threshold, delta }
  }
}

// ============================================================================
// detectDriftAndGenerateCleanup
// ============================================================================

/**
 * detectDriftAndGenerateCleanup
 *
 * Compares snapshot against baseline using configured thresholds.
 * Returns CLEANUP story objects for each metric that exceeded its threshold.
 *
 * @param snapshot - The new health snapshot to evaluate
 * @param baseline - The reference baseline snapshot (null if not yet established)
 * @param thresholds - Configured delta thresholds for each metric
 * @param startingCleanupNumber - The starting sequence number for CLEANUP story IDs (default: 1)
 * @returns Array of StoryArtifact objects (one per drifted metric), or empty array
 */
export function detectDriftAndGenerateCleanup(
  snapshot: CodebaseHealthSnapshot,
  baseline: CodebaseHealthSnapshot | null,
  thresholds: HealthGateThresholds,
  startingCleanupNumber = 1,
): StoryArtifact[] {
  // AC-7: return empty array + logger.warn when baseline is null
  if (baseline === null) {
    logger.warn('detectDriftAndGenerateCleanup: no baseline found — cannot detect drift', {
      snapshotId: snapshot.id,
      mergeNumber: snapshot.mergeNumber,
      tip: "Promote a known-good snapshot as baseline: UPDATE wint.codebase_health SET is_baseline = true WHERE id = '<id>';",
    })
    return []
  }

  // Evaluate each metric against its threshold
  const driftedMetrics: DriftedMetric[] = []

  const metricChecks: Array<{
    name: string
    label: string
    baseline: number | null
    current: number | null
    threshold: number
  }> = [
    {
      name: 'lint_warnings',
      label: 'Lint Warnings',
      baseline: baseline.lintWarnings,
      current: snapshot.lintWarnings,
      threshold: thresholds.lintWarningsDelta,
    },
    {
      name: 'type_errors',
      label: 'TypeScript Type Errors',
      baseline: baseline.typeErrors,
      current: snapshot.typeErrors,
      threshold: thresholds.typeErrorsDelta,
    },
    {
      name: 'any_count',
      label: 'Explicit Any Usages',
      baseline: baseline.anyCount,
      current: snapshot.anyCount,
      threshold: thresholds.anyCountDelta,
    },
    {
      name: 'test_coverage',
      label: 'Test Coverage',
      baseline: baseline.testCoverage,
      current: snapshot.testCoverage,
      threshold: thresholds.testCoverageDelta, // negative: -2 means "allow 2% drop"
    },
    {
      name: 'circular_deps',
      label: 'Circular Dependencies',
      baseline: baseline.circularDeps,
      current: snapshot.circularDeps,
      threshold: thresholds.circularDepsDelta,
    },
    {
      name: 'bundle_size',
      label: 'Bundle Size (bytes)',
      baseline: baseline.bundleSize,
      current: snapshot.bundleSize,
      threshold: thresholds.bundleSizeDelta,
    },
    {
      name: 'dead_exports',
      label: 'Dead Exports',
      baseline: baseline.deadExports,
      current: snapshot.deadExports,
      threshold: thresholds.deadExportsDelta,
    },
    {
      name: 'eslint_disable_count',
      label: 'ESLint Disable Comments',
      baseline: baseline.eslintDisableCount,
      current: snapshot.eslintDisableCount,
      threshold: thresholds.eslintDisableCountDelta,
    },
  ]

  for (const check of metricChecks) {
    const { drifted, delta } = hasDrifted(check.baseline, check.current, check.threshold)
    if (drifted) {
      driftedMetrics.push({
        name: check.name,
        label: check.label,
        baseline: check.baseline,
        current: check.current,
        delta,
        threshold: check.threshold,
      })
    }
  }

  if (driftedMetrics.length === 0) {
    return []
  }

  // Generate one CLEANUP story per drifted metric (AC-8, AC-9)
  const stories: StoryArtifact[] = driftedMetrics.map((metric, index) => {
    const cleanupNumber = startingCleanupNumber + index
    const cleanupId = `APIP-CLEANUP-${String(cleanupNumber).padStart(4, '0')}`

    const deltaDisplay =
      metric.threshold < 0
        ? `${metric.delta.toFixed(2)}% (threshold: ${metric.threshold}%)`
        : `+${metric.delta} (threshold: ${metric.threshold})`

    const description =
      `Codebase health drift detected for metric: ${metric.label}.\n` +
      `Baseline value: ${metric.baseline ?? 'unknown'}\n` +
      `Current value (merge #${snapshot.mergeNumber}): ${metric.current ?? 'unknown'}\n` +
      `Delta: ${deltaDisplay}\n\n` +
      `Remediation: Investigate and fix the ${metric.label.toLowerCase()} degradation ` +
      `introduced since merge #${baseline.mergeNumber} (baseline snapshot ID: ${baseline.id}).`

    return createStoryArtifact(
      cleanupId,
      'autonomous-pipeline',
      `CLEANUP: Reduce ${metric.label} drift (merge #${snapshot.mergeNumber})`,
      `Remediate ${metric.label.toLowerCase()} regression detected at merge #${snapshot.mergeNumber}`,
      {
        type: 'tech-debt',
        state: 'backlog',
        priority: 'medium',
        summary: description,
        tags: ['health-gate', 'cleanup', 'quality', metric.name],
        technical_notes:
          `Triggered by health gate at merge #${snapshot.mergeNumber}.\n` +
          `Snapshot ID: ${snapshot.id}\n` +
          `Baseline ID: ${baseline.id}\n` +
          `Metric: ${metric.name}\n` +
          `Drifted metrics: ${driftedMetrics.map(m => m.name).join(', ')}`,
      },
    )
  })

  return stories
}
