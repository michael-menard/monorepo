/**
 * @repo/upload - Client Exports
 *
 * Story REPA-002: Migrate upload client code to @repo/upload
 *
 * XHR upload client, manager, and finalize functions.
 */

// XHR upload functions
export { uploadFile, uploadToPresignedUrl } from './xhr'

// Upload manager
export { createUploadManager } from './manager'

// Finalize client
export { finalizeSession } from './finalize'

// Types and schemas
export type {
  UploadOptions,
  UploadResult,
  UploadProgress,
  UploadTask,
  UploadTaskStatus,
  UploadManager,
  UploadManagerOptions,
  UploadErrorCode,
  UploadApiError,
} from './types'

export {
  UploadError,
  UploadProgressSchema,
  UploadOptionsSchema,
  UploadResultSchema,
  UploadErrorCodeSchema,
  UploadApiErrorSchema,
  UploadTaskSchema,
  UploadTaskStatusSchema,
  UploadManagerOptionsSchema,
} from './types'

// Finalize types
export type {
  FinalizeRequest,
  FinalizeSuccessResponse,
  ConflictErrorDetails,
  FileValidationError,
  FinalizeResult,
  FinalizeOptions,
} from './finalize'

export {
  FinalizeError,
  FinalizeRequestSchema,
  FinalizeSuccessResponseSchema,
  ConflictErrorDetailsSchema,
  FileValidationErrorSchema,
  FinalizeErrorResponseSchema,
  FinalizeOptionsSchema,
} from './finalize'
