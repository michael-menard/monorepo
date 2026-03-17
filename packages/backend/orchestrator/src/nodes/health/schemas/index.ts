/**
 * Health Gate Schemas
 *
 * Defines Zod schemas for the codebase health gate module.
 * Story: APIP-4010 - Codebase Health Gate
 *
 * Exports:
 * - HealthGateThresholdsSchema: configurable delta thresholds for each metric (AC-6)
 * - CodebaseHealthSnapshotSchema: re-export from database-schema for type-safe snapshot rows (AC-3)
 */

import { z } from 'zod'

// ============================================================================
// HealthGateThresholdsSchema (AC-6)
// ============================================================================

/**
 * HealthGateThresholdsSchema
 *
 * Configurable delta thresholds for each of the 8 health metrics.
 * All fields are optional — defaults are calibrated for the APIP pipeline.
 *
 * A "delta" is the maximum allowed change from baseline before a CLEANUP story is generated.
 * - Positive deltas mean "allow this many more than baseline" (lint warnings, any count, etc.)
 * - Negative delta for test_coverage means "allow this much drop from baseline"
 * - Zero delta means "zero tolerance for any change in either direction"
 *
 * Calibration guidance:
 * - Start with these defaults, then adjust after 3-4 health gate runs.
 * - type_errors_delta: 0 and circular_deps_delta: 0 are intentionally strict.
 * - bundle_size_delta: 50000 (50KB) is a reasonable starting point for most web apps.
 */
export const HealthGateThresholdsSchema = z.object({
  /** Maximum additional lint warnings allowed (e.g., 10 = "up to 10 new warnings OK") */
  lintWarningsDelta: z.number().default(10),

  /** Maximum additional type errors allowed (0 = zero tolerance) */
  typeErrorsDelta: z.number().default(0),

  /** Maximum additional @typescript-eslint/no-explicit-any violations allowed */
  anyCountDelta: z.number().default(5),

  /** Maximum test coverage percentage drop allowed (-2 = "up to 2% drop OK") */
  testCoverageDelta: z.number().default(-2),

  /** Maximum additional circular dependencies allowed (0 = zero tolerance) */
  circularDepsDelta: z.number().default(0),

  /** Maximum additional bundle size in bytes allowed (50000 = 50KB) */
  bundleSizeDelta: z.number().default(50_000),

  /** Maximum additional dead exports allowed */
  deadExportsDelta: z.number().default(5),

  /** Maximum additional eslint-disable comments allowed */
  eslintDisableCountDelta: z.number().default(2),
})

export type HealthGateThresholds = z.infer<typeof HealthGateThresholdsSchema>

/**
 * Default thresholds — calibrated for the APIP pipeline.
 * Use HealthGateThresholdsSchema.parse({}) to get defaults.
 */
export const DEFAULT_HEALTH_GATE_THRESHOLDS: HealthGateThresholds =
  HealthGateThresholdsSchema.parse({})

// ============================================================================
// CodebaseHealthSnapshotSchema (AC-3)
// ============================================================================

/**
 * CodebaseHealthSnapshotSchema
 *
 * Mirrors the wint.codebase_health table columns.
 * Re-exported here for use in orchestrator nodes without importing from database-schema.
 *
 * Note: @repo/database-schema does not exist — this is defined here as a
 * local Zod schema. See APIP-4010 for context.
 */
export const CodebaseHealthSnapshotSchema = z.object({
  // Primary key
  id: z.string().uuid(),

  // Merge tracking
  mergeNumber: z.number().int().nonnegative(),

  // Capture timestamp (ISO string or Date)
  capturedAt: z.union([z.string().datetime({ offset: true }), z.date()]),

  // Baseline flag
  isBaseline: z.boolean(),

  // Metric 1: Lint warnings
  lintWarnings: z.number().int().nonnegative().nullable(),

  // Metric 2: Type errors
  typeErrors: z.number().int().nonnegative().nullable(),

  // Metric 3: Any count
  anyCount: z.number().int().nonnegative().nullable(),

  // Metric 4: Test coverage (percentage, 0-100)
  testCoverage: z.number().min(0).max(100).nullable(),

  // Metric 5: Circular dependencies
  circularDeps: z.number().int().nonnegative().nullable(),

  // Metric 6: Bundle size in bytes
  bundleSize: z.number().int().nonnegative().nullable(),

  // Metric 7: Dead exports
  deadExports: z.number().int().nonnegative().nullable(),

  // Metric 8: ESLint disable count
  eslintDisableCount: z.number().int().nonnegative().nullable(),
})

export type CodebaseHealthSnapshot = z.infer<typeof CodebaseHealthSnapshotSchema>

// ============================================================================
// CodebaseHealthInsertSchema (for insert operations)
// ============================================================================

/**
 * Schema for inserting a new snapshot row.
 * id and capturedAt have defaults (not required for insert).
 */
export const CodebaseHealthInsertSchema = CodebaseHealthSnapshotSchema.partial({
  id: true,
  capturedAt: true,
  isBaseline: true,
})

export type CodebaseHealthInsert = z.infer<typeof CodebaseHealthInsertSchema>
