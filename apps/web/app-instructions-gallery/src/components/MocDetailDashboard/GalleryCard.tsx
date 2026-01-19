import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/app-component-library'
import { ImageIcon } from 'lucide-react'
import { DashboardCard } from './DashboardCard'
import type { MocGalleryImage } from './__types__/moc'

interface GalleryCardProps {
  galleryImages: MocGalleryImage[]
}

export function GalleryCard({ galleryImages }: GalleryCardProps) {
  const safeImages = galleryImages ?? []
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const currentImage = openIndex != null ? safeImages[openIndex] : null

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
              onClick={() => setOpenIndex(index)}
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

      <Dialog open={openIndex != null} onOpenChange={open => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gallery image</DialogTitle>
          </DialogHeader>
          {currentImage ? (
            <div className="mt-4 flex items-center justify-center">
              <img
                src={currentImage.url}
                alt="Selected gallery image"
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardCard>
  )
}
