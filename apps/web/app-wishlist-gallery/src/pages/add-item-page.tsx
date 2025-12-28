/**
 * Add Wishlist Item Page
 *
 * Form page for adding new items to the wishlist.
 * Story wish-2002: Add Item Flow
 */

import { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showSuccessToast,
  showErrorToast,
  cn,
} from '@repo/app-component-library'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import {
  CreateWishlistItemSchema,
  WishlistStoreSchema,
  CurrencySchema,
} from '@repo/api-client/schemas/wishlist'
import { useAddToWishlistMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import { ImageUploadField } from '../components/ImageUploadField'

/**
 * Props schema for the AddItemPage
 */
const AddItemPagePropsSchema = z.object({
  /** Called when navigation to wishlist is requested */
  onNavigateBack: z.function().args().returns(z.void()),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AddItemPageProps = z.infer<typeof AddItemPagePropsSchema>

/**
 * Form schema - matches CreateWishlistItemSchema with form-specific handling
 */
const AddItemFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  price: z.string().optional().or(z.literal('')),
  currency: z.string(),
  pieceCount: z.union([z.number().int().nonnegative(), z.nan()]).optional(),
  priority: z.number().int().min(0).max(5),
  notes: z.string().optional(),
  tags: z.array(z.string()),
})

type AddItemFormData = z.infer<typeof AddItemFormSchema>

/** Store options from schema */
const STORES = WishlistStoreSchema.options

/** Currency options from schema */
const CURRENCIES = CurrencySchema.options

/** Priority options for display */
const PRIORITY_OPTIONS = [
  { value: 0, label: '0 - Unset' },
  { value: 1, label: '1 - Low' },
  { value: 2, label: '2 - Medium-Low' },
  { value: 3, label: '3 - Medium' },
  { value: 4, label: '4 - High' },
  { value: 5, label: '5 - Must Have' },
]

/**
 * Add Wishlist Item Page Component
 */
export function AddItemPage({ onNavigateBack, className }: AddItemPageProps) {
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AddItemFormData>({
    resolver: zodResolver(AddItemFormSchema),
    defaultValues: {
      store: 'LEGO',
      priority: 0,
      currency: 'USD',
      tags: [],
    },
  })

  const handleImageChange = useCallback((file: File | null) => {
    setImageFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }, [])

  const handleImageRemove = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
  }, [imagePreview])

  const onSubmit = async (data: AddItemFormData) => {
    try {
      // TODO: Implement image upload to S3 when infrastructure is ready
      // For now, we skip image upload
      let imageUrl: string | undefined

      if (imageFile) {
        setIsUploadingImage(true)
        // Placeholder for S3 upload
        // imageUrl = await uploadImageToS3(imageFile)
        setIsUploadingImage(false)
      }

      // Prepare the request data
      const requestData: z.infer<typeof CreateWishlistItemSchema> = {
        title: data.title,
        store: data.store,
        setNumber: data.setNumber || undefined,
        sourceUrl: data.sourceUrl || undefined,
        imageUrl,
        price: data.price || undefined,
        currency: data.currency,
        pieceCount: data.pieceCount && !isNaN(data.pieceCount) ? data.pieceCount : undefined,
        priority: data.priority,
        notes: data.notes || undefined,
        tags: data.tags,
      }

      await addToWishlist(requestData).unwrap()

      showSuccessToast('Item added to wishlist')

      // Clean up image preview
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }

      // Reset form and navigate back
      reset()
      setImageFile(null)
      setImagePreview(null)
      onNavigateBack()
    } catch (error) {
      showErrorToast('Failed to add item to wishlist')
    }
  }

  const isFormSubmitting = isSubmitting || isLoading || isUploadingImage

  return (
    <div className={cn('container mx-auto py-6 max-w-2xl px-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="gap-2"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add to Wishlist</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Wishlist Item</CardTitle>
          <CardDescription>
            Add a LEGO set or MOC to your wishlist. Required fields are marked with *.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="add-item-form">
            {/* Store Selection */}
            <div className="space-y-2">
              <Label htmlFor="store">Store *</Label>
              <Controller
                name="store"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="store" data-testid="store-select">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {STORES.map(store => (
                        <SelectItem key={store} value={store}>
                          {store}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.store ? (
                <p className="text-sm text-destructive" data-testid="store-error">
                  {errors.store.message}
                </p>
              ) : null}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Medieval Castle"
                {...register('title')}
                aria-invalid={errors.title ? 'true' : 'false'}
                data-testid="title-input"
              />
              {errors.title ? (
                <p className="text-sm text-destructive" data-testid="title-error">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            {/* Set Number */}
            <div className="space-y-2">
              <Label htmlFor="setNumber">Set Number</Label>
              <Input
                id="setNumber"
                placeholder="e.g., 10305"
                {...register('setNumber')}
                data-testid="set-number-input"
              />
              <p className="text-xs text-muted-foreground">Official set number (if applicable)</p>
            </div>

            {/* Piece Count */}
            <div className="space-y-2">
              <Label htmlFor="pieceCount">Piece Count</Label>
              <Input
                id="pieceCount"
                type="number"
                placeholder="e.g., 2500"
                {...register('pieceCount', {
                  setValueAs: v => (v === '' ? undefined : parseInt(v, 10)),
                })}
                data-testid="piece-count-input"
              />
            </div>

            {/* Price and Currency */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 199.99"
                  {...register('price')}
                  data-testid="price-input"
                />
                {errors.price ? (
                  <p className="text-sm text-destructive" data-testid="price-error">
                    {errors.price.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="currency" data-testid="currency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={v => field.onChange(parseInt(v, 10))}
                    value={field.value?.toString()}
                  >
                    <SelectTrigger id="priority" data-testid="priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUploadField
                file={imageFile}
                preview={imagePreview}
                onFileChange={handleImageChange}
                onRemove={handleImageRemove}
                isLoading={isUploadingImage}
              />
              <p className="text-xs text-muted-foreground">Upload a product image (optional)</p>
            </div>

            {/* Source URL */}
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://www.lego.com/product/..."
                {...register('sourceUrl')}
                aria-invalid={errors.sourceUrl ? 'true' : 'false'}
                data-testid="source-url-input"
              />
              {errors.sourceUrl ? (
                <p className="text-sm text-destructive" data-testid="source-url-error">
                  {errors.sourceUrl.message}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">Link to the product page</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes (e.g., wait for sale)..."
                rows={3}
                {...register('notes')}
                data-testid="notes-input"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onNavigateBack}
                disabled={isFormSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isFormSubmitting}
                className="gap-2"
                data-testid="submit-button"
              >
                {isFormSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Wishlist
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AddItemPage
