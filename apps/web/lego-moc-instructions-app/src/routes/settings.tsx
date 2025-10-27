import { createRoute } from '@tanstack/react-router'
import AccountSettingsPage from '../pages/AccountSettingsPage'
import { rootRoute } from './root'

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: AccountSettingsPage,
})
