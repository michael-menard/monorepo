/**
 * Graph Type Aliases for Dispatch Router
 *
 * Local type aliases for graph input/output types used in dispatch-router.ts.
 * These match the shapes defined in @repo/orchestrator's graph modules.
 *
 * StoryRequest is exported from @repo/orchestrator main index.
 * SynthesizedStory, ElaborationConfig, StoryCreationConfig, ElaborationResult,
 * and StoryCreationResult are not in the main orchestrator index export — they
 * are defined here as compatible structural aliases to avoid deep graph imports.
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 */

// StoryRequest is exported from @repo/orchestrator main index
export type { StoryRequest, BaselineReality } from '@repo/orchestrator'

/**
 * SynthesizedStory — matches SynthesizedStorySchema from:
 * packages/backend/orchestrator/src/nodes/story/synthesize.ts
 * Structural alias — only the fields required by runElaboration().
 */
export type SynthesizedStory = {
  storyId: string
  title: string
  description: string
  domain: string
  synthesizedAt: string
  acceptanceCriteria: unknown[]
  readinessScore: number
  isReady: boolean
  [key: string]: unknown
}

/**
 * ElaborationConfig — matches ElaborationConfigSchema from:
 * packages/backend/orchestrator/src/graphs/elaboration.ts
 * Structural alias for the config object passed to runElaboration().
 */
export type ElaborationConfig = {
  nodeTimeoutMs?: number
  recalculateReadiness?: boolean
  persistToDb?: boolean
  [key: string]: unknown
}

/**
 * StoryCreationConfig — matches StoryCreationConfigSchema from:
 * packages/backend/orchestrator/src/graphs/story-creation.ts
 * Structural alias for the config object passed to runStoryCreation().
 */
export type StoryCreationConfig = {
  autoApprovalThreshold?: number
  minReadinessScore?: number
  requireHiTL?: boolean
  nodeTimeoutMs?: number
  [key: string]: unknown
}

/**
 * ElaborationResult — return type of runElaboration().
 * Structural alias — supervisor only needs to know the call succeeded.
 */
export type ElaborationResult = {
  storyId: string
  phase: string
  success: boolean
  durationMs: number
  completedAt: string
  [key: string]: unknown
}

/**
 * StoryCreationResult — return type of runStoryCreation().
 * Structural alias — supervisor only needs to know the call succeeded.
 */
export type StoryCreationResult = {
  storyId: string
  phase: string
  success: boolean
  durationMs: number
  completedAt: string
  [key: string]: unknown
}

/**
 * DevImplementConfig — partial config for runDevImplement().
 * Structural alias — supervisor passes minimal config.
 */
export type DevImplementConfig = {
  featureDir?: string
  worktreePath?: string
  persistToDb?: boolean
  runReview?: boolean
  [key: string]: unknown
}

/**
 * DevImplementResult — return type of runDevImplement().
 */
export type DevImplementResult = {
  storyId: string
  success: boolean
  planLoaded: boolean
  executeComplete: boolean
  reviewResult: unknown
  evidenceCollected: boolean
  durationMs: number
  completedAt: string
  errors: string[]
  warnings: string[]
  [key: string]: unknown
}

/**
 * ReviewGraphResult — return type of runReview().
 */
export type ReviewGraphResult = {
  storyId: string
  success: boolean
  verdict?: string
  reviewYamlPath?: string | null
  durationMs: number
  completedAt: string
  errors: string[]
  warnings: string[]
  [key: string]: unknown
}

/**
 * QAVerifyResult — return type of runQAVerify().
 */
export type QAVerifyResult = {
  storyId: string
  success: boolean
  verdict: 'PASS' | 'FAIL' | 'BLOCKED'
  qaArtifact: unknown
  preconditionsPassed: boolean
  durationMs: number
  completedAt: string
  errors: string[]
  warnings: string[]
  [key: string]: unknown
}
