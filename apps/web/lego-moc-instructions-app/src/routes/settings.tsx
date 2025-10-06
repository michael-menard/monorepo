import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import AccountSettingsPage from '../pages/AccountSettingsPage'

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: AccountSettingsPage,
})
