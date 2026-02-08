"use client"

import { Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import type { BuildStatus } from "@/lib/types"

interface BuildStatusChartProps {
  data: BuildStatus
  isLoading?: boolean
}

export function BuildStatusChart({ data, isLoading }: BuildStatusChartProps) {
  const total = data.added + data.inProgress + data.built
  
  const chartData = [
    { name: "Added", value: data.added, color: "#64748b" },
    { name: "In Progress", value: data.inProgress, color: "#f59e0b" },
    { name: "Built", value: data.built, color: "#10b981" },
  ]

  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="h-40 md:h-48 w-full bg-muted animate-pulse rounded-full mx-auto" style={{ maxWidth: 180 }} />
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
                <Info className="h-4 w-4 text-muted-foreground cursor-help" aria-label="Build status information" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Track the build progress of your MOC collection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="relative h-40 md:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl md:text-3xl font-bold text-card-foreground">{total}</span>
            <span className="text-xs md:text-sm text-muted-foreground">Total</span>
          </div>
        </div>
        
        <div className="mt-3 md:mt-4 flex flex-wrap justify-center gap-3 md:gap-6" role="list" aria-label="Build status legend">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 md:gap-2" role="listitem">
              <div 
                className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" 
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-xs md:text-sm text-muted-foreground">{item.name}</span>
              <span className="text-xs md:text-sm font-medium text-card-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
