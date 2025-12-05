import { cn } from '@repo/app-component-library'
import { ImageIcon } from 'lucide-react'

/**
 * Props for the GalleryEmptyState component
 */
export interface GalleryEmptyStateProps {
  /** Custom icon component to display */
  icon?: React.ComponentType<{ className?: string }>
  /** Title text (required) */
  title: string
  /** Optional description text */
  description?: string
  /** Optional action button configuration */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * Empty state component for galleries when no items exist.
 * Displays an icon, title, optional description, and optional action button.
 *
 * @example
 * ```tsx
 * <GalleryEmptyState
 *   icon={ImageIcon}
 *   title="No instructions yet"
 *   description="Upload your first MOC instructions to get started."
 *   action={{
 *     label: "Upload Instructions",
 *     onClick: () => navigate('/upload')
 *   }}
 * />
 * ```
 */
export const GalleryEmptyState = ({
  icon: Icon = ImageIcon,
  title,
  description,
  action,
  className,
  'data-testid': testId = 'gallery-empty-state',
}: GalleryEmptyStateProps) => {
  return (
    <div
      role="status"
      aria-label={title}
      data-testid={testId}
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4" data-testid={`${testId}-icon`}>
        <Icon className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-foreground" data-testid={`${testId}-title`}>
        {title}
      </h3>

      {/* Description */}
      {description ? (
        <p
          className="mt-2 max-w-md text-sm text-muted-foreground"
          data-testid={`${testId}-description`}
        >
          {description}
        </p>
      ) : null}

      {/* Action Button */}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'mt-6 inline-flex items-center justify-center',
            'rounded-md bg-primary px-4 py-2',
            'text-sm font-medium text-primary-foreground',
            'transition-colors hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          data-testid={`${testId}-action`}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
