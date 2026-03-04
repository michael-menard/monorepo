/**
 * WINT (Workflow Intelligence) Database Schema
 *
 * This schema defines the WINT platform tables in the 'wint' PostgreSQL schema.
 * It's isolated from the main application schema for separation of concerns.
 *
 * Story WINT-0010: Create Core Database Schemas (6 schemas)
 *
 * Schema Isolation:
 * - All tables are in the 'wint' PostgreSQL schema namespace
 * - Completely isolated from application data (public schema)
 * - Designed for autonomous development workflow intelligence
 *
 * Schema Groups:
 * 1. Story Management - Stories, states, transitions, dependencies
 * 2. Context Cache - Cached context packs and session management
 * 3. Telemetry - Agent invocations, decisions, outcomes, state transitions
 * 4. ML Pipeline - Training data, models, predictions, metrics
 * 5. Graph Relational - Features, capabilities, relationships, cohesion rules
 * 6. Workflow Tracking - Executions, checkpoints, audit trails
 */

import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Define the 'wint' PostgreSQL schema namespace
export const wintSchema = pgSchema('wint')

// ============================================================================
// 1. STORY MANAGEMENT SCHEMA
// ============================================================================

/**
 * Story State Enum
 * Defines the lifecycle states of a story in the autonomous development workflow
 */
export const storyStateEnum = pgEnum('story_state', [
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_review',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
  'failed_code_review',
  'failed_qa',
])

/**
 * Story Priority Enum
 * Defines priority levels for story scheduling
 */
export const storyPriorityEnum = pgEnum('story_priority', ['P0', 'P1', 'P2', 'P3', 'P4'])

/**
 * Artifact Type Enum (WINT-0020)
 * Defines types of story artifacts tracked in the filesystem
 */
export const artifactTypeEnum = pgEnum('artifact_type', [
  'PLAN',
  'SCOPE',
  'EVIDENCE',
  'CHECKPOINT',
  'DECISIONS',
  'REVIEW',
  'PROOF',
  'ELAB',
  'OUTCOME',
  'TEST_PLAN',
  'UIUX_NOTES',
  'DEV_FEASIBILITY',
])

/**
 * Phase Enum (WINT-0020)
 * Defines granular phases within story execution workflow
 */
export const phaseEnum = pgEnum('phase', ['setup', 'plan', 'execute', 'review', 'qa'])

/**
 * Phase Status Enum (WINT-0020)
 * Defines status values for phase execution tracking
 */
export const phaseStatusEnum = pgEnum('phase_status', ['entered', 'completed', 'failed', 'skipped'])

/**
 * Assignee Type Enum (WINT-0020)
 * Defines types of entities that can be assigned to stories
 */
export const assigneeTypeEnum = pgEnum('assignee_type', ['agent', 'user'])

/**
 * Assignment Status Enum (WINT-0020)
 * Defines status values for story assignments
 */
export const assignmentStatusEnum = pgEnum('assignment_status', [
  'active',
  'completed',
  'cancelled',
])

/**
 * Blocker Type Enum (WINT-0020)
 * Defines types of blockers that can affect story progress
 */
export const blockerTypeEnum = pgEnum('blocker_type', [
  'dependency',
  'technical',
  'resource',
  'decision',
])

/**
 * Severity Enum (WINT-0020)
 * Defines severity levels for blockers and issues
 */
export const severityEnum = pgEnum('severity', ['high', 'medium', 'low'])

/**
 * Stories Table
 * Tracks all user stories, features, and bug fixes in the system
 * Related stories: WINT-0020 (Story Lifecycle Management)
 */
export const stories = wintSchema.table(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull().unique(), // e.g., "WINT-0010", "BUGF-001"
    title: text('title').notNull(),
    description: text('description'),

    // Classification
    storyType: text('story_type').notNull(), // 'feature', 'bug', 'infra', 'docs', etc.
    epic: text('epic'), // Epic identifier (e.g., 'WINT', 'BUGF')
    wave: integer('wave'), // Wave number for phased rollout

    // Priority and effort
    priority: storyPriorityEnum('priority').notNull().default('P2'),
    complexity: text('complexity'), // 'low', 'medium', 'high'
    storyPoints: integer('story_points'),

    // State management
    state: storyStateEnum('state').notNull().default('backlog'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
      tags?: string[]
      experimentVariant?: 'control' | 'variant_a' | 'variant_b'
      blocked_by?: string[]
      blocks?: string[]
    }>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: uniqueIndex('stories_story_id_idx').on(table.storyId),
    stateIdx: index('stories_state_idx').on(table.state),
    createdAtIdx: index('stories_created_at_idx').on(table.createdAt),
    epicWaveIdx: index('stories_epic_wave_idx').on(table.epic, table.wave),
    priorityStateIdx: index('stories_priority_state_idx').on(table.priority, table.state),
  }),
)

/**
 * Story States Table
 * Tracks the current and historical states of stories
 * Related stories: WINT-0020
 */
export const storyStates = wintSchema.table(
  'story_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    state: storyStateEnum('state').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow(),
    exitedAt: timestamp('exited_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'), // Computed when exitedAt is set

    // Metadata about why state was entered
    reason: text('reason'),
    triggeredBy: text('triggered_by'), // 'user', 'agent', 'automation'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_states_story_id_idx').on(table.storyId),
    stateIdx: index('story_states_state_idx').on(table.state),
    enteredAtIdx: index('story_states_entered_at_idx').on(table.enteredAt),
    storyStateIdx: index('story_states_story_state_idx').on(table.storyId, table.state),
  }),
)

/**
 * Story Transitions Table
 * Tracks state transitions for workflow analysis
 * Related stories: WINT-0020
 */
export const storyTransitions = wintSchema.table(
  'story_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    fromState: storyStateEnum('from_state').notNull(),
    toState: storyStateEnum('to_state').notNull(),
    transitionedAt: timestamp('transitioned_at', { withTimezone: true }).notNull().defaultNow(),

    // Context
    triggeredBy: text('triggered_by').notNull(), // 'user', 'agent', 'automation'
    reason: text('reason'),
    metadata: jsonb('metadata').$type<{
      agentName?: string
      decisionId?: string
      errorMessage?: string
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_transitions_story_id_idx').on(table.storyId),
    transitionedAtIdx: index('story_transitions_transitioned_at_idx').on(table.transitionedAt),
    fromStateIdx: index('story_transitions_from_state_idx').on(table.fromState),
    toStateIdx: index('story_transitions_to_state_idx').on(table.toState),
    storyTransitionedIdx: index('story_transitions_story_transitioned_idx').on(
      table.storyId,
      table.transitionedAt,
    ),
  }),
)

/**
 * Story Dependencies Table
 * Tracks dependencies between stories for scheduling and planning
 * Related stories: WINT-0020, WINT-0060 (Graph Relational)
 */
export const storyDependencies = wintSchema.table(
  'story_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    dependsOnStoryId: uuid('depends_on_story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    dependencyType: text('dependency_type').notNull(), // 'blocks', 'requires', 'related'

    // Status tracking
    resolved: boolean('resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

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

/**
 * Story Artifacts Table (WINT-0020)
 *
 * Links stories to their filesystem artifacts (YAML/Markdown files).
 * Supports checksum-based change detection for artifact synchronization.
 *
 * @see KBAR-0010 for reference artifact tracking implementation
 * @see storyArtifactsRelations for Drizzle relations
 */
export const storyArtifacts = wintSchema.table(
  'story_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    artifactType: artifactTypeEnum('artifact_type').notNull(),
    /** Absolute filesystem path to the artifact */
    filePath: text('file_path').notNull(),
    /** SHA-256 checksum (64-char hex string) for artifact change detection */
    checksum: varchar('checksum', { length: 64 }).notNull(),
    /** Last successful sync timestamp (null if never synced) */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_artifacts_story_id_idx').on(table.storyId),
    artifactTypeIdx: index('story_artifacts_artifact_type_idx').on(table.artifactType),
    filePathIdx: index('story_artifacts_file_path_idx').on(table.filePath),
    // Unique constraint: prevent duplicate artifact types per story
    uniqueArtifact: uniqueIndex('story_artifacts_story_id_artifact_type_idx').on(
      table.storyId,
      table.artifactType,
    ),
  }),
)

/**
 * Story Phase History Table (WINT-0020)
 *
 * Tracks granular phase execution within the story lifecycle.
 * Phases do NOT enforce sequential execution at database level (LangGraph manages ordering).
 *
 * @see storyPhaseHistoryRelations for Drizzle relations
 */
export const storyPhaseHistory = wintSchema.table(
  'story_phase_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    phase: phaseEnum('phase').notNull(),
    status: phaseStatusEnum('status').notNull(),
    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull(),
    exitedAt: timestamp('exited_at', { withTimezone: true }),
    /** Duration in seconds (null if phase not yet exited) */
    durationSeconds: integer('duration_seconds'),
    /** Agent name that executed this phase */
    agentName: varchar('agent_name', { length: 255 }),
    /** Phase iteration (1-based, tracks phase repetitions like review cycles) */
    iteration: integer('iteration').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_phase_history_story_id_idx').on(table.storyId),
    phaseIdx: index('story_phase_history_phase_idx').on(table.phase),
    enteredAtIdx: index('story_phase_history_entered_at_idx').on(table.enteredAt),
    // Composite index for phase-specific queries
    storyPhaseIdx: index('story_phase_history_story_id_phase_idx').on(table.storyId, table.phase),
  }),
)

/**
 * Story Metadata Versions Table (WINT-0020)
 *
 * Audit trail for story metadata changes with JSONB snapshots.
 * Enables rollback and change tracking for story metadata evolution.
 *
 * @see storyMetadataVersionsRelations for Drizzle relations
 */
export const storyMetadataVersions = wintSchema.table(
  'story_metadata_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    /** Version number (1-based, increments on each metadata change) */
    version: integer('version').notNull(),
    /** Full snapshot of story metadata at this version (stores {} instead of null) */
    metadataSnapshot: jsonb('metadata_snapshot').notNull(),
    /** Entity that made the change (agent name or user ID) */
    changedBy: varchar('changed_by', { length: 255 }),
    /** Reason for metadata change */
    changeReason: text('change_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_metadata_versions_story_id_idx').on(table.storyId),
    versionIdx: index('story_metadata_versions_version_idx').on(table.version),
    createdAtIdx: index('story_metadata_versions_created_at_idx').on(table.createdAt),
    // Composite index for version-specific queries
    storyVersionIdx: index('story_metadata_versions_story_id_version_idx').on(
      table.storyId,
      table.version,
    ),
  }),
)

/**
 * Story Assignments Table (WINT-0020)
 *
 * Tracks agent/user assignments to stories with phase-level granularity.
 * CHECK constraint enforces status='completed' requires completedAt to be set.
 *
 * @see storyAssignmentsRelations for Drizzle relations
 */
export const storyAssignments = wintSchema.table(
  'story_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    assigneeType: assigneeTypeEnum('assignee_type').notNull(),
    /** Assignee identifier (agent name or user ID) */
    assigneeId: varchar('assignee_id', { length: 255 }).notNull(),
    /** Optional: specific phase assignment (null = entire story) */
    phase: phaseEnum('phase'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: assignmentStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_assignments_story_id_idx').on(table.storyId),
    assigneeIdIdx: index('story_assignments_assignee_id_idx').on(table.assigneeId),
    statusIdx: index('story_assignments_status_idx').on(table.status),
    assignedAtIdx: index('story_assignments_assigned_at_idx').on(table.assignedAt),
  }),
)

/**
 * Story Blockers Table (WINT-0020)
 *
 * Detailed blocker tracking beyond dependency relationships.
 * CHECK constraint enforces resolution_notes requires resolved_at to be set.
 *
 * @see storyBlockersRelations for Drizzle relations
 */
export const storyBlockers = wintSchema.table(
  'story_blockers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    blockerType: blockerTypeEnum('blocker_type').notNull(),
    blockerDescription: text('blocker_description').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),
    severity: severityEnum('severity').notNull().default('medium'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('story_blockers_story_id_idx').on(table.storyId),
    blockerTypeIdx: index('story_blockers_blocker_type_idx').on(table.blockerType),
    resolvedAtIdx: index('story_blockers_resolved_at_idx').on(table.resolvedAt),
    severityIdx: index('story_blockers_severity_idx').on(table.severity),
  }),
)

// ============================================================================
// 2. CONTEXT CACHE SCHEMA
// ============================================================================

/**
 * Context Pack Type Enum
 * Defines types of context that can be cached
 */
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

/**
 * Context Packs Table
 * Stores cached context to reduce token usage across agent invocations
 * Related stories: WINT-0030 (Context Cache Management)
 */
export const contextPacks = wintSchema.table(
  'context_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packType: contextPackTypeEnum('pack_type').notNull(),
    packKey: text('pack_key').notNull(), // Unique identifier for this context (e.g., story_id, feature_name)

    // Content
    // The actual runtime shape is ContextPackResponse (from @repo/context-pack-sidecar).
    // We use `unknown` here to avoid a circular dependency:
    //   context-pack-sidecar -> database-schema -> context-pack-sidecar (circular)
    // Callers are expected to validate content via ContextPackResponseSchema.parse().
    content: jsonb('content').notNull().$type<unknown>(),

    // Cache management
    version: integer('version').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true }), // TTL for cache invalidation
    hitCount: integer('hit_count').notNull().default(0),
    lastHitAt: timestamp('last_hit_at', { withTimezone: true }),

    // Metadata
    tokenCount: integer('token_count'), // Estimated token count for this context

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    packTypeKeyIdx: uniqueIndex('context_packs_type_key_idx').on(table.packType, table.packKey),
    expiresAtIdx: index('context_packs_expires_at_idx').on(table.expiresAt),
    lastHitAtIdx: index('context_packs_last_hit_at_idx').on(table.lastHitAt),
    packTypeIdx: index('context_packs_pack_type_idx').on(table.packType),
  }),
)

/**
 * Context Sessions Table
 * Tracks agent sessions and their context usage
 * Related stories: WINT-0030
 */
export const contextSessions = wintSchema.table(
  'context_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: text('session_id').notNull().unique(),

    // Session metadata
    agentName: text('agent_name').notNull(),
    storyId: text('story_id'),
    phase: text('phase'), // 'setup', 'plan', 'execute', 'review', 'qa'

    // Token tracking
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cachedTokens: integer('cached_tokens').notNull().default(0), // Tokens saved via cache

    // Session lifecycle
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    sessionIdIdx: uniqueIndex('context_sessions_session_id_idx').on(table.sessionId),
    agentNameIdx: index('context_sessions_agent_name_idx').on(table.agentName),
    storyIdIdx: index('context_sessions_story_id_idx').on(table.storyId),
    startedAtIdx: index('context_sessions_started_at_idx').on(table.startedAt),
    agentStoryIdx: index('context_sessions_agent_story_idx').on(table.agentName, table.storyId),
  }),
)

/**
 * Context Cache Hits Table
 * Tracks when cached context is used by an agent session
 * Related stories: WINT-0030
 */
export const contextCacheHits = wintSchema.table(
  'context_cache_hits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => contextSessions.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id')
      .notNull()
      .references(() => contextPacks.id, { onDelete: 'cascade' }),

    // Metrics
    tokensSaved: integer('tokens_saved'), // Estimated tokens saved by using cache

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    sessionIdIdx: index('context_cache_hits_session_id_idx').on(table.sessionId),
    packIdIdx: index('context_cache_hits_pack_id_idx').on(table.packId),
    createdAtIdx: index('context_cache_hits_created_at_idx').on(table.createdAt),
  }),
)

// ============================================================================
// 3. TELEMETRY SCHEMA
// ============================================================================

/**
 * Agent Decision Type Enum
 * Categorizes types of decisions made by agents
 */
export const agentDecisionTypeEnum = pgEnum('agent_decision_type', [
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision',
])

// ============================================================================
// Zod Schemas for JSONB Column Types (WINT-0040)
// ============================================================================

/**
 * Security Issue Schema
 * Structure for security findings in agentOutcomes.securityIssues
 */
export const securityIssueSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  location: z.string().optional(),
})

/**
 * Performance Metrics Schema
 * Structure for timing and resource data in agentOutcomes.performanceMetrics
 */
export const performanceMetricsSchema = z.object({
  duration_ms: z.number().int().nonnegative(),
  memory_mb: z.number().nonnegative().optional(),
  api_calls: z.number().int().nonnegative().optional(),
})

/**
 * Artifacts Metadata Schema
 * Structure for file change tracking in agentOutcomes.artifactsMetadata
 */
export const artifactsMetadataSchema = z.object({
  files_modified: z.number().int().nonnegative(),
  lines_added: z.number().int().nonnegative(),
  lines_removed: z.number().int().nonnegative(),
})

/**
 * Validation Error Schema
 * Structure for validation issues in stateTransitions.validationErrors
 */
export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
})

/**
 * Agent Invocations Table
 * Tracks every agent invocation for observability and debugging
 * Related stories: WINT-0040 (Telemetry & Observability)
 */
export const agentInvocations = wintSchema.table(
  'agent_invocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: text('invocation_id').notNull().unique(),

    // Agent context
    agentName: text('agent_name').notNull(),
    storyId: text('story_id'),
    phase: text('phase'), // 'setup', 'plan', 'execute', 'review', 'qa'

    // Invocation metadata
    inputPayload: jsonb('input_payload').$type<Record<string, unknown>>(),
    outputPayload: jsonb('output_payload').$type<Record<string, unknown>>(),

    // Performance metrics
    durationMs: integer('duration_ms'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),

    /** Tracks prompt caching token count for cost optimization */
    cachedTokens: integer('cached_tokens').notNull().default(0),

    /** Total token count (inputTokens + outputTokens + cachedTokens) - computed at application level */
    totalTokens: integer('total_tokens').notNull().default(0),

    /** Estimated API cost in USD based on token counts and model pricing (4 decimal precision for sub-cent accuracy) */
    estimatedCost: numeric('estimated_cost', { precision: 10, scale: 4 })
      .notNull()
      .default('0.0000'),

    /** LLM model name used for this invocation (e.g., 'claude-sonnet-4.5', 'gpt-4') */
    modelName: text('model_name'),

    // Status
    status: text('status').notNull(), // 'success', 'failure', 'partial'
    errorMessage: text('error_message'),

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: uniqueIndex('agent_invocations_invocation_id_idx').on(table.invocationId),
    agentNameIdx: index('agent_invocations_agent_name_idx').on(table.agentName),
    storyIdIdx: index('agent_invocations_story_id_idx').on(table.storyId),
    startedAtIdx: index('agent_invocations_started_at_idx').on(table.startedAt),
    statusIdx: index('agent_invocations_status_idx').on(table.status),
    agentStoryIdx: index('agent_invocations_agent_story_idx').on(table.agentName, table.storyId),
    // WINT-0040: Composite index for timeline views filtered by agent (high cardinality first per WINT-0010 pattern)
    agentNameStartedAtIdx: index('idx_agent_invocations_agent_name_started_at').on(
      table.agentName,
      table.startedAt,
    ),
  }),
)

/**
 * Agent Decisions Table
 * Records key decisions made by agents during execution
 * Related stories: WINT-0040, WINT-0050 (ML Pipeline)
 */
export const agentDecisions = wintSchema.table(
  'agent_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id')
      .notNull()
      .references(() => agentInvocations.id, { onDelete: 'cascade' }),

    // Decision classification
    decisionType: agentDecisionTypeEnum('decision_type').notNull(),
    decisionText: text('decision_text').notNull(),

    // Context
    context: jsonb('context').$type<{
      alternatives?: Array<{ option: string; reasoning: string }>
      constraints?: string[]
      riskFactors?: string[]
    }>(),

    // Outcome tracking (for ML training)
    confidence: integer('confidence'), // 0-100 scale
    wasCorrect: boolean('was_correct'), // Set during review/QA

    /** When decision correctness was assessed (nullable, evaluation happens later) */
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),

    /** Agent or user who evaluated correctness */
    evaluatedBy: text('evaluated_by'),

    /** Correctness score (0-100 range, replaces binary wasCorrect for more nuanced tracking) */
    correctnessScore: integer('correctness_score').$type<number | null>(),

    /** Count of alternatives evaluated during decision */
    alternativesConsidered: integer('alternatives_considered').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('agent_decisions_invocation_id_idx').on(table.invocationId),
    index('agent_decisions_decision_type_idx').on(table.decisionType),
    index('agent_decisions_created_at_idx').on(table.createdAt),
    // WINT-0040: Composite index for quality analysis queries (high cardinality first)
    index('idx_agent_decisions_decision_type_evaluated_at').on(
      table.decisionType,
      table.evaluatedAt,
    ),
    // WINT-0040: CHECK constraint for correctnessScore (0-100 range)
    check(
      'correctness_score_range',
      sql`${table.correctnessScore} >= 0 AND ${table.correctnessScore} <= 100`,
    ),
  ],
)

/**
 * Agent Outcomes Table
 * Tracks the outcomes of agent invocations for quality analysis
 * Related stories: WINT-0040, WINT-0050
 */
export const agentOutcomes = wintSchema.table(
  'agent_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id')
      .notNull()
      .references(() => agentInvocations.id, { onDelete: 'cascade' }),

    // Outcome classification
    outcomeType: text('outcome_type').notNull(), // 'success', 'partial_success', 'failure', 'blocked'

    // Results
    artifactsProduced: jsonb('artifacts_produced').$type<Array<{ type: string; path: string }>>(),
    testsWritten: integer('tests_written').notNull().default(0),
    testsPassed: integer('tests_passed').notNull().default(0),
    testsFailed: integer('tests_failed').notNull().default(0),

    // Quality metrics
    codeQuality: integer('code_quality'), // 0-100 scale
    testCoverage: integer('test_coverage'), // Percentage

    // Review feedback (set later)
    reviewScore: integer('review_score'), // 0-100 scale
    reviewNotes: text('review_notes'),

    /** Count of linting issues detected */
    lintErrors: integer('lint_errors').notNull().default(0),

    /** Count of TypeScript compilation errors */
    typeErrors: integer('type_errors').notNull().default(0),

    /** Array of security findings with severity, description, and optional location */
    securityIssues: jsonb('security_issues')
      .$type<z.infer<typeof securityIssueSchema>[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Timing breakdowns and resource usage metrics */
    performanceMetrics: jsonb('performance_metrics')
      .$type<z.infer<typeof performanceMetricsSchema>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    /** Detailed artifact tracking (files modified, lines added/removed) */
    artifactsMetadata: jsonb('artifacts_metadata')
      .$type<z.infer<typeof artifactsMetadataSchema>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: index('agent_outcomes_invocation_id_idx').on(table.invocationId),
    outcomeTypeIdx: index('agent_outcomes_outcome_type_idx').on(table.outcomeType),
    createdAtIdx: index('agent_outcomes_created_at_idx').on(table.createdAt),
    // WINT-0040: Composite index for outcome trend analysis (high cardinality first)
    outcomeTypeCreatedAtIdx: index('idx_agent_outcomes_outcome_type_created_at').on(
      table.outcomeType,
      table.createdAt,
    ),
  }),
)

/**
 * State Transitions Table
 * Tracks all state changes in the system for audit and analysis
 * Related stories: WINT-0040
 */
export const stateTransitions = wintSchema.table(
  'state_transitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Entity being transitioned
    entityType: text('entity_type').notNull(), // 'story', 'workflow', 'agent_task'
    entityId: text('entity_id').notNull(),

    // Transition details
    fromState: text('from_state').notNull(),
    toState: text('to_state').notNull(),

    // Context
    triggeredBy: text('triggered_by').notNull(), // 'user', 'agent', 'automation'
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    /** Snapshot of state before transition (for rollback capability) */
    previousMetadata: jsonb('previous_metadata').$type<Record<string, unknown>>(),

    /** Snapshot of state after transition (for audit trail) */
    newMetadata: jsonb('new_metadata').$type<Record<string, unknown>>(),

    /** Array of validation issues during transition (field, message pairs) */
    validationErrors: jsonb('validation_errors')
      .$type<z.infer<typeof validationErrorSchema>[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    /** Flag for safety checks - can this transition be rolled back? */
    rollbackAllowed: boolean('rollback_allowed').notNull().default(true),

    transitionedAt: timestamp('transitioned_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    entityIdx: index('state_transitions_entity_idx').on(table.entityType, table.entityId),
    transitionedAtIdx: index('state_transitions_transitioned_at_idx').on(table.transitionedAt),
    fromStateIdx: index('state_transitions_from_state_idx').on(table.fromState),
    toStateIdx: index('state_transitions_to_state_idx').on(table.toState),
    // WINT-0040: Composite index for audit trail queries (high cardinality first)
    entityTypeTransitionedAtIdx: index('idx_state_transitions_entity_type_transitioned_at').on(
      table.entityType,
      table.transitionedAt,
    ),
  }),
)

// ============================================================================
// WINT-0040: HITL Decisions + Story Outcomes (Telemetry Extension)
// ============================================================================

/**
 * Vector Custom Type
 *
 * Handles serialization/deserialization between JavaScript number arrays
 * and PostgreSQL pgvector VECTOR column format.
 *
 * NOTE: Defined locally — cross-package import from knowledge-base would create
 * an inappropriate package dependency. Pattern copied from
 * apps/api/knowledge-base/src/db/schema.ts lines 43-58.
 *
 * @see WINT-3070 for telemetry-log skill that writes to hitlDecisions
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
 * HITL Decisions Table (WINT-0040)
 *
 * Records every human-in-the-loop decision made during story execution.
 * Captures the decision text, semantic embedding for similarity search,
 * and contextual metadata for ML training.
 *
 * Decision data enables:
 * - Semantic search over past decisions (via embedding + ivfflat index)
 * - Per-operator decision pattern analysis
 * - Per-story decision audit trail
 *
 * @see WINT-3070 for telemetry-log skill that writes to this table (pre-wire comment)
 */
export const hitlDecisions = wintSchema.table(
  'hitl_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** FK to agent_invocations.id — nullable if decision occurred outside an invocation context */
    invocationId: uuid('invocation_id').references(() => agentInvocations.id, {
      onDelete: 'set null',
    }),

    /** Categorizes the decision type (e.g., approve, reject, defer, override) */
    decisionType: text('decision_type').notNull(),

    /** Human-readable description of the decision made */
    decisionText: text('decision_text').notNull(),

    /** Structured context at the time of decision (JSON snapshot) */
    context: jsonb('context').$type<Record<string, unknown>>(),

    /** 1536-dimensional embedding of decisionText for semantic similarity search */
    embedding: vector('embedding', { dimensions: 1536 }),

    /** Operator/user who made the decision */
    operatorId: text('operator_id').notNull(),

    /** Story this decision is associated with */
    storyId: text('story_id').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('hitl_decisions_story_id_idx').on(table.storyId),
    operatorIdIdx: index('hitl_decisions_operator_id_idx').on(table.operatorId),
    createdAtIdx: index('hitl_decisions_created_at_idx').on(table.createdAt),
    // ivfflat index for embedding column appended manually in migration (Drizzle cannot express it)
    // CREATE INDEX hitl_decisions_embedding_idx ON wint.hitl_decisions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  }),
)

/**
 * Story Outcomes Table (WINT-0040)
 *
 * Records the final outcome of each completed story execution.
 * Provides token usage, cost, quality scores, and iteration counts
 * for pipeline health reporting and ML training data.
 *
 * One row per story (unique storyId constraint).
 *
 * @see WINT-3070 for telemetry-log skill that writes to this table (pre-wire comment)
 */
export const storyOutcomes = wintSchema.table(
  'story_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Unique story identifier (e.g., WINT-0040) */
    storyId: text('story_id').notNull().unique(),

    /** Final outcome: 'pass', 'fail', 'blocked', 'cancelled' */
    finalVerdict: text('final_verdict').notNull(),

    /** Overall quality score 0-100 (enforced by Zod .refine()) */
    qualityScore: integer('quality_score').notNull().default(0),

    /** Cumulative input tokens across all agent invocations for this story */
    totalInputTokens: integer('total_input_tokens').notNull().default(0),

    /** Cumulative output tokens across all agent invocations for this story */
    totalOutputTokens: integer('total_output_tokens').notNull().default(0),

    /** Cumulative cached tokens across all agent invocations for this story */
    totalCachedTokens: integer('total_cached_tokens').notNull().default(0),

    /** Estimated total cost in USD (4 decimal precision for sub-cent accuracy) */
    estimatedTotalCost: numeric('estimated_total_cost', { precision: 10, scale: 4 })
      .notNull()
      .default('0.0000'),

    /** Number of review iterations before acceptance */
    reviewIterations: integer('review_iterations').notNull().default(0),

    /** Number of QA iterations before acceptance */
    qaIterations: integer('qa_iterations').notNull().default(0),

    /** Total wall-clock duration of story execution in milliseconds */
    durationMs: integer('duration_ms').notNull().default(0),

    /** Primary reason for failure or blocking (null if passed) */
    primaryBlocker: text('primary_blocker'),

    /** Arbitrary metadata for extensibility (JSON) */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    /** Timestamp when the story completed */
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: uniqueIndex('story_outcomes_story_id_idx').on(table.storyId),
    finalVerdictIdx: index('story_outcomes_final_verdict_idx').on(table.finalVerdict),
    completedAtIdx: index('story_outcomes_completed_at_idx').on(table.completedAt),
    // Composite index for common pipeline health query: filter by verdict within date range
    finalVerdictCompletedAtIdx: index('story_outcomes_final_verdict_completed_at_idx').on(
      table.finalVerdict,
      table.completedAt,
    ),
  }),
)

// ============================================================================
// 4. ML PIPELINE SCHEMA
// ============================================================================

/**
 * Model Type Enum
 * Defines types of ML models in the system
 */
export const modelTypeEnum = pgEnum('model_type', [
  'quality_predictor',
  'effort_estimator',
  'risk_classifier',
  'pattern_recommender',
])

/**
 * Training Data Table
 * Stores training examples for ML models
 * Related stories: WINT-0050 (ML Pipeline for Quality Prediction)
 */
export const trainingData = wintSchema.table(
  'training_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Classification
    dataType: text('data_type').notNull(), // 'story_outcome', 'decision_quality', 'effort_estimate'

    // Features (input)
    features: jsonb('features').notNull().$type<{
      complexity?: string
      storyPoints?: number
      surfaces?: Record<string, boolean>
      hasTests?: boolean
      linesOfCode?: number
      [key: string]: unknown
    }>(),

    // Labels (output/target)
    labels: jsonb('labels').notNull().$type<{
      quality?: number // 0-100
      effort?: number // story points or hours
      risk?: 'low' | 'medium' | 'high'
      [key: string]: unknown
    }>(),

    // Metadata
    storyId: text('story_id'),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),

    // Quality control
    validated: boolean('validated').notNull().default(false),
    validatedAt: timestamp('validated_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    dataTypeIdx: index('training_data_data_type_idx').on(table.dataType),
    storyIdIdx: index('training_data_story_id_idx').on(table.storyId),
    collectedAtIdx: index('training_data_collected_at_idx').on(table.collectedAt),
    validatedIdx: index('training_data_validated_idx').on(table.validated),
  }),
)

/**
 * ML Models Table
 * Tracks trained models and their versions
 * Related stories: WINT-0050
 */
export const mlModels = wintSchema.table(
  'ml_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Model identification
    modelName: text('model_name').notNull(),
    modelType: modelTypeEnum('model_type').notNull(),
    version: text('version').notNull(), // Semantic versioning (e.g., "1.2.3")

    // Model artifacts
    modelPath: text('model_path'), // S3 path or file path
    hyperparameters: jsonb('hyperparameters').$type<Record<string, unknown>>(),

    // Training metadata
    trainingDataCount: integer('training_data_count').notNull(),
    trainedAt: timestamp('trained_at', { withTimezone: true }).notNull().defaultNow(),
    trainedBy: text('trained_by'), // 'automated', 'manual', user_id

    // Status
    isActive: boolean('is_active').notNull().default(false),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    modelNameVersionIdx: uniqueIndex('ml_models_name_version_idx').on(
      table.modelName,
      table.version,
    ),
    modelTypeIdx: index('ml_models_model_type_idx').on(table.modelType),
    isActiveIdx: index('ml_models_is_active_idx').on(table.isActive),
    trainedAtIdx: index('ml_models_trained_at_idx').on(table.trainedAt),
  }),
)

/**
 * Model Predictions Table
 * Stores predictions made by ML models for tracking and analysis
 * Related stories: WINT-0050
 */
export const modelPredictions = wintSchema.table(
  'model_predictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => mlModels.id, { onDelete: 'cascade' }),

    // Prediction context
    predictionType: text('prediction_type').notNull(), // 'quality', 'effort', 'risk'
    entityType: text('entity_type').notNull(), // 'story', 'feature', 'task'
    entityId: text('entity_id').notNull(),

    // Input features
    features: jsonb('features').notNull().$type<Record<string, unknown>>(),

    // Prediction output
    prediction: jsonb('prediction').notNull().$type<{
      value: number | string
      confidence: number // 0-100
      distribution?: Record<string, number>
    }>(),

    // Validation (set after actual outcome is known)
    actualValue: jsonb('actual_value').$type<number | string>(),
    error: integer('error'), // Absolute error for numeric predictions

    predictedAt: timestamp('predicted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    modelIdIdx: index('model_predictions_model_id_idx').on(table.modelId),
    entityIdx: index('model_predictions_entity_idx').on(table.entityType, table.entityId),
    predictionTypeIdx: index('model_predictions_prediction_type_idx').on(table.predictionType),
    predictedAtIdx: index('model_predictions_predicted_at_idx').on(table.predictedAt),
  }),
)

/**
 * Model Metrics Table
 * Tracks performance metrics for deployed models
 * Related stories: WINT-0050
 */
export const modelMetrics = wintSchema.table(
  'model_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => mlModels.id, { onDelete: 'cascade' }),

    // Metric type
    metricType: text('metric_type').notNull(), // 'accuracy', 'precision', 'recall', 'mae', 'rmse'
    metricValue: integer('metric_value').notNull(), // Stored as integer (multiply by 100 for percentages)

    // Evaluation context
    evaluationDataset: text('evaluation_dataset'), // 'training', 'validation', 'test', 'production'
    sampleSize: integer('sample_size'),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    modelIdIdx: index('model_metrics_model_id_idx').on(table.modelId),
    metricTypeIdx: index('model_metrics_metric_type_idx').on(table.metricType),
    evaluatedAtIdx: index('model_metrics_evaluated_at_idx').on(table.evaluatedAt),
  }),
)

// ============================================================================
// 5. GRAPH RELATIONAL SCHEMA
// ============================================================================

/**
 * Feature Relationship Type Enum
 * Defines types of relationships between features
 */
export const featureRelationshipTypeEnum = pgEnum('feature_relationship_type', [
  'depends_on',
  'enhances',
  'conflicts_with',
  'related_to',
  'supersedes',
])

/**
 * Features Table
 * Tracks features in the codebase for dependency and cohesion analysis
 * Related stories: WINT-0060 (Graph Relational for Cohesion)
 */
export const features = wintSchema.table(
  'features',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Feature identification
    featureName: text('feature_name').notNull().unique(),
    featureType: text('feature_type').notNull(), // 'api_endpoint', 'ui_component', 'service', 'utility'

    // Location
    packageName: text('package_name'), // Package containing this feature
    filePath: text('file_path'), // Primary file implementing this feature

    // Metadata
    description: text('description'),
    tags: jsonb('tags').$type<string[]>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    featureNameIdx: uniqueIndex('features_feature_name_idx').on(table.featureName),
    featureTypeIdx: index('features_feature_type_idx').on(table.featureType),
    packageNameIdx: index('features_package_name_idx').on(table.packageName),
    isActiveIdx: index('features_is_active_idx').on(table.isActive),
    // Composite indexes for common query patterns (high cardinality → low cardinality)
    packageFeatureTypeIdx: index('features_package_feature_type_idx').on(
      table.packageName,
      table.featureType,
    ),
    activeFeatureTypeIdx: index('features_active_feature_type_idx').on(
      table.isActive,
      table.featureType,
    ),
  }),
)

/**
 * Capabilities Table
 * Tracks high-level capabilities provided by features
 * Related stories: WINT-0060
 */
export const capabilities = wintSchema.table(
  'capabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Capability identification
    capabilityName: text('capability_name').notNull().unique(),
    capabilityType: text('capability_type').notNull(), // 'business', 'technical', 'infrastructure'

    // Metadata
    description: text('description'),
    owner: text('owner'), // Team or person responsible
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    // Status
    maturityLevel: text('maturity_level'), // 'experimental', 'beta', 'stable', 'deprecated'
    lifecycleStage: text('lifecycle_stage'), // 'create', 'read', 'update', 'delete' — CRUD lifecycle (app-enforced)

    // Feature linkage (WINT-0131)
    // Nullable FK: null = capability not yet linked to a feature
    featureId: uuid('feature_id').references(() => features.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    capabilityNameIdx: uniqueIndex('capabilities_capability_name_idx').on(table.capabilityName),
    capabilityTypeIdx: index('capabilities_capability_type_idx').on(table.capabilityType),
    maturityLevelIdx: index('capabilities_maturity_level_idx').on(table.maturityLevel),
    featureIdIdx: index('idx_capabilities_feature_id').on(table.featureId),
  }),
)

/**
 * Feature Relationships Table
 * Tracks relationships between features for dependency graph
 * Related stories: WINT-0060
 */
export const featureRelationships = wintSchema.table(
  'feature_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationship endpoints (self-referencing)
    sourceFeatureId: uuid('source_feature_id')
      .notNull()
      .references(() => features.id, { onDelete: 'cascade' }),
    targetFeatureId: uuid('target_feature_id')
      .notNull()
      .references(() => features.id, { onDelete: 'cascade' }),

    // Relationship type
    relationshipType: featureRelationshipTypeEnum('relationship_type').notNull(),

    // Strength (for weighted graph analysis)
    strength: integer('strength').notNull().default(50), // 0-100 scale

    // Metadata
    description: text('description'),
    detectedBy: text('detected_by'), // 'manual', 'static_analysis', 'runtime'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    sourceFeatureIdx: index('feature_relationships_source_idx').on(table.sourceFeatureId),
    targetFeatureIdx: index('feature_relationships_target_idx').on(table.targetFeatureId),
    relationshipTypeIdx: index('feature_relationships_type_idx').on(table.relationshipType),
    // Unique constraint to prevent duplicate relationships
    uniqueRelationship: uniqueIndex('feature_relationships_unique').on(
      table.sourceFeatureId,
      table.targetFeatureId,
      table.relationshipType,
    ),
    // Composite indexes for graph traversal queries
    sourceTypeIdx: index('feature_relationships_source_type_idx').on(
      table.sourceFeatureId,
      table.relationshipType,
    ),
    targetTypeIdx: index('feature_relationships_target_type_idx').on(
      table.targetFeatureId,
      table.relationshipType,
    ),
  }),
)

/**
 * Cohesion Rules Table
 * Defines rules for feature cohesion and co-location
 * Related stories: WINT-0060
 */
export const cohesionRules = wintSchema.table(
  'cohesion_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Rule definition
    ruleName: text('rule_name').notNull().unique(),
    ruleType: text('rule_type').notNull(), // 'package_cohesion', 'feature_coupling', 'layer_separation'

    // Conditions
    conditions: jsonb('conditions').notNull().$type<{
      featurePatterns?: string[]
      packagePatterns?: string[]
      relationshipTypes?: string[]
    }>(),

    // Thresholds
    maxViolations: integer('max_violations').notNull().default(0),
    severity: text('severity').notNull(), // 'error', 'warning', 'info'

    // Status
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    ruleNameIdx: uniqueIndex('cohesion_rules_rule_name_idx').on(table.ruleName),
    ruleTypeIdx: index('cohesion_rules_rule_type_idx').on(table.ruleType),
    isActiveIdx: index('cohesion_rules_is_active_idx').on(table.isActive),
    // Composite index for active rule queries
    typeActiveIdx: index('cohesion_rules_type_active_idx').on(table.ruleType, table.isActive),
  }),
)

/**
 * Graph Relational Schema Relations
 * Defines relationships for graph traversal and queries
 */

// Features Relations
export const featuresRelations = relations(features, ({ many }) => ({
  outgoingRelationships: many(featureRelationships, {
    relationName: 'sourceFeature',
  }),
  incomingRelationships: many(featureRelationships, {
    relationName: 'targetFeature',
  }),
  // WINT-0131: bidirectional relation — features have many capabilities
  capabilities: many(capabilities),
}))

// Feature Relationships Relations
export const featureRelationshipsRelations = relations(featureRelationships, ({ one }) => ({
  sourceFeature: one(features, {
    fields: [featureRelationships.sourceFeatureId],
    references: [features.id],
    relationName: 'sourceFeature',
  }),
  targetFeature: one(features, {
    fields: [featureRelationships.targetFeatureId],
    references: [features.id],
    relationName: 'targetFeature',
  }),
}))

// Capabilities Relations (WINT-0131: add feature FK relation)
export const capabilitiesRelations = relations(capabilities, ({ one }) => ({
  feature: one(features, {
    fields: [capabilities.featureId],
    references: [features.id],
  }),
}))

// Cohesion Rules Relations (placeholder for future expansion)
export const cohesionRulesRelations = relations(cohesionRules, () => ({}))

// ============================================================================
// 6. WORKFLOW TRACKING SCHEMA
// ============================================================================

/**
 * Workflow Status Enum
 * Defines execution states for workflows
 */
export const workflowStatusEnum = pgEnum('workflow_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
  'blocked',
])

/**
 * Workflow Executions Table
 * Tracks workflow execution instances
 * Related stories: WINT-0070 (Workflow Execution Tracking)
 */
export const workflowExecutions = wintSchema.table(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: text('execution_id').notNull().unique(),

    // Workflow metadata
    workflowName: text('workflow_name').notNull(),
    workflowVersion: text('workflow_version').notNull(),

    // Execution context
    storyId: text('story_id'),
    triggeredBy: text('triggered_by').notNull(), // 'user', 'automation', 'schedule'

    // State
    status: workflowStatusEnum('status').notNull().default('pending'),

    // Input/Output
    inputPayload: jsonb('input_payload').$type<Record<string, unknown>>(),
    outputPayload: jsonb('output_payload').$type<Record<string, unknown>>(),

    // Execution metrics
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Error handling
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: uniqueIndex('workflow_executions_execution_id_idx').on(table.executionId),
    workflowNameIdx: index('workflow_executions_workflow_name_idx').on(table.workflowName),
    storyIdIdx: index('workflow_executions_story_id_idx').on(table.storyId),
    statusIdx: index('workflow_executions_status_idx').on(table.status),
    startedAtIdx: index('workflow_executions_started_at_idx').on(table.startedAt),
    workflowStatusIdx: index('workflow_executions_workflow_status_idx').on(
      table.workflowName,
      table.status,
    ),
  }),
)

/**
 * Workflow Checkpoints Table
 * Tracks checkpoint state during workflow execution
 * Related stories: WINT-0070
 */
export const workflowCheckpoints = wintSchema.table(
  'workflow_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),

    // Checkpoint metadata
    checkpointName: text('checkpoint_name').notNull(),
    phase: text('phase').notNull(), // 'setup', 'plan', 'execute', 'review', 'qa'

    // State snapshot
    state: jsonb('state').notNull().$type<Record<string, unknown>>(),

    // Status
    status: text('status').notNull(), // 'reached', 'skipped', 'failed'

    reachedAt: timestamp('reached_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('workflow_checkpoints_execution_id_idx').on(table.executionId),
    phaseIdx: index('workflow_checkpoints_phase_idx').on(table.phase),
    reachedAtIdx: index('workflow_checkpoints_reached_at_idx').on(table.reachedAt),
    executionPhaseIdx: index('workflow_checkpoints_execution_phase_idx').on(
      table.executionId,
      table.phase,
    ),
  }),
)

/**
 * Workflow Audit Log Table
 * Comprehensive audit trail for all workflow state changes
 * Related stories: WINT-0070
 */
export const workflowAuditLog = wintSchema.table(
  'workflow_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),

    // Event details
    eventType: text('event_type').notNull(), // 'state_change', 'checkpoint', 'decision', 'error'
    eventData: jsonb('event_data').notNull().$type<{
      previousState?: string
      newState?: string
      agentName?: string
      decisionId?: string
      errorDetails?: Record<string, unknown>
      [key: string]: unknown
    }>(),

    // Context
    triggeredBy: text('triggered_by').notNull(),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('workflow_audit_log_execution_id_idx').on(table.executionId),
    eventTypeIdx: index('workflow_audit_log_event_type_idx').on(table.eventType),
    occurredAtIdx: index('workflow_audit_log_occurred_at_idx').on(table.occurredAt),
    executionOccurredIdx: index('workflow_audit_log_execution_occurred_idx').on(
      table.executionId,
      table.occurredAt,
    ),
  }),
)

// ============================================================================
// RELATIONS
// ============================================================================

// Story Management Relations
export const storiesRelations = relations(stories, ({ many }) => ({
  // Existing WINT-0010 relations
  states: many(storyStates),
  transitions: many(storyTransitions),
  dependencies: many(storyDependencies, { relationName: 'story_dependencies' }),
  dependents: many(storyDependencies, { relationName: 'story_dependents' }),

  // New WINT-0020 relations
  artifacts: many(storyArtifacts),
  phaseHistory: many(storyPhaseHistory),
  metadataVersions: many(storyMetadataVersions),
  assignments: many(storyAssignments),
  blockers: many(storyBlockers),
}))

export const storyStatesRelations = relations(storyStates, ({ one }) => ({
  story: one(stories, {
    fields: [storyStates.storyId],
    references: [stories.id],
  }),
}))

export const storyTransitionsRelations = relations(storyTransitions, ({ one }) => ({
  story: one(stories, {
    fields: [storyTransitions.storyId],
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

/**
 * Drizzle relations for storyArtifacts table (WINT-0020)
 * Enables query syntax: db.query.stories.findMany({ with: { artifacts: true } })
 */
export const storyArtifactsRelations = relations(storyArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [storyArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Drizzle relations for storyPhaseHistory table (WINT-0020)
 * Enables query syntax: db.query.stories.findMany({ with: { phaseHistory: true } })
 */
export const storyPhaseHistoryRelations = relations(storyPhaseHistory, ({ one }) => ({
  story: one(stories, {
    fields: [storyPhaseHistory.storyId],
    references: [stories.id],
  }),
}))

/**
 * Drizzle relations for storyMetadataVersions table (WINT-0020)
 * Enables query syntax: db.query.stories.findMany({ with: { metadataVersions: true } })
 */
export const storyMetadataVersionsRelations = relations(storyMetadataVersions, ({ one }) => ({
  story: one(stories, {
    fields: [storyMetadataVersions.storyId],
    references: [stories.id],
  }),
}))

/**
 * Drizzle relations for storyAssignments table (WINT-0020)
 * Enables query syntax: db.query.stories.findMany({ with: { assignments: true } })
 */
export const storyAssignmentsRelations = relations(storyAssignments, ({ one }) => ({
  story: one(stories, {
    fields: [storyAssignments.storyId],
    references: [stories.id],
  }),
}))

/**
 * Drizzle relations for storyBlockers table (WINT-0020)
 * Enables query syntax: db.query.stories.findMany({ with: { blockers: true } })
 */
export const storyBlockersRelations = relations(storyBlockers, ({ one }) => ({
  story: one(stories, {
    fields: [storyBlockers.storyId],
    references: [stories.id],
  }),
}))

// Context Cache Relations
export const contextSessionsRelations = relations(contextSessions, ({ many }) => ({
  cacheHits: many(contextCacheHits),
}))

export const contextPacksRelations = relations(contextPacks, ({ many }) => ({
  hits: many(contextCacheHits),
}))

export const contextCacheHitsRelations = relations(contextCacheHits, ({ one }) => ({
  session: one(contextSessions, {
    fields: [contextCacheHits.sessionId],
    references: [contextSessions.id],
  }),
  pack: one(contextPacks, {
    fields: [contextCacheHits.packId],
    references: [contextPacks.id],
  }),
}))

// Telemetry Relations
export const agentInvocationsRelations = relations(agentInvocations, ({ many }) => ({
  decisions: many(agentDecisions),
  outcomes: many(agentOutcomes),
}))

export const agentDecisionsRelations = relations(agentDecisions, ({ one }) => ({
  invocation: one(agentInvocations, {
    fields: [agentDecisions.invocationId],
    references: [agentInvocations.id],
  }),
}))

export const agentOutcomesRelations = relations(agentOutcomes, ({ one }) => ({
  invocation: one(agentInvocations, {
    fields: [agentOutcomes.invocationId],
    references: [agentInvocations.id],
  }),
}))

// ML Pipeline Relations
export const mlModelsRelations = relations(mlModels, ({ many }) => ({
  predictions: many(modelPredictions),
  metrics: many(modelMetrics),
}))

export const modelPredictionsRelations = relations(modelPredictions, ({ one }) => ({
  model: one(mlModels, {
    fields: [modelPredictions.modelId],
    references: [mlModels.id],
  }),
}))

export const modelMetricsRelations = relations(modelMetrics, ({ one }) => ({
  model: one(mlModels, {
    fields: [modelMetrics.modelId],
    references: [mlModels.id],
  }),
}))

// Workflow Tracking Relations
export const workflowExecutionsRelations = relations(workflowExecutions, ({ many }) => ({
  checkpoints: many(workflowCheckpoints),
  auditLogs: many(workflowAuditLog),
}))

export const workflowCheckpointsRelations = relations(workflowCheckpoints, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowCheckpoints.executionId],
    references: [workflowExecutions.id],
  }),
}))

export const workflowAuditLogRelations = relations(workflowAuditLog, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowAuditLog.executionId],
    references: [workflowExecutions.id],
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

export const insertStoryTransitionSchema = createInsertSchema(storyTransitions)
export const selectStoryTransitionSchema = createSelectSchema(storyTransitions)
export type InsertStoryTransition = z.infer<typeof insertStoryTransitionSchema>
export type SelectStoryTransition = z.infer<typeof selectStoryTransitionSchema>

export const insertStoryDependencySchema = createInsertSchema(storyDependencies)
export const selectStoryDependencySchema = createSelectSchema(storyDependencies)
export type InsertStoryDependency = z.infer<typeof insertStoryDependencySchema>
export type SelectStoryDependency = z.infer<typeof selectStoryDependencySchema>

// Story Artifacts Zod Schemas (WINT-0020)
export const insertStoryArtifactSchema = createInsertSchema(storyArtifacts)
export const selectStoryArtifactSchema = createSelectSchema(storyArtifacts)
export type InsertStoryArtifact = z.infer<typeof insertStoryArtifactSchema>
export type SelectStoryArtifact = z.infer<typeof selectStoryArtifactSchema>

// Story Phase History Zod Schemas (WINT-0020)
export const insertStoryPhaseHistorySchema = createInsertSchema(storyPhaseHistory)
export const selectStoryPhaseHistorySchema = createSelectSchema(storyPhaseHistory)
export type InsertStoryPhaseHistory = z.infer<typeof insertStoryPhaseHistorySchema>
export type SelectStoryPhaseHistory = z.infer<typeof selectStoryPhaseHistorySchema>

// Story Metadata Versions Zod Schemas (WINT-0020)
export const insertStoryMetadataVersionSchema = createInsertSchema(storyMetadataVersions)
export const selectStoryMetadataVersionSchema = createSelectSchema(storyMetadataVersions)
export type InsertStoryMetadataVersion = z.infer<typeof insertStoryMetadataVersionSchema>
export type SelectStoryMetadataVersion = z.infer<typeof selectStoryMetadataVersionSchema>

// Story Assignments Zod Schemas (WINT-0020)
export const insertStoryAssignmentSchema = createInsertSchema(storyAssignments)
export const selectStoryAssignmentSchema = createSelectSchema(storyAssignments)
export type InsertStoryAssignment = z.infer<typeof insertStoryAssignmentSchema>
export type SelectStoryAssignment = z.infer<typeof selectStoryAssignmentSchema>

// Story Blockers Zod Schemas (WINT-0020)
export const insertStoryBlockerSchema = createInsertSchema(storyBlockers)
export const selectStoryBlockerSchema = createSelectSchema(storyBlockers)
export type InsertStoryBlocker = z.infer<typeof insertStoryBlockerSchema>
export type SelectStoryBlocker = z.infer<typeof selectStoryBlockerSchema>

// Context Cache Zod Schemas
export const insertContextPackSchema = createInsertSchema(contextPacks)
export const selectContextPackSchema = createSelectSchema(contextPacks)
export type InsertContextPack = z.infer<typeof insertContextPackSchema>
export type SelectContextPack = z.infer<typeof selectContextPackSchema>

export const insertContextSessionSchema = createInsertSchema(contextSessions)
export const selectContextSessionSchema = createSelectSchema(contextSessions)
export type InsertContextSession = z.infer<typeof insertContextSessionSchema>
export type SelectContextSession = z.infer<typeof selectContextSessionSchema>

export const insertContextCacheHitSchema = createInsertSchema(contextCacheHits)
export const selectContextCacheHitSchema = createSelectSchema(contextCacheHits)
export type InsertContextCacheHit = z.infer<typeof insertContextCacheHitSchema>
export type SelectContextCacheHit = z.infer<typeof selectContextCacheHitSchema>

// Telemetry Zod Schemas
export const insertAgentInvocationSchema = createInsertSchema(agentInvocations)
export const selectAgentInvocationSchema = createSelectSchema(agentInvocations)
export type InsertAgentInvocation = z.infer<typeof insertAgentInvocationSchema>
export type SelectAgentInvocation = z.infer<typeof selectAgentInvocationSchema>

export const insertAgentDecisionSchema = createInsertSchema(agentDecisions)
export const selectAgentDecisionSchema = createSelectSchema(agentDecisions)
export type InsertAgentDecision = z.infer<typeof insertAgentDecisionSchema>
export type SelectAgentDecision = z.infer<typeof selectAgentDecisionSchema>

export const insertAgentOutcomeSchema = createInsertSchema(agentOutcomes)
export const selectAgentOutcomeSchema = createSelectSchema(agentOutcomes)
export type InsertAgentOutcome = z.infer<typeof insertAgentOutcomeSchema>
export type SelectAgentOutcome = z.infer<typeof selectAgentOutcomeSchema>

export const insertStateTransitionSchema = createInsertSchema(stateTransitions)
export const selectStateTransitionSchema = createSelectSchema(stateTransitions)
export type InsertStateTransition = z.infer<typeof insertStateTransitionSchema>
export type SelectStateTransition = z.infer<typeof selectStateTransitionSchema>

// HITL Decisions Zod Schemas (WINT-0040)
export const insertHitlDecisionSchema = createInsertSchema(hitlDecisions)
export const selectHitlDecisionSchema = createSelectSchema(hitlDecisions)
export type InsertHitlDecision = z.infer<typeof insertHitlDecisionSchema>
export type SelectHitlDecision = z.infer<typeof selectHitlDecisionSchema>

// Story Outcomes Zod Schemas (WINT-0040)
export const insertStoryOutcomeSchema = createInsertSchema(storyOutcomes).refine(
  data => data.qualityScore === undefined || (data.qualityScore >= 0 && data.qualityScore <= 100),
  {
    message: 'qualityScore must be between 0 and 100',
    path: ['qualityScore'],
  },
)
export const selectStoryOutcomeSchema = createSelectSchema(storyOutcomes)
export type InsertStoryOutcome = z.infer<typeof insertStoryOutcomeSchema>
export type SelectStoryOutcome = z.infer<typeof selectStoryOutcomeSchema>

// ML Pipeline Zod Schemas
export const insertTrainingDataSchema = createInsertSchema(trainingData)
export const selectTrainingDataSchema = createSelectSchema(trainingData)
export type InsertTrainingData = z.infer<typeof insertTrainingDataSchema>
export type SelectTrainingData = z.infer<typeof selectTrainingDataSchema>

export const insertMlModelSchema = createInsertSchema(mlModels)
export const selectMlModelSchema = createSelectSchema(mlModels)
export type InsertMlModel = z.infer<typeof insertMlModelSchema>
export type SelectMlModel = z.infer<typeof selectMlModelSchema>

export const insertModelPredictionSchema = createInsertSchema(modelPredictions)
export const selectModelPredictionSchema = createSelectSchema(modelPredictions)
export type InsertModelPrediction = z.infer<typeof insertModelPredictionSchema>
export type SelectModelPrediction = z.infer<typeof selectModelPredictionSchema>

export const insertModelMetricSchema = createInsertSchema(modelMetrics)
export const selectModelMetricSchema = createSelectSchema(modelMetrics)
export type InsertModelMetric = z.infer<typeof insertModelMetricSchema>
export type SelectModelMetric = z.infer<typeof selectModelMetricSchema>

// Graph Relational Zod Schemas
export const insertFeatureSchema = createInsertSchema(features)
export const selectFeatureSchema = createSelectSchema(features)
export type InsertFeature = z.infer<typeof insertFeatureSchema>
export type SelectFeature = z.infer<typeof selectFeatureSchema>

export const insertCapabilitySchema = createInsertSchema(capabilities)
export const selectCapabilitySchema = createSelectSchema(capabilities)
export type InsertCapability = z.infer<typeof insertCapabilitySchema>
export type SelectCapability = z.infer<typeof selectCapabilitySchema>

export const insertFeatureRelationshipSchema = createInsertSchema(featureRelationships).refine(
  data => data.strength !== undefined && data.strength >= 0 && data.strength <= 100,
  {
    message: 'Strength must be between 0 and 100',
    path: ['strength'],
  },
)
export const selectFeatureRelationshipSchema = createSelectSchema(featureRelationships).refine(
  data => data.strength !== undefined && data.strength >= 0 && data.strength <= 100,
  {
    message: 'Strength must be between 0 and 100',
    path: ['strength'],
  },
)
export type InsertFeatureRelationship = z.infer<typeof insertFeatureRelationshipSchema>
export type SelectFeatureRelationship = z.infer<typeof selectFeatureRelationshipSchema>

export const insertCohesionRuleSchema = createInsertSchema(cohesionRules)
export const selectCohesionRuleSchema = createSelectSchema(cohesionRules)
export type InsertCohesionRule = z.infer<typeof insertCohesionRuleSchema>
export type SelectCohesionRule = z.infer<typeof selectCohesionRuleSchema>

// Workflow Tracking Zod Schemas
export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions)
export const selectWorkflowExecutionSchema = createSelectSchema(workflowExecutions)
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>
export type SelectWorkflowExecution = z.infer<typeof selectWorkflowExecutionSchema>

export const insertWorkflowCheckpointSchema = createInsertSchema(workflowCheckpoints)
export const selectWorkflowCheckpointSchema = createSelectSchema(workflowCheckpoints)
export type InsertWorkflowCheckpoint = z.infer<typeof insertWorkflowCheckpointSchema>
export type SelectWorkflowCheckpoint = z.infer<typeof selectWorkflowCheckpointSchema>

export const insertWorkflowAuditLogSchema = createInsertSchema(workflowAuditLog)
export const selectWorkflowAuditLogSchema = createSelectSchema(workflowAuditLog)
export type InsertWorkflowAuditLog = z.infer<typeof insertWorkflowAuditLogSchema>
export type SelectWorkflowAuditLog = z.infer<typeof selectWorkflowAuditLogSchema>

// MODEL ASSIGNMENTS SCHEMA (APIP-0040)
// ============================================================================

/**
 * Model Assignments Table
 *
 * Stores per-agent-pattern model assignments, allowing DB-backed overrides
 * of the default YAML-driven escalation chain.
 *
 * Story APIP-0040: PipelineModelRouter with escalation chain + budget tracking
 */
export const modelAssignments = wintSchema.table('model_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentPattern: text('agent_pattern').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  tier: integer('tier').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertModelAssignmentSchema = createInsertSchema(modelAssignments)
export const selectModelAssignmentSchema = createSelectSchema(modelAssignments)
export type InsertModelAssignment = z.infer<typeof insertModelAssignmentSchema>
export type SelectModelAssignment = z.infer<typeof selectModelAssignmentSchema>

// ============================================================================
// 7. MODEL AFFINITY SCHEMA (APIP-3020)
// ============================================================================

/**
 * Confidence Level Enum
 * Defines the confidence band for a model-change-type-file-type affinity profile.
 * Lives in the 'wint' schema namespace (wintSchema.enum, not pgEnum).
 */
export const confidenceLevelEnum = wintSchema.enum('confidence_level', [
  'high',
  'medium',
  'low',
  'unknown',
])

/**
 * Model Affinity Table
 * Stores aggregated affinity profiles: per-(model_id, change_type, file_type) triple.
 * Updated incrementally by the Pattern Miner cron graph (runPatternMiner()).
 *
 * Story: APIP-3020 - Pattern Miner and Model Affinity Profiles
 *
 * Key design decisions:
 * - success_rate: weighted average (0.0–1.0), updated via ON CONFLICT DO UPDATE
 * - avg_tokens: weighted average of (tokens_in + tokens_out)
 * - avg_retry_count: weighted average of retry_count
 * - trend: jsonb {direction: 'up'|'down'|'stable', delta: number, computed_at: ISO string}
 * - last_aggregated_at: watermark for incremental re-aggregation
 */
export const modelAffinity = wintSchema.table(
  'model_affinity',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Affinity key triple
    modelId: text('model_id').notNull(),
    changeType: text('change_type').notNull(),
    fileType: text('file_type').notNull(),

    // Aggregated metrics
    successRate: numeric('success_rate', { precision: 5, scale: 4 }).notNull().default('0'),
    sampleCount: integer('sample_count').notNull().default(0),
    avgTokens: numeric('avg_tokens', { precision: 10, scale: 2 }).notNull().default('0'),
    avgRetryCount: numeric('avg_retry_count', { precision: 6, scale: 3 }).notNull().default('0'),

    // Confidence band
    confidenceLevel: confidenceLevelEnum('confidence_level').notNull().default('unknown'),

    // Trend detection (jsonb: {direction, delta, computed_at})
    trend: jsonb('trend'),

    // Incremental aggregation watermark
    lastAggregatedAt: timestamp('last_aggregated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Unique composite: one profile per (model, change_type, file_type)
    modelAffinityUniqueIdx: uniqueIndex('idx_model_affinity_unique').on(
      table.modelId,
      table.changeType,
      table.fileType,
    ),
    // Index: confidence_level for filtering high-confidence profiles
    confidenceLevelIdx: index('idx_model_affinity_confidence_level').on(table.confidenceLevel),
    // Index: last_aggregated_at for incremental watermark queries
    lastAggregatedAtIdx: index('idx_model_affinity_last_aggregated_at').on(table.lastAggregatedAt),
  }),
)

// ============================================================================
// Model Affinity Zod Schemas (APIP-3020)
// ============================================================================

export const ModelAffinityInsertSchema = createInsertSchema(modelAffinity)
export const ModelAffinitySelectSchema = createSelectSchema(modelAffinity)
export type InsertModelAffinity = z.infer<typeof ModelAffinityInsertSchema>
export type SelectModelAffinity = z.infer<typeof ModelAffinitySelectSchema>

// ============================================================================
// 8. MODEL EXPERIMENTS SCHEMA (APIP-3060)
// ============================================================================

/**
 * Experiment Status Enum
 * Defines the lifecycle states of a bake-off model experiment
 */
export const experimentStatusEnum = pgEnum('experiment_status', ['active', 'concluded', 'expired'])

/**
 * Model Experiments Table
 * Tracks controlled two-arm model comparison (bake-off) experiments.
 * Each row represents one live A/B experiment for a (change_type, file_type) pair.
 *
 * Story APIP-3060: Bake-Off Engine for Model Experiments
 */
export const modelExperiments = wintSchema.table(
  'model_experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Experiment scope — uniquely constrained to one active row per pair
    changeType: varchar('change_type', { length: 64 }).notNull(),
    fileType: varchar('file_type', { length: 64 }).notNull(),

    // Arms
    controlModel: varchar('control_model', { length: 128 }).notNull(),
    challengerModel: varchar('challenger_model', { length: 128 }).notNull(),

    // Lifecycle
    status: experimentStatusEnum('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    concludedAt: timestamp('concluded_at', { withTimezone: true }),

    // Sample counts recorded at conclusion
    controlSampleSize: integer('control_sample_size'),
    challengerSampleSize: integer('challenger_sample_size'),

    // Success rates recorded at conclusion (precision 5, scale 4 — e.g. 0.9875)
    controlSuccessRate: numeric('control_success_rate', { precision: 5, scale: 4 }),
    challengerSuccessRate: numeric('challenger_success_rate', { precision: 5, scale: 4 }),

    // Window configuration
    minSamplePerArm: integer('min_sample_per_arm').notNull().default(50),
    maxWindowRows: integer('max_window_rows'),
    maxWindowDays: integer('max_window_days'),

    // Winner recorded on conclusion
    winner: varchar('winner', { length: 128 }),

    // Metadata / notes
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Only one active experiment per (change_type, file_type) pair at a time
    activeExperimentUniqueIdx: uniqueIndex('model_experiments_active_unique_idx')
      .on(table.changeType, table.fileType)
      .where(sql`${table.status} = 'active'`),
    statusIdx: index('model_experiments_status_idx').on(table.status),
    startedAtIdx: index('model_experiments_started_at_idx').on(table.startedAt),
  }),
)

// Model Experiments Zod Schemas (APIP-3060)
export const ModelExperimentInsertSchema = createInsertSchema(modelExperiments)
export const ModelExperimentSelectSchema = createSelectSchema(modelExperiments)
export type ModelExperimentInsert = z.infer<typeof ModelExperimentInsertSchema>
export type ModelExperimentSelect = z.infer<typeof ModelExperimentSelectSchema>

// ============================================================================
// 9. TEST QUALITY SNAPSHOTS SCHEMA (APIP-4040)
// ============================================================================

/**
 * Test Quality Snapshot Status Enum
 * Reflects the overall health status of a test quality run.
 * Lives in the 'wint' schema namespace.
 */
export const testQualitySnapshotStatusEnum = wintSchema.enum('test_quality_snapshot_status', [
  'pass',
  'warn',
  'fail',
])

/**
 * Test Quality Snapshots Table
 * Stores per-run snapshots of test quality metrics collected by the
 * Test Quality Monitor cron job.
 *
 * Story: APIP-4040 - Test Quality Monitor
 *
 * Key design decisions:
 * - mutation_score: nullable — deferred to APIP-4040-B (mutation testing not yet installed)
 * - config: jsonb — full config echoed for each snapshot for reproducibility
 * - snapshot_at: the logical time of the snapshot (cron run start time)
 */
export const testQualitySnapshots = wintSchema.table(
  'test_quality_snapshots',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Snapshot time (logical — cron run start)
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }).notNull(),

    // Overall status
    status: testQualitySnapshotStatusEnum('status').notNull(),

    // Assertion density
    assertionCount: integer('assertion_count').notNull().default(0),
    testCount: integer('test_count').notNull().default(0),
    assertionDensityRatio: numeric('assertion_density_ratio', { precision: 8, scale: 4 })
      .notNull()
      .default('0'),

    // Orphaned tests
    orphanedTestCount: integer('orphaned_test_count').notNull().default(0),

    // Critical path coverage (percentages stored as NUMERIC for precision)
    criticalPathLineCoverage: numeric('critical_path_line_coverage', { precision: 6, scale: 2 })
      .notNull()
      .default('0'),
    criticalPathBranchCoverage: numeric('critical_path_branch_coverage', { precision: 6, scale: 2 })
      .notNull()
      .default('0'),

    // Mutation score (DEFERRED to APIP-4040-B — nullable)
    mutationScore: numeric('mutation_score', { precision: 5, scale: 4 }),

    // Full config snapshot (for reproducibility and threshold tracing)
    config: jsonb('config').$type<Record<string, unknown>>().notNull(),

    // Audit timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index: snapshot_at for time-series queries and decay detection
    snapshotAtIdx: index('idx_test_quality_snapshots_snapshot_at').on(table.snapshotAt),
    // Index: status for filtering pass/warn/fail snapshots
    statusIdx: index('idx_test_quality_snapshots_status').on(table.status),
    // Composite: status + snapshot_at for range queries filtered by status
    statusSnapshotAtIdx: index('idx_test_quality_snapshots_status_snapshot_at').on(
      table.status,
      table.snapshotAt,
    ),
  }),
)

// ============================================================================
// Test Quality Snapshots Zod Schemas (APIP-4040)
// ============================================================================

export const TestQualitySnapshotInsertSchema = createInsertSchema(testQualitySnapshots)
export const TestQualitySnapshotSelectSchema = createSelectSchema(testQualitySnapshots)
export type InsertTestQualitySnapshot = z.infer<typeof TestQualitySnapshotInsertSchema>
export type SelectTestQualitySnapshot = z.infer<typeof TestQualitySnapshotSelectSchema>

// ============================================================================
// APIP-4030: Dependency Auditor Tables
// ============================================================================

/**
 * Dep Audit Runs Table
 *
 * Records each post-merge dependency audit run.
 * Tracks which story/commit triggered it, which packages changed,
 * the overall risk level, and a count of findings.
 *
 * Story: APIP-4030 - Dependency Auditor
 */
export const depAuditRuns = wintSchema.table(
  'dep_audit_runs',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // Trigger context
    storyId: varchar('story_id', { length: 255 }).notNull(),
    commitSha: varchar('commit_sha', { length: 64 }),

    // Audit timestamp
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),

    // Package change summary (jsonb arrays)
    packagesAdded: jsonb('packages_added')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    packagesUpdated: jsonb('packages_updated')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    packagesRemoved: jsonb('packages_removed')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Overall risk assessment
    overallRisk: varchar('overall_risk', { length: 16 }).notNull().default('none'),
    // Constraint: 'none' | 'low' | 'medium' | 'high' | 'critical'

    // Summary counts
    findingsCount: integer('findings_count').notNull().default(0),
    blockedQueueItemsCreated: integer('blocked_queue_items_created').notNull().default(0),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('idx_dep_audit_runs_story_id').on(table.storyId),
    triggeredAtIdx: index('idx_dep_audit_runs_triggered_at').on(table.triggeredAt),
  }),
)

/**
 * Dep Audit Findings Table
 *
 * One row per finding per audit run.
 * Captures package name, finding type, severity, and structured detail payload.
 *
 * Story: APIP-4030 - Dependency Auditor
 */
export const depAuditFindings = wintSchema.table(
  'dep_audit_findings',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom().notNull(),

    // FK to dep_audit_runs
    runId: uuid('run_id')
      .notNull()
      .references(() => depAuditRuns.id, { onDelete: 'cascade' }),

    // Finding identity
    packageName: varchar('package_name', { length: 255 }).notNull(),

    // finding_type: 'vulnerability' | 'overlap' | 'bundle_bloat' | 'unmaintained'
    findingType: varchar('finding_type', { length: 32 }).notNull(),

    // severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
    severity: varchar('severity', { length: 16 }).notNull(),

    // Structured payload (varies by finding_type)
    details: jsonb('details')
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    runIdIdx: index('idx_dep_audit_findings_run_id').on(table.runId),
    severityIdx: index('idx_dep_audit_findings_severity').on(table.severity),
    runSeverityIdx: index('idx_dep_audit_findings_run_severity').on(table.runId, table.severity),
  }),
)

// ============================================================================
// Dep Audit Relations (APIP-4030)
// ============================================================================

export const depAuditRunsRelations = relations(depAuditRuns, ({ many }) => ({
  findings: many(depAuditFindings),
}))

export const depAuditFindingsRelations = relations(depAuditFindings, ({ one }) => ({
  run: one(depAuditRuns, { fields: [depAuditFindings.runId], references: [depAuditRuns.id] }),
}))

// ============================================================================
// Dep Audit Zod Schemas (APIP-4030)
// ============================================================================

export const DepAuditRunInsertSchema = createInsertSchema(depAuditRuns)
export const DepAuditRunSelectSchema = createSelectSchema(depAuditRuns)
export type InsertDepAuditRun = z.infer<typeof DepAuditRunInsertSchema>
export type SelectDepAuditRun = z.infer<typeof DepAuditRunSelectSchema>

export const DepAuditFindingInsertSchema = createInsertSchema(depAuditFindings)
export const DepAuditFindingSelectSchema = createSelectSchema(depAuditFindings)
export type InsertDepAuditFinding = z.infer<typeof DepAuditFindingInsertSchema>
export type SelectDepAuditFinding = z.infer<typeof DepAuditFindingSelectSchema>

// ============================================================================
// 10. CODEBASE HEALTH SCHEMA (APIP-4010)
// ============================================================================

/**
 * Codebase Health Snapshots Table
 *
 * Stores one snapshot row per health check run with 8 quality metrics.
 * Used by captureHealthSnapshot() (fire-and-forget insert helper) and
 * detectDriftAndGenerateCleanup() (pure drift detection function).
 *
 * Story: APIP-4010 - Codebase Health Gate
 *
 * Design notes:
 * - is_baseline flag (default false) marks a row as the reference baseline.
 *   Manual promotion via: UPDATE wint.codebase_health SET is_baseline = true WHERE id = '<id>';
 * - All 8 metric columns are nullable — collector failures produce null (partial capture OK).
 * - merge_number tracks which merge triggered the health check.
 */
export const codebaseHealth = wintSchema.table(
  'codebase_health',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom(),

    // Merge tracking
    mergeNumber: integer('merge_number').notNull(),

    // Capture timestamp
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),

    // Baseline flag — operator-promoted, never automatic
    isBaseline: boolean('is_baseline').notNull().default(false),

    // Metric 1: Lint warnings (stdout line count from pnpm lint)
    lintWarnings: integer('lint_warnings'),

    // Metric 2: Type errors (error count from pnpm check-types:all)
    typeErrors: integer('type_errors'),

    // Metric 3: Any count (no-explicit-any violations from ESLint)
    anyCount: integer('any_count'),

    // Metric 4: Test coverage (percentage, 2 decimal places)
    testCoverage: numeric('test_coverage', { precision: 5, scale: 2 }),

    // Metric 5: Circular dependencies (madge --circular count)
    circularDeps: integer('circular_deps'),

    // Metric 6: Bundle size in bytes (build output manifest)
    bundleSize: integer('bundle_size'),

    // Metric 7: Dead exports (ts-prune count)
    deadExports: integer('dead_exports'),

    // Metric 8: ESLint disable count (grep -r eslint-disable count)
    eslintDisableCount: integer('eslint_disable_count'),
  },
  table => ({
    // Index: captured_at for time-range queries
    capturedAtIdx: index('idx_codebase_health_captured_at').on(table.capturedAt),
    // Index: merge_number for per-merge lookups
    mergeNumberIdx: index('idx_codebase_health_merge_number').on(table.mergeNumber),
    // Index: is_baseline for baseline queries (finding the current reference row)
    isBaselineIdx: index('idx_codebase_health_is_baseline').on(table.isBaseline),
  }),
)

// ============================================================================
// Codebase Health Zod Schemas (APIP-4010)
// ============================================================================

export const CodebaseHealthInsertSchema = createInsertSchema(codebaseHealth)
export const CodebaseHealthSelectSchema = createSelectSchema(codebaseHealth)
export type InsertCodebaseHealth = z.infer<typeof CodebaseHealthInsertSchema>
export type SelectCodebaseHealth = z.infer<typeof CodebaseHealthSelectSchema>

// ============================================================================
// Merge Runs Table (APIP-4010 — standalone fallback for merge-count tracking)
// ============================================================================

/**
 * Merge Runs Table
 *
 * Standalone fallback for merge-count tracking (RISK-001 from APIP-4010 ELAB).
 * Used when APIP-1070 has NOT yet added mergeCount to MergeArtifactSchema.
 *
 * Each merge-pipeline completion records a row here. The health gate reads the
 * count to determine if the current merge is the 5th (or multiple of 5).
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-08)
 */
export const mergeRuns = wintSchema.table(
  'merge_runs',
  {
    // Primary key
    id: uuid('id').primaryKey().defaultRandom(),

    // Story that triggered the merge
    storyId: text('story_id').notNull(),

    // Sequential merge count (monotonically increasing per pipeline instance)
    mergeNumber: integer('merge_number').notNull(),

    // When the merge completed
    mergedAt: timestamp('merged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index: storyId for per-story lookup
    storyIdIdx: index('idx_merge_runs_story_id').on(table.storyId),
    // Index: mergedAt for time-range queries
    mergedAtIdx: index('idx_merge_runs_merged_at').on(table.mergedAt),
    // Index: mergeNumber for count/sequence queries
    mergeNumberIdx: index('idx_merge_runs_merge_number').on(table.mergeNumber),
  }),
)

// ============================================================================
// Merge Runs Zod Schemas (APIP-4010)
// ============================================================================

export const MergeRunInsertSchema = createInsertSchema(mergeRuns)
export const MergeRunSelectSchema = createSelectSchema(mergeRuns)
export type InsertMergeRun = z.infer<typeof MergeRunInsertSchema>
export type SelectMergeRun = z.infer<typeof MergeRunSelectSchema>
