/**
 * AppDashboard Main Page
 *
 * Comprehensive dashboard showing collection statistics, build progress,
 * recent activity, and parts coverage.
 */

import { useState, useEffect, useMemo } from 'react'
import { z } from 'zod'
import {
  StatsCards,
  QuickActions,
  RecentMocsGrid,
  BuildStatusChart,
  ThemeChart,
  PartsCoverageCard,
  PartsTable,
  ActivityFeed,
  FilterBar,
  DashboardHeader,
  EmptyDashboard,
} from '../components'
import {
  dashboardStats,
  buildStatus,
  themeBreakdown,
  recentMocs,
  partsCoverage,
  partialMocs,
  activityFeed,
} from '../data/mock-data'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Main Page Component
 *
 * This is the primary dashboard page showing the user's LEGO MOC collection
 * statistics, build progress, and recent activity.
 */
export function MainPage({ className }: MainPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('all')

  // Get unique themes from data
  const themes = useMemo(() => {
    const allThemes = new Set<string>()
    themeBreakdown.forEach(t => allThemes.add(t.theme))
    recentMocs.forEach(m => allThemes.add(m.theme))
    partialMocs.forEach(m => allThemes.add(m.theme))
    return Array.from(allThemes).sort()
  }, [])

  // Filter data based on search and theme
  const filteredRecentMocs = useMemo(() => {
    return recentMocs.filter(moc => {
      const matchesSearch = searchQuery
        ? moc.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      const matchesTheme = selectedTheme !== 'all' ? moc.theme === selectedTheme : true
      return matchesSearch && matchesTheme
    })
  }, [searchQuery, selectedTheme])

  const filteredPartialMocs = useMemo(() => {
    return partialMocs.filter(moc => {
      const matchesSearch = searchQuery
        ? moc.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      const matchesTheme = selectedTheme !== 'all' ? moc.theme === selectedTheme : true
      return matchesSearch && matchesTheme
    })
  }, [searchQuery, selectedTheme])

  const filteredThemeBreakdown = useMemo(() => {
    if (selectedTheme === 'all') return themeBreakdown
    return themeBreakdown.filter(t => t.theme === selectedTheme)
  }, [selectedTheme])

  const filteredActivityFeed = useMemo(() => {
    if (!searchQuery) return activityFeed
    return activityFeed.filter(item =>
      item.message.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [searchQuery])

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Check if user has no data (empty state)
  const isEmpty = dashboardStats.totalMocs === 0

  if (isEmpty && !isLoading) {
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

        {/* Stats Cards - 4 columns for 4 stats */}
        <section aria-label="Collection statistics">
          <StatsCards
            stats={dashboardStats}
            isLoading={isLoading}
            className="grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
          />
        </section>

        {/* Quick Actions and Filter Bar - all on one row */}
        <section
          className="flex flex-wrap items-center gap-3"
          aria-label="Quick actions and filters"
        >
          <QuickActions />
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
            themes={themes}
          />
        </section>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Row 1: Build Status, Parts Coverage, Theme Chart */}
          <section aria-label="Build status overview">
            <BuildStatusChart data={buildStatus} isLoading={isLoading} />
          </section>

          <section aria-label="Parts inventory coverage">
            <PartsCoverageCard data={partsCoverage} isLoading={isLoading} />
          </section>

          <section aria-label="MOCs by theme breakdown">
            <ThemeChart data={filteredThemeBreakdown} isLoading={isLoading} />
          </section>

          {/* Row 2: Activity Feed (1 col), Recent MOCs (2 cols) */}
          <section aria-label="Recent activity timeline">
            <ActivityFeed activities={filteredActivityFeed} isLoading={isLoading} />
          </section>

          <section aria-label="Recently added MOCs" className="md:col-span-2">
            <RecentMocsGrid mocs={filteredRecentMocs} />
          </section>

          {/* Row 3: Parts Table (full width on xl, 2 cols on md) */}
          <section aria-label="MOCs needing parts" className="md:col-span-2 xl:col-span-3">
            <PartsTable data={filteredPartialMocs} isLoading={isLoading} />
          </section>
        </div>
      </div>
    </div>
  )
}

export default MainPage
