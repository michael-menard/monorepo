/**
 * Context Cache Invalidate MCP Tool
 * WINT-0100 AC-3: Mark context as expired or delete stale entries
 *
 * Features:
 * - Soft delete by default (update expiresAt = NOW() - 1 second)
 * - Hard delete optional (physical DELETE from database)
 * - Filter by packType, packKey, and/or age (olderThan)
 * - Returns count of invalidated packs
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, and, lt, sql, type SQL } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/src/db'
import {
  ContextCacheInvalidateInputSchema,
  type ContextCacheInvalidateInput,
  type ContextCacheInvalidateResult,
} from './__types__/index.js'

/**
 * Invalidate context packs (soft delete by default, hard delete optional)
 *
 * @param input - Optional filters (packType, packKey, olderThan) and hardDelete flag
 * @returns Object with invalidatedCount
 *
 * @example Soft delete by packType (default)
 * ```typescript
 * const result = await contextCacheInvalidate({
 *   packType: 'story'
 * })
 * console.log(`Invalidated ${result.invalidatedCount} story packs`)
 * // Packs still exist in DB but are expired
 * ```
 *
 * @example Hard delete by packKey
 * ```typescript
 * const result = await contextCacheInvalidate({
 *   packType: 'codebase',
 *   packKey: 'old-project',
 *   hardDelete: true
 * })
 * // Pack physically removed from database
 * ```
 *
 * @example Invalidate by age
 * ```typescript
 * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
 * const result = await contextCacheInvalidate({
 *   olderThan: thirtyDaysAgo
 * })
 * // Invalidates all packs not hit in 30 days
 * ```
 */
export async function contextCacheInvalidate(
  input: Partial<ContextCacheInvalidateInput> = {},
): Promise<ContextCacheInvalidateResult> {
  try {
    // Validate input - fail fast if invalid (AC-5)
    const validated = ContextCacheInvalidateInputSchema.parse(input)

    // Build WHERE conditions dynamically
    const conditions: SQL<unknown>[] = []

    if (validated.packType) {
      conditions.push(eq(contextPacks.packType, validated.packType))
    }

    if (validated.packKey) {
      conditions.push(eq(contextPacks.packKey, validated.packKey))
    }

    if (validated.olderThan) {
      // Filter packs that were last hit before olderThan (NULL means never hit = skip)
      conditions.push(lt(contextPacks.lastHitAt, validated.olderThan))
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    let invalidatedCount = 0

    if (validated.hardDelete) {
      // Hard delete: physically remove rows
      const deletedRows = await db.delete(contextPacks).where(whereClause).returning()

      invalidatedCount = deletedRows.length
    } else {
      // Soft delete: update expiresAt to NOW() - 1 second (expired)
      const updatedRows = await db
        .update(contextPacks)
        .set({
          expiresAt: sql`NOW() - INTERVAL '1 second'`,
          updatedAt: sql`NOW()`,
        })
        .where(whereClause)
        .returning()

      invalidatedCount = updatedRows.length
    }

    return { invalidatedCount }
  } catch (error) {
    // Database errors or validation failures: log warning, return zero count
    logger.warn('[mcp-tools] Context cache invalidate failed', {
      error: error instanceof Error ? error.message : String(error),
      packType: input.packType,
      packKey: input.packKey,
      hardDelete: input.hardDelete,
    })
    return { invalidatedCount: 0 }
  }
}
