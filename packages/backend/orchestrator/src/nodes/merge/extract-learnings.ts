/**
 * Extract Learnings Node
 *
 * Converts QA lessons to Learning[] and persists to KB:
 * 1. Map qaVerify.lessons_to_record to Learning[] with category translation
 * 2. Append operational learning (merge verdict + CI duration)
 * 3. Call persistLearnings() directly (NOT createPersistLearningsNode per AC-19)
 *
 * Runs on ALL terminal paths including MERGE_BLOCKED and MERGE_FAIL.
 * Respects kbWriteBackEnabled flag.
 *
 * Category mapping:
 * - time_sink → time-sink
 * - anti_pattern → pattern
 * - blocker → blocker
 * - pattern → pattern
 * - reuse → reuse
 *
 * AC-9, AC-19, AC-17
 */

import { logger } from '@repo/logger'
import {
  persistLearnings,
  type Learning,
  type LearningCategory,
} from '../completion/persist-learnings.js'
import type { MergeGraphState, MergeGraphConfig } from '../../graphs/merge.js'

// ============================================================================
// Category Mapping (AC-9)
// ============================================================================

type QaCategory = 'blocker' | 'pattern' | 'time_sink' | 'reuse' | 'anti_pattern'

function mapQaCategoryToLearning(qaCategory: QaCategory): LearningCategory {
  switch (qaCategory) {
    case 'time_sink':
      return 'time-sink'
    case 'anti_pattern':
      return 'pattern'
    case 'blocker':
      return 'blocker'
    case 'pattern':
      return 'pattern'
    case 'reuse':
      return 'reuse'
    default:
      return 'pattern'
  }
}

// ============================================================================
// KB Deps Type
// ============================================================================

export type KbDeps = {
  db: unknown
  embeddingClient: unknown
  kbSearchFn: (...args: unknown[]) => Promise<unknown>
  kbAddFn: (...args: unknown[]) => Promise<unknown>
}

// ============================================================================
// Node Factory (AC-9, AC-19)
// ============================================================================

/**
 * Creates the extract-learnings node function.
 *
 * Uses persistLearnings() directly (not createPersistLearningsNode) per AC-19.
 */
export function createExtractLearningsNode(
  config: MergeGraphConfig,
  opts: {
    kbDeps?: KbDeps
  } = {},
): (state: MergeGraphState) => Promise<Partial<MergeGraphState>> {
  return async (state: MergeGraphState): Promise<Partial<MergeGraphState>> => {
    const startTime = Date.now()
    const { storyId, qaVerify, mergeVerdict, ciPollCount, ciStartTime } = state

    // Calculate CI duration
    const ciDurationMs = ciStartTime ? Date.now() - ciStartTime : 0

    // ---- Build Learning[] from QA lessons (AC-9a) ----
    const learnings: Learning[] = []

    if (qaVerify?.lessons_to_record) {
      for (const lesson of qaVerify.lessons_to_record) {
        learnings.push({
          content: lesson.lesson,
          category: mapQaCategoryToLearning(lesson.category as QaCategory),
          storyId,
        })
      }
    }

    // ---- Append operational learning (AC-9b) ----
    const operationalContent = `Merge ${mergeVerdict ?? 'UNKNOWN'} for ${storyId}: CI took ${ciDurationMs}ms, ${ciPollCount} polls`
    learnings.push({
      content: operationalContent,
      category: 'pattern',
      storyId,
    })

    logger.info('merge_learnings_extracted', {
      storyId,
      stage: 'merge',
      durationMs: Date.now() - startTime,
      learningsCount: learnings.length,
      kbWriteBackEnabled: config.kbWriteBackEnabled,
      mergeVerdict,
    })

    // ---- Persist to KB if enabled (AC-9c) ----
    if (!config.kbWriteBackEnabled || !opts.kbDeps) {
      return {
        learningsPersisted: false,
        warnings: config.kbWriteBackEnabled
          ? ['KB write-back enabled but no kbDeps provided — skipping']
          : [],
      }
    }

    try {
      const result = await persistLearnings(
        learnings,
        opts.kbDeps.kbSearchFn as Parameters<typeof persistLearnings>[1],
        opts.kbDeps.kbAddFn as Parameters<typeof persistLearnings>[2],
        {
          db: opts.kbDeps.db,
          embeddingClient: opts.kbDeps.embeddingClient,
        },
      )

      return {
        learningsPersisted: result.persistedCount > 0 || result.skippedDuplicates > 0,
      }
    } catch (error) {
      const warning = `Failed to persist learnings: ${error instanceof Error ? error.message : String(error)}`
      logger.warn('merge_learnings_extracted', {
        storyId,
        stage: 'merge',
        durationMs: Date.now() - startTime,
        warning,
      })
      return {
        learningsPersisted: false,
        warnings: [warning],
      }
    }
  }
}
