/**
 * ImageUploadField Component
 *
 * A component for uploading and previewing images with drag-and-drop support.
 * Story wish-2002: Add Item Flow
 */

import { useRef, useCallback, useState } from 'react'
import { z } from 'zod'
import { Button, cn } from '@repo/app-component-library'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'

/**
 * ImageUploadField props schema
 */
const ImageUploadFieldPropsSchema = z.object({
  /** Currently selected file */
  file: z.custom<File | null>().nullable(),
  /** Preview URL for the image */
  preview: z.string().nullable(),
  /** Called when a file is selected */
  onFileChange: z.function().args(z.custom<File | null>().nullable()).returns(z.void()),
  /** Called when the image is removed */
  onRemove: z.function().args().returns(z.void()),
  /** Whether the component is in a loading state */
  isLoading: z.boolean().optional(),
  /** Custom className for the container */
  className: z.string().optional(),
  /** Accepted file types */
  accept: z.string().optional(),
  /** Maximum file size in bytes */
  maxSize: z.number().optional(),
})

export type ImageUploadFieldProps = z.infer<typeof ImageUploadFieldPropsSchema>

/**
 * ImageUploadField Component
 *
 * Provides image upload functionality with:
 * - Click to upload
 * - Drag and drop support
 * - Image preview
 * - Remove button
 */
export function ImageUploadField({
  file,
  preview,
  onFileChange,
  onRemove,
  isLoading = false,
  className,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return false
      }

      // Check file size
      if (file.size > maxSize) {
        const sizeMB = Math.round(maxSize / 1024 / 1024)
        setError(`File size must be less than ${sizeMB}MB`)
        return false
      }

      setError(null)
      return true
    },
    [maxSize],
  )

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (file && validateFile(file)) {
        onFileChange(file)
      }
    },
    [onFileChange, validateFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files?.[0] ?? null
      handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleClick = useCallback(() => {
    if (!isLoading) {
      inputRef.current?.click()
    }
  }, [isLoading])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setError(null)
      onRemove()
    },
    [onRemove],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick],
  )

  return (
    <div className={className}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          !isDragOver && !preview && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          !isDragOver && preview && 'border-muted-foreground/25',
          isLoading && 'cursor-wait',
          !isLoading && !preview && 'cursor-pointer',
          error && 'border-destructive',
        )}
        onClick={!preview ? handleClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={!preview ? handleKeyDown : undefined}
        tabIndex={!preview ? 0 : undefined}
        role={!preview ? 'button' : undefined}
        aria-label={!preview ? 'Upload image' : 'Image preview'}
        data-testid="image-upload-field"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="relative p-4">
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg"
                data-testid="image-preview"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemove}
                aria-label="Remove image"
                data-testid="remove-image-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              {file?.name || 'Image uploaded'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className={cn('rounded-full p-3 mb-3', isDragOver ? 'bg-primary/10' : 'bg-muted')}>
              {isDragOver ? (
                <ImageIcon className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragOver ? 'Drop your image here' : 'Click to upload image'}
            </p>
            <p className="text-xs text-muted-foreground">
              or drag and drop (max {Math.round(maxSize / 1024 / 1024)}MB)
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive mt-2" role="alert" data-testid="upload-error">
          {error}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        aria-hidden="true"
        data-testid="file-input"
      />
    </div>
  )
}

export default ImageUploadField
