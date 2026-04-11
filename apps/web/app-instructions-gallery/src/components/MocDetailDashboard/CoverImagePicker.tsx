import { useState, useCallback } from 'react'
import {
  Button,
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
} from '@repo/app-component-library'
import { ImageIcon, Check } from 'lucide-react'
import { logger } from '@repo/logger'
import { useSetCoverImageMutation } from '@repo/api-client/rtk/instructions-api'
import { GalleryCard } from '@repo/gallery'
import type { Moc } from './__types__/moc'

interface CoverImagePickerProps {
  mocId: string
  coverImageUrl: string
  title: string
  galleryImages: Moc['galleryImages']
}

export function CoverImagePicker({
  mocId,
  coverImageUrl,
  title,
  galleryImages,
}: CoverImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [setCoverImage, { isLoading }] = useSetCoverImageMutation()

  const handlePick = useCallback(
    async (fileId: string) => {
      try {
        setSaveError(null)
        setSelectedId(fileId)
        await setCoverImage({ mocId, fileId }).unwrap()
        setIsOpen(false)
        setSelectedId(null)
      } catch (err) {
        logger.error('Failed to set cover image', err)
        setSaveError('Failed to set cover image.')
        setSelectedId(null)
      }
    },
    [mocId, setCoverImage],
  )

  return (
    <>
      <div className="group/cover relative">
        <GalleryCard
          image={
            coverImageUrl
              ? {
                  src: coverImageUrl,
                  alt: `Cover image for ${title}`,
                  aspectRatio: '1/1',
                }
              : undefined
          }
          title={title}
          showContent={false}
        />
        {galleryImages.length > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSaveError(null)
              setIsOpen(true)
            }}
            className="absolute bottom-3 right-3 h-7 text-xs px-2 opacity-0 group-hover/cover:opacity-100 transition-opacity shadow-md"
            aria-label="Change cover image"
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Change cover
          </Button>
        ) : null}
      </div>

      <AppDialog open={isOpen} onOpenChange={setIsOpen}>
        <AppDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AppDialogHeader>
            <AppDialogTitle>Choose cover image</AppDialogTitle>
          </AppDialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
            {galleryImages.map(img => {
              const isSelected = selectedId === img.id
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => handlePick(img.id)}
                  disabled={isLoading}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {isSelected && isLoading ? (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : null}
                  {isSelected && !isLoading ? (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
        </AppDialogContent>
      </AppDialog>
    </>
  )
}
