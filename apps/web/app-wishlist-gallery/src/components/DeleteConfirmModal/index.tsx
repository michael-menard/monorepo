/**
 * DeleteConfirmModal Component
 *
 * AlertDialog-based confirmation modal for deleting wishlist items.
 * Shows item preview (thumbnail + title) and destructive action warning.
 *
 * Features:
 * - Keyboard accessible: ESC to cancel (via Radix AlertDialog)
 * - Focus trap during modal open (via Radix AlertDialog)
 * - Returns focus to trigger element on close (via Radix AlertDialog)
 * - Destructive styling for delete button
 * - Loading state disables buttons during delete
 *
 * Story WISH-2041: Delete Flow
 */

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
import { AlertTriangle } from 'lucide-react'
import type { DeleteConfirmModalProps } from './__types__'

/**
 * DeleteConfirmModal Component
 *
 * Confirmation dialog for permanently deleting a wishlist item.
 * Uses AlertDialog for native keyboard accessibility and focus management.
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  // Don't render if no item
  if (!item) {
    return null
  }

  const handleConfirm = () => {
    onConfirm(item)
  }

  return (
    <AppAlertDialog open={isOpen} onOpenChange={open => !open && !isDeleting && onClose()}>
      <AppAlertDialogContent variant="destructive" className="sm:max-w-md">
        <AppAlertDialogHeader>
          <AppAlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Delete Item?
          </AppAlertDialogTitle>
          <AppAlertDialogDescription>
            This action is permanent. You cannot undo it.
          </AppAlertDialogDescription>
        </AppAlertDialogHeader>

        {/* Item Preview */}
        <div
          className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
          data-testid="delete-confirm-item-preview"
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-16 h-16 object-cover rounded-md"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                <span className="text-2xl text-muted-foreground">?</span>
              </div>
            )}
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate" data-testid="delete-confirm-title">
              {item.title}
            </p>
            {item.setNumber ? (
              <p className="text-sm text-muted-foreground">Set #{item.setNumber}</p>
            ) : null}
            {item.store ? <p className="text-sm text-muted-foreground">{item.store}</p> : null}
          </div>
        </div>

        {/* Loading Indicator */}
        {isDeleting ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
            <LoadingSpinner size="sm" />
            <span>Deleting item...</span>
          </div>
        ) : null}

        <AppAlertDialogFooter>
          <AppAlertDialogCancel
            onClick={() => onClose()}
            disabled={isDeleting}
            data-testid="delete-confirm-cancel"
          >
            Cancel
          </AppAlertDialogCancel>
          <AppAlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-confirm-delete"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AppAlertDialogAction>
        </AppAlertDialogFooter>
      </AppAlertDialogContent>
    </AppAlertDialog>
  )
}
