/**
 * Detect Artifact Conflicts
 * KBAR-0040: AC-6, AC-8
 *
 * Detects conflicts when both filesystem and database have different checksums
 * for a non-story artifact. Logs conflict to syncConflicts table on mismatch.
 * Path security: validateFilePath + validateNotSymlink before every I/O (AC-8).
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { kbarStories, artifacts, syncConflicts, syncEvents } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  DetectArtifactConflictsInputSchema,
  DetectArtifactConflictsOutputSchema,
  type DetectArtifactConflictsInput,
  type DetectArtifactConflictsOutput,
  computeChecksum,
  validateInput,
  validateFilePath,
  validateNotSymlink,
} from './__types__/index.js'

/**
 * Detect conflicts between filesystem artifact and database record
 *
 * @param input - Validated input (storyId, artifactType, filePath)
 * @returns Conflict detection result
 *
 * Implements:
 * - AC-6: Compare filesystem checksum vs database checksum
 * - AC-6: Insert syncConflicts row on checksum mismatch
 * - AC-6: Return resolutionOptions when conflict detected
 * - AC-8: Path security (validateFilePath + validateNotSymlink)
 */
export async function detectArtifactConflicts(
  input: DetectArtifactConflictsInput,
): Promise<DetectArtifactConflictsOutput> {
  const validatedInput = validateInput(DetectArtifactConflictsInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      artifactType: input.artifactType || 'unknown',
      hasConflict: false,
      conflictType: 'none',
      error: 'Input validation failed',
    }
  }

  const { storyId, artifactType, filePath } = validatedInput

  // AC-8: Path security — validate before every I/O
  try {
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(filePath, baseDir)
    await validateNotSymlink(filePath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', {
      storyId,
      artifactType,
      filePath,
      error: errorMessage,
    })
    return {
      success: false,
      storyId,
      artifactType,
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
        eventType: 'artifact_conflict_detection',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        conflictsDetected: 0,
        metadata: { triggeredBy: 'automation', syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Read filesystem file and compute checksum
    logger.info('Reading artifact file for conflict detection', { storyId, artifactType, filePath })
    let filesystemChecksum: string

    try {
      const fileContent = await readFile(filePath, 'utf-8')
      filesystemChecksum = computeChecksum(fileContent)
    } catch {
      // File missing from filesystem
      logger.warn('Artifact file not found on filesystem', { storyId, artifactType, filePath })

      await db
        .update(syncEvents)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(syncEvents.id, syncEventId))

      return DetectArtifactConflictsOutputSchema.parse({
        success: true,
        storyId,
        artifactType,
        hasConflict: true,
        conflictType: 'missing_file',
        message: 'Artifact file missing from filesystem but exists in database',
        resolutionOptions: ['filesystem_wins', 'database_wins', 'manual'],
      })
    }

    // Look up story and artifact in DB
    const [story] = await db
      .select({ id: kbarStories.id })
      .from(kbarStories)
      .where(eq(kbarStories.storyId, storyId))
      .limit(1)

    if (!story) {
      await db
        .update(syncEvents)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(syncEvents.id, syncEventId))

      return DetectArtifactConflictsOutputSchema.parse({
        success: true,
        storyId,
        artifactType,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        message: 'Story not found in database, no conflict',
      })
    }

    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.storyId, story.id), eq(artifacts.artifactType, artifactType)))
      .limit(1)

    if (!artifact) {
      await db
        .update(syncEvents)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(syncEvents.id, syncEventId))

      return DetectArtifactConflictsOutputSchema.parse({
        success: true,
        storyId,
        artifactType,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        message: 'Artifact not found in database, no conflict',
      })
    }

    const databaseChecksum = artifact.checksum

    // Compare checksums
    if (filesystemChecksum === databaseChecksum) {
      logger.info('No conflict — artifact checksums match', { storyId, artifactType })

      await db
        .update(syncEvents)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(syncEvents.id, syncEventId))

      return DetectArtifactConflictsOutputSchema.parse({
        success: true,
        storyId,
        artifactType,
        hasConflict: false,
        conflictType: 'none',
        filesystemChecksum,
        databaseChecksum,
        message: 'No conflict detected',
      })
    }

    // Conflict detected — insert syncConflicts row (AC-6)
    logger.warn('Artifact conflict detected — checksum mismatch', {
      storyId,
      artifactType,
      filesystemChecksum: filesystemChecksum.substring(0, 16) + '...',
      databaseChecksum: databaseChecksum.substring(0, 16) + '...',
    })

    const [conflict] = await db
      .insert(syncConflicts)
      .values({
        syncEventId: syncEventId,
        artifactId: artifact.id,
        conflictType: 'checksum_mismatch',
        filesystemChecksum,
        databaseChecksum,
        metadata: { filesystemPath: filePath },
      })
      .returning({ id: syncConflicts.id })

    await db
      .update(syncEvents)
      .set({ status: 'completed', conflictsDetected: 1, completedAt: new Date() })
      .where(eq(syncEvents.id, syncEventId))

    return DetectArtifactConflictsOutputSchema.parse({
      success: true,
      storyId,
      artifactType,
      hasConflict: true,
      conflictType: 'checksum_mismatch',
      filesystemChecksum,
      databaseChecksum,
      conflictId: conflict.id,
      resolutionOptions: ['filesystem_wins', 'database_wins', 'manual', 'merged'],
      message: 'Conflict detected: both filesystem and database have changed',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to detect artifact conflicts', {
      storyId,
      artifactType,
      error: errorMessage,
      filePath,
    })

    if (syncEventId) {
      try {
        await db
          .update(syncEvents)
          .set({ status: 'failed', errorMessage, completedAt: new Date() })
          .where(eq(syncEvents.id, syncEventId))
      } catch (updateError) {
        logger.error('Failed to update sync event', {
          syncEventId,
          error: updateError instanceof Error ? updateError.message : String(updateError),
        })
      }
    }

    return DetectArtifactConflictsOutputSchema.parse({
      success: false,
      storyId,
      artifactType,
      hasConflict: false,
      conflictType: 'none',
      error: errorMessage,
    })
  }
}
