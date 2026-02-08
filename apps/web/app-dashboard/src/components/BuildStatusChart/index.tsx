/**
 * Build Status Chart Component
 * Doughnut chart showing MOC build status breakdown
 */

import { Info } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/app-component-library'
import { DoughnutChart } from '@repo/charts'
import type { BuildStatus } from '../../__types__'

interface BuildStatusChartProps {
  data: BuildStatus
  isLoading?: boolean
}

export function BuildStatusChart({ data, isLoading }: BuildStatusChartProps) {
  const total = data.added + data.inProgress + data.built

  const chartData = [
    { label: 'Added', value: data.added, color: '#64748b' },
    { label: 'In Progress', value: data.inProgress, color: '#f59e0b' },
    { label: 'Built', value: data.built, color: '#10b981' },
  ]

  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div
            className="h-40 md:h-48 w-full bg-muted animate-pulse rounded-full mx-auto"
            style={{ maxWidth: 180 }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
          Build Status
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-4 w-4 text-muted-foreground cursor-help"
                  aria-label="Build status information"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>Track the build progress of your MOC collection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="relative flex items-center justify-center">
          <DoughnutChart
            data={chartData}
            width={180}
            height={180}
            innerRadius={50}
            outerRadius={75}
            centerText={{
              primary: String(total),
              secondary: 'Total',
            }}
            animate
          />
        </div>

        <div
          className="mt-3 md:mt-4 flex flex-wrap justify-center gap-3 md:gap-6"
          role="list"
          aria-label="Build status legend"
        >
          {chartData.map(item => (
            <div key={item.label} className="flex items-center gap-1.5 md:gap-2" role="listitem">
              <div
                className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-xs md:text-sm text-muted-foreground">{item.label}</span>
              <span className="text-xs md:text-sm font-medium text-card-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
