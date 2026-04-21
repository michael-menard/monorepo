/**
 * AppDashboard Main Page
 *
 * Dashboard showing collection statistics, theme breakdown,
 * recent MOCs, and activity feed — all from real API data.
 */

import { z } from 'zod'
import { EmptyDashboard } from '@repo/app-component-library/feedback/empty-states'
import { useGetDashboardDataQuery } from '@repo/api-client/rtk/dashboard-api'
import {
  StatsCards,
  RecentMocsGrid,
  ThemeChart,
  ActivityFeed,
  DashboardHeader,
} from '../components'

const MainPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

export function MainPage({ className }: MainPageProps) {
  const { data, isLoading, isError } = useGetDashboardDataQuery(undefined, {
    pollingInterval: 10_000,
    refetchOnFocus: true,
  })

  const themeBreakdown = data?.themeBreakdown ?? []
  const recentMocs = data?.recentMocs ?? []
  const activityFeed = data?.activityFeed ?? []

  // Empty state
  if (!isLoading && !isError && data && data.stats.totalMocs === 0) {
    return (
      <div className={className}>
        <EmptyDashboard />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <DashboardHeader />

        {/* Stats Cards */}
        <section aria-label="Collection statistics">
          <StatsCards
            stats={{
              totalMocs: data?.stats.totalMocs ?? 0,
              wishlistCount: data?.stats.wishlistCount ?? 0,
              ownedSetsCount: data?.stats.ownedSetsCount ?? 0,
              ownedMinifigsCount: data?.stats.ownedMinifigsCount ?? 0,
              themeCount: data?.stats.themeCount ?? 0,
              plannedBuildsCount: data?.stats.plannedBuildsCount ?? 0,
              lastUpdated: data?.stats.lastUpdated ?? new Date().toISOString(),
            }}
            isLoading={isLoading}
          />
        </section>

        {/* Quick Actions — Add MOC button moved to Instructions tab */}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Row 1: Theme Chart (2 cols) + Activity Feed (1 col) */}
          <section aria-label="MOCs by theme breakdown" className="md:col-span-1 xl:col-span-2">
            <ThemeChart data={themeBreakdown} isLoading={isLoading} />
          </section>

          <section aria-label="Recent activity timeline">
            <ActivityFeed activities={activityFeed} isLoading={isLoading} />
          </section>

          {/* Row 2: Recent MOCs (full width) */}
          <section aria-label="Recently added MOCs" className="md:col-span-2 xl:col-span-3">
            <RecentMocsGrid mocs={recentMocs} isLoading={isLoading} />
          </section>
        </div>

        {/* Build Status, Parts Coverage, and Parts Table are hidden for now.
            Components are preserved in the codebase — re-add them here when data is available:
            - BuildStatusChart: needs a buildStatus field on MOCs
            - PartsCoverageCard: needs parts list inventory data
            - PartsTable: needs parts list coverage percentages
        */}
      </div>
    </div>
  )
}

export default MainPage
