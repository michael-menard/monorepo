/**
 * Edit Set Page
 *
 * Pre-fills form with existing set data and submits updates via PATCH.
 * Reuses form layout and components from add-set-page.
 *
 * BUGF-003: Implement Edit Page for Sets Gallery
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
} from '@repo/app-component-library'
import { z } from 'zod'
import { UpdateSetSchema } from '@repo/api-client/schemas/sets'
import { useGetSetByIdQuery, useUpdateSetMutation } from '@repo/api-client/rtk/sets-api'
import { TagInput } from '../components/TagInput'

const THEMES = [
  'Architecture',
  'Castle',
  'City',
  'Creator',
  'Creator Expert',
  'Disney',
  'Friends',
  'Harry Potter',
  'Icons',
  'Ideas',
  'Marvel',
  'Minecraft',
  'Ninjago',
  'Speed Champions',
  'Star Wars',
  'Technic',
  'Other',
]

/**
 * Loading skeleton while fetching set data
 */
function EditSetSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-2xl" data-testid="edit-set-skeleton">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function EditSetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()

  const setId = id ?? ''

  const {
    data: set,
    isLoading,
    isError,
  } = useGetSetByIdQuery(setId, {
    skip: !setId,
  })

  const [updateSet] = useUpdateSetMutation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    setNumber: '',
    pieceCount: '',
    theme: '',
    tags: [] as string[],
    purchaseDate: '',
    purchasePrice: '',
    notes: '',
  })

  // Pre-fill form when set data loads
  useEffect(() => {
    if (set) {
      setFormData({
        title: set.title,
        setNumber: set.setNumber ?? '',
        pieceCount: set.pieceCount !== null ? String(set.pieceCount) : '',
        theme: set.theme ?? '',
        tags: set.tags ?? [],
        purchaseDate: set.purchaseDate ? set.purchaseDate.split('T')[0] : '',
        purchasePrice:
          set.purchasePrice !== null && set.purchasePrice !== undefined
            ? String(set.purchasePrice)
            : '',
        notes: set.notes ?? '',
      })
    }
  }, [set])

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    navigate(`/sets/${setId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    // Title is required even for edits
    if (!formData.title.trim()) {
      setFormErrors({ title: 'Title is required' })
      return
    }

    try {
      setIsSubmitting(true)

      const candidate = {
        title: formData.title,
        setNumber: formData.setNumber || undefined,
        pieceCount: formData.pieceCount ? Number(formData.pieceCount) : undefined,
        theme: formData.theme || undefined,
        tags: formData.tags,
        notes: formData.notes || undefined,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        purchaseDate: formData.purchaseDate
          ? new Date(formData.purchaseDate).toISOString()
          : undefined,
      }

      const updateInput = UpdateSetSchema.parse(candidate)

      const updatedSet = await updateSet({ id: setId, data: updateInput }).unwrap()

      success(`"${updatedSet.title}" updated`, 'Your set has been updated successfully.')

      setIsDirty(false)
      navigate(`/sets/${setId}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach(e => {
          const field = e.path[0]
          if (typeof field === 'string') {
            errors[field] = e.message
          }
        })
        setFormErrors(errors)
      } else {
        toastError(err, 'Failed to update set')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!setId) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <p className="text-destructive">No set specified.</p>
        <Button variant="outline" onClick={() => navigate('/sets')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sets
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return <EditSetSkeleton />
  }

  if (isError || !set) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <p className="text-destructive">
          Failed to load set. It may not exist or you may not have access.
        </p>
        <Button variant="outline" onClick={() => navigate('/sets')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sets
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl" data-testid="edit-set-page">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={handleCancel} type="button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Set</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Set Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title *
              </label>
              <Input
                id="title"
                placeholder="e.g., Medieval Castle"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                disabled={isSubmitting}
              />
              {formErrors.title ? (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              ) : null}
            </div>

            {/* Set Number */}
            <div className="space-y-2">
              <label htmlFor="setNumber" className="text-sm font-medium">
                Set Number
              </label>
              <Input
                id="setNumber"
                placeholder="e.g., 10305"
                value={formData.setNumber}
                onChange={e => updateField('setNumber', e.target.value)}
                disabled={isSubmitting}
              />
              {formErrors.setNumber ? (
                <p className="text-sm text-destructive">{formErrors.setNumber}</p>
              ) : null}
            </div>

            {/* Piece Count */}
            <div className="space-y-2">
              <label htmlFor="pieceCount" className="text-sm font-medium">
                Piece Count
              </label>
              <Input
                id="pieceCount"
                type="number"
                placeholder="e.g., 4514"
                value={formData.pieceCount}
                onChange={e => updateField('pieceCount', e.target.value)}
                disabled={isSubmitting}
              />
              {formErrors.pieceCount ? (
                <p className="text-sm text-destructive">{formErrors.pieceCount}</p>
              ) : null}
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <label htmlFor="theme" className="text-sm font-medium">
                Theme
              </label>
              <Select
                value={formData.theme}
                onValueChange={value => updateField('theme', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map(theme => (
                    <SelectItem key={theme} value={theme}>
                      {theme}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.theme ? (
                <p className="text-sm text-destructive">{formErrors.theme}</p>
              ) : null}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                Tags
              </label>
              <TagInput
                value={formData.tags}
                onChange={tags => updateField('tags', tags)}
                placeholder="Add tags (press Enter)"
                maxTags={10}
                disabled={isSubmitting}
              />
              <p className="text-sm text-muted-foreground">Press Enter to add a tag</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this set..."
                className="min-h-[100px]"
                value={formData.notes}
                onChange={e => updateField('notes', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchase Info */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Information</CardTitle>
            <CardDescription>Optional - track where and when you got this set</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Purchase Date */}
            <div className="space-y-2">
              <label htmlFor="purchaseDate" className="text-sm font-medium">
                Purchase Date
              </label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={e => updateField('purchaseDate', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Purchase Price */}
            <div className="space-y-2">
              <label htmlFor="purchasePrice" className="text-sm font-medium">
                Purchase Price
              </label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.purchasePrice}
                onChange={e => updateField('purchasePrice', e.target.value)}
                disabled={isSubmitting}
              />
              {formErrors.purchasePrice ? (
                <p className="text-sm text-destructive">{formErrors.purchasePrice}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
