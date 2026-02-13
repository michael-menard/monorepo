/**
 * Inspiration Card Factory
 *
 * Factory function to map Inspiration domain type to GalleryCardProps.
 * Follows column-helpers.tsx pattern for factory function structure.
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import type { Inspiration } from '@repo/api-client'
import { Badge } from '@repo/app-component-library'
import type { GalleryCardProps } from '../components/GalleryCard'
import type { InspirationCardOptions } from './__types__'

/**
 * Creates a GalleryCard configuration from an Inspiration domain object.
 *
 * @param inspiration - The inspiration domain data
 * @param options - Display and interaction options
 * @returns GalleryCardProps configured for the inspiration
 *
 * @example
 * ```tsx
 * const cardProps = createInspirationCard(inspiration, {
 *   onClick: (insp) => navigate(`/inspiration/${insp.id}`),
 *   showTags: true,
 *   maxTags: 3,
 * })
 * return <GalleryCard {...cardProps} />
 * ```
 */
export function createInspirationCard(
  inspiration: Inspiration,
  options: InspirationCardOptions = {},
): GalleryCardProps {
  const { showTags = true, maxTags = 3, actions, ...baseOptions } = options

  // Extract image with thumbnail fallback
  const imageUrl = inspiration.thumbnailUrl || inspiration.imageUrl
  const image = imageUrl
    ? {
        src: imageUrl,
        alt: inspiration.title,
      }
    : undefined

  // Build subtitle from description (truncated)
  const subtitle = inspiration.description || undefined

  // Build metadata badges from tags
  const tags = inspiration.tags || []
  const displayTags = showTags ? tags.slice(0, maxTags) : []

  const metadata =
    displayTags.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {displayTags.map((tag, index) => (
          <Badge key={`${tag}-${index}`} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {tags.length > maxTags && (
          <Badge variant="secondary" className="text-xs">
            +{tags.length - maxTags} more
          </Badge>
        )}
      </div>
    ) : undefined

  // Build hover overlay with action buttons
  const hoverOverlay = actions ? (
    <div className="absolute inset-0 flex items-end p-4">
      <div className="flex gap-2">{actions}</div>
    </div>
  ) : undefined

  return {
    image,
    title: inspiration.title,
    subtitle,
    metadata,
    hoverOverlay,
    ...baseOptions,
  }
}
