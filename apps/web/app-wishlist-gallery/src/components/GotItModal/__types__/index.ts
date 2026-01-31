/**
 * GotItModal Type Definitions
 *
 * Zod schemas for GotItModal component props and data validation.
 */

import { z } from 'zod'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * GotItModal props schema
 */
export const GotItModalPropsSchema = z.object({
  /** Whether the modal is open */
  isOpen: z.boolean(),
  /** Callback when modal should close */
  onClose: z.function(),
  /** The wishlist item being purchased */
  item: z.custom<WishlistItem>().nullable(),
  /** Optional callback when purchase is completed successfully */
  onSuccess: z.function().optional(),
})

export type GotItModalProps = z.infer<typeof GotItModalPropsSchema>
