/**
 * Sync Artifact From Database
 * KBAR-0040: AC-2, AC-3, AC-8
 *
 * Syncs a non-story artifact from PostgreSQL database back to filesystem.
 * Uses atomic file write pattern (temp file + rename) to prevent partial writes.
 * Reads from artifactContentCache when available and increments hitCount (AC-3).
 * Creates parent directory if it does not exist (AC-2).
 * Path security: validateFilePath + validateNotSymlink before every I/O (AC-8).
 */

import { writeFile, rename, unlink, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { stringify } from 'yaml'
import { db } from '@repo/db'
import { kbarStories, artifacts, artifactContentCache, syncEvents } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  SyncArtifactFromDatabaseInputSchema,
  SyncArtifactFromDatabaseOutputSchema,
  type SyncArtifactFromDatabaseInput,
  type SyncArtifactFromDatabaseOutput,
  validateInput,
  validateFilePath,
  validateNotSymlink,
  normalizeOptionalField,
} from './__types__/index.js'

/**
 * Sync a non-story artifact from database to filesystem
 *
 * @param input - Validated input (storyId, artifactType, outputPath, triggeredBy)
 * @returns Sync result with file path and syncEventId
 *
 * Implements:
 * - AC-2: Read from DB/cache, serialize to YAML, write atomically to filesystem
 * - AC-3: Increment cache hitCount on cache read
 * - AC-8: Path security (validateFilePath + validateNotSymlink)
 *
 * Cache behavior:
 * - If artifactContentCache has a row with matching checksum → use cached parsedContent (cache hit)
 * - Otherwise → fall back to reconstructing content from artifact metadata (cache miss)
 *
 * Atomic write pattern:
 * 1. mkdir -p parent directory
 * 2. Write to outputPath + '.tmp'
 * 3. Rename .tmp → outputPath (atomic)
 * 4. On failure: cleanup .tmp in finally block
 */
export async function syncArtifactFromDatabase(
  input: SyncArtifactFromDatabaseInput,
): Promise<SyncArtifactFromDatabaseOutput> {
  const validatedInput = validateInput(SyncArtifactFromDatabaseInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      artifactType: input.artifactType || 'unknown',
      syncStatus: 'failed',
      error: 'Input validation failed',
    }
  }

  const { storyId, artifactType, outputPath, triggeredBy } = validatedInput

  // AC-8: Path security — validate before every I/O
  try {
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(outputPath, baseDir)
    await validateNotSymlink(outputPath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', {
      storyId,
      artifactType,
      outputPath,
      error: errorMessage,
    })
    return {
      success: false,
      storyId,
      artifactType,
      syncStatus: 'failed',
      error: `Security validation failed: ${errorMessage}`,
    }
  }

  let syncEventId!: string
  const tempPath = `${outputPath}.tmp`
  const startedAt = new Date()

  try {
    // Create sync event (pending) before I/O
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'artifact_sync_from_db',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        metadata: { triggeredBy, syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Look up story and artifact together
    logger.info('Reading artifact from database', { storyId, artifactType, outputPath })

    const [story] = await db
      .select({ id: kbarStories.id })
      .from(kbarStories)
      .where(eq(kbarStories.storyId, storyId))
      .limit(1)

    if (!story) {
      throw new Error(`Story not found in database: ${storyId}`)
    }

    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.storyId, story.id), eq(artifacts.artifactType, artifactType)))
      .limit(1)

    if (!artifact) {
      throw new Error(`Artifact not found in database: storyId=${storyId}, type=${artifactType}`)
    }

    // AC-3: Check cache for parsed content — increment hitCount on cache hit
    let yamlContent: string
    let cacheHit = false

    const [cacheRow] = await db
      .select()
      .from(artifactContentCache)
      .where(eq(artifactContentCache.artifactId, artifact.id))
      .limit(1)

    if (
      cacheRow &&
      cacheRow.checksum === artifact.checksum &&
      !cacheRow.parsedContent._parseError
    ) {
      // Cache hit — use parsed content
      logger.info('Cache hit for artifact', { storyId, artifactType, artifactId: artifact.id })
      cacheHit = true
      yamlContent = stringify(cacheRow.parsedContent)

      // Increment hitCount (AC-3)
      await db
        .update(artifactContentCache)
        .set({
          hitCount: cacheRow.hitCount + 1,
          lastHitAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(artifactContentCache.id, cacheRow.id))
    } else {
      // Cache miss — build minimal YAML from artifact metadata
      logger.info('Cache miss for artifact, building minimal output', {
        storyId,
        artifactType,
        artifactId: artifact.id,
      })
      const artifactData = {
        storyId: normalizeOptionalField(storyId),
        artifactType,
        filePath: artifact.filePath,
        checksum: artifact.checksum,
        syncStatus: artifact.syncStatus,
        lastSyncedAt: artifact.lastSyncedAt?.toISOString(),
        metadata: normalizeOptionalField(artifact.metadata),
        createdAt: artifact.createdAt.toISOString(),
        updatedAt: artifact.updatedAt.toISOString(),
      }
      yamlContent = stringify(artifactData)
    }

    // AC-2: Atomic write — mkdir parent dir first, write .tmp, rename to final
    const parentDir = path.dirname(outputPath)
    await mkdir(parentDir, { recursive: true })

    logger.info('Writing artifact to filesystem (atomic)', { storyId, artifactType, outputPath })
    await writeFile(tempPath, yamlContent, 'utf-8')

    try {
      await rename(tempPath, outputPath)
    } finally {
      // Cleanup .tmp if rename failed (KBAR-0030 lesson: always clean up temp files)
      try {
        await unlink(tempPath)
      } catch {
        // If file doesn't exist, that's fine (rename succeeded)
      }
    }

    // Update sync event to completed
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    await db
      .update(syncEvents)
      .set({ status: 'completed', filesChanged: 1, completedAt, durationMs })
      .where(eq(syncEvents.id, syncEventId))

    logger.info('Artifact sync from database completed', { storyId, artifactType, syncEventId })
    return SyncArtifactFromDatabaseOutputSchema.parse({
      success: true,
      storyId,
      artifactType,
      filePath: outputPath,
      syncStatus: 'synced',
      message: 'Artifact synced from database successfully',
      syncEventId,
      cacheHit,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to sync artifact from database', {
      storyId,
      artifactType,
      error: errorMessage,
      outputPath,
    })

    // Cleanup temp file on error
    try {
      await unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }

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

    return SyncArtifactFromDatabaseOutputSchema.parse({
      success: false,
      storyId,
      artifactType,
      syncStatus: 'failed',
      error: errorMessage,
      syncEventId,
    })
  }
}
