/**
 * DeleteConfirmationModal Component
 *
 * Confirmation modal for permanently removing a wishlist item.
 * Uses the ConfirmationDialog from @repo/app-component-library with destructive styling.
 *
 * Story wish-2004: Delete Confirmation Modal
 */

import { ConfirmationDialog, showSuccessToast, showErrorToast } from '@repo/app-component-library'
import { useRemoveFromWishlistMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import { logger } from '@repo/logger'

import { z } from 'zod'

/**
 * Props schema for DeleteConfirmationModal
 */
export const DeleteConfirmationModalPropsSchema = z.object({
  open: z.boolean(),
  onOpenChange: z.function().args(z.boolean()).returns(z.void()),
  itemId: z.string().uuid(),
  itemTitle: z.string(),
  onDeleted: z.function().returns(z.void()).optional(),
})

export type DeleteConfirmationModalProps = z.infer<typeof DeleteConfirmationModalPropsSchema>

/**
 * DeleteConfirmationModal
 *
 * Shows a confirmation dialog before permanently deleting a wishlist item.
 * Handles the delete mutation and shows success/error toasts.
 */
export function DeleteConfirmationModal({
  open,
  onOpenChange,
  itemId,
  itemTitle,
  onDeleted,
}: DeleteConfirmationModalProps) {
  const [removeItem, { isLoading }] = useRemoveFromWishlistMutation()

  const handleConfirm = async () => {
    try {
      await removeItem(itemId).unwrap()
      showSuccessToast('Item removed from wishlist')
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      logger.error('Failed to delete wishlist item:', error)
      showErrorToast('Failed to remove item. Please try again.')
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove from Wishlist?"
      description={`Are you sure you want to remove "${itemTitle}" from your wishlist? This action cannot be undone.`}
      confirmText="Remove"
      cancelText="Cancel"
      variant="destructive"
      loading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}
