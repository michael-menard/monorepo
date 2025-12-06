/**
 * Instructions Detail Page
 *
 * Displays full details of a single instruction including images, metadata, and actions.
 * Story 3.1.4: Instructions Detail Page
 */
import { useCallback, useMemo } from 'react'
import { ArrowLeft, Heart, Pencil, Download, BookOpen } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Skeleton,
} from '@repo/app-component-library'
import { GalleryGrid, GalleryLightbox, useLightbox, type LightboxImage } from '@repo/gallery'
import type { Instruction } from '../__types__'

export interface DetailPageProps {
  /** The instruction data to display */
  instruction: Instruction | null
  /** Whether the data is loading */
  isLoading?: boolean
  /** Error message if data failed to load */
  error?: string | null
  /** Handler for back navigation */
  onBack?: () => void
  /** Handler for edit action */
  onEdit?: (id: string) => void
  /** Handler for favorite toggle */
  onFavorite?: (id: string) => void
  /** Handler for delete action */
  onDelete?: (id: string) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Loading skeleton for the detail page
 */
export function DetailPageSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="detail-page-skeleton">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-8 w-64 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images skeleton */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div>
                <Skeleton className="h-4 w-12 mb-2" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Not found state for the detail page
 */
export function DetailPageNotFound({ onBack }: { onBack?: () => void }) {
  return (
    <div className="container mx-auto py-6" data-testid="detail-page-not-found">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Instruction Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The instruction you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Detail Page Component
 *
 * Displays instruction details with image gallery, metadata sidebar, and actions.
 */
export function DetailPage({
  instruction,
  isLoading,
  error,
  onBack,
  onEdit,
  onFavorite,
  className,
}: DetailPageProps) {
  // Prepare images for lightbox
  const lightboxImages: LightboxImage[] = useMemo(() => {
    if (!instruction) return []

    // If instruction has images array, use that; otherwise use thumbnail as single image
    const imageUrls = instruction.images?.length ? instruction.images : [instruction.thumbnail]

    return imageUrls.map((src, index) => ({
      src,
      alt: `${instruction.name} - Image ${index + 1}`,
      title: index === 0 ? instruction.name : undefined,
    }))
  }, [instruction])

  const lightbox = useLightbox(lightboxImages.length)

  const handleFavorite = useCallback(() => {
    if (instruction && onFavorite) {
      onFavorite(instruction.id)
    }
  }, [instruction, onFavorite])

  const handleEdit = useCallback(() => {
    if (instruction && onEdit) {
      onEdit(instruction.id)
    }
  }, [instruction, onEdit])

  // Loading state
  if (isLoading) {
    return <DetailPageSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-6" data-testid="detail-page-error">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <p className="text-destructive">{error}</p>
          {onBack ? (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gallery
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  // Not found state
  if (!instruction) {
    return <DetailPageNotFound onBack={onBack} />
  }

  return (
    <div className={cn('container mx-auto py-6', className)} data-testid="detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack ? (
          <Button
            variant="ghost"
            onClick={onBack}
            data-testid="back-button"
            aria-label="Back to gallery"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : null}

        <h1 className="text-2xl font-bold flex-1" data-testid="instruction-title">
          {instruction.name}
        </h1>

        <div className="flex gap-2">
          {onEdit ? (
            <Button variant="outline" onClick={handleEdit} data-testid="edit-button">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : null}

          {onFavorite ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              aria-label={instruction.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              data-testid="favorite-button"
            >
              <Heart
                className={cn('h-5 w-5', instruction.isFavorite && 'fill-current text-red-500')}
              />
            </Button>
          ) : null}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images Gallery */}
        <div className="lg:col-span-2" data-testid="images-section">
          {lightboxImages.length > 0 ? (
            <GalleryGrid columns={{ sm: 2, md: 3 }}>
              {lightboxImages.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
                  onClick={() => lightbox.openLightbox(index)}
                  aria-label={`View ${image.alt}`}
                  data-testid={`image-thumbnail-${index}`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                </button>
              ))}
            </GalleryGrid>
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">No images available</p>
            </div>
          )}
        </div>

        {/* Metadata Sidebar */}
        <div className="space-y-6" data-testid="metadata-section">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Piece Count */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Piece Count</label>
                <p className="text-lg font-semibold" data-testid="piece-count">
                  {instruction.pieceCount.toLocaleString()} pieces
                </p>
              </div>

              {/* Theme */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Theme</label>
                <div className="mt-1">
                  <Badge data-testid="theme-badge">{instruction.theme}</Badge>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1" data-testid="tags-list">
                  {instruction.tags.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description (if available) */}
              {instruction.description ? (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1" data-testid="description">
                    {instruction.description}
                  </p>
                </div>
              ) : null}

              {/* Created Date */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Added</label>
                <p className="text-sm" data-testid="created-date">
                  {new Date(instruction.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* PDF Download (if available) */}
              {instruction.pdfUrl ? (
                <Button className="w-full" asChild data-testid="download-pdf-button">
                  <a href={instruction.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      <GalleryLightbox
        images={lightboxImages}
        open={lightbox.open}
        currentIndex={lightbox.currentIndex}
        onOpenChange={open => !open && lightbox.closeLightbox()}
        onNext={lightbox.next}
        onPrev={lightbox.prev}
        data-testid="lightbox"
      />
    </div>
  )
}

export default DetailPage
