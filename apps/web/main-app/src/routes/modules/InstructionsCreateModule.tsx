/**
 * Instructions Create Module
 * Story INST-1102: Create Basic MOC
 *
 * Lazy-loads @repo/app-instructions-gallery with mode="create"
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions gallery module from @repo/app-instructions-gallery
const InstructionsGalleryModule = lazy(() => import('@repo/app-instructions-gallery'))

/**
 * Instructions Create Module - Wrapper for lazy-loaded create page
 */
export function InstructionsCreateModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsGalleryModule mode="create" />
    </Suspense>
  )
}
