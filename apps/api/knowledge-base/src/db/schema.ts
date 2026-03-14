import {
  pgTable,
  pgSchema,
  text,
  timestamp,
  uuid,
  customType,
  jsonb,
  boolean,
  integer,
  numeric,
} from 'drizzle-orm/pg-core'

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
    const cleaned = value.replace(/^\[|\]$/g, '')
    return cleaned.split(',').map(Number)
  },
})

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  role: text('role').notNull().default('all'),
  entryType: text('entry_type').notNull().default('note'),
  storyId: text('story_id'),
  tags: text('tags').array(),
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  archived: boolean('archived').default(false).notNull(),
  archivedAt: timestamp('archived_at'),
  canonicalId: uuid('canonical_id').references(() => knowledgeEntries.id),
  isCanonical: boolean('is_canonical').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: text('deleted_by'),
})

export const embeddingCache = pgTable('embedding_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentHash: text('content_hash').notNull(),
  model: text('model').notNull().default('text-embedding-3-small'),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const adrs = pgTable('adrs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adrId: text('adr_id').notNull(),
  title: text('title').notNull(),
  context: text('context').notNull(),
  decision: text('decision').notNull(),
  consequences: text('consequences'),
  status: text('status').notNull().default('accepted'),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  workflowStoryId: text('workflow_story_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  oldContent: text('old_content'),
  newContent: text('new_content'),
  changedBy: text('changed_by'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})

export const codeStandards = pgTable('code_standards', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  language: text('language'),
  standardType: text('standard_type').notNull(),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  workflowStoryId: text('workflow_story_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cohesionRules = pgTable('cohesion_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleName: text('rule_name').notNull(),
  ruleType: text('rule_type').notNull(),
  conditions: jsonb('conditions').notNull(),
  maxViolations: integer('max_violations'),
  severity: text('severity').notNull().default('warning'),
  isActive: boolean('is_active').default(true),
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const lessonsLearned = pgTable('lessons_learned', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull().default('other'),
  whatHappened: text('what_happened'),
  why: text('why'),
  resolution: text('resolution'),
  sourceEntryId: uuid('source_entry_id').references(() => knowledgeEntries.id, {
    onDelete: 'set null',
  }),
  sourceStoryId: text('source_story_id'),
  tags: text('tags').array(),
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verifiedBy: text('verified_by'),
  workflowStoryId: text('workflow_story_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleText: text('rule_text').notNull(),
  ruleType: text('rule_type').notNull(),
  scope: text('scope').notNull(),
  severity: text('severity').notNull().default('warning'),
  status: text('status').notNull().default('active'),
  sourceId: uuid('source_id'),
  sourceStoryId: text('source_story_id'),
  sourceLessonId: uuid('source_lesson_id'),
  workflowStoryId: text('workflow_story_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

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
  parentPlanId: uuid('parent_plan_id').references(() => plans.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  supersededBy: uuid('superseded_by').references(() => plans.id, { onDelete: 'set null' }),
  embedding: vector('embedding', { dimensions: 1536 }),
  sections: jsonb('sections'),
  status: text('status'),
  priority: text('priority'),
  priorityOrder: integer('priority_order'),
})

export const planDependencies = workflow.table('plan_dependencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  dependsOnPlanId: uuid('depends_on_plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  isSatisfied: boolean('is_satisfied').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

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

const artifacts = pgSchema('artifacts')

export const storyArtifacts = artifacts.table('story_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id').notNull(),
  artifactType: text('artifact_type').notNull(),
  artifactName: text('artifact_name'),
  kbEntryId: uuid('kb_entry_id').references(() => knowledgeEntries.id, { onDelete: 'set null' }),
  phase: text('phase'),
  iteration: integer('iteration').default(0),
  summary: jsonb('summary'),
  detailTable: text('detail_table'),
  detailId: uuid('detail_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactCheckpoints = artifacts.table('artifact_checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  phaseStatus: jsonb('phase_status').notNull().default({}),
  resumeFrom: integer('resume_from'),
  featureDir: text('feature_dir'),
  prefix: text('prefix'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactContexts = artifacts.table('artifact_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  featureDir: text('feature_dir'),
  prefix: text('prefix'),
  storyCount: integer('story_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactReviews = artifacts.table('artifact_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  perspective: text('perspective'),
  verdict: text('verdict'),
  findingCount: integer('finding_count'),
  criticalCount: integer('critical_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactElaborations = artifacts.table('artifact_elaborations', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  elaborationType: text('elaboration_type').notNull().default('story_analysis'),
  verdict: text('verdict'),
  decisionCount: integer('decision_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactAnalyses = artifacts.table('artifact_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  analysisType: text('analysis_type').default('general'),
  summaryText: text('summary_text'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactScopes = artifacts.table('artifact_scopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  touchesBackend: boolean('touches_backend'),
  touchesFrontend: boolean('touches_frontend'),
  touchesDatabase: boolean('touches_database'),
  touchesInfra: boolean('touches_infra'),
  fileCount: integer('file_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactPlans = artifacts.table('artifact_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  stepCount: integer('step_count'),
  estimatedComplexity: text('estimated_complexity'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactEvidence = artifacts.table('artifact_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  acTotal: integer('ac_total'),
  acMet: integer('ac_met'),
  acStatus: text('ac_status'),
  testPassCount: integer('test_pass_count'),
  testFailCount: integer('test_fail_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactVerifications = artifacts.table('artifact_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  verdict: text('verdict'),
  findingCount: integer('finding_count'),
  criticalCount: integer('critical_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactFixSummaries = artifacts.table('artifact_fix_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  iteration: integer('iteration').notNull().default(0),
  issuesFixed: integer('issues_fixed'),
  issuesRemaining: integer('issues_remaining'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactProofs = artifacts.table('artifact_proofs', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  proofType: text('proof_type'),
  verified: boolean('verified'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactQaGates = artifacts.table('artifact_qa_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  decision: text('decision').notNull().default('FAIL'),
  reviewer: text('reviewer'),
  findingCount: integer('finding_count'),
  blockerCount: integer('blocker_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactCompletionReports = artifacts.table('artifact_completion_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  status: text('status'),
  iterationsUsed: integer('iterations_used'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactStorySeeds = artifacts.table('artifact_story_seeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  conflictsFound: integer('conflicts_found'),
  blockingConflicts: integer('blocking_conflicts'),
  baselineLoaded: boolean('baseline_loaded'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactTestPlans = artifacts.table('artifact_test_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  strategy: text('strategy'),
  scopeUiTouched: boolean('scope_ui_touched'),
  scopeDataTouched: boolean('scope_data_touched'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactDevFeasibility = artifacts.table('artifact_dev_feasibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  feasible: boolean('feasible'),
  confidence: text('confidence'),
  complexity: text('complexity'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

export const artifactUiuxNotes = artifacts.table('artifact_uiux_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  hasUiChanges: boolean('has_ui_changes'),
  componentCount: integer('component_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('created_at').notNull().defaultNow(),
})

const analytics = pgSchema('analytics')

export const storyTokenUsage = analytics.table('story_token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: text('story_id').notNull(),
  feature: text('feature'),
  phase: text('phase').notNull(),
  agent: text('agent'),
  iteration: integer('iteration').default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const changeTelemetry = analytics.table('change_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  experimentId: uuid('experiment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelExperiments = analytics.table('model_experiments', {
  id: uuid('id').primaryKey().defaultRandom(),
  changeType: text('change_type').notNull(),
  fileType: text('file_type').notNull(),
  controlModel: text('control_model').notNull(),
  challengerModel: text('challenger_model').notNull(),
  status: text('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  concludedAt: timestamp('concluded_at', { withTimezone: true }),
  controlSampleSize: integer('control_sample_size'),
  challengerSampleSize: integer('challenger_sample_size'),
  controlSuccessRate: numeric('control_success_rate', { precision: 5, scale: 4 }),
  challengerSuccessRate: numeric('challenger_success_rate', { precision: 5, scale: 4 }),
  minSamplePerArm: integer('min_sample_per_arm').notNull().default(50),
  maxWindowRows: integer('max_window_rows'),
  maxWindowDays: integer('max_window_days'),
  winner: text('winner'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const modelAssignments = analytics.table('model_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentPattern: text('agent_pattern').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  tier: integer('tier').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect
export type NewKnowledgeEntry = typeof knowledgeEntries.$inferInsert
export type EmbeddingCacheEntry = typeof embeddingCache.$inferSelect
export type NewEmbeddingCacheEntry = typeof embeddingCache.$inferInsert
export type Story = typeof stories.$inferSelect
export type NewStory = typeof stories.$inferInsert
export type StoryOutcome = typeof storyOutcomes.$inferSelect
export type NewStoryOutcome = typeof storyOutcomes.$inferInsert
export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert
