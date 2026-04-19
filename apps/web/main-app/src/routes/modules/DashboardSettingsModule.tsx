/**
 * Dashboard Settings Module
 *
 * Renders the dashboard's tag-theme mapping settings page
 * at the top-level /settings route.
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

const AppDashboardModule = lazy(() =>
  import('@repo/app-dashboard').then(module => ({ default: module.AppDashboardModule })),
)

export function DashboardSettingsModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AppDashboardModule route="/settings" />
    </Suspense>
  )
}
