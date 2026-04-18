/**
 * AppMinifigsGallery Module
 *
 * Main entry point for the Minifig Collection feature module.
 * Lazy-loaded by the shell app. Props-driven — the shell controls which
 * view is active via `mode` and passes navigation callbacks.
 */
import { z } from 'zod'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { MinifigDetailPage } from './pages/minifig-detail-page'

const AppMinifigsGalleryModulePropsSchema = z.object({
  mode: z.enum(['gallery', 'detail']).default('gallery'),
  minifigId: z.string().optional(),
  className: z.string().optional(),
})

type AppMinifigsGalleryModuleSchemaProps = z.infer<typeof AppMinifigsGalleryModulePropsSchema>

export type AppMinifigsGalleryModuleProps = AppMinifigsGalleryModuleSchemaProps & {
  onNavigate?: (path: string) => void
}

export function AppMinifigsGalleryModule({
  mode = 'gallery',
  minifigId,
  className,
  onNavigate,
}: AppMinifigsGalleryModuleProps) {
  return (
    <Provider store={store}>
      <ModuleLayout className={className}>
        {mode === 'detail' && minifigId ? (
          <MinifigDetailPage minifigId={minifigId} onNavigate={onNavigate} />
        ) : (
          <MainPage onNavigate={onNavigate} />
        )}
      </ModuleLayout>
    </Provider>
  )
}

export default AppMinifigsGalleryModule
