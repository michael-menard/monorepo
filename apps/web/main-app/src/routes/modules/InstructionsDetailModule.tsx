/**
 * Instructions Detail Module
 * Story 3.1.4: Instructions Detail Page
 *
 * Lazy-loads @repo/app-instructions-gallery detail page and integrates with RTK Query.
 */

import { lazy, Suspense, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions detail module
const InstructionsDetailModule = lazy(() =>
  import('@repo/app-instructions-gallery').then(module => ({
    default: module.InstructionsDetailModule,
  })),
)

// Mock instruction data for now - will be replaced with RTK Query
const MOCK_INSTRUCTION = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Technic Supercar',
  description:
    'A detailed supercar model with working steering, suspension, and gearbox. Perfect for display and play.',
  thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
  images: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop',
  ],
  pieceCount: 3599,
  theme: 'Technic',
  tags: ['vehicle', 'supercar', 'advanced', 'motorized'],
  pdfUrl: 'https://example.com/instructions/technic-supercar.pdf',
  createdAt: '2025-01-10T10:30:00Z',
  updatedAt: '2025-01-15T14:20:00Z',
  isFavorite: true,
}

/**
 * Instructions Detail Module - Wrapper for lazy-loaded detail page
 */
export function InstructionsDetail() {
  const navigate = useNavigate()
  const { instructionId } = useParams({ from: '/instructions/$instructionId' })

  // TODO: Replace with RTK Query hook
  // const { data: instruction, isLoading, error } = useGetInstructionByIdQuery(instructionId)
  const instruction = instructionId === MOCK_INSTRUCTION.id ? MOCK_INSTRUCTION : undefined
  const isLoading = false
  const error: string | null | undefined = null

  const handleBack = useCallback(() => {
    navigate({ to: '/instructions' })
  }, [navigate])

  const handleEdit = useCallback((id: string) => {
    // TODO: Navigate to edit page when implemented
    // eslint-disable-next-line no-console
    console.log('Navigate to edit:', id)
  }, [])

  const handleFavorite = useCallback((id: string) => {
    // TODO: Implement with RTK Query mutation
    // eslint-disable-next-line no-console
    console.log('Toggle favorite:', id)
  }, [])

  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsDetailModule
        instructionId={instructionId}
        instruction={instruction}
        isLoading={isLoading}
        error={error}
        onBack={handleBack}
        onEdit={handleEdit}
        onFavorite={handleFavorite}
      />
    </Suspense>
  )
}
