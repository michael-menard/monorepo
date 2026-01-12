import { GalleryEmptyState } from '@repo/gallery'
import { Heart, PartyPopper, Search } from 'lucide-react'

export interface WishlistEmptyStateBaseProps {
  onAddItem: () => void
}

export interface WishlistNoResultsEmptyStateProps {
  onClearFilters: () => void
  filterSummary?: string
}

/**
 * Empty state shown for brand new wishlist users (no items yet).
 */
export function NewUserEmptyState({ onAddItem }: WishlistEmptyStateBaseProps) {
  return (
    <GalleryEmptyState
      icon={Heart}
      title="Nothing on your wishlist yet"
      description="Start adding sets you're dreaming about!"
      action={{
        label: 'Add Item',
        onClick: onAddItem,
      }}
      aria-label="Your wishlist is empty. Use the Add Item button to start building your wishlist."
    />
  )
}

/**
 * Empty state shown when the user previously had items but has now
 * purchased or cleared all of them.
 */
export function AllPurchasedEmptyState({ onAddItem }: WishlistEmptyStateBaseProps) {
  return (
    <GalleryEmptyState
      icon={PartyPopper}
      title="You got everything on your list!"
      description="Time to dream bigger."
      action={{
        label: 'Add More',
        onClick: onAddItem,
      }}
      aria-label="Congratulations! You've purchased all items on your wishlist. Use the Add More button to add new items."
    />
  )
}

/**
 * Empty state shown when filters/search yield no results.
 */
export function NoResultsEmptyState({
  onClearFilters,
  filterSummary,
}: WishlistNoResultsEmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={Search}
      title="No wishlist items match your filters"
      description={filterSummary || 'Try adjusting your search or filters.'}
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters,
      }}
      aria-label="No wishlist items match your current search or filters. Use the Clear Filters button to reset filters."
    />
  )
}
