/**
 * WishlistForm Component
 *
 * Reusable form for adding/editing wishlist items.
 * Supports image upload, tag input, and keyboard shortcuts.
 *
 * Story wish-2002: Add Item Flow
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { z } from 'zod'
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
  cn,
} from '@repo/app-component-library'
import type { CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import { TagInput } from '../TagInput'
import { useS3Upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../../hooks/useS3Upload'

/**
 * Form validation schema
 */
const WishlistFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal')
    .optional()
    .or(z.literal('')),
  pieceCount: z.number().int().nonnegative().optional(),
  priority: z.number().int().min(0).max(5).default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

/**
 * Store options for the select dropdown
 */
const STORE_OPTIONS = [
  { value: 'LEGO', label: 'LEGO' },
  { value: 'Barweer', label: 'Barweer' },
  { value: 'Cata', label: 'Cata' },
  { value: 'BrickLink', label: 'BrickLink' },
  { value: 'Other', label: 'Other' },
]

/**
 * Priority options for the select dropdown
 */
const PRIORITY_OPTIONS = [
  { value: '0', label: '0 - None' },
  { value: '1', label: '1 - Low' },
  { value: '2', label: '2 - Medium-Low' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - High' },
  { value: '5', label: '5 - Critical' },
]

export interface WishlistFormProps {
  /**
   * Initial values for editing
   */
  initialValues?: Partial<CreateWishlistItem>

  /**
   * Called when form is submitted successfully
   */
  onSubmit: (data: CreateWishlistItem) => Promise<void>

  /**
   * Whether the form is in a loading/submitting state
   */
  isSubmitting?: boolean

  /**
   * Additional class names
   */
  className?: string
}

type FormErrors = Partial<Record<string, string>>

export function WishlistForm({
  initialValues,
  onSubmit,
  isSubmitting = false,
  className,
}: WishlistFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState(initialValues?.title || '')
  const [store, setStore] = useState(initialValues?.store || 'LEGO')
  const [setNumber, setSetNumber] = useState(initialValues?.setNumber || '')
  const [sourceUrl, setSourceUrl] = useState(initialValues?.sourceUrl || '')
  const [price, setPrice] = useState(initialValues?.price || '')
  const [pieceCount, setPieceCount] = useState<number | undefined>(
    initialValues?.pieceCount ?? undefined,
  )
  const [priority, setPriority] = useState(initialValues?.priority ?? 0)
  const [tags, setTags] = useState<string[]>(initialValues?.tags || [])
  const [notes, setNotes] = useState(initialValues?.notes || '')
  const [errors, setErrors] = useState<FormErrors>({})

  const [isDragOver, setIsDragOver] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null)

  const {
    state: uploadState,
    progress: uploadProgress,
    error: uploadError,
    imageUrl: uploadedImageUrl,
    upload,
    reset: resetUpload,
    validateFile,
  } = useS3Upload()

  // Handle keyboard shortcut (Cmd/Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const validateForm = useCallback(() => {
    const formData = {
      title,
      store,
      setNumber: setNumber || undefined,
      sourceUrl: sourceUrl || undefined,
      imageUrl: uploadedImageUrl || undefined,
      price: price || undefined,
      pieceCount,
      priority,
      tags,
      notes: notes || undefined,
    }

    const result = WishlistFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const error of result.error.errors) {
        const field = error.path[0]
        if (field && typeof field === 'string') {
          fieldErrors[field] = error.message
        }
      }
      setErrors(fieldErrors)
      return null
    }

    setErrors({})
    return formData as CreateWishlistItem
  }, [
    title,
    store,
    setNumber,
    sourceUrl,
    uploadedImageUrl,
    price,
    pieceCount,
    priority,
    tags,
    notes,
  ])

  const handleFormSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const data = validateForm()
      if (data) {
        await onSubmit(data)
      }
    },
    [validateForm, onSubmit],
  )

  // File handling
  const handleFileSelect = useCallback(
    async (file: File) => {
      const error = validateFile(file)
      if (error) {
        setErrors(prev => ({ ...prev, imageUrl: error }))
        return
      }

      // Show preview immediately
      const reader = new FileReader()
      reader.onload = e => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to S3
      await upload(file)
    },
    [upload, validateFile],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        void handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  // Drag and drop handlers
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

      const file = e.dataTransfer.files[0]
      if (file) {
        void handleFileSelect(file)
      }
    },
    [handleFileSelect],
  )

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            void handleFileSelect(file)
            break
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleFileSelect])

  const handleRemoveImage = useCallback(() => {
    setImagePreview(null)
    resetUpload()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [resetUpload])

  const handleChangeImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const isUploading = uploadState === 'preparing' || uploadState === 'uploading'
  const isDisabled = isSubmitting || isUploading

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className={cn('space-y-6', className)}>
      {/* Title & Store (required) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="e.g., LEGO Star Wars Millennium Falcon"
            disabled={isDisabled}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          {Boolean(errors.title) && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="store">Store *</Label>
          <Select value={store} onValueChange={setStore} disabled={isDisabled}>
            <SelectTrigger id="store">
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {STORE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {Boolean(errors.store) && <p className="text-sm text-destructive">{errors.store}</p>}
        </div>
      </div>

      {/* Set Number & Source URL */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="setNumber">Set Number</Label>
          <Input
            id="setNumber"
            placeholder="e.g., 75192"
            disabled={isDisabled}
            value={setNumber}
            onChange={e => setSetNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            type="url"
            placeholder="https://..."
            disabled={isDisabled}
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
          />
          {Boolean(errors.sourceUrl) && (
            <p className="text-sm text-destructive">{errors.sourceUrl}</p>
          )}
        </div>
      </div>

      {/* Price, Piece Count & Priority */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              className="pl-7"
              disabled={isDisabled}
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>
          {Boolean(errors.price) && <p className="text-sm text-destructive">{errors.price}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pieceCount">Piece Count</Label>
          <Input
            id="pieceCount"
            type="number"
            min={0}
            placeholder="e.g., 7541"
            disabled={isDisabled}
            value={pieceCount ?? ''}
            onChange={e => setPieceCount(e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={String(priority)}
            onValueChange={value => setPriority(Number(value))}
            disabled={isDisabled}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Image</Label>
        <div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isDisabled}
          />

          {imagePreview ? (
            /* Image preview with actions */
            <div className="relative rounded-lg border overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain bg-muted"
              />

              {/* Upload progress overlay */}
              {Boolean(isUploading) && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {uploadState === 'preparing'
                      ? 'Preparing upload...'
                      : `Uploading... ${uploadProgress}%`}
                  </span>
                  {uploadState === 'uploading' && (
                    <Progress value={uploadProgress} className="w-48" />
                  )}
                </div>
              )}

              {/* Actions */}
              {Boolean(!isUploading) && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleChangeImage}
                    disabled={isDisabled}
                  >
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isDisabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Drop zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
              role="button"
              tabIndex={0}
              aria-label="Upload image"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
            >
              {isDragOver ? (
                <ImageIcon className="h-10 w-10 text-primary" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop image here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, GIF, WebP up to {MAX_FILE_SIZE / 1024 / 1024}MB
                </p>
                <p className="text-xs text-muted-foreground">You can also paste from clipboard</p>
              </div>
            </div>
          )}
        </div>
        {Boolean(uploadError || errors.imageUrl) && (
          <p className="text-sm text-destructive">{uploadError || errors.imageUrl}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <TagInput
          id="tags"
          value={tags}
          onChange={setTags}
          placeholder="Add tags..."
          disabled={isDisabled}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          className="min-h-24 resize-y"
          disabled={isDisabled}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Add any additional information about this item.
        </p>
      </div>

      {/* Submit button */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">
            {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
              ? 'Cmd'
              : 'Ctrl'}
            +Enter
          </kbd>{' '}
          to submit
        </p>
        <Button type="submit" disabled={isDisabled}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add to Wishlist'
          )}
        </Button>
      </div>
    </form>
  )
}
