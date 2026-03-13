/**
 * Knowledge Base Database Schema
 *
 * This schema defines tables for storing knowledge entries with vector embeddings
 * for semantic search functionality.
 *
 * IMPORTANT:
 * - VECTOR(1536) dimension is tied to OpenAI text-embedding-3-small model
 * - Changing the embedding model requires a schema migration to update the dimension
 * - See: https://platform.openai.com/docs/guides/embeddings
 *
 * @see KNOW-002 for embedding client implementation
 */

import {
  pgTable,
  pgSchema,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  customType,
  jsonb,
  boolean,
  integer,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * Custom Drizzle column type for pgvector VECTOR columns.
 *
 * This type handles serialization/deserialization between JavaScript number arrays
 * and PostgreSQL vector format.
 *
 * @example
 * // In schema definition
 * embedding: vector('embedding', { dimensions: 1536 }).notNull()
 *
 * // In queries
 * const embedding = [0.1, 0.2, ...] // 1536 floats
 * await db.insert(knowledgeEntries).values({ embedding })
 */
export const vector = customType<{
  data: number[]
  driverData: string
  config: { dimensions: number }
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    // Parse PostgreSQL vector format: [0.1,0.2,0.3,...]
    const cleaned = value.replace(/^\[|\]$/g, '')
    return cleaned.split(',').map(Number)
  },
})

/**
 * Knowledge Entries Table
 *
 * Stores knowledge content with vector embeddings for semantic search.
 * Each entry represents a piece of knowledge (e.g., a documentation section,
 * a best practice, or a workflow description).
 *
 * Roles:
 * - 'pm' - Product manager knowledge
 * - 'dev' - Developer knowledge
 * - 'qa' - QA/testing knowledge
 * - 'all' - Universal knowledge applicable to all roles
 *
 * Entry Types (KBMEM 3-bucket architecture):
 * - 'note' - General notes and documentation
 * - 'decision' - Architecture Decision Records (ADRs)
 * - 'constraint' - Project/epic/story constraints
 * - 'runbook' - Step-by-step operational procedures
 * - 'lesson' - Lessons learned from implementation
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */
export const knowledgeEntries = pgTable(
  'knowledge_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * The knowledge content text.
     * This is the human-readable content that will be displayed to users.
     */
    content: text('content').notNull(),

    /**
     * Vector embedding of the content.
     *
     * DIMENSION: 1536 (OpenAI text-embedding-3-small)
     *
     * If you change the embedding model, you MUST:
     * 1. Update this dimension to match the new model's output
     * 2. Re-generate embeddings for all existing entries
     * 3. Update the IVFFlat index (may need different lists parameter)
     *
     * Common dimensions:
     * - OpenAI text-embedding-3-small: 1536
     * - OpenAI text-embedding-3-large: 3072
     * - OpenAI text-embedding-ada-002: 1536 (legacy)
     */
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),

    /**
     * Role that this knowledge is most relevant for.
     *
     * Values: 'pm' | 'dev' | 'qa' | 'all'
     */
    role: text('role').notNull(),

    /**
     * Type of knowledge entry.
     *
     * Values: 'note' | 'decision' | 'constraint' | 'runbook' | 'lesson'
     *
     * @see KBMEM-001 for implementation details
     */
    entryType: text('entry_type').notNull().default('note'),

    /**
     * Optional story ID this entry is linked to.
     *
     * Examples: 'WISH-2045', 'KBMEM-001'
     */
    storyId: text('story_id'),

    /**
     * Tags for categorization and filtering.
     *
     * Stored as TEXT[] (PostgreSQL array).
     * Examples: ['workflow', 'best-practice', 'setup']
     */
    tags: text('tags').array(),

    /**
     * Whether this entry has been verified for accuracy.
     * Entries are verified when cited in QA-passed PROOF documents.
     */
    verified: boolean('verified').default(false),

    /**
     * Timestamp when the entry was verified.
     */
    verifiedAt: timestamp('verified_at'),

    /**
     * Who verified the entry.
     * Format: 'qa-gate:{story_id}' for automated, 'human:{name}' for manual
     */
    verifiedBy: text('verified_by'),

    /** When the entry was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the entry was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    /**
     * Whether this entry has been archived (superseded by a canonical entry).
     * Archived entries are excluded from compression runs and search by default.
     *
     * @see WKFL-009 for KB compression implementation
     */
    archived: boolean('archived').default(false).notNull(),

    /**
     * Timestamp when the entry was archived.
     * Set when archived is changed to true.
     */
    archivedAt: timestamp('archived_at'),

    /**
     * UUID of the canonical entry that replaced this archived entry.
     * Self-referential FK to knowledge_entries.id.
     */
    canonicalId: uuid('canonical_id').references(() => knowledgeEntries.id),

    /**
     * Whether this entry is a canonical (merged) entry created by compression.
     * Canonical entries represent the deduplicated, merged version of similar entries.
     */
    isCanonical: boolean('is_canonical').default(false).notNull(),

    /** Soft-delete: timestamp when this entry was deleted (null = active) */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /** Soft-delete: who deleted this entry (agent ID or user) */
    deletedBy: text('deleted_by'),
  },
  table => ({
    /**
     * NOTE: The IVFFlat index on embedding is created in the migration SQL
     * because Drizzle doesn't natively support pgvector's IVFFlat index type.
     *
     * See: src/db/migrations/0000_initial_schema.sql for index definition.
     * Configuration: lists=100, vector_cosine_ops (cosine similarity)
     *
     * For performance tuning with larger datasets, see KNOW-007.
     */

    /** Index for filtering by role */
    roleIdx: index('knowledge_entries_role_idx').on(table.role),

    /** Index for filtering by entry type */
    entryTypeIdx: index('knowledge_entries_entry_type_idx').on(table.entryType),

    /** Index for filtering by story */
    storyIdIdx: index('knowledge_entries_story_id_idx').on(table.storyId),

    /** Index for created_at for ordering */
    createdAtIdx: index('knowledge_entries_created_at_idx').on(table.createdAt),

    /** Partial index for non-archived entries (used by compression queries) */
    archivedIdx: index('knowledge_entries_archived_idx').on(table.archived),

    /** Partial index for canonical entries */
    isCanonicalIdx: index('knowledge_entries_is_canonical_idx').on(table.isCanonical),
  }),
)

/**
 * Embedding Cache Table
 *
 * Caches embeddings by content hash to avoid redundant API calls.
 * Uses composite key of (content_hash, model) to support multiple embedding models.
 *
 * Cache strategy:
 * - Before calling OpenAI API, check if (content_hash, model) exists
 * - If exists, return cached embedding
 * - If not, generate embedding and cache it
 *
 * Model versioning:
 * - Same text with different models creates separate cache entries
 * - Enables model upgrades without cache corruption
 * - Model version changes trigger cache miss (correct behavior)
 *
 * @see KNOW-002 for embedding client implementation with caching
 */
export const embeddingCache = pgTable(
  'embedding_cache',
  {
    /**
     * Unique ID for each cache entry
     */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * SHA-256 hash of the content.
     *
     * Example: 'a7ffc6f8bf1ed766...'
     */
    contentHash: text('content_hash').notNull(),

    /**
     * Embedding model used to generate this embedding.
     *
     * Examples: 'text-embedding-3-small', 'text-embedding-3-large'
     *
     * This is part of the composite unique constraint with content_hash
     * to support multiple models for the same content.
     */
    model: text('model').notNull(),

    /**
     * Cached vector embedding.
     *
     * Dimension: 1536 (for text-embedding-3-small)
     * Note: Different models may have different dimensions
     */
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),

    /** When the cache entry was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    /**
     * Composite index on (content_hash, model) for fast lookups
     * Note: The UNIQUE constraint is created in the migration SQL
     * because Drizzle doesn't natively support .unique() on composite indexes
     *
     * See: src/db/migrations/0001_add_model_to_embedding_cache.sql
     */
    contentModelIdx: index('embedding_cache_content_model_idx').on(table.contentHash, table.model),
  }),
)

/**
 * Audit Log Table
 *
 * Stores audit trail of all knowledge entry modifications (add, update, delete).
 * Used for compliance, debugging, and operational transparency.
 *
 * Design decisions:
 * - entry_id uses ON DELETE SET NULL to preserve audit history after entry deletion
 * - previous_value and new_value store JSONB snapshots (embedding excluded)
 * - user_context stores MCP session metadata when available
 *
 * @see KNOW-018 for audit logging requirements
 */
export const auditLog = pgTable(
  'audit_log',
  {
    /** Unique identifier for the audit log entry */
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * ID of the knowledge entry being audited.
     *
     * Nullable because:
     * - ON DELETE SET NULL preserves audit history after entry deletion
     * - Allows audit log to outlive the entry for compliance requirements
     */
    entryId: uuid('entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),

    /**
     * Type of operation performed.
     *
     * Values: 'add' | 'update' | 'delete'
     */
    operation: text('operation').notNull(),

    /**
     * Entry state before the operation.
     *
     * - null for 'add' operations (no previous state)
     * - JSONB snapshot for 'update' and 'delete' operations
     * - Embedding vectors are excluded (too large)
     */
    previousValue: jsonb('previous_value'),

    /**
     * Entry state after the operation.
     *
     * - JSONB snapshot for 'add' and 'update' operations
     * - null for 'delete' operations (no new state)
     * - Embedding vectors are excluded (too large)
     */
    newValue: jsonb('new_value'),

    /**
     * When the operation occurred.
     *
     * UTC timestamp for consistent ordering and retention policy.
     */
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

    /**
     * MCP session context.
     *
     * Stores available metadata:
     * - correlation_id (for request tracing)
     * - client info (if available from MCP)
     * - session metadata
     */
    userContext: jsonb('user_context'),

    /** When the audit log entry was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    /** Index for querying audit history by entry */
    entryIdIdx: index('audit_log_entry_id_idx').on(table.entryId),

    /** Index for time range queries and retention cleanup */
    timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),

    /** Composite index for sorted history retrieval by entry */
    entryTimestampIdx: index('audit_log_entry_timestamp_idx').on(table.entryId, table.timestamp),
  }),
)

/**
 * Tasks Table (Bucket C - Task Backlog)
 *
 * Stores follow-up tasks, bugs, improvements, and feature ideas
 * discovered during story implementation.
 *
 * Task types:
 * - 'follow_up' - Direct follow-up from current work
 * - 'improvement' - Nice-to-have enhancement
 * - 'bug' - Discovered defect
 * - 'tech_debt' - Cleanup/refactor
 * - 'feature_idea' - Future feature
 *
 * @see KBMEM-002 for implementation details
 * @see plans/future/kb-memory-architecture/PLAN.md
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Task title (required) */
    title: text('title').notNull(),

    /** Detailed description (optional) */
    description: text('description'),

    /** Story where this task was discovered */
    sourceStoryId: text('source_story_id'),

    /** Workflow phase when discovered (impl, review, qa) */
    sourcePhase: text('source_phase'),

    /** Agent that created this task */
    sourceAgent: text('source_agent'),

    /**
     * Type of task.
     * Values: 'follow_up' | 'improvement' | 'bug' | 'tech_debt' | 'feature_idea'
     */
    taskType: text('task_type').notNull(),

    /**
     * Priority level (set during triage).
     * Values: 'p0' (critical) | 'p1' (high) | 'p2' (medium) | 'p3' (low)
     */
    priority: text('priority'),

    /**
     * Lifecycle status.
     * Values: 'open' | 'triaged' | 'in_progress' | 'blocked' | 'done' | 'wont_do' | 'promoted'
     */
    status: text('status').notNull().default('open'),

    /** Reference to task that blocks this one */
    blockedBy: uuid('blocked_by'),

    /** Array of related knowledge entry UUIDs */
    relatedKbEntries: text('related_kb_entries').array().$type<string[]>(),

    /** Story ID if this task was promoted to a story */
    promotedToStory: text('promoted_to_story'),

    /** Tags for categorization */
    tags: text('tags').array(),

    /**
     * Effort estimate.
     * Values: 'xs' (<1h) | 's' (1-4h) | 'm' (4-8h) | 'l' (1-2d) | 'xl' (2-5d)
     */
    estimatedEffort: text('estimated_effort'),

    /** When the task was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the task was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    /** When the task was completed */
    completedAt: timestamp('completed_at'),

    /** Soft-delete: timestamp when this task was deleted (null = active) */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /** Soft-delete: who deleted this task (agent ID or user) */
    deletedBy: text('deleted_by'),
  },
  table => ({
    statusIdx: index('idx_tasks_status').on(table.status),
    sourceStoryIdx: index('idx_tasks_source_story').on(table.sourceStoryId),
    typePriorityIdx: index('idx_tasks_type_priority').on(table.taskType, table.priority),
    createdAtIdx: index('idx_tasks_created_at').on(table.createdAt),
  }),
)

/**
 * Work State Table (Bucket B - Session State Backup)
 *
 * KB backup for session state. Primary storage is the /.agent/working-set.md file.
 * One work_state per story (unique constraint on story_id).
 *
 * @see KBMEM-003 for implementation details
 * @see plans/future/kb-memory-architecture/PLAN.md
 */
export const workState = pgTable(
  'work_state',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story ID this work state belongs to (unique) */
    storyId: text('story_id')
      .notNull()
      .unique()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /** Git branch associated with this story */
    branch: text('branch'),

    /**
     * Current workflow phase.
     * Values: 'planning' | 'in-elaboration' | 'ready-to-work' | 'implementation' |
     *         'ready-for-code-review' | 'review' | 'ready-for-qa' | 'in-qa' |
     *         'verification' | 'uat' | 'complete'
     */
    phase: text('phase'),

    /** Top N constraints for this story (JSONB array) */
    constraints: jsonb('constraints').default([]),

    /** Recent actions taken (JSONB array) */
    recentActions: jsonb('recent_actions').default([]),

    /** Planned next steps (JSONB array) */
    nextSteps: jsonb('next_steps').default([]),

    /** Active blockers (JSONB array) */
    blockers: jsonb('blockers').default([]),

    /** KB entry references: {name: kb_id} map (JSONB object) */
    kbReferences: jsonb('kb_references').default({}),

    /** When the work state was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the work state was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    phaseIdx: index('idx_work_state_phase').on(table.phase),
  }),
)

/**
 * Work State History Table
 *
 * Archive of work states for completed stories.
 * Created when a story's work state is archived.
 *
 * @see KBMEM-003 for implementation details
 */
export const workStateHistory = pgTable(
  'work_state_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story ID this archive belongs to */
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /** Full snapshot of work_state at archive time */
    stateSnapshot: jsonb('state_snapshot').notNull(),

    /** When the state was archived */
    archivedAt: timestamp('archived_at').notNull().defaultNow(),
  },
  table => ({
    storyIdx: index('idx_work_state_history_story').on(table.storyId),
    archivedAtIdx: index('idx_work_state_history_archived_at').on(table.archivedAt),
  }),
)

/**
 * Task Audit Log Table (KBMEM-023)
 *
 * Audit trail for task operations. Created via database trigger
 * on the tasks table (see migration 008_add_task_audit_trigger.sql).
 *
 * Design decisions:
 * - Separate from audit_log (which is for knowledge_entries)
 * - Trigger-based to ensure all changes are captured
 * - Excludes description field from JSONB to reduce storage
 *
 * @see KBMEM-023 for implementation details
 */
export const taskAuditLog = pgTable(
  'task_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** ID of the task that was modified */
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),

    /** Type of operation: 'add' | 'update' | 'delete' */
    operation: text('operation').notNull(),

    /** Task state before the operation (null for 'add') */
    previousValue: jsonb('previous_value'),

    /** Task state after the operation */
    newValue: jsonb('new_value'),

    /** When the operation occurred */
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

    /** Context about who/what initiated the change */
    userContext: jsonb('user_context'),

    /** When audit record was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    taskIdIdx: index('idx_task_audit_log_task_id').on(table.taskId),
    timestampIdx: index('idx_task_audit_log_timestamp').on(table.timestamp),
    taskTimestampIdx: index('idx_task_audit_log_task_timestamp').on(table.taskId, table.timestamp),
  }),
)

/**
 * Stories Table (KBAR-001)
 *
 * Tracks story metadata, workflow state, and sync status for the
 * KB Story & Artifact Migration epic.
 *
 * Story lifecycle: backlog → ready → in_progress → ready_for_review → in_review →
 *                  ready_for_qa → in_qa → completed/cancelled/deferred
 *
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */
export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Unique story identifier (e.g., 'WISH-2047', 'KBAR-001') */
    storyId: text('story_id').notNull().unique(),

    /** Feature prefix (e.g., 'wish', 'kbar') */
    feature: text('feature'),

    /** Epic name */
    epic: text('epic'),

    /** Story title (required) */
    title: text('title').notNull(),

    /**
     * Type of story.
     * Values: 'feature' | 'bug' | 'spike' | 'chore' | 'tech_debt'
     */
    storyType: text('story_type'),

    /** Story points estimate */
    points: integer('points'),

    /**
     * Priority level.
     * Values: 'critical' | 'high' | 'medium' | 'low'
     */
    priority: text('priority'),

    /**
     * Workflow state.
     * Values: 'backlog' | 'ready' | 'in_progress' | 'ready_for_review' |
     *         'in_review' | 'ready_for_qa' | 'in_qa' | 'completed' | 'cancelled' | 'deferred'
     */
    state: text('state'),

    /**
     * Implementation phase.
     * Values: 'setup' | 'analysis' | 'planning' | 'implementation' |
     *         'code_review' | 'qa_verification' | 'completion'
     */
    phase: text('phase'),

    /** Fix iteration counter (0 = initial implementation) */
    iteration: integer('iteration').default(0),

    /** Whether story is blocked */
    blocked: boolean('blocked').default(false),

    /** When the story record was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the story record was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    /** Soft-delete: timestamp when this story was deleted (null = active) */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /** Soft-delete: who deleted this story (agent ID or user) */
    deletedBy: text('deleted_by'),

    /** When the story was completed */
    completedAt: timestamp('completed_at'),

    /** When the story was last synced from YAML file */
    fileSyncedAt: timestamp('file_synced_at'),

    /** SHA hash of YAML file for change detection */
    fileHash: text('file_hash'),

    // -------------------------------------------------------------------------
    // Content fields (AC-9 / KFMB-1020): added to match KFMB-1010 column types
    // -------------------------------------------------------------------------

    /** Human-readable story description */
    description: text('description'),

    /**
     * Acceptance criteria stored as JSONB (matches kbar.stories column type).
     * Structure: array of {id, text} objects or arbitrary JSON.
     */
    acceptanceCriteria: jsonb('acceptance_criteria'),

    /** Non-goals for this story (text array) */
    nonGoals: text('non_goals').array(),

    /** Packages touched by this story (text array) */
    packages: text('packages').array(),

    /** Embedding vector for semantic similarity search (text-embedding-3-small, 1536 dims) */
    embedding: vector('embedding', { dimensions: 1536 }),
  },
  table => ({
    featureIdx: index('idx_stories_feature').on(table.feature),
    epicIdx: index('idx_stories_epic').on(table.epic),
    stateIdx: index('idx_stories_state').on(table.state),
    phaseIdx: index('idx_stories_phase').on(table.phase),
    createdAtIdx: index('idx_stories_created_at').on(table.createdAt),
    updatedAtIdx: index('idx_stories_updated_at').on(table.updatedAt),
    featureStateIdx: index('idx_stories_feature_state').on(table.feature, table.state),
  }),
)

/**
 * Story Dependencies Table (KBAR-001)
 *
 * Tracks relationships between stories including dependencies,
 * blockers, follow-ups, and enablement relationships.
 *
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */
export const storyDependencies = pgTable(
  'story_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story that has the dependency */
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /** Story that is depended upon */
    targetStoryId: text('target_story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /**
     * Type of dependency relationship.
     * Values: 'depends_on' | 'blocked_by' | 'follow_up_from' | 'enables'
     */
    dependencyType: text('dependency_type').notNull(),

    /** Whether the dependency has been satisfied */
    satisfied: boolean('satisfied').default(false),

    /** When the dependency was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_dependencies_story_id').on(table.storyId),
    targetIdx: index('idx_story_dependencies_target').on(table.targetStoryId),
    typeIdx: index('idx_story_dependencies_type').on(table.dependencyType),
  }),
)

/**
 * Story Artifacts Table (Jump Table)
 *
 * Registry/index that points to type-specific detail tables.
 * Each artifact has a row here plus a row in the appropriate type-specific table
 * (e.g., artifact_checkpoints, artifact_reviews, etc.)
 *
 * The detail_table + detail_id columns form a polymorphic FK to the type-specific table.
 * Content is stored in the type-specific table, not here.
 *
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */
export const storyArtifacts = pgTable(
  'story_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story this artifact belongs to */
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /**
     * Type of artifact.
     * Values: 'checkpoint' | 'scope' | 'plan' | 'evidence' | 'verification' |
     *         'analysis' | 'context' | 'fix_summary' | 'proof' | 'elaboration' |
     *         'review' | 'qa_gate' | 'completion_report'
     */
    artifactType: text('artifact_type').notNull(),

    /** Human-readable name for the artifact (disambiguates multiple artifacts of same type) */
    artifactName: text('artifact_name'),

    /** Optional link to knowledge_entries table */
    kbEntryId: uuid('kb_entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),

    /** Implementation phase this artifact belongs to */
    phase: text('phase'),

    /** Iteration number (for fix cycles) */
    iteration: integer('iteration'),

    /** JSONB summary for quick access without KB query */
    summary: jsonb('summary'),

    /** Name of the type-specific detail table (e.g., 'artifact_checkpoints') */
    detailTable: text('detail_table'),

    /** UUID FK to the row in the type-specific table */
    detailId: uuid('detail_id'),

    /** When the artifact was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),

    /** When the artifact was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_artifacts_story_id').on(table.storyId),
    typeIdx: index('idx_story_artifacts_type').on(table.artifactType),
    kbEntryIdx: index('idx_story_artifacts_kb_entry').on(table.kbEntryId),
    phaseIdx: index('idx_story_artifacts_phase').on(table.phase),
    detailIdx: index('idx_story_artifacts_detail').on(table.detailTable, table.detailId),
  }),
)

// ============================================================================
// Type-Specific Artifact Tables
// ============================================================================

/**
 * Artifact Checkpoints Table
 *
 * Stores phase completion checkpoints for stories and epics.
 */
export const artifactCheckpoints = pgTable(
  'artifact_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    phaseStatus: jsonb('phase_status').notNull().default({}),
    resumeFrom: integer('resume_from'),
    featureDir: text('feature_dir'),
    prefix: text('prefix'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_checkpoints_target_id').on(table.targetId),
    scopeIdx: index('idx_artifact_checkpoints_scope').on(table.scope),
  }),
)

/**
 * Artifact Contexts Table
 *
 * Stores agent context for stories and epics.
 */
export const artifactContexts = pgTable(
  'artifact_contexts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    featureDir: text('feature_dir'),
    prefix: text('prefix'),
    storyCount: integer('story_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_contexts_target_id').on(table.targetId),
    scopeIdx: index('idx_artifact_contexts_scope').on(table.scope),
  }),
)

/**
 * Artifact Reviews Table
 *
 * Stores review results from various perspectives.
 */
export const artifactReviews = pgTable(
  'artifact_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    perspective: text('perspective'),
    verdict: text('verdict'),
    findingCount: integer('finding_count'),
    criticalCount: integer('critical_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_reviews_target_id').on(table.targetId),
    scopeIdx: index('idx_artifact_reviews_scope').on(table.scope),
    perspectiveIdx: index('idx_artifact_reviews_perspective').on(table.perspective),
    verdictIdx: index('idx_artifact_reviews_verdict').on(table.verdict),
  }),
)

/**
 * Artifact Elaborations Table
 *
 * Stores elaboration results including story analysis, decisions, and follow-ups.
 */
export const artifactElaborations = pgTable(
  'artifact_elaborations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    elaborationType: text('elaboration_type').notNull().default('story_analysis'),
    verdict: text('verdict'),
    decisionCount: integer('decision_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_elaborations_target_id').on(table.targetId),
    scopeIdx: index('idx_artifact_elaborations_scope').on(table.scope),
    typeIdx: index('idx_artifact_elaborations_type').on(table.elaborationType),
    verdictIdx: index('idx_artifact_elaborations_verdict').on(table.verdict),
  }),
)

/**
 * Artifact Analyses Table
 *
 * Stores analysis results (roadmap, bottleneck, churn, general).
 */
export const artifactAnalyses = pgTable(
  'artifact_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    analysisType: text('analysis_type').default('general'),
    summaryText: text('summary_text'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_analyses_target_id').on(table.targetId),
    scopeIdx: index('idx_artifact_analyses_scope').on(table.scope),
    typeIdx: index('idx_artifact_analyses_type').on(table.analysisType),
  }),
)

/**
 * Artifact Scopes Table
 *
 * Stores story scope definitions.
 */
export const artifactScopes = pgTable(
  'artifact_scopes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    touchesBackend: boolean('touches_backend'),
    touchesFrontend: boolean('touches_frontend'),
    touchesDatabase: boolean('touches_database'),
    touchesInfra: boolean('touches_infra'),
    fileCount: integer('file_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_scopes_target_id').on(table.targetId),
  }),
)

/**
 * Artifact Plans Table
 *
 * Stores implementation plans for stories.
 */
export const artifactPlans = pgTable(
  'artifact_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    stepCount: integer('step_count'),
    estimatedComplexity: text('estimated_complexity'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_plans_target_id').on(table.targetId),
  }),
)

/**
 * Artifact Evidence Table
 *
 * Stores implementation evidence with acceptance criteria tracking.
 */
export const artifactEvidence = pgTable(
  'artifact_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    acTotal: integer('ac_total'),
    acMet: integer('ac_met'),
    acStatus: text('ac_status'),
    testPassCount: integer('test_pass_count'),
    testFailCount: integer('test_fail_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_evidence_target_id').on(table.targetId),
    acStatusIdx: index('idx_artifact_evidence_ac_status').on(table.acStatus),
  }),
)

/**
 * Artifact Verifications Table
 *
 * Stores QA verification results.
 */
export const artifactVerifications = pgTable(
  'artifact_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    verdict: text('verdict'),
    findingCount: integer('finding_count'),
    criticalCount: integer('critical_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_verifications_target_id').on(table.targetId),
    verdictIdx: index('idx_artifact_verifications_verdict').on(table.verdict),
  }),
)

/**
 * Artifact Fix Summaries Table
 *
 * Stores fix cycle summaries.
 */
export const artifactFixSummaries = pgTable(
  'artifact_fix_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    iteration: integer('iteration').notNull().default(0),
    issuesFixed: integer('issues_fixed'),
    issuesRemaining: integer('issues_remaining'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_fix_summaries_target_id').on(table.targetId),
    iterationIdx: index('idx_artifact_fix_summaries_iteration').on(table.iteration),
  }),
)

/**
 * Artifact Proofs Table
 *
 * Stores implementation proofs.
 */
export const artifactProofs = pgTable(
  'artifact_proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    proofType: text('proof_type'),
    verified: boolean('verified'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_proofs_target_id').on(table.targetId),
    proofTypeIdx: index('idx_artifact_proofs_proof_type').on(table.proofType),
  }),
)

/**
 * Artifact QA Gates Table
 *
 * Stores QA gate decisions.
 */
export const artifactQaGates = pgTable(
  'artifact_qa_gates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    decision: text('decision').notNull().default('FAIL'),
    reviewer: text('reviewer'),
    findingCount: integer('finding_count'),
    blockerCount: integer('blocker_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_qa_gates_target_id').on(table.targetId),
    decisionIdx: index('idx_artifact_qa_gates_decision').on(table.decision),
  }),
)

/**
 * Artifact Completion Reports Table
 *
 * Stores story completion reports.
 */
export const artifactCompletionReports = pgTable(
  'artifact_completion_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    status: text('status'),
    iterationsUsed: integer('iterations_used'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_completion_reports_target_id').on(table.targetId),
    statusIdx: index('idx_artifact_completion_reports_status').on(table.status),
  }),
)

/**
 * Artifact Story Seeds Table (KSOT-3030)
 *
 * Stores PM story seed artifacts generated before development.
 */
export const artifactStorySeeds = pgTable(
  'artifact_story_seeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    conflictsFound: integer('conflicts_found'),
    blockingConflicts: integer('blocking_conflicts'),
    baselineLoaded: boolean('baseline_loaded'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_story_seeds_target_id').on(table.targetId),
  }),
)

/**
 * Artifact Test Plans Table (KSOT-3030)
 *
 * Stores PM test plan artifacts.
 */
export const artifactTestPlans = pgTable(
  'artifact_test_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    strategy: text('strategy'),
    scopeUiTouched: boolean('scope_ui_touched'),
    scopeDataTouched: boolean('scope_data_touched'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_test_plans_target_id').on(table.targetId),
  }),
)

/**
 * Artifact Dev Feasibility Table (KSOT-3030)
 *
 * Stores PM dev feasibility assessment artifacts.
 */
export const artifactDevFeasibility = pgTable(
  'artifact_dev_feasibility',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    feasible: boolean('feasible'),
    confidence: text('confidence'),
    complexity: text('complexity'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_dev_feasibility_target_id').on(table.targetId),
  }),
)

/**
 * Artifact UIUX Notes Table (KSOT-3030)
 *
 * Stores PM UI/UX recommendations artifacts.
 */
export const artifactUiuxNotes = pgTable(
  'artifact_uiux_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    hasUiChanges: boolean('has_ui_changes'),
    componentCount: integer('component_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifact_uiux_notes_target_id').on(table.targetId),
  }),
)

/**
 * Story Audit Log Table (KBAR-001)
 *
 * Audit trail for story operations. Created via database trigger
 * on the stories table (see migration 009_add_stories_tables.sql).
 *
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */
export const storyAuditLog = pgTable(
  'story_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** ID of the story that was modified (links to stories.id) */
    storyId: uuid('story_id').notNull(),

    /** Type of operation: 'add' | 'update' | 'delete' */
    operation: text('operation').notNull(),

    /** Story state before the operation (null for 'add') */
    previousValue: jsonb('previous_value'),

    /** Story state after the operation (null for 'delete') */
    newValue: jsonb('new_value'),

    /** When the operation occurred */
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

    /** Context about who/what initiated the change */
    userContext: jsonb('user_context'),

    /** When audit record was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_audit_log_story_id').on(table.storyId),
    timestampIdx: index('idx_story_audit_log_timestamp').on(table.timestamp),
    storyTimestampIdx: index('idx_story_audit_log_story_timestamp').on(
      table.storyId,
      table.timestamp,
    ),
  }),
)

/**
 * Story Token Usage Table
 *
 * Tracks token usage across story workflow phases for analytics.
 * Answers questions like:
 * - "What is the biggest token sink?"
 * - "Where is the biggest bottleneck?"
 * - "What kinds of features have the most churn?"
 *
 * @see plans/active/kb-story-artifact-migration/PLAN.md
 */
export const storyTokenUsage = pgTable(
  'story_token_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story identifier (e.g., 'WISH-2045') */
    storyId: text('story_id').notNull(),

    /** Feature prefix for grouping (e.g., 'wish') */
    feature: text('feature'),

    /**
     * Workflow phase.
     * Values: 'pm-generate' | 'pm-elaborate' | 'pm-refine' |
     *         'dev-setup' | 'dev-implementation' | 'dev-fix' |
     *         'code-review' | 'qa-verification' | 'qa-gate' |
     *         'architect-review' | 'other'
     */
    phase: text('phase').notNull(),

    /** Agent that logged the tokens */
    agent: text('agent'),

    /** Fix cycle iteration (0 = initial) */
    iteration: integer('iteration').default(0),

    /** Input token count */
    inputTokens: integer('input_tokens').notNull().default(0),

    /** Output token count */
    outputTokens: integer('output_tokens').notNull().default(0),

    /** Total tokens (input + output) */
    totalTokens: integer('total_tokens').notNull().default(0),

    /** When the tokens were logged */
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),

    /** When the record was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_token_usage_story_id').on(table.storyId),
    featureIdx: index('idx_story_token_usage_feature').on(table.feature),
    phaseIdx: index('idx_story_token_usage_phase').on(table.phase),
    featurePhaseIdx: index('idx_story_token_usage_feature_phase').on(table.feature, table.phase),
    loggedAtIdx: index('idx_story_token_usage_logged_at').on(table.loggedAt),
  }),
)

/**
 * Plans Table
 *
 * Stores architecture and feature plans from ~/.claude/plans/ as structured KB records.
 * Each plan drives story generation and should be searchable during elaboration
 * so agents can surface related design intent and constraints automatically.
 *
 * Plan types:
 * - 'feature'   - New product capability
 * - 'refactor'  - Code restructuring / cleanup
 * - 'migration' - Data or schema migration
 * - 'infra'     - Infrastructure / deployment
 * - 'tooling'   - Developer tooling / workflow
 * - 'workflow'  - Agent workflow improvements
 * - 'audit'     - Codebase or test coverage audits
 * - 'spike'     - Time-boxed investigation
 *
 * Status lifecycle: draft → accepted → stories-created → in-progress → implemented / superseded / archived
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Filename slug without extension (e.g., 'dapper-chasing-horizon') */
    planSlug: text('plan_slug').notNull().unique(),

    /** Title extracted from the first # heading */
    title: text('title').notNull(),

    /** First paragraph of the plan — used as a quick description */
    summary: text('summary'),

    /**
     * Category of plan.
     * Values: 'feature' | 'refactor' | 'migration' | 'infra' | 'tooling' | 'workflow' | 'audit' | 'spike'
     */
    planType: text('plan_type'),

    /**
     * Lifecycle status.
     * Values: 'draft' | 'accepted' | 'stories-created' | 'in-progress' | 'implemented' | 'superseded' | 'archived'
     */
    status: text('status').notNull().default('draft'),

    /** Target feature directory relative to plans/future/platform/ (e.g., 'agent-dashboard') */
    featureDir: text('feature_dir'),

    /** Story ID prefix associated with this plan (e.g., 'DASH', 'WKFL') */
    storyPrefix: text('story_prefix'),

    /** Total number of stories mentioned or planned */
    estimatedStories: integer('estimated_stories'),

    /**
     * Priority level. P1 is highest, P5 is lowest. Multiple plans can share the same priority.
     * Values: 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
     * Default: 'P3'
     */
    priority: text('priority').default('P3'),

    /**
     * Self-referential FK: sub-epic plans point to their parent program plan.
     * References plans.id with RESTRICT on delete.
     */
    parentPlanId: uuid('parent_plan_id').references(
      (): import('drizzle-orm/pg-core').AnyPgColumn => plans.id,
      { onDelete: 'restrict' },
    ),

    /** Tags for filtering (inferred from content) */
    tags: text('tags').array(),

    /** When the record was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    /** When the record was last updated */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    /** Soft-delete: timestamp when this plan was deleted (null = active) */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    /** Soft-delete: who deleted this plan (agent ID or user) */
    deletedBy: text('deleted_by'),

    /** FK to the plan that supersedes/replaces this one */
    supersededBy: uuid('superseded_by').references(
      (): import('drizzle-orm/pg-core').AnyPgColumn => plans.id,
    ),

    /** Stash of pre-block status so we can restore on unblock */
    preBlockedStatus: text('pre_blocked_status'),

    /** Inline embedding for semantic similarity search */
    embedding: vector('embedding', { dimensions: 1536 }),
  },
  table => ({
    statusIdx: index('idx_plans_status').on(table.status),
    planTypeIdx: index('idx_plans_plan_type').on(table.planType),
    storyPrefixIdx: index('idx_plans_story_prefix').on(table.storyPrefix),
    parentPlanIdx: index('idx_plans_parent_plan_id').on(table.parentPlanId),
    storyPrefixUniqueIdx: uniqueIndex('idx_plans_story_prefix_unique')
      .on(table.storyPrefix)
      .where(sql`story_prefix IS NOT NULL`),
    featureDirIdx: index('idx_plans_feature_dir').on(table.featureDir),
    createdAtIdx: index('idx_plans_created_at').on(table.createdAt),
  }),
)

/**
 * Plan Story Links Table
 *
 * Many-to-many relationship between plans and stories.
 * Populated automatically during import by scanning plan content for story ID patterns.
 *
 * Link types:
 * - 'spawned_from' - Story was generated from this plan
 * - 'prerequisite' - Story must complete before this plan can execute
 * - 'related'      - Story is related but not directly spawned
 * - 'mentioned'    - Story ID appears in the plan text
 */
export const planStoryLinks = pgTable(
  'plan_story_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Plan slug (matches plans.plan_slug) */
    planSlug: text('plan_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),

    /** Story ID (e.g., 'WKFL-020', 'DASH-001') */
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /**
     * Nature of the relationship.
     * Values: 'spawned_from' | 'prerequisite' | 'related' | 'mentioned'
     */
    linkType: text('link_type').notNull().default('mentioned'),

    /** When the link was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    planSlugIdx: index('idx_plan_story_links_plan_slug').on(table.planSlug),
    storyIdIdx: index('idx_plan_story_links_story_id').on(table.storyId),
    uniquePlanStoryIdx: uniqueIndex('idx_plan_story_links_unique').on(
      table.planSlug,
      table.storyId,
    ),
  }),
)

// ============================================================================
// New tables from CDTS-1030: detail tables, dependency/link tables
// ============================================================================

/**
 * Plan Details Table (CDTS-1030)
 *
 * 1:1 with plans. Stores cold/detail columns moved from the plans header table.
 * Keeps the plans header lean for hot-path queries.
 */
export const planDetails = pgTable(
  'plan_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** FK to plans.id (1:1, RESTRICT on delete) */
    planId: uuid('plan_id')
      .notNull()
      .unique()
      .references(() => plans.id, { onDelete: 'restrict' }),

    /** Full raw markdown content of the plan */
    rawContent: text('raw_content').notNull(),

    /**
     * Phase breakdown extracted from ## Phase N headings.
     * Schema: [{number: number, name: string, description: string, storyIds: string[]}]
     */
    phases: jsonb('phases'),

    /** Plan slugs that must reach 'implemented' before this plan can start */
    dependencies: jsonb('dependencies').$type<string[]>(),

    /** Parsed heading breakdown: [{heading, level, startLine}] */
    sections: jsonb('sections'),

    /** Format version for content parsing (yaml_frontmatter, inline_header, etc.) */
    formatVersion: text('format_version').default('v1'),

    /** Original source file path (e.g., '~/.claude/plans/dapper-chasing-horizon.md') */
    sourceFile: text('source_file'),

    /** SHA-256 prefix (16 hex chars) of raw_content for change detection */
    contentHash: text('content_hash'),

    /**
     * Optional link to a knowledge_entries record for semantic vector search.
     * When set, the plan summary is searchable via kb_search.
     */
    kbEntryId: uuid('kb_entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),

    /** When the plan was first imported from disk */
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),

    /** When the plan was archived */
    archivedAt: timestamp('archived_at', { withTimezone: true }),

    /** When the detail record was last updated */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    planIdIdx: index('idx_plan_details_plan_id').on(table.planId),
    contentHashIdx: index('idx_plan_details_content_hash').on(table.contentHash),
  }),
)

/**
 * Story Details Table (CDTS-1030)
 *
 * 1:1 with stories. Stores cold/detail columns moved from the stories header table.
 * Keeps the stories header lean for hot-path queries.
 */
export const storyDetails = pgTable(
  'story_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** FK to stories.story_id (1:1 via text PK, RESTRICT on delete) */
    storyId: text('story_id')
      .notNull()
      .unique()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /** Relative path to story directory */
    storyDir: text('story_dir'),

    /** Story file name (default: story.yaml) */
    storyFile: text('story_file').default('story.yaml'),

    /** Reason for being blocked */
    blockedReason: text('blocked_reason'),

    /** Story ID that blocks this one */
    blockedByStory: text('blocked_by_story'),

    /** Scope flag: touches backend code */
    touchesBackend: boolean('touches_backend').default(false),

    /** Scope flag: touches frontend code */
    touchesFrontend: boolean('touches_frontend').default(false),

    /** Scope flag: touches database */
    touchesDatabase: boolean('touches_database').default(false),

    /** Scope flag: touches infrastructure */
    touchesInfra: boolean('touches_infra').default(false),

    /** When work started on this story */
    startedAt: timestamp('started_at'),

    /** When the story was completed */
    completedAt: timestamp('completed_at'),

    /** When the story was last synced from YAML file */
    fileSyncedAt: timestamp('file_synced_at'),

    /** SHA hash of YAML file for change detection */
    fileHash: text('file_hash'),

    /** When the detail record was last updated */
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_story_details_story_id').on(table.storyId),
  }),
)

/**
 * Plan Dependencies Table (CDTS-1030)
 *
 * Explicit prerequisite relationships between plans.
 * Both FKs reference plans.plan_slug with RESTRICT to prevent orphaning.
 */
export const planDependencies = pgTable(
  'plan_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** The plan that has a dependency */
    planSlug: text('plan_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),

    /** The plan that must be 'implemented' before planSlug can start */
    dependsOnSlug: text('depends_on_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),

    /** Whether this prerequisite has been satisfied */
    satisfied: boolean('satisfied').default(false),

    /** When the dependency was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    uniquePlanDep: uniqueIndex('idx_plan_dependencies_unique').on(
      table.planSlug,
      table.dependsOnSlug,
    ),
    planSlugIdx: index('idx_plan_dependencies_plan_slug').on(table.planSlug),
    dependsOnIdx: index('idx_plan_dependencies_depends_on').on(table.dependsOnSlug),
  }),
)

/**
 * Plan Revision History Table (PDBM Phase 0)
 *
 * Tracks content revisions for plans. Each revision stores the full raw content
 * and a content hash for change detection. Revision numbers are auto-incremented
 * per plan.
 */
export const planRevisionHistory = pgTable(
  'plan_revision_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** FK to plans.id */
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),

    /** Auto-incremented revision number per plan */
    revisionNumber: integer('revision_number').notNull(),

    /** Full raw markdown content at this revision */
    rawContent: text('raw_content').notNull(),

    /** SHA-256 prefix (16 hex chars) for change detection */
    contentHash: text('content_hash'),

    /** Parsed heading breakdown at this revision */
    sections: jsonb('sections'),

    /** Why this revision was created */
    changeReason: text('change_reason'),

    /** Who created this revision (agent ID or user) */
    changedBy: text('changed_by'),

    /** When the revision was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    planIdIdx: index('idx_plan_revision_history_plan_id').on(table.planId),
    createdAtIdx: index('idx_plan_revision_history_created_at').on(table.createdAt),
    uniqueRevision: uniqueIndex('uq_plan_revision').on(table.planId, table.revisionNumber),
  }),
)

/**
 * Plan Execution Log Table (PDBM Phase 0)
 *
 * Structured event log for plan lifecycle events: status changes, phase progress,
 * story spawning/completion, blocking/unblocking, decisions, and errors.
 */
export const planExecutionLog = pgTable(
  'plan_execution_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Plan slug (FK to plans.plan_slug) */
    planSlug: text('plan_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),

    /**
     * Type of log entry.
     * Values: 'status_change' | 'phase_started' | 'phase_completed' |
     *         'story_spawned' | 'story_completed' | 'blocked' | 'unblocked' |
     *         'decision' | 'note' | 'error'
     */
    entryType: text('entry_type').notNull(),

    /** Phase reference (e.g., 'Phase 1', 'Phase 2') */
    phase: text('phase'),

    /** Related story ID (e.g., 'WKFL-020') */
    storyId: text('story_id'),

    /** Human-readable message describing the event */
    message: text('message').notNull(),

    /** Additional structured metadata */
    metadata: jsonb('metadata'),

    /** When the event occurred */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    planSlugIdx: index('idx_plan_execution_log_plan_slug').on(table.planSlug),
    entryTypeIdx: index('idx_plan_execution_log_entry_type').on(table.entryType),
    createdAtIdx: index('idx_plan_execution_log_created_at').on(table.createdAt),
  }),
)

/**
 * Story Knowledge Links Table (CDTS-1030)
 *
 * Graph edge table linking stories to KB entries.
 * Tracks the nature of the relationship (produced_lesson, applied_constraint, etc.)
 * The CHECK constraint on link_type is enforced by the DB migration (CDTS-1020).
 *
 * Valid link_type values: produced_lesson, applied_constraint, referenced_decision,
 *                          similar_pattern, blocked_by
 */
export const storyKnowledgeLinks = pgTable(
  'story_knowledge_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Story ID (FK to stories.story_id RESTRICT) */
    storyId: text('story_id')
      .notNull()
      .references(() => stories.storyId, { onDelete: 'restrict' }),

    /** KB entry ID (FK to knowledge_entries.id RESTRICT) */
    kbEntryId: uuid('kb_entry_id')
      .notNull()
      .references(() => knowledgeEntries.id, { onDelete: 'restrict' }),

    /**
     * Nature of the link.
     * Valid values: 'produced_lesson' | 'applied_constraint' | 'referenced_decision' |
     *               'similar_pattern' | 'blocked_by'
     * CHECK constraint enforced in DB migration CDTS-1020.
     */
    linkType: text('link_type').notNull(),

    /** Confidence score for ML-generated links (1.0 = manually created) */
    confidence: real('confidence').default(1.0),

    /** Who created this link (agent ID or tool name) */
    createdBy: text('created_by'),

    /** When the link was created */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyKbUnique: uniqueIndex('idx_story_knowledge_links_unique').on(
      table.storyId,
      table.kbEntryId,
      table.linkType,
    ),
    storyIdIdx: index('idx_story_knowledge_links_story_id').on(table.storyId),
    kbEntryIdx: index('idx_story_knowledge_links_kb_entry').on(table.kbEntryId),
  }),
)

// ============================================================================
// Deferred Writes Table (migration 028)
// ============================================================================

/**
 * Tracks deferred KB writes for retry when the DB was temporarily unavailable.
 * Replaces the old YAML-file-based deferred writes system.
 */
export const deferredWrites = pgTable(
  'deferred_writes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: text('operation').notNull(),
    payload: jsonb('payload').notNull().default({}),
    error: text('error'),
    retryCount: integer('retry_count').notNull().default(0),
    lastRetry: timestamp('last_retry', { withTimezone: true }),
    storyId: text('story_id'),
    agent: text('agent'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    unprocessedIdx: index('idx_deferred_writes_unprocessed')
      .on(table.createdAt)
      .where(sql`processed_at IS NULL`),
    unprocessedOperationIdx: index('idx_deferred_writes_unprocessed_operation')
      .on(table.operation)
      .where(sql`processed_at IS NULL`),
    unprocessedStoryIdx: index('idx_deferred_writes_unprocessed_story')
      .on(table.storyId)
      .where(sql`processed_at IS NULL AND story_id IS NOT NULL`),
  }),
)

// Export table types for use in queries
export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert
export type EmbeddingCacheEntry = typeof embeddingCache.$inferSelect
export type NewEmbeddingCacheEntry = typeof embeddingCache.$inferInsert
export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type WorkState = typeof workState.$inferSelect
export type NewWorkState = typeof workState.$inferInsert
export type WorkStateHistory = typeof workStateHistory.$inferSelect
export type NewWorkStateHistory = typeof workStateHistory.$inferInsert
export type TaskAuditLogEntry = typeof taskAuditLog.$inferSelect
export type NewTaskAuditLogEntry = typeof taskAuditLog.$inferInsert
export type Story = typeof stories.$inferSelect
export type NewStory = typeof stories.$inferInsert
export type StoryDependency = typeof storyDependencies.$inferSelect
export type NewStoryDependency = typeof storyDependencies.$inferInsert
export type StoryArtifact = typeof storyArtifacts.$inferSelect
export type NewStoryArtifact = typeof storyArtifacts.$inferInsert
export type ArtifactCheckpoint = typeof artifactCheckpoints.$inferSelect
export type ArtifactContext = typeof artifactContexts.$inferSelect
export type ArtifactReview = typeof artifactReviews.$inferSelect
export type ArtifactElaboration = typeof artifactElaborations.$inferSelect
export type ArtifactAnalysis = typeof artifactAnalyses.$inferSelect
export type ArtifactScope = typeof artifactScopes.$inferSelect
export type ArtifactPlan = typeof artifactPlans.$inferSelect
export type ArtifactEvidenceRow = typeof artifactEvidence.$inferSelect
export type ArtifactVerification = typeof artifactVerifications.$inferSelect
export type ArtifactFixSummary = typeof artifactFixSummaries.$inferSelect
export type ArtifactProof = typeof artifactProofs.$inferSelect
export type ArtifactQaGate = typeof artifactQaGates.$inferSelect
export type ArtifactCompletionReport = typeof artifactCompletionReports.$inferSelect
export type ArtifactStorySeed = typeof artifactStorySeeds.$inferSelect
export type ArtifactTestPlan = typeof artifactTestPlans.$inferSelect
export type ArtifactDevFeasibility = typeof artifactDevFeasibility.$inferSelect
export type ArtifactUiuxNotes = typeof artifactUiuxNotes.$inferSelect
export type StoryAuditLogEntry = typeof storyAuditLog.$inferSelect
export type NewStoryAuditLogEntry = typeof storyAuditLog.$inferInsert
export type StoryTokenUsage = typeof storyTokenUsage.$inferSelect
export type NewStoryTokenUsage = typeof storyTokenUsage.$inferInsert
export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
export type PlanStoryLink = typeof planStoryLinks.$inferSelect
export type NewPlanStoryLink = typeof planStoryLinks.$inferInsert
export type PlanDetail = typeof planDetails.$inferSelect
export type NewPlanDetail = typeof planDetails.$inferInsert
export type StoryDetail = typeof storyDetails.$inferSelect
export type NewStoryDetail = typeof storyDetails.$inferInsert
export type PlanDependency = typeof planDependencies.$inferSelect
export type NewPlanDependency = typeof planDependencies.$inferInsert
export type StoryKnowledgeLink = typeof storyKnowledgeLinks.$inferSelect
export type NewStoryKnowledgeLink = typeof storyKnowledgeLinks.$inferInsert
export type DeferredWrite = typeof deferredWrites.$inferSelect
export type NewDeferredWrite = typeof deferredWrites.$inferInsert

// ============================================================================
// workflow schema exports (CDBN-1050)
// ============================================================================

export const workflowSchema = pgSchema('workflow')

export const workflowStories = workflowSchema.table(
  'stories',
  {
    storyId: text('story_id').primaryKey(),
    feature: text('feature').notNull(),
    state: text('state').notNull(),
    title: text('title').notNull(),
    priority: text('priority'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    featureStateIdx: index('idx_workflow_stories_feature_state').on(table.feature, table.state),
    stateUpdatedAtIdx: index('idx_workflow_stories_state_updated_at').on(
      table.state,
      table.updatedAt,
    ),
  }),
)

export const workflowStoryDependencies = workflowSchema.table(
  'story_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    dependsOnId: text('depends_on_id').notNull(),
    dependencyType: text('dependency_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_workflow_story_dep_story_id').on(table.storyId),
    dependsOnIdx: index('idx_workflow_story_dep_depends_on').on(table.dependsOnId),
  }),
)

export const workflowStoryStateHistory = workflowSchema.table(
  'story_state_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    eventType: text('event_type').notNull(),
    fromState: text('from_state'),
    toState: text('to_state'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_workflow_story_state_history_story_id').on(table.storyId),
    eventTypeIdx: index('idx_workflow_story_state_history_event_type').on(table.eventType),
    createdAtIdx: index('idx_workflow_story_state_history_created_at').on(table.createdAt),
  }),
)

export const workflowWorktrees = workflowSchema.table(
  'worktrees',
  {
    worktreeId: uuid('worktree_id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    branchName: text('branch_name').notNull(),
    path: text('path').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_workflow_worktrees_story_id').on(table.storyId),
  }),
)

export const workflowExecutions = workflowSchema.table(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  table => ({
    storyIdIdx: index('idx_workflow_executions_story_id').on(table.storyId),
    statusIdx: index('idx_workflow_executions_status').on(table.status),
  }),
)

export const workflowCheckpoints = workflowSchema.table(
  'workflow_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id').notNull(),
    phase: text('phase').notNull(),
    state: jsonb('state'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('idx_workflow_checkpoints_execution_id').on(table.executionId),
  }),
)

export const workflowAuditLog = workflowSchema.table(
  'workflow_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id').notNull(),
    eventType: text('event_type').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('idx_workflow_audit_log_execution_id').on(table.executionId),
    createdAtIdx: index('idx_workflow_audit_log_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// artifacts schema exports (CDBN-1020)
// ============================================================================

export const artifactsSchema = pgSchema('artifacts')

export const artifactsStoryArtifacts = artifactsSchema.table(
  'story_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    artifactType: text('artifact_type').notNull(),
    artifactName: text('artifact_name'),
    kbEntryId: uuid('kb_entry_id'),
    phase: text('phase'),
    iteration: integer('iteration').default(0),
    summary: jsonb('summary'),
    detailTable: text('detail_table'),
    detailId: uuid('detail_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_artifacts_story_artifacts_story_id').on(table.storyId),
    typeIdx: index('idx_artifacts_story_artifacts_type').on(table.artifactType),
    phaseIdx: index('idx_artifacts_story_artifacts_phase').on(table.phase),
  }),
)

export const artifactsArtifactCheckpoints = artifactsSchema.table(
  'artifact_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    phaseStatus: jsonb('phase_status').notNull().default({}),
    resumeFrom: integer('resume_from'),
    featureDir: text('feature_dir'),
    prefix: text('prefix'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_checkpoints_target_id').on(table.targetId),
    scopeIdx: index('idx_artifacts_artifact_checkpoints_scope').on(table.scope),
  }),
)

export const artifactsArtifactContexts = artifactsSchema.table(
  'artifact_contexts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    featureDir: text('feature_dir'),
    prefix: text('prefix'),
    storyCount: integer('story_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_contexts_target_id').on(table.targetId),
    scopeIdx: index('idx_artifacts_artifact_contexts_scope').on(table.scope),
  }),
)

export const artifactsArtifactReviews = artifactsSchema.table(
  'artifact_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    perspective: text('perspective'),
    verdict: text('verdict'),
    findingCount: integer('finding_count'),
    criticalCount: integer('critical_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_reviews_target_id').on(table.targetId),
    scopeIdx: index('idx_artifacts_artifact_reviews_scope').on(table.scope),
    perspectiveIdx: index('idx_artifacts_artifact_reviews_perspective').on(table.perspective),
    verdictIdx: index('idx_artifacts_artifact_reviews_verdict').on(table.verdict),
  }),
)

export const artifactsArtifactElaborations = artifactsSchema.table(
  'artifact_elaborations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    elaborationType: text('elaboration_type').notNull().default('story_analysis'),
    verdict: text('verdict'),
    decisionCount: integer('decision_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_elaborations_target_id').on(table.targetId),
    scopeIdx: index('idx_artifacts_artifact_elaborations_scope').on(table.scope),
    typeIdx: index('idx_artifacts_artifact_elaborations_type').on(table.elaborationType),
    verdictIdx: index('idx_artifacts_artifact_elaborations_verdict').on(table.verdict),
  }),
)

export const artifactsArtifactAnalyses = artifactsSchema.table(
  'artifact_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull().default('story'),
    targetId: text('target_id').notNull(),
    analysisType: text('analysis_type').default('general'),
    summaryText: text('summary_text'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_analyses_target_id').on(table.targetId),
    scopeIdx: index('idx_artifacts_artifact_analyses_scope').on(table.scope),
    typeIdx: index('idx_artifacts_artifact_analyses_type').on(table.analysisType),
  }),
)

export const artifactsArtifactScopes = artifactsSchema.table(
  'artifact_scopes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    touchesBackend: boolean('touches_backend'),
    touchesFrontend: boolean('touches_frontend'),
    touchesDatabase: boolean('touches_database'),
    touchesInfra: boolean('touches_infra'),
    fileCount: integer('file_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_scopes_target_id').on(table.targetId),
  }),
)

export const artifactsArtifactPlans = artifactsSchema.table(
  'artifact_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    stepCount: integer('step_count'),
    estimatedComplexity: text('estimated_complexity'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_plans_target_id').on(table.targetId),
  }),
)

export const artifactsArtifactEvidence = artifactsSchema.table(
  'artifact_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    acTotal: integer('ac_total'),
    acMet: integer('ac_met'),
    acStatus: text('ac_status'),
    testPassCount: integer('test_pass_count'),
    testFailCount: integer('test_fail_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_evidence_target_id').on(table.targetId),
    acStatusIdx: index('idx_artifacts_artifact_evidence_ac_status').on(table.acStatus),
  }),
)

export const artifactsArtifactVerifications = artifactsSchema.table(
  'artifact_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    verdict: text('verdict'),
    findingCount: integer('finding_count'),
    criticalCount: integer('critical_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_verifications_target_id').on(table.targetId),
    verdictIdx: index('idx_artifacts_artifact_verifications_verdict').on(table.verdict),
  }),
)

export const artifactsArtifactFixSummaries = artifactsSchema.table(
  'artifact_fix_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    iteration: integer('iteration').notNull().default(0),
    issuesFixed: integer('issues_fixed'),
    issuesRemaining: integer('issues_remaining'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_fix_summaries_target_id').on(table.targetId),
    iterationIdx: index('idx_artifacts_artifact_fix_summaries_iteration').on(table.iteration),
  }),
)

export const artifactsArtifactProofs = artifactsSchema.table(
  'artifact_proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    proofType: text('proof_type'),
    verified: boolean('verified'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_proofs_target_id').on(table.targetId),
    proofTypeIdx: index('idx_artifacts_artifact_proofs_proof_type').on(table.proofType),
  }),
)

export const artifactsArtifactQaGates = artifactsSchema.table(
  'artifact_qa_gates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    decision: text('decision').notNull().default('FAIL'),
    reviewer: text('reviewer'),
    findingCount: integer('finding_count'),
    blockerCount: integer('blocker_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_qa_gates_target_id').on(table.targetId),
    decisionIdx: index('idx_artifacts_artifact_qa_gates_decision').on(table.decision),
  }),
)

export const artifactsArtifactCompletionReports = artifactsSchema.table(
  'artifact_completion_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    status: text('status'),
    iterationsUsed: integer('iterations_used'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_completion_reports_target_id').on(table.targetId),
    statusIdx: index('idx_artifacts_artifact_completion_reports_status').on(table.status),
  }),
)

export const artifactsArtifactTestPlans = artifactsSchema.table(
  'artifact_test_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    strategy: text('strategy'),
    scopeUiTouched: boolean('scope_ui_touched'),
    scopeDataTouched: boolean('scope_data_touched'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_test_plans_target_id').on(table.targetId),
  }),
)

export const artifactsArtifactDevFeasibility = artifactsSchema.table(
  'artifact_dev_feasibility',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    feasible: boolean('feasible'),
    confidence: text('confidence'),
    complexity: text('complexity'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_dev_feasibility_target_id').on(table.targetId),
  }),
)

export const artifactsArtifactUiuxNotes = artifactsSchema.table(
  'artifact_uiux_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    hasUiChanges: boolean('has_ui_changes'),
    componentCount: integer('component_count'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_uiux_notes_target_id').on(table.targetId),
  }),
)

export const artifactsArtifactStorySeeds = artifactsSchema.table(
  'artifact_story_seeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    targetId: text('target_id').notNull(),
    conflictsFound: integer('conflicts_found'),
    blockingConflicts: integer('blocking_conflicts'),
    baselineLoaded: boolean('baseline_loaded'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    targetIdIdx: index('idx_artifacts_artifact_story_seeds_target_id').on(table.targetId),
  }),
)

// ============================================================================
// CDBN-1030: Knowledge Extensions - hitl_decisions, context cache
// ============================================================================

export const contextPackTypeEnum = pgEnum('context_pack_type', [
  'codebase',
  'story',
  'feature',
  'epic',
  'architecture',
  'lessons_learned',
  'test_patterns',
  'agent_missions',
])

// CDBN-1040: Telemetry Schema
export const agentDecisionTypeEnum = pgEnum('agent_decision_type', [
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision',
])

export const agentInvocations = pgTable(
  'agent_invocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: text('invocation_id').notNull().unique(),
    agentName: text('agent_name').notNull(),
    storyId: text('story_id'),
    phase: text('phase'),
    inputPayload: jsonb('input_payload'),
    outputPayload: jsonb('output_payload'),
    durationMs: integer('duration_ms'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    estimatedCost: real('estimated_cost'),
    modelName: text('model_name'),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: uniqueIndex('idx_agent_invocations_invocation_id').on(table.invocationId),
    agentNameIdx: index('idx_agent_invocations_agent_name').on(table.agentName),
    storyIdIdx: index('idx_agent_invocations_story_id').on(table.storyId),
    startedAtIdx: index('idx_agent_invocations_started_at').on(table.startedAt),
    statusIdx: index('idx_agent_invocations_status').on(table.status),
    agentStoryIdx: index('idx_agent_invocations_agent_story').on(table.agentName, table.storyId),
    agentNameStartedAtIdx: index('idx_agent_invocations_agent_name_started_at').on(
      table.agentName,
      table.startedAt,
    ),
  }),
)

export const hitlDecisions = pgTable(
  'hitl_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id').references(() => agentInvocations.id, {
      onDelete: 'set null',
    }),
    decisionType: text('decision_type').notNull(),
    decisionText: text('decision_text').notNull(),
    context: jsonb('context'),
    embedding: vector('embedding', { dimensions: 1536 }),
    operatorId: text('operator_id').notNull(),
    storyId: text('story_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_hitl_decisions_story_id').on(table.storyId),
    operatorIdIdx: index('idx_hitl_decisions_operator_id').on(table.operatorId),
    createdAtIdx: index('idx_hitl_decisions_created_at').on(table.createdAt),
  }),
)

export const agentDecisions = pgTable(
  'agent_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id').references(() => agentInvocations.id, {
      onDelete: 'cascade',
    }),
    decisionType: agentDecisionTypeEnum('decision_type').notNull(),
    decisionText: text('decision_text').notNull(),
    context: jsonb('context'),
    confidence: integer('confidence'),
    wasCorrect: boolean('was_correct'),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
    evaluatedBy: text('evaluated_by'),
    correctnessScore: integer('correctness_score'),
    alternativesConsidered: integer('alternatives_considered').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: index('idx_agent_decisions_invocation_id').on(table.invocationId),
    decisionTypeIdx: index('idx_agent_decisions_decision_type').on(table.decisionType),
    createdAtIdx: index('idx_agent_decisions_created_at').on(table.createdAt),
    decisionTypeEvaluatedAtIdx: index('idx_agent_decisions_decision_type_evaluated_at').on(
      table.decisionType,
      table.evaluatedAt,
    ),
  }),
)

export const agentOutcomes = pgTable(
  'agent_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id')
      .notNull()
      .references(() => agentInvocations.id, { onDelete: 'cascade' }),
    outcomeType: text('outcome_type').notNull(),
    artifactsProduced: jsonb('artifacts_produced'),
    testsWritten: integer('tests_written').notNull().default(0),
    testsPassed: integer('tests_passed').notNull().default(0),
    testsFailed: integer('tests_failed').notNull().default(0),
    codeQuality: integer('code_quality'),
    testCoverage: integer('test_coverage'),
    reviewScore: integer('review_score'),
    reviewNotes: text('review_notes'),
    lintErrors: integer('lint_errors').notNull().default(0),
    typeErrors: integer('type_errors').notNull().default(0),
    securityIssues: jsonb('security_issues').notNull().default(sql`'[]'::jsonb`),
    performanceMetrics: jsonb('performance_metrics').notNull().default(sql`'{}'::jsonb`),
    artifactsMetadata: jsonb('artifacts_metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: index('idx_agent_outcomes_invocation_id').on(table.invocationId),
    outcomeTypeIdx: index('idx_agent_outcomes_outcome_type').on(table.outcomeType),
    createdAtIdx: index('idx_agent_outcomes_created_at').on(table.createdAt),
    outcomeTypeCreatedAtIdx: index('idx_agent_outcomes_outcome_type_created_at').on(
      table.outcomeType,
      table.createdAt,
    ),
  }),
)

export const storyOutcomes = pgTable(
  'story_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull().unique(),
    finalVerdict: text('final_verdict').notNull(),
    qualityScore: integer('quality_score').notNull().default(0),
    totalInputTokens: integer('total_input_tokens').notNull().default(0),
    totalOutputTokens: integer('total_output_tokens').notNull().default(0),
    totalCachedTokens: integer('total_cached_tokens').notNull().default(0),
    estimatedTotalCost: real('estimated_total_cost'),
    reviewIterations: integer('review_iterations').notNull().default(0),
    qaIterations: integer('qa_iterations').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    primaryBlocker: text('primary_blocker'),
    metadata: jsonb('metadata'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: uniqueIndex('idx_story_outcomes_story_id').on(table.storyId),
    finalVerdictIdx: index('idx_story_outcomes_final_verdict').on(table.finalVerdict),
    completedAtIdx: index('idx_story_outcomes_completed_at').on(table.completedAt),
    finalVerdictCompletedAtIdx: index('idx_story_outcomes_final_verdict_completed_at').on(
      table.finalVerdict,
      table.completedAt,
    ),
  }),
)

export const contextPacks = pgTable(
  'context_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packType: contextPackTypeEnum('pack_type').notNull(),
    packKey: text('pack_key').notNull(),
    content: jsonb('content').notNull(),
    version: integer('version').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    hitCount: integer('hit_count').notNull().default(0),
    lastHitAt: timestamp('last_hit_at', { withTimezone: true }),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    packTypeKeyIdx: uniqueIndex('idx_context_packs_type_key').on(table.packType, table.packKey),
    expiresAtIdx: index('idx_context_packs_expires_at').on(table.expiresAt),
    lastHitAtIdx: index('idx_context_packs_last_hit_at').on(table.lastHitAt),
    packTypeIdx: index('idx_context_packs_pack_type').on(table.packType),
  }),
)

export const contextSessions = pgTable(
  'context_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull().unique(),
    agentName: text('agent_name').notNull(),
    storyId: text('story_id'),
    phase: text('phase'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    agentNameIdx: index('idx_context_sessions_agent_name').on(table.agentName),
    storyIdIdx: index('idx_context_sessions_story_id').on(table.storyId),
    startedAtIdx: index('idx_context_sessions_started_at').on(table.startedAt),
    agentStoryIdx: index('idx_context_sessions_agent_story').on(table.agentName, table.storyId),
  }),
)

export const contextCacheHits = pgTable(
  'context_cache_hits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => contextSessions.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id')
      .notNull()
      .references(() => contextPacks.id, { onDelete: 'cascade' }),
    tokensSaved: integer('tokens_saved'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    sessionIdIdx: index('idx_context_cache_hits_session_id').on(table.sessionId),
    packIdIdx: index('idx_context_cache_hits_pack_id').on(table.packId),
    createdAtIdx: index('idx_context_cache_hits_created_at').on(table.createdAt),
  }),
)

// Type exports
export type HitlDecision = typeof hitlDecisions.$inferSelect
export type NewHitlDecision = typeof hitlDecisions.$inferInsert
export type AgentInvocation = typeof agentInvocations.$inferSelect
export type NewAgentInvocation = typeof agentInvocations.$inferInsert
export type AgentDecision = typeof agentDecisions.$inferSelect
export type NewAgentDecision = typeof agentDecisions.$inferInsert
export type AgentOutcome = typeof agentOutcomes.$inferSelect
export type NewAgentOutcome = typeof agentOutcomes.$inferInsert
export type StoryOutcome = typeof storyOutcomes.$inferSelect
export type NewStoryOutcome = typeof storyOutcomes.$inferInsert
export type ContextPack = typeof contextPacks.$inferSelect
export type NewContextPack = typeof contextPacks.$inferInsert
export type ContextSession = typeof contextSessions.$inferSelect
export type NewContextSession = typeof contextSessions.$inferInsert
export type ContextCacheHit = typeof contextCacheHits.$inferSelect
export type NewContextCacheHit = typeof contextCacheHits.$inferInsert
