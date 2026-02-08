/**
 * InspirationDragPreview Component
 *
 * Renders a preview of the inspiration card being dragged.
 * Used in DragOverlay for visual feedback during drag operations.
 *
 * INSP-011-A: Drag-and-Drop (dnd-kit)
 */

import { z } from 'zod'
import { Card, CardContent, cn } from '@repo/app-component-library'

/**
 * Inspiration preview data schema
 */
const InspirationPreviewDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable().optional(),
})

export type InspirationPreviewData = z.infer<typeof InspirationPreviewDataSchema>

/**
 * InspirationDragPreview props
 */
export interface InspirationDragPreviewProps {
  /** The inspiration data to preview */
  item: InspirationPreviewData | null
  /** Additional CSS classes */
  className?: string
}

/**
 * InspirationDragPreview Component
 *
 * Renders a preview card during drag operations:
 * - Slight rotation for visual distinction
 * - Elevated shadow
 * - Scaled slightly larger than original
 */
export function InspirationDragPreview({ item, className }: InspirationDragPreviewProps) {
  if (!item) {
    return null
  }

  const displayImage = item.thumbnailUrl || item.imageUrl

  return (
    <Card
      className={cn('w-48 rotate-3 shadow-2xl cursor-grabbing', 'ring-2 ring-primary', className)}
      data-testid="inspiration-drag-preview"
    >
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <img src={displayImage} alt={item.title} className="h-full w-full object-cover" />
          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-white text-xs font-medium truncate">{item.title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InspirationDragPreview
