import { AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { cn, Button } from '@repo/app-component-library'

export const GalleryTableErrorPropsSchema = z.object({
  error: z.instanceof(Error),
  onRetry: z.function(z.tuple([]), z.void()).optional(),
  isRetrying: z.boolean().optional().default(false),
  className: z.string().optional(),
})

export type GalleryTableErrorProps = z.infer<typeof GalleryTableErrorPropsSchema>

export function GalleryTableError({
  error,
  onRetry,
  isRetrying = false,
  className,
}: GalleryTableErrorProps) {
  // Mark error as used for TypeScript while keeping UI generic
  void error

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
      role="alert"
      aria-live="assertive"
      data-testid="gallery-table-error"
    >
      <div
        className="mb-4 rounded-full bg-destructive/10 p-4"
        data-testid="gallery-table-error-icon"
      >
        <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      </div>

      <h3
        className="text-lg font-semibold text-foreground mb-2"
        data-testid="gallery-table-error-title"
      >
        Failed to load items
      </h3>
      <p
        className="text-sm text-muted-foreground mb-4 max-w-md"
        data-testid="gallery-table-error-description"
      >
        Something went wrong while loading your wishlist. Please try again.
      </p>

      {onRetry ? (
        <Button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          aria-label="Try loading again"
          data-testid="gallery-table-error-retry"
        >
          {isRetrying ? 'Loading…' : 'Try Again'}
        </Button>
      ) : null}
    </div>
  )
}
