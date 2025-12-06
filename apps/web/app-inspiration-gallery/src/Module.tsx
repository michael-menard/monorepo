/**
 * AppInspirationGallery Module
 *
 * Main entry point for the App Inspiration Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 */
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'

/**
 * Module props schema - validated at runtime
 */
const AppInspirationGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AppInspirationGalleryModuleProps = z.infer<
  typeof AppInspirationGalleryModulePropsSchema
>

/**
 * AppInspirationGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 */
export function AppInspirationGalleryModule({ className }: AppInspirationGalleryModuleProps) {
  return (
    <ModuleLayout className={className}>
      <MainPage />
    </ModuleLayout>
  )
}

// Default export for lazy loading
export default AppInspirationGalleryModule
