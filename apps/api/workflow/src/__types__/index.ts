/**
 * Shared TypeScript Types for Orchestrator
 *
 * Legacy repository schemas used by current workflow implementations.
 * The dead re-exports from @repo/knowledge-base/src/db/schema/wint were
 * removed by AUDIT-5 — that path never existed.
 *
 * @module @repo/orchestrator/__types__
 */

import { z } from 'zod'
import { StoryStateSchema } from '../state/enums/story-state.js'

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
