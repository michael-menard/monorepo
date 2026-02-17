/**
 * Shared TypeScript Types for Unified WINT Schema
 *
 * This module re-exports auto-generated Zod schemas from @repo/database-schema
 * and provides a single source of truth for all WINT-related types.
 *
 * All schemas are auto-generated from Drizzle ORM tables using drizzle-zod,
 * ensuring they stay in sync with the database schema.
 *
 * @module @repo/orchestrator/__types__
 */

import { z } from 'zod'
import { StoryStateSchema } from '../state/enums/story-state.js'

// ============================================================================
// CORE SCHEMA GROUP - Story Management
// ============================================================================

/**
 * Story schemas for the main story entity tracking user stories and their metadata.
 * Use insertStorySchema for creating new stories, selectStorySchema for querying.
 */
export {
  insertStorySchema,
  selectStorySchema,
  type InsertStory,
  type SelectStory,
} from '@repo/database-schema/schema/wint'

/**
 * Story state schemas for tracking the current state of a story (e.g., "in_progress", "completed").
 * Use insertStoryStateSchema for state transitions, selectStoryStateSchema for querying current state.
 */
export {
  insertStoryStateSchema,
  selectStoryStateSchema,
  type InsertStoryState,
  type SelectStoryState,
} from '@repo/database-schema/schema/wint'

/**
 * Story transition schemas for tracking state transitions with metadata.
 * Each transition records from_state, to_state, timestamp, and optional context.
 */
export {
  insertStoryTransitionSchema,
  selectStoryTransitionSchema,
  type InsertStoryTransition,
  type SelectStoryTransition,
} from '@repo/database-schema/schema/wint'

/**
 * Story dependency schemas for tracking dependencies between stories.
 * Use for "blocks" and "depends_on" relationships.
 */
export {
  insertStoryDependencySchema,
  selectStoryDependencySchema,
  type InsertStoryDependency,
  type SelectStoryDependency,
} from '@repo/database-schema/schema/wint'

/**
 * Story artifact schemas for tracking generated files and outputs (e.g., PLAN.yaml, EVIDENCE.yaml).
 * Each artifact has a type, path, and optional content/metadata.
 */
export {
  insertStoryArtifactSchema,
  selectStoryArtifactSchema,
  type InsertStoryArtifact,
  type SelectStoryArtifact,
} from '@repo/database-schema/schema/wint'

/**
 * Story phase history schemas for tracking which phases a story has completed.
 * Records phase name, entry/exit timestamps, and outcome.
 */
export {
  insertStoryPhaseHistorySchema,
  selectStoryPhaseHistorySchema,
  type InsertStoryPhaseHistory,
  type SelectStoryPhaseHistory,
} from '@repo/database-schema/schema/wint'

/**
 * Story metadata version schemas for tracking changes to story metadata over time.
 * Enables auditing and rollback of story configuration changes.
 */
export {
  insertStoryMetadataVersionSchema,
  selectStoryMetadataVersionSchema,
  type InsertStoryMetadataVersion,
  type SelectStoryMetadataVersion,
} from '@repo/database-schema/schema/wint'

/**
 * Story assignment schemas for tracking which agents/users are assigned to stories.
 * Supports assignment history and workload tracking.
 */
export {
  insertStoryAssignmentSchema,
  selectStoryAssignmentSchema,
  type InsertStoryAssignment,
  type SelectStoryAssignment,
} from '@repo/database-schema/schema/wint'

/**
 * Story blocker schemas for tracking impediments preventing story progress.
 * Each blocker has a type, description, and resolution status.
 */
export {
  insertStoryBlockerSchema,
  selectStoryBlockerSchema,
  type InsertStoryBlocker,
  type SelectStoryBlocker,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// CONTEXT CACHE GROUP - Context Management
// ============================================================================

/**
 * Context pack schemas for tracking reusable context bundles.
 * Context packs contain domain knowledge, examples, and constraints.
 */
export {
  insertContextPackSchema,
  selectContextPackSchema,
  type InsertContextPack,
  type SelectContextPack,
} from '@repo/database-schema/schema/wint'

/**
 * Context session schemas for tracking agent execution sessions.
 * Each session links to a story and records context usage.
 */
export {
  insertContextSessionSchema,
  selectContextSessionSchema,
  type InsertContextSession,
  type SelectContextSession,
} from '@repo/database-schema/schema/wint'

/**
 * Context cache hit schemas for tracking context retrieval performance.
 * Records cache hits, misses, and retrieval latency.
 */
export {
  insertContextCacheHitSchema,
  selectContextCacheHitSchema,
  type InsertContextCacheHit,
  type SelectContextCacheHit,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// TELEMETRY GROUP - Agent Execution Tracking
// ============================================================================

/**
 * Agent invocation schemas for tracking agent execution events.
 * Each invocation records agent type, input, output, and execution metrics.
 */
export {
  insertAgentInvocationSchema,
  selectAgentInvocationSchema,
  type InsertAgentInvocation,
  type SelectAgentInvocation,
} from '@repo/database-schema/schema/wint'

/**
 * Agent decision schemas for tracking autonomous decisions made by agents.
 * Records decision tier, options considered, and final choice.
 */
export {
  insertAgentDecisionSchema,
  selectAgentDecisionSchema,
  type InsertAgentDecision,
  type SelectAgentDecision,
} from '@repo/database-schema/schema/wint'

/**
 * Agent outcome schemas for tracking agent execution results.
 * Links invocations to their final outcomes (success, failure, blocked).
 */
export {
  insertAgentOutcomeSchema,
  selectAgentOutcomeSchema,
  type InsertAgentOutcome,
  type SelectAgentOutcome,
} from '@repo/database-schema/schema/wint'

/**
 * State transition schemas for tracking state machine transitions.
 * Records from_state, to_state, trigger, and metadata for workflow tracking.
 */
export {
  insertStateTransitionSchema,
  selectStateTransitionSchema,
  type InsertStateTransition,
  type SelectStateTransition,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// ML GROUP - Machine Learning Pipeline
// ============================================================================

/**
 * Training data schemas for ML model training datasets.
 * Each record contains features, labels, and training metadata.
 */
export {
  insertTrainingDataSchema,
  selectTrainingDataSchema,
  type InsertTrainingData,
  type SelectTrainingData,
} from '@repo/database-schema/schema/wint'

/**
 * ML model schemas for tracking trained machine learning models.
 * Records model type, version, hyperparameters, and performance metrics.
 */
export {
  insertMlModelSchema,
  selectMlModelSchema,
  type InsertMlModel,
  type SelectMlModel,
} from '@repo/database-schema/schema/wint'

/**
 * Model prediction schemas for tracking ML model predictions.
 * Each prediction includes input features, predicted output, and confidence.
 */
export {
  insertModelPredictionSchema,
  selectModelPredictionSchema,
  type InsertModelPrediction,
  type SelectModelPrediction,
} from '@repo/database-schema/schema/wint'

/**
 * Model metric schemas for tracking model performance over time.
 * Records accuracy, precision, recall, F1, and custom metrics.
 */
export {
  insertModelMetricSchema,
  selectModelMetricSchema,
  type InsertModelMetric,
  type SelectModelMetric,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// GRAPH GROUP - Feature Graph and Relationships
// ============================================================================

/**
 * Feature schemas for tracking system capabilities and features.
 * Each feature has a name, description, status, and metadata.
 */
export {
  insertFeatureSchema,
  selectFeatureSchema,
  type InsertFeature,
  type SelectFeature,
} from '@repo/database-schema/schema/wint'

/**
 * Capability schemas for tracking high-level system capabilities.
 * Capabilities group related features into cohesive units.
 */
export {
  insertCapabilitySchema,
  selectCapabilitySchema,
  type InsertCapability,
  type SelectCapability,
} from '@repo/database-schema/schema/wint'

/**
 * Feature relationship schemas for tracking dependencies between features.
 * Includes validation rules to prevent circular dependencies.
 */
export {
  insertFeatureRelationshipSchema,
  selectFeatureRelationshipSchema,
  type InsertFeatureRelationship,
  type SelectFeatureRelationship,
} from '@repo/database-schema/schema/wint'

/**
 * Cohesion rule schemas for defining feature grouping rules.
 * Rules determine which features should be developed together.
 */
export {
  insertCohesionRuleSchema,
  selectCohesionRuleSchema,
  type InsertCohesionRule,
  type SelectCohesionRule,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// WORKFLOW GROUP - LangGraph Workflow Execution
// ============================================================================

/**
 * Workflow execution schemas for tracking LangGraph workflow runs.
 * Each execution records graph name, input, output, and execution status.
 */
export {
  insertWorkflowExecutionSchema,
  selectWorkflowExecutionSchema,
  type InsertWorkflowExecution,
  type SelectWorkflowExecution,
} from '@repo/database-schema/schema/wint'

/**
 * Workflow checkpoint schemas for tracking workflow state snapshots.
 * Enables pause/resume and rollback of long-running workflows.
 */
export {
  insertWorkflowCheckpointSchema,
  selectWorkflowCheckpointSchema,
  type InsertWorkflowCheckpoint,
  type SelectWorkflowCheckpoint,
} from '@repo/database-schema/schema/wint'

/**
 * Workflow audit log schemas for tracking all workflow state changes.
 * Provides comprehensive audit trail for debugging and compliance.
 */
export {
  insertWorkflowAuditLogSchema,
  selectWorkflowAuditLogSchema,
  type InsertWorkflowAuditLog,
  type SelectWorkflowAuditLog,
} from '@repo/database-schema/schema/wint'

// ============================================================================
// LEGACY REPOSITORY SCHEMAS (002_workflow_tables.sql)
// ============================================================================
//
// These schemas support the current repository implementations which use
// the legacy 002_workflow_tables.sql schema structure. They will be replaced
// by the unified WINT schema types in WINT-1090 (LangGraph Repository Updates).
//
// DO NOT use these schemas in new code - use the WINT schema types above instead.

/**
 * Story row schema for current story-repository implementation.
 * Matches 002_workflow_tables.sql stories table structure.
 *
 * @deprecated Will be replaced by selectStorySchema in WINT-1090
 */
export const StoryRowSchema = z.object({
  id: z.string().uuid(), // UUID primary key
  story_id: z.string(), // Story identifier (e.g., "WISH-001")
  feature_id: z.string().uuid().nullable(), // UUID reference to features table
  type: z.string(), // story_type enum
  state: StoryStateSchema, // story_state enum
  title: z.string(),
  goal: z.string().nullable(),
  points: z.number().nullable(),
  priority: z.string().nullable(), // priority_level enum (p0, p1, p2, p3)
  blocked_by: z.string().nullable(),
  depends_on: z.array(z.string()).nullable(),
  follow_up_from: z.string().nullable(),
  packages: z.array(z.string()).nullable(), // scope_packages
  surfaces: z.array(z.string()).nullable(), // scope_surfaces (surface_type enum)
  non_goals: z.array(z.string()).nullable(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type StoryRow = z.infer<typeof StoryRowSchema>

/**
 * State transition schema for current story-repository implementation.
 * Matches 002_workflow_tables.sql story_state_transitions table structure.
 *
 * @deprecated Will be replaced by selectStoryTransitionSchema in WINT-1090
 */
export const StateTransitionSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string(),
  from_state: StoryStateSchema.nullable(),
  to_state: StoryStateSchema,
  actor: z.string(),
  reason: z.string().nullable(),
  created_at: z.date(),
})

export type StateTransition = z.infer<typeof StateTransitionSchema>

/**
 * Elaboration record schema for current workflow-repository implementation.
 * Matches 002_workflow_tables.sql + 004_workflow_repository_compat.sql elaborations table structure.
 *
 * @deprecated Will be replaced by unified WINT workflow schemas in WINT-1090
 */
export const ElaborationRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  date: z.date().optional(), // Original schema column
  verdict: z.string().optional(), // Original schema column (verdict_type enum)
  audit: z.unknown().optional(), // Original schema column (JSONB)
  content: z.unknown().nullable(), // Added in 004 - full elaboration YAML
  readiness_score: z.number().int().min(0).max(100).nullable(),
  gaps_count: z.number().int().min(0).nullable(),
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type ElaborationRecord = z.infer<typeof ElaborationRecordSchema>

/**
 * Plan record schema for current workflow-repository implementation.
 * Matches 002_workflow_tables.sql implementation_plans table structure.
 *
 * @deprecated Will be replaced by unified WINT workflow schemas in WINT-1090
 */
export const PlanRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive(),
  approved: z.boolean().optional(),
  estimated_files: z.number().int().nullable(),
  estimated_tokens: z.number().int().nullable(),
  content: z.unknown().nullable(), // Added in 004
  steps_count: z.number().int().min(0).nullable(),
  files_count: z.number().int().min(0).nullable(),
  complexity: z.string().nullable(),
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type PlanRecord = z.infer<typeof PlanRecordSchema>

/**
 * Verification record schema for current workflow-repository implementation.
 * Matches 002_workflow_tables.sql + 004_workflow_repository_compat.sql verifications table structure.
 *
 * @deprecated Will be replaced by unified WINT workflow schemas in WINT-1090
 */
export const VerificationRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive().nullable(),
  type: z.string().nullable(), // Added in 004
  content: z.unknown().nullable(), // Added in 004
  verdict: z.string().nullable(), // Added in 004
  issues_count: z.number().int().min(0).nullable(),
  qa_verdict: z.string().nullable(), // Original schema column
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type VerificationRecord = z.infer<typeof VerificationRecordSchema>

/**
 * Proof record schema for current workflow-repository implementation.
 * Matches 002_workflow_tables.sql + 004_workflow_repository_compat.sql proofs table structure.
 *
 * @deprecated Will be replaced by unified WINT workflow schemas in WINT-1090
 */
export const ProofRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  version: z.number().int().positive().nullable(),
  content: z.unknown().nullable(), // Added in 004
  acs_passing: z.number().int().min(0).nullable(),
  acs_total: z.number().int().min(0).nullable(),
  files_touched: z.number().int().min(0).nullable(),
  all_acs_verified: z.boolean().nullable(), // Original schema column
  created_at: z.date(),
  created_by: z.string().nullable(),
})

export type ProofRecord = z.infer<typeof ProofRecordSchema>

/**
 * Token usage record schema for current workflow-repository implementation.
 * Matches 002_workflow_tables.sql + 004_workflow_repository_compat.sql token_usage table structure.
 *
 * @deprecated Will be replaced by unified WINT telemetry schemas in WINT-1090
 */
export const TokenUsageRecordSchema = z.object({
  id: z.string().uuid(),
  story_id: z.string().uuid(), // UUID reference to stories.id
  phase: z.string(),
  tokens_input: z.number().int().min(0), // Original column name
  tokens_output: z.number().int().min(0), // Original column name
  total_tokens: z.number().int().min(0).optional(), // Added in 004 (generated)
  model: z.string().nullable(),
  agent_name: z.string().nullable(),
  created_at: z.date(),
})

export type TokenUsageRecord = z.infer<typeof TokenUsageRecordSchema>

/**
 * Token usage input schema for logging token usage.
 * Used by workflow-repository.logTokenUsage() method.
 *
 * @deprecated Will be replaced by unified WINT telemetry schemas in WINT-1090
 */
export const TokenUsageInputSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  model: z.string().optional(),
  agentName: z.string().optional(),
})

export type TokenUsageInput = z.infer<typeof TokenUsageInputSchema>
