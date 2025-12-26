/**
 * @repo/upload-client - Types
 *
 * Story 3.1.32: Extract Upload Client Package
 *
 * Core type definitions for browser file uploads.
 */

import { z } from 'zod'

/**
 * Upload progress data
 */
export const UploadProgressSchema = z.object({
  /** Bytes uploaded */
  loaded: z.number().nonnegative(),
  /** Total bytes to upload */
  total: z.number().nonnegative(),
  /** Progress percentage (0-100) */
  percent: z.number().min(0).max(100),
})

export type UploadProgress = z.infer<typeof UploadProgressSchema>

/**
 * Upload options for XHR upload
 */
export const UploadOptionsSchema = z.object({
  /** URL to upload to */
  url: z.string().url(),
  /** Content type for the file */
  contentType: z.string().optional(),
  /** Additional headers to send */
  headers: z.record(z.string()).optional(),
  /** Whether to include credentials (cookies) */
  withCredentials: z.boolean().optional(),
  /** CSRF token for unsafe methods */
  csrfToken: z.string().optional(),
})

export type UploadOptions = z.infer<typeof UploadOptionsSchema> & {
  /** File to upload */
  file: File
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void
}

/**
 * Upload result on success
 */
export const UploadResultSchema = z.object({
  success: z.literal(true),
  httpStatus: z.number(),
  data: z.unknown().optional(),
  etag: z.string().optional(),
})

export type UploadResult = z.infer<typeof UploadResultSchema>

/**
 * Upload error codes
 */
export const UploadErrorCodeSchema = z.enum([
  'CANCELED',
  'NETWORK_ERROR',
  'TIMEOUT',
  'S3_ERROR',
  'EXPIRED_SESSION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_TYPE',
  'VALIDATION_ERROR',
  'SERVER_ERROR',
  'UNKNOWN',
])

export type UploadErrorCode = z.infer<typeof UploadErrorCodeSchema>

/**
 * API error response schema
 */
export const UploadApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.string().optional(),
})

export type UploadApiError = z.infer<typeof UploadApiErrorSchema>

/**
 * Upload error class with structured data
 */
export class UploadError extends Error {
  readonly httpStatus: number
  readonly code: UploadErrorCode
  readonly details?: Record<string, unknown>
  readonly requestId?: string
  readonly retryAfter?: number

  constructor(
    message: string,
    httpStatus: number,
    code: UploadErrorCode,
    options?: {
      details?: Record<string, unknown>
      requestId?: string
      retryAfter?: number
    },
  ) {
    super(message)
    this.name = 'UploadError'
    this.httpStatus = httpStatus
    this.code = code
    this.details = options?.details
    this.requestId = options?.requestId
    this.retryAfter = options?.retryAfter
  }
}

/**
 * Upload task for manager queue
 */
export const UploadTaskSchema = z.object({
  /** Unique task ID */
  id: z.string(),
  /** Upload URL */
  url: z.string(),
  /** Content type */
  contentType: z.string().optional(),
})

export type UploadTask = z.infer<typeof UploadTaskSchema> & {
  /** File to upload */
  file: File
}

/**
 * Task status in upload manager
 */
export const UploadTaskStatusSchema = z.enum([
  'queued',
  'uploading',
  'success',
  'failed',
  'canceled',
])

export type UploadTaskStatus = z.infer<typeof UploadTaskStatusSchema>

/**
 * Upload manager options
 */
export const UploadManagerOptionsSchema = z.object({
  /** Maximum concurrent uploads */
  maxConcurrent: z.number().int().min(1).default(3),
})

export type UploadManagerOptions = z.infer<typeof UploadManagerOptionsSchema> & {
  /** Callback for individual file progress */
  onFileProgress?: (taskId: string, progress: UploadProgress) => void
  /** Callback when a file completes successfully */
  onFileComplete?: (taskId: string, result: UploadResult) => void
  /** Callback when a file fails */
  onFileError?: (taskId: string, error: UploadError) => void
  /** Callback when all uploads complete */
  onAllComplete?: () => void
}

/**
 * Upload manager interface
 */
export interface UploadManager {
  /** Add a file to the upload queue */
  addFile: (task: UploadTask) => void
  /** Add multiple files to the upload queue */
  addFiles: (tasks: UploadTask[]) => void
  /** Start processing the queue */
  start: () => void
  /** Cancel a specific upload by task ID */
  cancelFile: (taskId: string) => void
  /** Cancel all uploads and clear queue */
  cancelAll: () => void
  /** Get current queue size */
  getQueueSize: () => number
  /** Get count of active uploads */
  getActiveCount: () => number
}
