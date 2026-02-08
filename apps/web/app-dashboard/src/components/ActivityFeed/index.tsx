/**
 * Activity Feed Component
 * Timeline of recent user activities
 */

import { Link } from '@tanstack/react-router'
import { Plus, Hammer, Heart, RefreshCw, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { formatDistanceToNow } from 'date-fns'
import type { ActivityItem, ActivityType } from '../../__types__'

interface ActivityFeedProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

const activityIcons: Record<ActivityType, typeof Plus> = {
  added: Plus,
  built: Hammer,
  wishlist: Heart,
  progress: RefreshCw,
}

const activityColors: Record<ActivityType, string> = {
  added: 'bg-sky-500/10 text-sky-500',
  built: 'bg-emerald-500/10 text-emerald-500',
  wishlist: 'bg-pink-500/10 text-pink-500',
  progress: 'bg-amber-500/10 text-amber-500',
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-32 md:w-36 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
            <Activity className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" aria-hidden="true" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No recent activity
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
          <Activity className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" aria-hidden="true" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="space-y-4" role="list" aria-label="Recent activity timeline">
          {activities.slice(0, 5).map(activity => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]

            return (
              <div key={activity.id} className="flex items-start gap-3" role="listitem">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${colorClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground truncate">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {activities.length > 5 && (
          <div className="mt-4 pt-3 border-t border-border">
            <Link
              to="/activity"
              className="text-sm text-primary hover:underline font-medium"
            >
              View all activity
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
