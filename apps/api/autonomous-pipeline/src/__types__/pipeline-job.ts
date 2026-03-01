import { z } from 'zod'

/**
 * Local mirror of APIP-0010's PipelinePhaseSchema.
 *
 * TODO: Replace with import from @repo/pipeline-queue once APIP-0010 merges.
 * Represents the distinct phases a pipeline job can be in during autonomous execution.
 */
export const PipelinePhaseSchema = z.enum([
  'elaboration',
  'implementation',
  'review',
  'qa',
  'merge',
])

/**
 * Local mirror of APIP-0010's PipelineJobDataSchema.
 *
 * TODO: Replace with import from @repo/pipeline-queue once APIP-0010 merges.
 * Describes the data payload carried by a BullMQ pipeline job.
 */
export const PipelineJobDataSchema = z.object({
  storyId: z.string().min(1),
  phase: PipelinePhaseSchema,
  priority: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
})

/** Inferred TypeScript type for a pipeline phase string. */
export type PipelinePhase = z.infer<typeof PipelinePhaseSchema>

/** Inferred TypeScript type for pipeline job data. */
export type PipelineJobData = z.infer<typeof PipelineJobDataSchema>
