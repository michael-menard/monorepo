import { RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../_primitives/card'
import { Button } from '../_primitives/button'
import { StatCards } from './StatCards'
import type { DashboardLayoutProps, ActivityListItem } from './__types__'

function CompactActivityItem({ item }: { item: ActivityListItem }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <RefreshCw className="h-3 w-3 text-primary" />
      <span className="flex-1 truncate text-foreground">{item.item}</span>
      <span className="text-xs text-muted-foreground">{item.time}</span>
    </div>
  )
}

export function DashboardLayout({
  stats,
  activity,
  activityTitle = 'Recent Activity',
  children,
}: DashboardLayoutProps) {
  return (
    <div data-slot="dashboard-layout" className="space-y-4">
      <StatCards items={stats} variant="basic" columns={4} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
        {children}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {activityTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((item, i) => (
              <CompactActivityItem key={i} item={item} />
            ))}
            <Button variant="link" size="sm" className="px-0 text-primary">
              View all
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
