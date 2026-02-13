/**
 * Uploader Upload Types
 *
 * Zod schemas for upload file items and batch state.
 * Used by upload manager hook and UI components.
 */

import { z } from 'zod'

/**
 * File category enum - matches API file types
 */
export const FileCategorySchema = z.enum(['instruction', 'parts-list', 'image', 'thumbnail'])

export type FileCategory = z.infer<typeof FileCategorySchema>

/**
 * Upload status enum
 */
export const UploadStatusSchema = z.enum([
  'queued',
  'uploading',
  'success',
  'failed',
  'canceled',
  'expired',
])

export type UploadStatus = z.infer<typeof UploadStatusSchema>

/**
 * Error codes from API - used for mapping to friendly messages
 */
export const UploadErrorCodeSchema = z.enum([
  'EXPIRED_SESSION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_TYPE',
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'VALIDATION_ERROR',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'UNKNOWN',
])

export type UploadErrorCode = z.infer<typeof UploadErrorCodeSchema>

/**
 * Upload file item schema - represents a single file in the uploader
 */
export const UploaderFileItemSchema = z.object({
  /** Unique ID for this file in the upload queue */
  id: z.string(),
  /** File category */
  category: FileCategorySchema,
  /** Original file name */
  name: z.string(),
  /** File size in bytes */
  size: z.number(),
  /** MIME type */
  type: z.string(),
  /** File last modified timestamp */
  lastModified: z.number(),
  /** Current upload status */
  status: UploadStatusSchema,
  /** Upload progress (0-100) */
  progress: z.number().min(0).max(100).default(0),
  /** Error code if failed */
  errorCode: UploadErrorCodeSchema.optional(),
  /** Error message for display */
  errorMessage: z.string().optional(),
  /** Whether session expired for this file */
  expired: z.boolean().default(false),
  /** Server-assigned file ID after registration */
  serverFileId: z.string().optional(),
  /** Upload URL for this file */
  uploadUrl: z.string().optional(),
})

export type UploaderFileItem = z.infer<typeof UploaderFileItemSchema>

/**
 * Batch upload state - aggregate state for all files
 */
export const UploadBatchStateSchema = z.object({
  /** All file items */
  files: z.array(UploaderFileItemSchema),
  /** Overall progress (0-100) */
  overallProgress: z.number().min(0).max(100).default(0),
  /** Count of queued files */
  queuedCount: z.number().default(0),
  /** Count of files currently uploading */
  uploadingCount: z.number().default(0),
  /** Count of successfully uploaded files */
  successCount: z.number().default(0),
  /** Count of failed files */
  failedCount: z.number().default(0),
  /** Count of canceled files */
  canceledCount: z.number().default(0),
  /** Count of expired files */
  expiredCount: z.number().default(0),
  /** Whether any files are in progress */
  isUploading: z.boolean().default(false),
  /** Whether all required files are uploaded */
  isComplete: z.boolean().default(false),
  /** Upload session ID from API */
  uploadSessionId: z.string().optional(),
  /** Session expiry timestamp */
  sessionExpiresAt: z.number().optional(),
})

export type UploadBatchState = z.infer<typeof UploadBatchStateSchema>

/**
 * Error message mapping - maps error codes to user-friendly messages
 */
export const ERROR_MESSAGE_MAP: Record<UploadErrorCode, string> = {
  EXPIRED_SESSION: 'Session expired. Please sign in and retry.',
  UNAUTHORIZED: 'Session expired. Please sign in and retry.',
  FORBIDDEN: 'You do not have permission to upload this file.',
  PAYLOAD_TOO_LARGE: 'File too large.',
  UNSUPPORTED_TYPE: 'Unsupported file type.',
  NETWORK_ERROR: 'Network error. Please check your connection and retry.',
  SERVER_ERROR: 'Temporary issue. Please retry.',
  VALIDATION_ERROR: 'File validation failed.',
  CONFLICT: 'A file with this name already exists.',
  TOO_MANY_REQUESTS: 'Too many requests. Please wait and retry.',
  UNKNOWN: 'An unexpected error occurred. Please retry.',
}

/**
 * Create empty batch state
 */
export const createEmptyBatchState = (): UploadBatchState => ({
  files: [],
  overallProgress: 0,
  queuedCount: 0,
  uploadingCount: 0,
  successCount: 0,
  failedCount: 0,
  canceledCount: 0,
  expiredCount: 0,
  isUploading: false,
  isComplete: false,
})

/**
 * Calculate batch state from files array
 */
export const calculateBatchState = (
  files: UploaderFileItem[],
  uploadSessionId?: string,
  sessionExpiresAt?: number,
): UploadBatchState => {
  const queuedCount = files.filter(f => f.status === 'queued').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const successCount = files.filter(f => f.status === 'success').length
  const failedCount = files.filter(f => f.status === 'failed').length
  const canceledCount = files.filter(f => f.status === 'canceled').length
  const expiredCount = files.filter(f => f.status === 'expired').length

  // Calculate overall progress
  const totalProgress = files.reduce((sum, f) => sum + f.progress, 0)
  const overallProgress = files.length > 0 ? Math.round(totalProgress / files.length) : 0

  // Check if has required instruction and all files are success
  const hasInstruction = files.some(f => f.category === 'instruction' && f.status === 'success')
  const allComplete = files.every(f => f.status === 'success' || f.status === 'canceled')
  const isComplete = hasInstruction && allComplete && files.length > 0

  return {
    files,
    overallProgress,
    queuedCount,
    uploadingCount,
    successCount,
    failedCount,
    canceledCount,
    expiredCount,
    isUploading: uploadingCount > 0,
    isComplete,
    uploadSessionId,
    sessionExpiresAt,
  }
}

/**
 * Map HTTP status and error code to upload error code
 */
export const mapHttpErrorToUploadError = (
  httpStatus: number,
  apiErrorCode?: string,
): UploadErrorCode => {
  // Check API error code first
  if (apiErrorCode === 'EXPIRED_SESSION') {
    return 'EXPIRED_SESSION'
  }

  // Map by HTTP status
  switch (httpStatus) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 409:
      return 'CONFLICT'
    case 413:
      return 'PAYLOAD_TOO_LARGE'
    case 415:
    case 400:
      return 'UNSUPPORTED_TYPE'
    case 429:
      return 'TOO_MANY_REQUESTS'
    case 0:
      return 'NETWORK_ERROR'
    default:
      if (httpStatus >= 500) {
        return 'SERVER_ERROR'
      }
      return 'UNKNOWN'
  }
}

/**
 * Get friendly error message for an error code
 * Optionally include dynamic values (e.g., max size, allowed types)
 */
export const getErrorMessage = (
  errorCode: UploadErrorCode,
  options?: {
    maxSizeMb?: number
    fileType?: string
    allowedTypes?: string[]
    retryAfterSeconds?: number
  },
): string => {
  switch (errorCode) {
    case 'PAYLOAD_TOO_LARGE':
      if (options?.maxSizeMb && options?.fileType) {
        return `Too large. Max ${options.maxSizeMb}MB for ${options.fileType}.`
      }
      return ERROR_MESSAGE_MAP.PAYLOAD_TOO_LARGE
    case 'UNSUPPORTED_TYPE':
      if (options?.allowedTypes?.length) {
        return `Unsupported type. Allowed: ${options.allowedTypes.join(', ')}.`
      }
      return ERROR_MESSAGE_MAP.UNSUPPORTED_TYPE
    case 'TOO_MANY_REQUESTS':
      if (options?.retryAfterSeconds) {
        return `Too many requests. Please wait ${options.retryAfterSeconds} seconds.`
      }
      return ERROR_MESSAGE_MAP.TOO_MANY_REQUESTS
    default:
      return ERROR_MESSAGE_MAP[errorCode]
  }
}

/**
 * Create a unique file ID
 */
export const createFileId = (): string =>
  `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Create an uploader file item from a File object
 */
export const createFileItem = (file: File, category: FileCategory): UploaderFileItem => ({
  id: createFileId(),
  category,
  name: file.name,
  size: file.size,
  type: file.type,
  lastModified: file.lastModified,
  status: 'queued',
  progress: 0,
  expired: false,
})
