import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { Provider } from 'react-redux'
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router'
import { store } from './store'
import { RoadmapPage } from './pages/RoadmapPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'

const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="system" storageKey="workflow-roadmap-theme">
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">Workflow Roadmap</h1>
            </div>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RoadmapPage,
})

const planDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plan/$slug',
  component: PlanDetailsPage,
})

const routeTree = rootRoute.addChildren([indexRoute, planDetailsRoute])

const router = createRouter({
  routeTree,
  history: createMemoryHistory({
    initialEntries: ['/'],
  }),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}
