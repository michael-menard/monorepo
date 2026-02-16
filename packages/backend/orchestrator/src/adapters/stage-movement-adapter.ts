/**
 * Stage Movement Adapter
 *
 * Type-safe adapter for moving stories between lifecycle stages.
 * Updates story status in YAML frontmatter (flat directory structure).
 *
 * Features:
 * - Stage transition validation using DAG
 * - Auto-locate stories without fromStage
 * - Batch operations with parallel processing
 * - Idempotent moves (already at target = success)
 * - Structured logging with @repo/logger
 * - Atomic file operations via StoryFileAdapter
 *
 * @example
 * ```typescript
 * const adapter = new StageMovementAdapter()
 *
 * // Move single story
 * const result = await adapter.moveStage({
 *   storyId: 'LNGG-0040',
 *   featureDir: 'plans/future/platform',
 *   toStage: 'in-progress'
 * })
 *
 * // Batch move
 * const batchResult = await adapter.batchMoveStage({
 *   stories: [
 *     { storyId: 'LNGG-0040', featureDir: 'plans/future/platform', toStage: 'in-progress' },
 *     { storyId: 'LNGG-0050', featureDir: 'plans/future/platform', toStage: 'in-progress' }
 *   ]
 * })
 * ```
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { logger } from '@repo/logger'
import { StoryFileAdapter } from './story-file-adapter.js'
import {
  type Stage,
  type MoveStageRequest,
  type MoveStageResult,
  type BatchMoveStageRequest,
  type BatchMoveStageResult,
  MoveStageRequestSchema,
  BatchMoveStageRequestSchema,
} from './__types__/stage-types.js'
import { StoryNotFoundError, InvalidStageError, InvalidTransitionError } from './__types__/index.js'
import { isValidStage, validateTransition } from './utils/stage-validator.js'

/**
 * Stage Movement Adapter
 *
 * Provides type-safe operations for moving stories between lifecycle stages.
 * Updates the status field in YAML frontmatter (legacy format).
 */
export class StageMovementAdapter {
  private storyAdapter: StoryFileAdapter

  constructor() {
    this.storyAdapter = new StoryFileAdapter()
  }

  /**
   * Move a story to a new stage
   *
   * @param request - Move stage request
   * @returns Result with timing and status
   * @throws {InvalidStageError} If stage name is invalid
   * @throws {InvalidTransitionError} If transition is not allowed
   * @throws {StoryNotFoundError} If story file doesn't exist
   *
   * @example
   * ```typescript
   * const result = await adapter.moveStage({
   *   storyId: 'LNGG-0040',
   *   featureDir: 'plans/future/platform',
   *   toStage: 'in-progress'
   * })
   * ```
   */
  async moveStage(request: MoveStageRequest): Promise<MoveStageResult> {
    const startTime = Date.now()

    // Validate input
    const validated = MoveStageRequestSchema.parse(request)
    const { storyId, featureDir, toStage } = validated
    let { fromStage } = validated

    logger.info('Stage movement started', {
      storyId,
      featureDir,
      toStage,
      fromStage: fromStage || 'auto-detect',
    })

    // Validate target stage
    if (!isValidStage(toStage)) {
      throw new InvalidStageError(toStage, [
        'backlog',
        'elaboration',
        'ready-to-work',
        'in-progress',
        'ready-for-qa',
        'uat',
      ])
    }

    // Find story file
    const storyFilePath = await this.findStory(storyId, featureDir)

    // Read current status if fromStage not provided
    if (!fromStage) {
      const story = await this.storyAdapter.read(storyFilePath)
      fromStage = (story.status || story.state) as Stage

      if (!fromStage) {
        throw new Error(`Story ${storyId} has no status or state field in frontmatter`)
      }

      logger.info('Auto-detected current stage', { storyId, fromStage })
    }

    // Validate source stage
    if (!isValidStage(fromStage)) {
      throw new InvalidStageError(fromStage, [
        'backlog',
        'elaboration',
        'ready-to-work',
        'in-progress',
        'ready-for-qa',
        'uat',
      ])
    }

    // Check if already at target (idempotent)
    if (fromStage === toStage) {
      const elapsedMs = Date.now() - startTime
      logger.info('Story already at target stage', { storyId, stage: toStage, elapsedMs })
      return {
        storyId,
        fromStage,
        toStage,
        success: true,
        elapsedMs,
        warning: `Story already at stage ${toStage}`,
      }
    }

    // Validate transition
    const transition = validateTransition(fromStage, toStage)
    if (!transition.valid) {
      throw new InvalidTransitionError(fromStage, toStage, transition.reason!)
    }

    // Update status field in frontmatter
    await this.storyAdapter.update(storyFilePath, {
      status: toStage,
      updated_at: new Date().toISOString(),
    })

    const elapsedMs = Date.now() - startTime

    logger.info('Stage movement completed', {
      storyId,
      fromStage,
      toStage,
      elapsedMs,
    })

    return {
      storyId,
      fromStage,
      toStage,
      success: true,
      elapsedMs,
    }
  }

  /**
   * Move multiple stories to new stages in parallel
   *
   * Processes stories with concurrency limit to avoid overwhelming the filesystem.
   * Errors are isolated - one failure doesn't stop others.
   *
   * @param request - Batch move request
   * @returns Batch result with aggregated stats
   *
   * @example
   * ```typescript
   * const result = await adapter.batchMoveStage({
   *   stories: [
   *     { storyId: 'LNGG-0040', featureDir: 'plans/future/platform', toStage: 'in-progress' },
   *     { storyId: 'LNGG-0050', featureDir: 'plans/future/platform', toStage: 'in-progress' }
   *   ]
   * })
   * ```
   */
  async batchMoveStage(request: BatchMoveStageRequest): Promise<BatchMoveStageResult> {
    const startTime = Date.now()

    // Validate input
    const validated = BatchMoveStageRequestSchema.parse(request)
    const { stories, toStage: batchToStage, continueOnError } = validated

    // Apply batch toStage if provided
    const storiesToMove = batchToStage
      ? stories.map(s => ({ ...s, toStage: batchToStage }))
      : stories

    logger.info('Batch stage movement started', {
      totalStories: storiesToMove.length,
      batchToStage,
      continueOnError,
    })

    const results: MoveStageResult[] = []
    const errors: Array<{ storyId: string; error: string; errorType: string }> = []

    // Process stories in parallel with concurrency limit (10 concurrent operations)
    const CONCURRENCY_LIMIT = 10

    for (let i = 0; i < storiesToMove.length; i += CONCURRENCY_LIMIT) {
      const chunk = storiesToMove.slice(i, i + CONCURRENCY_LIMIT)

      const chunkPromises = chunk.map(async story => {
        try {
          const result = await this.moveStage(story)
          results.push(result)
        } catch (error) {
          const err = error as Error
          errors.push({
            storyId: story.storyId,
            error: err.message,
            errorType: err.name,
          })

          logger.error('Stage movement failed in batch', {
            storyId: story.storyId,
            error: err.message,
            errorType: err.name,
          })

          if (!continueOnError) {
            throw error
          }
        }
      })

      await Promise.allSettled(chunkPromises)
    }

    const elapsedMs = Date.now() - startTime

    logger.info('Batch stage movement summary', {
      totalStories: storiesToMove.length,
      succeeded: results.length,
      failed: errors.length,
      elapsedMs,
    })

    return {
      totalStories: storiesToMove.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors,
      elapsedMs,
    }
  }

  /**
   * Find a story file in the feature directory
   *
   * Searches for {storyId}/{storyId}.md pattern.
   * Also checks legacy subdirectories (backlog/, in-progress/, UAT/, etc.)
   *
   * @param storyId - Story identifier
   * @param featureDir - Feature directory to search
   * @returns Absolute path to story file
   * @throws {StoryNotFoundError} If story not found
   *
   * @example
   * ```typescript
   * const path = await adapter.findStory('LNGG-0040', 'plans/future/platform')
   * // '/path/to/plans/future/platform/LNGG-0040/LNGG-0040.md'
   * ```
   */
  async findStory(storyId: string, featureDir: string): Promise<string> {
    const absoluteFeatureDir = path.isAbsolute(featureDir)
      ? featureDir
      : path.join(process.cwd(), featureDir)

    // Try direct path first (flat structure)
    const directPath = path.join(absoluteFeatureDir, storyId, `${storyId}.md`)
    try {
      await fs.access(directPath)
      return directPath
    } catch {
      // Not found in direct path
    }

    // Try legacy subdirectories
    const legacyDirs = [
      'backlog',
      'elaboration',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'UAT',
      'uat',
    ]

    for (const dir of legacyDirs) {
      const legacyPath = path.join(absoluteFeatureDir, dir, storyId, `${storyId}.md`)
      try {
        await fs.access(legacyPath)
        logger.info('Found story in legacy directory', {
          storyId,
          legacyDir: dir,
          path: legacyPath,
        })
        return legacyPath
      } catch {
        // Try next directory
      }
    }

    // Story not found anywhere
    throw new StoryNotFoundError(
      `Could not locate story ${storyId} in ${featureDir} or legacy subdirectories`,
    )
  }
}
