/**
 * Story 3.1.10: Upload Manager Hook
 * Story 3.1.24: Expiry & Interrupted Uploads — Auto-Refresh & Resume
 *
 * Manages concurrent file uploads with progress, cancel, retry, and error handling.
 * Uses XHR for upload progress events and AbortController for cancellation.
 *
 * Features:
 * - Concurrent uploads with configurable concurrency limit
 * - Progress tracking per file and overall
 * - Cancel individual or all uploads
 * - Retry failed/expired uploads
 * - Session expiry detection (API error + local TTL check)
 * - Auto-refresh session flow
 * - Resume interrupted uploads with file handle detection
 */

import { useCallback, useRef, useState, useMemo } from 'react'
import { logger } from '@repo/logger'
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
} from '@repo/upload-types'
import { uploadToPresignedUrl, UploadError } from '@repo/upload-client'

/**
 * Default concurrency limit
 */
const DEFAULT_CONCURRENCY = 3

/**
 * Session expiry buffer in milliseconds
 * Check expiry this many ms before actual expiry to avoid edge cases
 */
const SESSION_EXPIRY_BUFFER_MS = 30_000 // 30 seconds

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
  /** Callback when session expires (API error or local TTL check) */
  onSessionExpired?: () => void
  /** Callback when a file needs re-selection (File handle lost) */
  onFileNeedsReselect?: (fileId: string, fileName: string) => void
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
  /** Set session info (call after API returns session data) */
  setSession: (sessionId: string, expiresAt: number) => void
  /** Check if session is expired (local TTL check) */
  isSessionExpired: () => boolean
  /** Update file URLs after session refresh */
  updateFileUrls: (updates: Array<{ fileId: string; uploadUrl: string }>) => void
  /** Check if file handle is available for retry */
  hasFileHandle: (fileId: string) => boolean
  /** Get files that need re-selection (lost file handles) */
  getFilesNeedingReselect: () => UploaderFileItem[]
  /** Mark all expired files as needing refresh */
  markExpiredFiles: () => void
}

/**
 * Upload manager hook
 */
export function useUploadManager(options: UseUploadManagerOptions = {}): UseUploadManagerResult {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    onComplete,
    onError,
    onSessionExpired,
    onFileNeedsReselect,
  } = options

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
          onProgress: progress => {
            const percent = Math.round(progress.percent)
            updateFile(fileId, { progress: percent })
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
   * Returns false if session is expired
   */
  const startUploads = useCallback((): boolean => {
    // Check if session is expired locally before starting
    if (sessionExpiresAt && Date.now() >= sessionExpiresAt - SESSION_EXPIRY_BUFFER_MS) {
      logger.warn('Cannot start uploads - session expired')
      // Mark all queued files as expired
      setFiles(prev =>
        prev.map(f =>
          f.status === 'queued'
            ? {
                ...f,
                status: 'expired' as UploadStatus,
                expired: true,
                errorCode: 'EXPIRED_SESSION' as UploadErrorCode,
                errorMessage: 'Session expired. Please refresh to continue.',
              }
            : f,
        ),
      )
      onSessionExpired?.()
      return false
    }

    logger.info('Starting uploads')
    processQueue()
    return true
  }, [processQueue, sessionExpiresAt, onSessionExpired])

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
   * Returns false if file handle is missing and needs re-selection
   */
  const retry = useCallback(
    (fileId: string): boolean => {
      const file = files.find(f => f.id === fileId)
      if (
        !file ||
        (file.status !== 'failed' && file.status !== 'expired' && file.status !== 'canceled')
      ) {
        return false
      }

      // Check if file handle is available
      if (!fileHandlesRef.current.has(fileId)) {
        logger.warn('File handle not available for retry, needs re-selection', {
          fileId,
          fileName: file.name,
        })
        onFileNeedsReselect?.(fileId, file.name)
        return false
      }

      // Check if session is expired locally before retrying
      if (sessionExpiresAt && Date.now() >= sessionExpiresAt - SESSION_EXPIRY_BUFFER_MS) {
        logger.warn('Cannot retry - session expired', { fileId })
        updateFile(fileId, {
          status: 'expired',
          expired: true,
          errorCode: 'EXPIRED_SESSION',
          errorMessage: 'Session expired. Please refresh to continue.',
        })
        onSessionExpired?.()
        return false
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
      return true
    },
    [files, updateFile, processQueue, sessionExpiresAt, onFileNeedsReselect, onSessionExpired],
  )

  /**
   * Retry all failed uploads
   * Returns list of file IDs that need re-selection (lost file handles)
   */
  const retryAll = useCallback((): string[] => {
    // Check if session is expired locally before retrying
    if (sessionExpiresAt && Date.now() >= sessionExpiresAt - SESSION_EXPIRY_BUFFER_MS) {
      logger.warn('Cannot retry all - session expired')
      onSessionExpired?.()
      return []
    }

    const filesNeedingReselect: string[] = []

    logger.info('Retrying all failed uploads')
    setFiles(prev =>
      prev.map(f => {
        if (f.status === 'failed' || f.status === 'expired' || f.status === 'canceled') {
          // Check if file handle is available
          if (!fileHandlesRef.current.has(f.id)) {
            filesNeedingReselect.push(f.id)
            onFileNeedsReselect?.(f.id, f.name)
            return f // Don't change status
          }
          return {
            ...f,
            status: 'queued' as UploadStatus,
            progress: 0,
            errorCode: undefined,
            errorMessage: undefined,
            expired: false,
          }
        }
        return f
      }),
    )

    if (filesNeedingReselect.length > 0) {
      logger.warn('Some files need re-selection', { count: filesNeedingReselect.length })
    }

    processQueue()
    return filesNeedingReselect
  }, [processQueue, sessionExpiresAt, onSessionExpired, onFileNeedsReselect])

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

  /**
   * Set session info (call after API returns session data)
   */
  const setSession = useCallback((sessionId: string, expiresAt: number) => {
    logger.info('Setting upload session', {
      sessionId,
      expiresAt: new Date(expiresAt).toISOString(),
    })
    setUploadSessionId(sessionId)
    setSessionExpiresAt(expiresAt)
  }, [])

  /**
   * Check if session is expired (local TTL check with buffer)
   */
  const isSessionExpired = useCallback(() => {
    if (!sessionExpiresAt) {
      return false // No expiry set, assume valid
    }
    const now = Date.now()
    const isExpired = now >= sessionExpiresAt - SESSION_EXPIRY_BUFFER_MS
    if (isExpired) {
      logger.warn('Session expired (local TTL check)', {
        expiresAt: new Date(sessionExpiresAt).toISOString(),
        now: new Date(now).toISOString(),
      })
    }
    return isExpired
  }, [sessionExpiresAt])

  /**
   * Update file URLs after session refresh
   * Call this after getting new presigned URLs from the API
   */
  const updateFileUrls = useCallback((updates: Array<{ fileId: string; uploadUrl: string }>) => {
    logger.info('Updating file URLs after session refresh', { count: updates.length })

    // Update URL refs
    updates.forEach(({ fileId, uploadUrl }) => {
      uploadUrlsRef.current.set(fileId, uploadUrl)
    })

    // Reset expired files to queued status
    setFiles(prev =>
      prev.map(f => {
        const update = updates.find(u => u.fileId === f.id)
        if (update && (f.status === 'expired' || f.status === 'failed')) {
          return {
            ...f,
            status: 'queued' as UploadStatus,
            uploadUrl: update.uploadUrl,
            progress: 0,
            errorCode: undefined,
            errorMessage: undefined,
            expired: false,
          }
        }
        return f
      }),
    )
  }, [])

  /**
   * Check if file handle is available for retry
   */
  const hasFileHandle = useCallback((fileId: string) => {
    return fileHandlesRef.current.has(fileId)
  }, [])

  /**
   * Get files that need re-selection (failed/expired but lost file handles)
   */
  const getFilesNeedingReselect = useCallback(() => {
    return files.filter(f => {
      const needsRetry = f.status === 'failed' || f.status === 'expired' || f.status === 'canceled'
      const hasHandle = fileHandlesRef.current.has(f.id)
      return needsRetry && !hasHandle
    })
  }, [files])

  /**
   * Mark all files as expired if session has expired
   * Call this when local TTL check fails or API returns EXPIRED_SESSION
   */
  const markExpiredFiles = useCallback(() => {
    logger.info('Marking all non-complete files as expired')
    setFiles(prev =>
      prev.map(f => {
        if (f.status === 'queued' || f.status === 'uploading') {
          return {
            ...f,
            status: 'expired' as UploadStatus,
            expired: true,
            errorCode: 'EXPIRED_SESSION' as UploadErrorCode,
            errorMessage: 'Session expired. Please refresh to continue.',
          }
        }
        return f
      }),
    )
    onSessionExpired?.()
  }, [onSessionExpired])

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
    setSession,
    isSessionExpired,
    updateFileUrls,
    hasFileHandle,
    getFilesNeedingReselect,
    markExpiredFiles,
  }
}
