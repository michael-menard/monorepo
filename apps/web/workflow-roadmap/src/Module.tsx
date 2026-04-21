/**
 * Workflow Roadmap Module
 *
 * Entry point for lazy-loading by the workflow-admin-app shell.
 * Uses React Router v7 with basepath so routes appear in the URL bar.
 * No header — the shell provides it.
 */

import { z } from 'zod'
import { Provider } from 'react-redux'
import { Routes, Route, Outlet, ScrollRestoration } from 'react-router-dom'
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

export function WorkflowRoadmapModule({ thrashThreshold }: WorkflowRoadmapModuleProps) {
  if (thrashThreshold !== undefined) {
    initConfig({ thrashThreshold })
  }

  return (
    <Provider store={store}>
      <Routes>
        <Route element={<ModuleLayout />}>
          <Route index element={<RoadmapPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="plan/:slug" element={<PlanDetailsPage />} />
          <Route path="story/:storyId" element={<StoryDetailsPage />} />
        </Route>
      </Routes>
    </Provider>
  )
}

export default WorkflowRoadmapModule
