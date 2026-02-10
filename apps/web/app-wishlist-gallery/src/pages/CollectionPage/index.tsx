/**
 * Collection Page Component
 *
 * Displays owned items using the existing gallery infrastructure with status='owned' filter.
 * Reuses DraggableWishlistGallery component with collection-specific configuration.
 *
 * Story SETS-MVP-002: Collection View
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { GalleryEmptyState, GallerySkeleton, FilterProvider } from '@repo/gallery'
import { CustomButton } from '@repo/app-component-library'
import { Package } from 'lucide-react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { GotItModal } from '../../components/GotItModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { DraggableWishlistGallery } from '../../components/DraggableWishlistGallery'

/**
 * Collection page props schema
 */
const CollectionPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type CollectionPageProps = z.infer<typeof CollectionPagePropsSchema>

/**
 * CollectionPageContent - Inner component with filter context
 *
 * AC1: Renders at /collection route
 * AC3: Page title "My Collection"
 * AC4: Reuses WishlistGallery with status='owned' filter
 * AC12, AC13: Empty state with CTA to wishlist
 */
function CollectionPageContent() {
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null)
  const [itemForGotIt, setItemForGotIt] = useState<WishlistItem | null>(null)

  // AC4: Query with status='owned' filter
  // AC10: Default sort is purchaseDate DESC (handled by service layer)
  const { data, isLoading, isError, refetch } = useGetWishlistQuery({
    status: 'owned',
    page: 1,
    limit: 100,
  })

  const [removeFromWishlist] = useRemoveFromWishlistMutation()

  // Delete handler
  const handleDelete = useCallback((item: WishlistItem) => {
    setItemToDelete(item)
  }, [])

    // Got It handler (for moving back to wishlist if needed)
  const handleGotIt = useCallback((item: WishlistItem) => {
    setItemForGotIt(item)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">My Collection</h1>
        <GallerySkeleton count={6} />
      </div>
    )
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">My Collection</h1>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load collection</p>
          <CustomButton onClick={() => refetch()}>Retry</CustomButton>
        </div>
      </div>
    )
  }

  const { items } = data

  // AC12, AC13: Empty state with CTA
  if (items.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">My Collection</h1>
        <GalleryEmptyState
          icon={Package}
          title="No sets in your collection yet"
          description="Items you mark as purchased will appear here"
          action={{
            label: 'Browse your wishlist',
            onClick: () => window.location.href = '/wishlist',
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* AC3: Page title */}
      <h1 className="text-3xl font-bold mb-8">My Collection</h1>

      {/* AC4, AC7, AC8: Reuse DraggableWishlistGallery with collection config */}
      <DraggableWishlistGallery
        items={items}
        isDraggingEnabled={false}
        onDelete={handleDelete}
        onGotIt={handleGotIt}
      />

      {/* Modals */}
      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        item={itemToDelete}
        onConfirm={async (item) => {
          try {
            await removeFromWishlist(item.id).unwrap()
            toast.success('Item removed from collection')
            setItemToDelete(null)
          } catch (error) {
            toast.error('Failed to remove item')
          }
        }}
        onClose={() => setItemToDelete(null)}
      />

      <GotItModal
        isOpen={!!itemForGotIt}
        item={itemForGotIt}
        onClose={() => setItemForGotIt(null)}
      />
    </div>
  )
}

/**
 * CollectionPage - Main export with FilterProvider
 *
 * Wraps content in FilterProvider for consistency with main page.
 */
export function CollectionPage({ className }: CollectionPageProps) {
  // Empty initial filters - collection doesn't need complex filtering
  const initialFilters = {}

  return (
    <FilterProvider initialFilters={initialFilters}>
      <div className={className}>
        <CollectionPageContent />
      </div>
    </FilterProvider>
  )
}
