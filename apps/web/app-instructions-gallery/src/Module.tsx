/**
 * InstuctionsGallery Module
 *
 * Main entry point for the Instuctions Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Handles internal routing for gallery, upload, detail, edit, and create views.
 *
 * Story INST-1102: Added 'create' mode for Create Basic MOC
 */
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { UploadPage } from './pages/UploadPage'
import { EditPage } from './pages/EditPage'
import { MocDetailModule } from './pages/MocDetailModule'
import { CreateMocPage } from './pages/CreateMocPage'

/**
 * Gallery view modes controlled by the host application.
 */
const GalleryModeSchema = z.enum(['gallery', 'upload', 'detail', 'edit', 'create'])

export type GalleryMode = z.infer<typeof GalleryModeSchema>

/**
 * Module props schema - validated at runtime
 */
const InstuctionsGalleryModulePropsSchema = z.object({
  /** Which view to render */
  mode: GalleryModeSchema,
  /** Identifier for the current MOC when in detail/edit modes (slug or id). */
  mocIdOrSlug: z.string().optional(),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type InstuctionsGalleryModuleProps = z.infer<typeof InstuctionsGalleryModulePropsSchema>

/**
 * InstuctionsGallery Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * The host app is responsible for routing and passes the desired view via props.
 */
export function InstuctionsGalleryModule({
  mode,
  mocIdOrSlug,
  className,
}: InstuctionsGalleryModuleProps) {
  return (
    <ModuleLayout className={className}>
      {mode === 'gallery' && <MainPage />}
      {mode === 'upload' && <UploadPage />}
      {mode === 'detail' && <MocDetailModule mocIdOrSlug={mocIdOrSlug} />}
      {mode === 'edit' && <EditPage />}
      {mode === 'create' && <CreateMocPage />}
    </ModuleLayout>
  )
}

// Default export for lazy loading
export default InstuctionsGalleryModule
