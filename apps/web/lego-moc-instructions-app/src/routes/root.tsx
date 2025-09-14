import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Layout from '../components/Layout'
import TanStackQueryLayout from '../integrations/tanstack-query/layout'
import PerformanceMonitor from '../components/PerformanceMonitor'
import { PWAUpdateNotification } from '../components/PWAUpdateNotification'
import { OfflineStatusIndicator } from '../components/OfflineStatusIndicator'

export const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
      <TanStackRouterDevtools />
      <TanStackQueryLayout />
      <PerformanceMonitor />
      <PWAUpdateNotification />
      <OfflineStatusIndicator />
    </Layout>
  ),
})
