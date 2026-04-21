/**
 * AppSetsGallery Module
 *
 * Main entry point for the App Sets Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Uses React Router v7 with relative routes for shell integration.
 */
import { z } from 'zod'
import { Routes, Route, Outlet } from 'react-router-dom'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddSetPage } from './pages/add-set-page'
import { SetDetailPage } from './pages/set-detail-page'

/**
 * Module props schema - validated at runtime
 */
const SetsModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type SetsModuleProps = z.infer<typeof SetsModulePropsSchema>

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
 * SetsModule Component
 *
 * This is the main export that the shell app will lazy-load.
 */
export function SetsModule({ className }: SetsModuleProps = {}) {
  return (
    <Routes>
      <Route element={<RootLayout className={className} />}>
        <Route index element={<MainPage />} />
        <Route path="new" element={<AddSetPage />} />
        <Route path=":id" element={<SetDetailPage />} />
      </Route>
    </Routes>
  )
}

/** Backward-compat alias during migration */
export const AppSetsGalleryModule = SetsModule

// Default export for lazy loading
export default SetsModule
