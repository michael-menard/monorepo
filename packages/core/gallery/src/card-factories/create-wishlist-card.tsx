/**
 * Wishlist Card Factory
 *
 * Factory function to map WishlistItem domain type to GalleryCardProps.
 * Follows column-helpers.tsx pattern for factory function structure.
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import type { WishlistItem } from '@repo/api-client'
import { Badge } from '@repo/app-component-library'
import type { GalleryCardProps } from '../components/GalleryCard'
import type { WishlistCardOptions } from './__types__'

/**
 * Priority level display configuration
 */
const PRIORITY_CONFIG = {
  0: { label: 'Low', variant: 'outline' as const },
  1: { label: 'Low', variant: 'outline' as const },
  2: { label: 'Medium', variant: 'secondary' as const },
  3: { label: 'Medium', variant: 'secondary' as const },
  4: { label: 'High', variant: 'default' as const },
  5: { label: 'High', variant: 'default' as const },
}

/**
 * Creates a GalleryCard configuration from a WishlistItem domain object.
 *
 * @param item - The wishlist item domain data
 * @param options - Display and interaction options
 * @returns GalleryCardProps configured for the wishlist item
 *
 * @example
 * ```tsx
 * const cardProps = createWishlistCard(wishlistItem, {
 *   onClick: (item) => navigate(`/wishlist/${item.id}`),
 *   showPrice: true,
 *   showPriority: true,
 * })
 * return <GalleryCard {...cardProps} />
 * ```
 */
export function createWishlistCard(
  item: WishlistItem,
  options: WishlistCardOptions = {},
): GalleryCardProps {
  const {
    showPrice = true,
    showPriority = true,
    showPieceCount = true,
    actions,
    ...baseOptions
  } = options

  // Extract image (with image variants support from WISH-2016)
  // imageVariants.thumbnail/medium are objects with { url, width, height, ... }
  const imageUrl =
    item.imageVariants?.thumbnail?.url || item.imageVariants?.medium?.url || item.imageUrl
  const image = imageUrl
    ? {
        src: imageUrl,
        alt: item.title,
      }
    : undefined

  // Build subtitle with store
  const subtitle = item.store ? item.store : undefined

  // Build metadata badges
  const priorityKey = (item.priority || 0) as keyof typeof PRIORITY_CONFIG
  const priorityConfig = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG[0]

  const metadata = (
    <div className="flex flex-wrap gap-1.5">
      {showPieceCount && item.pieceCount ? (
        <Badge variant="secondary" className="text-xs">
          {item.pieceCount.toLocaleString()} pieces
        </Badge>
      ) : null}
      {showPrice && item.price ? (
        <Badge variant="outline" className="text-xs">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: item.currency || 'USD',
          }).format(parseFloat(item.price))}
        </Badge>
      ) : null}
      {showPriority ? (
        <Badge variant={priorityConfig.variant} className="text-xs">
          {priorityConfig.label} Priority
        </Badge>
      ) : null}
    </div>
  )

  // Build hover overlay with action buttons
  const hoverOverlay = actions ? (
    <div className="absolute inset-0 flex items-end p-4">
      <div className="flex gap-2">{actions}</div>
    </div>
  ) : undefined

  return {
    image,
    title: item.title,
    subtitle,
    metadata,
    hoverOverlay,
    ...baseOptions,
  }
}
