/**
 * UploadModal Component
 *
 * Modal dialog for uploading new inspiration images.
 * Supports drag-and-drop, file selection, and URL import.
 *
 * INSP-004: Upload Page
 * INSP-008-A: Basic Upload Modal
 */

import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  cn,
} from '@repo/app-component-library'
import { Upload, X, Image, Link2, Loader2 } from 'lucide-react'

/**
 * Upload modal props schema
 */
const UploadModalPropsSchema = z.object({
  /** Whether the modal is open */
  isOpen: z.boolean(),
  /** Maximum file size in bytes */
  maxFileSize: z.number().int().positive().optional(),
  /** Allowed MIME types */
  allowedTypes: z.array(z.string()).optional(),
})

export type UploadModalProps = z.infer<typeof UploadModalPropsSchema> & {
  /** Called when modal should close */
  onClose: () => void
  /** Called when upload is submitted */
  onUpload: (data: {
    file?: File
    url?: string
    title: string
    description?: string
    sourceUrl?: string
    tags: string[]
  }) => Promise<void>
}

type UploadMode = 'file' | 'url'

/**
 * UploadModal Component
 *
 * Provides a modal interface for uploading inspirations:
 * - Drag-and-drop file upload
 * - File picker selection
 * - URL import from external sources
 * - Metadata input (title, description, tags)
 */
export function UploadModal({
  isOpen,
  maxFileSize = 10 * 1024 * 1024,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  onClose,
  onUpload,
}: UploadModalProps) {
  const [mode, setMode] = useState<UploadMode>('file')
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setMode('file')
    setSelectedFile(null)
    setPreviewUrl(null)
    setImageUrl('')
    setTitle('')
    setDescription('')
    setSourceUrl('')
    setTagInput('')
    setTags([])
    setError(null)
    setIsUploading(false)
  }, [])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`
    }
    return null
  }

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSelectedFile(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Auto-fill title from filename
    if (!title) {
      const name = file.name.replace(/\.[^.]+$/, '') // Remove extension
      setTitle(name.replace(/[-_]/g, ' '))
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)

    const files = event.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 20) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (mode === 'file' && !selectedFile) {
      setError('Please select an image file')
      return
    }

    if (mode === 'url' && !imageUrl.trim()) {
      setError('Please enter an image URL')
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      await onUpload({
        file: mode === 'file' ? (selectedFile ?? undefined) : undefined,
        url: mode === 'url' ? imageUrl : undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        tags,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const hasContent = mode === 'file' ? !!selectedFile : !!imageUrl.trim()

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Inspiration</DialogTitle>
          <DialogDescription>
            Upload an image or import from a URL to add to your inspiration gallery.
          </DialogDescription>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex border-b">
          <button
            className={cn(
              'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
              mode === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode('file')}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Upload File
          </button>
          <button
            className={cn(
              'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
              mode === 'url'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode('url')}
          >
            <Link2 className="h-4 w-4 inline mr-2" />
            Import URL
          </button>
        </div>

        <div className="space-y-4 py-4">
          {/* File upload zone */}
          {mode === 'file' && (
            <div
              role="region"
              aria-label="File upload drop zone"
              className={cn(
                'relative border-2 border-dashed rounded-lg p-6 transition-colors',
                isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                selectedFile && 'border-solid border-primary/50',
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop an image, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WebP, GIF up to {Math.round(maxFileSize / 1024 / 1024)}MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={allowedTypes.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Select image file"
              />
            </div>
          )}

          {/* URL input */}
          {mode === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Give your inspiration a name"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this inspiration..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              type="url"
              placeholder="Where did you find this? (optional)"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                maxLength={50}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!hasContent || !title.trim() || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add Inspiration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UploadModal
