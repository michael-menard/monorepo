import { useState, useCallback, useRef } from 'react'
import type { UploadFile, UploadConfig, ValidationError, UploadProgress } from '../types/index.js'
import { validateFiles } from '../utils/validation.js'
import { createUploadFile } from '../utils/file-utils.js'
import { uploadFiles } from '../utils/upload-utils.js'

export interface UseUploadOptions {
  config?: UploadConfig
  onUploadStart?: (files: File[]) => void
  onUploadProgress?: (progress: UploadProgress, file: UploadFile) => void
  onUploadComplete?: (files: UploadFile[]) => void
  onUploadError?: (error: ValidationError | Error, file?: UploadFile) => void
  onFilesChange?: (files: UploadFile[]) => void
}

export interface UseUploadReturn {
  files: UploadFile[]
  isUploading: boolean
  progress: number
  errors: ValidationError[]
  addFiles: (newFiles: File[]) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  startUpload: () => Promise<void>
  retryUpload: (fileId: string) => Promise<void>
  cancelUpload: () => void
}

const defaultConfig: UploadConfig = {
  maxFiles: 10,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFileTypes: ['*/*'],
  multiple: true,
  autoUpload: false,
}

export const useUpload = (options: UseUploadOptions = {}): UseUploadReturn => {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const abortController = useRef<AbortController | null>(null)

  const config = { ...defaultConfig, ...options.config }

  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Validate files
      const validationErrors = validateFiles(newFiles, config)
      if (validationErrors.length > 0) {
        setErrors(prev => [...prev, ...validationErrors])
        validationErrors.forEach(error => {
          options.onUploadError?.(error)
        })
        return
      }

      // Clear previous errors
      setErrors([])

      // Create upload files
      const uploadFiles = newFiles.map(createUploadFile)

      setFiles(prev => {
        const updated = [...prev, ...uploadFiles]
        options.onFilesChange?.(updated)
        return updated
      })

      // Auto upload if enabled
      if (config.autoUpload) {
        startUpload()
      }
    },
    [config, options],
  )

  const removeFile = useCallback(
    (fileId: string) => {
      setFiles(prev => {
        const updated = prev.filter(file => file.id !== fileId)
        options.onFilesChange?.(updated)
        return updated
      })
    },
    [options],
  )

  const clearFiles = useCallback(() => {
    setFiles([])
    setErrors([])
    options.onFilesChange?.([])
  }, [options])

  const startUpload = useCallback(async () => {
    if (files.length === 0 || isUploading) return

    setIsUploading(true)
    abortController.current = new AbortController()

    try {
      options.onUploadStart?.(files.map(f => f.file))

      const filesToUpload = files.filter(f => f.status === 'pending')

      const results = await uploadFiles(
        filesToUpload.map(f => f.file),
        config,
        (progress, file) => {
          // Update file progress
          setFiles(prev =>
            prev.map(f =>
              f.file === file
                ? { ...f, progress: progress.percentage, status: 'uploading' as const }
                : f,
            ),
          )

          // Find the upload file for the callback
          const uploadFile = files.find(f => f.file === file)
          if (uploadFile) {
            options.onUploadProgress?.(progress, uploadFile)
          }
        },
      )

      // Update files with results
      setFiles(prev =>
        prev.map(file => {
          const result = results.find(r => r.file === file.file)
          return result || file
        }),
      )

      options.onUploadComplete?.(results)
    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('Upload failed')
      options.onUploadError?.(uploadError)

      // Mark all uploading files as error
      setFiles(prev =>
        prev.map(file =>
          file.status === 'uploading'
            ? { ...file, status: 'error' as const, error: uploadError.message }
            : file,
        ),
      )
    } finally {
      setIsUploading(false)
      abortController.current = null
    }
  }, [files, isUploading, config, options])

  const retryUpload = useCallback(
    async (fileId: string) => {
      const file = files.find(f => f.id === fileId)
      if (!file || file.status !== 'error') return

      // Reset file status
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'pending' as const, error: undefined, progress: 0 } : f,
        ),
      )

      // Start upload for this file
      await startUpload()
    },
    [files, startUpload],
  )

  const cancelUpload = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    setIsUploading(false)

    // Reset uploading files to pending
    setFiles(prev =>
      prev.map(file =>
        file.status === 'uploading' ? { ...file, status: 'pending' as const, progress: 0 } : file,
      ),
    )
  }, [])

  // Calculate overall progress
  const progress =
    files.length > 0
      ? Math.round(files.reduce((sum, file) => sum + file.progress, 0) / files.length)
      : 0

  return {
    files,
    isUploading,
    progress,
    errors,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    retryUpload,
    cancelUpload,
  }
}
