import { z } from 'zod'
import { PipelineJobDataSchema } from '../__types__/pipeline-job.js'

/** Inferred type for pipeline job data. */
type PipelineJobData = z.infer<typeof PipelineJobDataSchema>

/**
 * Creates a mock BullMQ pipeline job data object for use in unit tests.
 *
 * Merges sensible defaults with any caller-supplied partial overrides,
 * then validates the result through `PipelineJobDataSchema.parse()` so
 * tests always receive a structurally-valid payload.
 *
 * @param overrides - Partial fields to override on the default fixture.
 * @returns A validated `PipelineJobData` object.
 *
 * @example
 * ```ts
 * const job = createMockBullMQJob({ storyId: 'APIP-1234', phase: 'review' })
 * ```
 */
export function createMockBullMQJob(overrides?: Partial<PipelineJobData>): PipelineJobData {
  const defaults: PipelineJobData = {
    storyId: 'APIP-0001',
    phase: 'elaboration',
    priority: 1,
    metadata: {},
  }

  return PipelineJobDataSchema.parse({ ...defaults, ...overrides })
}
