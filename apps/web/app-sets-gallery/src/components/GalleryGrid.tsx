/**
 * GalleryGrid Component
 * Grid layout wrapper for gallery items
 */
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const GalleryGridPropsSchema = z.object({
  items: z.array(z.any()),
  isLoading: z.boolean().optional(),
  children: z.function(),
  className: z.string().optional(),
})

export type GalleryGridProps<T> = {
  items: T[]
  isLoading?: boolean
  children: (item: T) => React.ReactNode
  className?: string
}

/**
 * GalleryGrid Component
 * Renders items in a responsive grid layout
 */
export function GalleryGrid<T>({
  items,
  isLoading = false,
  children,
  className,
}: GalleryGridProps<T>) {
  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <svg
            className="mx-auto h-12 w-12 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-medium mb-1">No sets found</p>
          <p className="text-sm">Add your first set to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        className ||
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
      }
      data-testid="gallery-grid"
    >
      {items.map((item, index) => (
        <div key={index} className="relative">
          {children(item)}
        </div>
      ))}
    </div>
  )
}

export default GalleryGrid