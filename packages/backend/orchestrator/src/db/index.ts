/**
 * Database Module
 *
 * Exports repositories for story and workflow persistence.
 * Uses dependency injection for database clients to keep
 * the orchestrator loosely coupled from specific implementations.
 *
 * Note: Schemas and types are now exported from ../__types__/index.ts
 * to provide a single source of truth for all WINT-related types.
 */

// Story Repository
export { StoryRepository, createStoryRepository, type DbClient } from './story-repository.js'

// Workflow Repository
export { WorkflowRepository, createWorkflowRepository } from './workflow-repository.js'

// Re-export schemas and types from shared types module
export {
  StoryRowSchema,
  StateTransitionSchema,
  ElaborationRecordSchema,
  PlanRecordSchema,
  VerificationRecordSchema,
  ProofRecordSchema,
  TokenUsageRecordSchema,
  TokenUsageInputSchema,
  type StoryRow,
  type StateTransition,
  type ElaborationRecord,
  type PlanRecord,
  type VerificationRecord,
  type ProofRecord,
  type TokenUsageRecord,
  type TokenUsageInput,
} from '../__types__/index.js'
