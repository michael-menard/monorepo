/**
 * Instructions Gallery Main Page
 *
 * The primary page component for browsing MOC instruction collection.
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 * Story 3.1.2: Instructions Card Component
 */
import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { BookOpen, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GalleryGrid,
  GalleryEmptyState,
  GalleryFilterBar,
  GalleryViewToggle,
  GalleryDataTable,
  GallerySkeleton,
  useViewMode,
  useFirstTimeHint,
} from '@repo/gallery'
import { logger } from '@repo/logger'
import { Button } from '@repo/app-component-library'
import {
  useGetInstructionsQuery,
  useTriggerScraperMutation,
  useToggleInstructionFavoriteMutation,
} from '@repo/api-client/rtk/instructions-api'
// Want-to-build toggle uses direct fetch to avoid requiring procurement API in global store
import { InstructionCard } from '../components/InstructionCard'
import type { Instruction } from '../__types__'
import {
  InstructionTableItemSchema,
  type InstructionTableItem,
  mocsColumns,
} from '../columns/mocs-columns'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Main Page Component
 *
 * Displays the Instructions Gallery with header and grid of InstructionCards.
 * Uses GalleryGrid for layout and GalleryEmptyState when no instructions exist.
 */
const LIMIT = 100

function mapApiItem(api: any): Instruction {
  return {
    id: api.id,
    name: api.title,
    description: api.description ?? undefined,
    thumbnail: api.thumbnailUrl ?? '',
    images: [],
    pieceCount: api.partsCount ?? 0,
    theme: api.theme ?? '',
    tags: api.tags ?? [],
    pdfUrl: undefined,
    createdAt: typeof api.createdAt === 'string' ? api.createdAt : String(api.createdAt),
    updatedAt: api.updatedAt
      ? typeof api.updatedAt === 'string'
        ? api.updatedAt
        : String(api.updatedAt)
      : undefined,
    isFavorite: api.isFeatured,
    wantToBuild: api.wantToBuild ?? false,
  }
}

export function MainPage({ className }: MainPageProps) {
  const navigate = useNavigate()
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const accumulatedRef = useRef<Map<string, Instruction>>(new Map())

  const { data, isLoading, isError, error, refetch } = useGetInstructionsQuery({
    page: currentPage,
    limit: LIMIT,
  })

  // Accumulate pages into a deduplicated map, then set state
  useEffect(() => {
    if (!data) return
    setTotalPages(data.pagination.totalPages)
    data.items.forEach(api => {
      accumulatedRef.current.set(api.id, mapApiItem(api))
    })
    setInstructions(Array.from(accumulatedRef.current.values()))
  }, [data])

  const hasMore = currentPage < totalPages
  const isLoadingMore = isLoading && currentPage > 1

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) setCurrentPage(p => p + 1)
  }, [hasMore, isLoading])

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) handleLoadMore()
      },
      { rootMargin: '200px' },
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [handleLoadMore])

  // Initial view mode from URL (?view=grid|datatable)
  const initialUrlMode = useMemo(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    return view === 'datatable' || view === 'grid' ? view : null
  }, [])

  const [viewMode, setViewMode] = useViewMode('instructions', {
    urlMode: initialUrlMode,
  })

  const [showViewHint, dismissViewHint] = useFirstTimeHint()

  // Scraper trigger
  const [triggerScraper, { isLoading: isScraperStarting }] = useTriggerScraperMutation()
  const [scraperStatus, setScraperStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleTriggerScraper = useCallback(async () => {
    setScraperStatus(null)
    try {
      const result = await triggerScraper({}).unwrap()
      setScraperStatus({ type: 'success', text: result.message })
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } }
      const message = err?.data?.message || 'Failed to start scraper'
      logger.error('Scraper trigger failed', error)
      setScraperStatus({ type: 'error', text: message })
    }
  }, [triggerScraper])

  const [toggleFavorite] = useToggleInstructionFavoriteMutation()

  const handleFavorite = useCallback(
    (id: string) => {
      const instruction = instructions.find(i => i.id === id)
      if (!instruction) return
      toggleFavorite({ id, isFavorite: !instruction.isFavorite })
    },
    [instructions, toggleFavorite],
  )

  const handleWantToBuild = useCallback(
    async (id: string) => {
      const instruction = instructions.find(i => i.id === id)
      if (!instruction) return

      const newValue = !instruction.wantToBuild

      // Optimistic update
      setInstructions(prev => prev.map(i => (i.id === id ? { ...i, wantToBuild: newValue } : i)))
      accumulatedRef.current.set(id, { ...instruction, wantToBuild: newValue })

      try {
        await fetch(`/api/mocs/${id}/want-to-build`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ wantToBuild: newValue }),
        })
      } catch {
        // Revert on failure
        setInstructions(prev => prev.map(i => (i.id === id ? { ...i, wantToBuild: !newValue } : i)))
        accumulatedRef.current.set(id, { ...instruction, wantToBuild: !newValue })
      }
    },
    [instructions],
  )

  const handleEdit = useCallback(
    (id: string) => {
      logger.info('instructions.gallery.edit_click', undefined, { id })
      navigate({ to: `/instructions/${id}/edit` })
    },
    [navigate],
  )

  const handleCardClick = useCallback(
    (id: string) => {
      navigate({ to: `/instructions/${id}` })
    },
    [navigate],
  )

  // Derive table items from instructions plus optional view-only metadata
  const tableItems: InstructionTableItem[] = useMemo(
    () =>
      instructions.map(instruction => {
        const item = InstructionTableItemSchema.parse({
          id: instruction.id,
          name: instruction.name,
          createdAt: instruction.createdAt,
          // Temporary defaults until difficulty/status are wired from API
          difficulty: 'beginner',
          status: 'draft',
          slug: instruction.id,
        })
        return item
      }),
    [instructions],
  )

  // Apply text search over name
  const filteredTableItems = useMemo(() => {
    if (!searchTerm) return tableItems
    const query = searchTerm.toLowerCase()
    return tableItems.filter(item => item.name.toLowerCase().includes(query))
  }, [tableItems, searchTerm])

  // Create Map for O(1) instruction lookups (PERF-001: avoid O(n²) in grid rendering)
  const instructionsMap = useMemo(() => new Map(instructions.map(i => [i.id, i])), [instructions])

  const isEmpty = filteredTableItems.length === 0

  const showLoadingState = isLoading && instructions.length === 0
  const showErrorState = isError && !isLoading

  // Sync view mode to URL query param
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('view', viewMode)
    window.history.replaceState({}, '', url.toString())
  }, [viewMode])

  if (showErrorState) {
    const message =
      error && error instanceof Error
        ? error.message
        : 'Failed to load instructions. Please try again.'

    return (
      <div className={className}>
        <div
          className="container mx-auto py-6 space-y-6"
          role="region"
          aria-label="MOC Gallery"
          data-testid="moc-gallery-error"
        >
          <div className="flex flex-col items-center justify-center py-16 text-center" role="alert">
            <p className="text-destructive mb-4">{message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className="container mx-auto py-6 space-y-6"
        role="region"
        aria-label="MOC Gallery"
        data-testid="moc-gallery-region"
      >
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            My Instructions
          </h1>
          <p className="text-muted-foreground">Browse your MOC instruction collection</p>
        </div>

        {/* Filter bar with search + view toggle */}
        <GalleryFilterBar
          search={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search instructions..."
          searchAriaLabel="Search instructions"
          data-testid="instructions-gallery-filter-bar"
          rightSlot={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerScraper}
                  disabled={isScraperStarting}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isScraperStarting ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  {isScraperStarting ? 'Starting...' : 'Scrape Rebrickable'}
                </Button>
                {scraperStatus ? (
                  <span
                    className={`text-xs ${scraperStatus.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
                  >
                    {scraperStatus.text}
                  </span>
                ) : null}
              </div>
              <GalleryViewToggle
                currentView={viewMode}
                onViewChange={setViewMode}
                showFirstTimeHint={showViewHint}
                onDismissHint={dismissViewHint}
              />
            </div>
          }
        />

        {/* View content with animation */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {showLoadingState ? (
                <div aria-live="polite" aria-busy="true">
                  <span className="sr-only">Loading MOCs...</span>
                  <GallerySkeleton count={12} data-testid="gallery-loading-skeleton" />
                </div>
              ) : isEmpty ? (
                <div aria-live="polite">
                  <GalleryEmptyState
                    icon={BookOpen}
                    title="No instructions yet"
                    description="Upload your first MOC instructions to start your collection."
                    action={{
                      label: 'Create your first MOC',
                      onClick: () => {
                        navigate({ to: '/mocs/new' })
                      },
                    }}
                    data-testid="gallery-empty-state"
                  />
                </div>
              ) : (
                <>
                  <GalleryGrid columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}>
                    {filteredTableItems.map(item => {
                      const instruction = instructionsMap.get(item.id)
                      if (!instruction) return null
                      return (
                        <InstructionCard
                          key={instruction.id}
                          instruction={instruction}
                          onClick={handleCardClick}
                          onFavorite={handleFavorite}
                          onWantToBuild={handleWantToBuild}
                          onEdit={handleEdit}
                        />
                      )
                    })}
                  </GalleryGrid>
                  {hasMore && !searchTerm && (
                    <div
                      ref={sentinelRef}
                      className="flex justify-center py-8"
                      data-testid="infinite-scroll-sentinel"
                    >
                      {isLoadingMore && (
                        <GallerySkeleton count={4} data-testid="load-more-skeleton" />
                      )}
                    </div>
                  )}
                </>
              )}
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
                items={filteredTableItems}
                columns={mocsColumns}
                ariaLabel="Instructions gallery table"
                onRowClick={item => {
                  navigate({ to: `/instructions/${item.slug}/edit` })
                }}
                hasActiveFilters={Boolean(searchTerm)}
                onClearFilters={() => setSearchTerm('')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MainPage
