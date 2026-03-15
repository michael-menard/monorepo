/**
 * Context Cache Stats MCP Tool
 * WINT-0100 AC-4: Query cache effectiveness metrics
 *
 * Features:
 * - Aggregate statistics: totalPacks, hitCount, avgHitsPerPack, expiredCount
 * - Filters active packs only (expiresAt > NOW()) for totalPacks
 * - Optional filters by packType and since date
 * - Returns all zeros for empty database (no error)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, gte, sql, and, type SQL } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/db'
import {
  ContextCacheStatsInputSchema,
  type ContextCacheStatsInput,
  type ContextCacheStatsResult,
} from './__types__/index.js'

/**
 * Query aggregate cache effectiveness metrics
 *
 * @param input - Optional filters (packType, since date)
 * @returns Object with totalPacks, hitCount, avgHitsPerPack, expiredCount
 *
 * @example Get overall stats
 * ```typescript
 * const stats = await contextCacheStats({})
 * console.log(`Total active packs: ${stats.totalPacks}`)
 * console.log(`Total hits: ${stats.hitCount}`)
 * console.log(`Average hits per pack: ${stats.avgHitsPerPack}`)
 * console.log(`Expired packs: ${stats.expiredCount}`)
 * ```
 *
 * @example Filter by pack type
 * ```typescript
 * const storyStats = await contextCacheStats({
 *   packType: 'story'
 * })
 * // Returns stats for story packs only
 * ```
 *
 * @example Filter by time range
 * ```typescript
 * const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
 * const recentStats = await contextCacheStats({
 *   since: lastWeek
 * })
 * // Returns stats for packs hit in last 7 days
 * ```
 */
export async function contextCacheStats(
  input: ContextCacheStatsInput = {},
): Promise<ContextCacheStatsResult> {
  try {
    // Validate input - fail fast if invalid (AC-5)
    const validated = ContextCacheStatsInputSchema.parse(input)

    // Build WHERE conditions for filtering
    const conditions: SQL<unknown>[] = []

    if (validated.packType) {
      conditions.push(eq(contextPacks.packType, validated.packType))
    }

    if (validated.since) {
      conditions.push(gte(contextPacks.lastHitAt, validated.since))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Query aggregate statistics using PostgreSQL FILTER syntax
    const [stats] = await db
      .select({
        totalPacks: sql<number>`COUNT(*) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL)::int`,
        hitCount: sql<number>`COALESCE(SUM(hit_count) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL), 0)::int`,
        avgHitsPerPack: sql<number>`COALESCE(AVG(hit_count) FILTER (WHERE expires_at > NOW() OR expires_at IS NULL), 0)::float`,
        expiredCount: sql<number>`COUNT(*) FILTER (WHERE expires_at <= NOW())::int`,
      })
      .from(contextPacks)
      .where(whereClause)

    return {
      totalPacks: stats.totalPacks ?? 0,
      hitCount: stats.hitCount ?? 0,
      avgHitsPerPack: stats.avgHitsPerPack ?? 0,
      expiredCount: stats.expiredCount ?? 0,
    }
  } catch (error) {
    // Database errors or validation failures: log warning, return zeros
    logger.warn('[mcp-tools] Context cache stats failed', {
      error: error instanceof Error ? error.message : String(error),
      packType: input.packType,
      since: input.since,
    })
    return {
      totalPacks: 0,
      hitCount: 0,
      avgHitsPerPack: 0,
      expiredCount: 0,
    }
  }
}
