/**
 * Instructions Gallery Main Page
 *
 * The primary page component for browsing MOC instruction collection.
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 * Story 3.1.2: Instructions Card Component
 */
import { useState, useCallback } from 'react'
import { BookOpen } from 'lucide-react'
import { GalleryGrid, GalleryEmptyState } from '@repo/gallery'
import { InstructionCard } from '../components/InstructionCard'
import type { Instruction } from '../__types__'

export interface MainPageProps {
  className?: string
}

// Mock data for demonstration - will be replaced with API data
const MOCK_INSTRUCTIONS: Instruction[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Technic Supercar',
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    images: [],
    pieceCount: 3599,
    theme: 'Technic',
    tags: ['vehicle', 'supercar', 'advanced'],
    createdAt: '2025-01-10T10:30:00Z',
    isFavorite: true,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'City Fire Station',
    thumbnail: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop',
    images: [],
    pieceCount: 1152,
    theme: 'City',
    tags: ['building', 'fire', 'emergency'],
    createdAt: '2025-01-08T14:20:00Z',
    isFavorite: false,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174003',
    name: 'Star Wars X-Wing',
    thumbnail: 'https://images.unsplash.com/photo-1472457897821-70d3819a0e24?w=400&h=300&fit=crop',
    images: [],
    pieceCount: 1949,
    theme: 'Star Wars',
    tags: ['spaceship', 'rebel', 'starfighter'],
    createdAt: '2025-01-05T09:15:00Z',
    isFavorite: false,
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174004',
    name: 'Creator Expert Modular Building',
    thumbnail: 'https://images.unsplash.com/photo-1560961911-ba7ef651a56c?w=400&h=300&fit=crop',
    images: [],
    pieceCount: 2923,
    theme: 'Creator Expert',
    tags: ['building', 'modular', 'city'],
    createdAt: '2025-01-02T16:45:00Z',
    isFavorite: true,
  },
]

/**
 * Main Page Component
 *
 * Displays the Instructions Gallery with header and grid of InstructionCards.
 * Uses GalleryGrid for layout and GalleryEmptyState when no instructions exist.
 */
export function MainPage({ className }: MainPageProps) {
  const [instructions, setInstructions] = useState<Instruction[]>(MOCK_INSTRUCTIONS)

  const handleFavorite = useCallback((id: string) => {
    setInstructions(prev =>
      prev.map(instruction =>
        instruction.id === id
          ? { ...instruction, isFavorite: !instruction.isFavorite }
          : instruction,
      ),
    )
  }, [])

  const handleEdit = useCallback((id: string) => {
    // TODO: Navigate to edit page or open edit modal
    // eslint-disable-next-line no-console
    console.log('Edit instruction:', id)
  }, [])

  const handleClick = useCallback((id: string) => {
    // Navigate to instruction detail page
    // The main-app shell handles routing, so we use window.location for cross-module navigation
    window.location.href = `/instructions/${id}`
  }, [])

  const isEmpty = instructions.length === 0

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

        {/* Instructions Grid */}
        {isEmpty ? (
          <GalleryEmptyState
            icon={BookOpen}
            title="No instructions yet"
            description="Upload your first MOC instructions to start your collection."
          />
        ) : (
          <GalleryGrid>
            {instructions.map(instruction => (
              <InstructionCard
                key={instruction.id}
                instruction={instruction}
                onClick={handleClick}
                onFavorite={handleFavorite}
                onEdit={handleEdit}
              />
            ))}
          </GalleryGrid>
        )}
      </div>
    </div>
  )
}

export default MainPage
