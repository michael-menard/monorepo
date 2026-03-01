/**
 * Migration Type Definitions
 *
 * Type-safe schemas for the story directory flattening migration.
 * All schemas use Zod for runtime validation.
 *
 * Also includes WINT-1110: LangGraph to WINT database migration types.
 */

import { z } from 'zod'

// ============================================================================
// Lifecycle Directory Mapping (migrate-flatten-stories.ts)
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

// ============================================================================
// WINT-1110: LangGraph → WINT Database Migration Types
// ============================================================================

/**
 * WINT story_state enum values (underscored naming)
 * Source of truth: packages/backend/database-schema/src/schema/unified-wint.ts
 */
export const WintStoryStateSchema = z.enum([
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
export type WintStoryState = z.infer<typeof WintStoryStateSchema>

/**
 * WINT story_priority enum values (uppercase P0-P4)
 */
export const WintPrioritySchema = z.enum(['P0', 'P1', 'P2', 'P3', 'P4'])
export type WintPriority = z.infer<typeof WintPrioritySchema>

/**
 * WINT story_type enum values
 */
export const WintStoryTypeSchema = z.enum([
  'feature',
  'bug',
  'tech-debt',
  'spike',
  'chore',
  'infra',
  'docs',
])
export type WintStoryType = z.infer<typeof WintStoryTypeSchema>

/**
 * LangGraph story_state enum values (hyphenated naming)
 */
export const LangGraphStoryStateSchema = z.enum([
  'draft',
  'backlog',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat',
  'done',
  'cancelled',
  'blocked',
])
export type LangGraphStoryState = z.infer<typeof LangGraphStoryStateSchema>

/**
 * LangGraph priority enum values (lowercase p0-p3)
 */
export const LangGraphPrioritySchema = z.enum(['p0', 'p1', 'p2', 'p3'])
export type LangGraphPriority = z.infer<typeof LangGraphPrioritySchema>

/**
 * LangGraph story type enum values
 */
export const LangGraphStoryTypeSchema = z.enum(['feature', 'bug', 'tech-debt', 'spike', 'chore'])
export type LangGraphStoryType = z.infer<typeof LangGraphStoryTypeSchema>

/**
 * Zod schema for a row from LangGraph public.stories
 */
export const LangGraphStoryRowSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string(),
  feature_id: z.string().uuid().nullable().optional(),
  state: z.string(),
  type: z.string().nullable().optional(),
  title: z.string(),
  goal: z.string().nullable().optional(),
  non_goals: z.array(z.string()).nullable().optional(),
  packages: z.array(z.string()).nullable().optional(),
  surfaces: z.array(z.string()).nullable().optional(),
  blocked_by: z.string().nullable().optional(),
  depends_on: z.array(z.string()).nullable().optional(),
  follow_up_from: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  embedding: z.unknown().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
})
export type LangGraphStoryRow = z.infer<typeof LangGraphStoryRowSchema>

/**
 * Zod schema for a row from LangGraph public.features
 */
export const LangGraphFeatureRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  embedding: z.unknown().nullable().optional(),
  created_at: z.date(),
})
export type LangGraphFeatureRow = z.infer<typeof LangGraphFeatureRowSchema>

/**
 * Zod schema for a row from LangGraph public.workflow_events
 */
export const LangGraphWorkflowEventRowSchema = z.object({
  id: z.string().uuid(),
  entity_type: z.string(),
  entity_id: z.string(),
  event_type: z.string(),
  old_value: z.unknown().nullable().optional(),
  new_value: z.unknown().nullable().optional(),
  actor: z.string().nullable().optional(),
  created_at: z.date(),
})
export type LangGraphWorkflowEventRow = z.infer<typeof LangGraphWorkflowEventRowSchema>

/**
 * WINT story record ready for INSERT
 */
export const WintStoryInsertSchema = z.object({
  story_id: z.string(),
  feature_id: z.string().uuid().nullable(),
  type: WintStoryTypeSchema,
  state: WintStoryStateSchema,
  title: z.string(),
  goal: z.string().nullable(),
  points: z.number().int().nullable(),
  priority: WintPrioritySchema,
  blocked_by: z.string().nullable(),
  depends_on: z.array(z.string()).nullable(),
  follow_up_from: z.string().nullable(),
  packages: z.array(z.string()).nullable(),
  surfaces: z.array(z.string()).nullable(),
  non_goals: z.array(z.string()).nullable(),
  created_at: z.date(),
  updated_at: z.date(),
})
export type WintStoryInsert = z.infer<typeof WintStoryInsertSchema>

/**
 * WINT feature record ready for INSERT
 */
export const WintFeatureInsertSchema = z.object({
  feature_name: z.string(),
  feature_type: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
})
export type WintFeatureInsert = z.infer<typeof WintFeatureInsertSchema>

/**
 * WINT state_transition record ready for INSERT
 */
export const WintStateTransitionInsertSchema = z.object({
  entity_type: z.string(),
  entity_id: z.string(),
  from_state: z.string(),
  to_state: z.string(),
  triggered_by: z.string(),
  reason: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  transitioned_at: z.date(),
})
export type WintStateTransitionInsert = z.infer<typeof WintStateTransitionInsertSchema>

/**
 * Counts for a single WINT-1110 migration phase
 */
export const MigrationPhaseResultSchema = z.object({
  total_queried: z.number().int(),
  inserted_count: z.number().int(),
  skipped_count: z.number().int(),
  error_count: z.number().int(),
  errors: z.array(
    z.object({
      id: z.string(),
      error: z.string(),
      timestamp: z.string(),
    }),
  ),
})
export type MigrationPhaseResult = z.infer<typeof MigrationPhaseResultSchema>

/**
 * Overall WINT-1110 migration log written to migration-log.json
 */
export const Wint1110MigrationLogSchema = z.object({
  story_id: z.literal('WINT-1110'),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  dry_run: z.boolean(),
  stories: MigrationPhaseResultSchema,
  features: MigrationPhaseResultSchema,
  state_transitions: MigrationPhaseResultSchema,
  migrated_story_ids: z.array(z.string()),
  migrated_feature_names: z.array(z.string()),
  success: z.boolean(),
})
export type Wint1110MigrationLog = z.infer<typeof Wint1110MigrationLogSchema>

/**
 * CLI options for WINT-1110 migration script
 */
export const MigrationCliOptionsSchema = z.object({
  dryRun: z.boolean(),
  verbose: z.boolean(),
  batchSize: z.number().int().min(1).max(500),
})
export type MigrationCliOptions = z.infer<typeof MigrationCliOptionsSchema>

// ============================================================================
// WINT-1110 Transformation Functions
// ============================================================================

/**
 * Normalize LangGraph story state (hyphenated) to WINT story_state (underscored).
 *
 * Mapping:
 * - 'ready-to-work' → 'ready_to_work'
 * - 'in-progress'   → 'in_progress'
 * - 'ready-for-qa'  → 'ready_for_qa'
 * - 'uat'           → 'in_qa'  (semantic: UAT is the in-QA phase in WINT)
 * - Others          → unchanged or 'backlog' as fallback
 */
export function normalizeStoryState(state: string | null | undefined): WintStoryState {
  if (!state) {
    return 'backlog'
  }

  switch (state.toLowerCase()) {
    case 'draft':
      return 'draft'
    case 'backlog':
      return 'backlog'
    case 'ready-to-work':
      return 'ready_to_work'
    case 'in-progress':
      return 'in_progress'
    case 'ready-for-qa':
      return 'ready_for_qa'
    case 'uat':
      return 'in_qa'
    case 'blocked':
      return 'blocked'
    case 'done':
      return 'done'
    case 'cancelled':
      return 'cancelled'
    default:
      return 'backlog'
  }
}

/**
 * Normalize LangGraph priority (lowercase p0-p3) to WINT priority (uppercase P0-P4).
 * Defaults to 'P2' if priority is null/undefined or invalid.
 */
export function normalizePriority(priority: string | null | undefined): WintPriority {
  if (!priority) {
    return 'P2'
  }

  const upper = priority.toUpperCase()
  const result = WintPrioritySchema.safeParse(upper)
  if (result.success) {
    return result.data
  }

  return 'P2'
}

/**
 * Normalize LangGraph story type to WINT story_type.
 * Defaults to 'feature' if type is null/undefined or invalid.
 */
export function normalizeStoryType(type: string | null | undefined): WintStoryType {
  if (!type) {
    return 'feature'
  }

  const result = WintStoryTypeSchema.safeParse(type)
  if (result.success) {
    return result.data
  }

  return 'feature'
}

/**
 * Map a LangGraph story row to a WINT story insert record.
 */
export function mapLangGraphStoryToWint(row: LangGraphStoryRow): WintStoryInsert {
  return {
    story_id: row.story_id,
    feature_id: row.feature_id ?? null,
    type: normalizeStoryType(row.type),
    state: normalizeStoryState(row.state),
    title: row.title,
    goal: row.goal ?? null,
    points: null,
    priority: normalizePriority(row.priority),
    blocked_by: row.blocked_by ?? null,
    depends_on: row.depends_on ?? null,
    follow_up_from: row.follow_up_from ?? null,
    packages: row.packages ?? null,
    surfaces: row.surfaces ?? null,
    non_goals: row.non_goals ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Map a LangGraph feature row to a WINT feature insert record.
 * Key mapping: LangGraph 'name' → WINT 'feature_name'.
 */
export function mapLangGraphFeatureToWint(row: LangGraphFeatureRow): WintFeatureInsert {
  return {
    feature_name: row.name,
    feature_type: 'unknown',
    description: row.description ?? null,
    is_active: true,
    created_at: row.created_at,
    updated_at: new Date(),
  }
}

/**
 * Map a LangGraph workflow_event to a WINT state_transition insert record.
 * Returns null if the event cannot be mapped (missing state values).
 */
export function mapWorkflowEventToStateTransition(
  row: LangGraphWorkflowEventRow,
): WintStateTransitionInsert | null {
  const oldValue = row.old_value as Record<string, unknown> | null
  const newValue = row.new_value as Record<string, unknown> | null

  const fromState = typeof oldValue?.state === 'string' ? oldValue.state : null
  const toState = typeof newValue?.state === 'string' ? newValue.state : null

  if (!fromState || !toState) {
    return null
  }

  return {
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    from_state: normalizeStoryState(fromState),
    to_state: normalizeStoryState(toState),
    triggered_by: row.actor ?? 'langgraph_migration',
    reason: 'Migrated from LangGraph workflow_events',
    metadata: {
      source: 'langgraph_migration',
      original_event_id: row.id,
      event_type: row.event_type,
      old_value: oldValue,
      new_value: newValue,
    },
    transitioned_at: row.created_at,
  }
}
