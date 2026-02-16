/**
 * Migration Type Definitions
 *
 * Type-safe schemas for the story directory flattening migration.
 * All schemas use Zod for runtime validation.
 */

import { z } from 'zod'

// ============================================================================
// Lifecycle Directory Mapping
// ============================================================================

/**
 * Lifecycle directory types (old structure)
 */
export const LifecycleDirectorySchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'UAT',
])
export type LifecycleDirectory = z.infer<typeof LifecycleDirectorySchema>

/**
 * Status values for frontmatter (maps from lifecycle directories)
 */
export const StatusValueSchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat',
])
export type StatusValue = z.infer<typeof StatusValueSchema>

/**
 * Priority mapping for duplicate resolution
 * Higher priority = more advanced lifecycle stage
 */
export const LIFECYCLE_PRIORITY: Record<LifecycleDirectory, number> = {
  UAT: 1, // Highest priority
  'ready-for-qa': 2,
  'in-progress': 3,
  'ready-to-work': 4,
  elaboration: 5,
  backlog: 6, // Lowest priority
}

/**
 * Map lifecycle directory to status field value
 */
export const LIFECYCLE_TO_STATUS: Record<LifecycleDirectory, StatusValue> = {
  UAT: 'uat',
  'ready-for-qa': 'ready-for-qa',
  'in-progress': 'in-progress',
  'ready-to-work': 'ready-to-work',
  elaboration: 'elaboration',
  backlog: 'backlog',
}

// ============================================================================
// Story Location Schema
// ============================================================================

/**
 * Location information for a story
 */
export const StoryLocationSchema = z.object({
  /** Story ID (e.g., STORY-001) */
  storyId: z.string(),
  /** Absolute path to story directory */
  path: z.string(),
  /** Lifecycle directory containing the story */
  lifecycleDir: LifecycleDirectorySchema,
  /** Epic path relative to plans/future/ */
  epicPath: z.string(),
  /** Story file name (e.g., STORY-001.md) */
  fileName: z.string().optional(),
})
export type StoryLocation = z.infer<typeof StoryLocationSchema>

// ============================================================================
// Duplicate Story Schema
// ============================================================================

/**
 * Story found in multiple lifecycle directories
 */
export const DuplicateStorySchema = z.object({
  /** Story ID */
  storyId: z.string(),
  /** All locations where story was found */
  locations: z.array(StoryLocationSchema),
  /** Chosen location (highest priority) */
  chosenLocation: StoryLocationSchema,
})
export type DuplicateStory = z.infer<typeof DuplicateStorySchema>

// ============================================================================
// Migration Inventory Schema
// ============================================================================

/**
 * Complete inventory of stories found during discovery
 */
export const MigrationInventorySchema = z.object({
  /** Timestamp of discovery */
  timestamp: z.string().datetime({ offset: true }),
  /** Epic being migrated */
  epicPath: z.string(),
  /** Total number of stories found */
  totalStories: z.number().int().nonnegative(),
  /** All story locations */
  stories: z.array(StoryLocationSchema),
  /** Stories found in multiple locations */
  duplicates: z.array(DuplicateStorySchema),
  /** Lifecycle directories found */
  lifecycleDirectories: z.array(LifecycleDirectorySchema),
})
export type MigrationInventory = z.infer<typeof MigrationInventorySchema>

// ============================================================================
// Validation Report Schema
// ============================================================================

/**
 * Validation error for a single story
 */
export const StoryValidationErrorSchema = z.object({
  /** Story ID */
  storyId: z.string(),
  /** Story file path */
  filePath: z.string(),
  /** Error type */
  errorType: z.enum(['missing-frontmatter', 'malformed-yaml', 'validation-failure', 'read-error']),
  /** Error message */
  message: z.string(),
  /** Detailed validation errors (for validation-failure) */
  validationErrors: z
    .array(
      z.object({
        path: z.array(z.string()),
        message: z.string(),
      }),
    )
    .optional(),
})
export type StoryValidationError = z.infer<typeof StoryValidationErrorSchema>

/**
 * Validation report for all stories
 */
export const ValidationReportSchema = z.object({
  /** Timestamp of validation */
  timestamp: z.string().datetime({ offset: true }),
  /** Epic being validated */
  epicPath: z.string(),
  /** Total stories validated */
  totalStories: z.number().int().nonnegative(),
  /** Successfully validated stories */
  validStories: z.number().int().nonnegative(),
  /** Stories with errors */
  errorCount: z.number().int().nonnegative(),
  /** All validation errors */
  errors: z.array(StoryValidationErrorSchema),
})
export type ValidationReport = z.infer<typeof ValidationReportSchema>

// ============================================================================
// Migration Plan Schema
// ============================================================================

/**
 * Single migration operation (directory move + frontmatter update)
 */
export const MigrationOperationSchema = z.object({
  /** Story ID */
  storyId: z.string(),
  /** Source directory path */
  sourcePath: z.string(),
  /** Target directory path (flat location) */
  targetPath: z.string(),
  /** Status to add to frontmatter */
  status: StatusValueSchema,
  /** Lifecycle directory being migrated from */
  sourceLifecycleDir: LifecycleDirectorySchema,
  /** Whether this is part of a duplicate resolution */
  isDuplicate: z.boolean().default(false),
})
export type MigrationOperation = z.infer<typeof MigrationOperationSchema>

/**
 * Target directory collision (story already exists at target)
 */
export const CollisionSchema = z.object({
  /** Story ID */
  storyId: z.string(),
  /** Source path attempting to move */
  sourcePath: z.string(),
  /** Target path that already exists */
  targetPath: z.string(),
})
export type Collision = z.infer<typeof CollisionSchema>

/**
 * Complete migration plan (dry-run output)
 */
export const MigrationPlanSchema = z.object({
  /** Timestamp of plan generation */
  timestamp: z.string().datetime({ offset: true }),
  /** Epic being migrated */
  epicPath: z.string(),
  /** Total operations planned */
  totalOperations: z.number().int().nonnegative(),
  /** All planned operations */
  operations: z.array(MigrationOperationSchema),
  /** Detected collisions (BLOCKS migration) */
  collisions: z.array(CollisionSchema),
  /** Whether plan is safe to execute */
  canExecute: z.boolean(),
})
export type MigrationPlan = z.infer<typeof MigrationPlanSchema>

// ============================================================================
// Migration Log Schema
// ============================================================================

/**
 * Result of a single migration operation
 */
export const OperationResultSchema = z.object({
  /** Story ID */
  storyId: z.string(),
  /** Whether operation succeeded */
  success: z.boolean(),
  /** Source path */
  sourcePath: z.string(),
  /** Target path */
  targetPath: z.string(),
  /** Status added to frontmatter */
  status: StatusValueSchema.optional(),
  /** Error message (if failed) */
  error: z.string().optional(),
})
export type OperationResult = z.infer<typeof OperationResultSchema>

/**
 * Migration execution log
 */
export const MigrationLogSchema = z.object({
  /** Timestamp of execution */
  timestamp: z.string().datetime({ offset: true }),
  /** Epic migrated */
  epicPath: z.string(),
  /** Backup tarball path */
  backupPath: z.string(),
  /** Total operations attempted */
  totalOperations: z.number().int().nonnegative(),
  /** Successful operations */
  successCount: z.number().int().nonnegative(),
  /** Failed operations */
  failureCount: z.number().int().nonnegative(),
  /** All operation results */
  results: z.array(OperationResultSchema),
  /** Whether migration completed successfully */
  migrationSuccess: z.boolean(),
  /** Whether rollback was performed */
  rolledBack: z.boolean().default(false),
})
export type MigrationLog = z.infer<typeof MigrationLogSchema>

// ============================================================================
// Verification Report Schema
// ============================================================================

/**
 * Verification check result
 */
export const VerificationCheckSchema = z.object({
  /** Check name */
  check: z.string(),
  /** Whether check passed */
  passed: z.boolean(),
  /** Check details/message */
  message: z.string(),
  /** Expected value */
  expected: z.any().optional(),
  /** Actual value */
  actual: z.any().optional(),
})
export type VerificationCheck = z.infer<typeof VerificationCheckSchema>

/**
 * Post-migration verification report
 */
export const VerificationReportSchema = z.object({
  /** Timestamp of verification */
  timestamp: z.string().datetime({ offset: true }),
  /** Epic verified */
  epicPath: z.string(),
  /** Total checks performed */
  totalChecks: z.number().int().nonnegative(),
  /** Passed checks */
  passedChecks: z.number().int().nonnegative(),
  /** Failed checks */
  failedChecks: z.number().int().nonnegative(),
  /** All check results */
  checks: z.array(VerificationCheckSchema),
  /** Overall verification status */
  verificationPassed: z.boolean(),
})
export type VerificationReport = z.infer<typeof VerificationReportSchema>
