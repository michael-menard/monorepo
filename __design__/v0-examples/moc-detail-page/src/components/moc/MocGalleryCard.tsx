"use client"

import type React from "react"
import { useRef, useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Upload, Trash2, GripVertical, ChevronLeft, ChevronRight, X, Loader2, ImageIcon } from "lucide-react"
import { validateImageFile, IMAGE_MAX_SIZE_MB, GALLERY_MAX_IMAGES, type MocImage } from "./mocTypes"

interface MocGalleryCardContentProps {
  galleryImages: MocImage[]
  isLoading?: boolean
}

export function MocGalleryCardContent({ galleryImages: initialImages, isLoading = false }: MocGalleryCardContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [localImages, setLocalImages] = useState<MocImage[]>(initialImages)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const isAtMax = localImages.length >= GALLERY_MAX_IMAGES

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      e.target.value = ""

      const remainingSlots = GALLERY_MAX_IMAGES - localImages.length
      if (files.length > remainingSlots) {
        setValidationErrors([`Can only upload ${remainingSlots} more image(s). Maximum is ${GALLERY_MAX_IMAGES}.`])
        return
      }

      const errors: string[] = []
      const validFiles: File[] = []

      for (const file of files) {
        const error = validateImageFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
        } else {
          validFiles.push(file)
        }
      }

      setValidationErrors(errors)

      if (validFiles.length > 0) {
        setIsUploading(true)
        setTimeout(() => {
          const newImages = validFiles.map((file, i) => ({
            id: `new-${Date.now()}-${i}`,
            url: URL.createObjectURL(file),
          }))
          setLocalImages((prev) => [...prev, ...newImages])
          setIsUploading(false)
        }, 500)
      }
    },
    [localImages.length],
  )

  const handleDelete = useCallback((imageId: string) => {
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId))
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Lightbox navigation
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const goToPrevious = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + localImages.length) % localImages.length : null))
  }, [localImages.length])

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % localImages.length : null))
  }, [localImages.length])

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious()
      else if (e.key === "ArrowRight") goToNext()
      else if (e.key === "Escape") closeLightbox()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lightboxIndex, goToPrevious, goToNext, closeLightbox])

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newImages = [...localImages]
    const [draggedItem] = newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedItem)
    setLocalImages(newImages)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const renderSkeletonGrid = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  )

  if (isLoading) {
    return renderSkeletonGrid()
  }

  const currentImage = lightboxIndex !== null ? localImages[lightboxIndex] : null

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading || isAtMax}
          className="transition-all hover:scale-105 active:scale-95"
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Upload
        </Button>
      </div>

      {validationErrors.length > 0 && (
        <div
          className="space-y-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in duration-300"
          role="alert"
        >
          {validationErrors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {isAtMax && (
        <p
          className="text-sm text-amber-600 dark:text-amber-400 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in duration-300"
          role="status"
        >
          Maximum of {GALLERY_MAX_IMAGES} images reached. Remove images to upload more.
        </p>
      )}

      {localImages.length === 0 ? (
        <>
          {renderSkeletonGrid()}
          <div className="text-center py-4">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Upload gallery images to get started</p>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3" role="list" aria-label="Gallery images">
          {localImages.map((image, index) => (
            <div
              key={image.id}
              role="listitem"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-muted cursor-grab active:cursor-grabbing transition-all duration-200 ring-2 ring-transparent hover:ring-primary/50 hover:scale-105 hover:shadow-lg animate-in fade-in zoom-in-95 ${
                draggedIndex === index ? "opacity-50 ring-primary scale-95" : ""
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-background/90 backdrop-blur p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </div>

              <button
                type="button"
                onClick={() => openLightbox(index)}
                className="h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`View image ${index + 1} in lightbox`}
              >
                <img
                  src={image.url || "/placeholder.svg"}
                  alt={`Gallery image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </button>

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(image.id)
                }}
                aria-label={`Delete image ${index + 1}`}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">JPEG or HEIC, max {IMAGE_MAX_SIZE_MB}MB each • Drag to reorder</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.heic,image/jpeg,image/heic"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload gallery images"
      />

      {/* Lightbox Dialog with animations */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-5xl p-0 bg-background/95 backdrop-blur-xl border-border overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <VisuallyHidden>
            <DialogTitle>Image lightbox</DialogTitle>
            <DialogDescription>
              Viewing image {lightboxIndex !== null ? lightboxIndex + 1 : 0} of {localImages.length}
            </DialogDescription>
          </VisuallyHidden>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-10 hover:bg-muted transition-all hover:scale-110"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>

          {localImages.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                onClick={goToPrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                onClick={goToNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </Button>
            </>
          )}

          {currentImage && (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
              <img
                src={currentImage.url || "/placeholder.svg"}
                alt={`Gallery image ${(lightboxIndex ?? 0) + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-lg animate-in fade-in zoom-in-95 duration-300"
              />
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium">
            {(lightboxIndex ?? 0) + 1} / {localImages.length}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
