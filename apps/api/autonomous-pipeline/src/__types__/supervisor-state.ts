import { z } from 'zod'

/**
 * Local mirror of APIP-0020's PipelineSupervisorConfigSchema.
 *
 * TODO: Replace with import from apps/api/pipeline once APIP-0020 merges.
 * Describes the static configuration used to initialise a PipelineSupervisor.
 */
export const PipelineSupervisorConfigSchema = z.object({
  queueName: z.string().min(1).default('pipeline'),
  stageTimeoutMs: z.number().int().positive().default(600_000),
  circuitBreakerFailureThreshold: z.number().int().min(1).default(3),
  circuitBreakerRecoveryTimeoutMs: z.number().int().min(0).default(30_000),
})

/**
 * Describes the supervisor's runtime state during a pipeline run.
 *
 * Captures enough information to observe and test supervisor lifecycle
 * transitions (idle → processing → completed / error / stopped).
 */
export const SupervisorStateSchema = z.object({
  status: z.enum(['idle', 'processing', 'completed', 'error', 'stopped']),
  config: PipelineSupervisorConfigSchema,
  currentJobId: z.string().nullable().default(null),
  processedCount: z.number().int().min(0).default(0),
  errorCount: z.number().int().min(0).default(0),
  startedAt: z.string().datetime().nullable().default(null),
  lastProcessedAt: z.string().datetime().nullable().default(null),
})

/** Inferred TypeScript type for the supervisor's static config. */
export type PipelineSupervisorConfig = z.infer<typeof PipelineSupervisorConfigSchema>

/** Inferred TypeScript type for the supervisor's full runtime state. */
export type SupervisorState = z.infer<typeof SupervisorStateSchema>
