import { useState, useCallback } from 'react'
import { z } from 'zod'
import { cn } from '@repo/app-component-library'
import { GalleryCardImageSchema, GalleryAspectRatioSchema } from '../types'

/**
 * Schema for GalleryCard component props
 */
export const GalleryCardPropsSchema = z.object({
  /** Image configuration */
  image: GalleryCardImageSchema,
  /** Card title (required) */
  title: z.string().min(1),
  /** Optional subtitle text */
  subtitle: z.string().optional(),
  /** Optional metadata content (badges, counts, etc.) - React.ReactNode can't be validated */
  metadata: z.any().optional(),
  /** Optional action buttons/icons - React.ReactNode can't be validated */
  actions: z.any().optional(),
  /** Click handler for card selection/navigation */
  onClick: z.function().optional(),
  /** Optional href for link-based navigation */
  href: z.string().optional(),
  /** Whether the card is in selected state */
  selected: z.boolean().optional(),
  /** Whether the card is in loading state */
  loading: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Test ID for testing purposes */
  'data-testid': z.string().optional(),
})

/**
 * Props for the GalleryCard component
 */
export type GalleryCardProps = z.infer<typeof GalleryCardPropsSchema> & {
  /** Optional metadata content (badges, counts, etc.) */
  metadata?: React.ReactNode
  /** Optional action buttons/icons */
  actions?: React.ReactNode
}

/** Maps aspect ratio to Tailwind classes */
const aspectRatioClassMap: Record<string, string> = {
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  '1/1': 'aspect-square',
  auto: '',
}

/**
 * A base gallery card component for displaying items with images.
 * Designed to be extended for specific gallery types (MOCs, Wishlist, etc.).
 *
 * @example
 * ```tsx
 * // Basic usage
 * <GalleryCard
 *   image={{ src: '/image.jpg', alt: 'Description' }}
 *   title="Item Title"
 *   subtitle="Subtitle text"
 *   onClick={() => handleClick(item)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Extended usage with slots
 * <GalleryCard
 *   image={{ src: '/moc.jpg', alt: 'MOC Image' }}
 *   title="MOC Title"
 *   metadata={<Badge>500 pieces</Badge>}
 *   actions={
 *     <Button variant="ghost" size="icon">
 *       <Heart />
 *     </Button>
 *   }
 * />
 * ```
 */
export const GalleryCard = ({
  image,
  title,
  subtitle,
  metadata,
  actions,
  onClick,
  href,
  selected = false,
  loading = false,
  className,
  'data-testid': testId = 'gallery-card',
}: GalleryCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const aspectRatioClass = aspectRatioClassMap[image.aspectRatio ?? '4/3']
  const isInteractive = Boolean(onClick ?? href)

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(true)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onClick?.()
      }
    },
    [isInteractive, onClick],
  )

  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  // Determine the wrapper element
  const WrapperElement = href ? 'a' : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <WrapperElement
      {...wrapperProps}
      role={isInteractive ? 'button' : 'article'}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={isInteractive ? `${title}${subtitle ? ` - ${subtitle}` : ''}` : undefined}
      aria-selected={selected}
      data-testid={testId}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      className={cn(
        // Base card styles
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm',
        // Interactive states
        isInteractive && [
          'cursor-pointer',
          'outline-none',
          'ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Hover effects
          'transition-all duration-200 ease-in-out',
          'hover:shadow-lg hover:scale-[1.02]',
        ],
        // Selected state
        selected && 'ring-2 ring-primary ring-offset-2',
        // Loading state
        loading && 'animate-pulse pointer-events-none',
        className,
      )}
    >
      {/* Image Container */}
      <div className={cn('relative w-full overflow-hidden bg-muted', aspectRatioClass)}>
        {/* Loading skeleton */}
        {!imageLoaded && !imageError && (
          <div
            className="absolute inset-0 bg-muted animate-pulse"
            data-testid={`${testId}-image-skeleton`}
          />
        )}

        {/* Image */}
        {!imageError ? (
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={cn(
              'h-full w-full object-cover',
              'transition-all duration-300',
              'group-hover:scale-105',
              !imageLoaded && 'opacity-0',
              imageLoaded && 'opacity-100',
            )}
            data-testid={`${testId}-image`}
          />
        ) : (
          // Error fallback
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
            data-testid={`${testId}-image-error`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Actions overlay (top-right) */}
        {actions ? (
          <div
            role="group"
            aria-label="Card actions"
            className={cn(
              'absolute top-2 right-2 z-10',
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
              'transition-opacity duration-200',
            )}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            data-testid={`${testId}-actions`}
          >
            {actions}
          </div>
        ) : null}
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-1 p-4">
        {/* Title */}
        <h3
          className="font-semibold text-base leading-tight line-clamp-2"
          data-testid={`${testId}-title`}
        >
          {title}
        </h3>

        {/* Subtitle */}
        {subtitle ? (
          <p
            className="text-sm text-muted-foreground line-clamp-1"
            data-testid={`${testId}-subtitle`}
          >
            {subtitle}
          </p>
        ) : null}

        {/* Metadata slot */}
        {metadata ? (
          <div
            className="mt-2 flex flex-wrap items-center gap-2"
            data-testid={`${testId}-metadata`}
          >
            {metadata}
          </div>
        ) : null}
      </div>
    </WrapperElement>
  )
}

/**
 * Schema for GalleryCardSkeleton component props
 */
export const GalleryCardSkeletonPropsSchema = z.object({
  aspectRatio: GalleryAspectRatioSchema.optional(),
  className: z.string().optional(),
  'data-testid': z.string().optional(),
})

export type GalleryCardSkeletonProps = z.infer<typeof GalleryCardSkeletonPropsSchema>

/**
 * Skeleton loading state for GalleryCard
 */
export const GalleryCardSkeleton = ({
  aspectRatio = '4/3',
  className,
  'data-testid': testId = 'gallery-card-skeleton',
}: GalleryCardSkeletonProps) => {
  const aspectRatioClass = aspectRatioClassMap[aspectRatio]

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm animate-pulse',
        className,
      )}
      data-testid={testId}
    >
      {/* Image skeleton */}
      <div className={cn('w-full bg-muted', aspectRatioClass)} />

      {/* Content skeleton */}
      <div className="flex flex-col gap-2 p-4">
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-12 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  )
}
