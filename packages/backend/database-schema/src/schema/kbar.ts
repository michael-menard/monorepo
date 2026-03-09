/**
 * KBAR (Knowledge Base Artifact Repository) Database Schema
 *
 * This schema defines the KBAR platform tables in the 'kbar' PostgreSQL schema.
 * It's isolated from the main application schema for separation of concerns.
 *
 * Story KBAR-0010: Database Schema Migrations
 *
 * Schema Isolation:
 * - All tables are in the 'kbar' PostgreSQL schema namespace
 * - Completely isolated from application data (public schema)
 * - Designed for autonomous development workflow knowledge management
 *
 * Schema Groups:
 * 1. Story Management - Stories, story_states, story_dependencies
 * 2. Artifact Management - Artifacts, artifact_versions, artifact_content_cache
 * 3. Sync State - Sync_events, sync_conflicts, sync_checkpoints
 * 4. Index Generation - Index_metadata, index_entries
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Define the 'kbar' PostgreSQL schema namespace
export const kbarSchema = pgSchema('kbar')

// ============================================================================
// ENUMS (defined in public schema for cross-namespace reusability)
// ============================================================================

/**
 * Story Phase Enum
 * Defines the SDLC phases for story execution
 */
export const kbarStoryPhaseEnum = pgEnum('kbar_story_phase', [
  'setup',
  'plan',
  'execute',
  'review',
  'qa',
  'done',
])

/**
 * Artifact Type Enum
 * Defines types of artifacts tracked in the system
 */
export const kbarArtifactTypeEnum = pgEnum('kbar_artifact_type', [
  'story_file',
  'elaboration',
  'plan',
  'scope',
  'evidence',
  'review',
  'test_plan',
  'decisions',
  'checkpoint',
  'knowledge_context',
])

/**
 * Sync Status Enum
 * Defines synchronization states for artifacts
 */
export const kbarSyncStatusEnum = pgEnum('kbar_sync_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'conflict',
])

/**
 * Dependency Type Enum
 * Defines relationship types between stories
 */
export const kbarDependencyTypeEnum = pgEnum('kbar_dependency_type', [
  'blocks',
  'requires',
  'related_to',
  'enhances',
])

/**
 * Story Priority Enum
 * Defines priority levels for story scheduling
 */
export const kbarStoryPriorityEnum = pgEnum('kbar_story_priority', ['P0', 'P1', 'P2', 'P3', 'P4'])

/**
 * Conflict Resolution Enum
 * Defines how sync conflicts are resolved
 */
export const kbarConflictResolutionEnum = pgEnum('kbar_conflict_resolution', [
  'filesystem_wins',
  'database_wins',
  'manual',
  'merged',
  'deferred',
])

// ============================================================================
// 1. STORY MANAGEMENT SCHEMA
// ============================================================================

/**
 * Stories Table
 * Tracks all user stories, features, and bug fixes with metadata
 * Related AC: AC-2
 */
export const stories = kbarSchema.table(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull().unique(), // e.g., "KBAR-0010", "BUGF-001"

    // Classification
    epic: text('epic').notNull(), // Epic identifier (e.g., 'KBAR', 'BUGF', 'WINT')
    title: text('title').notNull(),
    description: text('description'),
    storyType: text('story_type').notNull(), // 'feature', 'bug', 'infra', 'docs'

    // Priority and effort
    priority: kbarStoryPriorityEnum('priority').notNull().default('P2'),
    complexity: text('complexity'), // 'low', 'medium', 'high'
    storyPoints: integer('story_points'),

    // Phase tracking
    currentPhase: kbarStoryPhaseEnum('current_phase').notNull().default('setup'),

    // Status
    status: text('status').notNull().default('backlog'), // 'backlog', 'ready', 'in_progress', 'ready_for_qa', 'completed'

    // Metadata
    metadata: jsonb('metadata').$type<{
      surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
      tags?: string[]
      wave?: number
      blocked_by?: string[]
      blocks?: string[]
      feature_dir?: string
    }>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: uniqueIndex('stories_story_id_idx').on(table.storyId),
    epicIdx: index('stories_epic_idx').on(table.epic),
    currentPhaseIdx: index('stories_current_phase_idx').on(table.currentPhase),
    statusIdx: index('stories_status_idx').on(table.status),
    epicPhaseIdx: index('stories_epic_phase_idx').on(table.epic, table.currentPhase),
  }),
)

/**
 * Story States Table
 * Tracks historical phase transitions for stories
 * Related AC: AC-2
 */
export const storyStates = kbarSchema.table(
  'story_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    phase: kbarStoryPhaseEnum('phase').notNull(),
    status: text('status').notNull(), // 'entered', 'completed', 'failed', 'skipped'

    // Timing
    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow(),
    exitedAt: timestamp('exited_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'), // Computed when exitedAt is set

    // Context
    triggeredBy: text('triggered_by'), // 'user', 'agent', 'automation'
    metadata: jsonb('metadata').$type<{
      agentName?: string
      iteration?: number
      errorMessage?: string
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_states_story_id_idx').on(table.storyId),
    phaseIdx: index('story_states_phase_idx').on(table.phase),
    enteredAtIdx: index('story_states_entered_at_idx').on(table.enteredAt),
    storyPhaseIdx: index('story_states_story_phase_idx').on(table.storyId, table.phase),
  }),
)

/**
 * Story Dependencies Table
 * Tracks dependencies between stories for scheduling and planning
 * Related AC: AC-2
 */
export const storyDependencies = kbarSchema.table(
  'story_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    dependsOnStoryId: uuid('depends_on_story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    dependencyType: kbarDependencyTypeEnum('dependency_type').notNull(),

    // Status tracking
    resolved: boolean('resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    // Context
    metadata: jsonb('metadata').$type<{
      reason?: string
      criticality?: 'high' | 'medium' | 'low'
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_dependencies_story_id_idx').on(table.storyId),
    dependsOnIdx: index('story_dependencies_depends_on_idx').on(table.dependsOnStoryId),
    // Unique constraint to prevent duplicate dependencies
    uniqueDependency: uniqueIndex('story_dependencies_unique').on(
      table.storyId,
      table.dependsOnStoryId,
      table.dependencyType,
    ),
  }),
)

// ============================================================================
// 2. ARTIFACT MANAGEMENT SCHEMA
// ============================================================================

/**
 * Artifacts Table
 * Tracks all story artifacts (YAML files, markdown docs, etc.)
 * Related AC: AC-3
 */
export const artifacts = kbarSchema.table(
  'artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // Artifact identification
    artifactType: kbarArtifactTypeEnum('artifact_type').notNull(),
    filePath: text('file_path').notNull(), // Relative path from repo root

    // Sync tracking
    checksum: text('checksum').notNull(), // SHA-256 hash for change detection
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    syncStatus: kbarSyncStatusEnum('sync_status').notNull().default('pending'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      phase?: string
      version?: number
      sizeBytes?: number
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('artifacts_story_id_idx').on(table.storyId),
    artifactTypeIdx: index('artifacts_artifact_type_idx').on(table.artifactType),
    filePathIdx: index('artifacts_file_path_idx').on(table.filePath),
    syncStatusIdx: index('artifacts_sync_status_idx').on(table.syncStatus),
    storyArtifactTypeIdx: index('artifacts_story_artifact_type_idx').on(
      table.storyId,
      table.artifactType,
    ),
  }),
)

/**
 * Artifact Versions Table
 * Tracks version history of artifacts for audit and rollback
 * Related AC: AC-3
 */
export const artifactVersions = kbarSchema.table(
  'artifact_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),

    // Version tracking
    version: integer('version').notNull(), // Sequential version number
    checksum: text('checksum').notNull(), // SHA-256 hash of this version

    // Content snapshot
    contentSnapshot: text('content_snapshot'), // Full file content at this version

    // Change metadata
    changedBy: text('changed_by'), // 'user', 'agent_name', 'sync'
    changeReason: text('change_reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    artifactIdIdx: index('artifact_versions_artifact_id_idx').on(table.artifactId),
    versionIdx: index('artifact_versions_version_idx').on(table.version),
    createdAtIdx: index('artifact_versions_created_at_idx').on(table.createdAt),
    artifactVersionIdx: index('artifact_versions_artifact_version_idx').on(
      table.artifactId,
      table.version,
    ),
  }),
)

/**
 * Artifact Content Cache Table
 * Caches parsed YAML content for fast access (avoids re-parsing files)
 * Related AC: AC-3
 */
export const artifactContentCache = kbarSchema.table(
  'artifact_content_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),

    // Cached data
    parsedContent: jsonb('parsed_content').notNull().$type<Record<string, unknown>>(),
    checksum: text('checksum').notNull(), // Must match artifact.checksum to be valid

    // Cache metadata
    hitCount: integer('hit_count').notNull().default(0),
    lastHitAt: timestamp('last_hit_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // TTL for cache invalidation

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    artifactIdIdx: uniqueIndex('artifact_content_cache_artifact_id_idx').on(table.artifactId),
    checksumIdx: index('artifact_content_cache_checksum_idx').on(table.checksum),
    expiresAtIdx: index('artifact_content_cache_expires_at_idx').on(table.expiresAt),
  }),
)

// ============================================================================
// 3. SYNC STATE SCHEMA
// ============================================================================

/**
 * Sync Events Table
 * Tracks all filesystem-to-database sync operations
 * Related AC: AC-4
 */
export const syncEvents = kbarSchema.table(
  'sync_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Event identification
    eventType: text('event_type').notNull(), // 'full_sync', 'incremental_sync', 'artifact_sync'
    status: kbarSyncStatusEnum('status').notNull().default('pending'),

    // Sync scope
    storyId: text('story_id'), // Null for full repo sync
    artifactId: uuid('artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),

    // Results
    filesScanned: integer('files_scanned').notNull().default(0),
    filesChanged: integer('files_changed').notNull().default(0),
    conflictsDetected: integer('conflicts_detected').notNull().default(0),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Error handling
    errorMessage: text('error_message'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      triggeredBy?: 'user' | 'automation' | 'agent'
      syncMode?: 'full' | 'incremental' | 'single_artifact'
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    eventTypeIdx: index('sync_events_event_type_idx').on(table.eventType),
    statusIdx: index('sync_events_status_idx').on(table.status),
    storyIdIdx: index('sync_events_story_id_idx').on(table.storyId),
    startedAtIdx: index('sync_events_started_at_idx').on(table.startedAt),
  }),
)

/**
 * Sync Conflicts Table
 * Logs conflicts detected during sync operations for resolution
 * Related AC: AC-4
 */
export const syncConflicts = kbarSchema.table(
  'sync_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    syncEventId: uuid('sync_event_id')
      .notNull()
      .references(() => syncEvents.id, { onDelete: 'cascade' }),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, { onDelete: 'cascade' }),

    // Conflict details
    conflictType: text('conflict_type').notNull(), // 'checksum_mismatch', 'missing_file', 'schema_error'
    filesystemChecksum: text('filesystem_checksum').notNull(),
    databaseChecksum: text('database_checksum').notNull(),

    // Resolution
    resolution: kbarConflictResolutionEnum('resolution'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by'), // 'automation', 'user', agent name

    // Context
    metadata: jsonb('metadata').$type<{
      filesystemPath?: string
      errorDetails?: string
      manualNotes?: string
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    syncEventIdIdx: index('sync_conflicts_sync_event_id_idx').on(table.syncEventId),
    artifactIdIdx: index('sync_conflicts_artifact_id_idx').on(table.artifactId),
    resolutionIdx: index('sync_conflicts_resolution_idx').on(table.resolution),
    createdAtIdx: index('sync_conflicts_created_at_idx').on(table.createdAt),
  }),
)

/**
 * Sync Checkpoints Table
 * Tracks incremental sync progress for resumption after failures
 * Related AC: AC-4
 */
export const syncCheckpoints = kbarSchema.table(
  'sync_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Checkpoint identification
    checkpointName: text('checkpoint_name').notNull().unique(),
    checkpointType: text('checkpoint_type').notNull(), // 'epic', 'story', 'artifact_type'

    // Progress tracking
    lastProcessedPath: text('last_processed_path'), // Last successfully processed file path
    lastProcessedTimestamp: timestamp('last_processed_timestamp', { withTimezone: true }),

    // Metrics
    totalProcessed: integer('total_processed').notNull().default(0),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    checkpointNameIdx: uniqueIndex('sync_checkpoints_checkpoint_name_idx').on(table.checkpointName),
    checkpointTypeIdx: index('sync_checkpoints_checkpoint_type_idx').on(table.checkpointType),
    isActiveIdx: index('sync_checkpoints_is_active_idx').on(table.isActive),
  }),
)

// ============================================================================
// 4. INDEX GENERATION SCHEMA
// ============================================================================

/**
 * Index Metadata Table
 * Tracks generated index files (stories.index.md, etc.)
 * Related AC: AC-5
 */
export const indexMetadata = kbarSchema.table(
  'index_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Index identification
    indexName: text('index_name').notNull().unique(), // e.g., 'platform.stories.index', 'bug-fix.stories.index'
    indexType: text('index_type').notNull(), // 'epic', 'feature_area', 'global'
    filePath: text('file_path').notNull(), // Relative path from repo root

    // Sync state
    checksum: text('checksum').notNull(), // SHA-256 hash of generated index file
    lastGeneratedAt: timestamp('last_generated_at', { withTimezone: true }).notNull().defaultNow(),

    // Hierarchy - self-referencing (must cast to any to avoid circular reference error)
    parentIndexId: uuid('parent_index_id').references((): any => indexMetadata.id, {
      onDelete: 'set null',
    }),

    // Metadata
    metadata: jsonb('metadata').$type<{
      epic?: string
      totalStories?: number
      storyTypes?: string[]
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    indexNameIdx: uniqueIndex('index_metadata_index_name_idx').on(table.indexName),
    indexTypeIdx: index('index_metadata_index_type_idx').on(table.indexType),
    parentIndexIdIdx: index('index_metadata_parent_index_id_idx').on(table.parentIndexId),
    filePathIdx: index('index_metadata_file_path_idx').on(table.filePath),
  }),
)

/**
 * Index Entries Table
 * Tracks individual story entries within index files
 * Related AC: AC-5
 */
export const indexEntries = kbarSchema.table(
  'index_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    indexId: uuid('index_id')
      .notNull()
      .references(() => indexMetadata.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // Entry details
    sortOrder: integer('sort_order').notNull(), // Position in index
    sectionName: text('section_name'), // e.g., 'In Progress', 'Done', 'Backlog'

    // Metadata
    metadata: jsonb('metadata').$type<{
      completionPercentage?: number
      lastUpdated?: string
      dependencies?: string[]
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    indexIdIdx: index('index_entries_index_id_idx').on(table.indexId),
    storyIdIdx: index('index_entries_story_id_idx').on(table.storyId),
    sortOrderIdx: index('index_entries_sort_order_idx').on(table.sortOrder),
    indexSortIdx: index('index_entries_index_sort_idx').on(table.indexId, table.sortOrder),
    // Unique constraint to prevent duplicate entries
    uniqueEntry: uniqueIndex('index_entries_unique').on(table.indexId, table.storyId),
  }),
)

// ============================================================================
// RELATIONS
// ============================================================================

// Story Management Relations
export const storiesRelations = relations(stories, ({ many }) => ({
  states: many(storyStates),
  dependencies: many(storyDependencies, { relationName: 'story_dependencies' }),
  dependents: many(storyDependencies, { relationName: 'story_dependents' }),
  artifacts: many(artifacts),
  indexEntries: many(indexEntries),
}))

export const storyStatesRelations = relations(storyStates, ({ one }) => ({
  story: one(stories, {
    fields: [storyStates.storyId],
    references: [stories.id],
  }),
}))

export const storyDependenciesRelations = relations(storyDependencies, ({ one }) => ({
  story: one(stories, {
    fields: [storyDependencies.storyId],
    references: [stories.id],
    relationName: 'story_dependencies',
  }),
  dependsOnStory: one(stories, {
    fields: [storyDependencies.dependsOnStoryId],
    references: [stories.id],
    relationName: 'story_dependents',
  }),
}))

// Artifact Management Relations
export const artifactsRelations = relations(artifacts, ({ one, many }) => ({
  story: one(stories, {
    fields: [artifacts.storyId],
    references: [stories.id],
  }),
  versions: many(artifactVersions),
  contentCache: one(artifactContentCache),
}))

export const artifactVersionsRelations = relations(artifactVersions, ({ one }) => ({
  artifact: one(artifacts, {
    fields: [artifactVersions.artifactId],
    references: [artifacts.id],
  }),
}))

export const artifactContentCacheRelations = relations(artifactContentCache, ({ one }) => ({
  artifact: one(artifacts, {
    fields: [artifactContentCache.artifactId],
    references: [artifacts.id],
  }),
}))

// Sync State Relations
export const syncEventsRelations = relations(syncEvents, ({ many }) => ({
  conflicts: many(syncConflicts),
}))

export const syncConflictsRelations = relations(syncConflicts, ({ one }) => ({
  syncEvent: one(syncEvents, {
    fields: [syncConflicts.syncEventId],
    references: [syncEvents.id],
  }),
  artifact: one(artifacts, {
    fields: [syncConflicts.artifactId],
    references: [artifacts.id],
  }),
}))

// Index Generation Relations
export const indexMetadataRelations = relations(indexMetadata, ({ one, many }) => ({
  parentIndex: one(indexMetadata, {
    fields: [indexMetadata.parentIndexId],
    references: [indexMetadata.id],
    relationName: 'parent_child',
  }),
  childIndexes: many(indexMetadata, { relationName: 'parent_child' }),
  entries: many(indexEntries),
}))

export const indexEntriesRelations = relations(indexEntries, ({ one }) => ({
  index: one(indexMetadata, {
    fields: [indexEntries.indexId],
    references: [indexMetadata.id],
  }),
  story: one(stories, {
    fields: [indexEntries.storyId],
    references: [stories.id],
  }),
}))

// ============================================================================
// ZOD SCHEMAS (Auto-generated via drizzle-zod)
// ============================================================================

// Story Management Zod Schemas
export const insertStorySchema = createInsertSchema(stories)
export const selectStorySchema = createSelectSchema(stories)
export type InsertStory = z.infer<typeof insertStorySchema>
export type SelectStory = z.infer<typeof selectStorySchema>

export const insertStoryStateSchema = createInsertSchema(storyStates)
export const selectStoryStateSchema = createSelectSchema(storyStates)
export type InsertStoryState = z.infer<typeof insertStoryStateSchema>
export type SelectStoryState = z.infer<typeof selectStoryStateSchema>

export const insertStoryDependencySchema = createInsertSchema(storyDependencies)
export const selectStoryDependencySchema = createSelectSchema(storyDependencies)
export type InsertStoryDependency = z.infer<typeof insertStoryDependencySchema>
export type SelectStoryDependency = z.infer<typeof selectStoryDependencySchema>

// Artifact Management Zod Schemas
export const insertArtifactSchema = createInsertSchema(artifacts)
export const selectArtifactSchema = createSelectSchema(artifacts)
export type InsertArtifact = z.infer<typeof insertArtifactSchema>
export type SelectArtifact = z.infer<typeof selectArtifactSchema>

export const insertArtifactVersionSchema = createInsertSchema(artifactVersions)
export const selectArtifactVersionSchema = createSelectSchema(artifactVersions)
export type InsertArtifactVersion = z.infer<typeof insertArtifactVersionSchema>
export type SelectArtifactVersion = z.infer<typeof selectArtifactVersionSchema>

export const insertArtifactContentCacheSchema = createInsertSchema(artifactContentCache)
export const selectArtifactContentCacheSchema = createSelectSchema(artifactContentCache)
export type InsertArtifactContentCache = z.infer<typeof insertArtifactContentCacheSchema>
export type SelectArtifactContentCache = z.infer<typeof selectArtifactContentCacheSchema>

// Sync State Zod Schemas
export const insertSyncEventSchema = createInsertSchema(syncEvents)
export const selectSyncEventSchema = createSelectSchema(syncEvents)
export type InsertSyncEvent = z.infer<typeof insertSyncEventSchema>
export type SelectSyncEvent = z.infer<typeof selectSyncEventSchema>

export const insertSyncConflictSchema = createInsertSchema(syncConflicts)
export const selectSyncConflictSchema = createSelectSchema(syncConflicts)
export type InsertSyncConflict = z.infer<typeof insertSyncConflictSchema>
export type SelectSyncConflict = z.infer<typeof selectSyncConflictSchema>

export const insertSyncCheckpointSchema = createInsertSchema(syncCheckpoints)
export const selectSyncCheckpointSchema = createSelectSchema(syncCheckpoints)
export type InsertSyncCheckpoint = z.infer<typeof insertSyncCheckpointSchema>
export type SelectSyncCheckpoint = z.infer<typeof selectSyncCheckpointSchema>

// Index Generation Zod Schemas
export const insertIndexMetadataSchema = createInsertSchema(indexMetadata)
export const selectIndexMetadataSchema = createSelectSchema(indexMetadata)
export type InsertIndexMetadata = z.infer<typeof insertIndexMetadataSchema>
export type SelectIndexMetadata = z.infer<typeof selectIndexMetadataSchema>

export const insertIndexEntrySchema = createInsertSchema(indexEntries)
export const selectIndexEntrySchema = createSelectSchema(indexEntries)
export type InsertIndexEntry = z.infer<typeof insertIndexEntrySchema>
export type SelectIndexEntry = z.infer<typeof selectIndexEntrySchema>
