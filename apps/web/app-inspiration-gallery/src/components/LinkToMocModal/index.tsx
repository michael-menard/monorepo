/**
 * LinkToMocModal Component
 *
 * Modal dialog for linking inspirations/albums to MOCs.
 * Shows searchable MOC list with selection.
 *
 * INSP-006: Link to MOC (Basic)
 * INSP-014: MOC Linking Full
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
import { Search, Box, Loader2 } from 'lucide-react'

/**
 * MOC option for the selector
 */
const MocOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().nullable().optional(),
  status: z.enum(['draft', 'in-progress', 'completed', 'published']).optional(),
})

export type MocOption = z.infer<typeof MocOptionSchema>

/**
 * LinkToMocModal props
 */
export interface LinkToMocModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when MOCs are confirmed */
  onConfirm: (mocIds: string[]) => Promise<void>
  /** Available MOCs to choose from */
  mocs: MocOption[]
  /** IDs of MOCs already linked */
  currentMocIds?: string[]
  /** Whether loading MOCs */
  isLoading?: boolean
  /** Type being linked (inspiration or album) */
  linkType?: 'inspiration' | 'album'
  /** Title for the modal */
  itemLabel?: string
}

/**
 * Status badge colors
 */
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  published: 'bg-purple-100 text-purple-700',
}

/**
 * LinkToMocModal Component
 *
 * Modal for selecting MOCs to link inspirations/albums to:
 * - Searchable MOC list
 * - Checkbox selection
 * - Shows MOC status and thumbnail
 * - Supports both adding and removing links
 */
export function LinkToMocModal({
  isOpen,
  onClose,
  onConfirm,
  mocs,
  currentMocIds = [],
  isLoading = false,
  linkType = 'inspiration',
  itemLabel = '1 item',
}: LinkToMocModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentMocIds))
  const [isSaving, setIsSaving] = useState(false)

  // Filter MOCs by search query
  const filteredMocs = useMemo(() => {
    if (!searchQuery.trim()) return mocs
    const query = searchQuery.toLowerCase()
    return mocs.filter(moc => moc.name.toLowerCase().includes(query))
  }, [mocs, searchQuery])

  const handleToggle = (mocId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(mocId)) {
        next.delete(mocId)
      } else {
        next.add(mocId)
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
    setSelectedIds(new Set(currentMocIds))
    onClose()
  }

  // Calculate changes
  const addedCount = Array.from(selectedIds).filter(id => !currentMocIds.includes(id)).length
  const removedCount = currentMocIds.filter(id => !selectedIds.has(id)).length
  const hasChanges = addedCount > 0 || removedCount > 0

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="link-to-moc-modal">
        <DialogHeader>
          <DialogTitle>Link to MOC</DialogTitle>
          <DialogDescription>
            Select MOC builds to link {itemLabel} to.
            {linkType === 'inspiration' &&
              " Linked inspirations will appear in the MOC's inspiration board."}
            {linkType === 'album' &&
              ' All inspirations in this album will be linked to the selected MOCs.'}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search MOCs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="link-to-moc-search"
          />
        </div>

        {/* MOC List */}
        <div className="h-64 border rounded-md overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              {searchQuery ? (
                <>
                  <p className="text-sm text-muted-foreground">No MOCs match "{searchQuery}"</p>
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
                  <Box className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No MOC builds yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a MOC build first to link inspirations.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredMocs.map(moc => {
                const isChecked = selectedIds.has(moc.id)
                const wasOriginallySelected = currentMocIds.includes(moc.id)

                return (
                  <label
                    key={moc.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md cursor-pointer',
                      'hover:bg-muted/50 transition-colors',
                      isChecked && 'bg-muted/30',
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(moc.id)}
                      data-testid={`moc-option-${moc.id}`}
                    />

                    {/* MOC thumbnail */}
                    <div className="flex-shrink-0">
                      {moc.imageUrl ? (
                        <img src={moc.imageUrl} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Box className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* MOC info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{moc.name}</p>
                      <div className="flex items-center gap-2">
                        {moc.status ? (
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded capitalize',
                              statusColors[moc.status] || statusColors.draft,
                            )}
                          >
                            {moc.status.replace('-', ' ')}
                          </span>
                        ) : null}
                        {wasOriginallySelected && !isChecked ? (
                          <span className="text-xs text-amber-600">(will unlink)</span>
                        ) : null}
                        {!wasOriginallySelected && isChecked ? (
                          <span className="text-xs text-green-600">(will link)</span>
                        ) : null}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary of changes */}
        {hasChanges ? (
          <p className="text-sm text-muted-foreground text-center">
            {addedCount > 0 ? `Linking to ${addedCount} MOC${addedCount !== 1 ? 's' : ''}` : ''}
            {addedCount > 0 && removedCount > 0 ? ', ' : ''}
            {removedCount > 0
              ? `unlinking from ${removedCount} MOC${removedCount !== 1 ? 's' : ''}`
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
            data-testid="link-to-moc-confirm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Links'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LinkToMocModal
