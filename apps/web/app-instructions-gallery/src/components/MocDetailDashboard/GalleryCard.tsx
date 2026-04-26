import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/app-component-library'
import { ImageIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import type { MocGalleryImage } from './__types__/moc'

interface GalleryCardProps {
  galleryImages: MocGalleryImage[]
}

export function GalleryCard({ galleryImages }: GalleryCardProps) {
  const safeImages = galleryImages ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [imgError, setImgError] = useState(false)

  const currentImage = openIndex != null ? safeImages[openIndex] : null
  const isOpen = openIndex != null

  const goToPrevious = useCallback(() => {
    if (openIndex == null || safeImages.length <= 1) return
    setImgError(false)
    setOpenIndex(openIndex === 0 ? safeImages.length - 1 : openIndex - 1)
  }, [openIndex, safeImages.length])

  const goToNext = useCallback(() => {
    if (openIndex == null || safeImages.length <= 1) return
    setImgError(false)
    setOpenIndex(openIndex === safeImages.length - 1 ? 0 : openIndex + 1)
  }, [openIndex, safeImages.length])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, goToPrevious, goToNext])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOpenIndex(null)
      setImgError(false)
    }
  }

  return (
    <DashboardCard
      id="gallery"
      title="Gallery"
      titleIcon={<ImageIcon className="h-4 w-4 text-sky-500" />}
      badge={
        <span className="text-sm font-normal text-muted-foreground">({safeImages.length}/50)</span>
      }
    >
      {safeImages.length === 0 ? (
        <div className="text-center py-4">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No gallery images linked yet.</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
          role="list"
          aria-label="Gallery images"
        >
          {safeImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setOpenIndex(index)
              }}
              className="group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img
                src={image.url}
                alt={`Gallery image ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          style={{
            maxWidth: '48rem',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Gallery image {openIndex != null ? openIndex + 1 : ''} of {safeImages.length}
            </DialogTitle>
          </DialogHeader>
          <div
            className="relative mt-4 flex items-center justify-center"
            style={{ minHeight: '200px' }}
          >
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {currentImage && !imgError ? (
              <img
                src={currentImage.url}
                alt={`Gallery image ${openIndex != null ? openIndex + 1 : ''} of ${safeImages.length}`}
                className="w-full object-contain rounded-lg"
                style={{ maxHeight: '70vh' }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">Image could not be loaded</p>
                {currentImage && (
                  <a
                    href={currentImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline break-all"
                  >
                    Open directly
                  </a>
                )}
              </div>
            )}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  )
}
