/**
 * DeleteConfirmModal Type Definitions
 *
 * Zod schemas and type definitions for DeleteConfirmModal component props.
 * Story WISH-2041: Delete Flow
 */

import { z } from 'zod'
import { WishlistItemSchema, type WishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * DeleteConfirmModal props schema
 *
 * Note: For React component props with callback functions, we use z.any()
 * for the function fields since Zod's z.function() typing doesn't integrate
 * well with React's expectations. The actual function signatures are enforced
 * via the explicit type definition below.
 */
export const DeleteConfirmModalPropsSchema = z.object({
  /** Whether the modal is open */
  isOpen: z.boolean(),
  /** Callback when modal should close */
  onClose: z.any(),
  /** Callback when delete is confirmed - receives the item to delete */
  onConfirm: z.any(),
  /** The wishlist item being deleted */
  item: WishlistItemSchema.nullable(),
  /** Whether delete operation is in progress */
  isDeleting: z.boolean().optional(),
})

/**
 * DeleteConfirmModal props type
 *
 * We define the function signatures explicitly here since Zod's z.function()
 * inference doesn't work well with React component patterns.
 */
export type DeleteConfirmModalProps = Omit<
  z.infer<typeof DeleteConfirmModalPropsSchema>,
  'onClose' | 'onConfirm'
> & {
  /** Callback when modal should close */
  onClose: () => void
  /** Callback when delete is confirmed - receives the item to delete */
  onConfirm: (item: WishlistItem) => void | Promise<void>
}
