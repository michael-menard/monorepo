"use client"

import { Check, Clock, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { PartsCoverage } from "@/lib/types"

interface PartsCoverageCardProps {
  data: PartsCoverage
  isLoading?: boolean
}

export function PartsCoverageCard({ data, isLoading }: PartsCoverageCardProps) {
  const total = data.fullInventory + data.partialOrdered + data.missingParts

  const statuses = [
    {
      label: "Full Inventory",
      count: data.fullInventory,
      percentage: Math.round((data.fullInventory / total) * 100),
      icon: Check,
      color: "bg-[#2D5F4F] dark:bg-[#10b981]",
      iconBg: "bg-[#2D5F4F]/10 text-[#2D5F4F] dark:bg-[#10b981]/10 dark:text-[#10b981]",
    },
    {
      label: "Partial - Ordered",
      count: data.partialOrdered,
      percentage: Math.round((data.partialOrdered / total) * 100),
      icon: Clock,
      color: "bg-[#D4A574] dark:bg-[#f59e0b]",
      iconBg: "bg-[#D4A574]/10 text-[#D4A574] dark:bg-[#f59e0b]/10 dark:text-[#f59e0b]",
    },
    {
      label: "Missing Parts",
      count: data.missingParts,
      percentage: Math.round((data.missingParts / total) * 100),
      icon: X,
      color: "bg-[#A85B4B] dark:bg-[#ef4444]",
      iconBg: "bg-[#A85B4B]/10 text-[#A85B4B] dark:bg-[#ef4444]/10 dark:text-[#ef4444]",
    },
  ]

  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-36 md:w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 md:h-4 w-20 md:w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 md:h-4 w-10 md:w-12 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-1.5 md:h-2 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">Parts Coverage Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-5 px-4 md:px-6">
        {statuses.map((status) => (
          <div key={status.label} className="space-y-1.5 md:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                <div className={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full shrink-0 ${status.iconBg}`}>
                  <status.icon className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden="true" />
                </div>
                <span className="text-xs md:text-sm font-medium text-card-foreground truncate">{status.label}</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <span className="text-xs md:text-sm font-semibold text-card-foreground">{status.count}</span>
                <span className="text-[10px] md:text-xs text-muted-foreground">({status.percentage}%)</span>
              </div>
            </div>
            <div className="relative h-1.5 md:h-2 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${status.color}`}
                style={{ width: `${status.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
