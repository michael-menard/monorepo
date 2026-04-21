/**
 * Theme Chart Component
 * Sunburst chart showing MOC instructions, sets, and minifigs per theme
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { Link } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { SunburstChart } from '@repo/charts'
import type { SunburstNode } from '@repo/charts'
import type { ThemeBreakdown } from '../../__types__'

interface ThemeChartProps {
  data: ThemeBreakdown[]
  isLoading?: boolean
}

export function ThemeChart({ data, isLoading }: ThemeChartProps) {
  const sunburstData = useMemo<SunburstNode>(() => {
    const children: SunburstNode[] = data
      .filter(item => item.mocCount > 0)
      .map(item => ({
        name: item.theme,
        children: item.tags.map(t => ({ name: t.tag, value: t.mocCount })),
      }))

    return { name: 'Collection', children }
  }, [data])

  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-32 md:w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="h-48 md:h-56 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">
            Collection by Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No theme data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">
            Collection by Theme
          </CardTitle>
          <Link
            to="/settings"
            className="relative z-10 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Manage tag-theme mappings"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="flex items-center justify-center h-72 md:h-80 overflow-hidden">
          <SunburstChart data={sunburstData} width={320} height={320} animate showBreadcrumb />
        </div>
        {/* Breadcrumb hover handles labeling — inner ring = themes, outer ring = tags */}
      </CardContent>
    </Card>
  )
}
