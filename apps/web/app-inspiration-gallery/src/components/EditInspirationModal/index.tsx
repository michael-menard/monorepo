/**
 * EditInspirationModal Component
 *
 * Modal dialog for editing inspiration metadata.
 * Supports title, description, source URL, and tags.
 *
 * INSP-016: Metadata Edit Modal
 */

import { useState, useEffect, useCallback } from 'react'
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
} from '@repo/app-component-library'
import { X, Loader2, Save } from 'lucide-react'

/**
 * Inspiration data for editing
 */
const EditInspirationDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
})

export type EditInspirationData = z.infer<typeof EditInspirationDataSchema>

/**
 * EditInspirationModal props
 */
export interface EditInspirationModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when save is confirmed */
  onSave: (data: {
    id: string
    title: string
    description?: string
    sourceUrl?: string
    tags: string[]
  }) => Promise<void>
  /** The inspiration data to edit */
  item: EditInspirationData | null
}

/**
 * EditInspirationModal Component
 *
 * Modal for editing inspiration metadata:
 * - Title (required)
 * - Description (optional)
 * - Source URL (optional)
 * - Tags management
 */
export function EditInspirationModal({ isOpen, onClose, onSave, item }: EditInspirationModalProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setDescription(item.description ?? '')
      setSourceUrl(item.sourceUrl ?? '')
      setTags(item.tags ?? [])
      setError(null)
    }
  }, [item])

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setSourceUrl('')
    setTagInput('')
    setTags([])
    setError(null)
    setIsSaving(false)
  }, [])

  const handleClose = () => {
    resetForm()
    onClose()
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
    if (!item) return

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError(null)
    setIsSaving(true)

    try {
      await onSave({
        id: item.id,
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        tags,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (!item) {
    return null
  }

  const displayImage = item.thumbnailUrl || item.imageUrl
  const hasChanges =
    title !== item.title ||
    description !== (item.description ?? '') ||
    sourceUrl !== (item.sourceUrl ?? '') ||
    JSON.stringify(tags) !== JSON.stringify(item.tags ?? [])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="edit-inspiration-modal">
        <DialogHeader>
          <DialogTitle>Edit Inspiration</DialogTitle>
          <DialogDescription>Update the details for this inspiration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Preview */}
          <div className="flex justify-center">
            <img
              src={displayImage}
              alt={item.title}
              className="max-h-32 rounded-lg object-contain"
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              placeholder="Give your inspiration a name"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              data-testid="edit-inspiration-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Add notes about this inspiration..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              data-testid="edit-inspiration-description"
            />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-sourceUrl">Source URL</Label>
            <Input
              id="edit-sourceUrl"
              type="url"
              placeholder="Where did you find this?"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              data-testid="edit-inspiration-source"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="edit-tags"
                placeholder="Add a tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                maxLength={50}
                data-testid="edit-inspiration-tag-input"
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
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isSaving || !hasChanges}
            data-testid="edit-inspiration-save"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditInspirationModal
