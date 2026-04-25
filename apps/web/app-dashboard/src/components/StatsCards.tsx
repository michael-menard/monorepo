/**
 * Dashboard Stats Cards Component
 * Story 2.5: Wrapper for @repo/app-component-library StatsCards with LEGO-specific configuration
 */

import { StatsCards as BaseStatsCards } from '@repo/app-component-library'
import type { StatItem } from '@repo/app-component-library'
import type { DashboardStats } from '@repo/api-client/rtk/dashboard-api'
import type { DashboardStatsExtended } from '../__types__'

export interface DashboardStatsCardsProps {
  stats: DashboardStats | DashboardStatsExtended
  isLoading?: boolean
  error?: Error | null
  /** Additional class names for the grid container */
  className?: string
}

/**
 * Type guard to check if stats has buildProgress
 */
function hasProgress(
  stats: DashboardStats | DashboardStatsExtended,
): stats is DashboardStatsExtended {
  return 'buildProgress' in stats
}

/**
 * Dashboard-specific stats cards with LEGO branding
 * Uses the generic StatsCards component from @repo/app-component-library
 */
export function StatsCards({
  stats,
  isLoading = false,
  error = null,
  className,
}: DashboardStatsCardsProps) {
  const items: StatItem[] = [
    {
      label: 'Total MOCs',
      value: stats.totalMocs,
    },
    {
      label: 'Owned Sets',
      value: stats.ownedSetsCount ?? 0,
    },
    {
      label: 'Minifigs',
      value: stats.ownedMinifigsCount ?? 0,
    },
    {
      label: 'Themes',
      value: stats.themeCount,
    },
    {
      label: 'Planned Builds',
      value: stats.plannedBuildsCount ?? 0,
    },
  ]

  // Add build progress if available
  if (hasProgress(stats)) {
    items.push({
      label: 'Built %',
      value: stats.buildProgress,
    })
  }

  return (
    <BaseStatsCards
      items={items}
      isLoading={isLoading}
      error={error}
      className={className}
      emptyTitle="No data yet"
      emptyDescription="Start adding MOCs to see your stats!"
      errorTitle="Unable to load statistics"
      ariaLabel="Dashboard statistics"
    />
  )
}
