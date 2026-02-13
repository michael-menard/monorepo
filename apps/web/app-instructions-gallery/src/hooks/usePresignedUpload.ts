/**
 * usePresignedUpload Hook
 *
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Manages presigned URL upload flow for large files (>10MB):
 * 1. Creates upload session to get presigned S3 URL
 * 2. Uploads file directly to S3 with progress tracking
 * 3. Completes session to create moc_files record
 *
 * Features:
 * - Progress tracking with percentage and upload speed
 * - Cancellation support via AbortController
 * - Session expiry detection with 30-second buffer
 * - Retry capability after failures
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import { logger } from '@repo/logger'
import {
  useCreateUploadSessionMutation,
  useCompleteUploadSessionMutation,
  type CompleteUploadSessionResponse,
} from '@repo/api-client'
import { uploadToPresignedUrl, UploadError } from '@repo/upload-client'
import { z } from 'zod'

/**
 * Session expiry buffer in milliseconds
 * Check expiry this many ms before actual expiry to avoid edge cases
 */
const SESSION_EXPIRY_BUFFER_MS = 30_000 // 30 seconds

/**
 * Upload state enum
 */
export const PresignedUploadStatusSchema = z.enum([
  'idle',
  'creating_session',
  'uploading',
  'completing',
  'success',
  'error',
  'canceled',
  'expired',
])

export type PresignedUploadStatus = z.infer<typeof PresignedUploadStatusSchema>

/**
 * Progress information during upload
 */
export const UploadProgressInfoSchema = z.object({
  /** Bytes uploaded */
  loaded: z.number().nonnegative(),
  /** Total bytes to upload */
  total: z.number().nonnegative(),
  /** Progress percentage (0-100) */
  percent: z.number().min(0).max(100),
  /** Upload speed in bytes per second */
  bytesPerSecond: z.number().nonnegative(),
  /** Formatted upload speed (e.g., "2.5 MB/s") */
  speedDisplay: z.string(),
})

export type UploadProgressInfo = z.infer<typeof UploadProgressInfoSchema>

/**
 * Presigned upload state
 */
export const PresignedUploadStateSchema = z.object({
  status: PresignedUploadStatusSchema,
  progress: UploadProgressInfoSchema.nullable(),
  sessionId: z.string().nullable(),
  expiresAt: z.number().nullable(),
  error: z.string().nullable(),
  errorCode: z.string().nullable(),
  fileRecord: z.unknown().nullable(),
})

export type PresignedUploadState = z.infer<typeof PresignedUploadStateSchema>

/**
 * Hook options
 */
export interface UsePresignedUploadOptions {
  /** Callback when upload succeeds */
  onSuccess?: (fileRecord: CompleteUploadSessionResponse) => void
  /** Callback when upload fails */
  onError?: (error: string, code?: string) => void
  /** Callback when session expires */
  onSessionExpired?: () => void
}

/**
 * Hook result
 */
export interface UsePresignedUploadResult {
  /** Current upload state */
  state: PresignedUploadState
  /** Start presigned upload for a file */
  startUpload: (file: File, mocId: string) => Promise<CompleteUploadSessionResponse | null>
  /** Cancel current upload */
  cancel: () => void
  /** Retry failed upload (requires original file) */
  retry: (file: File, mocId: string) => Promise<CompleteUploadSessionResponse | null>
  /** Reset state to idle */
  reset: () => void
  /** Check if session is expired locally */
  isSessionExpired: () => boolean
  /** Time remaining in session (ms), null if no session */
  timeRemaining: number | null
}

/**
 * Format bytes per second as human-readable string
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

/**
 * Initial state
 */
const INITIAL_STATE: PresignedUploadState = {
  status: 'idle',
  progress: null,
  sessionId: null,
  expiresAt: null,
  error: null,
  errorCode: null,
  fileRecord: null,
}

/**
 * usePresignedUpload hook
 */
export function usePresignedUpload(
  options: UsePresignedUploadOptions = {},
): UsePresignedUploadResult {
  const { onSuccess, onError, onSessionExpired } = options

  // State
  const [state, setState] = useState<PresignedUploadState>(INITIAL_STATE)

  // Refs for abort controller and timing
  const abortControllerRef = useRef<AbortController | null>(null)
  const uploadStartTimeRef = useRef<number | null>(null)
  const lastProgressRef = useRef<{ loaded: number; time: number } | null>(null)

  // RTK Query mutations
  const [createUploadSession] = useCreateUploadSessionMutation()
  const [completeUploadSession] = useCompleteUploadSessionMutation()

  /**
   * Calculate time remaining in session
   */
  const timeRemaining = useMemo(() => {
    if (!state.expiresAt) return null
    const remaining = state.expiresAt - Date.now()
    return remaining > 0 ? remaining : 0
  }, [state.expiresAt])

  /**
   * Check if session is expired locally
   */
  const isSessionExpired = useCallback(() => {
    if (!state.expiresAt) return false
    return Date.now() >= state.expiresAt - SESSION_EXPIRY_BUFFER_MS
  }, [state.expiresAt])

  /**
   * Reset state to idle
   */
  const reset = useCallback(() => {
    // Abort any in-progress upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    uploadStartTimeRef.current = null
    lastProgressRef.current = null
    setState(INITIAL_STATE)
  }, [])

  /**
   * Cancel current upload
   */
  const cancel = useCallback(() => {
    logger.info('Presigned upload canceled by user')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({
      ...prev,
      status: 'canceled',
      error: 'Upload canceled',
    }))
  }, [])

  /**
   * Start presigned upload for a file
   */
  const startUpload = useCallback(
    async (file: File, mocId: string): Promise<CompleteUploadSessionResponse | null> => {
      logger.info('Starting presigned upload', {
        fileName: file.name,
        fileSize: file.size,
        mocId,
      })

      // Reset state
      abortControllerRef.current = new AbortController()
      uploadStartTimeRef.current = Date.now()
      lastProgressRef.current = null

      try {
        // Phase 1: Create upload session
        setState({
          ...INITIAL_STATE,
          status: 'creating_session',
        })

        const sessionResult = await createUploadSession({
          mocId,
          request: {
            filename: file.name,
            fileSize: file.size,
            fileType: 'application/pdf',
          },
        }).unwrap()

        const { sessionId, presignedUrl, expiresAt } = sessionResult
        const expiresAtMs = new Date(expiresAt).getTime()

        logger.info('Upload session created', { sessionId, expiresAt })

        setState(prev => ({
          ...prev,
          status: 'uploading',
          sessionId,
          expiresAt: expiresAtMs,
        }))

        // Check if session already expired (shouldn't happen, but safety check)
        if (Date.now() >= expiresAtMs - SESSION_EXPIRY_BUFFER_MS) {
          throw new UploadError('Session expired before upload started', 0, 'EXPIRED_SESSION')
        }

        // Phase 2: Upload to S3 with progress
        await uploadToPresignedUrl({
          url: presignedUrl,
          file,
          contentType: 'application/pdf',
          signal: abortControllerRef.current.signal,
          onProgress: progress => {
            const now = Date.now()
            const elapsed = now - (uploadStartTimeRef.current || now)

            // Calculate speed
            let bytesPerSecond = 0
            if (elapsed > 0) {
              bytesPerSecond = (progress.loaded / elapsed) * 1000
            }

            // Use instantaneous speed if we have previous progress
            if (lastProgressRef.current) {
              const timeDelta = now - lastProgressRef.current.time
              const bytesDelta = progress.loaded - lastProgressRef.current.loaded
              if (timeDelta > 0) {
                bytesPerSecond = (bytesDelta / timeDelta) * 1000
              }
            }

            lastProgressRef.current = { loaded: progress.loaded, time: now }

            setState(prev => ({
              ...prev,
              progress: {
                loaded: progress.loaded,
                total: progress.total,
                percent: progress.percent,
                bytesPerSecond,
                speedDisplay: formatSpeed(bytesPerSecond),
              },
            }))
          },
        })

        logger.info('S3 upload complete, completing session', { sessionId })

        // Phase 3: Complete upload session
        setState(prev => ({
          ...prev,
          status: 'completing',
          progress: prev.progress
            ? { ...prev.progress, percent: 100 }
            : {
                loaded: file.size,
                total: file.size,
                percent: 100,
                bytesPerSecond: 0,
                speedDisplay: '0 B/s',
              },
        }))

        const fileRecord = await completeUploadSession({
          mocId,
          sessionId,
        }).unwrap()

        logger.info('Upload session completed', {
          fileId: fileRecord.id,
          mocId: fileRecord.mocId,
        })

        setState(prev => ({
          ...prev,
          status: 'success',
          fileRecord,
        }))

        onSuccess?.(fileRecord)
        return fileRecord
      } catch (error) {
        let errorMessage = 'Upload failed'
        let errorCode = 'UNKNOWN'

        if (error instanceof UploadError) {
          errorMessage = error.message
          errorCode = error.code

          if (error.code === 'CANCELED') {
            setState(prev => ({
              ...prev,
              status: 'canceled',
              error: 'Upload canceled',
              errorCode: 'CANCELED',
            }))
            return null
          }

          if (error.code === 'EXPIRED_SESSION') {
            setState(prev => ({
              ...prev,
              status: 'expired',
              error: 'Session expired. Please try again.',
              errorCode: 'EXPIRED_SESSION',
            }))
            onSessionExpired?.()
            onError?.('Session expired. Please try again.', 'EXPIRED_SESSION')
            return null
          }
        } else if (error && typeof error === 'object' && 'data' in error) {
          // RTK Query error
          const rtkError = error as { data?: { error?: string; message?: string } }
          errorMessage = rtkError.data?.message || rtkError.data?.error || 'Upload failed'
          errorCode = rtkError.data?.error || 'API_ERROR'

          if (errorCode === 'EXPIRED_SESSION') {
            setState(prev => ({
              ...prev,
              status: 'expired',
              error: 'Session expired. Please try again.',
              errorCode: 'EXPIRED_SESSION',
            }))
            onSessionExpired?.()
            onError?.('Session expired. Please try again.', 'EXPIRED_SESSION')
            return null
          }
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        logger.error('Presigned upload failed', { error: errorMessage, errorCode })

        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          errorCode,
        }))

        onError?.(errorMessage, errorCode)
        return null
      } finally {
        abortControllerRef.current = null
      }
    },
    [createUploadSession, completeUploadSession, onSuccess, onError, onSessionExpired],
  )

  /**
   * Retry failed upload
   */
  const retry = useCallback(
    async (file: File, mocId: string): Promise<CompleteUploadSessionResponse | null> => {
      logger.info('Retrying presigned upload', { fileName: file.name, mocId })
      return startUpload(file, mocId)
    },
    [startUpload],
  )

  return {
    state,
    startUpload,
    cancel,
    retry,
    reset,
    isSessionExpired,
    timeRemaining,
  }
}
