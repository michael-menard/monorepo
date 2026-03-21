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

// Re-export all worktree management tools (WINT-1130) — sourced from knowledge-base
export {
  worktreeRegister,
  worktreeGetByStory,
  worktreeListActive,
  worktreeMarkComplete,
  WorktreeRegisterInputSchema,
  WorktreeGetByStoryInputSchema,
  WorktreeListActiveInputSchema,
  WorktreeMarkCompleteInputSchema,
} from '@repo/knowledge-base/worktree-management'
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
} from '@repo/knowledge-base/worktree-management'

// Re-export story compatibility shim tools (WINT-1011, CDBN-3010: DB-only)
export {
  shimGetStoryStatus,
  shimUpdateStoryStatus,
  shimGetStoriesByStatus,
  shimGetStoriesByFeature,
} from './story-compatibility/index.js'

// Re-export context pack get tool (WINT-2020)
export { contextPackGet } from './context-pack/context-pack-get.js'

// Re-export telemetry tools (WINT-3020) — sourced from knowledge-base
export { logInvocation, WorkflowLogInvocationInputSchema } from '@repo/knowledge-base/telemetry'
export type { WorkflowLogInvocationInput } from '@repo/knowledge-base/telemetry'
