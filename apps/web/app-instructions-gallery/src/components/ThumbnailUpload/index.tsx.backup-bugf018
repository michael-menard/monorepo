/**
 * ThumbnailUpload Component
 * Story INST-1103: Upload Thumbnail for MOC Instructions
 *
 * Features:
 * - AC1-2: Renders on create/detail pages
 * - AC3-4: Drag-and-drop + file picker
 * - AC5: Drag-over visual feedback
 * - AC6-7: Client-side validation (type, size)
 * - AC8: Proper file input accept attribute
 * - AC9-11: Preview with metadata, remove button
 * - AC12-13: Upload with loading state
 * - AC14-17: Success/error handling, thumbnail replacement
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import {
  Button,
  Card,
  LoadingSpinner,
  showSuccessToast,
  showErrorToast,
} from '@repo/app-component-library'
import { useUploadThumbnailMutation } from '@repo/api-client'
import type { ThumbnailUploadProps, FileValidationResult } from './__types__'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MIN_FILE_SIZE } from './__types__'

/**
 * Validate file before upload (AC6-7)
 */
function validateFile(file: File): FileValidationResult {
  // Check file type (AC6)
  if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    }
  }

  // Check file size (AC7)
  const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxSizeMB}MB.`,
    }
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is too small or corrupted.',
    }
  }

  return { valid: true }
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

export function ThumbnailUpload({ mocId, existingThumbnailUrl, onSuccess }: ThumbnailUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadThumbnail, { isLoading }] = useUploadThumbnailMutation()

  /**
   * Handle file selection from input (AC4)
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = validateFile(file)

    if (!validation.valid) {
      showErrorToast(validation.error || 'Invalid file')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))

    // Reset input
    e.target.value = ''
  }, [])

  /**
   * Handle drag and drop (AC3, AC5)
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = validateFile(file)

    if (!validation.valid) {
      showErrorToast(validation.error || 'Invalid file')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  /**
   * Handle drag over (AC5)
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  /**
   * Handle drag leave (AC5)
   */
  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  /**
   * Remove selected file (AC11)
   */
  const handleRemove = useCallback(() => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [previewUrl])

  /**
   * Upload thumbnail (AC12-13, AC14-17)
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    try {
      const result = await uploadThumbnail({
        mocId,
        file: selectedFile,
      }).unwrap()

      // AC14: Success toast
      showSuccessToast('Thumbnail uploaded successfully')

      // AC17: Call onSuccess callback
      if (onSuccess) {
        onSuccess(result.thumbnailUrl)
      }

      // Clear selection after successful upload
      handleRemove()
    } catch (error: any) {
      // AC15-16: Error handling
      const errorMessage =
        error?.data?.message || error?.message || 'Failed to upload thumbnail. Please try again.'
      showErrorToast(errorMessage)
    }
  }, [selectedFile, mocId, uploadThumbnail, onSuccess, handleRemove])

  /**
   * Trigger file input click
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="space-y-4">
      {/* Existing Thumbnail (if present) */}
      {existingThumbnailUrl && !selectedFile ? (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <img
              src={existingThumbnailUrl}
              alt="Current thumbnail"
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Current Thumbnail</p>
              <p className="text-xs text-muted-foreground">Upload a new image to replace</p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Upload Zone (AC3-5, AC8) */}
      <div
        role="button"
        tabIndex={0}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isLoading ? handleClick : undefined}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop a thumbnail image here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP • Max 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={isLoading}
          className="hidden"
          aria-label="Upload thumbnail image"
        />
      </div>

      {/* Preview (AC9-11) */}
      {selectedFile && previewUrl ? (
        <Card className="p-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Thumbnail preview"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={isLoading}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 p-0"
                aria-label="Remove thumbnail"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {formatFileSize(selectedFile.size)}
              </p>
              <Button onClick={handleUpload} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  'Upload Thumbnail'
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
