/**
 * kb_delete - Delete Knowledge Entry
 *
 * Deletes a knowledge entry by ID. This operation is idempotent:
 * deleting a non-existent entry succeeds without error.
 *
 * @see KNOW-003 AC4 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { knowledgeEntries } from '../db/schema.js'
import { KbDeleteInputSchema, type KbDeleteInput } from './schemas.js'

/**
 * Dependencies for kb_delete operation.
 */
export interface KbDeleteDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Delete a knowledge entry by ID.
 *
 * Flow:
 * 1. Validate ID is valid UUID format
 * 2. Delete entry from knowledge_entries table
 * 3. Does NOT delete cached embeddings (acceptable cache orphaning)
 * 4. Is idempotent (deleting non-existent entry succeeds without error)
 * 5. Returns void
 *
 * Idempotency:
 * - Deleting a non-existent entry is a successful no-op
 * - Goal is "ensure entry doesn't exist" not "prove it existed before deletion"
 *
 * @param input - Object containing the ID to delete
 * @param deps - Database dependency
 * @returns void
 *
 * @throws ZodError if ID is not a valid UUID format
 * @throws Error if database delete fails
 *
 * @example
 * ```typescript
 * // Delete an entry
 * await kb_delete(
 *   { id: '123e4567-e89b-12d3-a456-426614174000' },
 *   { db }
 * )
 *
 * // Delete again - still succeeds (idempotent)
 * await kb_delete(
 *   { id: '123e4567-e89b-12d3-a456-426614174000' },
 *   { db }
 * )
 * ```
 */
export async function kb_delete(input: KbDeleteInput, deps: KbDeleteDeps): Promise<void> {
  // Step 1: Validate input
  const validatedInput = KbDeleteInputSchema.parse(input)

  const { db } = deps

  // Step 2: Delete entry (no-op if doesn't exist)
  const result = await db
    .delete(knowledgeEntries)
    .where(eq(knowledgeEntries.id, validatedInput.id))
    .returning({ id: knowledgeEntries.id })

  const deleted = result.length > 0

  // Step 3: Log deletion
  logger.info('Knowledge entry deleted', {
    id: validatedInput.id,
    existed: deleted,
  })
}
