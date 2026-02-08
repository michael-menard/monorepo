"use client"

import { Plus, CheckCircle2, Heart, TrendingUp, ExternalLink } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ActivityItem } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface ActivityFeedProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

const activityIcons = {
  added: Plus,
  built: CheckCircle2,
  wishlist: Heart,
  progress: TrendingUp,
}

const activityColors = {
  added: "bg-[#0055BF]/10 text-[#0055BF] dark:bg-[#3b82f6]/10 dark:text-[#3b82f6]",
  built: "bg-[#2D5F4F]/10 text-[#2D5F4F] dark:bg-[#10b981]/10 dark:text-[#10b981]",
  wishlist: "bg-[#E3000B]/10 text-[#E3000B] dark:bg-[#ff3b3b]/10 dark:text-[#ff3b3b]",
  progress: "bg-[#D4A574]/10 text-[#D4A574] dark:bg-[#f59e0b]/10 dark:text-[#f59e0b]",
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-2 md:gap-3">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <div className="h-3 md:h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-2.5 md:h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="text-base md:text-lg font-semibold text-card-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="relative space-y-3 md:space-y-4">
          <div className="absolute left-3.5 md:left-4 top-2 bottom-2 w-px bg-border" aria-hidden="true" />
          
          {activities.slice(0, 5).map((activity) => {
            const Icon = activityIcons[activity.type]
            return (
              <div key={activity.id} className="relative flex items-start gap-3 md:gap-4 pl-0">
                <div className={`relative z-10 flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center rounded-full ${activityColors[activity.type]}`}>
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs md:text-sm text-card-foreground leading-relaxed">{activity.message}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-3 md:pt-4 px-4 md:px-6">
        <Button 
          variant="ghost" 
          className="ml-auto gap-1 text-xs md:text-sm text-primary hover:text-primary/80 hover:bg-primary/10"
        >
          View All
          <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}
