/**
 * Sync Artifact To Database
 * KBAR-0040: AC-1, AC-3, AC-8
 *
 * Syncs a non-story artifact file from filesystem to PostgreSQL database.
 * Implements checksum-based change detection for idempotency (AC-1).
 * Upserts artifactContentCache with parsed YAML (AC-3).
 * Inserts artifactVersions record on content change (AC-3).
 * Path security: validateFilePath + validateNotSymlink before every I/O (AC-8).
 * 5MB file size hard limit (DECISIONS.yaml).
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { parse } from 'yaml'
import { db } from '@repo/db'
import {
  kbarStories,
  artifacts,
  artifactVersions,
  artifactContentCache,
  syncEvents,
} from '@repo/database-schema'
import { eq, and, max } from 'drizzle-orm'
import {
  SyncArtifactToDatabaseInputSchema,
  SyncArtifactToDatabaseOutputSchema,
  type SyncArtifactToDatabaseInput,
  type SyncArtifactToDatabaseOutput,
  computeChecksum,
  validateFilePath,
  validateNotSymlink,
  validateInput,
} from './__types__/index.js'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB hard limit per DECISIONS.yaml

/**
 * Sync a non-story artifact from filesystem to database
 *
 * @param input - Validated input (storyId, artifactType, filePath, triggeredBy)
 * @returns Sync result with status, checksum, and syncEventId
 *
 * Implements:
 * - AC-1: Checksum-based idempotency (skip if unchanged)
 * - AC-3: artifactContentCache upsert, artifactVersions insert on change
 * - AC-8: Path security (validateFilePath + validateNotSymlink)
 */
export async function syncArtifactToDatabase(
  input: SyncArtifactToDatabaseInput,
): Promise<SyncArtifactToDatabaseOutput> {
  const validatedInput = validateInput(SyncArtifactToDatabaseInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      artifactType: input.artifactType || 'unknown',
      syncStatus: 'failed',
      error: 'Input validation failed',
    }
  }

  const { storyId, artifactType, filePath, triggeredBy } = validatedInput

  // AC-8: Path security — validate before every I/O
  try {
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(filePath, baseDir)
    await validateNotSymlink(filePath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', { storyId, artifactType, filePath, error: errorMessage })
    return {
      success: false,
      storyId,
      artifactType,
      syncStatus: 'failed',
      error: `Security validation failed: ${errorMessage}`,
    }
  }

  let syncEventId!: string
  const startedAt = new Date()

  try {
    // Create sync event (pending) before I/O
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'artifact_sync_to_db',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        metadata: { triggeredBy, syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Read artifact file
    logger.info('Reading artifact file', { storyId, artifactType, filePath })
    const fileContent = await readFile(filePath, 'utf-8')
    const sizeBytes = Buffer.byteLength(fileContent, 'utf-8')

    // 5MB hard limit per DECISIONS.yaml
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      const errorMessage = `File too large: ${sizeBytes} bytes exceeds 5MB limit`
      logger.error('File size limit exceeded', { storyId, artifactType, filePath, sizeBytes })

      await db
        .update(syncEvents)
        .set({ status: 'failed', errorMessage, completedAt: new Date() })
        .where(eq(syncEvents.id, syncEventId))

      return {
        success: false,
        storyId,
        artifactType,
        syncStatus: 'failed',
        error: errorMessage,
        sizeBytes,
        syncEventId,
      }
    }

    const checksum = computeChecksum(fileContent)
    logger.info('Computed checksum', {
      storyId,
      artifactType,
      checksum: checksum.substring(0, 16) + '...',
    })

    // Use transaction for atomicity
    const result = await db.transaction(async tx => {
      // Look up story by storyId
      const [story] = await tx
        .select({ id: kbarStories.id })
        .from(kbarStories)
        .where(eq(kbarStories.storyId, storyId))
        .limit(1)

      if (!story) {
        throw new Error(`Story not found in database: ${storyId}`)
      }

      const storyDbId = story.id

      // Check for existing artifact with matching (storyId, artifactType, filePath)
      // NOTE: kbar.artifacts has no unique constraint on (storyId, artifactType) —
      // but we match on filePath to find the specific artifact row for this file.
      const [existingArtifact] = await tx
        .select()
        .from(artifacts)
        .where(
          and(
            eq(artifacts.storyId, storyDbId),
            eq(artifacts.artifactType, artifactType),
            eq(artifacts.filePath, filePath),
          ),
        )
        .limit(1)

      // Checksum-based idempotency (AC-1)
      if (existingArtifact?.checksum === checksum) {
        logger.info('Checksum unchanged, skipping artifact sync', {
          storyId,
          artifactType,
          checksum,
        })
        return { skipped: true, artifactId: existingArtifact.id }
      }

      let artifactId: string

      if (existingArtifact) {
        // Update existing artifact row
        await tx
          .update(artifacts)
          .set({
            checksum,
            lastSyncedAt: new Date(),
            syncStatus: 'completed',
            updatedAt: new Date(),
            metadata: { sizeBytes },
          })
          .where(eq(artifacts.id, existingArtifact.id))

        artifactId = existingArtifact.id
        logger.info('Updated existing artifact', { storyId, artifactType, artifactId })
      } else {
        // Insert new artifact row
        const [newArtifact] = await tx
          .insert(artifacts)
          .values({
            storyId: storyDbId,
            artifactType,
            filePath,
            checksum,
            lastSyncedAt: new Date(),
            syncStatus: 'completed',
            metadata: { sizeBytes },
          })
          .returning({ id: artifacts.id })

        artifactId = newArtifact.id
        logger.info('Inserted new artifact', { storyId, artifactType, artifactId })
      }

      // AC-3: Insert artifactVersions record on content change
      // MAX(version) inside transaction to avoid race conditions (KBAR-0030 lesson)
      const [versionRow] = await tx
        .select({ maxVersion: max(artifactVersions.version) })
        .from(artifactVersions)
        .where(eq(artifactVersions.artifactId, artifactId))

      const nextVersion = (versionRow?.maxVersion ?? 0) + 1

      await tx.insert(artifactVersions).values({
        artifactId,
        version: nextVersion,
        checksum,
        contentSnapshot: fileContent.length <= 100000 ? fileContent : undefined, // snapshot if <100KB
        changedBy: triggeredBy,
        changeReason: 'artifact_sync_to_db',
      })

      // AC-3: Upsert artifactContentCache
      // Try to parse as YAML; if parse fails, store raw string representation
      let parsedContent: Record<string, unknown>
      try {
        const parsed = parse(fileContent)
        parsedContent =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : { raw: parsed }
      } catch {
        logger.warn('YAML parse failed for artifact content cache — storing error marker', {
          storyId,
          artifactType,
          filePath,
        })
        parsedContent = { _parseError: true, sizeBytes }
      }

      // onConflictDoUpdate uses unique index on artifactId (artifact_content_cache_artifact_id_idx)
      await tx
        .insert(artifactContentCache)
        .values({
          artifactId,
          parsedContent,
          checksum,
          hitCount: 0,
          lastHitAt: null,
        })
        .onConflictDoUpdate({
          target: artifactContentCache.artifactId,
          set: {
            parsedContent,
            checksum,
            updatedAt: new Date(),
          },
        })

      return { skipped: false, artifactId }
    })

    // Update sync event to completed
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    await db
      .update(syncEvents)
      .set({
        status: 'completed',
        filesChanged: result.skipped ? 0 : 1,
        completedAt,
        durationMs,
      })
      .where(eq(syncEvents.id, syncEventId))

    if (result.skipped) {
      return SyncArtifactToDatabaseOutputSchema.parse({
        success: true,
        storyId,
        artifactType,
        checksum,
        syncStatus: 'skipped',
        message: 'No changes detected (checksum unchanged)',
        syncEventId,
        artifactId: result.artifactId,
        skipped: true,
        sizeBytes,
      })
    }

    logger.info('Artifact sync to database completed', { storyId, artifactType, syncEventId })
    return SyncArtifactToDatabaseOutputSchema.parse({
      success: true,
      storyId,
      artifactType,
      checksum,
      syncStatus: 'synced',
      message: 'Artifact synced successfully',
      syncEventId,
      artifactId: result.artifactId,
      sizeBytes,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to sync artifact to database', {
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

    return SyncArtifactToDatabaseOutputSchema.parse({
      success: false,
      storyId,
      artifactType,
      syncStatus: 'failed',
      error: errorMessage,
      syncEventId,
    })
  }
}
