/**
 * Wishlist Gallery Main Page
 *
 * Displays the wishlist gallery with filtering, sorting, and pagination.
 * Uses shared @repo/gallery components with wishlist-specific WishlistCard.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { useState, useCallback, useEffect, type MouseEvent } from 'react'
import { useDispatch } from 'react-redux'
import { z } from 'zod'
import {
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
import { Tabs, TabsList, TabsTrigger, Button, useToast } from '@repo/app-component-library'
import { Heart } from 'lucide-react'
import type { WishlistItem, MarkPurchasedResponse } from '@repo/api-client/schemas/wishlist'
import {
  wishlistGalleryApi,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useAddToWishlistMutation,
  useReorderWishlistMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'
import { WishlistCard } from '../components/WishlistCard'
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal'
import { GotItModal } from '../components/GotItModal'
import { SortableGallery } from '../components/SortableGallery'
import { SortableWishlistCard } from '../components/SortableWishlistCard'
import {
  NewUserEmptyState,
  AllPurchasedEmptyState,
  NoResultsEmptyState,
} from '../components/WishlistEmptyStates'
import { useRovingTabindex } from '../hooks/useRovingTabindex'
import { useWishlistKeyboardShortcuts } from '../hooks/useWishlistKeyboardShortcuts'
import { announce } from '../components/common/Announcer'

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
interface WishlistFilters extends Record<string, unknown> {
  search: string
  store: string | null
  tags: string[]
  sort: string
  page: number
}

function WishlistMainPageContent({ className }: MainPageProps) {
  const { filters, updateFilter, clearFilters } = useFilterContext<WishlistFilters>()
  const { toast, success, error } = useToast()
  const dispatch = useDispatch<any>()

  const [selectedItemForDelete, setSelectedItemForDelete] = useState<WishlistItem | null>(null)
  const [selectedItemForGotIt, setSelectedItemForGotIt] = useState<WishlistItem | null>(null)
  const [lastPurchasedItem, setLastPurchasedItem] = useState<WishlistItem | null>(null)
  const [lastPurchaseResponse, setLastPurchaseResponse] = useState<MarkPurchasedResponse | null>(
    null,
  )

  const [removeFromWishlist, { isLoading: isDeleting }] = useRemoveFromWishlistMutation()
  const [addToWishlist] = useAddToWishlistMutation()
  const [reorderWishlist] = useReorderWishlistMutation()

  // Local grid items state for optimistic drag-and-drop reordering
  const [gridItems, setGridItems] = useState<WishlistItem[]>([])

  // Track whether the user has ever had wishlist items, so we can
  // differentiate new-user vs all-purchased empty states.
  const [hasHadItems, setHasHadItems] = useState(false)

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

  const queryArgs = {
    q: search || undefined,
    store: selectedStore || undefined,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    sort: sortField as 'createdAt' | 'title' | 'price' | 'sortOrder' | 'priority',
    order: sortOrder,
    page,
    limit: 20,
  }

  // Fetch wishlist data
  const {
    data: wishlistData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useGetWishlistQuery(queryArgs)

  // Extract data
  const items = wishlistData?.items ?? []
  const pagination = wishlistData?.pagination
  const counts = wishlistData?.counts
  const availableFilters = wishlistData?.filters

  // Accumulated items for infinite scroll in datatable view
  const [allItems, setAllItems] = useState<WishlistItem[]>([])

  // Initialise hasHadItems from localStorage on first mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('wishlist:hadItems')
    if (stored === 'true') {
      setHasHadItems(true)
    }
  }, [])

  // Keep track of whether the user has ever had wishlist items
  useEffect(() => {
    if (counts?.total && counts.total > 0) {
      setHasHadItems(true)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('wishlist:hadItems', 'true')
      }
    }
  }, [counts?.total])

  // Keep a local copy of items for grid view so we can optimistically
  // update the UI during drag-and-drop reordering.
  useEffect(() => {
    if (!items || items.length === 0) {
      setGridItems([])
      return
    }

    setGridItems(items)
  }, [items])

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

  // Local items used for the grid view (may diverge from API order during drag-and-drop)
  const galleryItems = gridItems.length > 0 ? gridItems : items

  // Roving tabindex state for keyboard navigation in the grid view
  const {
    focusedIndex,
    focusedId,
    setItemRef,
    handleKeyDown: handleGridKeyDown,
    getTabIndex,
  } = useRovingTabindex({
    items: galleryItems,
    columns: 4,
    onActivate: id => {
      handleCardClick(id)
    },
  })

  // Global keyboard shortcuts for wishlist actions
  useWishlistKeyboardShortcuts({
    focusedItemId: viewMode === 'grid' ? focusedId : undefined,
    onGotIt: id => {
      const item = galleryItems.find(i => i.id === id)
      if (item) {
        setSelectedItemForGotIt(item)
      }
    },
    onDelete: id => {
      const item = galleryItems.find(i => i.id === id)
      if (item) {
        setSelectedItemForDelete(item)
      }
    },
    isModalOpen: Boolean(selectedItemForGotIt || selectedItemForDelete),
  })

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

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItemForDelete) return

    const item = selectedItemForDelete

    try {
      await removeFromWishlist(item.id).unwrap()
      success('Item removed', `"${item.title}" was removed from your wishlist.`)
      announce(`Removed ${item.title} from your wishlist`)
    } catch (err) {
      error(err, 'Failed to remove item')
      announce('Failed to remove wishlist item', 'assertive')
    } finally {
      setSelectedItemForDelete(null)
    }
  }, [selectedItemForDelete, removeFromWishlist, success, error])

  const handleRowClick = useCallback(
    (item: WishlistItem) => {
      handleCardClick(item.id)
    },
    [handleCardClick],
  )

  const handleUndoPurchase = useCallback(async () => {
    if (!lastPurchasedItem || !lastPurchaseResponse?.removedFromWishlist) return

    const item = lastPurchasedItem

    try {
      await addToWishlist({
        title: item.title,
        store: item.store,
        setNumber: item.setNumber ?? undefined,
        sourceUrl: item.sourceUrl ?? undefined,
        imageUrl: item.imageUrl ?? undefined,
        price: item.price ?? undefined,
        currency: item.currency,
        pieceCount: item.pieceCount ?? undefined,
        releaseDate: item.releaseDate ?? undefined,
        tags: item.tags ?? [],
        priority: item.priority,
        notes: item.notes ?? undefined,
      }).unwrap()

      success('Undo successful', `"${item.title}" was restored to your wishlist.`)
      setLastPurchasedItem(null)
      setLastPurchaseResponse(null)
    } catch (err) {
      error(err, 'Failed to undo purchase')
    }
  }, [addToWishlist, lastPurchasedItem, lastPurchaseResponse, success, error])

  const handleGotItCompleted = useCallback(
    ({ item, response }: { item: WishlistItem; response: MarkPurchasedResponse }) => {
      setSelectedItemForGotIt(null)
      setLastPurchasedItem(item)
      setLastPurchaseResponse(response)

      const hasNewSet = Boolean(response.newSetId)
      const wasRemoved = response.removedFromWishlist

      const description = hasNewSet
        ? 'View it in your Sets gallery.'
        : wasRemoved
          ? 'Item marked as purchased and removed from wishlist.'
          : 'Item marked as purchased and kept on wishlist.'

      const primaryAction = wasRemoved
        ? {
            label: 'Undo',
            onClick: handleUndoPurchase,
          }
        : undefined

      const secondaryAction = hasNewSet
        ? {
            label: 'View in Sets',
            onClick: () => {
              window.location.href = `/sets/${response.newSetId}`
            },
          }
        : undefined

      toast({
        title: 'Added to your collection!',
        description,
        variant: 'success',
        duration: 5000,
        primaryAction,
        secondaryAction,
      })
    },
    [
      handleUndoPurchase,
      toast,
      setSelectedItemForGotIt,
      setLastPurchasedItem,
      setLastPurchaseResponse,
    ],
  )

  const handleUndo = useCallback(
    async (previousIds: string[]) => {
      if (!previousIds.length) return

      const currentItems = gridItems.length > 0 ? gridItems : items
      const restored = previousIds
        .map(id => currentItems.find(item => item.id === id))
        .filter(Boolean) as WishlistItem[]

      setGridItems(restored)

      try {
        await reorderWishlist({
          items: previousIds.map((id, index) => ({ id, sortOrder: index })),
        }).unwrap()
      } catch (err) {
        error(err, 'Failed to undo wishlist priority change')
      }
    },
    [gridItems, items, reorderWishlist, error],
  )

  const handleReorder = useCallback(
    async (reorderedItems: WishlistItem[]) => {
      const previousIds = gridItems.map(item => item.id)
      const newIds = reorderedItems.map(item => item.id)

      // Optimistically update local grid items
      setGridItems(reorderedItems)

      // Patch RTK Query cache for the current wishlist query so
      // other subscribers (e.g. datatable view) see the new order
      const patchResult = dispatch(
        wishlistGalleryApi.util.updateQueryData('getWishlist', queryArgs, draft => {
          if (!draft?.items) return

          // Reorder items to match newIds, preserving object identities
          const byId = new Map(reorderedItems.map(item => [item.id, item]))
          draft.items = newIds.map(id => byId.get(id)).filter(Boolean) as WishlistItem[]
        }),
      )

      // Show undo toast
      toast({
        title: 'Priority updated',
        description: 'You can undo this change for the next few seconds.',
        duration: 5000,
        primaryAction: {
          label: 'Undo',
          onClick: () => {
            void handleUndo(previousIds)
          },
        },
      })

      try {
        await reorderWishlist({
          items: newIds.map((id, index) => ({ id, sortOrder: index })),
        }).unwrap()
        announce('Updated wishlist item priorities')
      } catch (err) {
        // Revert RTK cache and local state on failure
        ;(patchResult as any).undo()
        const restored = previousIds
          .map(id => reorderedItems.find(item => item.id === id))
          .filter(Boolean) as WishlistItem[]
        setGridItems(restored)
        error(err, 'Failed to update wishlist priority')
        announce('Failed to update wishlist priority', 'assertive')
      }
    },
    [gridItems, queryArgs, dispatch, reorderWishlist, toast, error, handleUndo],
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
  if (queryError) {
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

  // Empty state (no items and no active filters)
  if (items.length === 0 && !search && !selectedStore && selectedTags.length === 0) {
    const isAllPurchased = hasHadItems

    return (
      <div className={className}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Wishlist</h1>
          {isAllPurchased ? (
            <AllPurchasedEmptyState
              onAddItem={() => {
                window.location.href = '/wishlist/add'
              }}
            />
          ) : (
            <NewUserEmptyState
              onAddItem={() => {
                window.location.href = '/wishlist/add'
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold">Wishlist</h1>
            <p id="wishlist-keyboard-shortcuts" className="sr-only">
              Keyboard shortcuts: A to add an item, G to mark the focused item as got it, Delete or
              Backspace to remove the focused item, and arrow keys to move between items.
            </p>
            {counts ? (
              <span className="text-muted-foreground">
                {counts.total} {counts.total === 1 ? 'item' : 'items'}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={() => {
              window.location.href = '/wishlist/add'
            }}
          >
            Add Item
          </Button>
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
          {queryError ? (
            <GalleryDataTable
              items={[]}
              columns={wishlistColumns}
              isLoading={isLoading}
              ariaLabel="Wishlist items table"
              error={queryError as Error}
              onRetry={() => {
                void refetch()
              }}
              isRetrying={isFetching}
            />
          ) : items.length === 0 ? (
            <NoResultsEmptyState onClearFilters={handleClearFilters} />
          ) : (
            <>
              {/* Gallery Content - view mode controlled by GalleryViewToggle */}
              {viewMode === 'grid' ? (
                <div
                  role="grid"
                  aria-label="Wishlist items"
                  aria-describedby="wishlist-keyboard-shortcuts"
                  onKeyDown={handleGridKeyDown}
                >
                  <SortableGallery
                    items={galleryItems}
                    onReorder={handleReorder}
                    columns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                    gap={6}
                    renderItem={(item, index) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-2 transition-opacity duration-300 ${
                          isDeleting && selectedItemForDelete?.id === item.id ? 'opacity-40' : ''
                        }`}
                      >
                        <SortableWishlistCard id={item.id}>
                          <div
                            role="gridcell"
                            tabIndex={getTabIndex(index)}
                            ref={el => setItemRef(item.id, el)}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleCardClick(item.id)
                              }
                            }}
                            aria-label={`
                              ${item.title},
                              ${item.price ? formatCurrency(item.price, item.currency) : ''}
                              ${
                                item.pieceCount
                                  ? `, ${item.pieceCount.toLocaleString()} pieces`
                                  : ''
                              },
                              priority ${item.priority ?? 0} of 5,
                              ${item.store}
                            `
                              .replace(/\s+/g, ' ')
                              .trim()}
                            className={`group relative outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                              index === focusedIndex ? 'ring-2 ring-primary ring-offset-2' : ''
                            }`}
                            onClick={() => handleCardClick(item.id)}
                          >
                            <WishlistCard item={item} />
                          </div>
                        </SortableWishlistCard>
                        <div className="flex gap-2">
                      <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation()
                              setSelectedItemForGotIt(item)
                            }}
                          >
                            Got it!
                          </Button>
                      <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(event: MouseEvent<HTMLButtonElement>) => {
                              event.stopPropagation()
                              setSelectedItemForDelete(item)
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <GalleryDataTable
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

      <DeleteConfirmationModal
        open={selectedItemForDelete !== null}
        onOpenChange={open => {
          if (!open && !isDeleting) {
            setSelectedItemForDelete(null)
          }
        }}
        itemTitle={selectedItemForDelete?.title ?? ''}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {selectedItemForGotIt ? (
        <GotItModal
          open={selectedItemForGotIt !== null}
          onOpenChange={open => {
            if (!open) {
              setSelectedItemForGotIt(null)
            }
          }}
          item={selectedItemForGotIt}
          onCompleted={handleGotItCompleted}
        />
      ) : null}
    </div>
  )
}

export function MainPage({ className }: MainPageProps) {
  return (
    <FilterProvider
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
