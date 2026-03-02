/**
 * Cohesion Scanner Types
 *
 * Zod schemas and inferred types for the Cohesion Scanner system.
 * The scanner detects pattern violations in the codebase and produces
 * cleanup stories when scores fall below configurable thresholds.
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import { z } from 'zod'

// ============================================================================
// Enums
// ============================================================================

/**
 * Supported cohesion check categories.
 */
export const CohesionCategorySchema = z.enum([
  'route-handler',
  'zod-naming',
  'react-directory',
  'import-convention',
])

export type CohesionCategory = z.infer<typeof CohesionCategorySchema>

/**
 * Violation detection confidence levels.
 * high=1.0, medium=0.7, low=0.3 weight on violation count.
 */
export const ViolationConfidenceSchema = z.enum(['high', 'medium', 'low'])

export type ViolationConfidence = z.infer<typeof ViolationConfidenceSchema>

// ============================================================================
// Core Schemas
// ============================================================================

/**
 * Scanner configuration schema.
 * AC-1: CohesionScannerConfigSchema with all required fields and defaults.
 */
export const CohesionScannerConfigSchema = z.object({
  /** Root directory to scan */
  rootDir: z.string().min(1),
  /** Categories to run (default: all) */
  categories: z
    .array(CohesionCategorySchema)
    .default(['route-handler', 'zod-naming', 'react-directory', 'import-convention']),
  /** Minimum acceptable score per category (0–1). Below this triggers a cleanup story. */
  thresholds: z.record(CohesionCategorySchema, z.number().min(0).max(1)).default({
    'route-handler': 0.8,
    'zod-naming': 0.8,
    'react-directory': 0.8,
    'import-convention': 0.8,
  }),
  /** Weight of each category in the composite score (must sum to 1.0) */
  weightings: z.record(CohesionCategorySchema, z.number().min(0).max(1)).default({
    'route-handler': 0.25,
    'zod-naming': 0.25,
    'react-directory': 0.25,
    'import-convention': 0.25,
  }),
  /** Days within which a duplicate cleanup story is suppressed */
  deduplicationWindowDays: z.number().int().positive().default(30),
  /** Maximum files to sample per category scan */
  maxFilesToSample: z.number().int().positive().default(200),
  /** Whether the scanner is enabled */
  enabled: z.boolean().default(true),
})

export type CohesionScannerConfig = z.infer<typeof CohesionScannerConfigSchema>

/**
 * A single detected pattern violation.
 * AC-3: PatternViolationSchema with required fields.
 */
export const PatternViolationSchema = z.object({
  /** Category this violation belongs to */
  category: CohesionCategorySchema,
  /** Specific rule that was violated (e.g. "handler-not-in-handlers-dir") */
  rule: z.string().min(1),
  /** Path to the file containing the violation */
  filePath: z.string().min(1),
  /** Line number of the violation (if applicable) */
  line: z.number().int().positive().optional(),
  /** Human-readable description of the violation */
  description: z.string().min(1),
  /** Detector confidence in this violation */
  confidence: ViolationConfidenceSchema,
})

export type PatternViolation = z.infer<typeof PatternViolationSchema>

/**
 * Score result for a single cohesion category.
 * AC-4, AC-5: CohesionScoreSchema.
 */
export const CohesionScoreSchema = z.object({
  /** Category being scored */
  category: CohesionCategorySchema,
  /** Computed score in [0, 1] */
  score: z.number().min(0).max(1),
  /** Raw violation count (confidence-weighted) */
  violationCount: z.number().min(0),
  /** Number of files sampled */
  sampleSize: z.number().int().min(0),
  /** Whether the score meets the configured threshold */
  thresholdMet: z.boolean(),
  /** All violations found in this category */
  violations: z.array(PatternViolationSchema),
})

export type CohesionScore = z.infer<typeof CohesionScoreSchema>

/**
 * Full result of a cohesion scan across all configured categories.
 */
export const CohesionScanResultSchema = z.object({
  /** ISO datetime when the scan ran */
  scannedAt: z.string().datetime(),
  /** Root directory that was scanned */
  rootDir: z.string().min(1),
  /** Per-category scores */
  scores: z.array(CohesionScoreSchema),
  /** Weighted composite score across all categories */
  compositeScore: z.number().min(0).max(1),
  /** Whether the composite score meets the overall threshold */
  overallThresholdMet: z.boolean(),
  /** Total violation count across all categories */
  totalViolations: z.number().min(0),
  /** Total files scanned */
  filesScanned: z.number().int().min(0),
  /** Categories whose scores are below their configured threshold */
  categoriesBelow: z.array(CohesionCategorySchema),
})

export type CohesionScanResult = z.infer<typeof CohesionScanResultSchema>

/**
 * Persisted snapshot of a cohesion scan stored in the database.
 * AC-6: CohesionSnapshotSchema for the wint.cohesion_snapshots table.
 */
export const CohesionSnapshotSchema = z.object({
  /** UUID primary key */
  id: z.string().uuid(),
  /** ISO datetime of the scan */
  scannedAt: z.string().datetime(),
  /** Weighted composite score */
  compositeScore: z.number().min(0).max(1),
  /** Categories below threshold at time of scan */
  categoriesBelow: z.array(CohesionCategorySchema),
  /** Per-category violation counts */
  violationSummary: z.record(CohesionCategorySchema, z.number().min(0)),
  /** ISO datetime record was created */
  createdAt: z.string().datetime(),
})

export type CohesionSnapshot = z.infer<typeof CohesionSnapshotSchema>

/**
 * Input payload for inserting a new cohesion snapshot.
 */
export const CohesionSnapshotInsertSchema = CohesionSnapshotSchema.omit({
  id: true,
  createdAt: true,
})

export type CohesionSnapshotInsert = z.infer<typeof CohesionSnapshotInsertSchema>

// ============================================================================
// Story Generation Schemas
// ============================================================================

/**
 * Input for generating a cohesion cleanup story.
 */
export const CohesionCleanupStoryInputSchema = z.object({
  /** Category that triggered the cleanup story */
  category: CohesionCategorySchema,
  /** Score at time of generation */
  score: z.number().min(0).max(1),
  /** Threshold the score failed to meet */
  threshold: z.number().min(0).max(1),
  /** Sample violations to include in story context */
  topViolations: z.array(PatternViolationSchema).max(10),
  /** Root directory scanned */
  rootDir: z.string().min(1),
  /** ISO datetime of the scan */
  scannedAt: z.string().datetime(),
})

export type CohesionCleanupStoryInput = z.infer<typeof CohesionCleanupStoryInputSchema>

/**
 * Result of cleanup story generation.
 */
export const StoryGenerationResultSchema = z.object({
  /** Whether a story was created (false = deduplicated) */
  created: z.boolean(),
  /** Path to the written story.yaml (if created) */
  storyPath: z.string().optional(),
  /** Story ID (e.g. COHCLEAN-0001) */
  storyId: z.string().optional(),
  /** Reason why story was not created (if created: false) */
  deduplicationReason: z.string().optional(),
})

export type StoryGenerationResult = z.infer<typeof StoryGenerationResultSchema>
