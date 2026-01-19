/**
 * Set Detail Page
 *
 * Displays detailed information about a specific set using the real Sets API.
 * Story sets-2001: Sets Gallery MVP (Detail View)
 */

import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { ArrowLeft, Edit, Trash2, Blocks, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  cn,
} from '@repo/app-component-library'
import { GalleryGrid, GalleryLightbox, useLightbox, type LightboxImage } from '@repo/gallery'
import { useGetSetByIdQuery } from '@repo/api-client/rtk/sets-api'
import type { Set } from '@repo/api-client/schemas/sets'
import { logger } from '@repo/logger'

const SetDetailPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type SetDetailPageProps = z.infer<typeof SetDetailPagePropsSchema>

function formatBuildStatus(isBuilt: boolean | null | undefined): string {
  if (isBuilt) return 'Built'
  return 'In pieces'
}

function getBuildStatusVariant(
  isBuilt: boolean | null | undefined,
): 'default' | 'secondary' | 'outline' {
  if (isBuilt) return 'default'
  return 'outline'
}

function formatDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

function formatCurrency(value: number | null | undefined): string | null {
  if (typeof value !== 'number') return null
  return `$${value.toFixed(2)}`
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

function buildLightboxImages(set: Set | undefined | null): LightboxImage[] {
  if (!set || !set.images.length) {
    return []
  }

  const sortedImages = [...set.images].sort((a, b) => a.position - b.position)

  return sortedImages.map((image, index) => ({
    src: image.imageUrl,
    alt: `${set.title} - Image ${index + 1}`,
    title: index === 0 ? set.title : undefined,
  }))
}

/**
 * Skeleton for Set Detail Page while loading
 */
export function SetDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="set-detail-skeleton">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-8 w-64 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images skeleton */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="flex gap-1">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * 404-style not found state for Set Detail Page
 */
export function SetDetailNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="container mx-auto py-6" data-testid="set-detail-not-found">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <h2 className="text-2xl font-semibold">Set Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          The set you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sets
        </Button>
      </div>
    </div>
  )
}

/**
 * Error state for forbidden / generic errors
 */
function SetDetailError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="container mx-auto py-6" data-testid="set-detail-error">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <p className="text-destructive">{message}</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sets
        </Button>
      </div>
    </div>
  )
}

/**
 * Set Detail Page Component
 */
export function SetDetailPage({ className }: SetDetailPageProps = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const setId = id ?? ''

  const {
    data: set,
    isLoading,
    isError,
    error,
  } = useGetSetByIdQuery(setId, {
    skip: !setId,
  })

  const lightboxImages = useMemo(() => buildLightboxImages(set), [set])
  const lightbox = useLightbox(lightboxImages.length)

  const handleBack = () => {
    navigate('/sets')
  }

  const handleEdit = () => {
    if (!setId) return
    navigate(`/sets/${setId}/edit`)
  }

  const handleDelete = () => {
    if (!set) return
    const confirmed = window.confirm(
      'Are you sure you want to delete this set from your collection? This action cannot be undone.',
    )

    if (!confirmed) return

    // Story sets-2004 will wire this to a real delete endpoint + navigation.
    logger.info('Set delete confirmed (stub - no API call yet)', undefined, { setId: set.id })
  }

  if (!setId) {
    return (
      <SetDetailError
        message="No set specified. Please navigate from the sets gallery."
        onBack={handleBack}
      />
    )
  }

  if (isLoading && !set) {
    return <SetDetailSkeleton />
  }

  if (isError || (!set && !isLoading)) {
    if (isFetchBaseQueryError(error)) {
      if (error.status === 404) {
        return <SetDetailNotFound onBack={handleBack} />
      }

      if (error.status === 403) {
        return (
          <SetDetailError
            message="You don't have access to this set or it belongs to a different user."
            onBack={handleBack}
          />
        )
      }
    }

    return (
      <SetDetailError
        message="Failed to load set details. Please try again from the sets gallery."
        onBack={handleBack}
      />
    )
  }

  if (!set) {
    return <SetDetailSkeleton />
  }

  const purchasePrice = formatCurrency(set.purchasePrice)
  const tax = formatCurrency(set.tax)
  const shipping = formatCurrency(set.shipping)

  const totalNumeric =
    (typeof set.purchasePrice === 'number' ? set.purchasePrice : 0) +
    (typeof set.tax === 'number' ? set.tax : 0) +
    (typeof set.shipping === 'number' ? set.shipping : 0)

  const total = totalNumeric > 0 ? formatCurrency(totalNumeric) : null

  const hasPurchaseInfo =
    purchasePrice !== null ||
    tax !== null ||
    shipping !== null ||
    !!set.purchaseDate ||
    total !== null

  const hasTags = set.tags.length > 0
  const hasNotes = !!set.notes

  return (
    <div
      className={cn('container mx-auto py-6 space-y-6', className)}
      data-testid="set-detail-page"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={handleBack}
            data-testid="set-detail-back-button"
            aria-label="Back to sets gallery"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sets
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="set-detail-title">
              {set.title}
            </h1>
            {set.setNumber ? (
              <p className="text-muted-foreground text-sm">Set #{set.setNumber}</p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit} data-testid="set-detail-edit-button">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            data-testid="set-detail-delete-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Images gallery */}
        <div className="lg:col-span-2" data-testid="set-detail-images-section">
          {lightboxImages.length > 0 ? (
            <GalleryGrid columns={{ sm: 2, md: 3 }}>
              {lightboxImages.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg overflow-hidden"
                  onClick={() => lightbox.openLightbox(index)}
                  aria-label={`View ${image.alt}`}
                  data-testid={`set-detail-image-thumbnail-${index}`}
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
              <p className="text-muted-foreground">No images available for this set yet.</p>
            </div>
          )}
        </div>

        {/* Sidebar: set details + purchase info */}
        <div className="space-y-6" data-testid="set-detail-sidebar">
          {/* Set details */}
          <Card>
            <CardHeader>
              <CardTitle>Set details</CardTitle>
              <CardDescription>Core information about this set</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Set number & piece count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Set number</p>
                  <p className="text-sm font-mono mt-1">
                    {set.setNumber ? `#${set.setNumber}` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pieces</p>
                  <p className="text-sm mt-1" data-testid="set-detail-piece-count">
                    {typeof set.pieceCount === 'number'
                      ? `${set.pieceCount.toLocaleString()} pieces`
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Theme */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Theme</p>
                {set.theme ? (
                  <div className="mt-1">
                    <Badge data-testid="set-detail-theme-badge">{set.theme}</Badge>
                  </div>
                ) : (
                  <p className="text-sm mt-1 text-muted-foreground">No theme specified</p>
                )}
              </div>

              {/* Build status + quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Build status</p>
                  <div className="mt-1">
                    <Badge
                      variant={getBuildStatusVariant(set.isBuilt)}
                      className="inline-flex items-center gap-1 text-xs"
                      data-testid="set-detail-build-status"
                    >
                      {set.isBuilt ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {formatBuildStatus(set.isBuilt)}
                        </>
                      ) : (
                        <>
                          <Blocks className="h-3 w-3" aria-hidden="true" />
                          {formatBuildStatus(set.isBuilt)}
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                  <p className="text-sm mt-1" data-testid="set-detail-quantity">
                    {set.quantity}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {hasTags ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1" data-testid="set-detail-tags">
                    {set.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Created / updated */}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium">Added</p>
                  <p className="mt-0.5">{formatDate(set.createdAt) ?? 'Unknown'}</p>
                </div>
                <div>
                  <p className="font-medium">Last updated</p>
                  <p className="mt-0.5">{formatDate(set.updatedAt) ?? 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase info */}
          {hasPurchaseInfo ? (
            <Card data-testid="set-detail-purchase-card">
              <CardHeader>
                <CardTitle>Purchase information</CardTitle>
                <CardDescription>How and when you acquired this set</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchasePrice !== null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price paid</span>
                    <span className="font-medium" data-testid="set-detail-price">
                      {purchasePrice}
                    </span>
                  </div>
                ) : null}

                {tax !== null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium" data-testid="set-detail-tax">
                      {tax}
                    </span>
                  </div>
                ) : null}

                {shipping !== null ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium" data-testid="set-detail-shipping">
                      {shipping}
                    </span>
                  </div>
                ) : null}

                {set.purchaseDate ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Purchase date</span>
                    <span className="font-medium" data-testid="set-detail-purchase-date">
                      {formatDate(set.purchaseDate) ?? 'Unknown'}
                    </span>
                  </div>
                ) : null}

                {total !== null ? (
                  <>
                    <hr className="my-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold" data-testid="set-detail-total">
                        {total}
                      </span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Notes */}
          {hasNotes ? (
            <Card data-testid="set-detail-notes-card">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{set.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Lightbox */}
      <GalleryLightbox
        images={lightboxImages}
        open={lightbox.open}
        currentIndex={lightbox.currentIndex}
        onOpenChange={open => {
          if (!open) {
            lightbox.closeLightbox()
          }
        }}
        onNext={lightbox.next}
        onPrev={lightbox.prev}
        data-testid="set-detail-lightbox"
      />
    </div>
  )
}
