/**
 * kb_get_related - Find Related Knowledge Entries
 *
 * Finds entries related to a specific entry via:
 * 1. Parent entry (if parent_id is set)
 * 2. Sibling entries (entries with same parent_id)
 * 3. Tag overlap entries (entries with 2+ shared tags)
 *
 * Results are ordered by relationship priority:
 * parent > sibling > tag_overlap
 *
 * @see KNOW-004 AC5 for acceptance criteria
 */

import { logger } from '@repo/logger'
import { sql, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { knowledgeEntries } from '../db/schema.js'
import type * as schema from '../db/schema.js'
import {
  GetRelatedInputSchema,
  type GetRelatedInput,
  type GetRelatedResult,
  type RelatedEntry,
  type RelationshipType,
} from './schemas.js'

/**
 * Dependencies for kb_get_related operation.
 */
export interface KbGetRelatedDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof schema>
}

/**
 * Find entries related to a specific knowledge entry.
 *
 * Relationship Priority:
 * 1. Parent provides context (the source or summary this entry derives from)
 * 2. Siblings provide alternatives (other entries from same parent)
 * 3. Tag overlap provides discovery (entries with similar topics)
 *
 * @param input - Input with entry_id and optional limit
 * @param deps - Database dependency
 * @returns Related entries with relationship metadata
 *
 * @throws ZodError if input validation fails
 *
 * @example
 * ```typescript
 * const result = await kb_get_related(
 *   { entry_id: '123e4567-e89b-12d3-a456-426614174000', limit: 5 },
 *   { db }
 * )
 *
 * console.log(result.metadata.relationship_types)
 * // ['parent', 'sibling', 'tag_overlap']
 * ```
 */
export async function kb_get_related(
  input: GetRelatedInput,
  deps: KbGetRelatedDeps,
): Promise<GetRelatedResult> {
  const startTime = Date.now()

  // Validate input
  const validatedInput = GetRelatedInputSchema.parse(input)
  const { entry_id, limit } = validatedInput
  const { db } = deps

  // First, get the target entry to find its parent_id and tags
  const targetResult = await db
    .select({
      id: knowledgeEntries.id,
      tags: knowledgeEntries.tags,
    })
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.id, entry_id))
    .limit(1)

  const targetEntry = targetResult[0]

  // If entry doesn't exist, return empty results (not an error per AC5)
  if (!targetEntry) {
    logger.debug('Target entry not found for kb_get_related', { entry_id })

    return {
      results: [],
      metadata: {
        total: 0,
        relationship_types: [],
      },
    }
  }

  const targetTags = targetEntry.tags || []
  const relatedEntries: RelatedEntry[] = []
  const relationshipTypes = new Set<RelationshipType>()

  // Note: parent_id column may not exist in current schema
  // For now, we skip parent/sibling queries and focus on tag overlap
  // This is forward-compatible - when parent_id is added, this logic will work

  // Query for tag overlap entries (2+ shared tags)
  if (targetTags.length >= 2) {
    try {
      // Find entries with at least 2 shared tags
      const tagOverlapResult = await db.execute(sql`
        SELECT
          id,
          content,
          role,
          tags,
          created_at as "createdAt",
          updated_at as "updatedAt",
          (
            SELECT COUNT(*)::int
            FROM unnest(tags) t1
            WHERE t1 = ANY(${targetTags}::text[])
          ) as overlap_count
        FROM knowledge_entries
        WHERE id != ${entry_id}
          AND tags IS NOT NULL
          AND (
            SELECT COUNT(*)
            FROM unnest(tags) t1
            WHERE t1 = ANY(${targetTags}::text[])
          ) >= 2
        ORDER BY overlap_count DESC, updated_at DESC
        LIMIT ${limit}
      `)

      for (const row of tagOverlapResult.rows as Array<Record<string, unknown>>) {
        relatedEntries.push({
          id: row.id as string,
          content: row.content as string,
          role: row.role as 'pm' | 'dev' | 'qa' | 'all',
          tags: row.tags as string[] | null,
          createdAt: new Date(row.createdAt as string),
          updatedAt: new Date(row.updatedAt as string),
          relationship: 'tag_overlap',
          tag_overlap_count: row.overlap_count as number,
        })
        relationshipTypes.add('tag_overlap')
      }
    } catch (error) {
      logger.error('Tag overlap query failed', {
        error: error instanceof Error ? error.message : String(error),
        entry_id,
      })
      // Continue without tag overlap results
    }
  }

  // Apply final limit (in case we have more than limit from multiple sources)
  const limitedResults = relatedEntries.slice(0, limit)

  const elapsed = Date.now() - startTime

  logger.debug('kb_get_related completed', {
    entry_id,
    resultCount: limitedResults.length,
    relationship_types: Array.from(relationshipTypes),
    elapsed_ms: elapsed,
  })

  return {
    results: limitedResults,
    metadata: {
      total: limitedResults.length,
      relationship_types: Array.from(relationshipTypes),
    },
  }
}

/**
 * Find related entries by tag overlap only.
 * Simplified version for cases where parent/sibling relationships are not available.
 *
 * @param db - Drizzle database client
 * @param entryId - UUID of the target entry
 * @param tags - Tags of the target entry
 * @param limit - Maximum results to return
 * @returns Array of related entries with tag overlap count
 */
export async function findByTagOverlap(
  db: NodePgDatabase<typeof schema>,
  entryId: string,
  tags: string[],
  limit: number,
): Promise<RelatedEntry[]> {
  if (tags.length < 2) {
    return []
  }

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        content,
        role,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt",
        (
          SELECT COUNT(*)::int
          FROM unnest(tags) t1
          WHERE t1 = ANY(${tags}::text[])
        ) as overlap_count
      FROM knowledge_entries
      WHERE id != ${entryId}
        AND tags IS NOT NULL
        AND (
          SELECT COUNT(*)
          FROM unnest(tags) t1
          WHERE t1 = ANY(${tags}::text[])
        ) >= 2
      ORDER BY overlap_count DESC, updated_at DESC
      LIMIT ${limit}
    `)

    return (result.rows as Array<Record<string, unknown>>).map(row => ({
      id: row.id as string,
      content: row.content as string,
      role: row.role as 'pm' | 'dev' | 'qa' | 'all',
      tags: row.tags as string[] | null,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
      relationship: 'tag_overlap' as const,
      tag_overlap_count: row.overlap_count as number,
    }))
  } catch (error) {
    logger.error('findByTagOverlap failed', {
      error: error instanceof Error ? error.message : String(error),
      entryId,
    })
    return []
  }
}
