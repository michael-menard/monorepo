/**
 * InstuctionsGallery Module
 *
 * Main entry point for the Instuctions Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Handles internal routing for gallery, upload, detail, and edit views.
 */
import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { DetailPage } from './pages/detail-page'
import { UploadPage } from './pages/UploadPage'
import { EditPage } from './pages/EditPage'

/**
 * Module props schema - validated at runtime
 */
const InstuctionsGalleryModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type InstuctionsGalleryModuleProps = z.infer<typeof InstuctionsGalleryModulePropsSchema>

/**
 * InstuctionsGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Handles internal routing based on the current path.
 */
export function InstuctionsGalleryModule({ className }: InstuctionsGalleryModuleProps) {
  const location = useLocation()
  const [currentView, setCurrentView] = useState<'gallery' | 'upload' | 'detail' | 'edit'>(
    'gallery',
  )

  useEffect(() => {
    const path = location.pathname

    // Determine which view to show based on the path
    if (path === '/instructions/new') {
      setCurrentView('upload')
    } else if (path.match(/^\/instructions\/[^/]+\/edit$/)) {
      // Edit page: /instructions/:id/edit
      setCurrentView('edit')
    } else if (path.match(/^\/mocs\/[^/]+\/edit$/)) {
      // Edit page with slug: /mocs/:slug/edit
      setCurrentView('edit')
    } else if (path.match(/^\/instructions\/[^/]+$/)) {
      // Detail page: /instructions/:id
      setCurrentView('detail')
    } else if (path.match(/^\/mocs\/[^/]+$/)) {
      // Detail page with slug: /mocs/:slug
      setCurrentView('detail')
    } else {
      // Default to gallery view
      setCurrentView('gallery')
    }
  }, [location.pathname])

  return (
    <ModuleLayout className={className}>
      {currentView === 'gallery' && <MainPage />}
      {currentView === 'upload' && <UploadPage />}
      {currentView === 'detail' && (
        <DetailPage
          instruction={null}
          isLoading={false}
          error={null}
          onBack={() => setCurrentView('gallery')}
        />
      )}
      {currentView === 'edit' && <EditPage />}
    </ModuleLayout>
  )
}

// Default export for lazy loading
export default InstuctionsGalleryModule
