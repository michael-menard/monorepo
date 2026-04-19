import { Plus, RefreshCw, Heart, Upload, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@repo/app-component-library'
import { formatDistanceToNow } from 'date-fns'
import type { ActivityEvent } from '../../__types__'

interface ProfileActivityProps {
  activities: ActivityEvent[]
  isLoading?: boolean
  total?: number
  onLoadMore?: () => void
}

const activityIcons: Record<string, typeof Plus> = {
  added: Plus,
  progress: RefreshCw,
  wishlist_add: Heart,
  instruction_upload: Upload,
}

const activityColors: Record<string, string> = {
  added: 'bg-sky-500/10 text-sky-500',
  progress: 'bg-amber-500/10 text-amber-500',
  wishlist_add: 'bg-pink-500/10 text-pink-500',
  instruction_upload: 'bg-emerald-500/10 text-emerald-500',
}

export function ProfileActivity({
  activities,
  isLoading,
  total,
  onLoadMore,
}: ProfileActivityProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
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
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No recent activity
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Recent Activity
          {total !== undefined && total > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({total})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" role="list" aria-label="Recent activity timeline">
          {activities.map(activity => {
            const Icon = activityIcons[activity.type] ?? Activity
            const colorClass = activityColors[activity.type] ?? 'bg-muted text-muted-foreground'

            return (
              <div key={activity.id} className="flex items-start gap-3" role="listitem">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${colorClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground">{activity.title}</p>
                  {activity.message && (
                    <p className="text-xs text-muted-foreground truncate">{activity.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {total !== undefined && total > activities.length && onLoadMore && (
          <div className="mt-4 pt-3 border-t border-border">
            <button
              onClick={onLoadMore}
              className="text-sm text-primary hover:underline font-medium"
            >
              View more activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
