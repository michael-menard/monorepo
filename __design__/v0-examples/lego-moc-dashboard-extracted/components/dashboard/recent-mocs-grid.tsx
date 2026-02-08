"use client"

import { Clock, Blocks, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { RecentMoc } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface RecentMocsGridProps {
  mocs: RecentMoc[]
  isLoading?: boolean
}

export function RecentMocsGrid({ mocs, isLoading }: RecentMocsGridProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 md:h-6 w-28 md:w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={i >= 2 ? "hidden sm:block" : i >= 3 ? "hidden md:block" : ""}>
                <div className="aspect-square bg-muted animate-pulse rounded-lg" />
                <div className="mt-2 h-3 md:h-4 w-full bg-muted animate-pulse rounded" />
                <div className="mt-1 h-2.5 md:h-3 w-12 md:w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mocs.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
            <Clock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" aria-hidden="true" />
            Recent MOCs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
            <Blocks className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" aria-hidden="true" />
            <p className="text-sm md:text-base text-muted-foreground">Start adding MOCs to see your collection!</p>
            <Button className="mt-3 md:mt-4 text-sm bg-primary text-primary-foreground hover:bg-primary/90">
              Add Your First MOC
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm dark:hover:border-primary/30 transition-all duration-200">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg font-semibold text-card-foreground">
          <Clock className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" aria-hidden="true" />
          Recent MOCs
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {mocs.map((moc) => (
            <div
              key={moc.id}
              className="group relative cursor-pointer"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border transition-all duration-200 group-hover:border-primary/50 dark:group-hover:shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                {moc.thumbnail ? (
                  <img
                    src={moc.thumbnail || "/placeholder.svg"}
                    alt={moc.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Blocks className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1.5 right-1.5 md:top-2 md:right-2 h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur-sm"
                  aria-label={`Edit ${moc.title}`}
                >
                  <Pencil className="h-3 w-3 md:h-3.5 md:w-3.5" />
                </Button>
              </div>
              <h3 className="mt-1.5 md:mt-2 text-xs md:text-sm font-medium text-card-foreground truncate">{moc.title}</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(moc.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
