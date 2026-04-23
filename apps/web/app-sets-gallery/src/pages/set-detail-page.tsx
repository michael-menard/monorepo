/**
 * Set Detail Page
 *
 * Redesigned detail view with hero section, instances table, minifigs grid,
 * notes, and provenance footer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { z } from 'zod'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
  useToast,
} from '@repo/app-component-library'
import { GalleryGrid, GalleryLightbox, useLightbox, type LightboxImage } from '@repo/gallery'
import {
  useGetSetByIdQuery,
  useUpdateSetMutation,
  useCreateSetInstanceMutation,
  useGetBuildableMocsQuery,
} from '@repo/api-client/rtk/sets-api'
import type { Set } from '@repo/api-client/schemas/sets'
import { InstancesTable } from '../components/InstancesTable'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const SetDetailPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type SetDetailPageProps = z.infer<typeof SetDetailPagePropsSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '\u2014'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '\u2014'
  return date.toLocaleDateString()
}

function formatCurrency(
  value: string | number | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined) return '\u2014'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '\u2014'
  const symbol = currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : '$'
  return `${symbol}${num.toFixed(2)}`
}

function formatWeight(grams: string | null | undefined): string {
  if (!grams) return '\u2014'
  const num = parseFloat(grams)
  if (Number.isNaN(num)) return '\u2014'
  if (num >= 1000) return `${(num / 1000).toFixed(2)} kg`
  return `${num} g`
}

function formatAvailability(status: string | null | undefined): {
  label: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
} {
  switch (status) {
    case 'available':
      return { label: 'Available', variant: 'default' }
    case 'retiring_soon':
      return { label: 'Retiring Soon', variant: 'secondary' }
    case 'retired':
      return { label: 'Retired', variant: 'destructive' }
    default:
      return { label: '\u2014', variant: 'outline' }
  }
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

function buildLightboxImages(set: Set | undefined | null): LightboxImage[] {
  if (!set) return []

  if (set.images.length > 0) {
    const sortedImages = [...set.images].sort((a, b) => a.position - b.position)
    return sortedImages.map((image, index) => ({
      src: image.imageUrl,
      alt: `${set.title} - Image ${index + 1}`,
      title: index === 0 ? set.title : undefined,
    }))
  }

  if (set.imageUrl) {
    return [{ src: set.imageUrl, alt: set.title, title: set.title }]
  }

  return []
}

function formatDimension(
  dim: { cm?: number | null; inches?: number | null } | null | undefined,
): string {
  if (!dim) return '\u2014'
  if (dim.inches != null) return `${dim.inches}"`
  if (dim.cm != null) return `${dim.cm} cm`
  return '\u2014'
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function SetDetailSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-8" data-testid="set-detail-skeleton">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-28" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error States
// ---------------------------------------------------------------------------

function SetDetailNotFound({ onBack }: { onBack: () => void }) {
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

// ---------------------------------------------------------------------------
// Spec Row (for product specs card)
// ---------------------------------------------------------------------------

function SpecRow({ label, value }: { label: string; value: string }) {
  const isPlaceholder = value === '\u2014'
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', isPlaceholder && 'text-muted-foreground/50')}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable Notes
// ---------------------------------------------------------------------------

function EditableNotes({
  value,
  onSave,
}: {
  value: string | null | undefined
  onSave: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500)
      return () => clearTimeout(t)
    }
  }, [saved])

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          defaultValue={value ?? ''}
          onBlur={e => {
            setEditing(false)
            if (e.target.value !== (value ?? '')) {
              onSave(e.target.value)
              setSaved(true)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setEditing(false)
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Click away or press Escape to finish editing
        </p>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'text-left w-full cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors',
        'inline-flex items-start gap-2',
      )}
      onClick={() => setEditing(true)}
      aria-label="Click to edit notes"
    >
      <span className={cn('text-sm whitespace-pre-line', !value && 'text-muted-foreground italic')}>
        {value || 'Click to add notes...'}
      </span>
      {saved ? <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : null}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Editable Quantity Wanted
// ---------------------------------------------------------------------------

function EditableQuantityWanted({
  value,
  onSave,
}: {
  value: number | undefined
  onSave: (val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500)
      return () => clearTimeout(t)
    }
  }, [saved])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        className="h-7 w-16 rounded-md border border-input bg-background px-2 text-sm"
        defaultValue={value ?? 0}
        onBlur={e => {
          setEditing(false)
          const num = parseInt(e.target.value, 10)
          if (!Number.isNaN(num) && num !== (value ?? 0)) {
            onSave(num)
            setSaved(true)
          }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity text-sm"
      onClick={() => setEditing(true)}
      aria-label="Edit quantity wanted"
    >
      <span className="font-medium">{value ?? 0}</span>
      {saved ? <Check className="h-3 w-3 text-green-500" /> : null}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Minifigs Grid
// ---------------------------------------------------------------------------

function MinifigsGrid({ minifigs }: { minifigs: Set['minifigs'] }) {
  if (!minifigs || minifigs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        No minifig data available
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {minifigs.map(fig => (
        <div
          key={fig.id}
          className="border rounded-lg p-3 flex flex-col items-center gap-2 text-center"
        >
          {fig.imageUrl ? (
            <img
              src={fig.imageUrl}
              alt={fig.displayName}
              className="h-20 w-20 object-contain rounded"
            />
          ) : (
            <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No image</span>
            </div>
          )}
          <p className="text-xs font-medium leading-tight line-clamp-2">{fig.displayName}</p>
          {fig.quantityOwned > 1 && (
            <Badge variant="secondary" className="text-xs">
              x{fig.quantityOwned}
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SetDetailPage({ className }: SetDetailPageProps = {}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const setId = id ?? ''

  const { data: set, isLoading, isError, error } = useGetSetByIdQuery(setId, { skip: !setId })
  const { data: buildableMocsData } = useGetBuildableMocsQuery(setId, {
    skip: !setId || isLoading || isError,
  })

  const [updateSet] = useUpdateSetMutation()
  const [createInstance] = useCreateSetInstanceMutation()
  const { success: toastSuccess, error: toastError } = useToast()

  const lightboxImages = useMemo(() => buildLightboxImages(set), [set])
  const lightbox = useLightbox(lightboxImages.length)

  const handleBack = () => navigate('..')

  const handleAddCopy = useCallback(async () => {
    if (!set) return
    try {
      await createInstance({
        setId: set.id,
        data: {
          condition: 'new',
          completeness: 'complete',
          buildStatus: 'not_started',
        },
      }).unwrap()
      toastSuccess('Added', 'New copy added to your collection.')
    } catch (err) {
      toastError(err, 'Failed to add copy')
    }
  }, [set, createInstance, toastSuccess, toastError])

  const handleNotesUpdate = useCallback(
    async (notes: string) => {
      if (!set) return
      try {
        await updateSet({ id: set.id, data: { notes } }).unwrap()
        toastSuccess('Updated', 'Notes saved.')
      } catch (err) {
        toastError(err, 'Failed to update notes')
      }
    },
    [set, updateSet, toastSuccess, toastError],
  )

  const handleQuantityWantedUpdate = useCallback(
    async (quantityWanted: number) => {
      if (!set) return
      try {
        await updateSet({ id: set.id, data: { quantityWanted } }).unwrap()
        toastSuccess('Updated', 'Quantity wanted updated.')
      } catch (err) {
        toastError(err, 'Failed to update')
      }
    },
    [set, updateSet, toastSuccess, toastError],
  )

  // --- Loading / Error states ---

  if (!setId) {
    return (
      <SetDetailError
        message="No set specified. Please navigate from the sets gallery."
        onBack={handleBack}
      />
    )
  }

  if (isLoading && !set) return <SetDetailSkeleton />

  if (isError || (!set && !isLoading)) {
    if (isFetchBaseQueryError(error)) {
      if (error.status === 404) return <SetDetailNotFound onBack={handleBack} />
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

  if (!set) return <SetDetailSkeleton />

  // --- Derived values ---

  const availability = formatAvailability(set.availabilityStatus)

  return (
    <div
      className={cn('container mx-auto py-6 space-y-8', className)}
      data-testid="set-detail-page"
    >
      {/* ================================================================= */}
      {/* SECTION 1: Header                                                  */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-1 shrink-0"
            aria-label="Back to sets gallery"
            data-testid="set-detail-back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="set-detail-title">
              {set.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {set.setNumber ? (
                <span className="text-muted-foreground text-sm font-mono">#{set.setNumber}</span>
              ) : null}
              {set.theme ? (
                <Badge variant="secondary" data-testid="set-detail-theme-badge">
                  {set.theme}
                </Badge>
              ) : null}
              <Badge variant={availability.variant} data-testid="set-detail-availability-badge">
                {availability.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleAddCopy} data-testid="set-detail-add-copy">
            <Plus className="mr-2 h-4 w-4" />
            Add Copy
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 2: Hero (2/3 gallery + 1/3 specs)                         */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Image gallery */}
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

        {/* Right: Product specs */}
        <div data-testid="set-detail-specs">
          <Card>
            <CardHeader>
              <CardTitle>Product Specs</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <SpecRow
                label="Pieces"
                value={
                  typeof set.pieceCount === 'number' ? set.pieceCount.toLocaleString() : '\u2014'
                }
              />
              <SpecRow
                label="Minifigs"
                value={set.minifigs.length > 0 ? String(set.minifigs.length) : '\u2014'}
              />
              <SpecRow label="MSRP" value={formatCurrency(set.msrpPrice, set.msrpCurrency)} />
              <SpecRow label="Weight" value={formatWeight(set.weight)} />
              <SpecRow label="Height" value={formatDimension(set.dimensions?.height)} />
              <SpecRow label="Width" value={formatDimension(set.dimensions?.width)} />
              <SpecRow label="Depth" value={formatDimension(set.dimensions?.depth)} />
              {set.dimensions?.studsWidth ||
              set.dimensions?.studsDepth ||
              set.dimensions?.studsHeight ? (
                <SpecRow
                  label="Studs"
                  value={[
                    set.dimensions.studsWidth && `${set.dimensions.studsWidth}W`,
                    set.dimensions.studsDepth && `${set.dimensions.studsDepth}D`,
                    set.dimensions.studsHeight && `${set.dimensions.studsHeight}H`,
                  ]
                    .filter(Boolean)
                    .join(' \u00D7 ')}
                />
              ) : null}
              <SpecRow label="Year" value={set.year != null ? String(set.year) : '\u2014'} />
              <SpecRow label="Brand" value={set.brand ?? '\u2014'} />
              <SpecRow label="Release Date" value={formatDate(set.releaseDate)} />
              <SpecRow label="Retire Date" value={formatDate(set.retireDate)} />
              <SpecRow label="Availability" value={availability.label} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 3: Instances Table                                         */}
      {/* ================================================================= */}
      <section data-testid="set-detail-instances-section">
        <h2 className="text-lg font-semibold mb-3">Your Copies</h2>
        <InstancesTable setId={set.id} instances={set.instances} />
      </section>

      {/* ================================================================= */}
      {/* SECTION 4: Minifigs Grid                                           */}
      {/* ================================================================= */}
      <section data-testid="set-detail-minifigs-section">
        <h2 className="text-lg font-semibold mb-3">Minifigs</h2>
        <MinifigsGrid minifigs={set.minifigs} />
      </section>

      {/* ================================================================= */}
      {/* SECTION 4b: Buildable MOCs                                         */}
      {/* ================================================================= */}
      {buildableMocsData && buildableMocsData.buildableMocs.length > 0 ? (
        <section data-testid="set-detail-buildable-mocs-section">
          <h2 className="text-lg font-semibold mb-3">MOCs You Can Build</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {buildableMocsData.buildableMocs.map(item => (
              <div
                key={item.mocNumber}
                className="border rounded-lg p-3 flex flex-col items-center gap-2 text-center"
                data-testid={`buildable-moc-${item.mocNumber}`}
              >
                <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                  <span className="text-muted-foreground text-xs">MOC</span>
                </div>
                <p className="text-xs font-medium leading-tight line-clamp-2">
                  {item.moc?.title || item.mocNumber}
                </p>
                <span className="text-xs text-muted-foreground font-mono">{item.mocNumber}</span>
                {item.moc?.author ? (
                  <span className="text-xs text-muted-foreground">by {item.moc.author}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ================================================================= */}
      {/* SECTION 5: Notes                                                   */}
      {/* ================================================================= */}
      <section data-testid="set-detail-notes-section">
        <h2 className="text-lg font-semibold mb-3">Notes</h2>
        <Card>
          <CardContent className="pt-6">
            <EditableNotes value={set.notes} onSave={handleNotesUpdate} />
          </CardContent>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* SECTION 6: Provenance Footer                                       */}
      {/* ================================================================= */}
      <section
        className="border-t pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground"
        data-testid="set-detail-provenance"
      >
        <div className="flex items-center gap-4">
          {set.lastScrapedAt ? <span>Last scraped: {formatDate(set.lastScrapedAt)}</span> : null}
          {set.lastScrapedSource ? <span>Source: {set.lastScrapedSource}</span> : null}
          {!set.lastScrapedAt && !set.lastScrapedSource && <span>No scrape data available</span>}
        </div>
        <div className="flex items-center gap-2">
          <span>Quantity wanted:</span>
          <EditableQuantityWanted value={set.quantityWanted} onSave={handleQuantityWantedUpdate} />
        </div>
      </section>

      {/* Lightbox */}
      <GalleryLightbox
        images={lightboxImages}
        open={lightbox.open}
        currentIndex={lightbox.currentIndex}
        onOpenChange={open => {
          if (!open) lightbox.closeLightbox()
        }}
        onNext={lightbox.next}
        onPrev={lightbox.prev}
        data-testid="set-detail-lightbox"
      />
    </div>
  )
}
