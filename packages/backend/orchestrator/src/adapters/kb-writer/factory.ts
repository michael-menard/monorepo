/**
 * KB Writer Factory
 *
 * Creates KB Writer instances with dependency injection.
 * Returns real adapter when dependencies provided, no-op writer otherwise.
 *
 * Extracted from persist-learnings.ts createPersistLearningsNode().
 *
 * @see LNGG-0050 AC-3
 */

import { logger } from '@repo/logger'
import { KbWriterConfigSchema, type KbWriterConfig } from './__types__/index.js'
import { KbWriterAdapter } from './kb-writer-adapter.js'
import { NoOpKbWriter } from './no-op-writer.js'

/**
 * Create a KB Writer instance with dependency injection
 *
 * @param config - Configuration with optional KB dependencies
 * @returns KbWriterAdapter if dependencies provided, NoOpKbWriter otherwise
 *
 * @example
 * // With full dependencies
 * const writer = createKbWriter({
 *   kbDeps: {
 *     db,
 *     embeddingClient,
 *     kbSearchFn,
 *     kbAddFn,
 *   },
 *   dedupeThreshold: 0.85,
 * })
 *
 * @example
 * // Without dependencies (returns no-op writer)
 * const writer = createKbWriter({})
 */
export function createKbWriter(config: Partial<KbWriterConfig> = {}) {
  // Check if KB dependencies are provided before Zod validation
  if (
    !config.kbDeps ||
    !config.kbDeps.db ||
    !config.kbDeps.embeddingClient ||
    !config.kbDeps.kbSearchFn ||
    !config.kbDeps.kbAddFn
  ) {
    logger.info('Creating no-op KB writer - dependencies not configured')
    return new NoOpKbWriter()
  }

  // Validate config with Zod (only when we have dependencies)
  const validatedConfig = KbWriterConfigSchema.parse(config)

  // Validate KB dependencies are complete
  const { db, embeddingClient, kbSearchFn, kbAddFn } = validatedConfig.kbDeps!

  logger.info('Creating KB writer adapter with dependencies', {
    dedupeThreshold: validatedConfig.dedupeThreshold,
  })

  return new KbWriterAdapter(
    { db, embeddingClient },
    kbSearchFn as any, // Type assertion needed due to Zod function validation
    kbAddFn as any, // Type assertion needed due to Zod function validation
    validatedConfig.dedupeThreshold,
  )
}
