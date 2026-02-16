/**
 * Checkpoint File Adapter
 *
 * Type-safe file adapter for reading and writing CHECKPOINT.yaml files.
 * Supports backward compatibility with legacy checkpoint formats.
 *
 * Features:
 * - Atomic writes (temp file + rename pattern)
 * - Zod validation on read/write
 * - Typed error handling
 * - Backward compatibility with existing checkpoint files
 * - Batch operations for performance
 * - Phase-specific helpers (advancePhase, markPhaseBlocked)
 *
 * @example
 * ```typescript
 * const adapter = new CheckpointAdapter()
 *
 * // Read a checkpoint
 * const checkpoint = await adapter.read('/path/to/CHECKPOINT.yaml')
 *
 * // Write a checkpoint
 * await adapter.write('/path/to/CHECKPOINT.yaml', checkpointData)
 *
 * // Update a checkpoint
 * await adapter.update('/path/to/CHECKPOINT.yaml', { blocked: true })
 *
 * // Advance to next phase
 * await adapter.advancePhase('/path/to/CHECKPOINT.yaml', 'plan', 'execute')
 * ```
 */

import { logger } from '@repo/logger'
import { CheckpointSchema, type Checkpoint, type Phase } from '../artifacts/checkpoint.js'
import { CheckpointNotFoundError, ValidationError } from './__types__/index.js'
import { writeFileAtomic, readFileSafe, fileExists } from './utils/file-utils.js'
import { parseCheckpointYAML, serializeCheckpoint } from './utils/yaml-parser.js'

/**
 * Result of batch read operation
 */
export interface BatchReadResult {
  /** Successfully read checkpoints */
  results: Checkpoint[]
  /** Errors encountered during read (missing files, validation failures, etc.) */
  errors: Array<{ filePath: string; error: Error }>
}

/**
 * Checkpoint File Adapter
 *
 * Provides type-safe read/write operations for CHECKPOINT.yaml files.
 * Uses backward-compatible schema to support legacy formats.
 */
export class CheckpointAdapter {
  /**
   * Read a checkpoint file from disk
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @returns Validated Checkpoint object
   * @throws {CheckpointNotFoundError} If file does not exist
   * @throws {InvalidYAMLError} If YAML parsing fails
   * @throws {ValidationError} If Zod validation fails
   * @throws {ReadError} If file read fails for other reasons
   *
   * @example
   * ```typescript
   * const checkpoint = await adapter.read('/path/to/CHECKPOINT.yaml')
   * console.log(checkpoint.current_phase) // 'execute'
   * ```
   */
  async read(filePath: string): Promise<Checkpoint> {
    logger.info('Reading checkpoint file', { filePath })

    try {
      // Read file content
      const content = await readFileSafe(filePath)

      // Parse YAML (no frontmatter)
      const parsed = parseCheckpointYAML(content, filePath)

      // Handle numeric phase values (legacy format)
      if (parsed && typeof parsed === 'object' && 'current_phase' in parsed) {
        const data = parsed as Record<string, unknown>

        // Convert numeric phase to string with warning
        if (typeof data.current_phase === 'number') {
          const numericPhase = data.current_phase as number
          const phaseMap: Record<number, Phase> = {
            1: 'setup',
            2: 'plan',
            3: 'execute',
            4: 'proof',
            5: 'review',
            6: 'fix',
          }

          const stringPhase = phaseMap[numericPhase] || 'setup'
          logger.warn('Numeric phase detected in checkpoint, converting to string', {
            filePath,
            numericPhase,
            convertedTo: stringPhase,
          })

          data.current_phase = stringPhase
        }

        // Same conversion for last_successful_phase
        if (typeof data.last_successful_phase === 'number') {
          const numericPhase = data.last_successful_phase as number
          const phaseMap: Record<number, Phase> = {
            1: 'setup',
            2: 'plan',
            3: 'execute',
            4: 'proof',
            5: 'review',
            6: 'fix',
          }

          const stringPhase = phaseMap[numericPhase] || 'setup'
          logger.warn('Numeric last_successful_phase detected, converting to string', {
            filePath,
            numericPhase,
            convertedTo: stringPhase,
          })

          data.last_successful_phase = stringPhase
        }
      }

      // Validate against schema
      const result = CheckpointSchema.safeParse(parsed)

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          path: err.path.map(String),
          message: err.message,
        }))
        throw new ValidationError(filePath, errors)
      }

      logger.debug('Checkpoint file read successfully', {
        filePath,
        storyId: result.data.story_id,
        currentPhase: result.data.current_phase,
      })

      return result.data
    } catch (error) {
      // Convert ENOENT to CheckpointNotFoundError
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new CheckpointNotFoundError(filePath)
      }

      // Rethrow other errors as-is (ValidationError, InvalidYAMLError, ReadError)
      throw error
    }
  }

  /**
   * Write a checkpoint file to disk
   *
   * Uses atomic write pattern (temp file + rename) to prevent corruption.
   * Validates checkpoint against schema before writing.
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @param checkpoint - Checkpoint object to write
   * @throws {ValidationError} If checkpoint fails schema validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * await adapter.write('/path/to/CHECKPOINT.yaml', checkpointData)
   * ```
   */
  async write(filePath: string, checkpoint: Checkpoint): Promise<void> {
    logger.info('Writing checkpoint file', { filePath, storyId: checkpoint.story_id })

    // Validate before writing
    const result = CheckpointSchema.safeParse(checkpoint)

    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        path: err.path.map(String),
        message: err.message,
      }))
      throw new ValidationError(filePath, errors)
    }

    // Serialize to YAML
    const yamlContent = serializeCheckpoint(result.data)

    // Atomic write (temp file + rename)
    await writeFileAtomic(filePath, yamlContent)

    logger.debug('Checkpoint file written successfully', {
      filePath,
      storyId: checkpoint.story_id,
      phase: checkpoint.current_phase,
    })
  }

  /**
   * Update a checkpoint file with partial changes
   *
   * Reads the existing checkpoint, merges updates, validates, and writes back.
   * Preserves all fields not specified in updates.
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @param updates - Partial checkpoint updates
   * @throws {CheckpointNotFoundError} If file does not exist
   * @throws {ValidationError} If merged result fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * await adapter.update('/path/to/CHECKPOINT.yaml', { blocked: true, blocked_reason: 'Missing dependency' })
   * ```
   */
  async update(filePath: string, updates: Partial<Checkpoint>): Promise<void> {
    logger.info('Updating checkpoint file', { filePath, updateKeys: Object.keys(updates) })

    // Read existing checkpoint
    const existing = await this.read(filePath)

    // Merge updates into existing checkpoint
    const merged: Checkpoint = {
      ...existing,
      ...updates,
      // Always update timestamp on any change
      timestamp: new Date().toISOString(),
    }

    // Write merged result (includes validation)
    await this.write(filePath, merged)

    logger.debug('Checkpoint file updated successfully', {
      filePath,
      updatedFields: Object.keys(updates),
    })
  }

  /**
   * Advance checkpoint to the next phase
   *
   * Updates current_phase, last_successful_phase, and timestamp.
   * Convenience method for phase transitions.
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @param completedPhase - Phase that was just completed
   * @param nextPhase - Phase to advance to
   * @throws {CheckpointNotFoundError} If file does not exist
   * @throws {ValidationError} If result fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * await adapter.advancePhase('/path/to/CHECKPOINT.yaml', 'plan', 'execute')
   * ```
   */
  async advancePhase(filePath: string, completedPhase: Phase, nextPhase: Phase): Promise<void> {
    logger.info('Advancing checkpoint phase', {
      filePath,
      from: completedPhase,
      to: nextPhase,
    })

    await this.update(filePath, {
      current_phase: nextPhase,
      last_successful_phase: completedPhase,
    })

    logger.debug('Checkpoint phase advanced successfully', {
      filePath,
      completedPhase,
      nextPhase,
    })
  }

  /**
   * Read multiple checkpoint files in parallel
   *
   * Continues reading even if individual files fail.
   * Returns both successful results and errors.
   *
   * @param filePaths - Array of absolute paths to checkpoint files
   * @returns Object with results and errors arrays
   *
   * @example
   * ```typescript
   * const { results, errors } = await adapter.readBatch([
   *   '/path/to/CHECKPOINT-1.yaml',
   *   '/path/to/CHECKPOINT-2.yaml',
   * ])
   * console.log(`Read ${results.length} checkpoints, ${errors.length} failed`)
   * ```
   */
  async readBatch(filePaths: string[]): Promise<BatchReadResult> {
    logger.info('Reading checkpoint batch', { count: filePaths.length })

    const results: Checkpoint[] = []
    const errors: Array<{ filePath: string; error: Error }> = []

    await Promise.all(
      filePaths.map(async filePath => {
        try {
          const checkpoint = await this.read(filePath)
          results.push(checkpoint)
        } catch (error) {
          errors.push({ filePath, error: error as Error })
        }
      }),
    )

    logger.info('Checkpoint batch read complete', {
      total: filePaths.length,
      successful: results.length,
      failed: errors.length,
    })

    return { results, errors }
  }

  /**
   * Check if a checkpoint file exists
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @returns True if file exists and is accessible
   *
   * @example
   * ```typescript
   * if (await adapter.exists('/path/to/CHECKPOINT.yaml')) {
   *   // File exists
   * }
   * ```
   */
  async exists(filePath: string): Promise<boolean> {
    return fileExists(filePath)
  }

  /**
   * Mark a phase as blocked with a reason
   *
   * Sets blocked flag to true and records the reason.
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @param reason - Reason for blocking
   * @throws {CheckpointNotFoundError} If file does not exist
   * @throws {ValidationError} If result fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * await adapter.markPhaseBlocked('/path/to/CHECKPOINT.yaml', 'Missing dependency: STORY-001')
   * ```
   */
  async markPhaseBlocked(filePath: string, reason: string): Promise<void> {
    logger.info('Marking checkpoint as blocked', { filePath, reason })

    await this.update(filePath, {
      blocked: true,
      blocked_reason: reason,
    })

    logger.debug('Checkpoint marked as blocked', { filePath, reason })
  }

  /**
   * Clear blocked state from a checkpoint
   *
   * Sets blocked flag to false and clears the reason.
   *
   * @param filePath - Absolute path to the CHECKPOINT.yaml file
   * @throws {CheckpointNotFoundError} If file does not exist
   * @throws {ValidationError} If result fails validation
   * @throws {WriteError} If file write fails
   *
   * @example
   * ```typescript
   * await adapter.clearBlocked('/path/to/CHECKPOINT.yaml')
   * ```
   */
  async clearBlocked(filePath: string): Promise<void> {
    logger.info('Clearing blocked state from checkpoint', { filePath })

    await this.update(filePath, {
      blocked: false,
      blocked_reason: null,
    })

    logger.debug('Checkpoint blocked state cleared', { filePath })
  }
}
