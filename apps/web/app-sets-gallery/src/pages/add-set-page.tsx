/**
 * Add Set Page
 * Story 3.4.5: Sets Add Page
 */
import { useState } from 'react'
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
import { TagInput } from '../components/TagInput'
import { ImageUploadZone } from '../components/ImageUploadZone'
import { mockAddSet, mockUploadSetImage } from '../api/mock-sets-api'

const themes = [
  'Architecture',
  'Castle',
  'City',
  'Classic',
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

const setFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  setNumber: z.string().min(1, 'Set number is required'),
  pieceCount: z.number().int().positive('Piece count must be positive'),
  theme: z.string().min(1, 'Theme is required'),
  tags: z.array(z.string()).default([]),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  purchaseCurrency: z.string().default('USD'),
  notes: z.string().optional(),
})

export function AddSetPage({ onBack }: { onBack?: () => void }) {
  const { success, error } = useToast()
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    setNumber: '',
    pieceCount: '',
    theme: '',
    tags: [] as string[],
    purchaseDate: '',
    purchasePrice: '',
    purchaseCurrency: 'USD',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    try {
      setIsSubmitting(true)

      // Validate with Zod
      const validatedData = setFormSchema.parse({
        ...formData,
        pieceCount: formData.pieceCount ? Number(formData.pieceCount) : 0,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
      })

      // Add set
      const newSet = await mockAddSet(validatedData)

      // Upload images
      for (const image of images) {
        const formDataObj = new FormData()
        formDataObj.append('file', image)
        await mockUploadSetImage({ setId: newSet.id, formData: formDataObj })
      }

      success('Set added to collection', 'Your set has been successfully added.')

      // Reset form
      setFormData({
        name: '',
        setNumber: '',
        pieceCount: '',
        theme: '',
        tags: [],
        purchaseDate: '',
        purchasePrice: '',
        purchaseCurrency: 'USD',
        notes: '',
      })
      setImages([])

      // Navigate back if callback provided
      if (onBack) {
        setTimeout(onBack, 1000)
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach(e => {
          if (e.path[0]) {
            errors[e.path[0].toString()] = e.message
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
            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Set Name *
              </label>
              <Input
                id="name"
                placeholder="e.g., Medieval Castle"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.name ? (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              ) : null}
            </div>

            {/* Set Number */}
            <div className="space-y-2">
              <label htmlFor="setNumber" className="text-sm font-medium">
                Set Number *
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
                Piece Count *
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
                Theme *
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
                  {themes.map(theme => (
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
            <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <label htmlFor="purchaseCurrency" className="text-sm font-medium">
                  Currency
                </label>
                <Select
                  value={formData.purchaseCurrency}
                  onValueChange={value => setFormData({ ...formData, purchaseCurrency: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="purchaseCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
