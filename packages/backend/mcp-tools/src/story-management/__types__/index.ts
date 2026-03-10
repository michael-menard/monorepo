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
 * Retrieves current status of a story by UUID or human-readable ID
 */
export const StoryGetStatusInputSchema = z.object({
  storyId: StoryIdSchema,
})

export type StoryGetStatusInput = z.infer<typeof StoryGetStatusInputSchema>

/**
 * Story Get Status Output Schema
 * Returns story status with metadata or null if not found
 *
 * DEBT-RU-002: The story state enum ['backlog','ready','in_progress','ready_for_qa',
 * 'in_qa','blocked','completed','cancelled'] is repeated 4 times in this file (StoryGetStatusOutputSchema,
 * StoryUpdateStatusInputSchema, StoryUpdateStatusOutputSchema, StoryGetByStatusOutputSchema /
 * StoryGetByFeatureOutputSchema). This is a pre-existing issue that predates WINT-1150.
 * No shared @repo/mcp-tools-types or @repo/backend-utils package currently exists to consolidate
 * this. A future refactor should extract a StoryStateSchema constant to eliminate the repetition.
 *
 * DEBT-RU-003: The priority enum ['P0','P1','P2','P3','P4'] is similarly repeated 3 times in this
 * file. Same root cause as DEBT-RU-002 — no shared package exists for cross-module enum constants.
 * Should be extracted alongside StoryStateSchema in the same future refactor.
 */
export const StoryGetStatusOutputSchema = z
  .object({
    id: z.string().uuid(),
    storyId: z.string(),
    title: z.string(),
    state: z.enum([
      'backlog',
      'ready',
      'in_progress',
      'ready_for_review',
      'ready_for_qa',
      'in_qa',
      'blocked',
      'completed',
      'cancelled',
      'failed_code_review',
      'failed_qa',
    ]),
    priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
    storyType: z.string(),
    epic: z.string().nullable(),
    wave: z.number().int().nullable(),
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
  storyId: StoryIdSchema,
  newState: z.enum([
    'backlog',
    'ready',
    'in_progress',
    'ready_for_review',
    'ready_for_qa',
    'in_qa',
    'blocked',
    'completed',
    'cancelled',
    'failed_code_review',
    'failed_qa',
  ]),
  reason: z.string().optional(),
  triggeredBy: z.string().default('agent'),
  metadata: z.record(z.unknown()).optional(),
})

export type StoryUpdateStatusInput = z.infer<typeof StoryUpdateStatusInputSchema>

/**
 * Story Update Status Output Schema
 * Returns updated story record or null if update failed
 */
export const StoryUpdateStatusOutputSchema = z
  .object({
    id: z.string().uuid(),
    storyId: z.string(),
    state: z.enum([
      'backlog',
      'ready',
      'in_progress',
      'ready_for_review',
      'ready_for_qa',
      'in_qa',
      'blocked',
      'completed',
      'cancelled',
      'failed_code_review',
      'failed_qa',
    ]),
    updatedAt: z.date(),
  })
  .nullable()

export type StoryUpdateStatusOutput = z.infer<typeof StoryUpdateStatusOutputSchema>

/**
 * Story Get By Status Input Schema
 * Retrieves stories filtered by state with pagination
 */
export const StoryGetByStatusInputSchema = z.object({
  state: z.enum([
    'backlog',
    'ready',
    'in_progress',
    'ready_for_review',
    'ready_for_qa',
    'in_qa',
    'blocked',
    'completed',
    'cancelled',
    'failed_code_review',
    'failed_qa',
  ]),
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
    id: z.string().uuid(),
    storyId: z.string(),
    title: z.string(),
    state: z.enum([
      'backlog',
      'ready',
      'in_progress',
      'ready_for_review',
      'ready_for_qa',
      'in_qa',
      'blocked',
      'completed',
      'cancelled',
      'failed_code_review',
      'failed_qa',
    ]),
    priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
    storyType: z.string(),
    epic: z.string().nullable(),
    wave: z.number().int().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
)

export type StoryGetByStatusOutput = z.infer<typeof StoryGetByStatusOutputSchema>

/**
 * Story Get By Feature Input Schema
 * Retrieves stories filtered by epic (feature) with pagination
 */
export const StoryGetByFeatureInputSchema = z.object({
  epic: z.string().min(1, 'epic is required'),
  limit: z.number().int().min(1).max(1000, 'limit cannot exceed 1000').default(50),
  offset: z.number().int().min(0).default(0),
})

export type StoryGetByFeatureInput = z.infer<typeof StoryGetByFeatureInputSchema>

/**
 * Story Get By Feature Output Schema
 * Returns array of stories belonging to the specified epic
 */
export const StoryGetByFeatureOutputSchema = z.array(
  z.object({
    id: z.string().uuid(),
    storyId: z.string(),
    title: z.string(),
    state: z.enum([
      'backlog',
      'ready',
      'in_progress',
      'ready_for_review',
      'ready_for_qa',
      'in_qa',
      'blocked',
      'completed',
      'cancelled',
      'failed_code_review',
      'failed_qa',
    ]),
    priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
    storyType: z.string(),
    epic: z.string().nullable(),
    wave: z.number().int().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
)

export type StoryGetByFeatureOutput = z.infer<typeof StoryGetByFeatureOutputSchema>
