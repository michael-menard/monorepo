/**
 * kb_list - List Knowledge Entries
 *
 * Lists knowledge entries with optional filtering by role and tags.
 * Supports pagination via limit parameter.
 *
 * @see KNOW-003 AC5 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { desc, eq, sql, and, type SQL } from 'drizzle-orm'
import { knowledgeEntries, type KnowledgeEntry } from '../db/schema.js'
import { KbListInputSchema, type KbListInput } from './schemas.js'

/**
 * Dependencies for kb_list operation.
 */
export interface KbListDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Default limit if not specified.
 */
const DEFAULT_LIMIT = 10

/**
 * Maximum allowed limit.
 */
const MAX_LIMIT = 100

/**
 * List knowledge entries with optional filters.
 *
 * Flow:
 * 1. Validate input (or use defaults)
 * 2. Build query with filters:
 *    - role filter: entries with matching role
 *    - tags filter: entries with at least one matching tag (ANY match / OR logic)
 * 3. Order by createdAt DESC (newest first)
 * 4. Limit to min(input.limit, 100)
 * 5. Return array of entries
 * 6. Return empty array if no matches (not an error)
 *
 * Filter Behavior:
 * - No filters: returns all entries (up to limit)
 * - role filter: only entries with matching role
 * - tags filter: entries with at least one matching tag (OR logic)
 * - Both filters: entries matching role AND having at least one matching tag
 *
 * Tag Filtering Semantics:
 * - Uses PostgreSQL array overlap operator: tags && ARRAY['tag1', 'tag2']
 * - Entry with tags=['a', 'b'] matches filter tags=['b', 'c'] (because 'b' matches)
 *
 * @param input - Optional filter and pagination parameters
 * @param deps - Database dependency
 * @returns Array of knowledge entries (may be empty)
 *
 * @throws ZodError if validation fails
 * @throws Error if database query fails
 *
 * @example
 * ```typescript
 * // List all entries (default limit 10)
 * const entries = await kb_list(undefined, { db })
 *
 * // List with filters
 * const entries = await kb_list(
 *   {
 *     role: 'dev',
 *     tags: ['typescript', 'best-practice'],
 *     limit: 20
 *   },
 *   { db }
 * )
 * ```
 */
export async function kb_list(input?: KbListInput, deps?: KbListDeps): Promise<KnowledgeEntry[]> {
  // Handle undefined deps (required for proper typing)
  if (!deps) {
    throw new Error('Database dependency is required')
  }

  // Step 1: Validate input (or use defaults)
  const validatedInput = KbListInputSchema.parse(input)
  const { role, tags, limit = DEFAULT_LIMIT } = validatedInput ?? {}

  const { db } = deps

  // Enforce maximum limit
  const effectiveLimit = Math.min(limit, MAX_LIMIT)

  // Step 2: Build filter conditions
  const conditions: SQL<unknown>[] = []

  if (role !== undefined) {
    conditions.push(eq(knowledgeEntries.role, role))
  }

  if (tags !== undefined && tags.length > 0) {
    // PostgreSQL array overlap operator: tags && ARRAY['tag1', 'tag2']
    // Returns true if there's any overlap between arrays
    conditions.push(
      sql`${knowledgeEntries.tags} && ARRAY[${sql.join(
        tags.map(tag => sql`${tag}`),
        sql`, `,
      )}]::text[]`,
    )
  }

  // Step 3: Execute query
  let query = db.select().from(knowledgeEntries)

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query
  }

  const result = await query.orderBy(desc(knowledgeEntries.createdAt)).limit(effectiveLimit)

  // Step 4: Log query at debug level
  logger.debug('Knowledge entries listed', {
    role: role ?? 'any',
    tags: tags ?? 'any',
    requestedLimit: limit,
    effectiveLimit,
    count: result.length,
  })

  return result
}
