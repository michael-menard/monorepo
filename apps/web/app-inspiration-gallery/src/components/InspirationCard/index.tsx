/**
 * InspirationCard Component
 *
 * Displays a single inspiration image with hover actions.
 * Supports selection mode for multi-select operations.
 *
 * INSP-002: Card Component
 */

import { z } from 'zod'
import { Card, CardContent, cn } from '@repo/app-component-library'
import { ExternalLink, MoreVertical, Check, Link2 } from 'lucide-react'

/**
 * Inspiration card props schema (data fields only)
 */
const InspirationCardPropsSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Display title */
  title: z.string(),
  /** Image URL */
  imageUrl: z.string(),
  /** Thumbnail URL (falls back to imageUrl) */
  thumbnailUrl: z.string().nullable().optional(),
  /** Original source URL */
  sourceUrl: z.string().nullable().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).nullable().optional(),
  /** Whether the card is currently selected */
  isSelected: z.boolean().optional(),
  /** Whether selection mode is active */
  selectionMode: z.boolean().optional(),
  /** Number of albums this inspiration is in */
  albumCount: z.number().int().optional(),
  /** Number of MOCs this inspiration is linked to */
  mocCount: z.number().int().optional(),
})

export type InspirationCardProps = z.infer<typeof InspirationCardPropsSchema> & {
  /** Called when card is clicked */
  onClick?: () => void
  /** Called when card is selected/deselected */
  onSelect?: (selected: boolean) => void
  /** Called when more menu is opened */
  onMenuClick?: (event: React.MouseEvent) => void
  /** Called when source link is clicked */
  onSourceClick?: () => void
}

/**
 * InspirationCard Component
 *
 * Displays an inspiration image in a card format with:
 * - Image preview with lazy loading
 * - Hover overlay with actions
 * - Selection checkbox in selection mode
 * - Source link badge
 * - More menu for additional actions
 */
export function InspirationCard({
  id,
  title,
  imageUrl,
  thumbnailUrl,
  sourceUrl,
  tags,
  isSelected = false,
  selectionMode = false,
  albumCount,
  mocCount,
  onClick,
  onSelect,
  onMenuClick,
  onSourceClick,
}: InspirationCardProps) {
  const displayImage = thumbnailUrl || imageUrl

  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect(!isSelected)
    } else if (onClick) {
      onClick()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const handleMenuClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    onMenuClick?.(event)
  }

  const handleSourceClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (sourceUrl) {
      window.open(sourceUrl, '_blank', 'noopener,noreferrer')
    }
    onSourceClick?.()
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden cursor-pointer transition-all duration-200',
        'hover:ring-2 hover:ring-primary/50 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary shadow-lg',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      aria-label={`${title}${isSelected ? ', selected' : ''}`}
      data-testid={`inspiration-card-${id}`}
    >
      <CardContent className="p-0">
        {/* Image container with aspect ratio */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={displayImage}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />

          {/* Selection checkbox overlay */}
          {selectionMode ? (
            <div className="absolute top-2 left-2 z-10">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-white bg-black/40 text-white',
                )}
              >
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </div>
            </div>
          ) : null}

          {/* Hover overlay with actions */}
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            )}
          >
            {/* Top actions */}
            <div className="absolute top-2 right-2 flex gap-1">
              {sourceUrl ? (
                <button
                  onClick={handleSourceClick}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                  aria-label="Open source link"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              ) : null}
              <button
                onClick={handleMenuClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-medium text-sm truncate">{title}</h3>

              {/* Badges row */}
              <div className="flex items-center gap-2 mt-1">
                {albumCount !== undefined && albumCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    {albumCount} album{albumCount !== 1 ? 's' : ''}
                  </span>
                )}
                {mocCount !== undefined && mocCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/80">
                    <Link2 className="h-3 w-3" />
                    {mocCount} MOC{mocCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Tags (show first 2) */}
              {tags && tags.length > 0 ? (
                <div className="flex items-center gap-1 mt-2">
                  {tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20 text-white"
                    >
                      {tag}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className="text-xs text-white/70">+{tags.length - 2}</span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InspirationCard
