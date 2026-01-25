/**
 * kb_get - Retrieve Knowledge Entry
 *
 * Retrieves a knowledge entry by ID, including the embedding vector.
 * Returns null if entry does not exist (NOT an error).
 *
 * @see KNOW-003 AC2 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { knowledgeEntries, type KnowledgeEntry } from '../db/schema.js'
import { KbGetInputSchema, type KbGetInput } from './schemas.js'

/**
 * Dependencies for kb_get operation.
 */
export interface KbGetDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Retrieve a knowledge entry by ID.
 *
 * Flow:
 * 1. Validate ID is valid UUID format
 * 2. Query knowledge_entries table by ID
 * 3. Return full entry object including embedding vector
 * 4. Return null if entry does not exist (NOT an error)
 *
 * @param input - Object containing the ID to retrieve
 * @param deps - Database dependency
 * @returns Full knowledge entry object or null if not found
 *
 * @throws ZodError if ID is not a valid UUID format
 * @throws Error if database query fails
 *
 * @example
 * ```typescript
 * const entry = await kb_get(
 *   { id: '123e4567-e89b-12d3-a456-426614174000' },
 *   { db }
 * )
 *
 * if (entry) {
 *   console.log(entry.content)
 * } else {
 *   console.log('Entry not found')
 * }
 * ```
 */
export async function kb_get(input: KbGetInput, deps: KbGetDeps): Promise<KnowledgeEntry | null> {
  // Step 1: Validate input
  const validatedInput = KbGetInputSchema.parse(input)

  const { db } = deps

  // Step 2: Query database
  const result = await db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.id, validatedInput.id))
    .limit(1)

  const entry = result[0] ?? null

  // Step 3: Log query at debug level
  logger.debug('Knowledge entry query', {
    id: validatedInput.id,
    found: entry !== null,
  })

  return entry
}
