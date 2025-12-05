import { useState, useCallback, useEffect } from 'react'

/**
 * Return type for useLightbox hook
 */
export interface UseLightboxReturn {
  /** Whether the lightbox is currently open */
  open: boolean
  /** Index of the currently displayed image */
  currentIndex: number
  /** Open the lightbox at a specific image index */
  openLightbox: (index: number) => void
  /** Close the lightbox */
  closeLightbox: () => void
  /** Navigate to next image (wraps around) */
  next: () => void
  /** Navigate to previous image (wraps around) */
  prev: () => void
  /** Navigate to a specific image index */
  goTo: (index: number) => void
  /** Whether there are multiple images to navigate */
  hasMultipleImages: boolean
  /** Current position display string (e.g., "3 of 10") */
  positionDisplay: string
}

/**
 * Hook for managing lightbox state and navigation.
 * Provides open/close state, navigation between images, and keyboard handling.
 *
 * @param totalImages - Total number of images in the gallery
 * @returns Object with state and navigation functions
 *
 * @example
 * ```tsx
 * const images = [{ src: '/img1.jpg', alt: 'Image 1' }, ...]
 * const lightbox = useLightbox(images.length)
 *
 * <GalleryGrid>
 *   {images.map((image, index) => (
 *     <GalleryCard
 *       key={index}
 *       image={image}
 *       onClick={() => lightbox.openLightbox(index)}
 *     />
 *   ))}
 * </GalleryGrid>
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
export function useLightbox(totalImages: number): UseLightboxReturn {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openLightbox = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalImages - 1)))
      setOpen(true)
    },
    [totalImages],
  )

  const closeLightbox = useCallback(() => {
    setOpen(false)
  }, [])

  const next = useCallback(() => {
    if (totalImages <= 1) return
    setCurrentIndex(i => (i + 1) % totalImages)
  }, [totalImages])

  const prev = useCallback(() => {
    if (totalImages <= 1) return
    setCurrentIndex(i => (i - 1 + totalImages) % totalImages)
  }, [totalImages])

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalImages - 1)))
    },
    [totalImages],
  )

  // Keyboard navigation when lightbox is open
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        // Escape is handled by Dialog component
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, next, prev])

  const hasMultipleImages = totalImages > 1
  const positionDisplay = `${currentIndex + 1} of ${totalImages}`

  return {
    open,
    currentIndex,
    openLightbox,
    closeLightbox,
    next,
    prev,
    goTo,
    hasMultipleImages,
    positionDisplay,
  }
}
