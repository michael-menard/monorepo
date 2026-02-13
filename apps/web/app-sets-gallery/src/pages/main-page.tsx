/**
 * AppSetsGallery Main Page
 *
 * The primary page component for the App Sets Gallery module.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button, cn, ConfirmationDialog, useToast } from '@repo/app-component-library'
import {
  useViewMode,
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

type SortField = 'title' | 'pieceCount' | 'purchaseDate' | 'purchasePrice' | 'createdAt'

/**
 * Main Page Component
 *
 * This is the primary content page for the App Sets Gallery module.
 */
export function MainPage({ className }: MainPageProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('sets')
  const [searchTerm, setSearchTerm] = useState('')
  const [theme, setTheme] = useState<string | null>(null)
  const [builtFilter, setBuiltFilter] = useState<BuiltFilterValue>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [deleteTarget, setDeleteTarget] = useState<Set | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { success: toastSuccess, error: toastError } = useToast()
  const [deleteSet] = useDeleteSetMutation()

  const {
    data: setsData,
    isLoading,
    isFetching,
    error,
  } = useGetSetsQuery({
    search: searchTerm || undefined,
    theme: theme || undefined,
    isBuilt: builtFilter === 'all' ? undefined : builtFilter === 'built',
    sortField,
    sortDirection: 'desc',
    page,
    limit: pageSize,
  })

  const sets: Set[] = setsData?.items ?? []
  const availableThemes = setsData?.filters?.availableThemes ?? []
  const pagination = setsData?.pagination

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'createdAt', label: 'Recently added' },
    { value: 'title', label: 'Title' },
    { value: 'pieceCount', label: 'Piece count' },
    { value: 'purchaseDate', label: 'Purchase date' },
    { value: 'purchasePrice', label: 'Purchase price' },
  ]

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleThemeChange = (value: string | null) => {
    setTheme(value)
    setPage(1)
  }

  const handleBuiltFilterChange = (value: BuiltFilterValue) => {
    setBuiltFilter(value)
    setPage(1)
  }

  const handleSortFieldChange = (value: SortField) => {
    setSortField(value)
    setPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const handleSetClick = (set: Set) => {
    navigate(`/sets/${set.id}`)
  }

  const handleEditSet = (set: Set) => {
    navigate(`/sets/${set.id}/edit`)
  }

  const handleRequestDeleteSet = (set: Set) => {
    setDeleteTarget(set)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await deleteSet({ id: deleteTarget.id, title: deleteTarget.title }).unwrap()
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
    <div
      className={cn(
        'relative min-h-full bg-gradient-to-br from-background via-background to-muted overflow-hidden',
        className,
      )}
    >
      {/* Floating gradient background blobs (inspired by LEGO MOC Hub hero) */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute right-[-10%] top-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/50 via-blue-500/40 to-transparent blur-3xl animate-float" />
        <div className="absolute left-[-15%] bottom-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-teal-400/50 via-emerald-500/40 to-transparent blur-3xl animate-float-delayed" />
        <div className="absolute right-[10%] top-[40%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-cyan-500/45 via-sky-400/35 to-transparent blur-2xl animate-float" />
        <div className="absolute left-[5%] top-[25%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-green-400/45 via-lime-500/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute left-[40%] top-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-b from-blue-600/45 via-indigo-500/35 to-transparent blur-2xl animate-float" />
        <div className="absolute right-[35%] bottom-[8%] w-[350px] h-[350px] rounded-full bg-gradient-to-t from-teal-500/45 via-cyan-400/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute right-[25%] top-[20%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-sky-400/35 via-cyan-500/25 to-transparent blur-xl animate-float" />
        <div className="absolute left-[30%] bottom-[25%] w-[280px] h-[280px] rounded-full bg-gradient-to-tl from-emerald-400/35 via-teal-500/25 to-transparent blur-xl animate-float-delayed" />
        <div className="absolute right-[45%] top-[35%] w-[200px] h-[200px] rounded-full bg-gradient-to-br from-lime-400/30 via-green-500/20 to-transparent blur-xl animate-float" />
        <div className="absolute left-[55%] top-[60%] w-[180px] h-[180px] rounded-full bg-gradient-to-tr from-blue-400/30 via-cyan-500/20 to-transparent blur-xl animate-float-delayed" />
      </div>

      <div className="relative z-10 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative backdrop-blur-2xl bg-gray-500/5 dark:bg-gray-400/5 border border-white/10 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-gray-400/10 dark:from-gray-300/5 dark:via-transparent dark:to-gray-500/5 rounded-3xl pointer-events-none" />
              <div className="absolute inset-0 rounded-3xl shadow-inner pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                      My Sets Collection
                    </h1>
                    <p className="text-muted-foreground">Manage and track your LEGO sets</p>
                  </div>
                  <Button
                    onClick={() => navigate('/sets/add')}
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
                    themes={availableThemes}
                    selectedTheme={theme}
                    onThemeChange={handleThemeChange}
                    themeAriaLabel="Filter by theme"
                    sortOptions={sortOptions}
                    selectedSort={sortField}
                    onSortChange={value => handleSortFieldChange(value as SortField)}
                    sortAriaLabel="Sort sets"
                    rightSlot={
                      <GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />
                    }
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
                      <GalleryGrid items={sets} isLoading={isLoading || isFetching}>
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

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 ? (
                  <div className="pt-4 flex justify-center">
                    <GalleryPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      pageSize={pagination.limit}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      showPageSizeSelector
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainPage
