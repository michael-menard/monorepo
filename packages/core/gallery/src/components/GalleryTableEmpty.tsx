import { z } from 'zod'
import { Inbox, SearchX } from 'lucide-react'
import { cn, Button } from '@repo/app-component-library'

export const GalleryTableEmptyPropsSchema = z.object({
  variant: z.enum(['no-items', 'no-results']),
  onClearFilters: z.function().args().returns(z.void()).optional(),
  onAddItem: z.function().args().returns(z.void()).optional(),
  className: z.string().optional(),
})

export type GalleryTableEmptyProps = z.infer<typeof GalleryTableEmptyPropsSchema>

export function GalleryTableEmpty({
  variant,
  onClearFilters,
  onAddItem,
  className,
}: GalleryTableEmptyProps) {
  const isNoItems = variant === 'no-items'

  const title = isNoItems ? 'Your wishlist is empty' : 'No results match your filters'
  const description = isNoItems
    ? 'Start adding items to organize your LEGO wishlist.'
    : 'Try adjusting your filters or clearing them to see more items.'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
      data-testid="gallery-table-empty"
    >
      <div className="mb-4 rounded-full bg-muted p-4" data-testid="gallery-table-empty-icon">
        {isNoItems ? (
          <Inbox className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        ) : (
          <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-foreground" data-testid="gallery-table-empty-title">
        {title}
      </h3>

      <p
        className="mt-2 max-w-md text-sm text-muted-foreground"
        data-testid="gallery-table-empty-description"
      >
        {description}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {isNoItems && onAddItem ? (
          <Button
            type="button"
            onClick={onAddItem}
            className="min-w-[140px]"
            data-testid="gallery-table-empty-add-item"
          >
            Add Item
          </Button>
        ) : null}

        {!isNoItems && onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            onClick={onClearFilters}
            className="min-w-[140px]"
            data-testid="gallery-table-empty-clear-filters"
          >
            Clear Filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}
