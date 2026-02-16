/**
 * Stage Movement Type Definitions
 *
 * Zod-first schemas for stage movement operations.
 * Stages represent the lifecycle position of a story in the SDLC workflow.
 */

import { z } from 'zod'

/**
 * Valid lifecycle stages for stories
 *
 * Note: This includes 'elaboration' which is NOT in StoryStateSchema.
 * StoryStateSchema is for the new v2 state field.
 * StageSchema is for the legacy status field which includes elaboration.
 */
export const StageSchema = z.enum([
  'backlog',
  'elaboration',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat',
])
export type Stage = z.infer<typeof StageSchema>

/**
 * Stage transition definition
 */
export const StageTransitionSchema = z.object({
  from: StageSchema,
  to: StageSchema,
})
export type StageTransition = z.infer<typeof StageTransitionSchema>

/**
 * Request to move a story to a new stage
 */
export const MoveStageRequestSchema = z.object({
  /** Story identifier (e.g. LNGG-0040) */
  storyId: z.string(),
  /** Feature directory containing the story (e.g. plans/future/platform) */
  featureDir: z.string(),
  /** Target stage to move to */
  toStage: StageSchema,
  /** Current stage (optional - adapter will auto-locate if not provided) */
  fromStage: StageSchema.optional(),
})
export type MoveStageRequest = z.infer<typeof MoveStageRequestSchema>

/**
 * Result of a stage movement operation
 */
export const MoveStageResultSchema = z.object({
  /** Story identifier */
  storyId: z.string(),
  /** Stage the story was in before the move */
  fromStage: StageSchema,
  /** Stage the story is now in */
  toStage: StageSchema,
  /** Whether the move succeeded */
  success: z.boolean(),
  /** Time taken for the operation in milliseconds */
  elapsedMs: z.number(),
  /** Warning message (e.g. story already at target stage) */
  warning: z.string().optional(),
})
export type MoveStageResult = z.infer<typeof MoveStageResultSchema>

/**
 * Request to move multiple stories to a new stage
 */
export const BatchMoveStageRequestSchema = z.object({
  /** Stories to move */
  stories: z.array(MoveStageRequestSchema),
  /** Target stage for all stories (overrides individual toStage if provided) */
  toStage: StageSchema.optional(),
  /** Continue processing on error (default: true) */
  continueOnError: z.boolean().default(true),
})
export type BatchMoveStageRequest = z.infer<typeof BatchMoveStageRequestSchema>

/**
 * Result of a batch stage movement operation
 */
export const BatchMoveStageResultSchema = z.object({
  /** Total number of stories attempted */
  totalStories: z.number(),
  /** Number of successful moves */
  succeeded: z.number(),
  /** Number of failed moves */
  failed: z.number(),
  /** Individual results for each story */
  results: z.array(MoveStageResultSchema),
  /** Errors encountered during batch operation */
  errors: z.array(
    z.object({
      storyId: z.string(),
      error: z.string(),
      errorType: z.string(),
    }),
  ),
  /** Total time taken for batch operation in milliseconds */
  elapsedMs: z.number(),
})
export type BatchMoveStageResult = z.infer<typeof BatchMoveStageResultSchema>
