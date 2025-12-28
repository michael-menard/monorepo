/**
 * Wishlist Edit Page
 *
 * Allows editing all fields of a wishlist item.
 * Pre-populates form with existing data.
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { useEffect, useCallback } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Skeleton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast,
} from '@repo/app-component-library'
import { ArrowLeft, Loader2, Package, Save } from 'lucide-react'
import {
  useGetWishlistItemQuery,
  useUpdateWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import {
  UpdateWishlistItemSchema,
  type UpdateWishlistItem,
  type WishlistItem,
} from '@repo/api-client/schemas/wishlist'
import { WishlistFormFields } from '../components/WishlistFormFields'

/**
 * EditPage props schema
 */
export const EditPagePropsSchema = z.object({
  /** Wishlist item ID */
  itemId: z.string().uuid(),
  /** Navigation callback to go back to detail page */
  onCancel: z.function().args().returns(z.void()),
  /** Navigation callback after successful save */
  onSuccess: z.function().args().returns(z.void()),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type EditPageProps = z.infer<typeof EditPagePropsSchema>

/**
 * Map item data to form values
 */
function mapItemToFormValues(item: WishlistItem): UpdateWishlistItem {
  return {
    title: item.title,
    store: item.store,
    setNumber: item.setNumber ?? undefined,
    sourceUrl: item.sourceUrl ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
    price: item.price ?? undefined,
    currency: item.currency ?? 'USD',
    pieceCount: item.pieceCount ?? undefined,
    releaseDate: item.releaseDate
      ? new Date(item.releaseDate).toISOString().split('T')[0]
      : undefined,
    tags: item.tags ?? [],
    priority: item.priority ?? 0,
    notes: item.notes ?? undefined,
  }
}

/**
 * Edit Page Skeleton
 */
function EditSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="edit-skeleton">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Not Found State
 */
function NotFoundState({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16" data-testid="edit-not-found">
      <Package className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Item Not Found</h2>
      <p className="text-muted-foreground mb-6">
        This wishlist item doesn't exist or has been deleted.
      </p>
      <Button onClick={onCancel}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  )
}

/**
 * Wishlist Edit Page Component
 */
export function EditPage({ itemId, onCancel, onSuccess, className = '' }: EditPageProps) {
  const { toast } = useToast()

  // Fetch item data
  const { data: item, isLoading: isLoadingItem, error } = useGetWishlistItemQuery(itemId)

  // Update mutation
  const [updateItem, { isLoading: isSaving }] = useUpdateWishlistItemMutation()

  // Form setup
  const form = useForm<UpdateWishlistItem>({
    resolver: zodResolver(UpdateWishlistItemSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      store: '',
      currency: 'USD',
      priority: 0,
      tags: [],
    },
  })

  // Reset form when item loads
  useEffect(() => {
    if (item) {
      form.reset(mapItemToFormValues(item))
    }
  }, [item, form])

  // Handle form submission
  const onSubmit = useCallback(
    async (data: UpdateWishlistItem) => {
      try {
        // Convert empty strings to undefined for optional fields
        const cleanedData = {
          ...data,
          setNumber: data.setNumber || undefined,
          sourceUrl: data.sourceUrl || undefined,
          imageUrl: data.imageUrl || undefined,
          price: data.price || undefined,
          pieceCount: data.pieceCount || undefined,
          releaseDate: data.releaseDate || undefined,
          notes: data.notes || undefined,
        }

        await updateItem({
          id: itemId,
          data: cleanedData,
        }).unwrap()

        toast({
          title: 'Changes saved',
          description: 'Your wishlist item has been updated.',
        })

        onSuccess()
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to save changes. Please try again.',
          variant: 'destructive',
        })
      }
    },
    [itemId, updateItem, onSuccess, toast],
  )

  // Loading state
  if (isLoadingItem) {
    return (
      <div className={className}>
        <EditSkeleton />
      </div>
    )
  }

  // Error / Not found state
  if (error || !item) {
    return (
      <div className={className}>
        <NotFoundState onCancel={onCancel} />
      </div>
    )
  }

  const { formState } = form
  const isDirty = formState.isDirty
  const isValid = formState.isValid

  return (
    <div className={className} data-testid="edit-page">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
            data-testid="edit-cancel-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <h1 className="text-2xl font-bold">Edit Wishlist Item</h1>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Form Fields */}
              <WishlistFormFields form={form} disabled={isSaving} />

              {/* Image URL field (simple text input for now) */}
              <div className="space-y-2">
                <label htmlFor="imageUrl" className="text-sm font-medium">
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  placeholder="https://..."
                  disabled={isSaving}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...form.register('imageUrl')}
                  data-testid="edit-image-url"
                />
                {item.imageUrl ? (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Current image:</p>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-32 h-32 object-cover rounded"
                    />
                  </div>
                ) : null}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !isDirty || !isValid}
                  className="flex-1"
                  data-testid="edit-save-button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EditPage
