/**
 * WishlistDragPreview Type Definitions
 *
 * Zod schemas and inferred types for the drag preview component.
 *
 * Story WISH-2005c: Drag preview thumbnail
 */

import { z } from 'zod'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

/**
 * WishlistDragPreview props schema (data-only)
 * Per CLAUDE.md: Use Zod for data structures
 */
export const WishlistDragPreviewPropsDataSchema = z.object({
  /** The item being dragged - optional since null when not dragging */
  item: z.custom<WishlistItem>().nullable(),
})

/**
 * WishlistDragPreview props type
 */
export type WishlistDragPreviewProps = z.infer<typeof WishlistDragPreviewPropsDataSchema>

/**
 * Maximum title length before truncation (AC-6)
 */
export const MAX_TITLE_LENGTH = 30

/**
 * Animation duration in milliseconds for fade in/out (AC-3, AC-4)
 */
export const ANIMATION_DURATION_MS = 150

/**
 * Tooltip delay in milliseconds (AC-6)
 */
export const TOOLTIP_DELAY_MS = 500

/**
 * Preview scale factor (AC-1)
 */
export const PREVIEW_SCALE = 0.7

/**
 * Preview opacity (AC-1)
 */
export const PREVIEW_OPACITY = 0.8
