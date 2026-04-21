import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { Provider } from 'react-redux'
import { BrowserRouter, Routes, Route, Outlet, Link, ScrollRestoration } from 'react-router-dom'
import { Hexagon, GitBranch } from 'lucide-react'
import { store } from './store'
import { RoadmapPage } from './pages/RoadmapPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { StoryDetailsPage } from './pages/StoryDetailsPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotificationBell } from './components/NotificationBell'
import { useNotificationsWS } from './hooks/useNotificationsWS'

function RootLayout() {
  useNotificationsWS()

  return (
    <ThemeProvider defaultTheme="dark" storageKey="workflow-roadmap-theme">
      <TooltipProvider>
        <ScrollRestoration />
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
              <div role="status" className="ml-auto flex items-center gap-4">
                <NotificationBell />
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-mono text-slate-400">LIVE</span>
                </div>
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

export function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<RoadmapPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="plan/:slug" element={<PlanDetailsPage />} />
            <Route path="story/:storyId" element={<StoryDetailsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
