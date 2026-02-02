/**
 * Database Module
 *
 * Exports repositories for story and workflow persistence.
 * Uses dependency injection for database clients to keep
 * the orchestrator loosely coupled from specific implementations.
 */

// Story Repository
export {
  StoryRepository,
  createStoryRepository,
  StoryRowSchema,
  StateTransitionSchema,
  type DbClient,
  type StoryRow,
  type StateTransition,
} from './story-repository.js'

// Workflow Repository
export {
  WorkflowRepository,
  createWorkflowRepository,
  ElaborationRecordSchema,
  PlanRecordSchema,
  VerificationRecordSchema,
  ProofRecordSchema,
  TokenUsageRecordSchema,
  TokenUsageInputSchema,
  type ElaborationRecord,
  type PlanRecord,
  type VerificationRecord,
  type ProofRecord,
  type TokenUsageRecord,
  type TokenUsageInput,
} from './workflow-repository.js'
