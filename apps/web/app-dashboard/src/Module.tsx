/**
 * AppDashboard Module
 *
 * Main entry point for the App Dashboard feature module.
 * This module is designed to be lazy-loaded by the shell app.
 *
 * Routes:
 *   / -> MainPage (dashboard overview)
 *   /monitor -> MonitorPage (pipeline monitoring)
 */
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { MonitorPage } from './pages/monitor-page'

/**
 * Module props schema - validated at runtime
 */
const AppDashboardModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
  /** Optional route path to determine which page to render */
  route: z.string().optional(),
})

export type AppDashboardModuleProps = z.infer<typeof AppDashboardModulePropsSchema>

/**
 * AppDashboard Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Supports a 'route' prop to render different pages within the module.
 */
export function AppDashboardModule({ className, route }: AppDashboardModuleProps) {
  // Route to /monitor if specified
  const isMonitorRoute = route === '/monitor' || (typeof window !== 'undefined' && window.location.pathname.includes('/monitor'))

  return (
    <ModuleLayout className={className}>
      {isMonitorRoute ? <MonitorPage /> : <MainPage />}
    </ModuleLayout>
  )
}

// Default export for lazy loading
export default AppDashboardModule
