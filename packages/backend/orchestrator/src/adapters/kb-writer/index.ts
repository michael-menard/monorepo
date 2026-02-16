/**
 * KB Writer Adapter - Public API
 *
 * Unified interface for Knowledge Base write operations.
 *
 * @see LNGG-0050
 */

// Factory (main entry point)
export { createKbWriter } from './factory.js'

// Type exports
export type {
  // Enums
  EntryType,
  Role,
  // Config
  KbWriterConfig,
  KbDeps,
  // Requests
  KbLessonRequest,
  KbDecisionRequest,
  KbConstraintRequest,
  KbRunbookRequest,
  KbNoteRequest,
  KbWriteRequest,
  // Results
  KbWriteResult,
  KbWriteSuccess,
  KbWriteSkipped,
  KbWriteError,
  KbBatchWriteResult,
} from './__types__/index.js'

// Schema exports
export {
  EntryTypeSchema,
  RoleSchema,
  KbWriterConfigSchema,
  KbDepsSchema,
  KbLessonRequestSchema,
  KbDecisionRequestSchema,
  KbConstraintRequestSchema,
  KbRunbookRequestSchema,
  KbNoteRequestSchema,
  KbWriteRequestSchema,
  KbWriteResultSchema,
  KbWriteSuccessSchema,
  KbWriteSkippedSchema,
  KbWriteErrorSchema,
  KbBatchWriteResultSchema,
} from './__types__/index.js'

// Utility exports
export {
  formatLesson,
  formatDecision,
  formatConstraint,
  formatRunbook,
  formatNote,
} from './utils/content-formatter.js'

export { generateTags } from './utils/tag-generator.js'
export { TagGeneratorOptionsSchema } from './utils/tag-generator.js'
export type { TagGeneratorOptions } from './utils/tag-generator.js'
