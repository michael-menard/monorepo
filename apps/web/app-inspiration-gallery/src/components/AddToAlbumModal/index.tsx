/**
 * AddToAlbumModal Component
 *
 * Modal dialog for adding inspirations to albums.
 * Shows searchable album list with selection.
 *
 * INSP-005: Collection Management
 */

import { useState, useMemo } from 'react'
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
  Checkbox,
  cn,
} from '@repo/app-component-library'
import { Search, Folder, FolderPlus, Loader2 } from 'lucide-react'

/**
 * Album option for the selector
 */
const AlbumOptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  coverImageUrl: z.string().nullable().optional(),
  itemCount: z.number().int().optional(),
  isSelected: z.boolean().optional(),
})

export type AlbumOption = z.infer<typeof AlbumOptionSchema>

/**
 * AddToAlbumModal props
 */
export interface AddToAlbumModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when albums are confirmed */
  onConfirm: (albumIds: string[]) => Promise<void>
  /** Called when create new album is clicked */
  onCreateAlbum?: () => void
  /** Available albums to choose from */
  albums: AlbumOption[]
  /** IDs of albums the inspiration is already in */
  currentAlbumIds?: string[]
  /** Whether loading albums */
  isLoading?: boolean
  /** Title for the modal (e.g., "Add to Album" or "1 item" / "3 items") */
  itemLabel?: string
}

/**
 * AddToAlbumModal Component
 *
 * Modal for selecting albums to add inspirations to:
 * - Searchable album list
 * - Checkbox selection
 * - Shows current album membership
 * - Option to create new album
 */
export function AddToAlbumModal({
  isOpen,
  onClose,
  onConfirm,
  onCreateAlbum,
  albums,
  currentAlbumIds = [],
  isLoading = false,
  itemLabel = '1 item',
}: AddToAlbumModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentAlbumIds))
  const [isSaving, setIsSaving] = useState(false)

  // Filter albums by search query
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums
    const query = searchQuery.toLowerCase()
    return albums.filter(album => album.title.toLowerCase().includes(query))
  }, [albums, searchQuery])

  const handleToggle = (albumId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(albumId)) {
        next.delete(albumId)
      } else {
        next.add(albumId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      await onConfirm(Array.from(selectedIds))
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedIds(new Set(currentAlbumIds))
    onClose()
  }

  // Calculate changes
  const addedCount = Array.from(selectedIds).filter(id => !currentAlbumIds.includes(id)).length
  const removedCount = currentAlbumIds.filter(id => !selectedIds.has(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="add-to-album-modal">
        <DialogHeader>
          <DialogTitle>Add to Album</DialogTitle>
          <DialogDescription>Select albums for {itemLabel}.</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="add-to-album-search"
          />
        </div>

        {/* Album List */}
        <div className="h-64 border rounded-md overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              {searchQuery ? (
                <>
                  <p className="text-sm text-muted-foreground">No albums match "{searchQuery}"</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <>
                  <Folder className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No albums yet</p>
                  {onCreateAlbum ? (
                    <Button variant="link" size="sm" onClick={onCreateAlbum} className="mt-2">
                      Create your first album
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredAlbums.map(album => {
                const isChecked = selectedIds.has(album.id)
                const wasOriginallySelected = currentAlbumIds.includes(album.id)

                return (
                  <label
                    key={album.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md cursor-pointer',
                      'hover:bg-muted/50 transition-colors',
                      isChecked && 'bg-muted/30',
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(album.id)}
                      data-testid={`album-option-${album.id}`}
                    />

                    {/* Album thumbnail */}
                    <div className="flex-shrink-0">
                      {album.coverImageUrl ? (
                        <img
                          src={album.coverImageUrl}
                          alt=""
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Folder className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Album info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {album.itemCount ?? 0} item{(album.itemCount ?? 0) !== 1 ? 's' : ''}
                        {wasOriginallySelected && !isChecked ? (
                          <span className="text-amber-600 ml-2">(will remove)</span>
                        ) : null}
                        {!wasOriginallySelected && isChecked ? (
                          <span className="text-green-600 ml-2">(will add)</span>
                        ) : null}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Album Button */}
        {onCreateAlbum ? (
          <Button
            variant="outline"
            onClick={onCreateAlbum}
            className="w-full"
            data-testid="create-album-from-modal"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Create New Album
          </Button>
        ) : null}

        {/* Summary of changes */}
        {hasChanges ? (
          <p className="text-sm text-muted-foreground text-center">
            {addedCount > 0 ? `Adding to ${addedCount} album${addedCount !== 1 ? 's' : ''}` : ''}
            {addedCount > 0 && removedCount > 0 ? ', ' : ''}
            {removedCount > 0
              ? `removing from ${removedCount} album${removedCount !== 1 ? 's' : ''}`
              : ''}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || isSaving}
            data-testid="add-to-album-confirm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddToAlbumModal
