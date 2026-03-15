/**
 * Artifacts Schema — artifacts PostgreSQL schema
 *
 * Database: KB DB (@repo/knowledge-base, port 5433)
 * Schema:   artifacts
 *
 * Per-story artifact tables produced during the workflow pipeline:
 * checkpoints, contexts, reviews, elaborations, evidence, QA gates, etc.
 */

import { pgSchema, text, timestamp, uuid, boolean, jsonb, integer } from 'drizzle-orm/pg-core'
import { knowledgeEntries } from './kb.js'

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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactAnalyses = artifacts.table('artifact_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  scope: text('scope').notNull().default('story'),
  targetId: text('target_id').notNull(),
  analysisType: text('analysis_type').default('general'),
  summaryText: text('summary_text'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactPlans = artifacts.table('artifact_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  stepCount: integer('step_count'),
  estimatedComplexity: text('estimated_complexity'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactVerifications = artifacts.table('artifact_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  verdict: text('verdict'),
  findingCount: integer('finding_count'),
  criticalCount: integer('critical_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactFixSummaries = artifacts.table('artifact_fix_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  iteration: integer('iteration').notNull().default(0),
  issuesFixed: integer('issues_fixed'),
  issuesRemaining: integer('issues_remaining'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactProofs = artifacts.table('artifact_proofs', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  proofType: text('proof_type'),
  verified: boolean('verified'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactCompletionReports = artifacts.table('artifact_completion_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  status: text('status'),
  iterationsUsed: integer('iterations_used'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactStorySeeds = artifacts.table('artifact_story_seeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  conflictsFound: integer('conflicts_found'),
  blockingConflicts: integer('blocking_conflicts'),
  baselineLoaded: boolean('baseline_loaded'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactTestPlans = artifacts.table('artifact_test_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  strategy: text('strategy'),
  scopeUiTouched: boolean('scope_ui_touched'),
  scopeDataTouched: boolean('scope_data_touched'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactDevFeasibility = artifacts.table('artifact_dev_feasibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  feasible: boolean('feasible'),
  confidence: text('confidence'),
  complexity: text('complexity'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const artifactUiuxNotes = artifacts.table('artifact_uiux_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: text('target_id').notNull(),
  hasUiChanges: boolean('has_ui_changes'),
  componentCount: integer('component_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type StoryArtifact = typeof storyArtifacts.$inferSelect
export type NewStoryArtifact = typeof storyArtifacts.$inferInsert
