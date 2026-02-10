/**
 * kb_update - Update Knowledge Entry
 *
 * Updates an existing knowledge entry with conditional re-embedding.
 * If content is updated and differs from existing content, a new embedding is generated.
 *
 * @see KNOW-003 AC3 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { knowledgeEntries, type KnowledgeEntry } from '../db/schema.js'
import type { EmbeddingClient } from '../embedding-client/index.js'
import { computeContentHash } from '../embedding-client/cache-manager.js'
import { KbUpdateInputSchema, type KbUpdateInput } from './schemas.js'
import { NotFoundError } from './errors.js'

/**
 * Dependencies for kb_update operation.
 */
export interface KbUpdateDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
  /** Embedding client for vector generation */
  embeddingClient: EmbeddingClient
}

/**
 * Update an existing knowledge entry.
 *
 * Flow:
 * 1. Validate input with Zod schema (at least one field must be provided)
 * 2. Fetch existing entry (throw NotFoundError if missing)
 * 3. If content is updated:
 *    - Compare new content hash with existing content hash
 *    - If content changed: generate new embedding BEFORE database update
 *    - If content unchanged: skip re-embedding
 * 4. If only tags/role updated: no re-embedding
 * 5. Update entry with new fields + updatedAt timestamp
 * 6. createdAt remains unchanged
 * 7. Return updated KnowledgeEntry object
 *
 * @param input - Update data (id required, at least one of content/role/tags)
 * @param deps - Database and embedding client dependencies
 * @returns Updated knowledge entry
 *
 * @throws ZodError if validation fails
 * @throws NotFoundError if entry does not exist
 * @throws Error if embedding generation fails (after retries)
 * @throws Error if database update fails
 *
 * @example
 * ```typescript
 * // Update content (triggers re-embedding)
 * const entry = await kb_update(
 *   {
 *     id: '123e4567-e89b-12d3-a456-426614174000',
 *     content: 'Updated content'
 *   },
 *   { db, embeddingClient }
 * )
 *
 * // Update tags only (no re-embedding)
 * const entry = await kb_update(
 *   {
 *     id: '123e4567-e89b-12d3-a456-426614174000',
 *     tags: ['new-tag']
 *   },
 *   { db, embeddingClient }
 * )
 * ```
 */
export async function kb_update(input: KbUpdateInput, deps: KbUpdateDeps): Promise<KnowledgeEntry> {
  // Step 1: Validate input
  const validatedInput = KbUpdateInputSchema.parse(input)

  const { db, embeddingClient } = deps

  // Step 2: Fetch existing entry BEFORE any expensive operations
  const existingResult = await db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.id, validatedInput.id))
    .limit(1)

  const existing = existingResult[0]

  if (!existing) {
    logger.warn('Attempted to update non-existent knowledge entry', {
      id: validatedInput.id,
    })
    throw new NotFoundError('KnowledgeEntry', validatedInput.id)
  }

  // Step 3: Determine if re-embedding is needed
  let newEmbedding: number[] | undefined
  let reEmbedded = false

  if (validatedInput.content !== undefined) {
    const existingHash = computeContentHash(existing.content)
    const newHash = computeContentHash(validatedInput.content)

    if (existingHash !== newHash) {
      // Content changed - generate new embedding
      logger.debug('Content changed, generating new embedding', {
        id: validatedInput.id,
        existingHash: existingHash.substring(0, 16) + '...',
        newHash: newHash.substring(0, 16) + '...',
      })

      newEmbedding = await embeddingClient.generateEmbedding(validatedInput.content)
      reEmbedded = true
    } else {
      logger.debug('Content unchanged, skipping re-embedding', {
        id: validatedInput.id,
      })
    }
  }

  // Step 4: Build update object
  const updateData: Partial<{
    content: string
    embedding: number[]
    role: string
    tags: string[] | null
    updatedAt: Date
    archived: boolean
    archivedAt: Date | null
    canonicalId: string | null
    isCanonical: boolean
  }> = {
    updatedAt: new Date(),
  }

  if (validatedInput.content !== undefined) {
    updateData.content = validatedInput.content
  }

  if (newEmbedding !== undefined) {
    updateData.embedding = newEmbedding
  }

  if (validatedInput.role !== undefined) {
    updateData.role = validatedInput.role
  }

  // Handle tags: null explicitly sets to null, undefined means no change
  if (validatedInput.tags !== undefined) {
    updateData.tags = validatedInput.tags
  }

  // Handle archival fields (WKFL-009)
  if (validatedInput.archived !== undefined) {
    updateData.archived = validatedInput.archived
  }

  if (validatedInput.archived_at !== undefined) {
    updateData.archivedAt = validatedInput.archived_at
  }

  if (validatedInput.canonical_id !== undefined) {
    updateData.canonicalId = validatedInput.canonical_id
  }

  if (validatedInput.is_canonical !== undefined) {
    updateData.isCanonical = validatedInput.is_canonical
  }

  // Step 5: Update entry
  const result = await db
    .update(knowledgeEntries)
    .set(updateData)
    .where(eq(knowledgeEntries.id, validatedInput.id))
    .returning()

  const updated = result[0]

  // Step 6: Log update
  logger.info('Knowledge entry updated', {
    id: validatedInput.id,
    reEmbedded,
    fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
  })

  return updated
}
