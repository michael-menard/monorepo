/**
 * AppSetsGallery Module
 *
 * Main entry point for the App Sets Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 */
import { z } from 'zod'
import { Routes, Route, MemoryRouter } from 'react-router-dom'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { AddSetPage } from './pages/add-set-page'
import { SetDetailPage } from './pages/set-detail-page'

/**
 * Module props schema - validated at runtime
 */
const AppSetsGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
  /** Whether to use MemoryRouter (for testing) or inherit parent router */
  useMemoryRouter: z.boolean().optional(),
})

export type AppSetsGalleryModuleProps = z.infer<typeof AppSetsGalleryModulePropsSchema>

/**
 * AppSetsGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 */
export function AppSetsGalleryModule({
  className,
  useMemoryRouter = false,
}: AppSetsGalleryModuleProps) {
  const content = (
    <ModuleLayout className={className}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/sets/add" element={<AddSetPage />} />
        <Route path="/sets/:id" element={<SetDetailPage />} />
      </Routes>
    </ModuleLayout>
  )

  // Use MemoryRouter for standalone/testing, otherwise assume router context from parent
  if (useMemoryRouter) {
    return <MemoryRouter>{content}</MemoryRouter>
  }

  return content
}

// Default export for lazy loading
export default AppSetsGalleryModule
