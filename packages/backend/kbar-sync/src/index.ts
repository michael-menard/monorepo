/**
 * KBAR Sync Package
 * KBAR-0030: KBAR sync service
 *
 * Exports all sync functions for bidirectional filesystem-database synchronization.
 *
 * Main functions:
 * - syncStoryToDatabase: Sync story file from filesystem to database
 * - syncStoryFromDatabase: Sync story from database back to filesystem
 * - detectSyncConflicts: Detect conflicts when both sides have changed
 *
 * All functions use Zod validation, graceful error handling, and sync event tracking.
 */

// Core sync functions
export { syncStoryToDatabase } from './sync-story-to-database.js'
export { syncStoryFromDatabase } from './sync-story-from-database.js'
export { detectSyncConflicts } from './detect-sync-conflicts.js'

// Type exports (re-export from __types__)
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

// Schema exports (for validation in other packages)
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
