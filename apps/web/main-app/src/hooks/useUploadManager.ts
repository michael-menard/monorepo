/**
 * Story 3.1.10: Upload Manager Hook
 *
 * Manages concurrent file uploads with progress, cancel, retry, and error handling.
 * Uses XHR for upload progress events and AbortController for cancellation.
 */

import { useCallback, useRef, useState, useMemo } from 'react'
import { logger } from '@repo/logger'
import { uploadToPresignedUrl, UploadError } from '@/services/api/uploadClient'
import {
  type UploaderFileItem,
  type UploadBatchState,
  type FileCategory,
  type UploadStatus,
  type UploadErrorCode,
  calculateBatchState,
  createFileItem,
  mapHttpErrorToUploadError,
  getErrorMessage,
} from '@/types/uploader-upload'

/**
 * Default concurrency limit
 */
const DEFAULT_CONCURRENCY = 3

/**
 * Upload manager options
 */
export interface UseUploadManagerOptions {
  /** Maximum concurrent uploads (default: 3) */
  concurrency?: number
  /** Callback when all uploads complete */
  onComplete?: (state: UploadBatchState) => void
  /** Callback when a file upload fails */
  onError?: (fileId: string, error: UploadErrorCode) => void
  /** Callback when session expires */
  onSessionExpired?: () => void
}

/**
 * File with upload URL from API
 */
export interface FileWithUploadUrl {
  file: File
  category: FileCategory
  fileId: string
  uploadUrl: string
}

/**
 * Upload manager result
 */
export interface UseUploadManagerResult {
  /** Current batch state */
  state: UploadBatchState
  /** Add files to upload queue */
  addFiles: (files: FileWithUploadUrl[]) => void
  /** Start uploading queued files */
  startUploads: () => void
  /** Cancel a specific file upload */
  cancel: (fileId: string) => void
  /** Cancel all uploads */
  cancelAll: () => void
  /** Retry a failed file upload */
  retry: (fileId: string) => void
  /** Retry all failed uploads */
  retryAll: () => void
  /** Clear all files */
  clear: () => void
  /** Remove a specific file */
  remove: (fileId: string) => void
  /** Get file by ID */
  getFile: (fileId: string) => UploaderFileItem | undefined
  /** Whether uploads are in progress */
  isUploading: boolean
  /** Whether all required files are uploaded */
  isComplete: boolean
}

/**
 * Upload manager hook
 */
export function useUploadManager(options: UseUploadManagerOptions = {}): UseUploadManagerResult {
  const { concurrency = DEFAULT_CONCURRENCY, onComplete, onError, onSessionExpired } = options

  // State
  const [files, setFiles] = useState<UploaderFileItem[]>([])
  const [uploadSessionId, setUploadSessionId] = useState<string | undefined>()
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | undefined>()

  // Refs for abort controllers and file handles
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const fileHandlesRef = useRef<Map<string, File>>(new Map())
  const uploadUrlsRef = useRef<Map<string, string>>(new Map())
  const activeUploadsRef = useRef<number>(0)

  // Calculate batch state
  const state = useMemo(
    () => calculateBatchState(files, uploadSessionId, sessionExpiresAt),
    [files, uploadSessionId, sessionExpiresAt],
  )

  /**
   * Update a file's state
   */
  const updateFile = useCallback((fileId: string, updates: Partial<UploaderFileItem>) => {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, ...updates } : f)))
  }, [])

  /**
   * Process upload queue - start next uploads if slots available
   */
  const processQueue = useCallback(() => {
    setFiles(currentFiles => {
      const queuedFiles = currentFiles.filter(f => f.status === 'queued')
      const slotsAvailable = concurrency - activeUploadsRef.current

      if (slotsAvailable <= 0 || queuedFiles.length === 0) {
        return currentFiles
      }

      const filesToStart = queuedFiles.slice(0, slotsAvailable)

      // Start uploads for each file
      filesToStart.forEach(file => {
        const fileHandle = fileHandlesRef.current.get(file.id)
        const uploadUrl = uploadUrlsRef.current.get(file.id)

        if (!fileHandle || !uploadUrl) {
          logger.warn('Missing file handle or upload URL', { fileId: file.id })
          return
        }

        startFileUpload(file.id, fileHandle, uploadUrl)
      })

      // Mark files as uploading
      return currentFiles.map(f =>
        filesToStart.some(sf => sf.id === f.id) ? { ...f, status: 'uploading' as UploadStatus } : f,
      )
    })
  }, [concurrency])

  /**
   * Start upload for a single file
   */
  const startFileUpload = useCallback(
    async (fileId: string, file: File, uploadUrl: string) => {
      const abortController = new AbortController()
      abortControllersRef.current.set(fileId, abortController)
      activeUploadsRef.current++

      logger.info('Starting file upload', { fileId, fileName: file.name, size: file.size })

      try {
        await uploadToPresignedUrl({
          url: uploadUrl,
          file,
          contentType: file.type || 'application/octet-stream',
          signal: abortController.signal,
          onProgress: (loaded, total) => {
            const progress = Math.round((loaded / total) * 100)
            updateFile(fileId, { progress })
          },
        })

        // Success
        logger.info('File upload complete', { fileId, fileName: file.name })
        updateFile(fileId, { status: 'success', progress: 100 })
      } catch (error) {
        if (error instanceof UploadError) {
          if (error.code === 'CANCELED') {
            logger.info('File upload canceled', { fileId })
            updateFile(fileId, { status: 'canceled' })
          } else {
            const errorCode = mapHttpErrorToUploadError(error.httpStatus, error.code)
            const errorMessage = getErrorMessage(errorCode)

            logger.warn('File upload failed', {
              fileId,
              errorCode,
              httpStatus: error.httpStatus,
            })

            updateFile(fileId, {
              status: errorCode === 'EXPIRED_SESSION' ? 'expired' : 'failed',
              errorCode,
              errorMessage,
              expired: errorCode === 'EXPIRED_SESSION',
            })

            if (errorCode === 'EXPIRED_SESSION') {
              onSessionExpired?.()
            }

            onError?.(fileId, errorCode)
          }
        } else {
          logger.error('Unexpected upload error', { fileId, error })
          updateFile(fileId, {
            status: 'failed',
            errorCode: 'UNKNOWN',
            errorMessage: getErrorMessage('UNKNOWN'),
          })
          onError?.(fileId, 'UNKNOWN')
        }
      } finally {
        abortControllersRef.current.delete(fileId)
        activeUploadsRef.current--

        // Process next in queue
        processQueue()

        // Check if all complete
        setFiles(currentFiles => {
          const newState = calculateBatchState(currentFiles, uploadSessionId, sessionExpiresAt)
          if (newState.isComplete && activeUploadsRef.current === 0) {
            onComplete?.(newState)
          }
          return currentFiles
        })
      }
    },
    [
      updateFile,
      processQueue,
      onComplete,
      onError,
      onSessionExpired,
      uploadSessionId,
      sessionExpiresAt,
    ],
  )

  /**
   * Add files to upload queue
   */
  const addFiles = useCallback((newFiles: FileWithUploadUrl[]) => {
    const fileItems: UploaderFileItem[] = newFiles.map(({ file, category, fileId, uploadUrl }) => {
      // Store file handle and upload URL
      fileHandlesRef.current.set(fileId, file)
      uploadUrlsRef.current.set(fileId, uploadUrl)

      return {
        ...createFileItem(file, category),
        id: fileId, // Use server-assigned ID
        serverFileId: fileId,
        uploadUrl,
      }
    })

    setFiles(prev => [...prev, ...fileItems])
    logger.info('Files added to upload queue', { count: fileItems.length })
  }, [])

  /**
   * Start uploading queued files
   */
  const startUploads = useCallback(() => {
    logger.info('Starting uploads')
    processQueue()
  }, [processQueue])

  /**
   * Cancel a specific file upload
   */
  const cancel = useCallback(
    (fileId: string) => {
      const controller = abortControllersRef.current.get(fileId)
      if (controller) {
        controller.abort()
        logger.info('Canceling upload', { fileId })
      } else {
        // File not uploading, just mark as canceled
        updateFile(fileId, { status: 'canceled' })
      }
    },
    [updateFile],
  )

  /**
   * Cancel all uploads
   */
  const cancelAll = useCallback(() => {
    logger.info('Canceling all uploads')
    abortControllersRef.current.forEach(controller => controller.abort())
    setFiles(prev =>
      prev.map(f =>
        f.status === 'uploading' || f.status === 'queued'
          ? { ...f, status: 'canceled' as UploadStatus }
          : f,
      ),
    )
  }, [])

  /**
   * Retry a failed file upload
   */
  const retry = useCallback(
    (fileId: string) => {
      const file = files.find(f => f.id === fileId)
      if (!file || (file.status !== 'failed' && file.status !== 'expired')) {
        return
      }

      logger.info('Retrying upload', { fileId })
      updateFile(fileId, {
        status: 'queued',
        progress: 0,
        errorCode: undefined,
        errorMessage: undefined,
        expired: false,
      })

      processQueue()
    },
    [files, updateFile, processQueue],
  )

  /**
   * Retry all failed uploads
   */
  const retryAll = useCallback(() => {
    logger.info('Retrying all failed uploads')
    setFiles(prev =>
      prev.map(f =>
        f.status === 'failed' || f.status === 'expired'
          ? {
              ...f,
              status: 'queued' as UploadStatus,
              progress: 0,
              errorCode: undefined,
              errorMessage: undefined,
              expired: false,
            }
          : f,
      ),
    )
    processQueue()
  }, [processQueue])

  /**
   * Clear all files
   */
  const clear = useCallback(() => {
    logger.info('Clearing all files')
    cancelAll()
    setFiles([])
    fileHandlesRef.current.clear()
    uploadUrlsRef.current.clear()
    setUploadSessionId(undefined)
    setSessionExpiresAt(undefined)
  }, [cancelAll])

  /**
   * Remove a specific file
   */
  const remove = useCallback(
    (fileId: string) => {
      cancel(fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
      fileHandlesRef.current.delete(fileId)
      uploadUrlsRef.current.delete(fileId)
      logger.info('File removed', { fileId })
    },
    [cancel],
  )

  /**
   * Get file by ID
   */
  const getFile = useCallback((fileId: string) => files.find(f => f.id === fileId), [files])

  return {
    state,
    addFiles,
    startUploads,
    cancel,
    cancelAll,
    retry,
    retryAll,
    clear,
    remove,
    getFile,
    isUploading: state.isUploading,
    isComplete: state.isComplete,
  }
}
