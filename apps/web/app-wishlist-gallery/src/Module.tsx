/**
 * AppWishlistGallery Module
 *
 * Main entry point for the App Wishlist Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { z } from 'zod'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddWishlistItemPage } from './pages/add-item-page'

/**
 * Module props schema - validated at runtime
 */
const AppWishlistGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AppWishlistGalleryModuleProps = z.infer<typeof AppWishlistGalleryModulePropsSchema>

/**
 * AppWishlistGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Includes Redux Provider for RTK Query wishlist API.
 */
export function AppWishlistGalleryModule({ className }: AppWishlistGalleryModuleProps) {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/wishlist'
  const isAddPage = path === '/wishlist/add'

  return (
    <Provider store={store}>
      <ModuleLayout className={className}>
        {isAddPage ? <AddWishlistItemPage /> : <MainPage />}
      </ModuleLayout>
    </Provider>
  )
}

// Default export for lazy loading
export default AppWishlistGalleryModule
