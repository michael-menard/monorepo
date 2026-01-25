/**
 * kb_add - Add Knowledge Entry
 *
 * Creates a new knowledge entry with automatic embedding generation.
 * Embedding is generated BEFORE database insert to ensure atomicity.
 *
 * @see KNOW-003 AC1 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { knowledgeEntries } from '../db/schema.js'
import type { EmbeddingClient } from '../embedding-client/index.js'
import { KbAddInputSchema, type KbAddInput } from './schemas.js'

/**
 * Dependencies for kb_add operation.
 */
export interface KbAddDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
  /** Embedding client for vector generation */
  embeddingClient: EmbeddingClient
}

/**
 * Add a new knowledge entry.
 *
 * Flow:
 * 1. Validate input with Zod schema
 * 2. Generate embedding via EmbeddingClient (BEFORE database operation)
 * 3. If embedding generation fails, no database write occurs
 * 4. Insert entry into knowledge_entries table
 * 5. Return UUID of created entry
 *
 * Deduplication Behavior:
 * - Multiple calls with identical content create separate entries (different IDs)
 * - Embedding is generated once and cached by content hash
 * - Subsequent adds with same content reuse cached embedding (cache hit)
 *
 * @param input - Knowledge entry data (content, role, tags)
 * @param deps - Database and embedding client dependencies
 * @returns UUID string of created entry
 *
 * @throws ZodError if validation fails
 * @throws Error if embedding generation fails (after retries)
 * @throws Error if database insert fails
 *
 * @example
 * ```typescript
 * const id = await kb_add(
 *   {
 *     content: 'Use Zod for validation',
 *     role: 'dev',
 *     tags: ['typescript', 'best-practice']
 *   },
 *   { db, embeddingClient }
 * )
 * ```
 */
export async function kb_add(input: KbAddInput, deps: KbAddDeps): Promise<string> {
  // Step 1: Validate input
  const validatedInput = KbAddInputSchema.parse(input)

  const { db, embeddingClient } = deps

  // Step 2: Generate embedding BEFORE database operation
  // If this fails, no database write occurs (atomicity)
  logger.debug('Generating embedding for new knowledge entry', {
    contentLength: validatedInput.content.length,
    role: validatedInput.role,
  })

  const embedding = await embeddingClient.generateEmbedding(validatedInput.content)

  // Step 3: Insert into database
  const now = new Date()

  const result = await db
    .insert(knowledgeEntries)
    .values({
      content: validatedInput.content,
      embedding,
      role: validatedInput.role,
      tags: validatedInput.tags ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: knowledgeEntries.id })

  const id = result[0].id

  // Step 4: Log success
  logger.info('Knowledge entry created', {
    id,
    role: validatedInput.role,
    tags: validatedInput.tags,
    contentLength: validatedInput.content.length,
  })

  return id
}
