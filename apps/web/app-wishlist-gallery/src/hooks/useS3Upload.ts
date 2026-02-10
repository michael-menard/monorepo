/**
 * useS3Upload Hook
 *
 * Handles image upload to S3 via presigned URLs for wishlist items.
 * Uses @repo/upload-client for the actual upload with progress tracking.
 *
 * Story wish-2002: Add Item Flow
 * WISH-2013: Security hardening - file type and size validation
 * WISH-2022: Client-side image compression before upload
 * WISH-2046: Client-side image compression quality presets
 * WISH-2045: HEIC/HEIF Image Format Support
 * WISH-2049: Background image compression during form input
 */

import { useState, useCallback, useRef } from 'react'
import { uploadToPresignedUrl, UploadError, type UploadProgress } from '@repo/upload-client'
import { useGetWishlistImagePresignUrlMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import {
  compressImage,
  getPresetByName,
  isHEIC,
  convertHEICToJPEG,
  type CompressionResult,
  type CompressionPresetName,
  type HEICConversionResult,
} from '../utils/imageCompression'

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
 * WISH-2045: Added HEIC/HEIF types (will be converted to JPEG before upload)
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

/**
 * Upload state including compression and conversion phases
 * WISH-2022: Added 'compressing' state
 * WISH-2045: Added 'converting' state for HEIC to JPEG conversion
 */
export type UploadState =
  | 'idle'
  | 'converting'
  | 'compressing'
  | 'preparing'
  | 'uploading'
  | 'complete'
  | 'error'

/**
 * Options for the upload function
 * WISH-2022: Added skipCompression option
 * WISH-2046: Added preset option for quality presets
 * WISH-2049: Added compressedFile option for background compression
 */
export interface UploadOptions {
  /**
   * Compression preset to use. Defaults to 'balanced'.
   * WISH-2046: Allows selecting from predefined quality presets.
   */
  preset?: CompressionPresetName

  /**
   * Skip compression entirely.
   * When true, the preset option is ignored.
   */
  skipCompression?: boolean

  /**
   * Pre-compressed file to use instead of compressing during upload.
   * WISH-2049: When provided, skips compression and uses this file directly.
   * This allows background compression to happen during form input.
   */
  compressedFile?: File
}

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
   * Compression progress (0-100)
   * WISH-2022: Separate compression progress tracking
   */
  compressionProgress: number

  /**
   * Result of the compression operation
   * WISH-2022: Provides compression details for toast notification
   */
  compressionResult: CompressionResult | null

  /**
   * Conversion progress (0-100)
   * WISH-2045: Separate HEIC conversion progress tracking
   */
  conversionProgress: number

  /**
   * Result of the HEIC conversion operation
   * WISH-2045: Provides conversion details for toast notification
   */
  conversionResult: HEICConversionResult | null

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
   * WISH-2022: Added options parameter for compression control
   * WISH-2046: Added preset option for quality presets
   */
  upload: (file: File, options?: UploadOptions) => Promise<string | null>

  /**
   * WISH-2046: The preset name that was used for the last compression
   * Null if compression was skipped
   */
  presetUsed: CompressionPresetName | null

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
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [conversionResult, setConversionResult] = useState<HEICConversionResult | null>(null)
  const [presetUsed, setPresetUsed] = useState<CompressionPresetName | null>(null)
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
    // WISH-2045: Also check for HEIC files by extension (some apps report as octet-stream)
    const isAllowedMimeType = ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number],
    )
    const isHEICFile = isHEIC(file)

    if (!isAllowedMimeType && !isHEICFile) {
      return 'Only JPEG, PNG, WebP, and HEIC images are allowed'
    }

    return null
  }, [])

  const upload = useCallback(
    async (file: File, options: UploadOptions = {}): Promise<string | null> => {
      const { skipCompression = false, preset = 'balanced', compressedFile } = options

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
      setCompressionProgress(0)
      setCompressionResult(null)
      setConversionProgress(0)
      setConversionResult(null)
      setPresetUsed(null)
      setImageUrl(null)
      setImageKey(null)

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        let fileToProcess = file

        // WISH-2045: Convert HEIC to JPEG if needed
        // Conversion happens before compression, even if compression is skipped
        if (isHEIC(file)) {
          setState('converting')
          const convResult = await convertHEICToJPEG(file, {
            quality: 0.9, // High quality for conversion (compression happens next)
            onProgress: setConversionProgress,
          })
          setConversionResult(convResult)

          if (convResult.converted) {
            fileToProcess = convResult.file
          } else {
            // Conversion failed - we could either:
            // 1. Continue with original HEIC (may fail on upload if server doesn't accept HEIC)
            // 2. Return an error immediately
            // Per story AC: "fall back to uploading original HEIC file (with warning toast)"
            // The consumer should check conversionResult.error to show appropriate toast
          }

          // Check if cancelled during conversion
          if (abortControllerRef.current?.signal.aborted) {
            setState('idle')
            return null
          }
        }

        let fileToUpload = fileToProcess

        // WISH-2049: Use pre-compressed file if available (background compression)
        if (compressedFile) {
          fileToUpload = compressedFile
          setCompressionResult({
            compressed: true,
            file: compressedFile,
            originalSize: fileToProcess.size,
            finalSize: compressedFile.size,
            ratio: compressedFile.size / fileToProcess.size,
          })
          setPresetUsed(preset)
        } else if (!skipCompression) {
          // WISH-2022/2046: Compress image before upload (unless skipped)
          // Uses the selected preset settings for compression
          setState('compressing')
          const presetConfig = getPresetByName(preset)
          const result = await compressImage(fileToProcess, {
            config: presetConfig.settings,
            onProgress: setCompressionProgress,
          })
          setCompressionResult(result)
          setPresetUsed(preset)
          fileToUpload = result.file

          // Check if cancelled during compression
          if (abortControllerRef.current?.signal.aborted) {
            setState('idle')
            return null
          }
        }

        // Step 1: Get presigned URL
        setState('preparing')
        const presignResult = await getPresignUrl({
          fileName: fileToUpload.name,
          mimeType: fileToUpload.type,
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
          file: fileToUpload,
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
    setCompressionProgress(0)
    setConversionProgress(0)
    setError(null)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setImageUrl(null)
    setImageKey(null)
    setCompressionResult(null)
    setConversionResult(null)
    setPresetUsed(null)
  }, [cancel])

  return {
    state,
    progress,
    compressionProgress,
    compressionResult,
    conversionProgress,
    conversionResult,
    presetUsed,
    error,
    imageUrl,
    imageKey,
    upload,
    cancel,
    reset,
    validateFile,
  }
}
