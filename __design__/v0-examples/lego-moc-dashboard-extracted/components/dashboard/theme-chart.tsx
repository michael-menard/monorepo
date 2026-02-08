"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import type { ThemeBreakdown } from "@/lib/types"

interface ThemeChartProps {
  data: ThemeBreakdown[]
  isLoading?: boolean
}

export function ThemeChart({ data, isLoading }: ThemeChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3 md:space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4">
                <div className="h-3 md:h-4 w-16 md:w-20 bg-muted animate-pulse rounded" />
                <div className="h-5 md:h-6 flex-1 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">MOCs by Theme</CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="h-56 md:h-64" role="img" aria-label="Bar chart showing MOC count by LEGO theme">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="theme" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 md:p-3 shadow-lg">
                        <p className="text-sm md:text-base font-medium text-card-foreground">{payload[0].payload.theme}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          MOCs: <span className="font-medium text-card-foreground">{payload[0].value}</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#1B5E6D" />
                </linearGradient>
              </defs>
              <Bar 
                dataKey="mocCount" 
                radius={[0, 4, 4, 0]}
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
