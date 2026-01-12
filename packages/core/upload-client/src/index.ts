/**
 * @repo/upload-client
 *
 * Story 3.1.32: Extract Upload Client Package
 *
 * Browser upload utilities with XHR progress tracking and AbortController support.
 *
 * @example Basic file upload
 * ```typescript
 * import { uploadToPresignedUrl, UploadError } from '@repo/upload-client'
 * import { logger } from '@repo/logger'
 *
 * try {
 *   const result = await uploadToPresignedUrl({
 *     url: presignedUrl,
 *     file: myFile,
 *     onProgress: (progress) => {
 *       logger.info(`Upload progress: ${progress.percent}%`)
 *     },
 *   })
 *   logger.info('Upload complete:', result)
 * } catch (error) {
 *   if (error instanceof UploadError) {
 *     logger.error(`Upload failed: ${error.code}`)
 *   }
 * }
 * ```
 *
 * @example Upload manager for concurrent uploads
 * ```typescript
 * import { createUploadManager } from '@repo/upload-client'
 *
 * const manager = createUploadManager({
 *   maxConcurrent: 3,
 *   onFileProgress: (taskId, progress) => {
 *     updateUI(taskId, progress.percent)
 *   },
 *   onFileComplete: (taskId) => {
 *     markComplete(taskId)
 *   },
 *   onAllComplete: () => {
 *     showSuccess()
 *   },
 * })
 *
 * // Add files and start
 * files.forEach(file => {
 *   manager.addFile({ id: file.id, url: file.uploadUrl, file: file.handle })
 * })
 * manager.start()
 *
 * // Cancel if needed
 * manager.cancelAll()
 * ```
 */

// Types
export type {
  UploadProgress,
  UploadOptions,
  UploadResult,
  UploadErrorCode,
  UploadApiError,
  UploadTask,
  UploadTaskStatus,
  UploadManagerOptions,
  UploadManager,
} from './types'

// Schemas (for runtime validation if needed)
export {
  UploadProgressSchema,
  UploadOptionsSchema,
  UploadResultSchema,
  UploadErrorCodeSchema,
  UploadApiErrorSchema,
  UploadTaskSchema,
  UploadTaskStatusSchema,
  UploadManagerOptionsSchema,
  UploadError,
} from './types'

// XHR upload functions
export { uploadFile, uploadToPresignedUrl } from './xhr'

// Upload manager
export { createUploadManager } from './manager'
