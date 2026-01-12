/**
 * @repo/upload-client - Upload Manager
 *
 * Story 3.1.32: Extract Upload Client Package
 *
 * Framework-agnostic upload manager for concurrent file uploads.
 * Can be used directly or wrapped by React hooks.
 */

import type { UploadTask, UploadManagerOptions, UploadManager, UploadProgress } from './types'
import { UploadError } from './types'
import { uploadToPresignedUrl } from './xhr'

/**
 * Create an upload manager for concurrent file uploads
 *
 * @param options - Manager configuration
 * @returns Upload manager instance
 *
 * @example
 * ```typescript
 * import { logger } from '@repo/logger'
 *
 * const manager = createUploadManager({
 *   maxConcurrent: 3,
 *   onFileProgress: (taskId, progress) => {
 *     logger.info(`${taskId}: ${progress.percent}%`)
 *   },
 *   onFileComplete: (taskId) => {
 *     logger.info(`${taskId} complete`)
 *   },
 *   onAllComplete: () => {
 *     logger.info('All uploads done')
 *   },
 * })
 *
 * manager.addFile({ id: 'file1', url: presignedUrl, file })
 * manager.start()
 * ```
 */
export function createUploadManager(options: UploadManagerOptions): UploadManager {
  const { maxConcurrent = 3, onFileProgress, onFileComplete, onFileError, onAllComplete } = options

  // Queue of pending uploads
  const queue: UploadTask[] = []

  // Active upload abort controllers by task ID
  const active = new Map<string, AbortController>()

  // Count of in-progress uploads
  let inProgress = 0

  // Whether the manager is started
  let isStarted = false

  /**
   * Process the upload queue
   */
  const processQueue = (): void => {
    // Don't process if not started
    if (!isStarted) {
      return
    }

    // Start uploads until we hit concurrency limit
    while (queue.length > 0 && inProgress < maxConcurrent) {
      const task = queue.shift()
      if (task) {
        startUpload(task)
      }
    }

    // Check if all complete
    if (queue.length === 0 && inProgress === 0 && isStarted) {
      onAllComplete?.()
    }
  }

  /**
   * Start a single file upload
   */
  const startUpload = async (task: UploadTask): Promise<void> => {
    const { id, url, file, contentType } = task

    const abortController = new AbortController()
    active.set(id, abortController)
    inProgress++

    try {
      const result = await uploadToPresignedUrl({
        url,
        file,
        contentType: contentType ?? file.type,
        signal: abortController.signal,
        onProgress: (progress: UploadProgress) => {
          onFileProgress?.(id, progress)
        },
      })

      onFileComplete?.(id, result)
    } catch (error) {
      if (error instanceof UploadError) {
        onFileError?.(id, error)
      } else {
        // Wrap unexpected errors
        onFileError?.(
          id,
          new UploadError(error instanceof Error ? error.message : 'Unknown error', 0, 'UNKNOWN'),
        )
      }
    } finally {
      active.delete(id)
      inProgress--
      processQueue()
    }
  }

  return {
    addFile: (task: UploadTask): void => {
      queue.push(task)
      // Auto-process if already started
      if (isStarted) {
        processQueue()
      }
    },

    addFiles: (tasks: UploadTask[]): void => {
      queue.push(...tasks)
      // Auto-process if already started
      if (isStarted) {
        processQueue()
      }
    },

    start: (): void => {
      isStarted = true
      processQueue()
    },

    cancelFile: (taskId: string): void => {
      // Remove from queue if pending
      const queueIndex = queue.findIndex(t => t.id === taskId)
      if (queueIndex !== -1) {
        queue.splice(queueIndex, 1)
      }

      // Abort if active
      const controller = active.get(taskId)
      if (controller) {
        controller.abort()
      }
    },

    cancelAll: (): void => {
      // Clear queue
      queue.length = 0

      // Abort all active uploads
      active.forEach(controller => controller.abort())
      active.clear()

      isStarted = false
    },

    getQueueSize: (): number => queue.length,

    getActiveCount: (): number => inProgress,
  }
}
