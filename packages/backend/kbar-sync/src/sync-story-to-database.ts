/**
 * Sync Story To Database
 * KBAR-0030: AC-1
 *
 * Syncs a story file from filesystem to PostgreSQL database.
 * Implements checksum-based change detection for idempotency.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { logger } from '@repo/logger'
import { parse } from 'yaml'
import { db } from '@repo/db'
import { kbarStories, artifacts, syncEvents } from '@repo/database-schema'
import { eq, and } from 'drizzle-orm'
import {
  SyncStoryToDatabaseInputSchema,
  SyncStoryToDatabaseOutputSchema,
  StoryFrontmatterSchema,
  type SyncStoryToDatabaseInput,
  type SyncStoryToDatabaseOutput,
  type StoryFrontmatter,
  computeChecksum,
  validateFilePath,
  validateNotSymlink,
  validateInput,
} from './__types__/index.js'

/**
 * Parse YAML story file and extract frontmatter
 */
function parseStoryFile(content: string): StoryFrontmatter {
  try {
    const parsed = parse(content)
    const validated = StoryFrontmatterSchema.parse(parsed)
    return validated
  } catch (error) {
    logger.error('Failed to parse story YAML', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(`YAML parse error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Sync story from filesystem to database
 *
 * @param input - Validated input (storyId, filePath, triggeredBy)
 * @returns Sync result with status, checksum, and syncEventId
 *
 * Implements:
 * - AC-1: Read YAML file, compute checksum, insert/update database
 * - AC-4: Checksum-based skip (idempotency)
 * - AC-6: Graceful error handling (never throws to caller)
 * - AC-7: Sync event tracking
 */
export async function syncStoryToDatabase(
  input: SyncStoryToDatabaseInput,
): Promise<SyncStoryToDatabaseOutput> {
  // Validate input using extracted helper (QUAL-003 fix)
  const validatedInput = validateInput(SyncStoryToDatabaseInputSchema, input, logger)
  if (!validatedInput) {
    return {
      success: false,
      storyId: input.storyId || 'unknown',
      syncStatus: 'failed',
      error: 'Input validation failed',
    }
  }

  const { storyId, filePath, triggeredBy } = validatedInput

  // SEC-001 fix: Validate file path to prevent directory traversal
  try {
    const baseDir = path.resolve(process.cwd(), 'plans') // Adjust base directory as needed
    validateFilePath(filePath, baseDir)
    await validateNotSymlink(filePath)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Path validation failed', { storyId, filePath, error: errorMessage })
    return {
      success: false,
      storyId,
      syncStatus: 'failed',
      error: `Security validation failed: ${errorMessage}`,
    }
  }

  let syncEventId: string | undefined
  const startedAt = new Date()

  try {
    // Create sync event (pending)
    const [syncEvent] = await db
      .insert(syncEvents)
      .values({
        eventType: 'story_sync_to_db',
        status: 'pending',
        storyId,
        filesScanned: 1,
        filesChanged: 0,
        metadata: { triggeredBy, syncMode: 'single_artifact' },
      })
      .returning({ id: syncEvents.id })

    syncEventId = syncEvent.id

    // Read file from filesystem
    logger.info('Reading story file', { storyId, filePath })
    const fileContent = await readFile(filePath, 'utf-8')

    // Compute checksum
    const checksum = computeChecksum(fileContent)
    logger.info('Computed checksum', { storyId, checksum: checksum.substring(0, 16) + '...' })

    // Parse YAML frontmatter
    const frontmatter = parseStoryFile(fileContent)

    // Use Drizzle transaction for atomicity
    const result = await db.transaction(async tx => {
      // Check if story exists
      const existingStory = await tx
        .select()
        .from(kbarStories)
        .where(eq(kbarStories.storyId, storyId))
        .limit(1)

      const storyDbId = existingStory[0]?.id

      // PERF-002 fix: Cache artifact lookup to avoid duplicate queries
      let existingArtifact: (typeof artifacts.$inferSelect)[] = []

      // Check if artifact exists and if checksum matches
      if (storyDbId) {
        existingArtifact = await tx
          .select()
          .from(artifacts)
          .where(and(eq(artifacts.storyId, storyDbId), eq(artifacts.artifactType, 'story_file')))
          .limit(1)

        // Checksum-based skip (idempotency - AC-4)
        if (existingArtifact[0]?.checksum === checksum) {
          logger.info('Checksum unchanged, skipping sync', { storyId, checksum })
          return { skipped: true, storyDbId, existingArtifact }
        }
      }

      // Insert or update story
      let finalStoryDbId: string

      if (existingStory.length > 0) {
        // Update existing story
        await tx
          .update(kbarStories)
          .set({
            epic: frontmatter.epic,
            title: frontmatter.title,
            description: frontmatter.description || null,
            storyType: frontmatter.story_type,
            priority: frontmatter.priority,
            complexity: frontmatter.complexity || null,
            storyPoints: frontmatter.story_points || null,
            currentPhase: frontmatter.current_phase,
            status: frontmatter.status,
            // QUAL-002 fix: Remove 'as any' cast - metadata schema defined in StoryFrontmatterSchema
            metadata: frontmatter.metadata || null,
            updatedAt: new Date(),
          })
          .where(eq(kbarStories.id, storyDbId!))

        finalStoryDbId = storyDbId!
        logger.info('Updated existing story', { storyId })
      } else {
        // Insert new story
        const [newStory] = await tx
          .insert(kbarStories)
          .values({
            storyId: frontmatter.story_id,
            epic: frontmatter.epic,
            title: frontmatter.title,
            description: frontmatter.description || null,
            storyType: frontmatter.story_type,
            priority: frontmatter.priority,
            complexity: frontmatter.complexity || null,
            storyPoints: frontmatter.story_points || null,
            currentPhase: frontmatter.current_phase,
            status: frontmatter.status,
            // QUAL-002 fix: Remove 'as any' cast - metadata schema defined in StoryFrontmatterSchema
            metadata: frontmatter.metadata || null,
          })
          .returning({ id: kbarStories.id })

        finalStoryDbId = newStory.id
        logger.info('Inserted new story', { storyId })
      }

      // PERF-002 fix: Reuse cached artifact lookup result instead of querying again
      // If we don't have the artifact (because story was new), query it now
      if (existingArtifact.length === 0 && storyDbId) {
        existingArtifact = await tx
          .select()
          .from(artifacts)
          .where(
            and(eq(artifacts.storyId, finalStoryDbId), eq(artifacts.artifactType, 'story_file')),
          )
          .limit(1)
      }

      if (existingArtifact.length > 0) {
        await tx
          .update(artifacts)
          .set({
            checksum,
            lastSyncedAt: new Date(),
            syncStatus: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(artifacts.id, existingArtifact[0].id))
      } else {
        await tx.insert(artifacts).values({
          storyId: finalStoryDbId,
          artifactType: 'story_file',
          filePath,
          checksum,
          lastSyncedAt: new Date(),
          syncStatus: 'completed',
          metadata: { sizeBytes: fileContent.length },
        })
      }

      return { skipped: false, storyDbId: finalStoryDbId }
    })

    // Update sync event to completed
    const completedAt = new Date()
    const durationMs = completedAt.getTime() - startedAt.getTime()

    await db
      .update(syncEvents)
      .set({
        status: result.skipped ? 'completed' : 'completed',
        filesChanged: result.skipped ? 0 : 1,
        completedAt,
        durationMs,
      })
      .where(eq(syncEvents.id, syncEventId))

    if (result.skipped) {
      return SyncStoryToDatabaseOutputSchema.parse({
        success: true,
        storyId,
        checksum,
        syncStatus: 'skipped',
        message: 'No changes detected (checksum unchanged)',
        syncEventId,
        skipped: true,
      })
    }

    logger.info('Sync completed successfully', { storyId, syncEventId })
    return SyncStoryToDatabaseOutputSchema.parse({
      success: true,
      storyId,
      checksum,
      syncStatus: 'completed',
      message: 'Story synced successfully',
      syncEventId,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to sync story to database', { storyId, error: errorMessage, filePath })

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

    return SyncStoryToDatabaseOutputSchema.parse({
      success: false,
      storyId,
      syncStatus: 'failed',
      error: errorMessage,
      syncEventId,
    })
  }
}
