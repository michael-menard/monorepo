/**
 * AppWishlistGallery Module
 *
 * Main entry point for the App Wishlist Gallery feature module.
 * Uses React Router v7 for internal routing. The shell mounts this
 * module under a wildcard route and the module owns its own sub-routes.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2002: Add Item Flow
 * Story SETS-MVP-002: Collection View
 */

import { Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddItemPage } from './pages/AddItemPage'
import { CollectionPage } from './pages/CollectionPage'

export function WishlistModule({ className }: { className?: string }) {
  return (
    <Provider store={store}>
      <ModuleLayout className={className}>
        <Routes>
          <Route index element={<MainPage />} />
          <Route path="add" element={<AddItemPage />} />
          <Route path="collection" element={<CollectionPage />} />
        </Routes>
      </ModuleLayout>
    </Provider>
  )
}

/** @deprecated Use WishlistModule instead */
export const AppWishlistGalleryModule = WishlistModule

export type AppWishlistGalleryModuleProps = { className?: string }

export default WishlistModule
