/**
 * Workflow Roadmap Module
 *
 * Entry point for lazy-loading by the workflow-admin-app shell.
 * Uses browser history with basepath so routes appear in the URL bar.
 * No header — the shell provides it.
 */

import { useRef } from 'react'
import { z } from 'zod'
import { Provider } from 'react-redux'
import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  ScrollRestoration,
} from '@tanstack/react-router'
import { store } from './store'
import { initConfig } from './config'
import { RoadmapPage } from './pages/RoadmapPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { StoryDetailsPage } from './pages/StoryDetailsPage'
import { DashboardPage } from './pages/DashboardPage'

const WorkflowRoadmapModulePropsSchema = z.object({
  thrashThreshold: z.number().optional(),
})

export type WorkflowRoadmapModuleProps = z.infer<typeof WorkflowRoadmapModulePropsSchema>

function ModuleLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

function createAppRouter() {
  const rootRoute = createRootRoute({ component: ModuleLayout })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: RoadmapPage,
  })

  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: DashboardPage,
  })

  const planDetailsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/plan/$slug',
    component: PlanDetailsPage,
    validateSearch: (
      search: Record<string, unknown>,
    ): { tab?: 'table' | 'kanban' | 'timeline' | 'deps' } => {
      const tab = search.tab as string | undefined
      if (tab && ['table', 'kanban', 'timeline', 'deps'].includes(tab)) {
        return { tab: tab as 'table' | 'kanban' | 'timeline' | 'deps' }
      }
      return {}
    },
  })

  const storyDetailsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/story/$storyId',
    component: StoryDetailsPage,
  })

  return createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      dashboardRoute,
      planDetailsRoute,
      storyDetailsRoute,
    ]),
    history: createBrowserHistory(),
    basepath: '/roadmap',
  })
}

export function WorkflowRoadmapModule({ thrashThreshold }: WorkflowRoadmapModuleProps) {
  const routerRef = useRef(createAppRouter())

  if (thrashThreshold !== undefined) {
    initConfig({ thrashThreshold })
  }

  return (
    <Provider store={store}>
      <RouterProvider router={routerRef.current} />
    </Provider>
  )
}

export default WorkflowRoadmapModule
