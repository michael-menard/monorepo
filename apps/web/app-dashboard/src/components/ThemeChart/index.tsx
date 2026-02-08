/**
 * Theme Chart Component
 * Bar chart showing MOC/Set counts per theme
 */

import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { GroupedBarChart } from '@repo/charts'
import type { ThemeBreakdown } from '../../__types__'

interface ThemeChartProps {
  data: ThemeBreakdown[]
  isLoading?: boolean
}

export function ThemeChart({ data, isLoading }: ThemeChartProps) {
  // Transform data for GroupedBarChart
  const chartData = data.map(item => ({
    category: item.theme,
    groups: {
      MOCs: item.mocCount,
      Sets: item.setCount,
    },
  }))

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
            MOCs by Theme
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
        <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">
          MOCs by Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="h-56 md:h-64 overflow-hidden">
          <GroupedBarChart
            data={chartData}
            width={350}
            height={220}
            margin={{ top: 20, right: 80, bottom: 50, left: 40 }}
            xLabel=""
            yLabel="Count"
            colors={['#0ea5e9', '#f59e0b']}
            animate
          />
        </div>
      </CardContent>
    </Card>
  )
}
