/**
 * @repo/pipeline — Autonomous Pipeline Supervisor
 *
 * Provides parallel story concurrency (2–3 worktrees) via BullMQ.
 *
 * @module pipeline
 */

// Supervisor (PipelineSupervisor + BullMQ wiring)
export {
  PipelineSupervisor,
  PipelineJobDataSchema,
  PipelineSupervisorConfigSchema,
  createConcurrencyConfig,
  type PipelineJobData,
  type PipelineSupervisorConfig,
  type PipelineSupervisorConfigInput,
  type StoryProcessor,
} from './supervisor/index.js'

// Concurrency config schema
export {
  ConcurrencyConfigSchema,
  DEFAULT_CONCURRENCY_CONFIG,
  type ConcurrencyConfig,
  type ConcurrencyConfigInput,
} from './supervisor/__types__/concurrency-config.js'

// ConcurrencyController
export {
  ConcurrencyController,
  type ActiveSlot,
} from './supervisor/concurrency/concurrency-controller.js'

// Worktree path utilities
export {
  generateWorktreePath,
  extractStoryIdFromWorktreePath,
} from './supervisor/concurrency/worktree-path.js'

// Worktree lifecycle
export { createWorktree, removeWorktree } from './supervisor/worktree-lifecycle.js'

// Conflict detection
export {
  WorktreeConflictDetector,
  StoryConflictDescriptorSchema,
  type StoryConflictDescriptor,
} from './conflicts/worktree-conflict-detector.js'
