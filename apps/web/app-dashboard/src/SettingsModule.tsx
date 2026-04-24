/**
 * SettingsModule
 *
 * Router-based settings module mounted at /settings by the shell app.
 * Uses react-router-dom <Routes> for sub-route navigation:
 *   /settings          -> SettingsLandingPage (tag-theme mappings + nav)
 *   /settings/scraper  -> Scraper Queue (from @repo/app-scraper-queue)
 *   /settings/themes   -> Tag-Theme Mappings (dedicated page)
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ModuleLayout } from './components/module-layout'
import { SettingsLandingPage } from './pages/settings-landing-page'
import { ThemeMappingsPage } from './pages/theme-mappings-page'

const AppScraperQueueModule = lazy(() =>
  import('@repo/app-scraper-queue').then(module => ({ default: module.AppScraperQueueModule })),
)

function ScraperPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AppScraperQueueModule />
    </Suspense>
  )
}

/**
 * SettingsModule — mounted at /settings by the shell.
 * Renders sub-routes using react-router-dom.
 */
export function SettingsModule() {
  return (
    <Routes>
      <Route
        index
        element={
          <ModuleLayout>
            <SettingsLandingPage />
          </ModuleLayout>
        }
      />
      <Route
        path="scraper"
        element={
          <ModuleLayout fillViewport>
            <ScraperPage />
          </ModuleLayout>
        }
      />
      <Route
        path="themes"
        element={
          <ModuleLayout>
            <ThemeMappingsPage />
          </ModuleLayout>
        }
      />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  )
}

export default SettingsModule
