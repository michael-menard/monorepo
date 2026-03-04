/**
 * Context Cache Get MCP Tool
 * WINT-0100 AC-1: Retrieve cached context pack by type and key
 *
 * Features:
 * - Filters out expired entries (expiresAt <= NOW())
 * - Atomically increments hitCount on successful retrieval
 * - Updates lastHitAt timestamp
 * - Returns null on miss or error
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, and, gt, or, isNull, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextPacks, type SelectContextPack } from '@repo/database-schema'
import { ContextCacheGetInputSchema, type ContextCacheGetInput } from './__types__/index.js'

/**
 * Retrieve cached context pack by type and key
 *
 * @param input - Pack type and key
 * @returns Pack object if found and not expired, null otherwise
 *
 * @example Retrieve codebase context
 * ```typescript
 * const pack = await contextCacheGet({
 *   packType: 'codebase',
 *   packKey: 'main'
 * })
 * if (pack) {
 *   console.log(`Cache hit! Content: ${pack.content}`)
 *   console.log(`Hit count: ${pack.hitCount}`)
 * }
 * ```
 *
 * @example Cache miss scenario
 * ```typescript
 * const pack = await contextCacheGet({
 *   packType: 'story',
 *   packKey: 'NONEXISTENT'
 * })
 * // pack === null (not found or expired)
 * ```
 */
export async function contextCacheGet(
  input: ContextCacheGetInput,
): Promise<SelectContextPack | null> {
  try {
    // Validate input - fail fast if invalid (AC-5)
    const validated = ContextCacheGetInputSchema.parse(input)

    // Query for pack with expiration filter
    const [pack] = await db
      .select()
      .from(contextPacks)
      .where(
        and(
          eq(contextPacks.packType, validated.packType),
          eq(contextPacks.packKey, validated.packKey),
          or(gt(contextPacks.expiresAt, sql`NOW()`), isNull(contextPacks.expiresAt))!, // Filter expired entries OR allow NULL (no expiration)
        ),
      )
      .limit(1)

    // Cache miss or expired
    if (!pack) {
      return null
    }

    // Cache hit: Atomically increment hitCount and update lastHitAt
    const [updatedPack] = await db
      .update(contextPacks)
      .set({
        hitCount: sql`${contextPacks.hitCount} + 1`, // Atomic increment
        lastHitAt: sql`NOW()`,
      })
      .where(eq(contextPacks.id, pack.id))
      .returning()

    return updatedPack as SelectContextPack
  } catch (error) {
    // Database errors or validation failures: log warning, return null
    logger.warn('[mcp-tools] Context cache get failed', {
      error: error instanceof Error ? error.message : String(error),
      packType: input.packType,
      packKey: input.packKey,
    })
    return null
  }
}
