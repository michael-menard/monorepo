import { useCallback, useState } from 'react'
import {
  cn,
  AppDialog,
  AppDialogContent,
  AppDialogTitle,
  AppDialogDescription,
  Button,
} from '@repo/app-component-library'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

/**
 * Image configuration for lightbox
 */
export interface LightboxImage {
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Optional title displayed below image */
  title?: string
}

/**
 * Props for the GalleryLightbox component
 */
export interface GalleryLightboxProps {
  /** Array of images to display */
  images: LightboxImage[]
  /** Whether the lightbox is open */
  open: boolean
  /** Current image index */
  currentIndex: number
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback to navigate to next image */
  onNext?: () => void
  /** Callback to navigate to previous image */
  onPrev?: () => void
  /** Optional callback when index changes */
  onIndexChange?: (index: number) => void
  /** Additional CSS classes */
  className?: string
  /** Test ID for testing purposes */
  'data-testid'?: string
}

/**
 * A modal lightbox component for viewing gallery images.
 * Uses Dialog for accessible modal behavior with navigation controls.
 * Controls are hidden until hover for a clean viewing experience.
 *
 * @example
 * ```tsx
 * const lightbox = useLightbox(images.length)
 *
 * <GalleryLightbox
 *   images={images}
 *   open={lightbox.open}
 *   currentIndex={lightbox.currentIndex}
 *   onOpenChange={(open) => !open && lightbox.closeLightbox()}
 *   onNext={lightbox.next}
 *   onPrev={lightbox.prev}
 * />
 * ```
 */
export const GalleryLightbox = ({
  images,
  open,
  currentIndex,
  onOpenChange,
  onNext,
  onPrev,
  // onIndexChange is available via props for future use
  className,
  'data-testid': testId = 'gallery-lightbox',
}: GalleryLightboxProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const currentImage = images[currentIndex]
  const hasMultipleImages = images.length > 1
  const positionDisplay = `${currentIndex + 1} of ${images.length}`

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
  }, [])

  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(true)
  }, [])

  // Reset image state when current index changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setImageLoaded(false)
        setImageError(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange],
  )

  const handlePrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setImageLoaded(false)
      setImageError(false)
      onPrev?.()
    },
    [onPrev],
  )

  const handleNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setImageLoaded(false)
      setImageError(false)
      onNext?.()
    },
    [onNext],
  )

  if (!currentImage) {
    return null
  }

  return (
    <AppDialog open={open} onOpenChange={handleOpenChange}>
      <AppDialogContent
        size="xl"
        className={cn(
          'group/lightbox p-0 gap-0 overflow-hidden bg-black/95 backdrop-blur-sm border-none',
          'max-h-[90vh]',
          className,
        )}
        data-testid={testId}
      >
        {/* Visually hidden title for accessibility */}
        <AppDialogTitle className="sr-only">
          {currentImage.title || currentImage.alt || 'Image viewer'}
        </AppDialogTitle>
        <AppDialogDescription className="sr-only">
          {hasMultipleImages
            ? `Viewing image ${positionDisplay}. Use arrow keys or buttons to navigate.`
            : 'Viewing image. Press Escape to close.'}
        </AppDialogDescription>

        {/* Full-area image container */}
        <div className="relative flex items-center justify-center min-h-[400px] max-h-[90vh]">
          {/* Close button - hidden until hover */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(false)}
            className={cn(
              'absolute top-3 right-3 z-20 h-10 w-10 rounded-full',
              'bg-black/60 hover:bg-black/80 text-white',
              'opacity-0 group-hover/lightbox:opacity-100 focus:opacity-100',
              'transition-opacity duration-200',
            )}
            aria-label="Close lightbox"
            data-testid={`${testId}-close`}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Counter overlay - hidden until hover */}
          {hasMultipleImages ? (
            <div
              className={cn(
                'absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full',
                'bg-black/60 text-white text-sm',
                'opacity-0 group-hover/lightbox:opacity-100',
                'transition-opacity duration-200',
              )}
              data-testid={`${testId}-counter`}
            >
              {positionDisplay}
            </div>
          ) : null}

          {/* Previous button - hidden until hover */}
          {hasMultipleImages && onPrev ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className={cn(
                'absolute left-3 z-20 h-12 w-12 rounded-full',
                'bg-black/60 hover:bg-black/80 text-white',
                'opacity-0 group-hover/lightbox:opacity-100 focus:opacity-100',
                'transition-opacity duration-200',
              )}
              aria-label="Previous image"
              data-testid={`${testId}-prev`}
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
          ) : null}

          {/* Image */}
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Loading state */}
            {!imageLoaded && !imageError && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                data-testid={`${testId}-loading`}
              >
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              </div>
            )}

            {/* Image */}
            {!imageError ? (
              <img
                key={currentImage.src}
                src={currentImage.src}
                alt={currentImage.alt}
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={cn(
                  'max-w-full max-h-[90vh] object-contain',
                  'transition-opacity duration-200',
                  !imageLoaded && 'opacity-0',
                  imageLoaded && 'opacity-100',
                )}
                data-testid={`${testId}-image`}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 text-white/70 py-12"
                data-testid={`${testId}-error`}
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
                <span className="text-sm">Failed to load image</span>
              </div>
            )}
          </div>

          {/* Next button - hidden until hover */}
          {hasMultipleImages && onNext ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className={cn(
                'absolute right-3 z-20 h-12 w-12 rounded-full',
                'bg-black/60 hover:bg-black/80 text-white',
                'opacity-0 group-hover/lightbox:opacity-100 focus:opacity-100',
                'transition-opacity duration-200',
              )}
              aria-label="Next image"
              data-testid={`${testId}-next`}
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          ) : null}

          {/* Title overlay - hidden until hover */}
          {currentImage.title ? (
            <div
              className={cn(
                'absolute bottom-3 left-1/2 -translate-x-1/2 z-20',
                'px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium',
                'opacity-0 group-hover/lightbox:opacity-100',
                'transition-opacity duration-200',
                'max-w-[80%] truncate',
              )}
              data-testid={`${testId}-title`}
            >
              {currentImage.title}
            </div>
          ) : null}
        </div>
      </AppDialogContent>
    </AppDialog>
  )
}
