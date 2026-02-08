/**
 * CRUD Operations for Knowledge Base
 *
 * This module exports the five core CRUD operations:
 * - kb_add: Add new knowledge entry with automatic embedding generation
 * - kb_get: Retrieve knowledge entry by ID
 * - kb_update: Update existing knowledge entry with conditional re-embedding
 * - kb_delete: Delete knowledge entry (idempotent)
 * - kb_list: List knowledge entries with filtering by role, tags, and pagination
 *
 * @see KNOW-003 for implementation details and acceptance criteria
 *
 * @example
 * ```typescript
 * import {
 *   kb_add,
 *   kb_get,
 *   kb_update,
 *   kb_delete,
 *   kb_list,
 *   NotFoundError,
 *   isNotFoundError,
 * } from '@repo/knowledge-base/crud-operations'
 * ```
 */

// Operations
export { kb_add, type KbAddDeps } from './kb-add.js'
export { kb_get, type KbGetDeps } from './kb-get.js'
export { kb_update, type KbUpdateDeps } from './kb-update.js'
export { kb_delete, type KbDeleteDeps } from './kb-delete.js'
export { kb_list, type KbListDeps } from './kb-list.js'

// Error classes
export { NotFoundError, isNotFoundError } from './errors.js'

// Input schemas and types
export {
  KbAddInputSchema,
  KbGetInputSchema,
  KbUpdateInputSchema,
  KbDeleteInputSchema,
  KbListInputSchema,
  MAX_CONTENT_LENGTH,
  type KbAddInput,
  type KbGetInput,
  type KbUpdateInput,
  type KbDeleteInput,
  type KbListInput,
} from './schemas.js'

// Task triage (KBMEM-018)
export {
  kb_triage_tasks,
  calculatePriorityScore,
  scoreToPriority,
  KbTriageTasksInputSchema,
  PRIORITY_WEIGHTS,
  PRIORITY_THRESHOLDS,
  type KbTriageTasksInput,
  type TriagedTask,
  type TriageTasksResult,
  type TaskTriageDeps,
} from './task-triage.js'

// Task lifecycle - promotion and cleanup (KBMEM-019, KBMEM-020)
export {
  kb_promote_task,
  kb_list_promotable_tasks,
  kb_cleanup_stale_tasks,
  KbPromoteTaskInputSchema,
  KbListPromotableTasksInputSchema,
  KbCleanupStaleTasksInputSchema,
  PROMOTION_CRITERIA,
  STALE_THRESHOLDS,
  type KbPromoteTaskInput,
  type KbListPromotableTasksInput,
  type KbCleanupStaleTasksInput,
  type PromoteTaskResult,
  type ListPromotableTasksResult,
  type CleanupStaleTasksResult,
  type TaskLifecycleDeps,
} from './task-lifecycle.js'

// Deferred writes (KBMEM-022)
export {
  kb_queue_deferred_write,
  kb_list_deferred_writes,
  kb_process_deferred_writes,
  kb_clear_deferred_writes,
  withDeferredFallback,
  readDeferredWritesFile,
  writeDeferredWritesFile,
  KbQueueDeferredWriteInputSchema,
  KbListDeferredWritesInputSchema,
  KbProcessDeferredWritesInputSchema,
  DeferredOperationTypeSchema,
  DeferredWriteEntrySchema,
  DeferredWritesFileSchema,
  DEFAULT_DEFERRED_WRITES_PATH,
  MAX_RETRY_COUNT,
  type KbQueueDeferredWriteInput,
  type KbListDeferredWritesInput,
  type KbProcessDeferredWritesInput,
  type DeferredOperationType,
  type DeferredWriteEntry,
  type DeferredWritesFile,
  type QueueDeferredWriteResult,
  type ProcessDeferredWritesResult,
  type ListDeferredWritesResult,
} from './deferred-writes.js'

// Artifact operations (DB-first artifact storage)
export {
  kb_write_artifact,
  kb_read_artifact,
  kb_list_artifacts,
  kb_delete_artifact,
  KbWriteArtifactInputSchema,
  KbReadArtifactInputSchema,
  KbListArtifactsInputSchema,
  ARTIFACT_TYPES,
  PHASES,
  type KbWriteArtifactInput,
  type KbReadArtifactInput,
  type KbListArtifactsInput,
  type ArtifactOperationsDeps,
  type ArtifactResponse,
  type ArtifactListItem,
} from './artifact-operations.js'

// Story CRUD operations (story status tracking)
export {
  kb_get_story,
  kb_list_stories,
  kb_update_story_status,
  kb_get_next_story,
  KbGetStoryInputSchema,
  KbListStoriesInputSchema,
  KbUpdateStoryStatusInputSchema,
  KbGetNextStoryInputSchema,
  type KbGetStoryInput,
  type KbListStoriesInput,
  type KbUpdateStoryStatusInput,
  type KbGetNextStoryInput,
  type StoryCrudDeps,
} from './story-crud-operations.js'

// Token operations (token logging)
export {
  kb_log_tokens,
  kb_get_story_tokens,
  KbLogTokensInputSchema,
  type KbLogTokensInput,
  type TokenOperationsDeps,
} from './token-operations.js'

// Analytics operations (insights and metrics)
export {
  kb_get_token_summary,
  kb_get_bottleneck_analysis,
  kb_get_churn_analysis,
  KbGetTokenSummaryInputSchema,
  KbGetBottleneckAnalysisInputSchema,
  KbGetChurnAnalysisInputSchema,
  type KbGetTokenSummaryInput,
  type KbGetBottleneckAnalysisInput,
  type KbGetChurnAnalysisInput,
  type AnalyticsDeps,
} from './analytics-operations.js'
