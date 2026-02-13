/**
 * Set Card Factory
 *
 * Factory function to map Set domain type to GalleryCardProps.
 * Follows column-helpers.tsx pattern for factory function structure.
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import type { Set } from '@repo/api-client'
import { Badge } from '@repo/app-component-library'
import type { GalleryCardProps } from '../components/GalleryCard'
import type { SetCardOptions } from './__types__'

/**
 * Creates a GalleryCard configuration from a Set domain object.
 *
 * @param set - The set domain data
 * @param options - Display and interaction options
 * @returns GalleryCardProps configured for the set
 *
 * @example
 * ```tsx
 * const cardProps = createSetCard(set, {
 *   onClick: (s) => navigate(`/sets/${s.id}`),
 *   showPieceCount: true,
 *   showBuildStatus: true,
 * })
 * return <GalleryCard {...cardProps} />
 * ```
 */
export function createSetCard(set: Set, options: SetCardOptions = {}): GalleryCardProps {
  const {
    showPieceCount = true,
    showBuildStatus = true,
    showTheme = true,
    actions,
    ...baseOptions
  } = options

  // Extract image with fallback to first image in array
  const firstImage = set.images?.[0]
  const imageUrl = firstImage?.thumbnailUrl || firstImage?.imageUrl
  const image = imageUrl
    ? {
        src: imageUrl,
        alt: set.title,
      }
    : undefined

  // Build subtitle with set number
  const subtitle = set.setNumber ? `Set ${set.setNumber}` : undefined

  // Build metadata badges
  const metadata = (
    <div className="flex flex-wrap gap-1.5">
      {showPieceCount && set.pieceCount ? (
        <Badge variant="secondary" className="text-xs">
          {set.pieceCount.toLocaleString()} pieces
        </Badge>
      ) : null}
      {showTheme && set.theme ? (
        <Badge variant="outline" className="text-xs">
          {set.theme}
        </Badge>
      ) : null}
      {showBuildStatus ? (
        <Badge variant={set.isBuilt ? 'default' : 'secondary'} className="text-xs">
          {set.isBuilt ? 'Built' : 'Unbuilt'}
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
    title: set.title,
    subtitle,
    metadata,
    hoverOverlay,
    ...baseOptions,
  }
}
