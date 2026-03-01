/**
 * Batch Sync Artifacts For Story
 * KBAR-0040: AC-4, AC-8
 *
 * Discovers and syncs all known artifacts for a single story.
 * Uses ARTIFACT_FILENAME_MAP for static filenames and glob for PROOF-*.md files.
 * Per-artifact fault isolation: one failure does not abort the batch (AC-4).
 * Single syncEvent for the entire batch operation (AC-4).
 * Path security on each artifact path before I/O (AC-8).
 */

import { stat, glob } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { syncEvents } from '@repo/database-schema'
import { eq } from 'drizzle-orm'
import {
  BatchSyncArtifactsInputSchema,
  BatchSyncArtifactsOutputSchema,
  type BatchSyncArtifactsInput,
  type BatchSyncArtifactsOutput,
  type ArtifactSyncResult,
  ARTIFACT_FILENAME_MAP,
  validateInput,
  validateFilePath,
  validateNotSymlink,
} from './__types__/index.js'
import { syncArtifactToDatabase } from './sync-artifact-to-database.js'

/**
 * Batch sync all artifacts for a single story
 *
 * Discovery strategy:
 * 1. Static files: ARTIFACT_FILENAME_MAP keys relative to storyDir
 * 2. Dynamic files: PROOF-*.md glob relative to storyDir (type: 'evidence')
 *
 * Per-artifact fault isolation (AC-4):
 * - Each artifact is synced independently
 * - Failure of one artifact does not abort the batch
 * - Aggregate results include per-artifact status
 *
 * @param input - Batch sync input (storyId, storyDir, triggeredBy)
 * @returns Aggregate batch result with per-artifact results
 */
export async function batchSyncArtifactsForStory(
  input: BatchSyncArtifactsInput,
): Promise<BatchSyncArtifactsOutput> {
  const validatedInput = validateInput(BatchSyncArtifactsInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      totalDiscovered: 0,
      totalSynced: 0,
      totalSkipped: 0,
      totalFailed: 0,
      results: [],
      error: 'Input validation failed',
    }
  }

  const { storyId, storyDir, triggeredBy } = validatedInput
  const startedAt = new Date()
  let syncEventId!: string

  try {
    // Create single syncEvent for the entire batch (AC-4)
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'artifact_batch_sync',
        status: 'pending',
        storyId,
        filesScanned: 0,
        filesChanged: 0,
        metadata: { triggeredBy, syncMode: 'full' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Discover artifacts
    const artifactsToSync: Array<{ filePath: string; artifactType: string }> = []

    // 1. Static files from ARTIFACT_FILENAME_MAP
    for (const [relPath, artifactType] of Object.entries(ARTIFACT_FILENAME_MAP)) {
      const absolutePath = path.join(storyDir, relPath)
      try {
        // AC-8: Path security on each discovered path
        const baseDir = path.resolve(process.cwd(), 'plans')
        validateFilePath(absolutePath, baseDir)
        await validateNotSymlink(absolutePath)

        // Check if file exists
        await stat(absolutePath)
        artifactsToSync.push({ filePath: absolutePath, artifactType })
      } catch {
        // File doesn't exist or failed security check — skip silently
      }
    }

    // 2. Dynamic PROOF-*.md files via glob
    try {
      const baseDir = path.resolve(process.cwd(), 'plans')

      // Use async generator from Node.js glob
      for await (const proofFile of glob(path.join(storyDir, 'PROOF-*.md'))) {
        try {
          // AC-8: Path security on glob results
          validateFilePath(proofFile, baseDir)
          await validateNotSymlink(proofFile)
          artifactsToSync.push({ filePath: proofFile, artifactType: 'evidence' })
        } catch (secError) {
          logger.warn('Path security check failed for PROOF file', {
            storyId,
            filePath: proofFile,
            error: secError instanceof Error ? secError.message : String(secError),
          })
        }
      }
    } catch (globError) {
      logger.warn('PROOF-*.md glob failed', {
        storyId,
        storyDir,
        error: globError instanceof Error ? globError.message : String(globError),
      })
    }

    logger.info('Discovered artifacts for batch sync', {
      storyId,
      count: artifactsToSync.length,
    })

    // Update scanCount
    await db
      .update(syncEvents)
      .set({ filesScanned: artifactsToSync.length })
      .where(eq(syncEvents.id, syncEventId))

    // Sync each artifact with fault isolation (AC-4)
    const results: ArtifactSyncResult[] = []
    let totalSynced = 0
    let totalSkipped = 0
    let totalFailed = 0

    for (const { filePath, artifactType } of artifactsToSync) {
      try {
        const syncResult = await syncArtifactToDatabase({
          storyId,
          artifactType: artifactType as any,
          filePath,
          triggeredBy: triggeredBy ?? 'user',
        })

        if (syncResult.syncStatus === 'synced') {
          totalSynced++
          results.push({ filePath, artifactType, status: 'synced' })
        } else if (syncResult.syncStatus === 'skipped') {
          totalSkipped++
          results.push({ filePath, artifactType, status: 'skipped' })
        } else {
          totalFailed++
          results.push({
            filePath,
            artifactType,
            status: 'failed',
            error: syncResult.error,
          })
        }
      } catch (error) {
        // Per-artifact fault isolation — catch unexpected errors
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('Unexpected error syncing artifact in batch', {
          storyId,
          artifactType,
          filePath,
          error: errorMessage,
        })
        totalFailed++
        results.push({
          filePath,
          artifactType,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    // Update syncEvent with aggregate results
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()
    const allFailed = totalFailed > 0 && totalSynced === 0 && totalSkipped === 0
    const partialSuccess = totalFailed > 0 && (totalSynced > 0 || totalSkipped > 0)

    await db
      .update(syncEvents)
      .set({
        status: allFailed ? 'failed' : 'completed',
        filesChanged: totalSynced,
        completedAt,
        durationMs,
      })
      .where(eq(syncEvents.id, syncEventId))

    const overallSuccess = !allFailed

    logger.info('Batch artifact sync completed', {
      storyId,
      totalDiscovered: artifactsToSync.length,
      totalSynced,
      totalSkipped,
      totalFailed,
      partialSuccess,
    })

    return BatchSyncArtifactsOutputSchema.parse({
      success: overallSuccess,
      storyId,
      syncEventId,
      totalDiscovered: artifactsToSync.length,
      totalSynced,
      totalSkipped,
      totalFailed,
      results,
      error: allFailed ? 'All artifacts failed to sync' : undefined,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Batch artifact sync failed', { storyId, error: errorMessage })

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

    return BatchSyncArtifactsOutputSchema.parse({
      success: false,
      storyId,
      syncEventId,
      totalDiscovered: 0,
      totalSynced: 0,
      totalSkipped: 0,
      totalFailed: 0,
      results: [],
      error: errorMessage,
    })
  }
}
