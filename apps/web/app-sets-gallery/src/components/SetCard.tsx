/**
 * SetGalleryCard Component
 *
 * Sets-specific card that wraps the shared AppGalleryCard component.
 * Maps Set schema fields to a generic gallery card presentation.
 */

import { z } from 'zod'
import { Badge, Button } from '@repo/app-component-library'
import { GalleryCard } from '@repo/gallery'
import { Blocks, CheckCircle2, Eye, Pencil, Trash2 } from 'lucide-react'
import type { Set } from '@repo/api-client/schemas/sets'

export const SetGalleryCardPropsSchema = z.object({
  /** Set data from @repo/api-client */
  set: z.custom<Set>(),
  /** Primary click handler (card click / view details) */
  onClick: z.function().optional(),
  /** Edit handler for actions menu */
  onEdit: z.function().optional(),
  /** Delete handler for actions menu */
  onDelete: z.function().optional(),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type SetGalleryCardProps = z.infer<typeof SetGalleryCardPropsSchema>

/**
 * Build status label helper
 */
const formatBuildStatus = (isBuilt: boolean | null | undefined) => {
  if (isBuilt) return 'Built'
  return 'Not built yet'
}

/**
 * Build status badge variant
 */
const getBuildStatusVariant = (isBuilt: boolean | null | undefined):
  | 'default'
  | 'secondary'
  | 'outline' => {
  if (isBuilt) return 'default'
  return 'outline'
}

export function SetCard({ set, onClick, onEdit, onDelete, className }: SetGalleryCardProps) {
  const primaryImage = set.images[0]
  const imageSrc = primaryImage?.thumbnailUrl ?? primaryImage?.imageUrl ?? '/images/placeholder-lego.png'

  const subtitle = set.setNumber ? `Set #${set.setNumber}` : undefined

  const metadata = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Piece count */}
      {typeof set.pieceCount === 'number' && (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          data-testid="set-card-pieces"
        >
          <Blocks className="h-3 w-3" aria-hidden="true" />
          <span className="font-mono">{set.pieceCount.toLocaleString()}</span>
          <span>pieces</span>
        </span>
      )}

      {/* Theme */}
      {set.theme && (
        <Badge variant="outline" className="text-xs" data-testid="set-card-theme">
          {set.theme}
        </Badge>
      )}

      {/* Quantity */}
      {typeof set.quantity === 'number' && set.quantity > 1 && (
        <Badge variant="secondary" className="text-xs" data-testid="set-card-quantity">
          x{set.quantity}
        </Badge>
      )}

      {/* Build status with icon */}
      <Badge
        variant={getBuildStatusVariant(set.isBuilt)}
        className="inline-flex items-center gap-1 text-xs"
        data-testid="set-card-build-status"
      >
        {set.isBuilt ? (
          <>
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {formatBuildStatus(set.isBuilt)}
          </>
        ) : (
          <>
            <Blocks className="h-3 w-3" aria-hidden="true" />
            {formatBuildStatus(set.isBuilt)}
          </>
        )}
      </Badge>
    </div>
  )

  const actions = (
    <div className="flex flex-col gap-1" data-testid="set-card-actions">
      <Button
        variant="secondary"
        size="icon"
        className="h-7 w-7"
        type="button"
        aria-label={`View details for ${set.title}`}
        data-testid="set-card-action-view"
        onClick={event => {
          event.stopPropagation()
          onClick?.()
        }}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          type="button"
          aria-label={`Edit ${set.title}`}
          data-testid="set-card-action-edit"
          onClick={event => {
            event.stopPropagation()
            onEdit?.()
          }}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          type="button"
          aria-label={`Delete ${set.title}`}
          data-testid="set-card-action-delete"
          onClick={event => {
            event.stopPropagation()
            onDelete?.()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  )

  return (
    <GalleryCard
      image={{
        src: imageSrc,
        alt: set.title,
        aspectRatio: '4/3',
      }}
      title={set.title}
      subtitle={subtitle}
      metadata={metadata}
      actions={actions}
      onClick={onClick}
      className={className}
      data-testid={`set-card-${set.id}`}
    />
  )
}

export default SetCard
