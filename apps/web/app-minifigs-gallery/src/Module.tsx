/**
 * AppMinifigsGallery Module
 *
 * Main entry point for the Minifig Collection feature module.
 * Uses React Router v7 for internal routing. When embedded in a shell
 * that uses a different router (e.g. TanStack Router), the module
 * provides its own BrowserRouter with basename="/minifigs" so that
 * internal navigation updates the real browser URL. For standalone
 * dev, App.tsx provides its own BrowserRouter.
 */
import { Routes, Route, BrowserRouter, useInRouterContext } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { MinifigDetailPage } from './pages/minifig-detail-page'
import { CustomsPage } from './pages/customs-page'

function MinifigsRoutes() {
  return (
    <Routes>
      <Route index element={<MainPage />} />
      <Route path="customs" element={<CustomsPage />} />
      <Route path=":id" element={<MinifigDetailPage />} />
    </Routes>
  )
}

export function MinifigsModule({ className }: { className?: string }) {
  const hasRouter = useInRouterContext()

  return (
    <Provider store={store}>
      <ModuleLayout className={className}>
        {hasRouter ? (
          <MinifigsRoutes />
        ) : (
          <BrowserRouter basename="/minifigs">
            <MinifigsRoutes />
          </BrowserRouter>
        )}
      </ModuleLayout>
    </Provider>
  )
}

/** @deprecated Use MinifigsModule instead */
export const AppMinifigsGalleryModule = MinifigsModule

export default MinifigsModule
