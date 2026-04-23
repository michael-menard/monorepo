/**
 * AppSetsGallery Main Page
 *
 * The primary page component for the App Sets Gallery module.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { Loader2, Plus } from 'lucide-react'
import { Button, cn, ConfirmationDialog, useToast } from '@repo/app-component-library'
import {
  useViewMode,
  useInfiniteScroll,
  GalleryViewToggle,
  GalleryDataTable,
  GalleryPagination,
  GalleryFilterBar,
} from '@repo/gallery'
import type { Set } from '@repo/api-client/schemas/sets'
import { useGetSetsQuery, useDeleteSetMutation } from '@repo/api-client/rtk/sets-api'
import { BuildStatusFilter } from '../components/BuildStatusFilter'
import type { BuiltFilterValue } from '../components/BuildStatusFilter/__types__'
import { GalleryGrid } from '../components/GalleryGrid'
import { SetCard } from '../components/SetCard'
import { setsColumns } from '../columns/sets-columns'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

type SortField = 'title' | 'pieceCount' | 'purchasePrice' | 'createdAt'

/**
 * Main Page Component
 *
 * This is the primary content page for the App Sets Gallery module.
 */
export function MainPage({ className }: MainPageProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('sets')
  const LIMIT = 40
  const [searchTerm, setSearchTerm] = useState('')
  const [_theme, _setTheme] = useState<string | null>(null)
  const [builtFilter, setBuiltFilter] = useState<BuiltFilterValue>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [accumulatedSets, setAccumulatedSets] = useState<Set[]>([])
  const accumulatedRef = useRef<Map<string, Set>>(new Map())
  const [deleteTarget, setDeleteTarget] = useState<Set | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { success: toastSuccess, error: toastError } = useToast()
  const [deleteSet] = useDeleteSetMutation()

  const {
    data: setsData,
    isLoading,
    isFetching,
    error,
  } = useGetSetsQuery(
    {
      search: searchTerm || undefined,
      status: 'owned',
      isBuilt: builtFilter === 'all' ? undefined : builtFilter === 'built',
      sort: sortField,
      order: 'desc',
      page: currentPage,
      limit: LIMIT,
    },
    { refetchOnFocus: true, refetchOnMountOrArgChange: true },
  )

  // Accumulate pages into a deduped map
  useEffect(() => {
    if (!setsData) return
    setTotalPages(setsData.pagination.totalPages)
    setsData.items.forEach(set => {
      accumulatedRef.current.set(set.id, set)
    })
    setAccumulatedSets(Array.from(accumulatedRef.current.values()))
  }, [setsData])

  const hasMore = currentPage < totalPages
  const isLoadingMore = isFetching && currentPage > 1

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetching) setCurrentPage(p => p + 1)
  }, [hasMore, isFetching])

  const resetAccumulator = useCallback(() => {
    accumulatedRef.current.clear()
    setAccumulatedSets([])
    setCurrentPage(1)
    setTotalPages(1)
  }, [])

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isFetching,
    onLoadMore: handleLoadMore,
    enabled: viewMode === 'grid' && !searchTerm,
  })

  const sets = accumulatedSets

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'createdAt', label: 'Recently added' },
    { value: 'title', label: 'Title' },
    { value: 'pieceCount', label: 'Piece count' },
    { value: 'purchasePrice', label: 'Purchase price' },
  ]

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    resetAccumulator()
  }

  const handleBuiltFilterChange = (value: BuiltFilterValue) => {
    setBuiltFilter(value)
    resetAccumulator()
  }

  const handleSortFieldChange = (value: SortField) => {
    setSortField(value)
    resetAccumulator()
  }

  const handleSetClick = (set: Set) => {
    navigate(set.id)
  }

  const handleEditSet = (set: Set) => {
    navigate(set.id)
  }

  const handleRequestDeleteSet = (set: Set) => {
    setDeleteTarget(set)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await deleteSet({ id: deleteTarget.id }).unwrap()
      toastSuccess(
        `"${deleteTarget.title}" deleted`,
        'The set has been removed from your collection.',
      )
      setDeleteTarget(null)
    } catch (err) {
      toastError(err, `Failed to delete "${deleteTarget.title}"`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setDeleteTarget(null)
  }

  const hasError = Boolean(error)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Sets Collection</h1>
          <p className="text-muted-foreground">Manage and track your LEGO sets</p>
        </div>
        <Button
          onClick={() => navigate('new')}
          className="gap-2 h-11 px-5 shadow-lg backdrop-blur-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0 cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Set
        </Button>
      </div>

      <div className="pt-2">
        <GalleryFilterBar
          search={searchTerm}
          onSearchChange={handleSearchChange}
          searchAriaLabel="Search sets"
          searchPlaceholder="Search sets..."
          sortOptions={sortOptions}
          selectedSort={sortField}
          onSortChange={value => handleSortFieldChange(value as SortField)}
          sortAriaLabel="Sort sets"
          rightSlot={<GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />}
        >
          <BuildStatusFilter value={builtFilter} onChange={handleBuiltFilterChange} />
        </GalleryFilterBar>
      </div>

      {/* View Content with Animation */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <GalleryGrid items={sets} isLoading={isLoading && sets.length === 0}>
              {set => (
                <SetCard
                  set={set}
                  onClick={() => handleSetClick(set)}
                  onEdit={() => handleEditSet(set)}
                  onDelete={() => handleRequestDeleteSet(set)}
                />
              )}
            </GalleryGrid>
          </motion.div>
        ) : (
          <motion.div
            key="datatable"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <GalleryDataTable
              items={sets}
              columns={setsColumns}
              isLoading={isLoading || isFetching}
              error={hasError ? (error as Error) : undefined}
              onRowClick={handleSetClick}
              ariaLabel="Sets collection table"
              enableSorting={true}
              enableMultiSort={true}
              maxMultiSortColCount={2}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite scroll sentinel (grid view only) */}
      {viewMode === 'grid' && hasMore && !searchTerm && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-8"
          data-testid="infinite-scroll-sentinel"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading more sets...
            </div>
          )}
        </div>
      )}

      {/* Pagination for datatable view */}
      {viewMode === 'datatable' && setsData?.pagination && setsData.pagination.totalPages > 1 ? (
        <div className="pt-4 flex justify-center">
          <GalleryPagination
            currentPage={setsData.pagination.page}
            totalPages={setsData.pagination.totalPages}
            pageSize={setsData.pagination.limit}
            onPageChange={p => {
              resetAccumulator()
              setCurrentPage(p)
            }}
            onPageSizeChange={() => {}}
          />
        </div>
      ) : null}

      {/* Delete confirmation dialog - wired to Sets story sets-2002 / sets-2004 */}
      <ConfirmationDialog
        title="Delete set?"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"${deleteTarget.setNumber ? ` (#${deleteTarget.setNumber})` : ''} from your collection? This action cannot be undone.`
            : 'Are you sure you want to delete this set from your collection? This action cannot be undone.'
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        variant="destructive"
        open={Boolean(deleteTarget)}
        onOpenChange={open => {
          if (!open && !isDeleting) {
            handleCancelDelete()
          }
        }}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default MainPage
