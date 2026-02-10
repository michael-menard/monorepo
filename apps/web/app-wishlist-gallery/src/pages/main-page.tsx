/**
 * Wishlist Gallery Main Page
 *
 * Displays the wishlist gallery with filtering, sorting, and pagination.
 * Uses shared @repo/gallery components with wishlist-specific WishlistCard.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story WISH-2041: Delete Flow
 * Story WISH-2042: Purchase/Got It Flow
 * Story WISH-2005a: Drag-and-drop reordering
 * Story WISH-2015: Sort Mode Persistence (localStorage)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import { Tabs, TabsList, TabsTrigger, CustomButton } from '@repo/app-component-library'
import { Heart, Plus } from 'lucide-react'
import type { WishlistItem, CreateWishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useAddWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { WishlistCard } from '../components/WishlistCard'
import { GotItModal } from '../components/GotItModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { DraggableWishlistGallery } from '../components/DraggableWishlistGallery'
import { useWishlistSortPersistence, DEFAULT_SORT_MODE } from '../hooks/useWishlistSortPersistence'
import { useAnnouncer, Announcer } from '../hooks/useAnnouncer'
import { FilterPanel } from '../components/FilterPanel'
import { FilterBadge } from '../components/FilterPanel/FilterBadge'
import type { PriorityRange, PriceRange, FilterPanelState } from '../components/FilterPanel/__types__'
import type { WishlistStore } from '@repo/api-client/schemas/wishlist'


/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Sort options for wishlist
 *
 * WISH-2014: Added smart sorting modes
 * - Best Value: price/pieceCount ratio (lowest first)
 * - Expiring Soon: oldest release date first
 * - Hidden Gems: (5 - priority) * pieceCount (highest first)
 *
 * Note: Icon integration with sort dropdown deferred to future enhancement.
 * Icons imported for potential tooltip/visual indicator use in expanded UI.
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
  // Smart sorting algorithms (WISH-2014)
  { value: 'bestValue-asc', label: 'Best Value' },
  { value: 'expiringSoon-asc', label: 'Expiring Soon' },
  { value: 'hiddenGems-desc', label: 'Hidden Gems' },
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
 *
 * Must satisfy Record<string, unknown> to work with FilterProvider generics.
 */
type WishlistFilters = {
  search: string
  store: string | null
  tags: string[]
  sort: string
  page: number
  // WISH-20172: Advanced filter criteria
  priorityRange: PriorityRange | null
  priceRange: PriceRange | null
  stores: WishlistStore[]
} & Record<string, unknown>

/**
 * Props for WishlistMainPageContent including sort persistence
 */
interface WishlistMainPageContentProps extends MainPageProps {
  /** Callback to persist sort mode changes to localStorage */
  onSortPersist: (sortMode: string) => void
  /** Whether the sort mode was restored from localStorage */
  wasRestored: boolean
}

/**
 * Get human-readable label for sort mode
 */
const getSortModeLabel = (sortValue: string): string => {
  const option = wishlistSortOptions.find(opt => opt.value === sortValue)
  return option?.label ?? sortValue
}

function WishlistMainPageContent({
  className,
  onSortPersist,
  wasRestored,
}: WishlistMainPageContentProps) {
  const { filters, updateFilter, clearFilters } = useFilterContext<WishlistFilters>()

  // WISH-2006: Screen reader announcements for filter/sort changes
  const { announce, announcement, priority } = useAnnouncer()

  const search = filters.search
  const selectedStore = filters.store
  const selectedTags = filters.tags
  const sortValue = filters.sort
  const page = filters.page
  // WISH-20172: Advanced filters
  const priorityRange = filters.priorityRange
  const priceRange = filters.priceRange
  const filterStores = filters.stores

  // View mode state (grid | datatable) with persistence
  const [viewMode, setViewMode] = useViewMode('wishlist')

  // Got It modal state (WISH-2042)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<WishlistItem | null>(null)

  // Delete modal state (WISH-2041)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<WishlistItem | null>(null)
  const deletedItemRef = useRef<WishlistItem | null>(null)

  // RTK Query mutations for delete flow (WISH-2041)
  const [removeFromWishlist, { isLoading: isDeleting }] = useRemoveFromWishlistMutation()
  const [addWishlistItem] = useAddWishlistItemMutation()

  // First-time hint state for view toggle tooltip
  const [showHint, dismissHint] = useFirstTimeHint()

  // Navigate hook for empty state action
  const navigateToAdd = useNavigate()

  // Screen reader announcement for restored sort mode (WISH-2015 AC14)
  const hasAnnouncedRef = useRef(false)
  useEffect(() => {
    if (wasRestored && !hasAnnouncedRef.current && sortValue !== DEFAULT_SORT_MODE) {
      hasAnnouncedRef.current = true
      // Create an aria-live region to announce the restored sort mode
      const announcement = document.createElement('div')
      announcement.setAttribute('role', 'status')
      announcement.setAttribute('aria-live', 'polite')
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      announcement.textContent = `Sort mode set to ${getSortModeLabel(sortValue)}`
      document.body.appendChild(announcement)
      // Remove after announcement is read
      setTimeout(() => {
        document.body.removeChild(announcement)
      }, 1000)
    }
  }, [wasRestored, sortValue])

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
    // WISH-20172: Combine tab filter (store) and FilterPanel (stores) into array
    store: filterStores.length > 0 
      ? filterStores 
      : (selectedStore ? [selectedStore as WishlistStore] : undefined),
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    // WISH-20172: Advanced filter criteria
    priorityRange: priorityRange || undefined,
    priceRange: priceRange || undefined,
    sort: sortField as
      | 'createdAt'
      | 'title'
      | 'price'
      | 'pieceCount'
      | 'sortOrder'
      | 'priority'
      | 'bestValue'
      | 'expiringSoon'
      | 'hiddenGems',
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
      // WISH-2006 AC10: Announce search results
      if (value.trim()) {
        // Delay announcement to wait for data to load
        setTimeout(() => {
          const count = wishlistData?.items.length ?? 0
          announce(`Search results: ${count} items found for "${value}"`)
        }, 500)
      }
    },
    [updateFilter, announce, wishlistData],
  )

  // Handle store filter
  const handleStoreChange = useCallback(
    (store: string | null) => {
      updateFilter('store', store)
      updateFilter('page', 1)
      // WISH-2006 AC10: Announce store filter change
      const count = store ? (storeCounts[store] ?? 0) : (counts?.total ?? 0)
      const storeLabel = store ?? 'All'
      announce(`Filtered to ${storeLabel} store: ${count} items`)
    },
    [updateFilter, announce, counts, storeCounts],
  )

  // Handle tag filter
  const handleTagsChange = useCallback(
    (tags: string[]) => {
      updateFilter('tags', tags)
      updateFilter('page', 1)
      // WISH-2006 AC10: Announce tag filter change
      if (tags.length > 0) {
        announce(`Filtered by tags: ${tags.join(', ')}`)
      } else {
        announce('Tag filter cleared')
      }
    },
    [updateFilter, announce],
  )

  // Handle sort (WISH-2015: persist to localStorage)
  const handleSortChange = useCallback(
    (value: string) => {
      updateFilter('sort', value)
      updateFilter('page', 1)
      // Persist to localStorage
      onSortPersist(value)
      // WISH-2006 AC10: Announce sort change
      const sortLabel = getSortModeLabel(value)
      announce(`Sort mode changed to ${sortLabel}`)
    },
    [updateFilter, onSortPersist, announce],
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
  // WISH-20172: FilterPanel handlers
  const handleApplyFilters = useCallback(
    (panelState: FilterPanelState) => {
      updateFilter('stores', panelState.stores)
      updateFilter('priorityRange', panelState.priorityRange)
      updateFilter('priceRange', panelState.priceRange)
      updateFilter('page', 1)
      
      // WISH-2006 AC10: Announce filter application
      const filterCount = 
        (panelState.stores.length > 0 ? 1 : 0) +
        (panelState.priorityRange ? 1 : 0) +
        (panelState.priceRange ? 1 : 0)
      
      if (filterCount > 0) {
        setTimeout(() => {
          const count = wishlistData?.items.length ?? 0
          announce(`${filterCount} filters applied. ${count} items found.`)
        }, 500)
      }
    },
    [updateFilter, announce, wishlistData],
  )

  const handleClearFilterPanel = useCallback(() => {
    updateFilter('stores', [])
    updateFilter('priorityRange', null)
    updateFilter('priceRange', null)
    updateFilter('page', 1)
    
    // WISH-2006 AC10: Announce clear
    setTimeout(() => {
      const count = wishlistData?.items.length ?? 0
      announce(`Filters cleared. Showing all ${count} items.`)
    }, 500)
  }, [updateFilter, announce, wishlistData])

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

  // Handle Got It button click (WISH-2042)
  const handleGotIt = useCallback((item: WishlistItem) => {
    setSelectedItemForPurchase(item)
    setGotItModalOpen(true)
  }, [])

  // Close Got It modal
  const handleCloseGotItModal = useCallback(() => {
    setGotItModalOpen(false)
    setSelectedItemForPurchase(null)
  }, [])

  // Handle Delete button click (WISH-2041)
  const handleDeleteClick = useCallback((item: WishlistItem) => {
    setSelectedItemForDelete(item)
    setDeleteModalOpen(true)
  }, [])

  // Close Delete modal
  const handleCloseDeleteModal = useCallback(() => {
    setDeleteModalOpen(false)
    setSelectedItemForDelete(null)
  }, [])

  // Get error message from API error (WISH-2041 AC 17-18)
  const getDeleteErrorMessage = useCallback((error: unknown): string => {
    if (!error) return 'Failed to delete item. Please try again.'

    // Check for RTK Query error shape
    const rtkError = error as { status?: number; data?: { error?: string } }

    if (rtkError.status === 403) {
      return "You don't have permission to delete this item"
    }
    if (rtkError.status === 404) {
      return 'Item not found or already deleted'
    }
    if (rtkError.status === undefined || rtkError.status === 0) {
      return 'Network error. Please check your connection.'
    }

    return 'Failed to delete item. Please try again.'
  }, [])

  // Handle Delete confirmation (WISH-2041)
  const handleDeleteConfirm = useCallback(
    async (item: WishlistItem) => {
      // Store item for undo (AC 12)
      deletedItemRef.current = item

      try {
        await removeFromWishlist(item.id).unwrap()

        // Close modal
        handleCloseDeleteModal()

        // Show success toast with undo action (AC 10-11, 16, 20)
        toast('Item removed', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const itemToRestore = deletedItemRef.current
              if (!itemToRestore) return

              try {
                // Restore item (AC 13)
                const createInput: CreateWishlistItem = {
                  title: itemToRestore.title,
                  store: itemToRestore.store,
                  currency: itemToRestore.currency,
                  tags: itemToRestore.tags ?? [],
                  priority: itemToRestore.priority ?? 0,
                  setNumber: itemToRestore.setNumber ?? undefined,
                  sourceUrl: itemToRestore.sourceUrl ?? undefined,
                  imageUrl: itemToRestore.imageUrl ?? undefined,
                  price: itemToRestore.price ?? undefined,
                  pieceCount: itemToRestore.pieceCount ?? undefined,
                  releaseDate: itemToRestore.releaseDate ?? undefined,
                  notes: itemToRestore.notes ?? undefined,
                }

                await addWishlistItem(createInput).unwrap()
                toast.success('Item restored')
                deletedItemRef.current = null
              } catch {
                // Handle undo failure (AC 14)
                toast.error('Failed to restore item')
              }
            },
          },
          duration: 5000, // 5-second undo window (AC 11)
        })

        // Clear stored item after toast duration
        setTimeout(() => {
          deletedItemRef.current = null
        }, 5500)
      } catch (error) {
        // Handle errors (AC 17-18)
        toast.error(getDeleteErrorMessage(error))
      }
    },
    [removeFromWishlist, addWishlistItem, handleCloseDeleteModal, getDeleteErrorMessage],
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Wishlist</h1>
            <Link to="/add">
              <CustomButton style="bold">
                <Plus className="h-4 w-4" />
                Add Item
              </CustomButton>
            </Link>
          </div>
          <GalleryEmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Start adding items you want to keep track of."
            action={{
              label: 'Add First Item',
              onClick: () => {
                void navigateToAdd({ to: '/add' })
              },
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* WISH-2006: Screen reader announcements */}
      <Announcer announcement={announcement} priority={priority} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Wishlist</h1>
            {counts ? (
              <span className="text-muted-foreground">
                {counts.total} {counts.total === 1 ? 'item' : 'items'}
              </span>
            ) : null}
          </div>
          <Link to="/add">
            <CustomButton style="bold">
              <Plus className="h-4 w-4" />
              Add Item
            </CustomButton>
          </Link>
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
            <div className="flex items-center gap-2">
              <FilterPanel
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilterPanel}
                initialState={{
                  stores: filterStores,
                  priorityRange: priorityRange,
                  priceRange: priceRange,
                }}
              />
              <FilterBadge 
                count={
                  (filterStores.length > 0 ? 1 : 0) +
                  (priorityRange ? 1 : 0) +
                  (priceRange ? 1 : 0)
                } 
              />
              <GalleryViewToggle
                currentView={viewMode}
                onViewChange={setViewMode}
                showFirstTimeHint={showHint}
                onDismissHint={dismissHint}
              />
            </div>
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
                // WISH-2005a: Use DraggableWishlistGallery when in Manual Order mode
                sortField === 'sortOrder' ? (
                  <DraggableWishlistGallery
                    items={items}
                    onCardClick={handleCardClick}
                    onGotIt={handleGotIt}
                    onDelete={handleDeleteClick}
                    isDraggingEnabled={true}
                  />
                ) : (
                  // Standard GalleryGrid for other sort modes (no drag-and-drop)
                  <GalleryGrid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
                    {items.map(item => (
                      <WishlistCard
                        key={item.id}
                        item={item}
                        onClick={() => handleCardClick(item.id)}
                        onGotIt={() => handleGotIt(item)}
                        onDelete={() => handleDeleteClick(item)}
                      />
                    ))}
                  </GalleryGrid>
                )
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

      {/* Got It Modal (WISH-2042) */}
      <GotItModal
        isOpen={gotItModalOpen}
        onClose={handleCloseGotItModal}
        item={selectedItemForPurchase}
        onSuccess={() => {
          // Refetch the list after successful purchase
          void refetch()
        }}
      />

      {/* Delete Confirm Modal (WISH-2041) */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        item={selectedItemForDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}

export function MainPage({ className }: MainPageProps) {
  // WISH-2015: Use persisted sort mode from localStorage
  const { sortMode, setSortMode, wasRestored } = useWishlistSortPersistence()

  // Memoize initial filters to avoid unnecessary re-renders
  const initialFilters = useMemo(
    () => ({
      search: '',
      store: null,
      tags: [],
      sort: sortMode,
      page: 1,
      // WISH-20172: Advanced filters
      priorityRange: null,
      priceRange: null,
      stores: [],
    }),
    [sortMode],
  )

  return (
    <FilterProvider<WishlistFilters> initialFilters={initialFilters}>
      <WishlistMainPageContent
        className={className}
        onSortPersist={setSortMode}
        wasRestored={wasRestored}
      />
    </FilterProvider>
  )
}

export default MainPage
