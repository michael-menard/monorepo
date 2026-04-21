import { lazy, Suspense } from 'react'
import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { Provider } from 'react-redux'
import { BrowserRouter, Routes, Route, Outlet, Link, ScrollRestoration } from 'react-router-dom'
import { Hexagon, GitBranch } from 'lucide-react'
import { store } from './store'
import { THRASH_THRESHOLD } from './constants'

const WorkflowRoadmapModule = lazy(() => import('@repo/workflow-roadmap'))

function LoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Loading module"
      className="flex items-center justify-center py-24"
    >
      <p className="animate-pulse text-muted-foreground">Loading module...</p>
    </div>
  )
}

function RoadmapModulePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkflowRoadmapModule thrashThreshold={THRASH_THRESHOLD} />
    </Suspense>
  )
}

function ShellLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="workflow-admin-theme">
      <TooltipProvider>
        <ScrollRestoration />
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
          <header className="border-b border-slate-700/50 bg-black/40 backdrop-blur-md sticky top-0 z-50">
            <nav
              aria-label="Shell navigation"
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
                to="/roadmap"
                className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors [&.active]:text-cyan-400"
              >
                Roadmap
              </Link>
              <Link
                to="/roadmap/dashboard"
                className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors [&.active]:text-cyan-400"
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

function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-4">Modules</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <li>
          <Link
            to="/roadmap"
            className="block rounded-lg border border-slate-700/50 p-6 hover:bg-slate-800/50 transition-colors"
          >
            <h2 className="font-semibold">Roadmap</h2>
            <p className="text-sm text-slate-400 mt-1">
              Plans, stories, dependencies, and project health dashboard
            </p>
          </Link>
        </li>
      </ul>
    </div>
  )
}

export function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<ShellLayout />}>
            <Route index element={<HomePage />} />
            <Route path="roadmap/*" element={<RoadmapModulePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
