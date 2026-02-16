/**
 * Zod Input Schemas for Session Management MCP Tools
 * WINT-0110: Session Management MCP Tools
 *
 * These schemas define and validate inputs for all 5 MCP tools.
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Session Create Input Schema
 * Creates new record in wint.contextSessions
 */
export const SessionCreateInputSchema = z.object({
  sessionId: z
    .string()
    .uuid('sessionId must be a valid UUID')
    .optional(), // Auto-generated if not provided
  agentName: z.string().min(1, 'agentName is required'),
  storyId: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  inputTokens: z.number().int().min(0).optional().default(0),
  outputTokens: z.number().int().min(0).optional().default(0),
  cachedTokens: z.number().int().min(0).optional().default(0),
  startedAt: z.date().optional(), // Defaults to now() if not provided
})

export type SessionCreateInput = z.infer<typeof SessionCreateInputSchema>

/**
 * Session Update Input Schema
 * Updates token metrics with incremental/absolute modes
 */
export const SessionUpdateInputSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  mode: z.enum(['incremental', 'absolute']).default('incremental'),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})

export type SessionUpdateInput = z.infer<typeof SessionUpdateInputSchema>

/**
 * Session Complete Input Schema
 * Marks session as ended with final metrics
 */
export const SessionCompleteInputSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  endedAt: z.date().optional(), // Defaults to now() if not provided
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})

export type SessionCompleteInput = z.infer<typeof SessionCompleteInputSchema>

/**
 * Session Query Input Schema
 * Retrieves sessions with flexible filtering and pagination
 */
export const SessionQueryInputSchema = z.object({
  agentName: z.string().optional(),
  storyId: z.string().optional(),
  activeOnly: z.boolean().default(false), // Filter for endedAt IS NULL
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000, 'limit cannot exceed 1000')
    .default(50),
  offset: z.number().int().min(0).default(0),
})

export type SessionQueryInput = z.infer<typeof SessionQueryInputSchema>

/**
 * Session Cleanup Input Schema
 * Archives old completed sessions with safety mechanism
 */
export const SessionCleanupInputSchema = z.object({
  retentionDays: z
    .number()
    .int()
    .min(1, 'retentionDays must be positive')
    .default(90),
  dryRun: z.boolean().default(true), // Safety: defaults to true
})

export type SessionCleanupInput = z.infer<typeof SessionCleanupInputSchema>

/**
 * Session Cleanup Result Schema
 * Return type for cleanup operations
 */
export const SessionCleanupResultSchema = z.object({
  deletedCount: z.number().int().min(0),
  dryRun: z.boolean(),
  cutoffDate: z.date(),
})

export type SessionCleanupResult = z.infer<typeof SessionCleanupResultSchema>
