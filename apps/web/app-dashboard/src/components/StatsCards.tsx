/**
 * Dashboard Stats Cards Component
 * Story 2.5: Wrapper for @repo/app-component-library StatsCards with LEGO-specific configuration
 */

import { StatsCards as BaseStatsCards } from '@repo/app-component-library'
import type { StatItem } from '@repo/app-component-library'
import { Blocks, Heart, Palette, Hammer } from 'lucide-react'
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
function hasProgress(stats: DashboardStats | DashboardStatsExtended): stats is DashboardStatsExtended {
  return 'buildProgress' in stats
}

/**
 * Dashboard-specific stats cards with LEGO branding
 * Uses the generic StatsCards component from @repo/app-component-library
 */
export function StatsCards({ stats, isLoading = false, error = null, className }: DashboardStatsCardsProps) {
  const items: StatItem[] = [
    {
      icon: Blocks,
      label: 'Total MOCs',
      value: stats.totalMocs,
      colorClass: 'text-lego-red',
      bgClass: 'bg-lego-red/10',
    },
    {
      icon: Heart,
      label: 'Wishlist Items',
      value: stats.wishlistCount,
      colorClass: 'text-lego-blue',
      bgClass: 'bg-lego-blue/10',
    },
    {
      icon: Palette,
      label: 'Themes',
      value: stats.themeCount,
      colorClass: 'text-lego-yellow',
      bgClass: 'bg-lego-yellow/10',
    },
  ]

  // Add build progress if available
  if (hasProgress(stats)) {
    items.push({
      icon: Hammer,
      label: 'Built %',
      value: stats.buildProgress,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-600/10 dark:bg-emerald-400/10',
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
