/**
 * Detect Sync Conflicts
 * KBAR-0030: AC-3
 *
 * Detects conflicts when both filesystem and database have changed since last sync.
 * Logs conflicts to syncConflicts table for manual resolution.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { kbarStories, artifacts, syncEvents, syncConflicts } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  DetectSyncConflictsInputSchema,
  DetectSyncConflictsOutputSchema,
  type DetectSyncConflictsInput,
  type DetectSyncConflictsOutput,
  computeChecksum,
  validateInput,
  validateFilePath,
  validateNotSymlink,
} from './__types__/index.js'

/**
 * Detect sync conflicts between filesystem and database
 *
 * @param input - Validated input (storyId, filePath)
 * @returns Conflict detection result with conflict details
 *
 * Implements:
 * - AC-3: Compare checksums and timestamps, detect conflicts
 * - AC-6: Graceful error handling (never throws to caller)
 * - AC-7: Sync event tracking
 *
 * Conflict detection logic:
 * 1. Read filesystem file and compute checksum
 * 2. Read database artifact checksum
 * 3. If checksums differ → conflict detected
 * 4. Log to syncConflicts table with resolution options
 * 5. Return conflict status and metadata
 */
export async function detectSyncConflicts(
  input: DetectSyncConflictsInput,
): Promise<DetectSyncConflictsOutput> {
  // QUAL-003 fix: Use extracted validation helper
  const validatedInput = validateInput(DetectSyncConflictsInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      hasConflict: false,
      conflictType: 'none',
      error: 'Input validation failed',
    }
  }

  const { storyId, filePath } = validatedInput

  // SEC-001 fix: Validate file path before reading
  try {
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(filePath, baseDir)
    await validateNotSymlink(filePath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', { storyId, filePath, error: errorMessage })
    return {
      success: false,
      storyId,
      hasConflict: false,
      conflictType: 'none',
      error: `Security validation failed: ${errorMessage}`,
    }
  }

  let syncEventId!: string

  try {
    // Create sync event for conflict detection
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'conflict_detected',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        conflictsDetected: 0,
        metadata: { triggeredBy: 'automation', syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Read file from filesystem
    logger.info('Reading file for conflict detection', { storyId, filePath })
    let fileContent: string
    let filesystemChecksum: string

    try {
      fileContent = await readFile(filePath, 'utf-8')
      filesystemChecksum = computeChecksum(fileContent)
    } catch (error) {
      logger.warn('File not found on filesystem', {
        storyId,
        filePath,
        error: error instanceof Error ? error.message : String(error),
      })

      // Update sync event
      await db
        .update(syncEvents)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(syncEvents.id, syncEventId))

      return DetectSyncConflictsOutputSchema.parse({
        success: true,
        storyId,
        hasConflict: true,
        conflictType: 'missing_file',
        message: 'File missing from filesystem but exists in database',
        resolutionOptions: ['filesystem_wins', 'database_wins', 'manual'],
      })
    }

    // PERF-001 fix: Use single join query to fetch both story and artifact data
    // This eliminates the N+1 query pattern by combining two separate queries into one
    const results = await db
      .select({
        story: kbarStories,
        artifact: artifacts,
      })
      .from(kbarStories)
      .leftJoin(
        artifacts,
        and(eq(artifacts.storyId, kbarStories.id), eq(artifacts.artifactType, 'story_file')),
      )
      .where(eq(kbarStories.storyId, storyId))
      .limit(1)

    const storyWithArtifact = results[0]

    if (!storyWithArtifact || !storyWithArtifact.story) {
      // Story not in database but file exists
      await db
        .update(syncEvents)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(syncEvents.id, syncEventId))

      return DetectSyncConflictsOutputSchema.parse({
        success: true,
        storyId,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        message: 'Story not in database, no conflict',
      })
    }

    const story = storyWithArtifact.story
    const artifact = storyWithArtifact.artifact

    if (!artifact) {
      // No artifact in database
      await db
        .update(syncEvents)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(syncEvents.id, syncEventId))

      return DetectSyncConflictsOutputSchema.parse({
        success: true,
        storyId,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        message: 'No artifact in database, no conflict',
      })
    }

    const databaseChecksum = artifact.checksum

    // Compare checksums
    if (filesystemChecksum === databaseChecksum) {
      // No conflict - checksums match
      logger.info('No conflict detected - checksums match', { storyId })

      await db
        .update(syncEvents)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(syncEvents.id, syncEventId))

      return DetectSyncConflictsOutputSchema.parse({
        success: true,
        storyId,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        databaseChecksum,
        message: 'No conflict detected',
      })
    }

    // Conflict detected - checksums mismatch
    logger.warn('Conflict detected - checksum mismatch', {
      storyId,
      filesystemChecksum: filesystemChecksum.substring(0, 16) + '...',
      databaseChecksum: databaseChecksum.substring(0, 16) + '...',
    })

    // Log conflict to syncConflicts table
    const [conflict] = await db
      .insert(syncConflicts)
      .values({
        syncEventId: syncEventId,
        artifactId: artifact.id,
        conflictType: 'checksum_mismatch',
        filesystemChecksum,
        databaseChecksum,
        metadata: {
          filesystemPath: filePath,
        },
      })
      .returning({ id: syncConflicts.id })

    // Update sync event
    await db
      .update(syncEvents)
      .set({
        status: 'completed',
        conflictsDetected: 1,
        completedAt: new Date(),
      })
      .where(eq(syncEvents.id, syncEventId))

    return DetectSyncConflictsOutputSchema.parse({
      success: true,
      storyId,
      hasConflict: true,
      conflictType: 'checksum_mismatch',
      filesystemChecksum,
      databaseChecksum,
      filesystemUpdatedAt: undefined, // Not tracked in filesystem
      databaseUpdatedAt: story.updatedAt,
      conflictId: conflict.id,
      resolutionOptions: ['filesystem_wins', 'database_wins', 'manual', 'merged'],
      message: 'Conflict detected: both filesystem and database have changed',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to detect sync conflicts', { storyId, error: errorMessage, filePath })

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

    return DetectSyncConflictsOutputSchema.parse({
      success: false,
      storyId,
      hasConflict: false,
      conflictType: 'none',
      error: errorMessage,
    })
  }
}
