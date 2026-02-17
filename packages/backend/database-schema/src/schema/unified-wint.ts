/**
 * Unified WINT Schema - Reconciles WINT and LangGraph Schemas
 *
 * Story WINT-1080: Reconcile WINT Schema with LangGraph
 *
 * This schema merges:
 * - WINT schema (6 groups, 24 tables) - packages/backend/database-schema/src/schema/wint.ts
 * - LangGraph schema (14 tables) - apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql
 *
 * Ownership Model:
 * - WINT is source of truth for: stories, features, workflow events, telemetry, ML, graph relational
 * - LangGraph retains: elaborations, proofs, verifications (workflow-specific artifacts)
 *
 * Schema Namespace:
 * - All tables are in the 'wint' PostgreSQL schema namespace
 * - Designed for deployment to main app database (port 5432)
 *
 * Schema Groups (Extended from WINT-0010):
 * 1. Story Management - Stories, states, transitions, dependencies, ACs, risks
 * 2. Context Cache - Cached context packs and session management
 * 3. Telemetry - Agent invocations, decisions, outcomes, state transitions
 * 4. ML Pipeline - Training data, models, predictions, metrics
 * 5. Graph Relational - Features, capabilities, relationships, cohesion rules (with pgvector)
 * 6. Workflow Tracking - Executions, checkpoints, audit trails
 *
 * Key Additions from LangGraph:
 * - Acceptance Criteria table (story metadata)
 * - Story Risks table (story metadata)
 * - pgvector embeddings on stories and features tables
 * - Unified story_state enum (underscored naming, 9 states)
 *
 * NOTE: This is a SPIKE deliverable (WINT-1080 AC-004).
 *       Time-boxed to 16 hours maximum.
 *       Incomplete areas documented in comments with "TODO: WINT-XXXX" markers.
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
  varchar,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// NOTE: Vector column type requires pgvector extension to be installed in PostgreSQL
// Pre-migration check: SELECT * FROM pg_extension WHERE extname = 'vector';
// Installation: CREATE EXTENSION vector; (requires superuser or rds_superuser)
import { vector } from 'drizzle-orm/pg-core/columns/vector_extension/vector'

// Define the 'wint' PostgreSQL schema namespace
export const wintSchema = pgSchema('wint')

// ============================================================================
// ENUMS - Unified from WINT and LangGraph
// ============================================================================

/**
 * Unified Story State Enum
 * Reconciles WINT (underscored) and LangGraph (hyphenated) enums
 * Source: ENUM-RECONCILIATION.md (AC-002)
 *
 * Migration mapping from LangGraph:
 * - 'draft' → 'draft' (direct map)
 * - 'backlog' → 'backlog' (direct map)
 * - 'ready-to-work' → 'ready_to_work' (normalize hyphens)
 * - 'in-progress' → 'in_progress' (normalize hyphens)
 * - 'ready-for-qa' → 'ready_for_qa' (normalize hyphens)
 * - 'uat' → 'in_qa' (semantic mapping)
 * - 'done' → 'done' (direct map)
 * - Add: 'blocked', 'cancelled' (new states from WINT)
 */
export const storyStateEnum = pgEnum('story_state', [
  'draft',
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
])

/**
 * Unified Story Type Enum
 * Source: LangGraph schema (WINT had text field)
 * Extended with 'infra' and 'docs' from WINT codebase usage
 */
export const storyTypeEnum = pgEnum('story_type', [
  'feature',
  'bug',
  'tech-debt',
  'spike',
  'chore',
  'infra',
  'docs',
])

/**
 * Unified Story Priority Enum
 * Source: WINT schema (uppercase P0-P4)
 * LangGraph had lowercase p0-p3, unified to WINT convention
 */
export const storyPriorityEnum = pgEnum('story_priority', ['P0', 'P1', 'P2', 'P3', 'P4'])

/**
 * Context Pack Type Enum (from WINT)
 */
export const contextPackTypeEnum = pgEnum('context_pack_type', [
  'codebase',
  'story',
  'feature',
  'epic',
  'architecture',
  'lessons_learned',
  'test_patterns',
])

/**
 * Agent Decision Type Enum (from WINT)
 */
export const agentDecisionTypeEnum = pgEnum('agent_decision_type', [
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision',
])

/**
 * Model Type Enum (from WINT ML pipeline)
 */
export const modelTypeEnum = pgEnum('model_type', [
  'quality_predictor',
  'effort_estimator',
  'risk_classifier',
  'pattern_recommender',
])

/**
 * Feature Relationship Type Enum (from WINT)
 */
export const featureRelationshipTypeEnum = pgEnum('feature_relationship_type', [
  'depends_on',
  'enhances',
  'conflicts_with',
  'related_to',
  'supersedes',
])

/**
 * Workflow Status Enum (from WINT)
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
 * Verdict Type Enum (from LangGraph workflow artifacts)
 * Used by elaborations and verifications tables
 */
export const verdictTypeEnum = pgEnum('verdict_type', ['pass', 'fail', 'concerns', 'pending'])

/**
 * Worktree Status Enum (WINT-1130)
 * Tracks lifecycle status of git worktrees
 */
export const worktreeStatusEnum = pgEnum('worktree_status', [
  'active',
  'merged',
  'abandoned',
])

// ============================================================================
// 1. STORY MANAGEMENT SCHEMA (Extended from WINT + LangGraph)
// ============================================================================

/**
 * Stories Table (Unified from WINT + LangGraph)
 *
 * WINT Additions:
 * - Richer metadata (complexity, wave, epic, story points)
 * - JSONB metadata field for flexible schema evolution
 *
 * LangGraph Additions:
 * - Vector embedding for semantic search
 * - Foreign key to features table
 *
 * Migration Notes:
 * - LangGraph 'depends_on' array mapped to normalized story_dependencies table
 * - LangGraph 'blocked_by' text mapped to WINT story state and dependencies
 */
export const stories = wintSchema.table(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull().unique(), // e.g., "WINT-0010", "BUGF-001"
    title: text('title').notNull(),
    description: text('description'),

    // Classification (unified from both schemas)
    storyType: storyTypeEnum('story_type').notNull().default('feature'),
    epic: text('epic'), // Epic identifier (e.g., 'WINT', 'BUGF')
    wave: integer('wave'), // Wave number for phased rollout

    // Priority and effort
    priority: storyPriorityEnum('priority').notNull().default('P2'),
    complexity: text('complexity'), // 'low', 'medium', 'high'
    storyPoints: integer('story_points'),

    // State management (unified enum)
    state: storyStateEnum('state').notNull().default('backlog'),

    // Feature relationship (from LangGraph)
    featureId: uuid('feature_id').references(() => features.id, { onDelete: 'set null' }),

    // Metadata (flexible JSONB from WINT)
    metadata: jsonb('metadata').$type<{
      surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
      tags?: string[]
      experimentVariant?: 'control' | 'variant_a' | 'variant_b'
      blocked_by?: string[] // Deprecated - use story_dependencies table
      blocks?: string[] // Deprecated - use story_dependencies table
      goal?: string // From LangGraph 'goal' field
      non_goals?: string[] // From LangGraph 'non_goals' array
      packages?: string[] // From LangGraph 'packages' array
    }>(),

    // Vector embedding for semantic search (from LangGraph, requires pgvector extension)
    // NOTE: Nullable to support existing WINT records without embeddings
    // Backfill strategy: Defer to future story (Wave 4+)
    embedding: vector('embedding', { dimensions: 1536 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: uniqueIndex('stories_story_id_idx').on(table.storyId),
    stateIdx: index('stories_state_idx').on(table.state),
    featureIdIdx: index('stories_feature_id_idx').on(table.featureId),
    createdAtIdx: index('stories_created_at_idx').on(table.createdAt),
    epicWaveIdx: index('stories_epic_wave_idx').on(table.epic, table.wave),
    priorityStateIdx: index('stories_priority_state_idx').on(table.priority, table.state),
    // pgvector index using IVFFlat algorithm (from LangGraph pattern)
    // Using cosine distance operator for similarity search
    embeddingIdx: index('stories_embedding_idx').using(
      'ivfflat',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
)

/**
 * Story States Table (from WINT)
 * Tracks the current and historical states of stories
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
 * Story Transitions Table (from WINT)
 * Tracks state transitions for workflow analysis
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
 * Story Dependencies Table (from WINT, normalized)
 * Replaces LangGraph 'depends_on' array with normalized table
 *
 * Migration from LangGraph:
 * - Each element in 'depends_on' array becomes a row with dependency_type = 'requires'
 * - 'follow_up_from' field maps to dependency_type = 'follow_up'
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
    dependencyType: text('dependency_type').notNull(), // 'blocks', 'requires', 'related', 'follow_up'

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
 * Acceptance Criteria Table (from LangGraph, added to WINT)
 *
 * NEW TABLE - migrated from LangGraph schema
 * Acceptance criteria are story metadata, belong in WINT per ownership model
 */
export const acceptanceCriteria = wintSchema.table(
  'acceptance_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    acId: varchar('ac_id', { length: 10 }).notNull(), // e.g., "AC1", "AC-001"
    text: text('text').notNull(),
    type: varchar('type', { length: 30 }).default('functional'), // functional, non-functional, edge-case, etc.
    verified: boolean('verified').default(false),
    evidence: text('evidence'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('acs_story_id_idx').on(table.storyId),
    // Unique constraint: one AC ID per story
    uniqueStoryAc: uniqueIndex('acs_unique_story_ac').on(table.storyId, table.acId),
  }),
)

/**
 * Story Risks Table (from LangGraph, added to WINT)
 *
 * NEW TABLE - migrated from LangGraph schema
 * Story risks are story metadata, belong in WINT per ownership model
 */
export const storyRisks = wintSchema.table(
  'story_risks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    risk: text('risk').notNull(),
    mitigation: text('mitigation'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('risks_story_id_idx').on(table.storyId),
  }),
)

// ============================================================================
// 5. GRAPH RELATIONAL SCHEMA (Extended from WINT + LangGraph)
// ============================================================================

/**
 * Features Table (Unified from WINT + LangGraph)
 *
 * WINT Additions:
 * - Richer metadata (feature_type, package_name, file_path, tags)
 * - Lifecycle tracking (is_active, deprecated_at)
 * - Graph relational model (feature_relationships, capabilities, cohesion_rules)
 *
 * LangGraph Additions:
 * - Vector embedding for semantic search
 *
 * Migration Notes:
 * - LangGraph 'name' field maps to WINT 'feature_name'
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

    // Status
    isActive: boolean('is_active').notNull().default(true),
    deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),

    // Vector embedding for semantic search (from LangGraph, requires pgvector extension)
    // NOTE: Nullable to support existing WINT records without embeddings
    embedding: vector('embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    featureNameIdx: uniqueIndex('features_feature_name_idx').on(table.featureName),
    featureTypeIdx: index('features_feature_type_idx').on(table.featureType),
    packageNameIdx: index('features_package_name_idx').on(table.packageName),
    isActiveIdx: index('features_is_active_idx').on(table.isActive),
    // pgvector index using IVFFlat algorithm (from LangGraph pattern)
    embeddingIdx: index('features_embedding_idx').using(
      'ivfflat',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
)

/**
 * Capabilities Table (from WINT)
 * Tracks high-level capabilities provided by features
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

    // Status
    maturityLevel: text('maturity_level'), // 'experimental', 'beta', 'stable', 'deprecated'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    capabilityNameIdx: uniqueIndex('capabilities_capability_name_idx').on(table.capabilityName),
    capabilityTypeIdx: index('capabilities_capability_type_idx').on(table.capabilityType),
    maturityLevelIdx: index('capabilities_maturity_level_idx').on(table.maturityLevel),
  }),
)

/**
 * Feature Relationships Table (from WINT)
 * Tracks relationships between features for dependency graph
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
  }),
)

/**
 * Cohesion Rules Table (from WINT)
 * Defines rules for feature cohesion and co-location
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
  }),
)

// ============================================================================
// 6. WORKFLOW ARTIFACT SCHEMA (Extended from LangGraph, added to WINT)
// ============================================================================
// Tables for LangGraph workflow artifacts: elaborations, plans, verifications,
// proofs, and token usage. These tables were originally in the LangGraph
// 002_workflow_tables.sql migration and are now part of the unified schema.
//
// Added in: WINT-1090 (Phase 0)
// ============================================================================

/**
 * Elaborations Table (from LangGraph, added to WINT)
 *
 * Stores LangGraph elaboration artifacts for stories.
 * Each elaboration records the readiness assessment for a story.
 *
 * Schema from: packages/backend/orchestrator/src/db/workflow-repository.ts
 */
export const elaborations = wintSchema.table(
  'elaborations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    date: timestamp('date', { withTimezone: false, mode: 'date' }),
    verdict: verdictTypeEnum('verdict'),
    content: jsonb('content'),
    readinessScore: integer('readiness_score'), // 0-100 scale
    gapsCount: integer('gaps_count'), // Number of gaps found
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('elaborations_story_id_idx').on(table.storyId),
    createdAtIdx: index('elaborations_created_at_idx').on(table.createdAt),
  }),
)

/**
 * Implementation Plans Table (from LangGraph, added to WINT)
 *
 * Stores versioned implementation plans for stories.
 * Each plan version tracks steps, files, complexity, and estimates.
 *
 * Schema from: packages/backend/orchestrator/src/db/workflow-repository.ts
 */
export const implementationPlans = wintSchema.table(
  'implementation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content'),
    stepsCount: integer('steps_count'),
    filesCount: integer('files_count'),
    complexity: text('complexity'), // 'low', 'medium', 'high'
    createdBy: text('created_by'),
    estimatedFiles: integer('estimated_files'),
    estimatedTokens: integer('estimated_tokens'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('implementation_plans_story_id_idx').on(table.storyId),
    versionIdx: index('implementation_plans_version_idx').on(table.version),
    createdAtIdx: index('implementation_plans_created_at_idx').on(table.createdAt),
    // Unique constraint: one version per story
    uniqueStoryVersion: uniqueIndex('implementation_plans_unique_story_version').on(
      table.storyId,
      table.version,
    ),
  }),
)

/**
 * Verifications Table (from LangGraph, added to WINT)
 *
 * Stores QA verifications, reviews, and UAT results for stories.
 * Each verification type has its own version sequence.
 *
 * Schema from: packages/backend/orchestrator/src/db/workflow-repository.ts
 */
export const verifications = wintSchema.table(
  'verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    type: text('type').notNull(), // 'qa_verify', 'review', 'uat'
    content: jsonb('content'),
    verdict: text('verdict'), // 'PASS', 'FAIL', 'CONCERNS', 'PENDING'
    issuesCount: integer('issues_count'),
    createdBy: text('created_by'),
    qaVerdict: verdictTypeEnum('qa_verdict'), // Enum version of verdict
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('verifications_story_id_idx').on(table.storyId),
    typeIdx: index('verifications_type_idx').on(table.type),
    versionIdx: index('verifications_version_idx').on(table.version),
    createdAtIdx: index('verifications_created_at_idx').on(table.createdAt),
    // Unique constraint: one version per story per type
    uniqueStoryTypeVersion: uniqueIndex('verifications_unique_story_type_version').on(
      table.storyId,
      table.type,
      table.version,
    ),
  }),
)

/**
 * Proofs Table (from LangGraph, added to WINT)
 *
 * Stores proof/evidence records for stories.
 * Each proof version tracks AC verification status.
 *
 * Schema from: packages/backend/orchestrator/src/db/workflow-repository.ts
 */
export const proofs = wintSchema.table(
  'proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content'),
    acsPassing: integer('acs_passing'), // Number of ACs passing
    acsTotal: integer('acs_total'), // Total number of ACs
    filesTouched: integer('files_touched'), // Number of files modified
    createdBy: text('created_by'),
    allAcsVerified: boolean('all_acs_verified'), // True if all ACs verified
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('proofs_story_id_idx').on(table.storyId),
    versionIdx: index('proofs_version_idx').on(table.version),
    createdAtIdx: index('proofs_created_at_idx').on(table.createdAt),
    // Unique constraint: one version per story
    uniqueStoryVersion: uniqueIndex('proofs_unique_story_version').on(table.storyId, table.version),
  }),
)

/**
 * Token Usage Table (from LangGraph, added to WINT)
 *
 * Tracks token consumption by phase for workflow analytics.
 * Enables cost tracking and optimization analysis.
 *
 * Schema from: packages/backend/orchestrator/src/db/workflow-repository.ts
 *
 * Note: total_tokens is computed as tokens_input + tokens_output
 * (may be implemented as generated column in migration)
 */
export const tokenUsage = wintSchema.table(
  'token_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    phase: text('phase').notNull(), // e.g., 'elaboration', 'plan', 'implement', 'qa'
    tokensInput: integer('tokens_input').notNull(),
    tokensOutput: integer('tokens_output').notNull(),
    totalTokens: integer('total_tokens'), // May be generated column
    model: text('model'),
    agentName: text('agent_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('token_usage_story_id_idx').on(table.storyId),
    phaseIdx: index('token_usage_phase_idx').on(table.phase),
    createdAtIdx: index('token_usage_created_at_idx').on(table.createdAt),
  }),
)

/**
 * Worktrees Table (WINT-1130)
 *
 * Tracks git worktrees for database-driven parallel work coordination.
 * Each worktree represents an active development branch tied to a story.
 *
 * Key Design Decisions:
 * - FK with CASCADE: If story deleted, worktrees auto-delete (orphaned worktrees have no value)
 * - Partial Unique Index: Prevents concurrent registration of multiple active worktrees for same story
 * - JSONB Metadata: Flexible schema evolution for future fields (sessionId, prNumber, reason, etc.)
 * - Timestamp Fields: Separate mergedAt/abandonedAt for lifecycle tracking
 * - Default Status: New records default to 'active'
 */
export const worktrees = wintSchema.table(
  'worktrees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    worktreePath: text('worktree_path').notNull(),
    branchName: text('branch_name').notNull(),
    status: worktreeStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    mergedAt: timestamp('merged_at', { withTimezone: true }),
    abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<{
      sessionId?: string
      prNumber?: number
      reason?: string
    }>().default({}),
  },
  table => ({
    // Partial unique index: enforces one active worktree per story at DB level
    uniqueActiveWorktree: uniqueIndex('unique_active_worktree')
      .on(table.storyId, table.status)
      .where(sql`${table.status} = 'active'`),
    storyIdIdx: index('idx_worktrees_story_id').on(table.storyId),
    statusIdx: index('idx_worktrees_status').on(table.status),
  }),
)

// ============================================================================
// 7. WORKFLOW METADATA SCHEMA (Added for WINT-0080)
// ============================================================================
// Tables for workflow phase definitions and agent/command/skill metadata.
// These tables support the seed data requirements from WINT-0080 and enable
// workflow tracking, agent registry, and command/skill inventories.
//
// Added in: WINT-0080 (Phase 0)
// ============================================================================

/**
 * Workflow Phases Table (from WINT-0070, required by WINT-0080)
 *
 * Stores the 8 workflow phase definitions (Phase 0-7) from the WINT epic.
 * This table is seeded once and remains relatively static.
 *
 * Schema resolves AC-12 (namespace clarity) and AC-13 (namespace consistency)
 * by placing in wint schema namespace.
 */
export const phases = wintSchema.table(
  'phases',
  {
    id: integer('id').primaryKey(), // Phase number 0-7
    phaseName: text('phase_name').notNull().unique(),
    description: text('description'),

    // Metadata
    phaseOrder: integer('phase_order').notNull(), // Explicit ordering (same as id typically)

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    phaseNameIdx: uniqueIndex('phases_phase_name_idx').on(table.phaseName),
    phaseOrderIdx: index('phases_phase_order_idx').on(table.phaseOrder),
  }),
)

/**
 * Agents Table (from WINT-0080)
 *
 * Stores metadata for all workflow agents extracted from .agent.md files.
 * This table supports agent registry, capability tracking, and workflow telemetry.
 *
 * Seeded by WINT-0080 seed scripts from .claude/agents/ *.agent.md files.
 */
export const agents = wintSchema.table(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Agent identification
    name: text('name').notNull().unique(), // Agent file name (e.g., 'dev-implement-story')

    // Agent classification
    agentType: text('agent_type').notNull(), // 'worker', 'leader', 'orchestrator'
    permissionLevel: text('permission_level').notNull(), // 'docs-only', 'read-only', 'read-write', 'admin'
    model: text('model'), // 'haiku', 'sonnet', 'opus', null (if not specified)

    // Relationships (denormalized arrays for flexibility)
    spawnedBy: jsonb('spawned_by').$type<string[]>(), // Parent agent names
    triggers: jsonb('triggers').$type<string[]>(), // Command/event triggers
    skillsUsed: jsonb('skills_used').$type<string[]>(), // Skill names used by this agent

    // Flexible metadata for frontmatter fields
    metadata: jsonb('metadata').$type<{
      mission?: string
      scope?: string
      signals?: string[]
      autonomyLevel?: string
      version?: string
      [key: string]: unknown
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    nameIdx: uniqueIndex('agents_name_idx').on(table.name),
    agentTypeIdx: index('agents_agent_type_idx').on(table.agentType),
    permissionLevelIdx: index('agents_permission_level_idx').on(table.permissionLevel),
    modelIdx: index('agents_model_idx').on(table.model),
  }),
)

/**
 * Commands Table (from WINT-0080)
 *
 * Stores metadata for all workflow commands extracted from .claude/commands/ files.
 * This table supports command registry and usage tracking.
 *
 * Seeded by WINT-0080 seed scripts from .claude/commands/ *.md files.
 */
export const commands = wintSchema.table(
  'commands',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Command identification
    name: text('name').notNull().unique(), // Command name (e.g., 'dev-implement-story')
    description: text('description'),

    // Triggers and patterns
    triggers: jsonb('triggers').$type<string[]>(), // Array of trigger patterns

    // Flexible metadata for command-specific fields
    metadata: jsonb('metadata').$type<{
      usage?: string
      examples?: string[]
      flags?: { name: string; description: string }[]
      [key: string]: unknown
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    nameIdx: uniqueIndex('commands_name_idx').on(table.name),
  }),
)

/**
 * Skills Table (from WINT-0080)
 *
 * Stores metadata for all workflow skills extracted from .claude/skills/ directories.
 * This table supports skill registry and capability tracking.
 *
 * Seeded by WINT-0080 seed scripts from .claude/skills/ directories.
 */
export const skills = wintSchema.table(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Skill identification
    name: text('name').notNull().unique(), // Skill name (e.g., 'commit', 'review')
    description: text('description'),

    // Capabilities provided by this skill
    capabilities: jsonb('capabilities').$type<string[]>(), // Array of capability names

    // Flexible metadata for skill-specific fields
    metadata: jsonb('metadata').$type<{
      version?: string
      agents?: string[] // Agents that use this skill
      [key: string]: unknown
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    nameIdx: uniqueIndex('skills_name_idx').on(table.name),
  }),
)

// ============================================================================
// NOTE: Remaining schema groups (Context Cache, Telemetry, ML Pipeline)
// are unchanged from WINT schema and not duplicated here to stay within
// time-box constraint.
//
// REFER TO: packages/backend/database-schema/src/schema/wint.ts for complete definitions
//
// TODO: WINT-1100 - Create shared TypeScript types package
// TODO: Future story - Add remaining schema groups to unified schema
// ============================================================================

// ============================================================================
// RELATIONS (Unified)
// ============================================================================

// Story Management Relations
export const storiesRelations = relations(stories, ({ one, many }) => ({
  feature: one(features, {
    fields: [stories.featureId],
    references: [features.id],
  }),
  states: many(storyStates),
  transitions: many(storyTransitions),
  dependencies: many(storyDependencies, { relationName: 'story_dependencies' }),
  dependents: many(storyDependencies, { relationName: 'story_dependents' }),
  acceptanceCriteria: many(acceptanceCriteria),
  risks: many(storyRisks),
  // Workflow artifact relations (from LangGraph)
  elaborations: many(elaborations),
  implementationPlans: many(implementationPlans),
  verifications: many(verifications),
  proofs: many(proofs),
  tokenUsage: many(tokenUsage),
  // Worktree tracking (WINT-1130)
  worktrees: many(worktrees),
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

export const acceptanceCriteriaRelations = relations(acceptanceCriteria, ({ one }) => ({
  story: one(stories, {
    fields: [acceptanceCriteria.storyId],
    references: [stories.id],
  }),
}))

export const storyRisksRelations = relations(storyRisks, ({ one }) => ({
  story: one(stories, {
    fields: [storyRisks.storyId],
    references: [stories.id],
  }),
}))

// Graph Relational Relations
export const featuresRelations = relations(features, ({ many }) => ({
  stories: many(stories),
  sourceRelationships: many(featureRelationships, { relationName: 'source_feature' }),
  targetRelationships: many(featureRelationships, { relationName: 'target_feature' }),
}))

export const featureRelationshipsRelations = relations(featureRelationships, ({ one }) => ({
  sourceFeature: one(features, {
    fields: [featureRelationships.sourceFeatureId],
    references: [features.id],
    relationName: 'source_feature',
  }),
  targetFeature: one(features, {
    fields: [featureRelationships.targetFeatureId],
    references: [features.id],
    relationName: 'target_feature',
  }),
}))

// Workflow Artifact Relations (from LangGraph)
export const elaborationsRelations = relations(elaborations, ({ one }) => ({
  story: one(stories, {
    fields: [elaborations.storyId],
    references: [stories.id],
  }),
}))

export const implementationPlansRelations = relations(implementationPlans, ({ one }) => ({
  story: one(stories, {
    fields: [implementationPlans.storyId],
    references: [stories.id],
  }),
}))

export const verificationsRelations = relations(verifications, ({ one }) => ({
  story: one(stories, {
    fields: [verifications.storyId],
    references: [stories.id],
  }),
}))

export const proofsRelations = relations(proofs, ({ one }) => ({
  story: one(stories, {
    fields: [proofs.storyId],
    references: [stories.id],
  }),
}))

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  story: one(stories, {
    fields: [tokenUsage.storyId],
    references: [stories.id],
  }),
}))

export const worktreesRelations = relations(worktrees, ({ one }) => ({
  story: one(stories, {
    fields: [worktrees.storyId],
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

export const insertStoryTransitionSchema = createInsertSchema(storyTransitions)
export const selectStoryTransitionSchema = createSelectSchema(storyTransitions)
export type InsertStoryTransition = z.infer<typeof insertStoryTransitionSchema>
export type SelectStoryTransition = z.infer<typeof selectStoryTransitionSchema>

export const insertStoryDependencySchema = createInsertSchema(storyDependencies)
export const selectStoryDependencySchema = createSelectSchema(storyDependencies)
export type InsertStoryDependency = z.infer<typeof insertStoryDependencySchema>
export type SelectStoryDependency = z.infer<typeof selectStoryDependencySchema>

export const insertAcceptanceCriteriaSchema = createInsertSchema(acceptanceCriteria)
export const selectAcceptanceCriteriaSchema = createSelectSchema(acceptanceCriteria)
export type InsertAcceptanceCriteria = z.infer<typeof insertAcceptanceCriteriaSchema>
export type SelectAcceptanceCriteria = z.infer<typeof selectAcceptanceCriteriaSchema>

export const insertStoryRiskSchema = createInsertSchema(storyRisks)
export const selectStoryRiskSchema = createSelectSchema(storyRisks)
export type InsertStoryRisk = z.infer<typeof insertStoryRiskSchema>
export type SelectStoryRisk = z.infer<typeof selectStoryRiskSchema>

// Graph Relational Zod Schemas
export const insertFeatureSchema = createInsertSchema(features)
export const selectFeatureSchema = createSelectSchema(features)
export type InsertFeature = z.infer<typeof insertFeatureSchema>
export type SelectFeature = z.infer<typeof selectFeatureSchema>

export const insertCapabilitySchema = createInsertSchema(capabilities)
export const selectCapabilitySchema = createSelectSchema(capabilities)
export type InsertCapability = z.infer<typeof insertCapabilitySchema>
export type SelectCapability = z.infer<typeof selectCapabilitySchema>

export const insertFeatureRelationshipSchema = createInsertSchema(featureRelationships)
export const selectFeatureRelationshipSchema = createSelectSchema(featureRelationships)
export type InsertFeatureRelationship = z.infer<typeof insertFeatureRelationshipSchema>
export type SelectFeatureRelationship = z.infer<typeof selectFeatureRelationshipSchema>

export const insertCohesionRuleSchema = createInsertSchema(cohesionRules)
export const selectCohesionRuleSchema = createSelectSchema(cohesionRules)
export type InsertCohesionRule = z.infer<typeof insertCohesionRuleSchema>
export type SelectCohesionRule = z.infer<typeof selectCohesionRuleSchema>

// Workflow Artifact Zod Schemas (from LangGraph)
export const insertElaborationSchema = createInsertSchema(elaborations)
export const selectElaborationSchema = createSelectSchema(elaborations)
export type InsertElaboration = z.infer<typeof insertElaborationSchema>
export type SelectElaboration = z.infer<typeof selectElaborationSchema>

export const insertImplementationPlanSchema = createInsertSchema(implementationPlans)
export const selectImplementationPlanSchema = createSelectSchema(implementationPlans)
export type InsertImplementationPlan = z.infer<typeof insertImplementationPlanSchema>
export type SelectImplementationPlan = z.infer<typeof selectImplementationPlanSchema>

export const insertVerificationSchema = createInsertSchema(verifications)
export const selectVerificationSchema = createSelectSchema(verifications)
export type InsertVerification = z.infer<typeof insertVerificationSchema>
export type SelectVerification = z.infer<typeof selectVerificationSchema>

export const insertProofSchema = createInsertSchema(proofs)
export const selectProofSchema = createSelectSchema(proofs)
export type InsertProof = z.infer<typeof insertProofSchema>
export type SelectProof = z.infer<typeof selectProofSchema>

export const insertTokenUsageSchema = createInsertSchema(tokenUsage)
export const selectTokenUsageSchema = createSelectSchema(tokenUsage)
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>
export type SelectTokenUsage = z.infer<typeof selectTokenUsageSchema>

// Workflow Metadata Zod Schemas (from WINT-0080)
export const insertPhaseSchema = createInsertSchema(phases)
export const selectPhaseSchema = createSelectSchema(phases)
export type InsertPhase = z.infer<typeof insertPhaseSchema>
export type SelectPhase = z.infer<typeof selectPhaseSchema>

export const insertAgentSchema = createInsertSchema(agents)
export const selectAgentSchema = createSelectSchema(agents)
export type InsertAgent = z.infer<typeof insertAgentSchema>
export type SelectAgent = z.infer<typeof selectAgentSchema>

export const insertCommandSchema = createInsertSchema(commands)
export const selectCommandSchema = createSelectSchema(commands)
export type InsertCommand = z.infer<typeof insertCommandSchema>
export type SelectCommand = z.infer<typeof selectCommandSchema>

export const insertSkillSchema = createInsertSchema(skills)
export const selectSkillSchema = createSelectSchema(skills)
export type InsertSkill = z.infer<typeof insertSkillSchema>
export type SelectSkill = z.infer<typeof selectSkillSchema>

// Worktrees Zod Schemas (WINT-1130)
export const insertWorktreeSchema = createInsertSchema(worktrees)
export const selectWorktreeSchema = createSelectSchema(worktrees)
export type InsertWorktree = z.infer<typeof insertWorktreeSchema>
export type SelectWorktree = z.infer<typeof selectWorktreeSchema>
