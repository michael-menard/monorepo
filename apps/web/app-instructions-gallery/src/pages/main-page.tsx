/**
 * Instructions Gallery Main Page
 *
 * The primary page component for browsing MOC instruction collection.
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 * Story 3.1.2: Instructions Card Component
 */
import { useEffect, useMemo, useState, useCallback } from 'react'
import { BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GalleryGrid,
  GalleryEmptyState,
  GalleryFilterBar,
  GalleryViewToggle,
  GalleryDataTable,
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

export interface MainPageProps {
  className?: string
}

/**
 * Main Page Component
 *
 * Displays the Instructions Gallery with header and grid of InstructionCards.
 * Uses GalleryGrid for layout and GalleryEmptyState when no instructions exist.
 */
export function MainPage({ className }: MainPageProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, isError, error } = useGetInstructionsQuery({ page: 1, limit: 50 })

  // Hydrate local instructions state from API response when it changes
  useEffect(() => {
    if (!data) return
    const next: Instruction[] = data.data.items.map(api => ({
      id: api.id,
      name: api.name,
      description: api.description,
      thumbnail: api.thumbnail,
      images: api.images ?? [],
      pieceCount: api.pieceCount,
      theme: api.theme,
      tags: api.tags,
      pdfUrl: api.pdfUrl,
      createdAt: api.createdAt,
      updatedAt: api.updatedAt,
      isFavorite: api.isFavorite,
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
        <div className="container mx-auto py-6 space-y-6">
          <p className="text-destructive" role="alert">
            {message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="container mx-auto py-6 space-y-6">
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
                <p className="text-muted-foreground">Loading instructions...</p>
              ) : isEmpty ? (
                <GalleryEmptyState
                  icon={BookOpen}
                  title="No instructions yet"
                  description="Upload your first MOC instructions to start your collection."
                />
              ) : (
                <GalleryGrid>
                  {filteredTableItems.map(item => {
                    const instruction = instructions.find(i => i.id === item.id)
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
