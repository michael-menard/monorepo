/**
 * Telemetry Database Schema
 *
 * This schema defines historical telemetry tables in the 'telemetry' PostgreSQL schema.
 * Data migrated from wint schema for long-term storage and analytics.
 *
 * Story: CDBN-2012 - Migrate telemetry Schema Live Data
 *
 * Tables:
 * - workflow_events: Orchestrator workflow execution events
 * - agent_invocations: Agent invocation tracking (migrated from wint)
 * - agent_decisions: Agent decision records (migrated from wint)
 * - agent_outcomes: Agent invocation outcomes (migrated from wint)
 * - story_outcomes: Story completion outcomes (migrated from wint)
 * - token_usage: Token consumption by phase (migrated from wint)
 * - workflow_executions: Workflow execution records (migrated from wint)
 * - workflow_checkpoints: Workflow checkpoint state (migrated from wint)
 * - workflow_audit_log: Workflow audit trail (migrated from wint)
 * - dep_audit_runs: Dependency audit runs (migrated from wint)
 * - dep_audit_findings: Dependency audit findings (migrated from wint)
 * - ml_models: ML model registry (migrated from wint)
 * - model_metrics: Model evaluation metrics (migrated from wint)
 * - model_predictions: Model predictions (migrated from wint)
 * - training_data: Training data for ML (migrated from wint)
 * - change_telemetry: Change attempt telemetry (migrated from wint)
 *
 * Schema Isolation:
 * - All tables are in the 'telemetry' PostgreSQL schema namespace
 * - Historical data, append-only for analytics
 */

import {
  boolean,
  check,
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
import { z } from 'zod'

// Define the 'telemetry' PostgreSQL schema namespace
export const telemetrySchema = pgSchema('telemetry')

// ============================================================================
// Enums
// ============================================================================

export const agentDecisionTypeEnum = telemetrySchema.enum('agent_decision_type', [
  'strategy_selection',
  'pattern_choice',
  'risk_assessment',
  'scope_determination',
  'test_approach',
  'architecture_decision',
])

export const workflowEventTypeEnum = telemetrySchema.enum('workflow_event_type', [
  'item_state_changed',
  'step_completed',
  'story_changed',
  'gap_found',
  'flow_issue',
])

export const workflowStatusEnum = telemetrySchema.enum('workflow_status', [
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
  'blocked',
])

// ============================================================================
// Zod Schemas
// ============================================================================

export const WorkflowEventPayloadSchema = z
  .object({
    message: z.string().optional(),
    error: z.string().optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
    previousState: z.string().optional(),
    newState: z.string().optional(),
    stepName: z.string().optional(),
    duration: z.number().optional(),
    tokens: z.number().optional(),
    cost: z.number().optional(),
    gapType: z.string().optional(),
    severity: z.string().optional(),
  })
  .passthrough()

export type WorkflowEventPayload = z.infer<typeof WorkflowEventPayloadSchema>

// ============================================================================
// Workflow Events (already exists)
// ============================================================================

export const workflowEvents = telemetrySchema.table(
  'workflow_events',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    eventType: workflowEventTypeEnum('event_type').notNull(),
    eventVersion: integer('event_version').notNull().default(1),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    runId: text('run_id'),
    itemId: text('item_id'),
    workflowName: text('workflow_name'),
    agentRole: text('agent_role'),
    status: text('status'),
    payload: jsonb('payload').$type<WorkflowEventPayload>(),
    correlationId: uuid('correlation_id'),
    source: text('source'),
    emittedBy: text('emitted_by'),
  },
  table => ({
    uniqueEventId: uniqueIndex('idx_workflow_events_event_id_unique').on(table.eventId),
    eventTypeTsIdx: index('idx_workflow_events_event_type_ts').on(table.eventType, table.ts),
    runIdTsIdx: index('idx_workflow_events_run_id_ts').on(table.runId, table.ts),
    itemIdIdx: index('idx_workflow_events_item_id').on(table.itemId),
    workflowNameIdx: index('idx_workflow_events_workflow_name').on(table.workflowName),
    agentRoleIdx: index('idx_workflow_events_agent_role').on(table.agentRole),
    statusIdx: index('idx_workflow_events_status').on(table.status),
    tsIdx: index('idx_workflow_events_ts').on(table.ts),
  }),
)

// ============================================================================
// Agent Invocations (migrated from wint)
// ============================================================================

export const agentInvocations = telemetrySchema.table(
  'agent_invocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: text('invocation_id').notNull().unique(),
    agentName: text('agent_name').notNull(),
    storyId: text('story_id'),
    phase: text('phase'),
    inputPayload: jsonb('input_payload').$type<Record<string, unknown>>(),
    outputPayload: jsonb('output_payload').$type<Record<string, unknown>>(),
    durationMs: integer('duration_ms'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cachedTokens: integer('cached_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    estimatedCost: numeric('estimated_cost', { precision: 10, scale: 4 })
      .notNull()
      .default('0.0000'),
    modelName: text('model_name'),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: uniqueIndex('telemetry_agent_invocations_invocation_id_idx').on(
      table.invocationId,
    ),
    agentNameIdx: index('telemetry_agent_invocations_agent_name_idx').on(table.agentName),
    storyIdIdx: index('telemetry_agent_invocations_story_id_idx').on(table.storyId),
    startedAtIdx: index('telemetry_agent_invocations_started_at_idx').on(table.startedAt),
    statusIdx: index('telemetry_agent_invocations_status_idx').on(table.status),
    agentStoryIdx: index('telemetry_agent_invocations_agent_story_idx').on(
      table.agentName,
      table.storyId,
    ),
  }),
)

// ============================================================================
// Agent Decisions (migrated from wint)
// ============================================================================

export const agentDecisions = telemetrySchema.table(
  'agent_decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invocationId: uuid('invocation_id')
      .notNull()
      .references(() => agentInvocations.id, { onDelete: 'cascade' }),
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
    invocationIdIdx: index('telemetry_agent_decisions_invocation_id_idx').on(table.invocationId),
    decisionTypeIdx: index('telemetry_agent_decisions_decision_type_idx').on(table.decisionType),
    createdAtIdx: index('telemetry_agent_decisions_created_at_idx').on(table.createdAt),
    correctnessScoreCheck: check(
      'telemetry_correctness_score_range',
      sql`${table.correctnessScore} >= 0 AND ${table.correctnessScore} <= 100`,
    ),
  }),
)

// ============================================================================
// Agent Outcomes (migrated from wint)
// ============================================================================

export const agentOutcomes = telemetrySchema.table(
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
    securityIssues: jsonb('security_issues').notNull().default('[]'),
    performanceMetrics: jsonb('performance_metrics').notNull().default('{}'),
    artifactsMetadata: jsonb('artifacts_metadata').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    invocationIdIdx: index('telemetry_agent_outcomes_invocation_id_idx').on(table.invocationId),
    outcomeTypeIdx: index('telemetry_agent_outcomes_outcome_type_idx').on(table.outcomeType),
    createdAtIdx: index('telemetry_agent_outcomes_created_at_idx').on(table.createdAt),
  }),
)

// ============================================================================
// Story Outcomes (migrated from wint)
// ============================================================================

export const storyOutcomes = telemetrySchema.table(
  'story_outcomes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull().unique(),
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
  },
  table => ({
    storyIdIdx: index('telemetry_story_outcomes_story_id_idx').on(table.storyId),
    finalVerdictIdx: index('telemetry_story_outcomes_final_verdict_idx').on(table.finalVerdict),
    completedAtIdx: index('telemetry_story_outcomes_completed_at_idx').on(table.completedAt),
  }),
)

// ============================================================================
// Token Usage (migrated from wint)
// ============================================================================

export const tokenUsage = telemetrySchema.table(
  'token_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id'),
    invocationId: text('invocation_id'),
    phase: text('phase').notNull(),
    tokensInput: integer('tokens_input').notNull().default(0),
    tokensOutput: integer('tokens_output').notNull().default(0),
    totalTokens: integer('total_tokens'),
    model: text('model'),
    agentName: text('agent_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('telemetry_token_usage_story_id_idx').on(table.storyId),
    invocationIdIdx: index('telemetry_token_usage_invocation_id_idx').on(table.invocationId),
    phaseIdx: index('telemetry_token_usage_phase_idx').on(table.phase),
    createdAtIdx: index('telemetry_token_usage_created_at_idx').on(table.createdAt),
    agentNameIdx: index('telemetry_token_usage_agent_name_idx').on(table.agentName),
  }),
)

// ============================================================================
// Workflow Executions (migrated from wint)
// ============================================================================

export const workflowExecutions = telemetrySchema.table(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: text('execution_id').notNull().unique(),
    workflowName: text('workflow_name').notNull(),
    workflowVersion: text('workflow_version').notNull(),
    storyId: text('story_id'),
    triggeredBy: text('triggered_by').notNull(),
    status: text('status').notNull().default('pending'),
    inputPayload: jsonb('input_payload'),
    outputPayload: jsonb('output_payload'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: uniqueIndex('telemetry_workflow_executions_execution_id_idx').on(
      table.executionId,
    ),
    storyIdIdx: index('telemetry_workflow_executions_story_id_idx').on(table.storyId),
    statusIdx: index('telemetry_workflow_executions_status_idx').on(table.status),
    startedAtIdx: index('telemetry_workflow_executions_started_at_idx').on(table.startedAt),
  }),
)

// ============================================================================
// Workflow Checkpoints (migrated from wint)
// ============================================================================

export const workflowCheckpoints = telemetrySchema.table(
  'workflow_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
    checkpointName: text('checkpoint_name').notNull(),
    phase: text('phase').notNull(),
    state: jsonb('state').notNull(),
    status: text('status').notNull(),
    reachedAt: timestamp('reached_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('telemetry_workflow_checkpoints_execution_id_idx').on(table.executionId),
    phaseIdx: index('telemetry_workflow_checkpoints_phase_idx').on(table.phase),
    reachedAtIdx: index('telemetry_workflow_checkpoints_reached_at_idx').on(table.reachedAt),
  }),
)

// ============================================================================
// Workflow Audit Log (migrated from wint)
// ============================================================================

export const workflowAuditLog = telemetrySchema.table(
  'workflow_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').notNull(),
    triggeredBy: text('triggered_by').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    executionIdIdx: index('telemetry_workflow_audit_log_execution_id_idx').on(table.executionId),
    eventTypeIdx: index('telemetry_workflow_audit_log_event_type_idx').on(table.eventType),
    occurredAtIdx: index('telemetry_workflow_audit_log_occurred_at_idx').on(table.occurredAt),
  }),
)

// ============================================================================
// Dependency Audit Runs (migrated from wint)
// ============================================================================

export const depAuditRuns = telemetrySchema.table(
  'dep_audit_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: varchar('story_id', { length: 255 }).notNull(),
    commitSha: varchar('commit_sha', { length: 64 }),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull().defaultNow(),
    packagesAdded: jsonb('packages_added').notNull().default('[]'),
    packagesUpdated: jsonb('packages_updated').notNull().default('[]'),
    packagesRemoved: jsonb('packages_removed').notNull().default('[]'),
    overallRisk: varchar('overall_risk', { length: 16 }).notNull().default('none'),
    findingsCount: integer('findings_count').notNull().default(0),
    blockedQueueItemsCreated: integer('blocked_queue_items_created').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('telemetry_dep_audit_runs_story_id_idx').on(table.storyId),
    triggeredAtIdx: index('telemetry_dep_audit_runs_triggered_at_idx').on(table.triggeredAt),
    riskCheck: check(
      'telemetry_dep_audit_runs_risk_check',
      sql`${table.overallRisk} IN ('none', 'low', 'medium', 'high', 'critical')`,
    ),
  }),
)

// ============================================================================
// Dependency Audit Findings (migrated from wint)
// ============================================================================

export const depAuditFindings = telemetrySchema.table(
  'dep_audit_findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => depAuditRuns.id, { onDelete: 'cascade' }),
    packageName: varchar('package_name', { length: 255 }).notNull(),
    findingType: varchar('finding_type', { length: 32 }).notNull(),
    severity: varchar('severity', { length: 16 }).notNull(),
    details: jsonb('details').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    runIdIdx: index('telemetry_dep_audit_findings_run_id_idx').on(table.runId),
    severityIdx: index('telemetry_dep_audit_findings_severity_idx').on(table.severity),
    runSeverityIdx: index('telemetry_dep_audit_findings_run_severity_idx').on(
      table.runId,
      table.severity,
    ),
    typeCheck: check(
      'telemetry_dep_audit_findings_type_check',
      sql`${table.findingType} IN ('vulnerability', 'overlap', 'bundle_bloat', 'unmaintained')`,
    ),
    severityCheck: check(
      'telemetry_dep_audit_findings_severity_check',
      sql`${table.severity} IN ('critical', 'high', 'medium', 'low', 'info')`,
    ),
  }),
)

// ============================================================================
// ML Models (migrated from wint)
// ============================================================================

export const mlModels = telemetrySchema.table(
  'ml_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelName: text('model_name').notNull(),
    modelType: text('model_type').notNull(),
    version: text('version').notNull(),
    modelPath: text('model_path'),
    hyperparameters: jsonb('hyperparameters'),
    trainingDataCount: integer('training_data_count').notNull().default(0),
    trainedAt: timestamp('trained_at', { withTimezone: true }).notNull().defaultNow(),
    trainedBy: text('trained_by'),
    isActive: boolean('is_active').notNull().default(false),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    nameVersionIdx: uniqueIndex('telemetry_ml_models_name_version_idx').on(
      table.modelName,
      table.version,
    ),
    modelTypeIdx: index('telemetry_ml_models_model_type_idx').on(table.modelType),
    isActiveIdx: index('telemetry_ml_models_is_active_idx').on(table.isActive),
    trainedAtIdx: index('telemetry_ml_models_trained_at_idx').on(table.trainedAt),
  }),
)

// ============================================================================
// Model Metrics (migrated from wint)
// ============================================================================

export const modelMetrics = telemetrySchema.table(
  'model_metrics',
  {
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
  },
  table => ({
    modelIdIdx: index('telemetry_model_metrics_model_id_idx').on(table.modelId),
    metricTypeIdx: index('telemetry_model_metrics_metric_type_idx').on(table.metricType),
    evaluatedAtIdx: index('telemetry_model_metrics_evaluated_at_idx').on(table.evaluatedAt),
  }),
)

// ============================================================================
// Model Predictions (migrated from wint)
// ============================================================================

export const modelPredictions = telemetrySchema.table(
  'model_predictions',
  {
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
  },
  table => ({
    modelIdIdx: index('telemetry_model_predictions_model_id_idx').on(table.modelId),
    entityIdx: index('telemetry_model_predictions_entity_idx').on(table.entityType, table.entityId),
    predictionTypeIdx: index('telemetry_model_predictions_prediction_type_idx').on(
      table.predictionType,
    ),
    predictedAtIdx: index('telemetry_model_predictions_predicted_at_idx').on(table.predictedAt),
  }),
)

// ============================================================================
// Training Data (migrated from wint)
// ============================================================================

export const trainingData = telemetrySchema.table(
  'training_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dataType: text('data_type').notNull(),
    features: jsonb('features').notNull(),
    labels: jsonb('labels').notNull(),
    storyId: text('story_id'),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
    validated: boolean('validated').notNull().default(false),
    validatedAt: timestamp('validated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    dataTypeIdx: index('telemetry_training_data_data_type_idx').on(table.dataType),
    storyIdIdx: index('telemetry_training_data_story_id_idx').on(table.storyId),
    collectedAtIdx: index('telemetry_training_data_collected_at_idx').on(table.collectedAt),
    validatedIdx: index('telemetry_training_data_validated_idx').on(table.validated),
  }),
)

// ============================================================================
// Change Telemetry (migrated from wint)
// ============================================================================

export const changeTelemetry = telemetrySchema.table(
  'change_telemetry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: text('story_id').notNull(),
    modelId: text('model_id').notNull(),
    affinityKey: text('affinity_key').notNull(),
    changeType: text('change_type').notNull().default('unknown'),
    fileType: text('file_type').notNull().default('unknown'),
    outcome: text('outcome').notNull(),
    tokensIn: integer('tokens_in').notNull().default(0),
    tokensOut: integer('tokens_out').notNull().default(0),
    escalatedTo: text('escalated_to'),
    retryCount: integer('retry_count').notNull().default(0),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    storyIdIdx: index('telemetry_change_telemetry_story_id_idx').on(table.storyId),
    affinityIdx: index('telemetry_change_telemetry_affinity_idx').on(table.affinityKey),
    createdAtIdx: index('telemetry_change_telemetry_created_at_idx').on(table.createdAt),
    outcomeCheck: check(
      'telemetry_change_telemetry_outcome_check',
      sql`${table.outcome} IN ('pass', 'fail', 'abort', 'budget_exhausted')`,
    ),
    changeTypeCheck: check(
      'telemetry_change_telemetry_change_type_check',
      sql`${table.changeType} IN ('unknown', 'add', 'modify', 'delete', 'rename', 'refactor')`,
    ),
    fileTypeCheck: check(
      'telemetry_change_telemetry_file_type_check',
      sql`${table.fileType} IN ('unknown', 'ts', 'tsx', 'sql', 'yaml', 'json', 'md', 'sh', 'other')`,
    ),
  }),
)

// ============================================================================
// Relations
// ============================================================================

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

export const depAuditRunsRelations = relations(depAuditRuns, ({ many }) => ({
  findings: many(depAuditFindings),
}))

export const depAuditFindingsRelations = relations(depAuditFindings, ({ one }) => ({
  run: one(depAuditRuns, {
    fields: [depAuditFindings.runId],
    references: [depAuditRuns.id],
  }),
}))

export const mlModelsRelations = relations(mlModels, ({ many }) => ({
  metrics: many(modelMetrics),
  predictions: many(modelPredictions),
}))

export const modelMetricsRelations = relations(modelMetrics, ({ one }) => ({
  model: one(mlModels, {
    fields: [modelMetrics.modelId],
    references: [mlModels.id],
  }),
}))

export const modelPredictionsRelations = relations(modelPredictions, ({ one }) => ({
  model: one(mlModels, {
    fields: [modelPredictions.modelId],
    references: [mlModels.id],
  }),
}))
