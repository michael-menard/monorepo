import { cn } from '@repo/app-component-library'

/**
 * Props for the GalleryEndOfResults component
 */
export interface GalleryEndOfResultsProps {
  /** Total count of items (optional) */
  totalCount?: number
  /** Custom message to display */
  message?: string
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * An end-of-results indicator shown when all items have been loaded.
 *
 * @example
 * ```tsx
 * {!hasMore && items.length > 0 && (
 *   <GalleryEndOfResults totalCount={totalCount} />
 * )}
 * ```
 */
export const GalleryEndOfResults = ({
  totalCount,
  message,
  className,
  'data-testid': testId = 'gallery-end-of-results',
}: GalleryEndOfResultsProps) => {
  // Build the display message
  const displayMessage = message
    ? message
    : totalCount !== undefined
      ? `Showing all ${totalCount} ${totalCount === 1 ? 'item' : 'items'}`
      : "You've reached the end"

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-8 text-center', className)}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* Decorative divider */}
      <div className="mb-4 flex items-center gap-4">
        <div className="h-px w-16 bg-border" aria-hidden="true" />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div className="h-px w-16 bg-border" aria-hidden="true" />
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground" data-testid={`${testId}-message`}>
        {displayMessage}
      </p>
    </div>
  )
}
