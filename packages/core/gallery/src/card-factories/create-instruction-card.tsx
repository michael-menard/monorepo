/**
 * Instruction Card Factory
 *
 * Factory function to map Instruction domain type to GalleryCardProps.
 * Follows column-helpers.tsx pattern for factory function structure.
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import type { MocInstructions } from '@repo/api-client'
import { Badge } from '@repo/app-component-library'
import type { GalleryCardProps } from '../components/GalleryCard'
import type { InstructionCardOptions } from './__types__'

/**
 * Creates a GalleryCard configuration from an Instruction domain object.
 *
 * @param instruction - The instruction/MOC domain data
 * @param options - Display and interaction options
 * @returns GalleryCardProps configured for the instruction
 *
 * @example
 * ```tsx
 * const cardProps = createInstructionCard(instruction, {
 *   onClick: (inst) => navigate(`/instructions/${inst.id}`),
 *   showPieceCount: true,
 *   showTheme: true,
 * })
 * return <GalleryCard {...cardProps} />
 * ```
 */
export function createInstructionCard(
  instruction: MocInstructions,
  options: InstructionCardOptions = {},
): GalleryCardProps {
  const {
    showPieceCount = true,
    showTheme = true,
    showStatus = true,
    actions,
    ...baseOptions
  } = options

  // Extract image with fallback logic
  const imageUrl = instruction.thumbnailUrl
  const image = imageUrl
    ? {
        src: imageUrl,
        alt: instruction.title,
      }
    : undefined

  // Build metadata badges
  const metadata = (
    <div className="flex flex-wrap gap-1.5">
      {showPieceCount && instruction.partsCount ? (
        <Badge variant="secondary" className="text-xs">
          {instruction.partsCount.toLocaleString()} pieces
        </Badge>
      ) : null}
      {showTheme && instruction.theme ? (
        <Badge variant="outline" className="text-xs">
          {instruction.theme}
        </Badge>
      ) : null}
      {showStatus && instruction.status ? (
        <Badge
          variant={instruction.status === 'published' ? 'default' : 'secondary'}
          className="text-xs capitalize"
        >
          {instruction.status}
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
    title: instruction.title,
    subtitle: instruction.author || undefined,
    metadata,
    hoverOverlay,
    ...baseOptions,
  }
}
