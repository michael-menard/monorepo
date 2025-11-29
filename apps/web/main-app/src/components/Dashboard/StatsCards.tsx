/**
 * Stats Cards Component
 * Story 2.5: Displays dashboard statistics as cards
 */

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Blocks, Heart, Palette } from 'lucide-react'
import type { DashboardStats } from '@repo/api-client/rtk/dashboard-api'

interface StatsCardsProps {
  stats: DashboardStats
}

/**
 * Displays dashboard statistics in a responsive grid of cards
 */
export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    {
      icon: Blocks,
      label: 'Total MOCs',
      value: stats.totalMocs,
      color: 'text-lego-red',
      bgColor: 'bg-lego-red/10',
    },
    {
      icon: Heart,
      label: 'Wishlist Items',
      value: stats.wishlistCount,
      color: 'text-lego-blue',
      bgColor: 'bg-lego-blue/10',
    },
    {
      icon: Palette,
      label: 'Themes',
      value: stats.themeCount,
      color: 'text-lego-yellow',
      bgColor: 'bg-lego-yellow/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => (
        <Card key={item.label} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <div className={`p-2 rounded-lg ${item.bgColor}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{item.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
