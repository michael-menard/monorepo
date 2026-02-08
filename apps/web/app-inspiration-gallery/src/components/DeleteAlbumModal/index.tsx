/**
 * DeleteAlbumModal Component
 *
 * Confirmation dialog for deleting an album.
 * Shows album preview and warns about contents.
 *
 * INSP-015: Delete Flows
 */

import { z } from 'zod'
import {
  AppAlertDialog,
  AppAlertDialogContent,
  AppAlertDialogHeader,
  AppAlertDialogFooter,
  AppAlertDialogTitle,
  AppAlertDialogDescription,
  AppAlertDialogAction,
  AppAlertDialogCancel,
  LoadingSpinner,
} from '@repo/app-component-library'
import { AlertTriangle, Folder, Image } from 'lucide-react'

/**
 * Album item for delete preview
 */
const DeleteAlbumItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  coverImageUrl: z.string().nullable().optional(),
  itemCount: z.number().int().optional(),
  childAlbumCount: z.number().int().optional(),
})

export type DeleteAlbumItem = z.infer<typeof DeleteAlbumItemSchema>

/**
 * DeleteAlbumModal props
 */
export interface DeleteAlbumModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when delete is confirmed */
  onConfirm: (item: DeleteAlbumItem) => void
  /** The album item to delete */
  item: DeleteAlbumItem | null
  /** Whether delete is in progress */
  isDeleting?: boolean
}

/**
 * DeleteAlbumModal Component
 *
 * Confirmation dialog for permanently deleting an album.
 * Features:
 * - Shows album preview (cover + title)
 * - Warns about contained items and sub-albums
 * - Clarifies that inspirations are NOT deleted (only album removed)
 * - Keyboard accessible via AlertDialog
 */
export function DeleteAlbumModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting = false,
}: DeleteAlbumModalProps) {
  // Don't render if no item
  if (!item) {
    return null
  }

  const handleConfirm = () => {
    onConfirm(item)
  }

  const itemCount = item.itemCount ?? 0
  const childAlbumCount = item.childAlbumCount ?? 0
  const hasContents = itemCount > 0 || childAlbumCount > 0

  return (
    <AppAlertDialog open={isOpen} onOpenChange={open => !open && !isDeleting && onClose()}>
      <AppAlertDialogContent
        variant="destructive"
        className="sm:max-w-md"
        data-testid="delete-album-modal"
      >
        <AppAlertDialogHeader>
          <AppAlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Delete Album?
          </AppAlertDialogTitle>
          <AppAlertDialogDescription>
            This will permanently delete this album.
            {hasContents
              ? ' The inspirations inside will NOT be deleted, only removed from this album.'
              : ''}
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>

        {/* Item Preview */}
        <div
          className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
          data-testid="delete-album-preview"
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {item.coverImageUrl ? (
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="w-16 h-16 object-cover rounded-md"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md flex items-center justify-center">
                <Folder className="h-8 w-8 text-primary/40" />
              </div>
            )}
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate" data-testid="delete-album-title">
              {item.title}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              {itemCount > 0 && (
                <span className="flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
              {childAlbumCount > 0 && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {childAlbumCount} sub-album{childAlbumCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content warning */}
        {hasContents ? (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p>
              <strong>Note:</strong> Deleting this album will not delete the {itemCount} inspiration
              {itemCount !== 1 ? 's' : ''} inside. They will remain in your gallery and any other
              albums they belong to.
            </p>
            {childAlbumCount > 0 ? (
              <p className="mt-2">
                The {childAlbumCount} sub-album{childAlbumCount !== 1 ? 's' : ''} will also be
                deleted.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Loading Indicator */}
        {isDeleting ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <LoadingSpinner size="sm" />
            <span>Deleting album...</span>
          </div>
        ) : null}

        <AppAlertDialogFooter>
          <AppAlertDialogCancel
            onClick={() => onClose()}
            disabled={isDeleting}
            data-testid="delete-album-cancel"
          >
            Cancel
          </AppAlertDialogCancel>
          <AppAlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-album-confirm"
          >
            {isDeleting ? 'Deleting...' : 'Delete Album'}
          </AppAlertDialogAction>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}

export default DeleteAlbumModal
