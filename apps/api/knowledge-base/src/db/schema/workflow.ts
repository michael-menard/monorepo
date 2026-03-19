/**
 * Workflow Schema — workflow PostgreSQL schema
 *
 * Database: KB DB (@repo/knowledge-base, port 5433)
 * Schema:   workflow
 *
 * Stories, plans, agents, sessions, context packs, and ML model tracking.
 *
 * Note: mlModels, modelMetrics, modelPredictions, workflowExecutions,
 * workflowCheckpoints, workflowAuditLog, and trainingData are defined here
 * but not yet actively written to — reserved for upcoming analytics and
 * model selection features.
 */

import {
  pgSchema,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  integer,
  numeric,
  serial,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { knowledgeEntries, vector } from './kb.js'

const workflow = pgSchema('workflow')

export const stories = workflow.table('stories', {
  storyId: text('story_id').primaryKey(),
  feature: text('feature').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  blockedReason: text('blocked_reason'),
  blockedByStory: text('blocked_by_story'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fileHash: text('file_hash'),
  state: text('state'),
  priority: text('priority'),
  // tags: free-form and surface tags (surfaces encoded as 'surface:backend' etc.)
  tags: text('tags').array(),
  // experiment_variant: future A/B experiment tracking
  experimentVariant: text('experiment_variant'),
  // Removed: phase, iteration (derived from state + dependencies)
  // Removed: acceptanceCriteria (stored in story_content, section_name='acceptance_criteria')
  // Removed: metadata jsonb (never migrated; tags/surfaces now live here as proper columns)
  // Removed: embedding, deletedAt (not yet needed)
})

export const worktrees = workflow.table('worktrees', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  worktreePath: text('worktree_path').notNull(),
  branchName: text('branch_name').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  mergedAt: timestamp('merged_at', { withTimezone: true }),
  abandonedAt: timestamp('abandoned_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
})

export const storyDependencies = workflow.table('story_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId),
  dependsOnId: text('depends_on_id')
    .notNull()
    .references(() => stories.storyId),
  dependencyType: text('dependency_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyContent = workflow.table('story_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  sectionName: text('section_name').notNull(),
  contentText: text('content_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyStateHistory = workflow.table('story_state_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'restrict' }),
  eventType: text('event_type').notNull(),
  fromState: text('from_state'),
  toState: text('to_state'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyTouches = workflow.table('story_touches', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  touchType: text('touch_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyOutcomes = workflow.table('story_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  finalVerdict: text('final_verdict').notNull(),
  qualityScore: integer('quality_score').notNull().default(0),
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalCachedTokens: integer('total_cached_tokens').notNull().default(0),
  estimatedTotalCost: numeric('estimated_total_cost', { precision: 10, scale: 4 })
    .notNull()
    .default('0.0000'),
  reviewIterations: integer('review_iterations').notNull().default(0),
  qaIterations: integer('qa_iterations').notNull().default(0),
  durationMs: integer('duration_ms').notNull().default(0),
  primaryBlocker: text('primary_blocker'),
  metadata: jsonb('metadata'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const plans = workflow.table('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  planSlug: text('plan_slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary'),
  planType: text('plan_type'),
  storyPrefix: text('story_prefix'),
  tags: text('tags').array(),
  rawContent: text('raw_content'),
  contentHash: text('content_hash'),
  kbEntryId: uuid('kb_entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  parentPlanId: uuid('parent_plan_id').references((): AnyPgColumn => plans.id, {
    onDelete: 'set null',
  }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  supersededBy: uuid('superseded_by').references((): AnyPgColumn => plans.id, {
    onDelete: 'set null',
  }),
  supersedesPlanSlug: text('supersedes_plan_slug'), // FK to plans.plan_slug enforced in migration SQL
  embedding: vector('embedding', { dimensions: 1536 }),
  sections: jsonb('sections'),
  status: text('status'),
  priority: text('priority'),
  sortOrder: integer('sort_order'),
})

export const planDetails = workflow.table('plan_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .unique()
    .references(() => plans.id, { onDelete: 'cascade' }),
  rawContent: text('raw_content'),
  phases: jsonb('phases'),
  sourceFile: text('source_file'),
  contentHash: text('content_hash'),
  sections: jsonb('sections'),
  formatVersion: text('format_version').notNull().default('v1'),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planDependencies = workflow.table(
  'plan_dependencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planSlug: text('plan_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),
    dependsOnSlug: text('depends_on_slug')
      .notNull()
      .references(() => plans.planSlug, { onDelete: 'restrict' }),
    satisfied: boolean('satisfied').default(false),
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

export const planStoryLinks = workflow.table('plan_story_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  planSlug: text('plan_slug')
    .notNull()
    .references(() => plans.planSlug, { onDelete: 'cascade' }),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  linkType: text('link_type').notNull().default('mentioned'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planRevisionHistory = workflow.table('plan_revision_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  revisionNumber: integer('revision_number').notNull(),
  rawContent: text('raw_content').notNull(),
  contentHash: text('content_hash'),
  sections: jsonb('sections'),
  changeReason: text('change_reason'),
  changedBy: text('changed_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planExecutionLog = workflow.table('plan_execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  planSlug: text('plan_slug')
    .notNull()
    .references(() => plans.planSlug, { onDelete: 'cascade' }),
  entryType: text('entry_type').notNull(),
  phase: text('phase'),
  storyId: text('story_id'),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planStatusHistory = workflow.table(
  'plan_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planSlug: text('plan_slug').notNull(), // FK to plans.plan_slug enforced in migration SQL
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    planSlugIdx: index('idx_plan_status_history_plan_slug').on(table.planSlug),
    changedAtIdx: index('idx_plan_status_history_changed_at').on(table.changedAt),
  }),
)

export const workState = workflow.table('work_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id').notNull().unique(),
  branch: text('branch'),
  phase: text('phase'),
  constraints: jsonb('constraints').default([]),
  recentActions: jsonb('recent_actions').default([]),
  nextSteps: jsonb('next_steps').default([]),
  blockers: jsonb('blockers').default([]),
  kbReferences: jsonb('kb_references').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const workflowExecutions = workflow.table('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'restrict' }),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})

export const workflowCheckpoints = workflow.table('workflow_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: 'restrict' }),
  phase: text('phase').notNull(),
  state: jsonb('state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const workflowAuditLog = workflow.table('workflow_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id')
    .notNull()
    .references(() => workflowExecutions.id, { onDelete: 'restrict' }),
  eventType: text('event_type').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const agents = workflow.table('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  agentType: text('agent_type').notNull(),
  permissionLevel: text('permission_level').notNull(),
  model: text('model'),
  spawnedBy: jsonb('spawned_by'),
  triggers: jsonb('triggers'),
  skillsUsed: jsonb('skills_used'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const agentInvocations = workflow.table('agent_invocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  invocationId: text('invocation_id').notNull().unique(),
  agentName: text('agent_name').notNull(),
  storyId: text('story_id').references(() => stories.storyId, { onDelete: 'set null' }),
  phase: text('phase'),
  inputPayload: jsonb('input_payload'),
  outputPayload: jsonb('output_payload'),
  durationMs: integer('duration_ms'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  cachedTokens: integer('cached_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  estimatedCost: numeric('estimated_cost', { precision: 10, scale: 4 }).notNull().default('0.0000'),
  modelName: text('model_name'),
})

export const agentOutcomes = workflow.table('agent_outcomes', {
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lintErrors: integer('lint_errors').notNull().default(0),
  typeErrors: integer('type_errors').notNull().default(0),
  securityIssues: jsonb('security_issues').notNull().default([]),
  performanceMetrics: jsonb('performance_metrics').notNull().default({}),
  artifactsMetadata: jsonb('artifacts_metadata').notNull().default({}),
})

export const agentDecisions = workflow.table('agent_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  invocationId: uuid('invocation_id')
    .notNull()
    .references(() => agentInvocations.id, { onDelete: 'cascade' }),
  decisionType: text('decision_type').notNull(),
  decisionText: text('decision_text').notNull(),
  context: jsonb('context'),
  confidence: integer('confidence'),
  wasCorrect: boolean('was_correct'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
  evaluatedBy: text('evaluated_by'),
  correctnessScore: integer('correctness_score'),
  alternativesConsidered: integer('alternatives_considered').notNull().default(0),
})

export const hitlDecisions = workflow.table('hitl_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  invocationId: uuid('invocation_id').references(() => agentInvocations.id, {
    onDelete: 'set null',
  }),
  decisionType: text('decision_type').notNull(),
  decisionText: text('decision_text').notNull(),
  context: jsonb('context'),
  embedding: vector('embedding', { dimensions: 1536 }),
  operatorId: text('operator_id').notNull(),
  storyId: text('story_id')
    .notNull()
    .references(() => stories.storyId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const contextSessions = workflow.table('context_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  agentName: text('agent_name').notNull(),
  storyId: text('story_id').references(() => stories.storyId, { onDelete: 'set null' }),
  phase: text('phase'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  cachedTokens: integer('cached_tokens').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const contextPacks = workflow.table('context_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  packType: text('pack_type').notNull(),
  packKey: text('pack_key').notNull(),
  content: jsonb('content').notNull(),
  version: integer('version').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  hitCount: integer('hit_count').notNull().default(0),
  lastHitAt: timestamp('last_hit_at', { withTimezone: true }),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const contextCacheHits = workflow.table('context_cache_hits', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => contextSessions.id, { onDelete: 'cascade' }),
  packId: uuid('pack_id')
    .notNull()
    .references(() => contextPacks.id, { onDelete: 'cascade' }),
  tokensSaved: integer('tokens_saved'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const mlModels = workflow.table('ml_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: text('model_name').notNull(),
  modelType: text('model_type').notNull(),
  version: text('version').notNull(),
  modelPath: text('model_path'),
  hyperparameters: jsonb('hyperparameters'),
  trainingDataCount: integer('training_data_count').notNull(),
  trainedAt: timestamp('trained_at', { withTimezone: true }).notNull().defaultNow(),
  trainedBy: text('trained_by'),
  isActive: boolean('is_active').notNull().default(false),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelMetrics = workflow.table('model_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id')
    .notNull()
    .references(() => mlModels.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(),
  metricValue: integer('metric_value').notNull(),
  evaluationDataset: text('evaluation_dataset'),
  sampleSize: integer('sample_size'),
  metadata: jsonb('metadata'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelPredictions = workflow.table('model_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: uuid('model_id')
    .notNull()
    .references(() => mlModels.id, { onDelete: 'cascade' }),
  predictionType: text('prediction_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  features: jsonb('features').notNull(),
  prediction: jsonb('prediction').notNull(),
  actualValue: jsonb('actual_value'),
  error: integer('error'),
  predictedAt: timestamp('predicted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const trainingData = workflow.table('training_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  dataType: text('data_type').notNull(),
  features: jsonb('features').notNull(),
  labels: jsonb('labels').notNull(),
  storyId: text('story_id').references(() => stories.storyId, { onDelete: 'set null' }),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  validated: boolean('validated').notNull().default(false),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const validTransitions = workflow.table(
  'valid_transitions',
  {
    id: serial('id').primaryKey(),
    fromState: text('from_state'),
    toState: text('to_state').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // NOTE: The actual unique index (idx_valid_transitions_unique) uses a
    // COALESCE(from_state, '__NULL__') functional expression and is created
    // in migration 1004 SQL. Drizzle cannot express functional indexes, so
    // we omit it here to avoid creating a conflicting simple unique index.
    // Uniqueness is enforced at the DB level by the migration index.
    fromStateIdx: index('idx_valid_transitions_from_state').on(table.fromState),
  }),
)

export type Story = typeof stories.$inferSelect
export type NewStory = typeof stories.$inferInsert
export type StoryOutcome = typeof storyOutcomes.$inferSelect
export type NewStoryOutcome = typeof storyOutcomes.$inferInsert
export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
export type WorkState = typeof workState.$inferSelect
export type NewWorkState = typeof workState.$inferInsert
export type SelectContextSession = typeof contextSessions.$inferSelect
export type InsertContextSession = typeof contextSessions.$inferInsert
export type SelectContextPack = typeof contextPacks.$inferSelect
export type InsertContextPack = typeof contextPacks.$inferInsert
export type ValidTransition = typeof validTransitions.$inferSelect
export type NewValidTransition = typeof validTransitions.$inferInsert
