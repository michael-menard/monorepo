import {
  ThemeProvider,
  Toaster,
  TooltipProvider,
  AppShellHeader,
  LiveIndicator,
} from '@repo/app-component-library'
import { Provider } from 'react-redux'
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Link,
  ScrollRestoration,
} from 'react-router-dom'
import { Hexagon, GitBranch } from 'lucide-react'
import { store } from './store'
import { RoadmapPage } from './pages/RoadmapPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { StoryDetailsPage } from './pages/StoryDetailsPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotificationBell } from './components/NotificationBell'
import { useNotificationsWS } from './hooks/useNotificationsWS'

function WorkflowBrand() {
  return (
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
  )
}

function RootLayout() {
  useNotificationsWS()

  return (
    <ThemeProvider defaultTheme="dark" storageKey="workflow-roadmap-theme">
      <TooltipProvider>
        <ScrollRestoration />
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
          <AppShellHeader
            variant="dark"
            brand={<WorkflowBrand />}
            navItems={[{ label: 'Dashboard', href: '/dashboard' }]}
            actions={
              <>
                <NotificationBell />
                <LiveIndicator />
              </>
            }
            linkComponent={Link}
          />
          <main>
            <Outlet />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <RoadmapPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'plan/:slug', element: <PlanDetailsPage /> },
      { path: 'story/:storyId', element: <StoryDetailsPage /> },
    ],
  },
])

export function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  )
}
