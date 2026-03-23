/**
 * Zod Input Schemas for Story Management MCP Tools
 * WINT-0090: Story Management MCP Tools
 *
 * These schemas define and validate inputs for all 4 MCP tools.
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Story ID Schema
 * Accepts both UUID format and human-readable format (e.g., "WINT-0090")
 * More lenient pattern to allow TEST-9999, NONEXIST-0001 etc for testing
 */
export const StoryIdSchema = z.union([
  z.string().uuid('storyId must be a valid UUID'),
  z
    .string()
    .regex(
      /^[A-Z]{2,10}-\d{3,4}$/,
      'storyId must be in format XXXX-NNNN (e.g., WINT-0090, TEST-9999)',
    ),
])

/**
 * Story Get Status Input Schema
 * Retrieves current status of a story by human-readable ID
 */
export const StoryGetStatusInputSchema = z.object({
  storyId: z.string().min(1),
})

export type StoryGetStatusInput = z.infer<typeof StoryGetStatusInputSchema>

/**
 * Story Get Status Output Schema
 * Returns story status with metadata or null if not found
 */
export const StoryGetStatusOutputSchema = z
  .object({
    storyId: z.string(),
    feature: z.string(),
    title: z.string(),
    state: z.string().nullable(),
    priority: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .nullable()

export type StoryGetStatusOutput = z.infer<typeof StoryGetStatusOutputSchema>

/**
 * Story Update Status Input Schema
 * Updates story state with transition tracking
 */
export const StoryUpdateStatusInputSchema = z.object({
  storyId: z.string().min(1),
  newState: z.enum([
    'backlog',
    'created',
    'elab',
    'ready',
    'in_progress',
    'needs_code_review',
    'ready_for_qa',
    'in_qa',
    'completed',
    'failed_code_review',
    'failed_qa',
    'blocked',
    'cancelled',
  ]),
  reason: z.string().optional(),
  triggeredBy: z.string().default('agent'),
  metadata: z.record(z.unknown()).optional(),
})

export type StoryUpdateStatusInput = z.infer<typeof StoryUpdateStatusInputSchema>

/**
 * Story Update Status Output Schema
 * Returns updated story record or null if update failed.
 *
 * gate_blocked: true when transition was blocked by a missing artifact gate (APRS-1010).
 * missing_artifact: human-readable label of the artifact required to proceed.
 * Both fields are optional for backward compatibility with ungated transitions.
 */
export const StoryUpdateStatusOutputSchema = z
  .object({
    id: z.string().uuid().optional(),
    storyId: z.string(),
    state: z.string().nullable(),
    updatedAt: z.date(),
    gate_blocked: z.boolean().optional(),
    missing_artifact: z.string().optional(),
  })
  .nullable()

export type StoryUpdateStatusOutput = z.infer<typeof StoryUpdateStatusOutputSchema>

/**
 * Story Get By Status Input Schema
 * Retrieves stories filtered by state with pagination
 */
export const StoryGetByStatusInputSchema = z.object({
  state: z.string().min(1),
  limit: z.number().int().min(1).max(1000, 'limit cannot exceed 1000').default(50),
  offset: z.number().int().min(0).default(0),
})

export type StoryGetByStatusInput = z.infer<typeof StoryGetByStatusInputSchema>

/**
 * Story Get By Status Output Schema
 * Returns array of stories in the specified state
 */
export const StoryGetByStatusOutputSchema = z.array(
  z.object({
    storyId: z.string(),
    feature: z.string(),
    title: z.string(),
    state: z.string().nullable(),
    priority: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
)

export type StoryGetByStatusOutput = z.infer<typeof StoryGetByStatusOutputSchema>

/**
 * Story Get By Feature Input Schema
 * Retrieves stories filtered by feature with pagination
 */
export const StoryGetByFeatureInputSchema = z.object({
  feature: z.string().min(1, 'feature is required'),
  limit: z.number().int().min(1).max(1000, 'limit cannot exceed 1000').default(50),
  offset: z.number().int().min(0).default(0),
})

export type StoryGetByFeatureInput = z.infer<typeof StoryGetByFeatureInputSchema>

/**
 * Story Get By Feature Output Schema
 * Returns array of stories belonging to the specified feature
 */
export const StoryGetByFeatureOutputSchema = z.array(
  z.object({
    storyId: z.string(),
    feature: z.string(),
    title: z.string(),
    state: z.string().nullable(),
    priority: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
)

export type StoryGetByFeatureOutput = z.infer<typeof StoryGetByFeatureOutputSchema>
