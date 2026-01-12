/**
 * SetsGalleryModule Wrapper
 *
 * Thin wrapper to lazy-load the app-sets-gallery feature module from the shell app.
 * Mirrors the pattern used by InstructionsModule and WishlistModule.
 */

import { Suspense } from 'react'
import { AppSetsGalleryModule } from '@repo/app-sets-gallery'
import { LoadingPage } from '../..//pages/LoadingPage'

export function SetsGalleryModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AppSetsGalleryModule />
    </Suspense>
  )
}

export default SetsGalleryModule
