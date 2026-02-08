/**
 * Inspiration Module
 * Epic 5: Inspiration Gallery
 *
 * Story INSP-001: Gallery Scaffolding
 * - Lazy-loads @repo/app-inspiration-gallery micro-app
 * - Connected to shell via /inspiration route
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the inspiration gallery module from @repo/app-inspiration-gallery
const InspirationGalleryModule = lazy(() => import('@repo/app-inspiration-gallery'))

/**
 * Inspiration Module - Wrapper for lazy-loaded inspiration gallery
 */
export function InspirationModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <InspirationGalleryModule />
    </Suspense>
  )
}
