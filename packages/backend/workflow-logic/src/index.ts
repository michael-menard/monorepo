/**
 * @repo/workflow-logic
 *
 * Shared workflow business logic for story lifecycle management.
 * Pure functions with no runtime-specific dependencies (no MCP SDK, no AWS, no LangGraph).
 *
 * Exports:
 * - WorkflowStoryStatusSchema, WorkflowStoryStatus (17-value hyphenated model)
 * - DbStoryStatusSchema, DbStoryStatus (canonical 13-state snake_case model)
 * - getValidTransitions(currentStatus) → WorkflowStoryStatus[]
 * - toDbStoryStatus(status) → DbStoryStatus
 * - getStatusFromDirectory(dirName) → WorkflowStoryStatus | null
 * - isValidStoryId(id) → boolean
 *
 * Decision:
 * - DecisionTierSchema, AutonomyLevelSchema, classifyDecisionTier, shouldEscalate
 *
 * Artifact:
 * - ArtifactTypeSchema, ArtifactPhaseSchema, getArtifactPhase, isValidArtifactForPhase
 *
 * Context:
 * - buildContextQuery, buildBlockerQuery
 *
 * Token:
 * - TokenUsageSchema, estimateTokenCount, formatTokenSummary
 *
 * Telemetry:
 * - McpInvocationPhaseSchema, mapArtifactPhaseToMcpPhase
 *
 * @module @repo/workflow-logic
 */

// Types
export { WorkflowStoryStatusSchema, DbStoryStatusSchema } from './__types__/index.js'
export type { WorkflowStoryStatus, DbStoryStatus } from './__types__/index.js'

// Business logic functions
export { getValidTransitions } from './transitions/index.js'
export { toDbStoryStatus } from './adapter/index.js'
export { getStatusFromDirectory } from './directory/index.js'
export { isValidStoryId } from './validation/index.js'

// Evidence Judge — pure classification functions
export {
  classifyEvidenceStrength,
  deriveAcVerdict,
  deriveOverallVerdict,
  EvidenceStrengthSchema,
  AcVerdictSchema,
  OverallVerdictSchema,
  AcVerdictResultSchema,
} from './evidence-judge/index.js'
export type {
  EvidenceStrength,
  AcVerdict,
  OverallVerdict,
  AcVerdictResult,
} from './evidence-judge/index.js'

// Decision — tier classification and escalation logic
export {
  classifyDecisionTier,
  shouldEscalate,
  DecisionTierSchema,
  AutonomyLevelSchema,
} from './decision/index.js'
export type { DecisionTier, AutonomyLevel } from './decision/index.js'

// Artifact — artifact type and phase metadata
export {
  getArtifactPhase,
  isValidArtifactForPhase,
  ArtifactTypeSchema,
  ArtifactPhaseSchema,
} from './artifact/index.js'
export type { ArtifactType, ArtifactPhase } from './artifact/index.js'

// Context — KB query builders
export { buildContextQuery, buildBlockerQuery } from './context/index.js'

// Token — usage estimation and formatting
export { estimateTokenCount, formatTokenSummary, TokenUsageSchema } from './token/index.js'
export type { TokenUsage } from './token/index.js'

// Telemetry — phase mapping between ArtifactPhase and MCP invocation phase
export { mapArtifactPhaseToMcpPhase, McpInvocationPhaseSchema } from './telemetry/index.js'
export type { McpInvocationPhase } from './telemetry/index.js'
