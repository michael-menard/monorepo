/**
 * Dashboard Stats Cards Component
 * Story 2.5: Wrapper for @repo/app-component-library StatsCards with LEGO-specific configuration
 */

import { StatsCards as BaseStatsCards } from '@repo/app-component-library'
import type { StatItem } from '@repo/app-component-library'
import { Blocks, Heart, Palette } from 'lucide-react'
import type { DashboardStats } from '@repo/api-client/rtk/dashboard-api'

export interface DashboardStatsCardsProps {
  stats: DashboardStats
  isLoading?: boolean
  error?: Error | null
}

/**
 * Dashboard-specific stats cards with LEGO branding
 * Uses the generic StatsCards component from @repo/app-component-library
 */
export function StatsCards({ stats, isLoading = false, error = null }: DashboardStatsCardsProps) {
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

  return (
    <BaseStatsCards
      items={items}
      isLoading={isLoading}
      error={error}
      emptyTitle="No data yet"
      emptyDescription="Start adding MOCs to see your stats!"
      errorTitle="Unable to load statistics"
      ariaLabel="Dashboard statistics"
    />
  )
}
