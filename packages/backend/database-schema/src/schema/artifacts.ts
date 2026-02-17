/**
 * Artifacts Database Schema
 *
 * This schema defines the artifact storage tables in the 'artifacts' PostgreSQL schema.
 * It's isolated from workflow state (wint schema) and file sync (kbar schema).
 *
 * Story INFR-0110: Core Workflow Artifact Schemas (Story, Checkpoint, Scope, Plan)
 *
 * Schema Isolation:
 * - All tables are in the 'artifacts' PostgreSQL schema namespace
 * - Completely isolated from file sync state (kbar schema)
 * - Designed for queryable artifact data storage
 *
 * Artifact Types (this story covers 4 of 7):
 * 1. Story artifacts - denormalized story.yaml fields
 * 2. Checkpoint artifacts - checkpoint.yaml fields
 * 3. Scope artifacts - scope.yaml fields
 * 4. Plan artifacts - plan.yaml fields
 * 5. Evidence artifacts - (INFR-0120)
 * 6. Review artifacts - (INFR-0120)
 * 7. QA-verify artifacts - (INFR-0120)
 */

import { index, jsonb, pgEnum, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
// Import WINT schema for foreign key relations
import { stories } from './wint'

// ============================================================================
// Schema Namespace
// ============================================================================

/**
 * Define the 'artifacts' PostgreSQL schema namespace
 * Isolated from kbar (file sync) and wint (workflow state)
 */
export const artifactsSchema = pgSchema('artifacts')

// ============================================================================
// Enums (in public schema for cross-namespace reusability)
// ============================================================================

/**
 * Artifact Type Enum
 * Defines all 7 artifact types for forward compatibility with INFR-0120.
 * Located in public schema (not artifacts schema) for cross-namespace use.
 *
 * Decision: ADR-INFR-110-002 - Define all types upfront to avoid ALTER TYPE in INFR-0120.
 */
export const artifactTypeEnum = pgEnum('artifact_type_enum', [
  'story',
  'checkpoint',
  'scope',
  'plan',
  'evidence', // INFR-0120
  'review', // INFR-0120
  'qa-verify', // INFR-0120
])

// ============================================================================
// JSONB Type Schemas (for type safety)
// ============================================================================

/**
 * Acceptance Criterion Schema
 * Matches StoryAcceptanceCriterionSchema from orchestrator artifacts
 */
export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  testable: z.boolean().default(true),
  automated: z.boolean().default(false),
})

export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>

/**
 * Risk Schema
 * Matches StoryRiskSchema from orchestrator artifacts
 */
export const riskSchema = z.object({
  id: z.string(),
  description: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  mitigation: z.string().nullable(),
})

export type Risk = z.infer<typeof riskSchema>

/**
 * Scope Touches Schema
 * Matches Scope.touches from orchestrator artifacts
 */
export const scopeTouchesSchema = z.object({
  backend: z.boolean().default(false),
  frontend: z.boolean().default(false),
  packages: z.boolean().default(false),
  db: z.boolean().default(false),
  contracts: z.boolean().default(false),
  ui: z.boolean().default(false),
  infra: z.boolean().default(false),
})

export type ScopeTouches = z.infer<typeof scopeTouchesSchema>

/**
 * Risk Flags Schema
 * Matches Scope.risk_flags from orchestrator artifacts
 */
export const riskFlagsSchema = z.object({
  auth: z.boolean().default(false),
  payments: z.boolean().default(false),
  migrations: z.boolean().default(false),
  external_apis: z.boolean().default(false),
  security: z.boolean().default(false),
  performance: z.boolean().default(false),
})

export type RiskFlags = z.infer<typeof riskFlagsSchema>

/**
 * Plan Step Schema
 * Matches PlanStepSchema from orchestrator artifacts
 */
export const planStepSchema = z.object({
  id: z.number().int().positive(),
  description: z.string(),
  files: z.array(z.string()),
  dependencies: z.array(z.number().int()).default([]),
  slice: z.enum(['backend', 'frontend', 'packages', 'infra', 'shared']).optional(),
})

export type PlanStep = z.infer<typeof planStepSchema>

/**
 * File Change Schema
 * Matches FileChangeSchema from orchestrator artifacts
 */
export const fileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(['create', 'modify', 'delete']),
  reason: z.string().optional(),
})

export type FileChange = z.infer<typeof fileChangeSchema>

/**
 * Command Schema
 * Matches CommandSchema from orchestrator artifacts
 */
export const commandSchema = z.object({
  command: z.string(),
  when: z.string(),
  required: z.boolean().default(true),
})

export type Command = z.infer<typeof commandSchema>

/**
 * Acceptance Criteria Map Schema
 * Matches AcceptanceCriteriaMapSchema from orchestrator artifacts
 */
export const acceptanceCriteriaMapSchema = z.object({
  ac_id: z.string(),
  planned_evidence: z.string(),
  evidence_type: z.enum(['test', 'http', 'manual', 'command', 'file']).default('test'),
})

export type AcceptanceCriteriaMap = z.infer<typeof acceptanceCriteriaMapSchema>

/**
 * AC Evidence Schema (INFR-0120)
 * Matches Evidence.ac_evidence from orchestrator artifacts
 */
export const acEvidenceSchema = z.object({
  ac_id: z.string(),
  ac_text: z.string(),
  status: z.enum(['PASS', 'MISSING', 'PARTIAL']),
  evidence_items: z.array(
    z.object({
      type: z.enum(['test', 'command', 'e2e', 'http', 'file']),
      path: z.string().optional(),
      command: z.string().optional(),
      description: z.string(),
      result: z.string().optional(),
    }),
  ),
})

export type AcEvidence = z.infer<typeof acEvidenceSchema>

/**
 * Touched File Schema (INFR-0120)
 * Matches Evidence.touched_files from orchestrator artifacts
 */
export const touchedFileSchema = z.object({
  path: z.string(),
  action: z.enum(['created', 'modified', 'deleted']),
  lines: z.number().int().positive().optional(),
  description: z.string().optional(),
})

export type TouchedFile = z.infer<typeof touchedFileSchema>

/**
 * Command Run Schema (INFR-0120)
 * Matches Evidence.commands_run from orchestrator artifacts
 */
export const commandRunSchema = z.object({
  command: z.string(),
  result: z.enum(['SUCCESS', 'FAILURE']),
  output: z.string().optional(),
  timestamp: z.string(), // ISO timestamp
})

export type CommandRun = z.infer<typeof commandRunSchema>

/**
 * E2E Test Schema (INFR-0120)
 * Matches Evidence.e2e_tests from orchestrator artifacts
 */
export const e2eTestSchema = z.object({
  status: z.enum(['pass', 'fail', 'exempt']),
  exempt_reason: z.string().nullable(),
  config: z.string().nullable(),
  project: z.string().nullable(),
  mode: z.string().nullable(),
  tests_written: z.boolean(),
  results: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
  }),
  failed_tests: z.array(
    z.object({
      name: z.string(),
      error: z.string(),
    }),
  ),
  config_issues: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      expected: z.string().optional(),
      actual: z.string().optional(),
      files: z.array(z.string()).optional(),
      resolution: z.string().optional(),
    }),
  ),
})

export type E2eTest = z.infer<typeof e2eTestSchema>

/**
 * Review Finding Schema (INFR-0120)
 * Matches Review.findings from orchestrator artifacts
 */
export const reviewFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.string(),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  description: z.string(),
  suggestion: z.string().optional(),
})

export type ReviewFinding = z.infer<typeof reviewFindingSchema>

/**
 * Worker Result Schema (INFR-0120)
 * Matches Review.worker_results from orchestrator artifacts
 */
export const workerResultSchema = z.object({
  worker: z.string(),
  status: z.enum(['success', 'failure', 'blocked']),
  files_changed: z.array(z.string()),
  tests_passed: z.boolean().optional(),
  notes: z.string().optional(),
})

export type WorkerResult = z.infer<typeof workerResultSchema>

/**
 * Ranked Patch Schema (INFR-0120)
 * Matches Review.ranked_patches from orchestrator artifacts
 */
export const rankedPatchSchema = z.object({
  id: z.string(),
  rank: z.number().int().positive(),
  file: z.string(),
  description: z.string(),
  diff: z.string().optional(),
  rationale: z.string(),
})

export type RankedPatch = z.infer<typeof rankedPatchSchema>

/**
 * AC Verification Schema (INFR-0120)
 * Matches QaVerify.ac_verifications from orchestrator artifacts
 */
export const acVerificationSchema = z.object({
  ac_id: z.string(),
  status: z.enum(['verified', 'failed', 'skipped']),
  verification_method: z.string(),
  notes: z.string().optional(),
})

export type AcVerification = z.infer<typeof acVerificationSchema>

/**
 * Test Result Schema (INFR-0120)
 * Matches QaVerify.test_results from orchestrator artifacts
 */
export const testResultSchema = z.object({
  test_suite: z.string(),
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  duration_ms: z.number().nonnegative().optional(),
})

export type TestResult = z.infer<typeof testResultSchema>

/**
 * QA Issue Schema (INFR-0120)
 * Matches QaVerify.qa_issues from orchestrator artifacts
 */
export const qaIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(['blocker', 'critical', 'major', 'minor']),
  category: z.string(),
  description: z.string(),
  steps_to_reproduce: z.string().optional(),
  resolution: z.string().optional(),
})

export type QaIssue = z.infer<typeof qaIssueSchema>

// ============================================================================
// Story Artifacts Table
// ============================================================================

/**
 * Story Artifacts Table
 * Stores denormalized story.yaml fields for queryable access.
 * Foreign key to wint.stories for relational integrity.
 *
 * Decision: ADR-INFR-110-001 - Use JSONB for acceptance_criteria and risks
 * (co-location pattern for small arrays <20 items)
 */
export const storyArtifacts = artifactsSchema.table(
  'story_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // Core fields
    title: text('title').notNull(),
    storyType: text('story_type').notNull(), // 'feature', 'bug', 'infrastructure', etc.
    state: text('state').notNull(), // Current story state
    scopeSummary: text('scope_summary'), // Brief summary of changes

    // JSONB fields (denormalized for co-location)
    acceptanceCriteria: jsonb('acceptance_criteria').$type<AcceptanceCriterion[]>(),
    risks: jsonb('risks').$type<Risk[]>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Composite index for story + artifact type queries
    storyIdx: index('idx_story_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_story_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Checkpoint Artifacts Table
// ============================================================================

/**
 * Checkpoint Artifacts Table
 * Stores checkpoint.yaml fields for phase tracking and resume.
 */
export const checkpointArtifacts = artifactsSchema.table(
  'checkpoint_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // Core fields
    phase: text('phase').notNull(), // 'setup', 'plan', 'execute', 'review', 'qa', etc.
    substep: text('substep'), // Optional substep within phase
    completedSteps: jsonb('completed_steps').$type<string[]>(), // List of completed step IDs

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Composite index for story + phase queries
    storyPhaseIdx: index('idx_checkpoint_artifacts_story_phase').on(table.storyId, table.phase),
    // Index for time-range queries
    createdAtIdx: index('idx_checkpoint_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Scope Artifacts Table
// ============================================================================

/**
 * Scope Artifacts Table
 * Stores scope.yaml fields for surface tracking and risk flags.
 */
export const scopeArtifacts = artifactsSchema.table(
  'scope_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // JSONB fields for nested structures
    packagesTouched: jsonb('packages_touched').$type<string[]>(), // Package names
    surfaces: jsonb('surfaces').$type<ScopeTouches>(), // What surfaces are touched
    riskFlags: jsonb('risk_flags').$type<RiskFlags>(), // Risk indicators

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for story queries
    storyIdx: index('idx_scope_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_scope_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Plan Artifacts Table
// ============================================================================

/**
 * Plan Artifacts Table
 * Stores plan.yaml fields for implementation planning.
 */
export const planArtifacts = artifactsSchema.table(
  'plan_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // JSONB fields for complex nested data
    steps: jsonb('steps').$type<PlanStep[]>(), // Implementation steps
    fileChanges: jsonb('file_changes').$type<FileChange[]>(), // Files to create/modify/delete
    commands: jsonb('commands').$type<Command[]>(), // Commands to run
    acMapping: jsonb('ac_mapping').$type<AcceptanceCriteriaMap[]>(), // AC to evidence mapping

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for story queries
    storyIdx: index('idx_plan_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_plan_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Evidence Artifacts Table (INFR-0120)
// ============================================================================

/**
 * Evidence Artifacts Table
 * Stores evidence.yaml fields for acceptance criteria validation.
 * Part of INFR-0120: Review/QA Artifact Schemas
 */
export const evidenceArtifacts = artifactsSchema.table(
  'evidence_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // JSONB fields for complex nested data
    acEvidence: jsonb('ac_evidence').$type<AcEvidence[]>(), // AC to evidence mapping
    touchedFiles: jsonb('touched_files').$type<TouchedFile[]>(), // Files created/modified
    commandsRun: jsonb('commands_run').$type<CommandRun[]>(), // Commands executed
    e2eTests: jsonb('e2e_tests').$type<E2eTest>(), // E2E test results

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for story queries (reuse INFR-0110's composite index pattern)
    storyIdx: index('idx_evidence_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_evidence_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Review Artifacts Table (INFR-0120)
// ============================================================================

/**
 * Review Artifacts Table
 * Stores review.yaml fields for code review findings.
 * Part of INFR-0120: Review/QA Artifact Schemas
 */
export const reviewArtifacts = artifactsSchema.table(
  'review_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // JSONB fields for complex nested data
    findings: jsonb('findings').$type<ReviewFinding[]>(), // Code review findings
    workerResults: jsonb('worker_results').$type<WorkerResult[]>(), // Worker execution results
    rankedPatches: jsonb('ranked_patches').$type<RankedPatch[]>(), // Suggested fixes

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for story queries
    storyIdx: index('idx_review_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_review_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// QA Verify Artifacts Table (INFR-0120)
// ============================================================================

/**
 * QA Verify Artifacts Table
 * Stores qa-verify.yaml fields for QA validation results.
 * Part of INFR-0120: Review/QA Artifact Schemas
 */
export const qaVerifyArtifacts = artifactsSchema.table(
  'qa_verify_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    // JSONB fields for complex nested data
    acVerifications: jsonb('ac_verifications').$type<AcVerification[]>(), // AC verification results
    testResults: jsonb('test_results').$type<TestResult[]>(), // Test suite results
    qaIssues: jsonb('qa_issues').$type<QaIssue[]>(), // Issues found during QA

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for story queries
    storyIdx: index('idx_qa_verify_artifacts_story_id').on(table.storyId),
    // Index for time-range queries
    createdAtIdx: index('idx_qa_verify_artifacts_created_at').on(table.createdAt),
  }),
)

// ============================================================================
// Relations (Drizzle ORM)
// ============================================================================

/**
 * Story to Artifacts Relations (one-to-many, lazy loading)
 * Enables lazy loading artifacts from story records
 * Updated in INFR-0120 to include evidence, review, and qa-verify artifacts
 */
export const storiesRelations = relations(stories, ({ many }) => ({
  storyArtifacts: many(storyArtifacts),
  checkpointArtifacts: many(checkpointArtifacts),
  scopeArtifacts: many(scopeArtifacts),
  planArtifacts: many(planArtifacts),
  evidenceArtifacts: many(evidenceArtifacts), // INFR-0120
  reviewArtifacts: many(reviewArtifacts), // INFR-0120
  qaVerifyArtifacts: many(qaVerifyArtifacts), // INFR-0120
}))

/**
 * Story Artifact to Story Relation (many-to-one, eager loading)
 */
export const storyArtifactsRelations = relations(storyArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [storyArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Checkpoint Artifact to Story Relation (many-to-one, eager loading)
 */
export const checkpointArtifactsRelations = relations(checkpointArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [checkpointArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Scope Artifact to Story Relation (many-to-one, eager loading)
 */
export const scopeArtifactsRelations = relations(scopeArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [scopeArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Plan Artifact to Story Relation (many-to-one, eager loading)
 */
export const planArtifactsRelations = relations(planArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [planArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Evidence Artifact to Story Relation (many-to-one, eager loading)
 * Added in INFR-0120
 */
export const evidenceArtifactsRelations = relations(evidenceArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [evidenceArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * Review Artifact to Story Relation (many-to-one, eager loading)
 * Added in INFR-0120
 */
export const reviewArtifactsRelations = relations(reviewArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [reviewArtifacts.storyId],
    references: [stories.id],
  }),
}))

/**
 * QA Verify Artifact to Story Relation (many-to-one, eager loading)
 * Added in INFR-0120
 */
export const qaVerifyArtifactsRelations = relations(qaVerifyArtifacts, ({ one }) => ({
  story: one(stories, {
    fields: [qaVerifyArtifacts.storyId],
    references: [stories.id],
  }),
}))

// ============================================================================
// Auto-Generated Zod Schemas (drizzle-zod)
// ============================================================================

/**
 * Story Artifact Insert/Select Schemas
 * Auto-generated from Drizzle table definitions
 */
export const insertStoryArtifactSchema = createInsertSchema(storyArtifacts)
export const selectStoryArtifactSchema = createSelectSchema(storyArtifacts)

export type InsertStoryArtifact = z.infer<typeof insertStoryArtifactSchema>
export type SelectStoryArtifact = z.infer<typeof selectStoryArtifactSchema>

/**
 * Checkpoint Artifact Insert/Select Schemas
 */
export const insertCheckpointArtifactSchema = createInsertSchema(checkpointArtifacts)
export const selectCheckpointArtifactSchema = createSelectSchema(checkpointArtifacts)

export type InsertCheckpointArtifact = z.infer<typeof insertCheckpointArtifactSchema>
export type SelectCheckpointArtifact = z.infer<typeof selectCheckpointArtifactSchema>

/**
 * Scope Artifact Insert/Select Schemas
 */
export const insertScopeArtifactSchema = createInsertSchema(scopeArtifacts)
export const selectScopeArtifactSchema = createSelectSchema(scopeArtifacts)

export type InsertScopeArtifact = z.infer<typeof insertScopeArtifactSchema>
export type SelectScopeArtifact = z.infer<typeof selectScopeArtifactSchema>

/**
 * Plan Artifact Insert/Select Schemas
 */
export const insertPlanArtifactSchema = createInsertSchema(planArtifacts)
export const selectPlanArtifactSchema = createSelectSchema(planArtifacts)

export type InsertPlanArtifact = z.infer<typeof insertPlanArtifactSchema>
export type SelectPlanArtifact = z.infer<typeof selectPlanArtifactSchema>

/**
 * Evidence Artifact Insert/Select Schemas (INFR-0120)
 */
export const insertEvidenceArtifactSchema = createInsertSchema(evidenceArtifacts)
export const selectEvidenceArtifactSchema = createSelectSchema(evidenceArtifacts)

export type InsertEvidenceArtifact = z.infer<typeof insertEvidenceArtifactSchema>
export type SelectEvidenceArtifact = z.infer<typeof selectEvidenceArtifactSchema>

/**
 * Review Artifact Insert/Select Schemas (INFR-0120)
 */
export const insertReviewArtifactSchema = createInsertSchema(reviewArtifacts)
export const selectReviewArtifactSchema = createSelectSchema(reviewArtifacts)

export type InsertReviewArtifact = z.infer<typeof insertReviewArtifactSchema>
export type SelectReviewArtifact = z.infer<typeof selectReviewArtifactSchema>

/**
 * QA Verify Artifact Insert/Select Schemas (INFR-0120)
 */
export const insertQaVerifyArtifactSchema = createInsertSchema(qaVerifyArtifacts)
export const selectQaVerifyArtifactSchema = createSelectSchema(qaVerifyArtifacts)

export type InsertQaVerifyArtifact = z.infer<typeof insertQaVerifyArtifactSchema>
export type SelectQaVerifyArtifact = z.infer<typeof selectQaVerifyArtifactSchema>
