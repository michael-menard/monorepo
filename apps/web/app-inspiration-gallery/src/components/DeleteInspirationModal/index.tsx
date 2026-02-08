/**
 * DeleteInspirationModal Component
 *
 * Confirmation dialog for deleting an inspiration.
 * Shows item preview and warns about multi-album membership.
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
import { AlertTriangle, FolderOpen } from 'lucide-react'

/**
 * Inspiration item for delete preview
 */
const DeleteInspirationItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
  albumCount: z.number().int().optional(),
  albumNames: z.array(z.string()).optional(),
})

export type DeleteInspirationItem = z.infer<typeof DeleteInspirationItemSchema>

/**
 * DeleteInspirationModal props
 */
export interface DeleteInspirationModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called when delete is confirmed */
  onConfirm: (item: DeleteInspirationItem) => void
  /** The inspiration item to delete */
  item: DeleteInspirationItem | null
  /** Whether delete is in progress */
  isDeleting?: boolean
}

/**
 * DeleteInspirationModal Component
 *
 * Confirmation dialog for permanently deleting an inspiration.
 * Features:
 * - Shows inspiration preview (thumbnail + title)
 * - Warns about multi-album membership
 * - Keyboard accessible via AlertDialog
 */
export function DeleteInspirationModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting = false,
}: DeleteInspirationModalProps) {
  // Don't render if no item
  if (!item) {
    return null
  }

  const handleConfirm = () => {
    onConfirm(item)
  }

  const displayImage = item.thumbnailUrl || item.imageUrl
  const albumCount = item.albumCount ?? 0
  const hasMultipleAlbums = albumCount > 1

  return (
    <AppAlertDialog open={isOpen} onOpenChange={open => !open && !isDeleting && onClose()}>
      <AppAlertDialogContent
        variant="destructive"
        className="sm:max-w-md"
        data-testid="delete-inspiration-modal"
      >
        <AppAlertDialogHeader>
          <AppAlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Delete Inspiration?
          </AppAlertDialogTitle>
          <AppAlertDialogDescription>
            This will permanently delete this inspiration from your gallery.
            {hasMultipleAlbums ? ' It will be removed from all albums.' : ''}
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>

        {/* Item Preview */}
        <div
          className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
          data-testid="delete-inspiration-preview"
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            <img
              src={displayImage}
              alt={item.title}
              className="w-16 h-16 object-cover rounded-md"
            />
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <p
              className="font-medium text-foreground truncate"
              data-testid="delete-inspiration-title"
            >
              {item.title}
            </p>
            {albumCount > 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                In {albumCount} album{albumCount !== 1 ? 's' : ''}
              </p>
            ) : null}
          </div>
        </div>

        {/* Multi-album warning */}
        {hasMultipleAlbums && item.albumNames && item.albumNames.length > 0 ? (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-medium mb-1">Will be removed from:</p>
            <ul className="list-disc list-inside">
              {item.albumNames.slice(0, 3).map((name, index) => (
                <li key={index} className="truncate">
                  {name}
                </li>
              ))}
              {item.albumNames.length > 3 ? (
                <li>...and {item.albumNames.length - 3} more</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {/* Loading Indicator */}
        {isDeleting ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <LoadingSpinner size="sm" />
            <span>Deleting inspiration...</span>
          </div>
        ) : null}

        <AppAlertDialogFooter>
          <AppAlertDialogCancel
            onClick={() => onClose()}
            disabled={isDeleting}
            data-testid="delete-inspiration-cancel"
          >
            Cancel
          </AppAlertDialogCancel>
          <AppAlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-inspiration-confirm"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AppAlertDialogAction>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}

export default DeleteInspirationModal
