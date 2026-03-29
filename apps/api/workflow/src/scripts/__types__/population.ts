/**
 * Population Artifact Schemas
 *
 * Zod-first type definitions for story population script artifacts.
 * Used for:
 * - Dry-run plans
 * - Migration logs
 * - Verification reports
 *
 * Story: WINT-1030
 */

import { z } from 'zod'

// ============================================================================
// Story State Mapping
// ============================================================================

/**
 * Valid story state enum values (matches database enum)
 */
export const StoryStateSchema = z.enum([
  'draft',
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
])

export type StoryState = z.infer<typeof StoryStateSchema>

/**
 * Lifecycle directory names (before WINT-1020 flattening)
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
 * Mapping from lifecycle directories to database states
 */
export const LIFECYCLE_TO_STATE: Record<LifecycleDirectory, StoryState> = {
  backlog: 'backlog',
  elaboration: 'backlog', // Not started yet
  'ready-to-work': 'ready_to_work',
  'in-progress': 'in_progress',
  'ready-for-qa': 'ready_for_qa',
  UAT: 'in_qa', // UAT = in QA testing
}

/**
 * Priority ranking for duplicate resolution (higher = more advanced)
 */
export const LIFECYCLE_PRIORITY: Record<LifecycleDirectory, number> = {
  UAT: 6,
  'ready-for-qa': 5,
  'in-progress': 4,
  'ready-to-work': 3,
  elaboration: 2,
  backlog: 1,
}

// ============================================================================
// Story Discovery
// ============================================================================

/**
 * Discovered story location
 */
export const StoryLocationSchema = z.object({
  /** Story ID (e.g., "WINT-0010") */
  story_id: z.string(),
  /** Absolute path to story directory */
  directory_path: z.string(),
  /** Absolute path to story file */
  file_path: z.string(),
  /** Epic directory (e.g., "wint", "kbar") */
  epic: z.string(),
  /** Lifecycle directory (if exists, for status inference) */
  lifecycle: LifecycleDirectorySchema.optional(),
  /** Status from frontmatter (if exists) */
  frontmatter_status: z.string().optional(),
})

export type StoryLocation = z.infer<typeof StoryLocationSchema>

/**
 * Story metadata extracted from frontmatter
 */
export const StoryMetadataSchema = z.object({
  /** Story ID from frontmatter */
  story_id: z.string(),
  /** Story title */
  title: z.string(),
  /** Story description */
  description: z.string().optional(),
  /** Epic name */
  epic: z.string().optional(),
  /** Story type (feature, bug, infra, docs) */
  story_type: z.string().optional(),
  /** Priority level (P0, P1, P2, P3) */
  priority: z.string().optional(),
  /** Story points */
  points: z.number().optional(),
  /** Phase number (can be string or number in frontmatter) */
  phase: z.union([z.number(), z.string()]).optional(),
  /** Status field (post-WINT-1020) */
  status: z.string().optional(),
})

export type StoryMetadata = z.infer<typeof StoryMetadataSchema>

/**
 * Duplicate story entry (same story ID in multiple locations)
 */
export const DuplicateStorySchema = z.object({
  /** Story ID */
  story_id: z.string(),
  /** All locations where this story was found */
  locations: z.array(StoryLocationSchema),
  /** Resolved location (most advanced lifecycle) */
  resolved_location: StoryLocationSchema,
  /** Resolution reason */
  resolution_reason: z.string(),
})

export type DuplicateStory = z.infer<typeof DuplicateStorySchema>

// ============================================================================
// Population Plan (Dry-Run Output)
// ============================================================================

/**
 * Planned story insertion
 */
export const PlannedInsertionSchema = z.object({
  /** Story ID */
  story_id: z.string(),
  /** Story title */
  title: z.string(),
  /** Inferred state */
  state: StoryStateSchema,
  /** Inference method (frontmatter, directory, duplicate-resolution) */
  inference_method: z.enum(['frontmatter', 'directory', 'duplicate-resolution', 'default']),
  /** Source file path */
  source_file: z.string(),
  /** Epic */
  epic: z.string().optional(),
  /** Additional metadata */
  metadata: StoryMetadataSchema.optional(),
})

export type PlannedInsertion = z.infer<typeof PlannedInsertionSchema>

/**
 * Skipped story (malformed, missing required fields, etc.)
 */
export const SkippedStorySchema = z.object({
  /** Story ID or file path if ID unavailable */
  identifier: z.string(),
  /** Reason for skipping */
  reason: z.string(),
  /** Error details */
  error: z.string().optional(),
  /** File path */
  file_path: z.string(),
})

export type SkippedStory = z.infer<typeof SkippedStorySchema>

/**
 * Population plan (dry-run output)
 */
export const PopulationPlanSchema = z.object({
  /** Timestamp of plan generation */
  timestamp: z.string(),
  /** Total stories discovered */
  discovered_count: z.number(),
  /** Stories planned for insertion */
  planned_insertions: z.array(PlannedInsertionSchema),
  /** Stories to skip */
  skipped_stories: z.array(SkippedStorySchema),
  /** Duplicate stories found and resolved */
  duplicates_resolved: z.array(DuplicateStorySchema),
  /** State distribution */
  state_distribution: z.record(StoryStateSchema, z.number()),
  /** Epic distribution */
  epic_distribution: z.record(z.string(), z.number()),
})

export type PopulationPlan = z.infer<typeof PopulationPlanSchema>

// ============================================================================
// Population Log (Execution Output)
// ============================================================================

/**
 * Insertion result
 */
export const InsertionResultSchema = z.object({
  /** Story ID */
  story_id: z.string(),
  /** Success/failure */
  success: z.boolean(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Inserted state */
  state: StoryStateSchema.optional(),
  /** Timestamp of insertion */
  timestamp: z.string(),
})

export type InsertionResult = z.infer<typeof InsertionResultSchema>

/**
 * Population log (execution output)
 */
export const PopulationLogSchema = z.object({
  /** Start timestamp */
  started_at: z.string(),
  /** End timestamp */
  completed_at: z.string().optional(),
  /** Total stories discovered */
  discovered_count: z.number(),
  /** Successfully inserted */
  inserted_count: z.number(),
  /** Skipped stories */
  skipped_count: z.number(),
  /** Failed insertions */
  failed_count: z.number(),
  /** Insertion results */
  insertions: z.array(InsertionResultSchema),
  /** Skipped stories */
  skipped_stories: z.array(SkippedStorySchema),
  /** Duplicates resolved */
  duplicates_resolved: z.array(DuplicateStorySchema),
  /** Execution errors */
  errors: z.array(
    z.object({
      story_id: z.string().optional(),
      error: z.string(),
      timestamp: z.string(),
    }),
  ),
})

export type PopulationLog = z.infer<typeof PopulationLogSchema>

// ============================================================================
// Verification Report (Post-Execution Validation)
// ============================================================================

/**
 * Verification check result
 */
export const VerificationCheckSchema = z.object({
  /** Check name */
  check: z.string(),
  /** Pass/fail */
  passed: z.boolean(),
  /** Expected value */
  expected: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /** Actual value */
  actual: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /** Error message if failed */
  message: z.string().optional(),
})

export type VerificationCheck = z.infer<typeof VerificationCheckSchema>

/**
 * State distribution check
 */
export const StateDistributionSchema = z.object({
  /** State name */
  state: StoryStateSchema,
  /** Count in database */
  count: z.number(),
})

export type StateDistribution = z.infer<typeof StateDistributionSchema>

/**
 * Verification report
 */
export const VerificationReportSchema = z.object({
  /** Timestamp of verification */
  timestamp: z.string(),
  /** Overall pass/fail */
  passed: z.boolean(),
  /** Total stories in database */
  total_stories: z.number(),
  /** State distribution */
  state_distribution: z.array(StateDistributionSchema),
  /** Verification checks */
  checks: z.array(VerificationCheckSchema),
  /** Errors found */
  errors: z.array(
    z.object({
      check: z.string(),
      error: z.string(),
    }),
  ),
})

export type VerificationReport = z.infer<typeof VerificationReportSchema>
