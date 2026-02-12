/**
 * InstructionsUpload Component
 * Story INST-1104: Upload Instructions (Direct ≤10MB)
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Features:
 * - AC5: File picker opens on button click
 * - AC6: Non-PDF files show error toast
 * - AC7: >50MB files show error toast (INST-1105: increased from 10MB)
 * - AC8: File input has proper accept attribute
 * - AC9-12: Selected files list with metadata
 * - AC13: Remove files from queue
 * - AC14: Sequential upload (one file at a time)
 * - AC15-16: Progress indicator during upload
 * - AC18: Cancel button clears queue
 * - AC19-20: Success/error toasts
 *
 * INST-1105 Additions:
 * - AC1-3: File size routing (<=10MB direct, >10MB presigned)
 * - AC4: Files >50MB rejected
 * - AC11-14: Progress bar with speed display, cancel/retry
 */

import { useState, useRef, useCallback, useMemo } from 'react'
import { Upload, X, FileText, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import {
  Button,
  Card,
  Progress,
  showSuccessToast,
  showErrorToast,
} from '@repo/app-component-library'
import { useUploadInstructionFileMutation } from '@repo/api-client'
import { usePresignedUpload } from '../../hooks/usePresignedUpload'
import { PresignedUploadProgress } from '../PresignedUploadProgress'
import { SessionExpiryWarning } from '../SessionExpiryWarning'
import type {
  InstructionsUploadProps,
  FileValidationResult,
  FileItem,
  UploadFlow,
} from './__types__'
import {
  ALLOWED_PDF_MIME_TYPES,
  ALLOWED_PDF_EXTENSIONS,
  MAX_DIRECT_UPLOAD_SIZE,
  MAX_PRESIGNED_UPLOAD_SIZE,
  MIN_FILE_SIZE,
} from './__types__'

/**
 * Determine upload flow based on file size (INST-1105 AC1-3)
 */
function determineUploadFlow(fileSize: number): UploadFlow {
  return fileSize > MAX_DIRECT_UPLOAD_SIZE ? 'presigned' : 'direct'
}

/**
 * Validate PDF file before upload (AC6-7, AC72-73)
 * INST-1105: Updated to support files up to 50MB
 */
function validatePdfFile(file: File): FileValidationResult & { uploadFlow?: UploadFlow } {
  // Check file extension (AC58)
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_PDF_EXTENSIONS.some(ext => fileName.endsWith(ext))

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF files are allowed.',
    }
  }

  // Check MIME type (AC56)
  if (!ALLOWED_PDF_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF files are allowed.',
    }
  }

  // Check file size - max 50MB (INST-1105 AC4)
  const maxSizeMB = MAX_PRESIGNED_UPLOAD_SIZE / 1024 / 1024
  if (file.size > MAX_PRESIGNED_UPLOAD_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxSizeMB}MB.`,
    }
  }

  // Check minimum size (AC57)
  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is too small or corrupted.',
    }
  }

  return { valid: true, uploadFlow: determineUploadFlow(file.size) }
}

/**
 * Format file size for display (AC10)
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function InstructionsUpload({ mocId, onSuccess }: InstructionsUploadProps) {
  const [fileQueue, setFileQueue] = useState<FileItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Track the current presigned file being uploaded
  const [presignedFile, setPresignedFile] = useState<FileItem | null>(null)

  const [uploadInstructionFile] = useUploadInstructionFileMutation()

  // INST-1105: Presigned upload hook
  const presignedUpload = usePresignedUpload({
    onSuccess: () => {
      showSuccessToast('Instructions uploaded successfully')
      // Mark the presigned file as success
      if (presignedFile) {
        setFileQueue(prev =>
          prev.map(f =>
            f.id === presignedFile.id ? { ...f, status: 'success' as const, progress: 100 } : f,
          ),
        )
        setPresignedFile(null)
      }
      onSuccess?.()
    },
    onError: error => {
      showErrorToast(`Upload failed: ${error}`)
      // Mark the presigned file as error
      if (presignedFile) {
        setFileQueue(prev =>
          prev.map(f =>
            f.id === presignedFile.id ? { ...f, status: 'error' as const, error } : f,
          ),
        )
      }
    },
    onSessionExpired: () => {
      showErrorToast('Upload session expired. Please try again.')
      if (presignedFile) {
        setFileQueue(prev =>
          prev.map(f =>
            f.id === presignedFile.id
              ? { ...f, status: 'expired' as const, error: 'Session expired' }
              : f,
          ),
        )
      }
    },
  })

  // Calculate upload progress (AC15-16)
  const uploadProgress = useMemo(() => {
    if (fileQueue.length === 0) return null

    const completed = fileQueue.filter(f => f.status === 'success').length
    const total = fileQueue.length
    const currentFile = fileQueue.find(f => f.status === 'uploading')

    return {
      completed,
      total,
      currentFile: currentFile?.file.name,
      percentage: Math.round((completed / total) * 100),
    }
  }, [fileQueue])

  /**
   * Handle file selection from input (AC5, AC8)
   * INST-1105: Now determines upload flow based on file size
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles: FileItem[] = []

    // Validate each file (AC6-7)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validatePdfFile(file)

      if (!validation.valid) {
        showErrorToast(validation.error || 'Invalid file')
        continue
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random()}-${i}`,
        file,
        status: 'pending',
        progress: 0,
        uploadFlow: validation.uploadFlow,
      })
    }

    if (newFiles.length > 0) {
      setFileQueue(prev => [...prev, ...newFiles])
    }

    // Reset input to allow selecting same file again
    e.target.value = ''
  }, [])

  /**
   * Remove file from queue (AC13)
   */
  const handleRemoveFile = useCallback((fileId: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== fileId))
  }, [])

  /**
   * Clear all files from queue (AC18)
   */
  const handleClearQueue = useCallback(() => {
    setFileQueue([])
  }, [])

  /**
   * Upload files sequentially (AC14)
   * INST-1105: Routes to presigned upload for files >10MB
   */
  const handleUpload = useCallback(async () => {
    if (fileQueue.length === 0) return

    setIsUploading(true)

    const pendingFiles = fileQueue.filter(f => f.status === 'pending')

    for (const fileItem of pendingFiles) {
      // Mark as uploading
      setFileQueue(prev =>
        prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'uploading' as const, progress: 0 } : f,
        ),
      )

      try {
        // INST-1105: Route based on file size
        if (fileItem.uploadFlow === 'presigned') {
          // Large file: Use presigned URL flow
          setPresignedFile(fileItem)
          const result = await presignedUpload.startUpload(fileItem.file, mocId)

          if (!result) {
            // Upload was canceled or failed (error already handled by hook)
            continue
          }

          // Success is handled by the hook callback
        } else {
          // Small file: Use direct upload flow
          await uploadInstructionFile({
            mocId,
            file: fileItem.file,
          }).unwrap()

          // Mark as success (AC19)
          setFileQueue(prev =>
            prev.map(f =>
              f.id === fileItem.id ? { ...f, status: 'success' as const, progress: 100 } : f,
            ),
          )

          showSuccessToast(`${fileItem.file.name} uploaded successfully`)
        }
      } catch (error: any) {
        // Mark as error (AC20)
        const errorMessage =
          error?.data?.message || error?.message || 'Failed to upload file. Please try again.'

        setFileQueue(prev =>
          prev.map(f =>
            f.id === fileItem.id ? { ...f, status: 'error' as const, error: errorMessage } : f,
          ),
        )

        showErrorToast(`Failed to upload ${fileItem.file.name}: ${errorMessage}`)
      }
    }

    setIsUploading(false)
    setPresignedFile(null)

    // Call success callback if at least one file succeeded
    const hasSuccess = fileQueue.some(f => f.status === 'success')
    if (hasSuccess && onSuccess) {
      onSuccess()
    }
  }, [fileQueue, mocId, uploadInstructionFile, presignedUpload, onSuccess])

  /**
   * Handle presigned upload cancel (INST-1105 AC14)
   */
  const handlePresignedCancel = useCallback(() => {
    presignedUpload.cancel()
    if (presignedFile) {
      setFileQueue(prev =>
        prev.map(f =>
          f.id === presignedFile.id
            ? { ...f, status: 'canceled' as const, error: 'Upload canceled' }
            : f,
        ),
      )
    }
    setPresignedFile(null)
    setIsUploading(false)
  }, [presignedUpload, presignedFile])

  /**
   * Handle presigned upload retry (INST-1105 AC27)
   */
  const handlePresignedRetry = useCallback(
    async (fileItem: FileItem) => {
      setPresignedFile(fileItem)
      setFileQueue(prev =>
        prev.map(f =>
          f.id === fileItem.id
            ? { ...f, status: 'uploading' as const, progress: 0, error: undefined }
            : f,
        ),
      )
      setIsUploading(true)

      const result = await presignedUpload.retry(fileItem.file, mocId)

      if (!result) {
        setIsUploading(false)
      }
    },
    [presignedUpload, mocId],
  )

  /**
   * Handle session refresh (INST-1105 AC23)
   */
  const handleSessionRefresh = useCallback(() => {
    // Reset and allow retry
    presignedUpload.reset()
    showSuccessToast('Session refreshed. You can retry the upload.')
  }, [presignedUpload])

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const hasFiles = fileQueue.length > 0
  const hasPendingFiles = fileQueue.some(f => f.status === 'pending')

  return (
    <div className="space-y-4">
      {/* Session Expiry Warning (INST-1105 AC8, AC21, AC23) */}
      {presignedUpload.timeRemaining !== null && presignedUpload.timeRemaining < 5 * 60 * 1000 && (
        <SessionExpiryWarning
          timeRemainingMs={presignedUpload.timeRemaining}
          onRefresh={handleSessionRefresh}
          isRefreshing={false}
        />
      )}

      {/* Upload Button (AC5) */}
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isUploading}
        className="w-full sm:w-auto"
      >
        <Upload className="w-4 h-4 mr-2" />
        Select PDF Files
      </Button>

      {/* Hidden file input (AC8) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
        aria-label="Upload instruction PDF files"
      />

      {/* File Queue (AC9-12) */}
      {hasFiles ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Files to Upload ({fileQueue.length})</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearQueue}
              disabled={isUploading}
            >
              Clear All
            </Button>
          </div>

          {/* File List */}
          <div className="space-y-2 mb-4">
            {fileQueue.map(fileItem => {
              // INST-1105: Use PresignedUploadProgress for presigned files being uploaded
              if (
                fileItem.uploadFlow === 'presigned' &&
                presignedFile?.id === fileItem.id &&
                (presignedUpload.state.status === 'uploading' ||
                  presignedUpload.state.status === 'creating_session' ||
                  presignedUpload.state.status === 'completing')
              ) {
                return (
                  <PresignedUploadProgress
                    key={fileItem.id}
                    file={fileItem.file}
                    status={presignedUpload.state.status}
                    progress={presignedUpload.state.progress}
                    error={presignedUpload.state.error}
                    onCancel={handlePresignedCancel}
                    onRetry={() => handlePresignedRetry(fileItem)}
                    onRemove={() => handleRemoveFile(fileItem.id)}
                  />
                )
              }

              // Standard file item display
              return (
                <div
                  key={fileItem.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {fileItem.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                    )}
                    {(fileItem.status === 'error' || fileItem.status === 'expired') && (
                      <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                    )}
                    {fileItem.status === 'canceled' && (
                      <XCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                    )}
                    {fileItem.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
                    )}
                    {fileItem.status === 'pending' && (
                      <FileText className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                      {/* INST-1105: Show badge for presigned uploads */}
                      {fileItem.uploadFlow === 'presigned' && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Large file</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {fileItem.error ? (
                      <p className="text-xs text-destructive mt-1" role="alert">
                        {fileItem.error}
                      </p>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex gap-1">
                    {/* Retry button for failed/canceled/expired files (INST-1105 AC27) */}
                    {(fileItem.status === 'error' ||
                      fileItem.status === 'canceled' ||
                      fileItem.status === 'expired') &&
                      fileItem.uploadFlow === 'presigned' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePresignedRetry(fileItem)}
                          aria-label="Retry upload"
                          className="h-8 w-8 p-0"
                        >
                          <Loader2 className="w-4 h-4" />
                        </Button>
                      )}

                    {/* Remove Button (AC13) */}
                    {(!isUploading || fileItem.status !== 'uploading') &&
                      fileItem.status !== 'success' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(fileItem.id)}
                          aria-label="Remove file"
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upload Progress (AC15-16) - for direct uploads */}
          {isUploading && uploadProgress && !presignedFile ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Uploading {uploadProgress.completed + 1} of {uploadProgress.total}...
                </p>
                <p className="text-sm font-medium">{uploadProgress.percentage}%</p>
              </div>
              {uploadProgress.currentFile ? (
                <p className="text-xs text-muted-foreground mb-2">
                  Current: {uploadProgress.currentFile}
                </p>
              ) : null}
              <Progress value={uploadProgress.percentage} />
            </div>
          ) : null}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={isUploading || !hasPendingFiles}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${fileQueue.filter(f => f.status === 'pending').length} File(s)`
            )}
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
