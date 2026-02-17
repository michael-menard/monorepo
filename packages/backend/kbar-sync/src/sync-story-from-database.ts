/**
 * Sync Story From Database
 * KBAR-0030: AC-2
 *
 * Syncs a story from PostgreSQL database back to filesystem.
 * Uses atomic file write pattern (temp file + rename).
 */

import { writeFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { stringify } from 'yaml'
import { db } from '@repo/db'
import { kbarStories, artifacts, syncEvents } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  SyncStoryFromDatabaseInputSchema,
  SyncStoryFromDatabaseOutputSchema,
  type SyncStoryFromDatabaseInput,
  type SyncStoryFromDatabaseOutput,
  validateInput,
  validateFilePath,
  validateNotSymlink,
  normalizeOptionalField,
} from './__types__/index.js'

/**
 * Sync story from database to filesystem
 *
 * @param input - Validated input (storyId, outputPath, triggeredBy)
 * @returns Sync result with file path and syncEventId
 *
 * Implements:
 * - AC-2: Read from database, generate YAML, write to filesystem
 * - AC-6: Graceful error handling (never throws to caller)
 * - AC-7: Sync event tracking
 *
 * Uses atomic file write pattern:
 * 1. Write to temp file (outputPath + '.tmp')
 * 2. Rename temp file to final path (atomic operation)
 * 3. This prevents partial writes if process crashes mid-write
 */
export async function syncStoryFromDatabase(
  input: SyncStoryFromDatabaseInput,
): Promise<SyncStoryFromDatabaseOutput> {
  // QUAL-003 fix: Use extracted validation helper
  const validatedInput = validateInput(SyncStoryFromDatabaseInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      syncStatus: 'failed',
      error: 'Input validation failed',
    }
  }

  const { storyId, outputPath, triggeredBy } = validatedInput

  // SEC-002 fix: Validate output path and check for symlinks before writing
  try {
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(outputPath, baseDir)
    await validateNotSymlink(outputPath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', { storyId, outputPath, error: errorMessage })
    return {
      success: false,
      storyId,
      syncStatus: 'failed',
      error: `Security validation failed: ${errorMessage}`,
    }
  }

  let syncEventId: string | undefined
  const tempPath = `${outputPath}.tmp`
  const startedAt = new Date()

  try {
    // Create sync event (pending)
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'story_sync_from_db',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        metadata: { triggeredBy, syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Read story from database
    logger.info('Reading story from database', { storyId })
    const [story] = await db
      .select()
      .from(kbarStories)
      .where(eq(kbarStories.storyId, storyId))
      .limit(1)

    if (!story) {
      throw new Error(`Story not found in database: ${storyId}`)
    }

    // QUAL-004 fix: Use normalizeOptionalField for consistent optional field handling
    const frontmatter = {
      schema: 1,
      story_id: story.storyId,
      epic: story.epic,
      title: story.title,
      description: normalizeOptionalField(story.description),
      story_type: story.storyType,
      priority: story.priority,
      complexity: normalizeOptionalField(story.complexity),
      story_points: normalizeOptionalField(story.storyPoints),
      current_phase: story.currentPhase,
      status: story.status,
      metadata: normalizeOptionalField(story.metadata),
      created_at: story.createdAt.toISOString(),
      updated_at: story.updatedAt.toISOString(),
    }

    const yamlContent = stringify(frontmatter)

    // Atomic file write: write to temp file first
    logger.info('Writing story to filesystem (atomic)', { storyId, outputPath })
    await writeFile(tempPath, yamlContent, 'utf-8')

    // Rename temp file to final path (atomic operation)
    await rename(tempPath, outputPath)

    // Update artifact lastSyncedAt
    await db
      .update(artifacts)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(artifacts.storyId, story.id), eq(artifacts.artifactType, 'story_file')))

    // Update sync event to completed
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    await db
      .update(syncEvents)
      .set({
        status: 'completed',
        filesChanged: 1,
        completedAt,
        durationMs,
      })
      .where(eq(syncEvents.id, syncEventId))

    logger.info('Sync from database completed successfully', { storyId, syncEventId })
    return SyncStoryFromDatabaseOutputSchema.parse({
      success: true,
      storyId,
      filePath: outputPath,
      syncStatus: 'completed',
      message: 'Story synced from database successfully',
      syncEventId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to sync story from database', { storyId, error: errorMessage, outputPath })

    // SEC-003 fix: Log cleanup failures and retry with exponential backoff
    let cleanupSuccess = false
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await unlink(tempPath)
        cleanupSuccess = true
        logger.info('Temp file cleanup successful', { tempPath, attempt })
        break
      } catch (cleanupError) {
        const cleanupErrorMsg =
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        logger.warn('Failed to cleanup temp file', {
          tempPath,
          attempt,
          maxRetries,
          error: cleanupErrorMsg,
        })

        // Exponential backoff: 100ms, 200ms, 400ms
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)))
        }
      }
    }

    if (!cleanupSuccess) {
      logger.error('All temp file cleanup attempts failed', {
        tempPath,
        storyId,
        retries: maxRetries,
      })
    }

    // Update sync event to failed
    if (syncEventId) {
      try {
        await db
          .update(syncEvents)
          .set({
            status: 'failed',
            errorMessage,
            completedAt: new Date(),
          })
          .where(eq(syncEvents.id, syncEventId))
      } catch (updateError) {
        logger.error('Failed to update sync event', {
          syncEventId,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        })
      }
    }

    return SyncStoryFromDatabaseOutputSchema.parse({
      success: false,
      storyId,
      syncStatus: 'failed',
      error: errorMessage,
      syncEventId,
    })
  }
}
