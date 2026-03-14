/**
 * Context Cache Put MCP Tool
 * WINT-0100 AC-2: Create or update context pack with content
 *
 * Features:
 * - Upsert pattern: INSERT on new, UPDATE on existing (packType, packKey)
 * - Calculates expiresAt = NOW() + ttl (default 7 days = 604800 seconds)
 * - Resets hitCount to 0 on creation, preserves on update
 * - Supports optional version field
 * - Zod validation at entry
 * - Resilient error handling
 */

import { sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextPacks, type SelectContextPack } from '@repo/knowledge-base/src/db'
import { ContextCachePutInputSchema, type ContextCachePutInput } from './__types__/index.js'

/**
 * Create or update context pack with content
 *
 * @param input - Pack type, key, content, TTL, and optional version
 * @returns Created or updated pack object, null on error
 *
 * @example Create new context pack
 * ```typescript
 * const pack = await contextCachePut({
 *   packType: 'codebase',
 *   packKey: 'main',
 *   content: {
 *     summary: 'Main codebase',
 *     files: [{ path: 'src/index.ts', relevance: 1.0 }]
 *   },
 *   ttl: 3600, // 1 hour
 *   version: 1
 * })
 * ```
 *
 * @example Update existing pack (upsert)
 * ```typescript
 * const updatedPack = await contextCachePut({
 *   packType: 'codebase',
 *   packKey: 'main',
 *   content: { summary: 'Updated content' },
 *   ttl: 7200, // 2 hours
 *   version: 2
 * })
 * // Same packType+packKey updates existing pack
 * ```
 *
 * @example Use default TTL (7 days)
 * ```typescript
 * const pack = await contextCachePut({
 *   packType: 'lessons_learned',
 *   packKey: 'wint-patterns',
 *   content: { lessons: ['Use Zod validation'] }
 *   // ttl defaults to 604800 seconds (7 days)
 * })
 * ```
 */
export async function contextCachePut(
  input: ContextCachePutInput,
): Promise<SelectContextPack | null> {
  try {
    // Validate input - fail fast if invalid (AC-5)
    const validated = ContextCachePutInputSchema.parse(input)

    // Calculate expiresAt = NOW() + ttl
    const expiresAt = sql`NOW() + INTERVAL '${sql.raw(validated.ttl.toString())} seconds'`

    // Upsert: INSERT if new, UPDATE if (packType, packKey) exists
    const [pack] = await db
      .insert(contextPacks)
      .values({
        packType: validated.packType,
        packKey: validated.packKey,
        content: validated.content,
        version: validated.version ?? 1,
        expiresAt,
        hitCount: 0, // Initialize to 0 on creation
      })
      .onConflictDoUpdate({
        // Composite unique constraint on (packType, packKey)
        target: [contextPacks.packType, contextPacks.packKey],
        set: {
          content: validated.content,
          version: validated.version ?? 1,
          expiresAt,
          updatedAt: sql`NOW()`,
        },
      })
      .returning()

    return pack as SelectContextPack
  } catch (error) {
    // Database errors or validation failures: log warning, return null
    logger.warn('[mcp-tools] Context cache put failed', {
      error: error instanceof Error ? error.message : String(error),
      packType: input.packType,
      packKey: input.packKey,
    })
    return null
  }
}
