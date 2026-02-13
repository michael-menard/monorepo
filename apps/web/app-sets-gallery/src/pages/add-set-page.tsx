/**
 * Add Set Page
 * Story sets-2002: Add Set Flow
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Textarea,
  useToast,
} from '@repo/app-component-library'
import { z } from 'zod'
import { uploadToPresignedUrl } from '@repo/upload'
import { CreateSetSchema, type CreateSetInput } from '@repo/api-client/schemas/sets'
import {
  useAddSetMutation,
  usePresignSetImageMutation,
  useRegisterSetImageMutation,
} from '@repo/api-client/rtk/sets-api'
import { TagInput } from '../components/TagInput'
import { ImageUploadZone } from '../components/ImageUploadZone'

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

export function AddSetPage({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [addSet] = useAddSetMutation()
  const [presignSetImage] = usePresignSetImageMutation()
  const [registerSetImage] = useRegisterSetImageMutation()

  // Form state (string-based, mapped into CreateSetInput on submit)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    try {
      setIsSubmitting(true)

      // Map form state into CreateSetInput candidate (numbers/dates coerced)
      const candidate: Partial<CreateSetInput> = {
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

      const createInput = CreateSetSchema.parse(candidate)

      // Create set via real API
      const newSet = await addSet(createInput).unwrap()

      // Upload images (best-effort)
      for (const image of images) {
        try {
          const presign = await presignSetImage({
            setId: newSet.id,
            filename: image.name,
            contentType: image.type || 'application/octet-stream',
          }).unwrap()

          await uploadToPresignedUrl({
            url: presign.uploadUrl,
            file: image,
            contentType: image.type || 'application/octet-stream',
          })

          await registerSetImage({
            setId: newSet.id,
            imageUrl: presign.imageUrl,
            key: presign.key,
          }).unwrap()
        } catch (uploadError) {
          // Log and surface a non-blocking error; the set itself was created
          error(uploadError, 'One or more images failed to upload. Your set was still created.')
        }
      }

      success('Set added to collection', 'Your set has been successfully added.')

      // Reset form
      setFormData({
        title: '',
        setNumber: '',
        pieceCount: '',
        theme: '',
        tags: [],
        purchaseDate: '',
        purchasePrice: '',
        notes: '',
      })
      setImages([])

      // Navigate to detail page or invoke onBack callback
      if (onBack) {
        onBack()
      } else {
        navigate(`/sets/${newSet.id}`)
      }
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
        error(err, 'Failed to add set')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} type="button">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : null}
        <h1 className="text-2xl font-bold">Add Set</h1>
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
                onChange={e => setFormData({ ...formData, title: e.target.value })}
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
                onChange={e => setFormData({ ...formData, setNumber: e.target.value })}
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
                onChange={e => setFormData({ ...formData, pieceCount: e.target.value })}
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
                onValueChange={value => setFormData({ ...formData, theme: value })}
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
                onChange={tags => setFormData({ ...formData, tags })}
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
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
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
                onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.purchasePrice ? (
                <p className="text-sm text-destructive">{formErrors.purchasePrice}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Upload photos of your set</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadZone
              images={images}
              onImagesChange={setImages}
              maxImages={10}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Add Set
          </Button>
        </div>
      </form>
    </div>
  )
}
