/**
 * AppSetsGallery Module
 *
 * Main entry point for the App Sets Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Uses TanStack Router with memory history to match the shell app's router.
 */
import { z } from 'zod'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddSetPage } from './pages/add-set-page'
import { EditSetPage } from './pages/edit-set-page'
import { SetDetailPage } from './pages/set-detail-page'

/**
 * Module props schema - validated at runtime
 */
const AppSetsGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AppSetsGalleryModuleProps = z.infer<typeof AppSetsGalleryModulePropsSchema>

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
    component: AddSetPage,
  })

  const editRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/$id/edit',
    component: EditSetPage,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/$id',
    component: SetDetailPage,
  })

  const routeTree = rootRoute.addChildren([indexRoute, addRoute, editRoute, detailRoute])

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/'],
    }),
  })
}

/**
 * AppSetsGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 */
export function AppSetsGalleryModule({ className }: AppSetsGalleryModuleProps) {
  const router = createAppRouter(className)

  return <RouterProvider router={router} />
}

// Default export for lazy loading
export default AppSetsGalleryModule
