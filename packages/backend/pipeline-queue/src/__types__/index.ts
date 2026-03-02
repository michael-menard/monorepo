/**
 * Internal Types for Pipeline Queue Package
 *
 * Zod schemas for pipeline job data structures used by the autonomous pipeline (APIP).
 */

import { z } from 'zod'

/**
 * Pipeline phase enum — the ordered stages a story passes through.
 */
const PipelinePhaseSchema = z.enum([
  'elaboration',
  'implementation',
  'review',
  'qa',
  'merge',
])

export type PipelinePhase = z.infer<typeof PipelinePhaseSchema>

/**
 * PipelineJobDataSchema — payload for every job enqueued on the pipeline queue.
 *
 * - storyId: Unique identifier for the story being processed (e.g. "APIP-0010")
 * - phase:   Current pipeline phase to execute
 * - priority: Optional numeric priority (lower = higher priority in BullMQ)
 * - metadata: Optional arbitrary key-value metadata for phase-specific context
 */
export const PipelineJobDataSchema = z.object({
  storyId: z.string().min(1, 'storyId must be a non-empty string'),
  phase: PipelinePhaseSchema,
  priority: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type PipelineJobData = z.infer<typeof PipelineJobDataSchema>
