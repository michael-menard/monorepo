/**
 * Instructions Module
 * Epic 3: Gallery Features
 *
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 * - Lazy-loads @repo/gallery package
 * - Connected to shell via /instructions route
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions gallery module from @repo/gallery
const InstructionsGalleryModule = lazy(() =>
  import('@repo/gallery').then(module => ({
    default: module.InstructionsGalleryModule,
  })),
)

/**
 * Instructions Module - Wrapper for lazy-loaded instructions gallery
 */
export function InstructionsModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsGalleryModule />
    </Suspense>
  )
}
