/**
 * AppSetsGallery Main Page
 *
 * The primary page component for the App Sets Gallery module.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { useViewMode, GalleryViewToggle, GalleryDataTable } from '@repo/gallery'
import { GalleryFilterBar } from '../components/GalleryFilterBar'
import { GalleryGrid } from '../components/GalleryGrid'
import { SetCard } from '../components/SetCard'
import { setsColumns } from '../columns/sets-columns'
import { mockGetSets, type BrickSet } from '../api/mock-sets-api'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Main Page Component
 *
 * This is the primary content page for the App Sets Gallery module.
 */
export function MainPage({ className }: MainPageProps) {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('sets')
  const [searchTerm, setSearchTerm] = useState('')
  const [sets, setSets] = useState<BrickSet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch sets on mount
  useEffect(() => {
    const fetchSets = async () => {
      setIsLoading(true)
      try {
        const data = await mockGetSets()
        setSets(data)
      } catch (error) {
        console.error('Failed to fetch sets:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSets()
  }, [])

  // Filter sets based on search term
  const filteredSets = sets.filter(
    set =>
      set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.setNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      set.theme.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSetClick = (set: BrickSet) => {
    navigate(`/sets/${set.id}`)
  }

  return (
    <div className={className}>
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Sets Collection</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your LEGO sets
            </p>
          </div>
          <Button onClick={() => navigate('/sets/add')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Set
          </Button>
        </div>

        {/* Filter Bar with View Toggle */}
        <GalleryFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm}>
          <GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />
        </GalleryFilterBar>

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
              <GalleryGrid items={filteredSets} isLoading={isLoading}>
                {set => <SetCard set={set} onClick={() => handleSetClick(set)} />}
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
                items={filteredSets}
                columns={setsColumns}
                isLoading={isLoading}
                onRowClick={handleSetClick}
                ariaLabel="Sets collection table"
                enableSorting={true}
                enableMultiSort={true}
                maxMultiSortColCount={2}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MainPage
