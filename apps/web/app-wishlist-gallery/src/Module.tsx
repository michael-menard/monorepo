/**
 * AppWishlistGallery Module
 *
 * Main entry point for the App Wishlist Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2003: Detail & Edit Pages
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { DetailPage } from './pages/detail-page'
import { EditPage } from './pages/edit-page'

/**
 * Route state schema
 */
const RouteStateSchema = z.discriminatedUnion('page', [
  z.object({ page: z.literal('list') }),
  z.object({ page: z.literal('detail'), itemId: z.string().uuid() }),
  z.object({ page: z.literal('edit'), itemId: z.string().uuid() }),
])

type RouteState = z.infer<typeof RouteStateSchema>

/**
 * Module props schema - validated at runtime
 */
const AppWishlistGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
  /** Initial item ID for deep linking */
  initialItemId: z.string().uuid().optional(),
  /** Initial view for deep linking */
  initialView: z.enum(['list', 'detail', 'edit']).optional(),
})

export type AppWishlistGalleryModuleProps = z.infer<typeof AppWishlistGalleryModulePropsSchema>

/**
 * AppWishlistGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Includes Redux Provider for RTK Query wishlist API.
 * Handles internal routing between list, detail, and edit views.
 */
export function AppWishlistGalleryModule({
  className,
  initialItemId,
  initialView = 'list',
}: AppWishlistGalleryModuleProps) {
  // Internal routing state
  const [route, setRoute] = useState<RouteState>(() => {
    if (initialItemId && initialView === 'detail') {
      return { page: 'detail', itemId: initialItemId }
    }
    if (initialItemId && initialView === 'edit') {
      return { page: 'edit', itemId: initialItemId }
    }
    return { page: 'list' }
  })

  // Navigation handlers
  const navigateToList = useCallback(() => {
    setRoute({ page: 'list' })
  }, [])

  const navigateToDetail = useCallback((itemId: string) => {
    setRoute({ page: 'detail', itemId })
  }, [])

  const navigateToEdit = useCallback((itemId: string) => {
    setRoute({ page: 'edit', itemId })
  }, [])

  // Render current page
  const renderPage = () => {
    switch (route.page) {
      case 'detail':
        return <DetailPage itemId={route.itemId} onBack={navigateToList} onEdit={navigateToEdit} />
      case 'edit':
        return (
          <EditPage
            itemId={route.itemId}
            onCancel={() => navigateToDetail(route.itemId)}
            onSuccess={() => navigateToDetail(route.itemId)}
          />
        )
      case 'list':
      default:
        return <MainPage onItemClick={navigateToDetail} />
    }
  }

  return (
    <Provider store={store}>
      <ModuleLayout className={className}>{renderPage()}</ModuleLayout>
    </Provider>
  )
}

// Default export for lazy loading
export default AppWishlistGalleryModule
