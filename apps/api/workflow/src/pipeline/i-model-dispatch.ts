/**
 * IModelDispatch — Injectable Model Dispatch Interface
 *
 * Zod-first injectable boundary for dispatching AI model requests within
 * the implementation graph. Enables unit testing without real model calls.
 *
 * Usage: inject a conformant implementation via createImplementationGraph() config.
 * In tests, inject a vi.fn() mock that satisfies IModelDispatch.
 */

import { z } from 'zod'

/**
 * Request schema for a model dispatch call.
 */
export const ModelDispatchRequestSchema = z.object({
  /** The storyId driving this model call */
  storyId: z.string().min(1),
  /** Attempt number (1-based) for retry tracking */
  attemptNumber: z.number().int().positive(),
  /** The prompt/instructions to send to the model */
  prompt: z.string().min(1),
  /** Optional model override (defaults to orchestrator assignment) */
  modelOverride: z.string().optional(),
})

export type ModelDispatchRequest = z.infer<typeof ModelDispatchRequestSchema>

/**
 * Response schema from a model dispatch call.
 */
export const ModelDispatchResponseSchema = z.object({
  /** Whether the dispatch succeeded */
  success: z.boolean(),
  /** The model output text (if success) */
  output: z.string().optional(),
  /** Error message (if not success) */
  error: z.string().optional(),
  /** Duration of the model call in ms */
  durationMs: z.number().int().min(0),
})

export type ModelDispatchResponse = z.infer<typeof ModelDispatchResponseSchema>

/**
 * IModelDispatch schema — injectable interface as Zod-first type.
 *
 * The dispatch function accepts a ModelDispatchRequest and returns a
 * Promise<ModelDispatchResponse>. Consumers inject this via config so
 * unit tests can mock without hitting real model endpoints.
 *
 * Zero TypeScript interfaces — this is a Zod-compatible function schema.
 */
export const IModelDispatchSchema = z.object({
  dispatch: z
    .function()
    .args(ModelDispatchRequestSchema)
    .returns(z.promise(ModelDispatchResponseSchema)),
})

export type IModelDispatch = z.infer<typeof IModelDispatchSchema>
