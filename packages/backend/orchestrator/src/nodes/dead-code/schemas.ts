/**
 * Dead Code Reaper — Domain Schemas
 *
 * Zod-first type definitions for the Dead Code Reaper cron job.
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 */

import { z } from 'zod'
import { CronRunResultSchema } from '../../cron/schemas.js'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Configuration for the Dead Code Reaper job.
 */
export const DeadCodeReaperConfigSchema = z.object({
  /** Minimum age in days before a finding is reported (must be >= 0) */
  minAgeDays: z.number().int().min(0).default(30),

  /** Glob patterns to exclude from scanning */
  excludePatterns: z.array(z.string()).default(['**/__tests__/**', '**/*.test.*', '**/*.spec.*']),

  /** Maximum number of findings to report per run */
  maxFindingsPerRun: z.number().int().positive().default(50),

  /** Timeout in milliseconds for the full reaper run */
  timeoutMs: z
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000), // 10 minutes

  /** If true, simulate deletions without writing files */
  dryRun: z.boolean().default(false),
})

export type DeadCodeReaperConfig = z.infer<typeof DeadCodeReaperConfigSchema>

// ============================================================================
// Finding Schemas
// ============================================================================

/**
 * A single dead export finding (unused export from ts-prune).
 */
export const DeadExportFindingSchema = z.object({
  /** File path relative to repo root */
  filePath: z.string().min(1),

  /** Name of the exported symbol */
  exportName: z.string().min(1),

  /** Line number of the export */
  line: z.number().int().positive(),

  /** Whether the export is only referenced via dynamic import() */
  dynamicImportOnly: z.boolean().default(false),
})

export type DeadExportFinding = z.infer<typeof DeadExportFindingSchema>

/**
 * A single unused file finding (file with no importers).
 */
export const UnusedFileFindingSchema = z.object({
  /** File path relative to repo root */
  filePath: z.string().min(1),

  /** Whether the file is only referenced via dynamic import() */
  dynamicImportOnly: z.boolean().default(false),
})

export type UnusedFileFinding = z.infer<typeof UnusedFileFindingSchema>

/**
 * A single unused dependency finding (package listed in package.json but not used).
 */
export const UnusedDepFindingSchema = z.object({
  /** Package name */
  packageName: z.string().min(1),

  /** The package.json that contains the unused dependency */
  packageJsonPath: z.string().min(1),

  /** Whether it's a dev dependency */
  isDev: z.boolean().default(false),
})

export type UnusedDepFinding = z.infer<typeof UnusedDepFindingSchema>

// ============================================================================
// Micro-Verify Result Schema
// ============================================================================

/**
 * Result of a micro-verify step for a single finding.
 */
export const MicroVerifyResultSchema = z.object({
  /** The original finding that was verified */
  finding: z.union([DeadExportFindingSchema, UnusedFileFindingSchema]),

  /** Verification status */
  status: z.enum(['safe', 'false-positive', 'error']),

  /** Output from tsc type check (empty string if no issues) */
  typeCheckOutput: z.string(),

  /** Duration of the verification in milliseconds */
  durationMs: z.number().int().nonnegative(),
})

export type MicroVerifyResult = z.infer<typeof MicroVerifyResultSchema>

// ============================================================================
// Reaper Result Schema
// ============================================================================

/**
 * Summary counts for a Dead Code Reaper run.
 */
export const DeadCodeReaperSummarySchema = z.object({
  /** Total findings discovered before micro-verify */
  findingsTotal: z.number().int().nonnegative(),

  /** Number of verified safe deletions */
  verifiedDeletions: z.number().int().nonnegative(),

  /** Number of false positives filtered out */
  falsePositives: z.number().int().nonnegative(),

  /** Number of CLEANUP stories generated */
  cleanupStoriesGenerated: z.number().int().nonnegative(),
})

export type DeadCodeReaperSummary = z.infer<typeof DeadCodeReaperSummarySchema>

/**
 * Result of a full Dead Code Reaper run.
 */
export const DeadCodeReaperResultSchema = z.object({
  /** Run status */
  status: z.enum(['success', 'partial', 'skipped', 'error']),

  /** Summary counts */
  summary: DeadCodeReaperSummarySchema,

  /** Dead export findings that passed micro-verify */
  deadExports: z.array(DeadExportFindingSchema),

  /** Unused file findings that passed micro-verify */
  unusedFiles: z.array(UnusedFileFindingSchema),

  /** Unused dependency findings */
  unusedDeps: z.array(UnusedDepFindingSchema),

  /** Micro-verify results */
  microVerifyResults: z.array(MicroVerifyResultSchema),

  /** Path to generated CLEANUP story (null if not generated) */
  cleanupStoryPath: z.string().nullable(),

  /** Error message if status is 'error' */
  error: z.string().nullable(),
})

export type DeadCodeReaperResult = z.infer<typeof DeadCodeReaperResultSchema>

// ============================================================================
// CronRunResult Extension Schema
// ============================================================================

/**
 * Extended CronRunResult for dead-code-reaper with domain-specific summary.
 * Per ARCH-003: log the extra fields as a superset object, do not extend CronRunResultSchema globally.
 */
export const DeadCodeReaperCronLogSchema = CronRunResultSchema.extend({
  /** Dead code reaper domain-specific summary counts */
  findingsTotal: z.number().int().nonnegative(),
  verifiedDeletions: z.number().int().nonnegative(),
  falsePositives: z.number().int().nonnegative(),
  cleanupStoriesGenerated: z.number().int().nonnegative(),
})

export type DeadCodeReaperCronLog = z.infer<typeof DeadCodeReaperCronLogSchema>
