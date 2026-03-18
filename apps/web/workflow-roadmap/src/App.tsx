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

const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="workflow-roadmap-theme">
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100 relative">
          <header className="border-b border-slate-700/50 bg-black/40 backdrop-blur-md sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <Hexagon className="h-7 w-7 text-cyan-500" />
                  <GitBranch className="h-3.5 w-3.5 text-cyan-300 absolute inset-0 m-auto" />
                </div>
                <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  WORKFLOW ROADMAP
                </span>
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">LIVE</span>
              </div>
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

const storyDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/story/$storyId',
  component: StoryDetailsPage,
})

const routeTree = rootRoute.addChildren([indexRoute, planDetailsRoute, storyDetailsRoute])

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
