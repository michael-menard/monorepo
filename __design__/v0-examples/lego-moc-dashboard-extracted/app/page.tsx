"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { BuildStatusChart } from "@/components/dashboard/build-status-chart"
import { ThemeChart } from "@/components/dashboard/theme-chart"
import { PartsCoverageCard } from "@/components/dashboard/parts-coverage-card"
import { RecentMocsGrid } from "@/components/dashboard/recent-mocs-grid"
import { PartsTable } from "@/components/dashboard/parts-table"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DraggableGrid, DashboardItem } from "@/components/dashboard/draggable-grid"
import {
  dashboardStats,
  buildStatus,
  themeBreakdown,
  recentMocs,
  partsCoverage,
  partialMocs,
  activityFeed,
} from "@/lib/mock-data"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTheme, setSelectedTheme] = useState("all")

  // Get unique themes from data
  const themes = useMemo(() => {
    const allThemes = new Set<string>()
    themeBreakdown.forEach((t) => allThemes.add(t.theme))
    recentMocs.forEach((m) => allThemes.add(m.theme))
    partialMocs.forEach((m) => allThemes.add(m.theme))
    return Array.from(allThemes).sort()
  }, [])

  // Filter data based on search and theme
  const filteredRecentMocs = useMemo(() => {
    return recentMocs.filter((moc) => {
      const matchesSearch = searchQuery
        ? moc.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      const matchesTheme = selectedTheme !== "all" ? moc.theme === selectedTheme : true
      return matchesSearch && matchesTheme
    })
  }, [searchQuery, selectedTheme])

  const filteredPartialMocs = useMemo(() => {
    return partialMocs.filter((moc) => {
      const matchesSearch = searchQuery
        ? moc.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      const matchesTheme = selectedTheme !== "all" ? moc.theme === selectedTheme : true
      return matchesSearch && matchesTheme
    })
  }, [searchQuery, selectedTheme])

  const filteredThemeBreakdown = useMemo(() => {
    if (selectedTheme === "all") return themeBreakdown
    return themeBreakdown.filter((t) => t.theme === selectedTheme)
  }, [selectedTheme])

  const filteredActivityFeed = useMemo(() => {
    if (!searchQuery) return activityFeed
    return activityFeed.filter((item) =>
      item.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Define dashboard items for the draggable grid
  const dashboardItems: DashboardItem[] = useMemo(() => [
    {
      id: "build-status",
      label: "Build status overview",
      component: <BuildStatusChart data={buildStatus} isLoading={isLoading} />,
      defaultColSpan: 1,
    },
    {
      id: "parts-coverage",
      label: "Parts inventory coverage",
      component: <PartsCoverageCard data={partsCoverage} isLoading={isLoading} />,
      defaultColSpan: 1,
    },
    {
      id: "theme-chart",
      label: "MOCs by theme breakdown",
      component: <ThemeChart data={filteredThemeBreakdown} isLoading={isLoading} />,
      defaultColSpan: 1,
    },
    {
      id: "activity-feed",
      label: "Recent activity timeline",
      component: <ActivityFeed activities={filteredActivityFeed} isLoading={isLoading} />,
      defaultColSpan: 1,
    },
    {
      id: "recent-mocs",
      label: "Recently added MOCs",
      component: <RecentMocsGrid mocs={filteredRecentMocs} isLoading={isLoading} />,
      defaultColSpan: 3,
    },
    {
      id: "parts-table",
      label: "MOCs needing parts",
      component: <PartsTable data={filteredPartialMocs} isLoading={isLoading} />,
      defaultColSpan: 2,
    },
  ], [isLoading, filteredThemeBreakdown, filteredActivityFeed, filteredRecentMocs, filteredPartialMocs])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 md:px-6 lg:py-8">
        {/* Stats Cards */}
        <section aria-label="Collection statistics">
          <StatsCards stats={dashboardStats} isLoading={isLoading} />
        </section>

        {/* Quick Actions and Filter Bar */}
        <section className="mt-4 md:mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between" aria-label="Quick actions and filters">
          <QuickActions />
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
            themes={themes}
          />
        </section>

        {/* Draggable Dashboard Grid */}
        <div className="mt-6 md:mt-8">
          <DraggableGrid items={dashboardItems} isLoading={isLoading} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-8 md:mt-12">
        <div className="container mx-auto px-4 py-4 md:py-6 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            BrickVault — Your LEGO MOC Collection Manager
          </p>
        </div>
      </footer>
    </div>
  )
}
