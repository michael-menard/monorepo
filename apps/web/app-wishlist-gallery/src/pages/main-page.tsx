/**
 * Wishlist Gallery Main Page
 *
 * Displays the wishlist gallery with filtering, sorting, and pagination.
 * Uses shared @repo/gallery components with wishlist-specific WishlistCard.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { useState, useCallback, useEffect } from 'react'
import { z } from 'zod'
import {
  GalleryGrid,
  GalleryFilterBar,
  GalleryPagination,
  GalleryEmptyState,
  GallerySkeleton,
  GalleryViewToggle,
  GalleryDataTable,
  FilterProvider,
  useFilterContext,
  useViewMode,
  useFirstTimeHint,
  type GalleryDataTableColumn,
} from '@repo/gallery'
import { Tabs, TabsList, TabsTrigger } from '@repo/app-component-library'
import { Heart } from 'lucide-react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
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
 * Format price string with currency for display in the wishlist datatable.
 */
const formatCurrency = (price: string | null, currency: string): string => {
  if (!price) return ''

  const numPrice = Number(price)
  if (Number.isNaN(numPrice)) return ''

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return formatter.format(numPrice)
}

/**
 * Hardcoded wishlist columns for the datatable view.
 *
 * Columns: title, price, store, priority.
 */
const wishlistColumns: GalleryDataTableColumn<WishlistItem>[] = [
  {
    field: 'title',
    header: 'Title',
    size: 400, // 40% of 1000
    render: item => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground truncate">{item.title}</span>
        {item.setNumber ? (
          <span className="text-xs text-muted-foreground mt-0.5">Set #{item.setNumber}</span>
        ) : null}
      </div>
    ),
  },
  {
    field: 'price',
    header: 'Price',
    size: 200,
    className: 'text-right',
    render: item => <span>{item.price ? formatCurrency(item.price, item.currency) : '—'}</span>,
  },
  {
    field: 'store',
    header: 'Store',
    size: 200,
    className: 'text-center',
    render: item => (
      <span className="inline-block px-2 py-1 text-xs rounded bg-muted">{item.store}</span>
    ),
  },
  {
    field: 'priority',
    header: 'Priority',
    size: 200,
    className: 'text-center',
    render: item => (
      <span aria-label={`Priority ${item.priority} of 5`}>
        {item.priority > 0 ? '★'.repeat(item.priority) : '—'}
      </span>
    ),
  },
]

/**
 * Wishlist filter shape for FilterProvider
 */
interface WishlistFilters {
  search: string
  store: string | null
  tags: string[]
  sort: string
  page: number
}

function WishlistMainPageContent({ className }: MainPageProps) {
  const { filters, updateFilter, clearFilters } = useFilterContext<WishlistFilters>()

  const search = filters.search
  const selectedStore = filters.store
  const selectedTags = filters.tags
  const sortValue = filters.sort
  const page = filters.page

  // View mode state (grid | datatable) with persistence
  const [viewMode, setViewMode] = useViewMode('wishlist')

  // First-time hint state for view toggle tooltip
  const [showHint, dismissHint] = useFirstTimeHint()

  // Parse sort value
  const [sortField, sortOrder] = sortValue.split('-') as [string, 'asc' | 'desc']

  // Fetch wishlist data
  const {
    data: wishlistData,
    isLoading,
    isFetching,
    error,
    refetch,
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
  const availableFilters = wishlistData?.filters

  // Accumulated items for infinite scroll in datatable view
  const [allItems, setAllItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    if (!wishlistData || viewMode !== 'datatable') return

    const nextItems = wishlistData.items as WishlistItem[]

    if (!pagination || pagination.page === 1) {
      setAllItems(nextItems)
      return
    }

    setAllItems(prev => {
      const existingIds = new Set(prev.map(item => item.id))
      const newItems = nextItems.filter(item => !existingIds.has(item.id))
      return [...prev, ...newItems]
    })
  }, [wishlistData, pagination, viewMode])

  // Store tabs content
  const stores = availableFilters?.availableStores ?? []
  const storeCounts = counts?.byStore ?? {}

  const hasActiveFilters = Boolean(
    (search && search.trim().length > 0) ||
      selectedStore ||
      (selectedTags && selectedTags.length > 0),
  )

  // Handle search
  const handleSearch = useCallback(
    (value: string) => {
      updateFilter('search', value)
      updateFilter('page', 1)
    },
    [updateFilter],
  )

  // Handle store filter
  const handleStoreChange = useCallback(
    (store: string | null) => {
      updateFilter('store', store)
      updateFilter('page', 1)
    },
    [updateFilter],
  )

  // Handle tag filter
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      updateFilter('tags', tags)
      updateFilter('page', 1)
    },
    [updateFilter],
  )

  // Handle sort
  const handleSortChange = useCallback(
    (value: string) => {
      updateFilter('sort', value)
      updateFilter('page', 1)
    },
    [updateFilter],
  )

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      updateFilter('page', newPage)
    },
    [updateFilter],
  )

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    clearFilters()
  }, [clearFilters])

  // Handle card/row click (navigate to detail page)
  const handleCardClick = useCallback((itemId: string) => {
    window.location.href = `/wishlist/${itemId}`
  }, [])

  const handleRowClick = useCallback(
    (item: WishlistItem) => {
      handleCardClick(item.id)
    },
    [handleCardClick],
  )

  // Loading state
  if (isLoading && viewMode === 'grid') {
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
              onClick: () => {
                window.location.href = '/sets'
              },
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

        {/* Filter Bar with Store Tabs and View Toggle */}
        <GalleryFilterBar
          search={search}
          onSearchChange={handleSearch}
          onSearch={handleSearch}
          searchPlaceholder="Search wishlist..."
          tags={availableFilters?.availableTags ?? []}
          selectedTags={selectedTags}
          onTagsChange={handleTagsChange}
          tagsPlaceholder="Filter by tags"
          sortOptions={wishlistSortOptions}
          selectedSort={sortValue}
          onSortChange={handleSortChange}
          onClearAll={handleClearFilters}
          rightSlot={
            <GalleryViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              showFirstTimeHint={showHint}
              onDismissHint={dismissHint}
            />
          }
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
          {error ? (
            <GalleryDataTable
              items={[]}
              columns={wishlistColumns}
              isLoading={isLoading}
              ariaLabel="Wishlist items table"
              error={error as Error}
              onRetry={() => {
                void refetch()
              }}
              isRetrying={isFetching}
            />
          ) : items.length === 0 ? (
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
              {/* Gallery Content - view mode controlled by GalleryViewToggle */}
              {viewMode === 'grid' ? (
                <GalleryGrid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
                  {items.map(item => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onClick={() => handleCardClick(item.id)}
                    />
                  ))}
                </GalleryGrid>
              ) : (
                <GalleryDataTable<WishlistItem>
                  items={allItems}
                  columns={wishlistColumns}
                  isLoading={isFetching}
                  onRowClick={handleRowClick}
                  hasMore={Boolean(pagination && pagination.page < pagination.totalPages)}
                  onLoadMore={() => {
                    if (!pagination) return
                    if (pagination.page >= pagination.totalPages) return
                    handlePageChange(pagination.page + 1)
                  }}
                  ariaLabel="Wishlist items table"
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={handleClearFilters}
                />
              )}

              {/* Pagination - grid view only */}
              {viewMode === 'grid' && pagination && pagination.totalPages > 1 ? (
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

export function MainPage({ className }: MainPageProps) {
  return (
    <FilterProvider<WishlistFilters>
      initialFilters={{
        search: '',
        store: null,
        tags: [],
        sort: 'sortOrder-asc',
        page: 1,
      }}
    >
      <WishlistMainPageContent className={className} />
    </FilterProvider>
  )
}

export default MainPage
