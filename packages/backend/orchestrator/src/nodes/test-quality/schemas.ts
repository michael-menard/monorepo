/**
 * Test Quality Monitor Schemas
 *
 * Defines Zod schemas for the Test Quality Monitor cron job.
 * Covers configuration (AC-1), snapshot (AC-6), and intermediate
 * collector result schemas for all node types.
 *
 * APIP-4040: Test Quality Monitor — weekly cron
 */

import { z } from 'zod'

// ============================================================================
// AC-1: TestQualityMonitorConfigSchema
// ============================================================================

/**
 * Configuration schema for the Test Quality Monitor.
 * All thresholds are env-var configurable at runtime.
 */
export const TestQualityMonitorConfigSchema = z.object({
  /**
   * Minimum ratio of assertions per test case (expect calls / it calls).
   * Below this → warn/fail. Default: 1.5
   */
  minAssertionDensity: z.number().positive().default(1.5),

  /**
   * Maximum number of orphaned test files allowed before flagging.
   * Default: 0
   */
  maxOrphanedTests: z.number().int().min(0).default(0),

  /**
   * Minimum coverage floor (0–1) for critical-path modules.
   * Below this → warn/fail. Default: 0.80
   */
  criticalPathCoverageFloor: z.number().min(0).max(1).default(0.8),

  /**
   * Minimum mutation score (0–1). Values below this threshold trigger decay.
   * Default: 0.60 (deferred — used by decay detector for snapshot comparison)
   */
  mutationScoreFloor: z.number().min(0).max(1).default(0.6),

  /**
   * Glob patterns identifying critical-path modules for coverage.
   * Default: orchestrator core modules
   */
  criticalPathPatterns: z
    .array(z.string())
    .default([
      'packages/backend/orchestrator/src/graphs/**',
      'packages/backend/orchestrator/src/nodes/**',
      'packages/backend/orchestrator/src/runner/**',
    ]),

  /**
   * Root directory to scan for test files (absolute or relative to cwd).
   * Default: '.' (monorepo root)
   */
  scanRoot: z.string().default('.'),

  /**
   * Timeout for vitest coverage child process in milliseconds.
   * Default: 5 minutes
   */
  coverageTimeoutMs: z.number().int().positive().default(5 * 60 * 1000),

  /**
   * Whether to generate improvement stories on decay.
   * Default: true
   */
  generateImprovementStories: z.boolean().default(true),
})

export type TestQualityMonitorConfig = z.infer<typeof TestQualityMonitorConfigSchema>

// ============================================================================
// Assertion Density Result
// ============================================================================

/**
 * Per-file assertion density stats.
 */
export const FileDensityStatSchema = z.object({
  /** Relative file path */
  filePath: z.string(),
  /** Number of expect() / assert calls detected */
  assertionCount: z.number().int().min(0),
  /** Number of it() / test() declarations detected */
  testCount: z.number().int().min(0),
  /** assertionCount / testCount (NaN-safe: 0 if testCount === 0) */
  densityRatio: z.number().min(0),
})

export type FileDensityStat = z.infer<typeof FileDensityStatSchema>

/**
 * Result of the AssertionDensityCollector.
 */
export const AssertionDensityResultSchema = z.object({
  /** Total expect/assert calls across all scanned files */
  assertionCount: z.number().int().min(0),
  /** Total it()/test() declarations across all scanned files */
  testCount: z.number().int().min(0),
  /** Overall ratio (0 if testCount === 0) */
  densityRatio: z.number().min(0),
  /** Per-file breakdown */
  fileStats: z.array(FileDensityStatSchema),
  /** ISO timestamp when collection ran */
  collectedAt: z.string().datetime(),
  /** Whether collection succeeded */
  success: z.boolean(),
  /** Error message if collection failed */
  error: z.string().optional(),
})

export type AssertionDensityResult = z.infer<typeof AssertionDensityResultSchema>

// ============================================================================
// Orphaned Test Result
// ============================================================================

/**
 * Result of the OrphanedTestDetector.
 */
export const OrphanedTestResultSchema = z.object({
  /** List of test file paths that have no corresponding source file */
  orphanedFiles: z.array(z.string()),
  /** Count of orphaned test files */
  orphanedCount: z.number().int().min(0),
  /** ISO timestamp when detection ran */
  detectedAt: z.string().datetime(),
  /** Whether detection succeeded */
  success: z.boolean(),
  /** Error message if detection failed */
  error: z.string().optional(),
})

export type OrphanedTestResult = z.infer<typeof OrphanedTestResultSchema>

// ============================================================================
// Critical Path Coverage Result
// ============================================================================

/**
 * Per-module coverage data.
 */
export const ModuleCoverageSchema = z.object({
  /** Module pattern matched */
  pattern: z.string(),
  /** Line coverage percentage (0–100) */
  lineCoverage: z.number().min(0).max(100),
  /** Branch coverage percentage (0–100) */
  branchCoverage: z.number().min(0).max(100),
  /** Function coverage percentage (0–100) */
  functionCoverage: z.number().min(0).max(100),
})

export type ModuleCoverage = z.infer<typeof ModuleCoverageSchema>

/**
 * Result of the CriticalPathCoverageCollector.
 */
export const CriticalPathCoverageResultSchema = z.object({
  /** Overall line coverage for critical-path modules (0–100) */
  overallLineCoverage: z.number().min(0).max(100),
  /** Overall branch coverage for critical-path modules (0–100) */
  overallBranchCoverage: z.number().min(0).max(100),
  /** Overall function coverage for critical-path modules (0–100) */
  overallFunctionCoverage: z.number().min(0).max(100),
  /** Whether the coverage floor was met */
  meetsFloor: z.boolean(),
  /** Per-module breakdown */
  moduleCoverage: z.array(ModuleCoverageSchema),
  /** ISO timestamp when collection ran */
  collectedAt: z.string().datetime(),
  /** Whether collection succeeded */
  success: z.boolean(),
  /** Error message if collection failed */
  error: z.string().optional(),
})

export type CriticalPathCoverageResult = z.infer<typeof CriticalPathCoverageResultSchema>

// ============================================================================
// AC-6: TestQualitySnapshotSchema
// ============================================================================

/**
 * Status of a test quality snapshot.
 * - pass: all floors met
 * - warn: one or more floors breached but within tolerance
 * - fail: critical floor breached
 */
export const TestQualitySnapshotStatusSchema = z.enum(['pass', 'warn', 'fail'])
export type TestQualitySnapshotStatus = z.infer<typeof TestQualitySnapshotStatusSchema>

/**
 * Test Quality Snapshot — persisted per cron run.
 * Captured for decay detection (APIP-4040) and future mutation scoring (APIP-4040-B).
 */
export const TestQualitySnapshotSchema = z.object({
  /** ISO timestamp when the snapshot was taken */
  snapshotAt: z.string().datetime(),

  /** Overall status for this snapshot */
  status: TestQualitySnapshotStatusSchema,

  // ── Assertion density ──────────────────────────────────────────────────────

  /** Total assertion count */
  assertionCount: z.number().int().min(0),
  /** Total test case count */
  testCount: z.number().int().min(0),
  /** Aggregate assertion density ratio */
  assertionDensityRatio: z.number().min(0),

  // ── Orphaned tests ─────────────────────────────────────────────────────────

  /** Number of orphaned test files */
  orphanedTestCount: z.number().int().min(0),

  // ── Critical path coverage ─────────────────────────────────────────────────

  /** Overall line coverage % for critical-path modules */
  criticalPathLineCoverage: z.number().min(0).max(100),
  /** Overall branch coverage % for critical-path modules */
  criticalPathBranchCoverage: z.number().min(0).max(100),

  // ── Mutation score (DEFERRED to APIP-4040-B) ──────────────────────────────

  /**
   * Mutation score (0–1).
   * Null until APIP-4040-B delivers mutation testing.
   */
  mutationScore: z.number().min(0).max(1).nullable().default(null),

  // ── Config echoed back ─────────────────────────────────────────────────────

  /** Configuration used when this snapshot was taken */
  config: TestQualityMonitorConfigSchema,
})

export type TestQualitySnapshot = z.infer<typeof TestQualitySnapshotSchema>

// ============================================================================
// Decay Detection Result
// ============================================================================

/**
 * Metric that has decayed between snapshots.
 */
export const DecayedMetricSchema = z.object({
  /** Name of the metric that decayed */
  metric: z.string(),
  /** Value in the previous snapshot */
  previousValue: z.number(),
  /** Value in the current snapshot */
  currentValue: z.number(),
  /** The floor/threshold that was breached */
  floor: z.number(),
  /** Human-readable description */
  description: z.string(),
})

export type DecayedMetric = z.infer<typeof DecayedMetricSchema>

/**
 * Result of the decay detector comparison.
 */
export const DecayDetectionResultSchema = z.object({
  /** Whether any metric decayed */
  decayed: z.boolean(),
  /** List of metrics that decayed */
  decayedMetrics: z.array(DecayedMetricSchema),
  /** ISO timestamp of the previous snapshot */
  previousSnapshotAt: z.string().datetime().nullable(),
  /** ISO timestamp of the current snapshot */
  currentSnapshotAt: z.string().datetime(),
})

export type DecayDetectionResult = z.infer<typeof DecayDetectionResultSchema>
