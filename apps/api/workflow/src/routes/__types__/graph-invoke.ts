import { z } from 'zod'

// ============================================================================
// Story-centric request (dev-implement, qa-verify)
// ============================================================================

export const GraphInvokeRequestSchema = z.object({
  storyId: z.string().min(1),
  threadId: z.string().uuid().optional(),
  enableCheckpointing: z.boolean().default(true),
})

export type GraphInvokeRequest = z.infer<typeof GraphInvokeRequestSchema>

// ============================================================================
// Plan-centric request (plan-refinement, story-generation)
// ============================================================================

export const PlanGraphInvokeRequestSchema = z.object({
  planSlug: z.string().min(1),
  threadId: z.string().uuid().optional(),
  enableCheckpointing: z.boolean().default(true),
})

export type PlanGraphInvokeRequest = z.infer<typeof PlanGraphInvokeRequestSchema>

// ============================================================================
// Review request (story + worktree path)
// ============================================================================

export const ReviewGraphInvokeRequestSchema = z.object({
  storyId: z.string().min(1),
  worktreePath: z.string().optional(),
  threadId: z.string().uuid().optional(),
  enableCheckpointing: z.boolean().default(true),
})

export type ReviewGraphInvokeRequest = z.infer<typeof ReviewGraphInvokeRequestSchema>

// ============================================================================
// Unified response schema
// ============================================================================

export const GraphInvokeResponseSchema = z.object({
  status: z.enum(['completed', 'failed', 'error']),
  threadId: z.string().uuid(),
  storyId: z.string(), // Either storyId or planSlug depending on graph
  phase: z.string(),
  durationMs: z.number(),
  summary: z.object({
    verdict: z.enum(['complete', 'stuck', 'error']).optional(),
    filesCreated: z.array(z.string()).optional(),
    filesModified: z.array(z.string()).optional(),
    errors: z.array(z.string()).optional(),
  }),
})

export type GraphInvokeResponse = z.infer<typeof GraphInvokeResponseSchema>
