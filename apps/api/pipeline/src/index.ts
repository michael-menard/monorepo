/**
 * @repo/pipeline — Autonomous Pipeline Supervisor
 *
 * APIP-3080: Adds parallel story concurrency (2-3 worktrees) via BullMQ.
 *
 * @module pipeline
 */

// Supervisor
export {
  PipelineSupervisor,
  type PipelineSupervisorConfig,
  type RedisClient,
  getOrCreateRedisClient,
  bootstrap,
} from './supervisor/index.js'

// Job types (from __types__/)
export {
  PipelineJobDataSchema,
  PipelineSupervisorConfigSchema,
  type PipelineJobData,
} from './supervisor/__types__/index.js'

// APIP-3080: Concurrency config schema
export {
  ConcurrencyConfigSchema,
  DEFAULT_CONCURRENCY_CONFIG,
  type ConcurrencyConfig,
  type ConcurrencyConfigInput,
} from './supervisor/__types__/concurrency-config.js'

// APIP-3080: ConcurrencyController
export {
  ConcurrencyController,
  type ActiveSlot,
} from './supervisor/concurrency/concurrency-controller.js'

// APIP-3080: Worktree path utilities
export {
  generateWorktreePath,
  extractStoryIdFromWorktreePath,
} from './supervisor/concurrency/worktree-path.js'

// APIP-3080: Worktree lifecycle
export { createWorktree, removeWorktree } from './supervisor/worktree-lifecycle.js'

// APIP-3080: Conflict detection
export {
  WorktreeConflictDetector,
  StoryConflictDescriptorSchema,
  type StoryConflictDescriptor,
} from './conflicts/worktree-conflict-detector.js'
