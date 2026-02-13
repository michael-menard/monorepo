/**
 * useUpload Hook
 *
 * Generalized upload hook for image upload with compression and HEIC conversion.
 * This hook is framework-agnostic and can be used with any presigned URL provider.
 *
 * Story REPA-004: Migrate Image Processing to Shared Package
 * Story WISH-2022: Client-side Image Compression
 * Story WISH-2045: HEIC/HEIF Image Format Support
 * Story WISH-2046: Client-side Image Compression Quality Presets
 */

import { useState, useCallback, useRef } from 'react'
import { uploadToPresignedUrl, UploadError, type UploadProgress } from '../client'
import { compressImage } from '../image/compression'
import type { CompressionResult } from '../image/compression/__types__'
import { getPresetByName } from '../image/presets'
import type { CompressionPresetName } from '../image/presets/__types__'
import { isHEIC, convertHEICToJPEG } from '../image/heic'
import type { HEICConversionResult } from '../image/heic/__types__'
import type { PresignedUrlResponse, UploadState, ImageUploadOptions } from './__types__'

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
 * Restricted to JPEG, PNG, WebP for security
 * HEIC/HEIF types included (will be converted to JPEG before upload)
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export interface UseUploadResult {
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
   */
  compressionProgress: number

  /**
   * Result of the compression operation
   */
  compressionResult: CompressionResult | null

  /**
   * Conversion progress (0-100)
   */
  conversionProgress: number

  /**
   * Result of the HEIC conversion operation
   */
  conversionResult: HEICConversionResult | null

  /**
   * The preset name that was used for the last compression
   */
  presetUsed: CompressionPresetName | null

  /**
   * Error message if upload failed
   */
  error: string | null

  /**
   * Final URL after successful upload
   */
  imageUrl: string | null

  /**
   * Key for the uploaded file
   */
  imageKey: string | null

  /**
   * Start the upload process
   */
  upload: (file: File, options?: ImageUploadOptions) => Promise<string | null>

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

export interface UseUploadOptions {
  /**
   * Function to get a presigned URL for uploading
   * @param file - The file to upload
   * @returns Promise resolving to presigned URL response
   */
  getPresignedUrl: (file: File) => Promise<PresignedUrlResponse>

  /**
   * Optional function to construct the final URL from the key
   * If not provided, uses the S3 bucket from environment
   * @param key - The S3 key returned from presigned URL
   * @returns The final public URL for the uploaded file
   */
  buildFinalUrl?: (key: string) => string
}

export function useUpload(options: UseUploadOptions): UseUploadResult {
  const { getPresignedUrl, buildFinalUrl } = options

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

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size < MIN_FILE_SIZE) {
      return 'File cannot be empty (0 bytes)'
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }

    // Check MIME type against whitelist
    // Also check for HEIC files by extension (some apps report as octet-stream)
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
    async (file: File, uploadOptions: ImageUploadOptions = {}): Promise<string | null> => {
      const { skipCompression = false, preset = 'balanced', compressedFile } = uploadOptions

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

        // Convert HEIC to JPEG if needed
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
          }

          // Check if cancelled during conversion
          if (abortControllerRef.current?.signal.aborted) {
            setState('idle')
            return null
          }
        }

        let fileToUpload = fileToProcess

        // Use pre-compressed file if available (background compression)
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
          // Compress image before upload (unless skipped)
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

        // Get presigned URL
        setState('preparing')
        const presignResult = await getPresignedUrl(fileToUpload)

        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          setState('idle')
          return null
        }

        // Upload to S3
        setState('uploading')
        await uploadToPresignedUrl({
          url: presignResult.presignedUrl,
          file: fileToUpload,
          onProgress: (progressData: UploadProgress) => {
            setProgress(progressData.percent)
          },
          signal: abortControllerRef.current?.signal,
        })

        // Build the final URL
        const finalUrl = buildFinalUrl
          ? buildFinalUrl(presignResult.key)
          : `https://${import.meta.env.VITE_S3_BUCKET || 'lego-moc-bucket'}.s3.amazonaws.com/${presignResult.key}`

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
    [getPresignedUrl, buildFinalUrl, validateFile],
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
