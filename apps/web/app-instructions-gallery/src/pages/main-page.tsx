/**
 * Instructions Gallery Main Page
 *
 * The primary page component for browsing MOC instruction collection.
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 * Story 3.1.2: Instructions Card Component
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { z } from 'zod'
import { BookOpen } from 'lucide-react'
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
import { useGetInstructionsQuery } from '@repo/api-client/rtk/instructions-api'
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
export function MainPage({ className }: MainPageProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, isError, error, refetch } = useGetInstructionsQuery({
    page: 1,
    limit: 50,
  })

  // Hydrate local instructions state from API response when it changes
  // INST-1100: Fixed schema alignment - API returns { items, pagination }, not { data: { items } }
  // API field mapping: title→name, partsCount→pieceCount, thumbnailUrl→thumbnail, isFeatured→isFavorite
  useEffect(() => {
    if (!data) return
    const next: Instruction[] = data.items.map(api => ({
      id: api.id,
      name: api.title,
      description: api.description ?? undefined,
      thumbnail: api.thumbnailUrl ?? '',
      images: [],
      pieceCount: api.partsCount ?? 0,
      theme: api.theme ?? '',
      tags: api.tags ?? [],
      pdfUrl: undefined,
      createdAt: api.createdAt.toISOString(),
      updatedAt: api.updatedAt?.toISOString(),
      isFavorite: api.isFeatured,
    }))
    setInstructions(next)
  }, [data])

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

  const handleFavorite = useCallback((id: string) => {
    // TODO: Wire to toggle favorite mutation once backend supports it
    setInstructions(prev =>
      prev.map(instruction =>
        instruction.id === id
          ? { ...instruction, isFavorite: !instruction.isFavorite }
          : instruction,
      ),
    )
  }, [])

  const handleEdit = useCallback((id: string) => {
    logger.info('instructions.gallery.edit_click', undefined, { id })
    if (typeof window !== 'undefined') {
      window.location.href = `/instructions/${id}/edit`
    }
  }, [])

  const handleCardClick = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/instructions/${id}`
    }
  }, [])

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

  const showLoadingState = isLoading && !instructions.length
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
            <GalleryViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              showFirstTimeHint={showViewHint}
              onDismissHint={dismissViewHint}
            />
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
                        if (typeof window !== 'undefined') {
                          window.location.href = '/mocs/new'
                        }
                      },
                    }}
                    data-testid="gallery-empty-state"
                  />
                </div>
              ) : (
                <GalleryGrid>
                  {filteredTableItems.map(item => {
                    const instruction = instructionsMap.get(item.id)
                    if (!instruction) return null
                    return (
                      <InstructionCard
                        key={instruction.id}
                        instruction={instruction}
                        onClick={handleCardClick}
                        onFavorite={handleFavorite}
                        onEdit={handleEdit}
                      />
                    )
                  })}
                </GalleryGrid>
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
                  if (typeof window !== 'undefined') {
                    window.location.href = `/instructions/${item.slug}/edit`
                  }
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
