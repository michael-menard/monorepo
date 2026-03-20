/**
 * MCP Tools Package
 * WINT-0110: Session Management MCP Tools
 * WINT-0090: Story Management MCP Tools
 * WINT-0100: Context Cache MCP Tools
 * WINT-0130: Graph Query MCP Tools
 *
 * This package provides MCP tools infrastructure for workflow operations.
 */

// Re-export all session management tools (WINT-0110)
export * from './session-management/index.js'

// Re-export all story management tools (WINT-0090)
export * from './story-management/index.js'

// Re-export all context cache tools (WINT-0100)
export { contextCacheGet } from './context-cache/context-cache-get.js'
export { contextCachePut } from './context-cache/context-cache-put.js'
export { contextCacheInvalidate } from './context-cache/context-cache-invalidate.js'
export { contextCacheStats } from './context-cache/context-cache-stats.js'

// Re-export types
export type {
  ContextCacheGetInput,
  ContextCachePutInput,
  ContextCacheInvalidateInput,
  ContextCacheStatsInput,
  ContextCacheStatsResult,
  ContextCacheInvalidateResult,
} from './context-cache/__types__/index.js'

// Re-export all worktree management tools (WINT-1130)
export {
  worktreeRegister,
  worktreeGetByStory,
  worktreeListActive,
  worktreeMarkComplete,
  // Zod schemas (needed by knowledge-base MCP server tool-schemas.ts)
  WorktreeRegisterInputSchema,
  WorktreeGetByStoryInputSchema,
  WorktreeListActiveInputSchema,
  WorktreeMarkCompleteInputSchema,
} from './worktree-management/index.js'
export type {
  WorktreeRegisterInput,
  WorktreeRegisterOutput,
  WorktreeGetByStoryInput,
  WorktreeGetByStoryOutput,
  WorktreeListActiveInput,
  WorktreeListActiveOutput,
  WorktreeMarkCompleteInput,
  WorktreeMarkCompleteOutput,
  WorktreeRecord,
} from './worktree-management/index.js'

// Re-export story compatibility shim tools (WINT-1011, CDBN-3010: DB-only)
export {
  shimGetStoryStatus,
  shimUpdateStoryStatus,
  shimGetStoriesByStatus,
  shimGetStoriesByFeature,
} from './story-compatibility/index.js'

// Re-export context pack get tool (WINT-2020)
export { contextPackGet } from './context-pack/context-pack-get.js'

// Re-export telemetry tools (WINT-3020)
export { logInvocation } from './telemetry/workflow-log-invocation.js'
export { WorkflowLogInvocationInputSchema } from './telemetry/__types__/index.js'
export type { WorkflowLogInvocationInput } from './telemetry/__types__/index.js'

// Re-export ML pipeline tools (WINT-0140)
export {
  mlModelRegister,
  mlModelGetActive,
  mlMetricsRecord,
  mlPredictionRecord,
  mlPredictionGetByEntity,
  trainingDataIngest,
  trainingDataMarkValidated,
  MlModelTypeSchema,
  MlModelRegisterInputSchema,
  MlModelGetActiveInputSchema,
  MlMetricsRecordInputSchema,
  MlPredictionRecordInputSchema,
  MlPredictionGetByEntityInputSchema,
  TrainingDataIngestInputSchema,
  TrainingDataMarkValidatedInputSchema,
} from '@repo/knowledge-base/ml-pipeline'
export type {
  MlModelType,
  MlModelRegisterInput,
  MlModelRegisterOutput,
  MlModelGetActiveInput,
  MlModelGetActiveOutput,
  MlModelRecord,
  MlMetricsRecordInput,
  MlMetricsRecordOutput,
  MlMetricRecord,
  MlPredictionRecordInput,
  MlPredictionRecordOutput,
  MlPredictionGetByEntityInput,
  MlPredictionGetByEntityOutput,
  MlPredictionRow,
  TrainingDataIngestInput,
  TrainingDataIngestOutput,
  TrainingDataMarkValidatedInput,
  TrainingDataMarkValidatedOutput,
  TrainingDataRow,
} from '@repo/knowledge-base/ml-pipeline'
