/**
 * GalleryLoadingSkeleton Component
 *
 * Full gallery loading skeleton with multiple card placeholders.
 * Provides visual feedback during data fetching.
 *
 * INSP-020: Loading States
 */

import { z } from 'zod'
import { cn } from '@repo/app-component-library'
import { InspirationCardSkeleton } from '../InspirationCardSkeleton'
import { AlbumCardSkeleton } from '../AlbumCardSkeleton'

/**
 * GalleryLoadingSkeleton props schema
 */
const GalleryLoadingSkeletonPropsSchema = z.object({
  /** Type of cards to show */
  variant: z.enum(['inspirations', 'albums', 'mixed']).optional(),
  /** Number of skeleton cards to display */
  count: z.number().int().min(1).max(24).optional(),
  /** Additional className */
  className: z.string().optional(),
})

export type GalleryLoadingSkeletonProps = z.infer<typeof GalleryLoadingSkeletonPropsSchema>

/**
 * GalleryLoadingSkeleton Component
 *
 * Displays a grid of loading skeleton cards.
 * Supports inspiration cards, album cards, or a mix of both.
 */
export function GalleryLoadingSkeleton({
  variant = 'inspirations',
  count = 8,
  className,
}: GalleryLoadingSkeletonProps) {
  // Generate array of skeleton indices
  const skeletons = Array.from({ length: count }, (_, i) => i)

  // For mixed variant, show albums in first row
  const getCardType = (index: number): 'inspiration' | 'album' => {
    if (variant === 'albums') return 'album'
    if (variant === 'inspirations') return 'inspiration'
    // Mixed: first 2 are albums, rest are inspirations
    return index < 2 ? 'album' : 'inspiration'
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
        className,
      )}
      role="status"
      aria-label="Loading gallery"
    >
      {skeletons.map(index =>
        getCardType(index) === 'album' ? (
          <AlbumCardSkeleton key={`skeleton-${index}`} />
        ) : (
          <InspirationCardSkeleton key={`skeleton-${index}`} />
        ),
      )}
      <span className="sr-only">Loading gallery items...</span>
    </div>
  )
}

export default GalleryLoadingSkeleton
