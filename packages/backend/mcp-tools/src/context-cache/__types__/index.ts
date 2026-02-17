/**
 * Zod Input Schemas for Context Cache MCP Tools
 * WINT-0100: Create Context Cache MCP Tools
 *
 * These schemas define and validate inputs for all 4 MCP tools.
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 */

import { z } from 'zod'

/**
 * Valid pack types from database contextPackTypeEnum
 */
const packTypeValues = [
  'codebase',
  'story',
  'feature',
  'epic',
  'architecture',
  'lessons_learned',
  'test_patterns',
] as const

/**
 * Context Cache Get Input Schema
 * Retrieves cached context pack by type and key
 */
export const ContextCacheGetInputSchema = z.object({
  packType: z.enum(packTypeValues, {
    errorMap: () => ({ message: 'packType must be a valid context pack type' }),
  }),
  packKey: z.string().min(1, 'packKey must not be empty'),
})

export type ContextCacheGetInput = z.infer<typeof ContextCacheGetInputSchema>

/**
 * Context Cache Put Input Schema
 * Creates or updates context pack with content
 */
export const ContextCachePutInputSchema = z.object({
  packType: z.enum(packTypeValues, {
    errorMap: () => ({ message: 'packType must be a valid context pack type' }),
  }),
  packKey: z.string().min(1, 'packKey must not be empty'),
  content: z.record(z.unknown()),
  ttl: z
    .number()
    .int()
    .positive('ttl must be positive')
    .optional()
    .default(604800), // 7 days in seconds
  version: z.number().int().optional(),
})

export type ContextCachePutInput = z.infer<typeof ContextCachePutInputSchema>

/**
 * Context Cache Invalidate Input Schema
 * Marks context as expired or deletes stale entries
 */
export const ContextCacheInvalidateInputSchema = z.object({
  packType: z
    .enum(packTypeValues, {
      errorMap: () => ({ message: 'packType must be a valid context pack type' }),
    })
    .optional(),
  packKey: z.string().min(1, 'packKey must not be empty').optional(),
  olderThan: z.date().optional(),
  hardDelete: z.boolean().optional().default(false),
})

export type ContextCacheInvalidateInput = z.infer<typeof ContextCacheInvalidateInputSchema>

/**
 * Context Cache Stats Input Schema
 * Queries cache effectiveness metrics
 */
export const ContextCacheStatsInputSchema = z.object({
  packType: z
    .enum(packTypeValues, {
      errorMap: () => ({ message: 'packType must be a valid context pack type' }),
    })
    .optional(),
  since: z.date().optional(),
})

export type ContextCacheStatsInput = z.infer<typeof ContextCacheStatsInputSchema>

/**
 * Context Cache Stats Result Schema
 * Return type for stats operations
 */
export const ContextCacheStatsResultSchema = z.object({
  totalPacks: z.number().int().min(0),
  hitCount: z.number().int().min(0),
  avgHitsPerPack: z.number().min(0),
  expiredCount: z.number().int().min(0),
})

export type ContextCacheStatsResult = z.infer<typeof ContextCacheStatsResultSchema>

/**
 * Context Cache Invalidate Result Schema
 * Return type for invalidate operations
 */
export const ContextCacheInvalidateResultSchema = z.object({
  invalidatedCount: z.number().int().min(0),
})

export type ContextCacheInvalidateResult = z.infer<typeof ContextCacheInvalidateResultSchema>
