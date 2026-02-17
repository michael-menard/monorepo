/**
 * Zod Input Schemas for Worktree Management MCP Tools
 * WINT-1130: Track Worktree-to-Story Mapping in Database
 *
 * These schemas define and validate inputs for all 4 MCP tools.
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 */

import { z } from 'zod'

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Worktree Status Enum Schema
 * Matches worktreeStatusEnum from database schema
 */
export const WorktreeStatusSchema = z.enum(['active', 'merged', 'abandoned'])

/**
 * Story ID Schema
 * Accepts both UUID format and human-readable format (e.g., "WINT-1130")
 */
export const StoryIdSchema = z.union([
  z.string().uuid('storyId must be a valid UUID'),
  z
    .string()
    .regex(
      /^[A-Z]{2,10}-\d{3,4}$/,
      'storyId must be in format XXXX-NNNN (e.g., WINT-1130)',
    ),
])

// ============================================================================
// WORKTREE_REGISTER SCHEMAS (AC-5)
// ============================================================================

/**
 * Worktree Register Input Schema
 * Creates new worktree record in database
 */
export const WorktreeRegisterInputSchema = z.object({
  storyId: StoryIdSchema,
  worktreePath: z.string().min(1, 'worktreePath is required'),
  branchName: z.string().min(1, 'branchName is required'),
})

export type WorktreeRegisterInput = z.infer<typeof WorktreeRegisterInputSchema>

/**
 * Worktree Register Output Schema
 * Returns created worktree record or null if registration failed
 */
export const WorktreeRegisterOutputSchema = z
  .object({
    id: z.string().uuid(),
    storyId: z.string(),
    worktreePath: z.string(),
    branchName: z.string(),
    status: z.literal('active'),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .nullable()

export type WorktreeRegisterOutput = z.infer<typeof WorktreeRegisterOutputSchema>

// ============================================================================
// WORKTREE_GET_BY_STORY SCHEMAS (AC-6)
// ============================================================================

/**
 * Worktree Get By Story Input Schema
 * Retrieves active worktree for a story
 */
export const WorktreeGetByStoryInputSchema = z.object({
  storyId: StoryIdSchema,
})

export type WorktreeGetByStoryInput = z.infer<typeof WorktreeGetByStoryInputSchema>

/**
 * Worktree Record Schema
 * Full worktree record returned by query operations
 */
export const WorktreeRecordSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string(),
  worktreePath: z.string(),
  branchName: z.string(),
  status: WorktreeStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  mergedAt: z.date().nullable(),
  abandonedAt: z.date().nullable(),
  metadata: z.record(z.unknown()),
})

export type WorktreeRecord = z.infer<typeof WorktreeRecordSchema>

/**
 * Worktree Get By Story Output Schema
 * Returns active worktree or null if not found
 */
export const WorktreeGetByStoryOutputSchema = WorktreeRecordSchema.nullable()

export type WorktreeGetByStoryOutput = z.infer<typeof WorktreeGetByStoryOutputSchema>

// ============================================================================
// WORKTREE_LIST_ACTIVE SCHEMAS (AC-7)
// ============================================================================

/**
 * Worktree List Active Input Schema
 * Lists all active worktrees with pagination
 */
export const WorktreeListActiveInputSchema = z.object({
  limit: z.number().int().min(1).max(1000, 'limit cannot exceed 1000').default(50),
  offset: z.number().int().min(0).default(0),
})

export type WorktreeListActiveInput = z.infer<typeof WorktreeListActiveInputSchema>

/**
 * Worktree List Active Output Schema
 * Returns array of active worktrees
 */
export const WorktreeListActiveOutputSchema = z.array(WorktreeRecordSchema)

export type WorktreeListActiveOutput = z.infer<typeof WorktreeListActiveOutputSchema>

// ============================================================================
// WORKTREE_MARK_COMPLETE SCHEMAS (AC-8)
// ============================================================================

/**
 * Worktree Mark Complete Input Schema
 * Updates worktree status to merged or abandoned
 */
export const WorktreeMarkCompleteInputSchema = z.object({
  worktreeId: z.string().uuid('worktreeId must be a valid UUID'),
  status: z.enum(['merged', 'abandoned']),
  metadata: z.record(z.unknown()).optional(),
})

export type WorktreeMarkCompleteInput = z.infer<typeof WorktreeMarkCompleteInputSchema>

/**
 * Worktree Mark Complete Output Schema
 * Returns success indicator or null if update failed
 */
export const WorktreeMarkCompleteOutputSchema = z
  .object({
    success: z.literal(true),
  })
  .nullable()

export type WorktreeMarkCompleteOutput = z.infer<typeof WorktreeMarkCompleteOutputSchema>
