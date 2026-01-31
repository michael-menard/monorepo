/**
 * useS3Upload Hook
 *
 * Handles image upload to S3 via presigned URLs for wishlist items.
 * Uses @repo/upload-client for the actual upload with progress tracking.
 *
 * Story wish-2002: Add Item Flow
 * WISH-2013: Security hardening - file type and size validation
 */

import { useState, useCallback, useRef } from 'react'
import { uploadToPresignedUrl, UploadError, type UploadProgress } from '@repo/upload-client'
import { useGetWishlistImagePresignUrlMutation } from '@repo/api-client/rtk/wishlist-gallery-api'

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Minimum file size in bytes (1 byte - rejects empty files)
 */
export const MIN_FILE_SIZE = 1

/**
 * Allowed MIME types for upload
 *
 * WISH-2013: Security hardening - removed GIF, restricted to JPEG, PNG, WebP
 * GIF removed due to potential for embedded scripts and complexity in scanning
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type UploadState = 'idle' | 'preparing' | 'uploading' | 'complete' | 'error'

export interface UseS3UploadResult {
  /**
   * Current upload state
   */
  state: UploadState

  /**
   * Upload progress (0-100)
   */
  progress: number

  /**
   * Error message if upload failed
   */
  error: string | null

  /**
   * Final S3 URL after successful upload
   */
  imageUrl: string | null

  /**
   * S3 key for the uploaded file
   */
  imageKey: string | null

  /**
   * Start the upload process
   */
  upload: (file: File) => Promise<string | null>

  /**
   * Cancel an in-progress upload
   */
  cancel: () => void

  /**
   * Reset state to idle
   */
  reset: () => void

  /**
   * Validate a file before upload (returns error message or null)
   */
  validateFile: (file: File) => string | null
}

export function useS3Upload(): UseS3UploadResult {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageKey, setImageKey] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const [getPresignUrl] = useGetWishlistImagePresignUrlMutation()

  const validateFile = useCallback((file: File): string | null => {
    // WISH-2013 AC4: Check file size (client-side validation)
    if (file.size < MIN_FILE_SIZE) {
      return 'File cannot be empty (0 bytes)'
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }

    // WISH-2013 AC2: Check MIME type against whitelist (client-side validation)
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return 'Only JPEG, PNG, and WebP images are allowed'
    }

    return null
  }, [])

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      // Validate file first
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setState('error')
        return null
      }

      // Reset state
      setError(null)
      setProgress(0)
      setImageUrl(null)
      setImageKey(null)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        // Step 1: Get presigned URL
        setState('preparing')
        const presignResult = await getPresignUrl({
          fileName: file.name,
          mimeType: file.type,
        }).unwrap()

        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          setState('idle')
          return null
        }

        // Step 2: Upload to S3
        setState('uploading')
        await uploadToPresignedUrl({
          url: presignResult.presignedUrl,
          file,
          onProgress: (progressData: UploadProgress) => {
            setProgress(progressData.percent)
          },
          signal: abortControllerRef.current?.signal,
        })

        // Step 3: Build the final URL
        // The URL is constructed from the key
        const bucket = import.meta.env.VITE_S3_BUCKET || 'lego-moc-bucket'
        const finalUrl = `https://${bucket}.s3.amazonaws.com/${presignResult.key}`

        setState('complete')
        setImageUrl(finalUrl)
        setImageKey(presignResult.key)

        return finalUrl
      } catch (err: unknown) {
        // Handle abort
        if (err instanceof Error && err.name === 'AbortError') {
          setState('idle')
          return null
        }

        // Handle upload errors
        if (err instanceof UploadError) {
          setError(err.message)
        } else if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Upload failed. Please try again.')
        }

        setState('error')
        return null
      }
    },
    [getPresignUrl, validateFile],
  )

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState('idle')
    setProgress(0)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setImageUrl(null)
    setImageKey(null)
  }, [cancel])

  return {
    state,
    progress,
    error,
    imageUrl,
    imageKey,
    upload,
    cancel,
    reset,
    validateFile,
  }
}
