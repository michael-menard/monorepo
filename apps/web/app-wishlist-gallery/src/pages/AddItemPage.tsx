/**
 * Add Item Page
 *
 * Page for adding a new wishlist item.
 * Uses WishlistForm component with RTK Query mutation.
 *
 * Story wish-2002: Add Item Flow
 */

import { useCallback } from 'react'
import { useNavigate, Link as RouterLink } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Button, showErrorToast, showSuccessToast } from '@repo/app-component-library'
import { useAddWishlistItemMutation } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import { WishlistForm } from '../components/WishlistForm'

export function AddItemPage() {
  const navigate = useNavigate()
  const [addWishlistItem, { isLoading }] = useAddWishlistItemMutation()

  const handleSubmit = useCallback(
    async (data: CreateWishlistItem) => {
      try {
        await addWishlistItem(data).unwrap()

        // Show success toast
        showSuccessToast('Item added!', `${data.title} has been added to your wishlist.`, 5000)

        // Navigate back to gallery
        void navigate({ to: '/' })
      } catch (error) {
        showErrorToast(error, 'Failed to add item')
      }
    },
    [addWishlistItem, navigate],
  )

  return (
    <div className="container max-w-2xl py-8">
      {/* Back link */}
      <RouterLink to="/">
        <Button variant="ghost" size="sm" className="mb-4">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Gallery
        </Button>
      </RouterLink>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add to Wishlist</h1>
        <p className="text-muted-foreground mt-2">
          Add a new item to your wishlist. Fill in the details below.
        </p>
      </div>

      {/* Form */}
      <WishlistForm onSubmit={handleSubmit} isSubmitting={isLoading} />
    </div>
  )
}

export default AddItemPage
