/**
 * Wishlist Gallery Main Page
 *
 * Displays the wishlist gallery with filtering, sorting, and pagination.
 * Uses shared @repo/gallery components with wishlist-specific WishlistCard.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'
import {
  GalleryGrid,
  GalleryFilterBar,
  GalleryPagination,
  GalleryEmptyState,
  GallerySkeleton,
} from '@repo/gallery'
import { Tabs, TabsList, TabsTrigger } from '@repo/app-component-library'
import { Heart } from 'lucide-react'
import { useGetWishlistQuery } from '@repo/api-client/rtk/wishlist-gallery-api'
import { WishlistCard } from '../components/WishlistCard'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Sort options for wishlist
 */
const wishlistSortOptions = [
  { value: 'sortOrder-asc', label: 'Manual Order' },
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'priority-desc', label: 'Priority: High to Low' },
  { value: 'priority-asc', label: 'Priority: Low to High' },
]

/**
 * Wishlist Gallery Main Page Component
 */
export function MainPage({ className }: MainPageProps) {
  // Filter state
  const [search, setSearch] = useState('')
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortValue, setSortValue] = useState('sortOrder-asc')
  const [page, setPage] = useState(1)

  // Parse sort value
  const [sortField, sortOrder] = sortValue.split('-') as [string, 'asc' | 'desc']

  // Fetch wishlist data
  const {
    data: wishlistData,
    isLoading,
    isFetching,
    error,
  } = useGetWishlistQuery({
    q: search || undefined,
    store: selectedStore || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    sort: sortField as 'createdAt' | 'title' | 'price' | 'sortOrder' | 'priority',
    order: sortOrder,
    page,
    limit: 20,
  })

  // Extract data
  const items = wishlistData?.items ?? []
  const pagination = wishlistData?.pagination
  const counts = wishlistData?.counts
  const filters = wishlistData?.filters

  // Store tabs content
  const stores = filters?.availableStores ?? []
  const storeCounts = counts?.byStore ?? {}

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }, [])

  // Handle store filter
  const handleStoreChange = useCallback((store: string | null) => {
    setSelectedStore(store)
    setPage(1)
  }, [])

  // Handle tag filter
  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags)
    setPage(1)
  }, [])

  // Handle sort
  const handleSortChange = useCallback((value: string) => {
    setSortValue(value)
    setPage(1)
  }, [])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearch('')
    setSelectedStore(null)
    setSelectedTags([])
    setSortValue('sortOrder-asc')
    setPage(1)
  }, [])

  // Handle card click (navigate to detail page)
  const handleCardClick = useCallback((itemId: string) => {
    // TODO: Navigate to detail page when route is set up
    console.log('Navigate to wishlist item:', itemId)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <GallerySkeleton count={8} showFilters />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <GalleryEmptyState
            icon={Heart}
            title="Failed to load wishlist"
            description="Something went wrong while loading your wishlist. Please try again."
            action={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </div>
    )
  }

  // Empty state
  if (items.length === 0 && !search && !selectedStore && selectedTags.length === 0) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <GalleryEmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Add LEGO sets to your wishlist to keep track of what you want."
            action={{
              label: 'Browse Sets',
              onClick: () => console.log('Navigate to browse'), // TODO: Navigate to browse page
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Wishlist</h1>
          {counts ? (
            <span className="text-muted-foreground">
              {counts.total} {counts.total === 1 ? 'item' : 'items'}
            </span>
          ) : null}
        </div>

        {/* Filter Bar with Store Tabs */}
        <GalleryFilterBar
          search={search}
          onSearchChange={setSearch}
          onSearch={handleSearch}
          searchPlaceholder="Search wishlist..."
          tags={filters?.availableTags ?? []}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          tagsPlaceholder="Filter by tags"
          sortOptions={wishlistSortOptions}
          selectedSort={sortValue}
          onSortChange={handleSortChange}
          onClearAll={handleClearFilters}
          data-testid="wishlist-filter-bar"
        >
          {/* Store Tabs - custom filter UI */}
          {stores.length > 0 && (
            <Tabs
              value={selectedStore ?? 'all'}
              onValueChange={value => handleStoreChange(value === 'all' ? null : value)}
            >
              <TabsList>
                <TabsTrigger value="all">All ({counts?.total ?? 0})</TabsTrigger>
                {stores.map(store => (
                  <TabsTrigger key={store} value={store}>
                    {store} ({storeCounts[store] ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </GalleryFilterBar>

        {/* Loading overlay for refetching */}
        <div className={isFetching && !isLoading ? 'opacity-60 pointer-events-none' : ''}>
          {/* No results after filtering */}
          {items.length === 0 ? (
            <GalleryEmptyState
              icon={Heart}
              title="No matching items"
              description="Try adjusting your filters or search terms."
              action={{
                label: 'Clear Filters',
                onClick: handleClearFilters,
              }}
            />
          ) : (
            <>
              {/* Gallery Grid */}
              <GalleryGrid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
                {items.map(item => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onClick={() => handleCardClick(item.id)}
                  />
                ))}
              </GalleryGrid>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 ? (
                <div className="mt-8">
                  <GalleryPagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MainPage
