/**
 * CreateAlbumModal Component
 *
 * Modal dialog for creating a new album.
 * Supports title, description, and optional parent album.
 *
 * INSP-009: Album CRUD
 */

import { useState, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import { Loader2, FolderPlus } from 'lucide-react'

/**
 * Parent album option
 */
const ParentAlbumOptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  depth: z.number().int().optional(),
})

export type ParentAlbumOption = z.infer<typeof ParentAlbumOptionSchema>

/**
 * CreateAlbumModal props
 */
export interface CreateAlbumModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when album is created */
  onCreate: (data: { title: string; description?: string; parentAlbumId?: string }) => Promise<void>
  /** Available parent albums (for nesting) */
  parentAlbums?: ParentAlbumOption[]
  /** Pre-selected parent album ID */
  defaultParentId?: string
}

/**
 * CreateAlbumModal Component
 *
 * Modal for creating a new album:
 * - Title (required)
 * - Description (optional)
 * - Parent album selection (optional, for nesting)
 */
export function CreateAlbumModal({
  isOpen,
  onClose,
  onCreate,
  parentAlbums = [],
  defaultParentId,
}: CreateAlbumModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [parentAlbumId, setParentAlbumId] = useState<string | undefined>(defaultParentId)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setParentAlbumId(defaultParentId)
    setError(null)
    setIsCreating(false)
  }, [defaultParentId])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Album title is required')
      return
    }

    setError(null)
    setIsCreating(true)

    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        parentAlbumId: parentAlbumId || undefined,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="create-album-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Create Album
          </DialogTitle>
          <DialogDescription>Create a new album to organize your inspirations.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="album-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="album-title"
              placeholder="My Album"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              data-testid="create-album-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="album-description">Description</Label>
            <Textarea
              id="album-description"
              placeholder="What's this album for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              data-testid="create-album-description"
            />
          </div>

          {/* Parent Album (if there are albums to nest under) */}
          {parentAlbums.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="album-parent">Parent Album (Optional)</Label>
              <Select
                value={parentAlbumId || 'none'}
                onValueChange={v => setParentAlbumId(v === 'none' ? undefined : v)}
              >
                <SelectTrigger id="album-parent" data-testid="create-album-parent">
                  <SelectValue placeholder="No parent (root level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root level)</SelectItem>
                  {parentAlbums.map(album => (
                    <SelectItem key={album.id} value={album.id}>
                      {'  '.repeat(album.depth ?? 0)}
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nest this album inside another album to create a hierarchy.
              </p>
            </div>
          )}

          {/* Error message */}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isCreating}
            data-testid="create-album-submit"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Album
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateAlbumModal
