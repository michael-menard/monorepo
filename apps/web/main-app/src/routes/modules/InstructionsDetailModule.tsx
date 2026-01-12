/**
 * Instructions Detail Module
 * Story 3.1.4: Instructions Detail Page
 * Story 3.1.39: Edit button for owners
 *
 * Lazy-loads @repo/app-instructions-gallery detail page and integrates with RTK Query.
 */

import { lazy, Suspense } from 'react'
import { useParams } from '@tanstack/react-router'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions gallery module and delegate detail mode to it
const InstructionsGalleryModule = lazy(() => import('@repo/app-instructions-gallery'))

/**
 * Instructions Detail Module - Wrapper for lazy-loaded detail dashboard
 */
export function InstructionsDetail() {
  const { instructionId } = useParams({ from: '/instructions/$instructionId' })

  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsGalleryModule mode="detail" mocIdOrSlug={instructionId} />
    </Suspense>
  )
}
