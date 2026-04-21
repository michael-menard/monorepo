/**
 * AppDashboard Module
 *
 * Main entry point for the App Dashboard feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Renders the dashboard main page directly — routing is handled
 * by the shell app (main-app).
 */
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'

/**
 * Module props schema - validated at runtime
 */
const DashboardModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type DashboardModuleProps = z.infer<typeof DashboardModulePropsSchema>

/**
 * DashboardModule Component
 *
 * Single-page dashboard module. The shell app lazy-loads this
 * at /dashboard. No internal routing needed.
 */
export function DashboardModule({ className }: DashboardModuleProps) {
  return (
    <ModuleLayout className={className}>
      <MainPage />
    </ModuleLayout>
  )
}

/** @deprecated Use DashboardModule instead */
export const AppDashboardModule = DashboardModule

// Default export for lazy loading
export default DashboardModule
