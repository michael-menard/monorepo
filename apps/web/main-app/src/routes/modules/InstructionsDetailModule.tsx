/**
 * Instructions Detail Module
 * Story 3.1.4: Instructions Detail Page
 * Story 3.1.39: Edit button for owners
 *
 * Lazy-loads @repo/app-instructions-gallery detail page and integrates with RTK Query.
 */

import { lazy, Suspense, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { logger } from '@repo/logger'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions detail module
const InstructionsDetailModule = lazy(() =>
  import('@repo/app-instructions-gallery').then(module => ({
    default: module.InstructionsDetailModule,
  })),
)

// Mock instruction data for now - will be replaced with RTK Query
// Story 3.1.39: Added slug and isOwner for edit functionality
const MOCK_INSTRUCTION = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Technic Supercar',
  slug: 'technic-supercar', // Story 3.1.39: For edit navigation
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
  isOwner: true, // Story 3.1.39: Indicates current user owns this MOC
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

  // Story 3.1.39: Navigate to edit page (AC: 2)
  // Only called when isOwner is true (button hidden for non-owners)
  const handleEdit = useCallback(
    (id: string) => {
      const slug = instruction?.slug
      if (!slug) {
        logger.warn('Cannot navigate to edit: no slug available', { id })
        return
      }
      logger.info('Navigating to edit page', { id, slug })
      navigate({ to: '/mocs/$slug/edit', params: { slug } })
    },
    [navigate, instruction?.slug],
  )

  const handleFavorite = useCallback((id: string) => {
    // TODO: Implement with RTK Query mutation
    logger.debug('Toggle favorite:', { id })
  }, [])

  // Story 3.1.39: Edit button visibility is controlled by whether onEdit is passed
  // and the external component checks if the user is owner internally
  // The onEdit callback will only navigate if the user is the owner
  const editHandler = instruction?.isOwner ? handleEdit : undefined

  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsDetailModule
        instructionId={instructionId}
        instruction={instruction}
        isLoading={isLoading}
        error={error}
        onBack={handleBack}
        onEdit={editHandler}
        onFavorite={handleFavorite}
      />
    </Suspense>
  )
}
