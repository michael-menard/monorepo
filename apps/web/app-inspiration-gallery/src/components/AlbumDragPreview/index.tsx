/**
 * AlbumDragPreview Component
 *
 * Renders a preview of the album card being dragged.
 * Used in DragOverlay for visual feedback during drag operations.
 *
 * INSP-011-A: Drag-and-Drop (dnd-kit)
 */

import { z } from 'zod'
import { Card, CardContent, cn } from '@repo/app-component-library'
import { Folder } from 'lucide-react'

/**
 * Album preview data schema
 */
const AlbumPreviewDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  coverImageUrl: z.string().nullable().optional(),
  itemCount: z.number().int().optional(),
})

export type AlbumPreviewData = z.infer<typeof AlbumPreviewDataSchema>

/**
 * AlbumDragPreview props
 */
export interface AlbumDragPreviewProps {
  /** The album data to preview */
  item: AlbumPreviewData | null
  /** Additional CSS classes */
  className?: string
}

/**
 * AlbumDragPreview Component
 *
 * Renders a preview card during drag operations:
 * - Stacked card effect
 * - Slight rotation for visual distinction
 * - Elevated shadow
 */
export function AlbumDragPreview({ item, className }: AlbumDragPreviewProps) {
  if (!item) {
    return null
  }

  return (
    <div className="relative">
      {/* Stacked cards effect (behind the main card) */}
      <div
        className={cn(
          'absolute inset-0 transform translate-x-1 translate-y-1 rounded-lg bg-muted/50',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 transform translate-x-0.5 translate-y-0.5 rounded-lg bg-muted/70',
        )}
      />

      <Card
        className={cn(
          'w-48 rotate-3 shadow-2xl cursor-grabbing relative',
          'ring-2 ring-primary',
          className,
        )}
        data-testid="album-drag-preview"
      >
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {item.coverImageUrl ? (
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <Folder className="h-12 w-12 text-primary/40" />
              </div>
            )}
            {/* Title overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs font-medium truncate">{item.title}</p>
              {item.itemCount !== undefined && (
                <p className="text-white/80 text-xs">
                  {item.itemCount} item{item.itemCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AlbumDragPreview
