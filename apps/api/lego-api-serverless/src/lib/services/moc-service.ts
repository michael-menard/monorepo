/**
 * MOC Service Layer
 *
 * Business logic for MOC Instructions operations.
 * Handles database queries, caching, and search integration.
 */

import { db } from '@/lib/db/client';
import { mocInstructions } from '@/db/schema';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { getRedisClient } from '@/lib/services/redis';
import { searchMocs as searchMocsOpenSearch } from '@/lib/services/opensearch-moc';
import type { MocInstruction, MocListQuery } from '@/types/moc';
import { DatabaseError } from '@/lib/errors';

/**
 * List MOCs for a user with pagination, search, and filtering
 *
 * Features:
 * - Pagination (page/limit)
 * - Full-text search (OpenSearch with PostgreSQL fallback)
 * - Tag filtering
 * - Redis caching (5 minute TTL)
 * - Cache invalidation on mutations
 */
export async function listMocs(
  userId: string,
  query: MocListQuery
): Promise<{ mocs: MocInstruction[]; total: number }> {
  const { page, limit, search, tag } = query;
  const offset = (page - 1) * limit;

  // Generate cache key
  const cacheKey = `moc:user:${userId}:list:${page}:${limit}:${search || ''}:${tag || ''}`;

  try {
    // Check Redis cache first
    const cached = await getCachedMocList(cacheKey);
    if (cached) {
      console.log('MOC list cache hit', { userId, cacheKey });
      return cached;
    }

    // If search query provided, try OpenSearch first
    if (search && search.trim()) {
      try {
        const searchResults = await searchMocsOpenSearch(userId, search, offset, limit, tag);

        // Cache the results
        await cacheMocList(cacheKey, searchResults);

        return searchResults;
      } catch (error) {
        console.warn('OpenSearch query failed, falling back to PostgreSQL', error);
        // Fall through to PostgreSQL search below
      }
    }

    // Build PostgreSQL query
    let whereConditions = [eq(mocInstructions.userId, userId)];

    // Add tag filter if provided
    if (tag && tag.trim()) {
      whereConditions.push(
        sql`${mocInstructions.tags} @> ${JSON.stringify([tag])}`
      );
    }

    // Add search filter if provided (PostgreSQL ILIKE fallback)
    if (search && search.trim()) {
      const searchPattern = `%${search}%`;
      whereConditions.push(
        or(
          ilike(mocInstructions.title, searchPattern),
          ilike(mocInstructions.description, searchPattern)
        )!
      );
    }

    // Execute query with pagination
    const [mocsRaw, countResult] = await Promise.all([
      db
        .select()
        .from(mocInstructions)
        .where(and(...whereConditions))
        .orderBy(desc(mocInstructions.updatedAt))
        .limit(limit)
        .offset(offset),

      // Get total count for pagination
      db
        .select({ count: sql<number>`count(*)` })
        .from(mocInstructions)
        .where(and(...whereConditions)),
    ]);

    // Cast database results to MocInstruction type
    // Database returns 'type' as string, but our type expects "moc" | "set"
    const mocs = mocsRaw as unknown as MocInstruction[];

    const total = Number(countResult[0]?.count || 0);

    const result = { mocs, total };

    // Cache the results (5 minute TTL)
    await cacheMocList(cacheKey, result);

    console.log('MOC list query completed', {
      userId,
      mocsReturned: mocs.length,
      total,
      page,
      limit,
    });

    return result;
  } catch (error) {
    console.error('Error listing MOCs:', error);
    throw new DatabaseError('Failed to retrieve MOC list', {
      userId,
      query,
      error: (error as Error).message,
    });
  }
}

/**
 * Get cached MOC list from Redis
 */
async function getCachedMocList(
  cacheKey: string
): Promise<{ mocs: MocInstruction[]; total: number } | null> {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(cacheKey);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached);
  } catch (error) {
    console.warn('Redis cache read failed:', error);
    return null;
  }
}

/**
 * Cache MOC list in Redis with 5 minute TTL
 */
async function cacheMocList(
  cacheKey: string,
  data: { mocs: MocInstruction[]; total: number }
): Promise<void> {
  try {
    const redis = await getRedisClient();
    const TTL = 300; // 5 minutes

    await redis.setEx(cacheKey, TTL, JSON.stringify(data));
  } catch (error) {
    console.warn('Redis cache write failed:', error);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Invalidate all MOC list caches for a user
 * Called after create/update/delete operations
 */
export async function invalidateMocListCache(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient();

    // Find all keys matching the pattern
    const pattern = `moc:user:${userId}:list:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      console.log('Invalidated MOC list cache', { userId, keysDeleted: keys.length });
    }
  } catch (error) {
    console.warn('Failed to invalidate MOC list cache:', error);
    // Don't throw - cache invalidation failure shouldn't break the request
  }
}
