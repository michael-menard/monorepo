/**
 * Persist Learnings Node
 *
 * Persists learnings to Knowledge Base after story completion.
 * Mirrors Claude's kb-writer.agent.md behavior for consistency.
 *
 * Key behaviors:
 * - Extracts learnings from completed story workflow
 * - Deduplicates against existing KB entries (>0.85 similarity threshold)
 * - Writes to KB with appropriate tags
 * - Falls back gracefully if KB is unavailable
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/graph-state.js'

// ============================================================================
// KB Types (matching load-knowledge-context.ts)
// ============================================================================

type KbDeps = {
  db: unknown
  embeddingClient: unknown
}

type KbSearchInput = {
  query: string
  tags?: string[]
  role?: string
  limit?: number
}

type KbSearchResult = {
  results: Array<{
    id: string
    content: string
    role: string
    tags: string[] | null
    relevance_score?: number
  }>
  metadata: {
    total: number
    fallback_mode: boolean
  }
}

type KbAddInput = {
  content: string
  role: string
  tags?: string[]
}

type KbAddResult = {
  id: string
  success: boolean
  error?: string
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Learning category enum
 */
export const LearningCategorySchema = z.enum([
  'blocker', // Issue that blocked progress
  'pattern', // Reusable pattern discovered
  'time-sink', // Activity that consumed unexpected time
  'reuse', // Existing code/pattern that was useful
  'architecture', // Architectural decision or constraint
  'testing', // Testing-related insight
  'tooling', // Tooling or workflow insight
])

export type LearningCategory = z.infer<typeof LearningCategorySchema>

/**
 * Learning to persist
 */
export const LearningSchema = z.object({
  content: z.string().min(10), // Must have meaningful content
  category: LearningCategorySchema,
  storyId: z.string(),
  domain: z.string().optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
})

export type Learning = z.infer<typeof LearningSchema>

/**
 * Configuration for persist-learnings node
 */
export const PersistLearningsConfigSchema = z.object({
  /** KB dependencies for writing */
  kbDeps: z
    .object({
      db: z.unknown(),
      embeddingClient: z.unknown(),
      kbSearchFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
      kbAddFn: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
    })
    .optional(),
  /** Similarity threshold for deduplication */
  dedupeThreshold: z.number().min(0).max(1).default(0.85),
  /** Whether to skip persist on error */
  skipOnError: z.boolean().default(true),
})

export type PersistLearningsConfig = z.infer<typeof PersistLearningsConfigSchema>

/**
 * Result of persist-learnings operation
 */
export const PersistLearningsResultSchema = z.object({
  persisted: z.boolean(),
  learningsCount: z.number(),
  persistedCount: z.number(),
  skippedDuplicates: z.number(),
  errors: z.array(z.string()),
})

export type PersistLearningsResult = z.infer<typeof PersistLearningsResultSchema>

// ============================================================================
// Extended Graph State
// ============================================================================

export interface GraphStateWithLearnings extends GraphState {
  /** Learnings extracted from workflow */
  extractedLearnings?: Learning[]
  /** Result of persist operation */
  persistLearningsResult?: PersistLearningsResult
  /** Domain for tagging */
  storyDomain?: string
}

// ============================================================================
// Learning Extraction
// ============================================================================

/**
 * Extract learnings from workflow state.
 * This would typically analyze:
 * - Errors encountered during workflow
 * - Review findings
 * - QA issues
 * - Patterns observed
 */
export function extractLearnings(state: GraphStateWithLearnings): Learning[] {
  const learnings: Learning[] = []
  const storyId = state.storyId || 'unknown'
  const domain = state.storyDomain

  // Extract from errors
  if (state.errors && state.errors.length > 0) {
    for (const error of state.errors) {
      if (error.recoverable === false) {
        learnings.push({
          content: `Blocker encountered: ${error.message}`,
          category: 'blocker',
          storyId,
          domain,
          severity: 'high',
        })
      }
    }
  }

  // If learnings were pre-extracted by the workflow, use those
  if (state.extractedLearnings && state.extractedLearnings.length > 0) {
    learnings.push(...state.extractedLearnings)
  }

  return learnings
}

/**
 * Format learning content for KB storage
 */
export function formatLearningContent(learning: Learning): string {
  const header = `**[${learning.storyId}]** ${learning.category.toUpperCase()}`
  const severity = learning.severity ? ` (${learning.severity})` : ''

  return `${header}${severity}\n\n${learning.content}`
}

/**
 * Generate tags for a learning
 */
export function generateLearningTags(learning: Learning): string[] {
  const tags = [
    'lesson-learned',
    `story:${learning.storyId.toLowerCase()}`,
    `category:${learning.category}`,
    `date:${new Date().toISOString().slice(0, 7)}`, // YYYY-MM format
  ]

  if (learning.domain) {
    tags.push(`domain:${learning.domain.toLowerCase()}`)
  }

  if (learning.severity) {
    tags.push(`severity:${learning.severity}`)
  }

  return tags
}

// ============================================================================
// Main Implementation
// ============================================================================

/**
 * Persist learnings to Knowledge Base
 */
export async function persistLearnings(
  learnings: Learning[],
  kbSearchFn: (input: KbSearchInput, deps: KbDeps) => Promise<KbSearchResult>,
  kbAddFn: (input: KbAddInput, deps: KbDeps) => Promise<KbAddResult>,
  kbDeps: KbDeps,
  dedupeThreshold: number = 0.85,
): Promise<PersistLearningsResult> {
  const result: PersistLearningsResult = {
    persisted: false,
    learningsCount: learnings.length,
    persistedCount: 0,
    skippedDuplicates: 0,
    errors: [],
  }

  if (learnings.length === 0) {
    result.persisted = true
    return result
  }

  for (const learning of learnings) {
    try {
      const content = formatLearningContent(learning)

      // Check for duplicates
      const existing = await kbSearchFn(
        {
          query: content,
          tags: ['lesson-learned'],
          limit: 1,
        },
        kbDeps,
      )

      // Skip if similar entry exists
      if (
        existing.results.length > 0 &&
        existing.results[0].relevance_score !== undefined &&
        existing.results[0].relevance_score > dedupeThreshold
      ) {
        logger.debug('Skipping duplicate learning', {
          storyId: learning.storyId,
          category: learning.category,
          similarity: existing.results[0].relevance_score,
        })
        result.skippedDuplicates++
        continue
      }

      // Write to KB
      const tags = generateLearningTags(learning)
      const addResult = await kbAddFn(
        {
          content,
          role: 'lesson',
          tags,
        },
        kbDeps,
      )

      if (addResult.success) {
        result.persistedCount++
        logger.info('Persisted learning to KB', {
          storyId: learning.storyId,
          category: learning.category,
          kbId: addResult.id,
        })
      } else {
        result.errors.push(addResult.error || 'Unknown error adding to KB')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(`Failed to persist learning: ${errorMessage}`)
      logger.warn('Failed to persist learning', {
        storyId: learning.storyId,
        error: errorMessage,
      })
    }
  }

  result.persisted = result.persistedCount > 0 || result.skippedDuplicates > 0
  return result
}

// ============================================================================
// LangGraph Node
// ============================================================================

/**
 * LangGraph node for persisting learnings.
 * Without KB dependencies, this is a no-op.
 */
export const persistLearningsNode = createToolNode(
  'persist-learnings',
  async (state: GraphState): Promise<Partial<GraphStateWithLearnings>> => {
    logger.debug('persist-learnings node called without KB dependencies', {
      storyId: state.storyId,
    })

    return {
      persistLearningsResult: {
        persisted: false,
        learningsCount: 0,
        persistedCount: 0,
        skippedDuplicates: 0,
        errors: ['No KB dependencies configured'],
      },
    }
  },
)

/**
 * Factory for creating persist-learnings node with injected dependencies.
 */
export function createPersistLearningsNode(config: Partial<PersistLearningsConfig> = {}) {
  const fullConfig = PersistLearningsConfigSchema.parse(config)

  return createToolNode(
    'persist-learnings',
    async (state: GraphState): Promise<Partial<GraphStateWithLearnings>> => {
      const stateWithLearnings = state as GraphStateWithLearnings

      // Extract learnings from state
      const learnings = extractLearnings(stateWithLearnings)

      // If no KB dependencies or no learnings, return early
      if (!fullConfig.kbDeps?.kbAddFn || !fullConfig.kbDeps?.kbSearchFn || learnings.length === 0) {
        return {
          persistLearningsResult: {
            persisted: learnings.length === 0,
            learningsCount: learnings.length,
            persistedCount: 0,
            skippedDuplicates: 0,
            errors: learnings.length > 0 ? ['No KB dependencies configured'] : [],
          },
        }
      }

      try {
        const result = await persistLearnings(
          learnings,
          fullConfig.kbDeps.kbSearchFn as (
            input: KbSearchInput,
            deps: KbDeps,
          ) => Promise<KbSearchResult>,
          fullConfig.kbDeps.kbAddFn as (input: KbAddInput, deps: KbDeps) => Promise<KbAddResult>,
          {
            db: fullConfig.kbDeps.db,
            embeddingClient: fullConfig.kbDeps.embeddingClient,
          },
          fullConfig.dedupeThreshold,
        )

        return {
          persistLearningsResult: result,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        if (fullConfig.skipOnError) {
          logger.warn('persist-learnings failed, skipping', { error: errorMessage })
          return {
            persistLearningsResult: {
              persisted: false,
              learningsCount: learnings.length,
              persistedCount: 0,
              skippedDuplicates: 0,
              errors: [errorMessage],
            },
          }
        }

        throw error
      }
    },
  )
}
