/**
 * WishlistDragPreview Component
 *
 * Lazy-loaded drag preview for wishlist item reordering.
 * Displays a scaled thumbnail in the DragOverlay during drag operations.
 *
 * Story WISH-2005c: Drag preview thumbnail
 */

import { Suspense, lazy } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { WishlistDragPreviewProps } from './__types__'

// Lazy load the preview content for code-splitting (AC-13)
const WishlistDragPreviewContent = lazy(() => import('./WishlistDragPreviewContent'))

/**
 * Minimal loading fallback during lazy load
 * Matches preview dimensions to prevent layout shift
 */
function PreviewFallback() {
  return (
    <div
      className="w-48 h-48 bg-muted/50 rounded-lg animate-pulse"
      style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}
      aria-hidden="true"
    />
  )
}

/**
 * WishlistDragPreview Component
 *
 * Wrapper component that:
 * - Handles null item (no active drag)
 * - Provides Suspense fallback for lazy loading
 * - Wraps content in AnimatePresence for exit animations
 *
 * @param item - The wishlist item being dragged, or null if not dragging
 */
export function WishlistDragPreview({ item }: WishlistDragPreviewProps) {
  return (
    <AnimatePresence mode="wait">
      {item ? (
        <Suspense fallback={<PreviewFallback />}>
          <WishlistDragPreviewContent item={item} />
        </Suspense>
      ) : null}
    </AnimatePresence>
  )
}

export default WishlistDragPreview
