"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/types"

interface StatsCardsProps {
  stats: DashboardStats
  isLoading?: boolean
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: "Total MOCs",
      value: stats.totalMocs,
    },
    {
      label: "Wishlist",
      value: stats.wishlistCount,
    },
    {
      label: "Themes",
      value: stats.themeCount,
    },
    {
      label: "Progress",
      value: `${stats.buildProgress}%`,
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center">
              <div className="h-10 md:h-12 w-20 bg-muted animate-pulse rounded" />
              <div className="h-3 w-14 bg-muted animate-pulse rounded mt-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="group bg-card border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:backdrop-blur-sm dark:hover:border-primary/20"
        >
          <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center text-center">
            <p className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              {card.value}
            </p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">
              {card.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
