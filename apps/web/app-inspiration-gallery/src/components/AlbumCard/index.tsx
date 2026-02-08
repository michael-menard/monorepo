/**
 * AlbumCard Component
 *
 * Displays an album with a stacked card effect showing its cover image.
 * Shows item count and supports selection mode.
 *
 * INSP-002: Card Component
 */

import { z } from 'zod'
import { Card, CardContent, cn } from '@repo/app-component-library'
import { Folder, MoreVertical, Check, FolderOpen } from 'lucide-react'

/**
 * Album card props schema (data fields only)
 */
const AlbumCardPropsSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Display title */
  title: z.string(),
  /** Description */
  description: z.string().nullable().optional(),
  /** Cover image URL */
  coverImageUrl: z.string().nullable().optional(),
  /** Number of items in the album */
  itemCount: z.number().int().optional(),
  /** Number of child albums */
  childAlbumCount: z.number().int().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).nullable().optional(),
  /** Whether the card is currently selected */
  isSelected: z.boolean().optional(),
  /** Whether selection mode is active */
  selectionMode: z.boolean().optional(),
})

export type AlbumCardProps = z.infer<typeof AlbumCardPropsSchema> & {
  /** Called when card is clicked */
  onClick?: () => void
  /** Called when card is selected/deselected */
  onSelect?: (selected: boolean) => void
  /** Called when more menu is opened */
  onMenuClick?: (event: React.MouseEvent) => void
}

/**
 * AlbumCard Component
 *
 * Displays an album in a card format with:
 * - Stacked card effect (visual depth)
 * - Cover image or folder icon
 * - Item count badge
 * - Selection checkbox in selection mode
 * - More menu for additional actions
 */
export function AlbumCard({
  id,
  title,
  description,
  coverImageUrl,
  itemCount = 0,
  childAlbumCount = 0,
  tags,
  isSelected = false,
  selectionMode = false,
  onClick,
  onSelect,
  onMenuClick,
}: AlbumCardProps) {
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

  return (
    <div className="relative">
      {/* Stacked cards effect (behind the main card) */}
      <div
        className={cn(
          'absolute inset-0 transform translate-x-1 translate-y-1 rounded-lg bg-muted/50',
          'transition-transform duration-200',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 transform translate-x-0.5 translate-y-0.5 rounded-lg bg-muted/70',
          'transition-transform duration-200',
        )}
      />

      {/* Main card */}
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer transition-all duration-200',
          'hover:ring-2 hover:ring-primary/50 hover:shadow-lg',
          'hover:-translate-y-0.5',
          isSelected && 'ring-2 ring-primary shadow-lg',
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        aria-label={`${title} album with ${itemCount} items${isSelected ? ', selected' : ''}`}
        data-testid={`album-card-${id}`}
      >
        <CardContent className="p-0">
          {/* Image/Icon container with aspect ratio */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <Folder className="h-16 w-16 text-primary/40" />
              </div>
            )}

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

            {/* Top actions (always visible for albums) */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleMenuClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            {/* Item count badge */}
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/60 text-white">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Hover overlay */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
              )}
            >
              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-white/80" />
                  <h3 className="text-white font-medium text-sm truncate flex-1">{title}</h3>
                </div>

                {description ? (
                  <p className="text-white/70 text-xs mt-1 line-clamp-2">{description}</p>
                ) : null}

                {/* Sub-info row */}
                <div className="flex items-center gap-2 mt-2">
                  {childAlbumCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-white/80">
                      <Folder className="h-3 w-3" />
                      {childAlbumCount} sub-album{childAlbumCount !== 1 ? 's' : ''}
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
    </div>
  )
}

export default AlbumCard
