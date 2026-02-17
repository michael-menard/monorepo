/**
 * Batch Sync By Type
 * KBAR-0040: AC-5, AC-8
 *
 * Cross-story batch sync of all artifacts of a given type across all stories.
 * Uses syncCheckpoints table for progress tracking and resumption (AC-5).
 * Per-artifact fault isolation (AC-5).
 * Path security on all discovered paths (AC-8).
 *
 * NOTE: conflictsDetected field is intentionally OMITTED from BatchSyncByTypeOutput.
 * AC-5 does not require conflict detection for cross-story batch operations.
 * Conflict detection is a separate concern handled by detectArtifactConflicts.
 */

import { stat } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { syncCheckpoints } from '@repo/database-schema'
import { eq } from 'drizzle-orm'
import {
  BatchSyncByTypeInputSchema,
  BatchSyncByTypeOutputSchema,
  ARTIFACT_FILENAME_MAP,
  type BatchSyncByTypeInput,
  type BatchSyncByTypeOutput,
  type ArtifactSyncResult,
  type NonStoryArtifactType,
  validateInput,
  validateFilePath,
  validateNotSymlink,
} from './__types__/index.js'
import { syncArtifactToDatabase } from './sync-artifact-to-database.js'

/**
 * Discover all file paths for a given artifact type across all stories under baseDir.
 *
 * Strategy:
 * - For types in ARTIFACT_FILENAME_MAP: find all stories (directories that match
 *   the story ID pattern) and check for the mapped filename.
 * - For 'evidence' type: additional PROOF-*.md glob within each story dir.
 *
 * Returns array of { filePath, storyId } pairs.
 */
async function discoverArtifactsByType(
  artifactType: NonStoryArtifactType,
  baseDir: string,
): Promise<Array<{ filePath: string; storyId: string }>> {
  const discovered: Array<{ filePath: string; storyId: string }> = []

  // Find relative filename for this artifact type
  const relativeFilenames = Object.entries(ARTIFACT_FILENAME_MAP)
    .filter(([, type]) => type === artifactType)
    .map(([filename]) => filename)

  // Discover story directories under baseDir
  // Story directories follow naming like KBAR-0030, WINT-0010, etc.
  const { readdir } = await import('node:fs/promises')

  const featureDirs: string[] = []
  try {
    // baseDir structure: baseDir/in-progress/STORY-ID or baseDir/done/STORY-ID etc.
    // We recursively search 2 levels deep for story-like directories
    const topLevel = await readdir(baseDir, { withFileTypes: true })
    for (const entry of topLevel) {
      if (entry.isDirectory()) {
        const subPath = path.join(baseDir, entry.name)
        try {
          const subEntries = await readdir(subPath, { withFileTypes: true })
          for (const subEntry of subEntries) {
            if (subEntry.isDirectory() && /^[A-Z]+-\d+$/.test(subEntry.name)) {
              featureDirs.push(path.join(subPath, subEntry.name))
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to enumerate story directories', {
      baseDir,
      error: error instanceof Error ? error.message : String(error),
    })
    return discovered
  }

  for (const storyDir of featureDirs) {
    const storyId = path.basename(storyDir)
    const validBase = path.resolve(process.cwd(), 'plans')

    for (const relFilename of relativeFilenames) {
      const absolutePath = path.join(storyDir, relFilename)
      try {
        // AC-8: Path security on every discovered path
        validateFilePath(absolutePath, validBase)
        await validateNotSymlink(absolutePath)
        await stat(absolutePath) // Check existence
        discovered.push({ filePath: absolutePath, storyId })
      } catch {
        // File doesn't exist or security check failed — skip
      }
    }

    // For 'evidence' type, also discover PROOF-*.md files
    if (artifactType === 'evidence') {
      try {
        const { glob } = await import('node:fs/promises')
        for await (const proofFile of glob(path.join(storyDir, 'PROOF-*.md'))) {
          try {
            validateFilePath(proofFile, validBase)
            await validateNotSymlink(proofFile)
            discovered.push({ filePath: proofFile, storyId })
          } catch {
            // Security check failed — skip
          }
        }
      } catch {
        // Glob not supported or error — skip
      }
    }
  }

  return discovered
}

/**
 * Batch sync all artifacts of a given type across all stories
 *
 * @param input - Batch sync input (artifactType, baseDir, triggeredBy, checkpointName)
 * @returns Aggregate results with per-artifact status
 *
 * Implements:
 * - AC-5: Cross-story artifact discovery and sync
 * - AC-5: syncCheckpoints progress tracking and resumption
 * - AC-5: Per-artifact fault isolation
 * - AC-8: Path security on all discovered paths
 */
export async function batchSyncByType(input: BatchSyncByTypeInput): Promise<BatchSyncByTypeOutput> {
  const validatedInput = validateInput(BatchSyncByTypeInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      artifactType: input.artifactType || 'unknown',
      totalDiscovered: 0,
      totalSynced: 0,
      totalSkipped: 0,
      totalFailed: 0,
      results: [],
      error: 'Input validation failed',
    }
  }

  const { artifactType, baseDir, triggeredBy, checkpointName } = validatedInput
  const effectiveCheckpointName = checkpointName ?? `batch_by_type_${artifactType}`

  try {
    // AC-5: Load checkpoint for resumption
    let resumeFromPath: string | null = null

    if (checkpointName) {
      const [checkpoint] = await db
        .select()
        .from(syncCheckpoints)
        .where(eq(syncCheckpoints.checkpointName, effectiveCheckpointName))
        .limit(1)

      if (checkpoint?.lastProcessedPath) {
        resumeFromPath = checkpoint.lastProcessedPath
        logger.info('Resuming batch from checkpoint', {
          artifactType,
          checkpointName: effectiveCheckpointName,
          resumeFromPath,
        })
      }
    }

    // Discover all artifacts of this type
    const allArtifacts = await discoverArtifactsByType(artifactType, baseDir)

    logger.info('Discovered artifacts for batch-by-type sync', {
      artifactType,
      count: allArtifacts.length,
      resumeFromPath,
    })

    // Filter to resume from checkpoint if applicable (AC-5)
    let artifactsToProcess = allArtifacts
    if (resumeFromPath) {
      const resumeIdx = allArtifacts.findIndex(a => a.filePath === resumeFromPath)
      if (resumeIdx >= 0) {
        // Resume after the last processed path
        artifactsToProcess = allArtifacts.slice(resumeIdx + 1)
        logger.info('Skipping already-processed artifacts', {
          artifactType,
          skippedCount: resumeIdx + 1,
          remainingCount: artifactsToProcess.length,
        })
      }
    }

    // Ensure checkpoint row exists
    await db
      .insert(syncCheckpoints)
      .values({
        checkpointName: effectiveCheckpointName,
        checkpointType: 'artifact_type',
        totalProcessed: 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: syncCheckpoints.checkpointName,
        set: { isActive: true, updatedAt: new Date() },
      })

    // Process each artifact with fault isolation and checkpoint update (AC-5)
    const results: ArtifactSyncResult[] = []
    let totalSynced = 0
    let totalSkipped = 0
    let totalFailed = 0
    let lastProcessedPath: string | undefined

    for (const { filePath, storyId } of artifactsToProcess) {
      try {
        const syncResult = await syncArtifactToDatabase({
          storyId,
          artifactType,
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
          results.push({ filePath, artifactType, status: 'failed', error: syncResult.error })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('Unexpected error in batch-by-type sync', {
          artifactType,
          filePath,
          storyId,
          error: errorMessage,
        })
        totalFailed++
        results.push({ filePath, artifactType, status: 'failed', error: errorMessage })
      }

      // AC-5: Update checkpoint after each artifact for resumption
      lastProcessedPath = filePath
      const totalProcessedSoFar =
        (resumeFromPath ? allArtifacts.findIndex(a => a.filePath === resumeFromPath) + 1 : 0) +
        totalSynced +
        totalSkipped +
        totalFailed

      try {
        await db
          .update(syncCheckpoints)
          .set({
            lastProcessedPath: filePath,
            lastProcessedTimestamp: new Date(),
            totalProcessed: totalProcessedSoFar,
            updatedAt: new Date(),
          })
          .where(eq(syncCheckpoints.checkpointName, effectiveCheckpointName))
      } catch (checkpointError) {
        logger.warn('Failed to update checkpoint', {
          checkpointName: effectiveCheckpointName,
          filePath,
          error:
            checkpointError instanceof Error ? checkpointError.message : String(checkpointError),
        })
      }
    }

    logger.info('Batch-by-type sync completed', {
      artifactType,
      totalDiscovered: allArtifacts.length,
      totalSynced,
      totalSkipped,
      totalFailed,
    })

    return BatchSyncByTypeOutputSchema.parse({
      success: true,
      artifactType,
      checkpointName: effectiveCheckpointName,
      totalDiscovered: allArtifacts.length,
      totalSynced,
      totalSkipped,
      totalFailed,
      lastProcessedPath,
      results,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Batch-by-type sync failed', { artifactType, error: errorMessage })

    return BatchSyncByTypeOutputSchema.parse({
      success: false,
      artifactType,
      checkpointName: effectiveCheckpointName,
      totalDiscovered: 0,
      totalSynced: 0,
      totalSkipped: 0,
      totalFailed: 0,
      results: [],
      error: errorMessage,
    })
  }
}
