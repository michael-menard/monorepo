/**
 * @repo/workflow-logic
 *
 * Shared workflow business logic for story lifecycle management.
 * Pure functions with no runtime-specific dependencies (no MCP SDK, no AWS, no LangGraph).
 *
 * Exports:
 * - WorkflowStoryStatusSchema, WorkflowStoryStatus (17-value hyphenated model)
 * - DbStoryStatusSchema, DbStoryStatus (8-value snake_case model)
 * - getValidTransitions(currentStatus) → WorkflowStoryStatus[]
 * - toDbStoryStatus(status) → DbStoryStatus
 * - getStatusFromDirectory(dirName) → WorkflowStoryStatus | null
 * - isValidStoryId(id) → boolean
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
