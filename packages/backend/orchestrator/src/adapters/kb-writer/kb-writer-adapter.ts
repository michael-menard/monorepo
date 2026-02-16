/**
 * KB Writer Adapter Implementation
 *
 * Core adapter for writing to Knowledge Base with deduplication.
 * Extracted from persist-learnings.ts persistLearnings().
 *
 * ## Database Index Requirements
 *
 * For optimal performance, the following database indexes are required:
 *
 * 1. **Vector Index (IVFFlat or HNSW)**: Required for similarity search during deduplication
 *    - Column: `embedding` (vector field)
 *    - Type: IVFFlat (for smaller datasets) or HNSW (for larger datasets, better recall)
 *    - Purpose: Fast approximate nearest neighbor search for duplicate detection
 *
 * 2. **Tag Index**: Required for filtering by entry type and custom tags
 *    - Column: `tags` (array field)
 *    - Type: GIN index (Generalized Inverted Index for arrays)
 *    - Purpose: Fast tag-based filtering in deduplication queries
 *
 * 3. **Story ID Index**: Optional but recommended for filtering by story
 *    - Column: `story_id`
 *    - Type: B-tree index
 *    - Purpose: Fast lookup by story during deduplication
 *
 * @see LNGG-0050 AC-2, AC-5
 */

import { logger } from '@repo/logger'
import type {
  KbDeps,
  KbLessonRequest,
  KbDecisionRequest,
  KbConstraintRequest,
  KbRunbookRequest,
  KbNoteRequest,
  KbWriteRequest,
  KbWriteResult,
  KbBatchWriteResult,
} from './__types__/index.js'
import {
  formatLesson,
  formatDecision,
  formatConstraint,
  formatRunbook,
  formatNote,
} from './utils/content-formatter.js'
import { generateTags } from './utils/tag-generator.js'

// ============================================================================
// KB Function Types (matching persist-learnings.ts)
// ============================================================================

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
  entryType: string
  storyId?: string
  tags?: string[]
}

type KbAddResult = {
  id: string
  success: boolean
  error?: string
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class KbWriterAdapter {
  constructor(
    private readonly kbDeps: KbDeps,
    private readonly kbSearchFn: (input: KbSearchInput, deps: KbDeps) => Promise<KbSearchResult>,
    private readonly kbAddFn: (input: KbAddInput, deps: KbDeps) => Promise<KbAddResult>,
    private readonly dedupeThreshold: number = 0.85,
  ) {}

  /**
   * Add a lesson to the Knowledge Base
   */
  async addLesson(request: KbLessonRequest): Promise<KbWriteResult> {
    return this.writeEntry({
      entryType: 'lesson',
      content: formatLesson(request),
      storyId: request.storyId,
      role: request.role,
      tags: generateTags({
        entryType: 'lesson',
        storyId: request.storyId,
        domain: request.domain,
        severity: request.severity,
        customTags: request.tags,
      }),
    })
  }

  /**
   * Add a decision to the Knowledge Base
   */
  async addDecision(request: KbDecisionRequest): Promise<KbWriteResult> {
    return this.writeEntry({
      entryType: 'decision',
      content: formatDecision(request),
      storyId: request.storyId,
      role: request.role,
      tags: generateTags({
        entryType: 'decision',
        storyId: request.storyId,
        customTags: request.tags,
      }),
    })
  }

  /**
   * Add a constraint to the Knowledge Base
   */
  async addConstraint(request: KbConstraintRequest): Promise<KbWriteResult> {
    return this.writeEntry({
      entryType: 'constraint',
      content: formatConstraint(request),
      storyId: request.storyId,
      role: request.role,
      tags: generateTags({
        entryType: 'constraint',
        storyId: request.storyId,
        priority: request.priority,
        customTags: request.tags,
      }),
    })
  }

  /**
   * Add a runbook to the Knowledge Base
   */
  async addRunbook(request: KbRunbookRequest): Promise<KbWriteResult> {
    return this.writeEntry({
      entryType: 'runbook',
      content: formatRunbook(request),
      storyId: request.storyId,
      role: request.role,
      tags: generateTags({
        entryType: 'runbook',
        storyId: request.storyId,
        customTags: request.tags,
      }),
    })
  }

  /**
   * Add a note to the Knowledge Base
   */
  async addNote(request: KbNoteRequest): Promise<KbWriteResult> {
    return this.writeEntry({
      entryType: 'note',
      content: formatNote(request),
      storyId: request.storyId,
      role: request.role,
      tags: generateTags({
        entryType: 'note',
        storyId: request.storyId,
        customTags: request.tags,
      }),
    })
  }

  /**
   * Add multiple entries in batch (parallel processing)
   */
  async addMany(requests: KbWriteRequest[]): Promise<KbBatchWriteResult> {
    const errors: string[] = []

    // Process all requests in parallel
    const results = await Promise.all(
      requests.map(async request => {
        try {
          let result: KbWriteResult

          switch (request.entryType) {
            case 'lesson':
              result = await this.addLesson(request)
              break
            case 'decision':
              result = await this.addDecision(request)
              break
            case 'constraint':
              result = await this.addConstraint(request)
              break
            case 'runbook':
              result = await this.addRunbook(request)
              break
            case 'note':
              result = await this.addNote(request)
              break
          }

          return result
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          return {
            success: false as const,
            skipped: false as const,
            error: errorMessage,
          }
        }
      }),
    )

    // Aggregate results
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const result of results) {
      if (result.success) {
        successCount++
      } else if (result.skipped) {
        skippedCount++
      } else {
        errorCount++
        errors.push(result.error)
      }
    }

    return {
      totalRequests: requests.length,
      successCount,
      skippedCount,
      errorCount,
      results,
      errors,
    }
  }

  /**
   * Internal: Write entry with deduplication
   */
  private async writeEntry(input: {
    entryType: string
    content: string
    storyId?: string
    role: string
    tags: string[]
  }): Promise<KbWriteResult> {
    try {
      // Check for duplicates via similarity search
      logger.debug('Checking for duplicate KB entry', {
        entryType: input.entryType,
        storyId: input.storyId,
      })

      const existing = await this.kbSearchFn(
        {
          query: input.content,
          tags: [input.entryType],
          limit: 1,
        },
        this.kbDeps,
      )

      // Skip if similar entry exists
      if (
        existing.results.length > 0 &&
        existing.results[0].relevance_score !== undefined &&
        existing.results[0].relevance_score >= this.dedupeThreshold
      ) {
        const similarity = existing.results[0].relevance_score
        logger.warn('Skipping duplicate KB entry', {
          entryType: input.entryType,
          storyId: input.storyId,
          similarity,
          threshold: this.dedupeThreshold,
        })

        return {
          success: false,
          skipped: true,
          reason: `Duplicate detected (similarity: ${similarity.toFixed(3)})`,
          similarity,
        }
      }

      // Write to KB
      logger.debug('Writing to KB', {
        entryType: input.entryType,
        storyId: input.storyId,
      })

      const addResult = await this.kbAddFn(
        {
          content: input.content,
          role: input.role,
          entryType: input.entryType,
          storyId: input.storyId,
          tags: input.tags,
        },
        this.kbDeps,
      )

      if (addResult.success) {
        logger.info('Successfully wrote to KB', {
          entryType: input.entryType,
          storyId: input.storyId,
          kbId: addResult.id,
        })

        return {
          success: true,
          id: addResult.id,
          skipped: false,
        }
      } else {
        logger.error('Failed to write to KB', {
          entryType: input.entryType,
          storyId: input.storyId,
          error: addResult.error,
        })

        return {
          success: false,
          skipped: false,
          error: addResult.error || 'Unknown error adding to KB',
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Exception during KB write', {
        entryType: input.entryType,
        storyId: input.storyId,
        error: errorMessage,
      })

      return {
        success: false,
        skipped: false,
        error: `Failed to write to KB: ${errorMessage}`,
      }
    }
  }
}
