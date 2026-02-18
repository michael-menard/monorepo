/**
 * Worktree Management MCP Tools
 * WINT-1130: Track Worktree-to-Story Mapping in Database
 *
 * Exports all 4 worktree management tools for database-driven coordination
 * of parallel worktree-based development.
 */

export { worktreeRegister } from './worktree-register.js'
export { worktreeGetByStory } from './worktree-get-by-story.js'
export { worktreeListActive } from './worktree-list-active.js'
export { worktreeMarkComplete } from './worktree-mark-complete.js'

// Re-export Zod schemas
export {
  WorktreeRegisterInputSchema,
  WorktreeGetByStoryInputSchema,
  WorktreeListActiveInputSchema,
  WorktreeMarkCompleteInputSchema,
} from './__types__/index.js'

// Re-export types for convenience
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
} from './__types__/index.js'
