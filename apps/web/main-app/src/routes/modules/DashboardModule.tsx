/**
 * Dashboard Module
 * Epic 2: Dashboard Features
 *
 * Story 2.1: Dashboard Scaffolding
 * - Lazy-loads @repo/app-dashboard package
 * - Connected to shell via /dashboard route
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the dashboard module from @repo/app-dashboard
const AppDashboardModule = lazy(() =>
  import('@repo/app-dashboard').then(module => ({ default: module.AppDashboardModule })),
)

/**
 * Dashboard Module - Wrapper for lazy-loaded dashboard
 */
export function DashboardModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AppDashboardModule />
    </Suspense>
  )
}
