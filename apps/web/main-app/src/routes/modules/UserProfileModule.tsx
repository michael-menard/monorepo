/**
 * User Profile Module
 * PROF Plan: User Profile Page
 *
 * Lazy-loads @repo/user-settings package (merged profile + settings module)
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

const UserSettingsModule = lazy(() =>
  import('@repo/user-settings').then(module => ({ default: module.UserSettingsModule })),
)

export function UserProfileModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <UserSettingsModule />
    </Suspense>
  )
}
