import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Trash2,
  PersonStanding,
  Pencil,
  X,
  Plus,
  Minus,
  ExternalLink,
} from 'lucide-react'
import {
  AppInput,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  cn,
  ConfirmationDialog,
  Skeleton,
  useToast,
} from '@repo/app-component-library'
import {
  useGetMinifigByIdQuery,
  useDeleteMinifigMutation,
  useUpdateMinifigMutation,
  useUpdateVariantMutation,
} from '@repo/api-client/rtk/minifigs-api'

function formatCondition(condition: string | null | undefined): string {
  switch (condition) {
    case 'new_sealed':
      return 'New / Sealed'
    case 'built':
      return 'Built'
    case 'parted_out':
      return 'Parted Out'
    default:
      return '—'
  }
}

function formatSourceType(sourceType: string | null | undefined): string {
  switch (sourceType) {
    case 'set':
      return 'From Set'
    case 'cmf_pack':
      return 'CMF Pack'
    case 'bricklink':
      return 'BrickLink'
    case 'bulk_lot':
      return 'Bulk Lot'
    case 'trade':
      return 'Trade'
    case 'gift':
      return 'Gift'
    case 'custom':
      return 'Custom'
    default:
      return '—'
  }
}

function formatDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

function formatCurrency(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return null
  return `$${num.toFixed(2)}`
}

// ─────────────────────────────────────────────────────────────────────────
// Inline Editable Field
// ─────────────────────────────────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  className,
  inputClassName,
  placeholder = 'Click to edit',
}: {
  value: string
  onSave: (value: string) => void
  className?: string
  inputClassName?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
    setEditing(false)
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(value)
    setEditing(false)
  }, [value])

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <AppInput
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') cancel()
          }}
          onBlur={commit}
          className={cn('h-8 text-sm', inputClassName)}
          placeholder={placeholder}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={cancel}
          aria-label="Cancel editing"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          setDraft(value)
          setEditing(true)
        }
      }}
      className={cn(
        'group inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1 -mx-1 hover:bg-accent transition-colors',
        className,
      )}
      aria-label={`Edit ${placeholder}`}
    >
      <span>{value || <span className="text-muted-foreground italic">{placeholder}</span>}</span>
      <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tag Editor
// ─────────────────────────────────────────────────────────────────────────

function TagEditor({ tags, onUpdate }: { tags: string[]; onUpdate: (tags: string[]) => void }) {
  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  const addTag = useCallback(() => {
    const tag = inputValue.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onUpdate([...tags, tag])
    }
    setInputValue('')
    setShowInput(false)
  }, [inputValue, tags, onUpdate])

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onUpdate(tags.filter(t => t !== tagToRemove))
    },
    [tags, onUpdate],
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {showInput ? (
        <AppInput
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
            if (e.key === 'Escape') {
              setInputValue('')
              setShowInput(false)
            }
          }}
          onBlur={addTag}
          placeholder="Add tag..."
          className="h-7 w-28 text-xs"
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(true)}
          className="h-7 px-2 text-xs text-muted-foreground"
          aria-label="Add tag"
        >
          <Plus className="h-3.5 w-3.5 mr-0.5" />
          Add tag
        </Button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Quantity Stepper
// ─────────────────────────────────────────────────────────────────────────

function QuantityStepper({
  label,
  value,
  onUpdate,
}: {
  label: string
  value: number
  onUpdate: (value: number) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdate(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium tabular-nums w-6 text-center">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onUpdate(value + 1)}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Detail Page
// ─────────────────────────────────────────────────────────────────────────

export function MinifigDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const minifigId = id!
  const { data: minifig, isLoading, isError } = useGetMinifigByIdQuery(minifigId)
  const [deleteMinifig] = useDeleteMinifigMutation()
  const [updateMinifig] = useUpdateMinifigMutation()
  const [updateVariant] = useUpdateVariantMutation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { success: toastSuccess, error: toastError } = useToast()

  const handleUpdate = useCallback(
    async (body: Parameters<typeof updateMinifig>[0]['body']) => {
      if (!minifig) return
      try {
        await updateMinifig({ id: minifig.id, body }).unwrap()
        toastSuccess('Updated', 'Minifig updated successfully.')
      } catch (_err) {
        toastError(_err, 'Failed to update minifig')
      }
    },
    [minifig, updateMinifig, toastSuccess, toastError],
  )

  const handleVariantUpdate = useCallback(
    async (body: { theme?: string | null; subtheme?: string | null }) => {
      if (!minifig?.variantId) return
      try {
        await updateVariant({ id: minifig.variantId, body }).unwrap()
        toastSuccess('Updated', 'Theme updated successfully.')
      } catch (_err) {
        toastError(_err, 'Failed to update theme')
      }
    },
    [minifig, updateVariant, toastSuccess, toastError],
  )

  const handleBack = () => navigate('..')

  const handleDelete = async () => {
    if (!minifig) return
    setIsDeleting(true)
    try {
      await deleteMinifig({ id: minifig.id, displayName: minifig.displayName }).unwrap()
      toastSuccess(`"${minifig.displayName}" deleted`, 'Minifig removed from collection.')
      navigate('..')
    } catch (_err) {
      toastError(_err, `Failed to delete "${minifig.displayName}"`)
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-28" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="aspect-square max-w-md rounded-lg" />
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !minifig) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <h2 className="text-2xl font-semibold">Minifig Not Found</h2>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
      </div>
    )
  }

  const purchasePrice = formatCurrency(minifig.purchasePrice)
  const tax = formatCurrency(minifig.purchaseTax)
  const shipping = formatCurrency(minifig.purchaseShipping)
  const totalNumeric =
    (minifig.purchasePrice ? parseFloat(minifig.purchasePrice) : 0) +
    (minifig.purchaseTax ? parseFloat(minifig.purchaseTax) : 0) +
    (minifig.purchaseShipping ? parseFloat(minifig.purchaseShipping) : 0)
  const total = totalNumeric > 0 ? formatCurrency(totalNumeric) : null
  const hasPurchaseInfo = purchasePrice || tax || shipping || minifig.purchaseDate

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="minifig-detail-page">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleBack} aria-label="Back to collection">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <EditableText
              value={minifig.displayName}
              onSave={displayName => handleUpdate({ displayName })}
              className="text-2xl font-bold tracking-tight"
              inputClassName="text-2xl font-bold h-auto py-0"
              placeholder="Minifig name"
            />
            {minifig.variant?.legoNumber ? (
              <p className="text-muted-foreground text-sm font-mono">
                {minifig.variant.legoNumber}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="minifig-delete-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image */}
        <div className="lg:col-span-2">
          <div className="max-w-md">
            {minifig.imageUrl || minifig.variant?.imageUrl ? (
              <img
                src={minifig.imageUrl || minifig.variant?.imageUrl || ''}
                alt={minifig.displayName}
                className="w-full rounded-lg border"
              />
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <PersonStanding className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={minifig.status === 'owned' ? 'default' : 'outline'}>
                    {minifig.status === 'owned' ? 'Owned' : 'Wanted'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Condition</p>
                  <p className="text-sm mt-1">{formatCondition(minifig.condition)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <QuantityStepper
                  label="Owned"
                  value={minifig.quantityOwned}
                  onUpdate={quantityOwned => handleUpdate({ quantityOwned })}
                />
                <QuantityStepper
                  label="Wanted"
                  value={minifig.quantityWanted}
                  onUpdate={quantityWanted => handleUpdate({ quantityWanted })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Source</p>
                  {minifig.sourceType === 'bricklink' && minifig.variant?.bricklinkUrl ? (
                    <a
                      href={minifig.variant.bricklinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm mt-1 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      BrickLink <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm mt-1">{formatSourceType(minifig.sourceType)}</p>
                  )}
                </div>
                {minifig.isCustom ? (
                  <div>
                    <Badge variant="secondary">Custom</Badge>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Theme</p>
                <div className="mt-1">
                  {minifig.variantId ? (
                    <EditableText
                      value={minifig.variant?.theme ?? ''}
                      onSave={theme => handleVariantUpdate({ theme: theme || null })}
                      className="text-sm"
                      inputClassName="h-7 text-sm"
                      placeholder="Add theme"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No variant linked</p>
                  )}
                </div>
              </div>

              {minifig.variant?.year ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Year</p>
                  <p className="text-sm mt-1">{minifig.variant.year}</p>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tags</p>
                <TagEditor tags={minifig.tags ?? []} onUpdate={tags => handleUpdate({ tags })} />
              </div>

              {minifig.purpose ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Purpose</p>
                  <p className="text-sm mt-1">{minifig.purpose}</p>
                </div>
              ) : null}

              {minifig.plannedUse ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Planned Use</p>
                  <p className="text-sm mt-1">{minifig.plannedUse}</p>
                </div>
              ) : null}

              {minifig.notes ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1 whitespace-pre-line">{minifig.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Purchase Info */}
          {hasPurchaseInfo ? (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchasePrice ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">{purchasePrice}</span>
                  </div>
                ) : null}
                {tax ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{tax}</span>
                  </div>
                ) : null}
                {shipping ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">{shipping}</span>
                  </div>
                ) : null}
                {minifig.purchaseDate ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{formatDate(minifig.purchaseDate)}</span>
                  </div>
                ) : null}
                {total ? (
                  <>
                    <hr />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{total}</span>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Price Guide */}
          {minifig.variant?.priceGuide &&
          (minifig.variant.priceGuide.newSales || minifig.variant.priceGuide.usedSales) ? (
            <Card>
              <CardHeader>
                <CardTitle>Price Guide</CardTitle>
                <CardDescription>Last 6 months sales from BrickLink</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {minifig.variant.priceGuide.newSales ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">New</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Times Sold</span>
                          <span className="font-mono">
                            {minifig.variant.priceGuide.newSales.timesSold}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Price</span>
                          <span className="font-mono">
                            ${minifig.variant.priceGuide.newSales.avgPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min / Max</span>
                          <span className="font-mono">
                            ${minifig.variant.priceGuide.newSales.minPrice.toFixed(2)} – $
                            {minifig.variant.priceGuide.newSales.maxPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {minifig.variant.priceGuide.usedSales ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Used</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Times Sold</span>
                          <span className="font-mono">
                            {minifig.variant.priceGuide.usedSales.timesSold}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Price</span>
                          <span className="font-mono">
                            ${minifig.variant.priceGuide.usedSales.avgPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Min / Max</span>
                          <span className="font-mono">
                            ${minifig.variant.priceGuide.usedSales.minPrice.toFixed(2)} – $
                            {minifig.variant.priceGuide.usedSales.maxPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Parts List */}
          {minifig.variant?.parts && minifig.variant.parts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Parts</CardTitle>
                <CardDescription>
                  {minifig.variant.partsCount ?? minifig.variant.parts.length} parts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {minifig.variant.parts.map((part, i) => (
                    <div
                      key={`${part.partNumber}-${i}`}
                      className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                    >
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="h-12 w-16 rounded border object-contain bg-white shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded border bg-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{part.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {part.bricklinkUrl ? (
                                <a
                                  href={part.bricklinkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-mono"
                                >
                                  {part.partNumber}
                                </a>
                              ) : (
                                <span className="font-mono">{part.partNumber}</span>
                              )}
                              {part.color ? <span>{part.color}</span> : null}
                              {part.category ? (
                                <span className="truncate">{part.category}</span>
                              ) : null}
                            </div>
                          </div>
                          <span className="text-sm font-mono shrink-0">×{part.quantity}</span>
                        </div>
                        {part.priceGuide &&
                        (part.priceGuide.newSales || part.priceGuide.usedSales) ? (
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            {part.priceGuide.newSales ? (
                              <span>New: ${part.priceGuide.newSales.avgPrice.toFixed(2)} avg</span>
                            ) : null}
                            {part.priceGuide.usedSales ? (
                              <span>
                                Used: ${part.priceGuide.usedSales.avgPrice.toFixed(2)} avg
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmationDialog
        title="Delete minifig?"
        description={`Are you sure you want to delete "${minifig.displayName}" from your collection? This cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="destructive"
        open={showDeleteDialog}
        onOpenChange={open => {
          if (!open && !isDeleting) setShowDeleteDialog(false)
        }}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
