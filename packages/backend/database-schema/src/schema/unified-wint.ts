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
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// NOTE: This import requires pgvector extension to be installed
// Pre-migration check: SELECT * FROM pg_extension WHERE extname = 'pgvector';
// Installation: CREATE EXTENSION vector; (requires superuser or rds_superuser)
import { vector } from 'pgvector/drizzle-orm'

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
// NOTE: Remaining schema groups (Context Cache, Telemetry, ML Pipeline,
// Workflow Tracking) are unchanged from WINT schema and not duplicated here
// to stay within time-box constraint.
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
