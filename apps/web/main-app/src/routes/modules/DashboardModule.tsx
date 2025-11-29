/**
 * Dashboard Module
 * Epic 2: Dashboard Features
 *
 * Stories implemented:
 * - 2.1: Dashboard Scaffolding
 * - 2.2: Dashboard API Slice
 * - 2.3: Stats Endpoint Integration
 * - 2.4: Recent MOCs Endpoint Integration
 * - 2.5: Stats Cards Component
 * - 2.6: Recent MOCs Grid
 * - 2.7: Quick Actions
 * - 2.8: Dashboard Empty State
 * - 2.9: Dashboard Loading State
 */

import { LayoutDashboard, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/alert'
import { useGetStatsQuery, useGetRecentMocsQuery } from '@/store'
import {
  StatsCards,
  RecentMocsGrid,
  QuickActions,
  EmptyDashboard,
  DashboardSkeleton,
} from '@/components/Dashboard'

/**
 * Dashboard Module - Main dashboard page component
 */
export function DashboardModule() {
  // Fetch dashboard data using RTK Query hooks (Stories 2.3, 2.4)
  const { data: statsResponse, isLoading: isStatsLoading, error: statsError } = useGetStatsQuery()

  const {
    data: recentMocsResponse,
    isLoading: isMocsLoading,
    error: mocsError,
  } = useGetRecentMocsQuery(5)

  // Combined loading state (Story 2.9)
  const isLoading = isStatsLoading || isMocsLoading

  // Show skeleton while loading
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // Handle errors
  if (statsError || mocsError) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading dashboard</AlertTitle>
          <AlertDescription>
            Unable to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const stats = statsResponse?.data
  const recentMocs = recentMocsResponse?.data || []

  // Show empty state for new users (Story 2.8)
  if (stats && stats.totalMocs === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <EmptyDashboard />
      </div>
    )
  }

  // Main dashboard view
  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardHeader />

      {/* Quick Actions (Story 2.7) */}
      <QuickActions />

      {/* Stats Cards (Story 2.5) */}
      {stats ? <StatsCards stats={stats} /> : null}

      {/* Recent MOCs Grid (Story 2.6) */}
      <RecentMocsGrid mocs={recentMocs} />
    </div>
  )
}

/**
 * Dashboard Header Component
 */
function DashboardHeader() {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        Dashboard
      </h1>
      <p className="text-muted-foreground">Your personal MOC collection overview</p>
    </div>
  )
}
