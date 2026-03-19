import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { Provider } from 'react-redux'
import {
  RouterProvider,
  createRouter,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
} from '@tanstack/react-router'
import { Hexagon, GitBranch } from 'lucide-react'
import { store } from './store'
import { RoadmapPage } from './pages/RoadmapPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { StoryDetailsPage } from './pages/StoryDetailsPage'
import { DashboardPage } from './pages/DashboardPage'

function RootLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="workflow-roadmap-theme">
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
          <header className="border-b border-slate-700/50 bg-black/40 backdrop-blur-md sticky top-0 z-40">
            <nav
              aria-label="Roadmap navigation"
              className="container mx-auto px-4 py-3 flex items-center gap-3"
            >
              <Link to="/" className="flex items-center gap-2">
                <div className="relative">
                  <Hexagon className="h-7 w-7 text-cyan-500" aria-hidden="true" />
                  <GitBranch
                    className="h-3.5 w-3.5 text-cyan-300 absolute inset-0 m-auto"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  WORKFLOW ROADMAP
                </span>
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
              >
                Dashboard
              </Link>
              <div role="status" className="ml-auto flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"
                  aria-hidden="true"
                />
                <span className="text-xs font-mono text-slate-400">LIVE</span>
              </div>
            </nav>
          </header>
          <main>
            <Outlet />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RoadmapPage,
})

const planDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plan/$slug',
  component: PlanDetailsPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: 'table' | 'kanban' | 'timeline' | 'deps' } => {
    const tab = search.tab as string | undefined
    if (tab && ['table', 'kanban', 'timeline', 'deps'].includes(tab)) {
      return { tab: tab as 'table' | 'kanban' | 'timeline' | 'deps' }
    }
    return {}
  },
})

const storyDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/story/$storyId',
  component: StoryDetailsPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  planDetailsRoute,
  storyDetailsRoute,
])

const router = createRouter({
  routeTree,
  history: createBrowserHistory(),
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
