/**
 * BulkActionsBar Component
 *
 * Floating action bar that appears when items are selected.
 * Provides bulk operations for inspirations and albums.
 *
 * INSP-021: Multi-Select & Bulk Ops
 */

import { z } from 'zod'
import { Button, cn } from '@repo/app-component-library'
import { X, FolderPlus, Link2, Trash2, CheckSquare } from 'lucide-react'

/**
 * BulkActionsBar props schema
 * Note: Callback functions use z.any() as Zod function validation is not practical for React props
 */
const BulkActionsBarPropsSchema = z.object({
  /** Number of selected items */
  selectionCount: z.number().int().min(0),
  /** Total number of items available */
  totalCount: z.number().int().min(0),
  /** Type of items selected */
  itemType: z.enum(['inspirations', 'albums']),
  /** Called when clear selection is clicked */
  onClearSelection: z.any(),
  /** Called when select all is clicked */
  onSelectAll: z.any(),
  /** Called when add to album is clicked */
  onAddToAlbum: z.any().optional(),
  /** Called when link to MOC is clicked */
  onLinkToMoc: z.any().optional(),
  /** Called when delete is clicked */
  onDelete: z.any().optional(),
  /** Additional className */
  className: z.string().optional(),
})

/** Props type with proper callback signatures */
export type BulkActionsBarProps = Omit<
  z.infer<typeof BulkActionsBarPropsSchema>,
  'onClearSelection' | 'onSelectAll' | 'onAddToAlbum' | 'onLinkToMoc' | 'onDelete'
> & {
  onClearSelection: () => void
  onSelectAll: () => void
  onAddToAlbum?: () => void
  onLinkToMoc?: () => void
  onDelete?: () => void
}

/**
 * BulkActionsBar Component
 *
 * Floating action bar for bulk operations:
 * - Shows selection count
 * - Select all / Clear selection
 * - Add to album (inspirations only)
 * - Link to MOC
 * - Delete selected
 */
export function BulkActionsBar({
  selectionCount,
  totalCount,
  itemType,
  onClearSelection,
  onSelectAll,
  onAddToAlbum,
  onLinkToMoc,
  onDelete,
  className,
}: BulkActionsBarProps) {
  if (selectionCount === 0) {
    return null
  }

  const isAllSelected = selectionCount === totalCount
  const itemLabel = itemType === 'inspirations' ? 'inspiration' : 'album'

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'bg-background border border-border',
        'animate-in slide-in-from-bottom-4 fade-in duration-200',
        className,
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {selectionCount} {itemLabel}
          {selectionCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Select all / Clear */}
      <div className="flex items-center gap-1">
        {!isAllSelected ? (
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select all ({totalCount})
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onClearSelection} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Add to Album (inspirations only) */}
        {itemType === 'inspirations' && onAddToAlbum ? (
          <Button variant="ghost" size="sm" onClick={onAddToAlbum} data-testid="bulk-add-to-album">
            <FolderPlus className="h-4 w-4 mr-1" />
            Add to Album
          </Button>
        ) : null}

        {/* Link to MOC */}
        {onLinkToMoc ? (
          <Button variant="ghost" size="sm" onClick={onLinkToMoc} data-testid="bulk-link-to-moc">
            <Link2 className="h-4 w-4 mr-1" />
            Link to MOC
          </Button>
        ) : null}

        {/* Delete */}
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            data-testid="bulk-delete"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default BulkActionsBar
