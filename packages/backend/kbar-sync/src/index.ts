/**
 * KBAR Sync Package
 * KBAR-0030: Story sync service
 * KBAR-0040: Artifact sync service
 *
 * Exports all sync functions for bidirectional filesystem-database synchronization.
 *
 * Story sync functions (KBAR-0030):
 * - syncStoryToDatabase: Sync story file from filesystem to database
 * - syncStoryFromDatabase: Sync story from database back to filesystem
 * - detectSyncConflicts: Detect conflicts when both sides have changed
 *
 * Artifact sync functions (KBAR-0040):
 * - syncArtifactToDatabase: Sync a single non-story artifact FS→DB
 * - syncArtifactFromDatabase: Sync a single non-story artifact DB→FS
 * - detectArtifactConflicts: Detect conflicts for a non-story artifact
 * - batchSyncArtifactsForStory: Batch sync all artifacts for one story
 * - batchSyncByType: Cross-story batch sync by artifact type
 *
 * All functions use Zod validation, graceful error handling, and sync event tracking.
 */

// KBAR-0030: Core story sync functions
export { syncStoryToDatabase } from './sync-story-to-database.js'
export { syncStoryFromDatabase } from './sync-story-from-database.js'
export { detectSyncConflicts } from './detect-sync-conflicts.js'

// KBAR-0040: Artifact sync functions
export { syncArtifactToDatabase } from './sync-artifact-to-database.js'
export { syncArtifactFromDatabase } from './sync-artifact-from-database.js'
export { detectArtifactConflicts } from './detect-artifact-conflicts.js'
export { batchSyncArtifactsForStory } from './batch-sync-artifacts.js'
export { batchSyncByType } from './batch-sync-by-type.js'

// KBAR-0030: Type exports (re-export from __types__)
export type {
  SyncStoryToDatabaseInput,
  SyncStoryToDatabaseOutput,
  SyncStoryFromDatabaseInput,
  SyncStoryFromDatabaseOutput,
  DetectSyncConflictsInput,
  DetectSyncConflictsOutput,
  ConflictResolution,
  StoryFrontmatter,
  DbClient,
} from './__types__/index.js'

// KBAR-0040: Type exports
export type {
  NonStoryArtifactType,
  SyncArtifactToDatabaseInput,
  SyncArtifactToDatabaseOutput,
  SyncArtifactFromDatabaseInput,
  SyncArtifactFromDatabaseOutput,
  BatchSyncArtifactsInput,
  BatchSyncArtifactsOutput,
  ArtifactSyncResult,
  BatchSyncByTypeInput,
  BatchSyncByTypeOutput,
  DetectArtifactConflictsInput,
  DetectArtifactConflictsOutput,
} from './__types__/index.js'

// KBAR-0030: Schema exports (for validation in other packages)
export {
  SyncStoryToDatabaseInputSchema,
  SyncStoryToDatabaseOutputSchema,
  SyncStoryFromDatabaseInputSchema,
  SyncStoryFromDatabaseOutputSchema,
  DetectSyncConflictsInputSchema,
  DetectSyncConflictsOutputSchema,
  ConflictResolutionSchema,
  StoryFrontmatterSchema,
  DbClientSchema,
} from './__types__/index.js'

// KBAR-0040: Schema exports
export {
  NonStoryArtifactTypeSchema,
  ARTIFACT_FILENAME_MAP,
  SyncArtifactToDatabaseInputSchema,
  SyncArtifactToDatabaseOutputSchema,
  SyncArtifactFromDatabaseInputSchema,
  SyncArtifactFromDatabaseOutputSchema,
  BatchSyncArtifactsInputSchema,
  BatchSyncArtifactsOutputSchema,
  ArtifactSyncResultSchema,
  BatchSyncByTypeInputSchema,
  BatchSyncByTypeOutputSchema,
  DetectArtifactConflictsInputSchema,
  DetectArtifactConflictsOutputSchema,
} from './__types__/index.js'
