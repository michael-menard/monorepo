/**
 * AppWishlistGallery Module
 *
 * Main entry point for the App Wishlist Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2002: Add Item Flow
 * Story SETS-MVP-002: Collection View
 */

import { z } from 'zod'
import { Provider } from 'react-redux'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddItemPage } from './pages/AddItemPage'
import { CollectionPage } from './pages/CollectionPage'

/**
 * Module props schema - validated at runtime
 */
const AppWishlistGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AppWishlistGalleryModuleProps = z.infer<typeof AppWishlistGalleryModulePropsSchema>

/**
 * Root layout component
 */
function RootLayout({ className }: { className?: string }) {
  return (
    <ModuleLayout className={className}>
      <Outlet />
    </ModuleLayout>
  )
}

/**
 * Create router with routes
 */
function createAppRouter(className?: string) {
  const rootRoute = createRootRoute({
    component: () => <RootLayout className={className} />,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: MainPage,
  })

  const addRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/add',
    component: AddItemPage,
  })

  const collectionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/collection',
    component: CollectionPage,
  })

  const routeTree = rootRoute.addChildren([indexRoute, addRoute, collectionRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/'],
    }),
  })
}

/**
 * AppWishlistGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Includes Redux Provider for RTK Query wishlist API.
 */
export function AppWishlistGalleryModule({ className }: AppWishlistGalleryModuleProps) {
  const router = createAppRouter(className)

  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}

// Default export for lazy loading
export default AppWishlistGalleryModule
