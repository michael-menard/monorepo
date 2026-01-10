/**
 * Recent MOCs Grid Component
 * Story 2.6: Displays recent MOCs with thumbnails
 * Story 3.1.39: Added edit link for My MOCs (AC: 3)
 */

import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@repo/app-component-library'
import { Blocks, Clock, Pencil } from 'lucide-react'
import type { RecentMoc } from '@repo/api-client/rtk/dashboard-api'

interface RecentMocsGridProps {
  mocs: RecentMoc[]
}

/**
 * Format relative date (e.g., "2 days ago")
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

/**
 * Displays recent MOCs in a responsive grid with thumbnails
 */
export function RecentMocsGrid({ mocs }: RecentMocsGridProps) {
  if (mocs.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        Recent MOCs
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
        {mocs.map(moc => (
          <div key={moc.id} className="flex-shrink-0 relative">
            <Link to="/gallery/$mocId" params={{ mocId: moc.id }}>
              <Card className="w-40 md:w-auto bg-card/80 dark:bg-surface backdrop-blur-sm border border-border dark:border-surface-border hover:border-primary/50 dark:hover:border-glow-primary hover:shadow-md dark:hover:shadow-glow-primary transition-all duration-200 cursor-pointer group">
                <CardContent className="p-3">
                  {/* Thumbnail */}
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted dark:bg-surface-light/30 mb-2 relative">
                    {moc.thumbnail ? (
                      <img
                        src={moc.thumbnail}
                        alt={moc.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Blocks className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <p className="font-medium truncate text-sm">{moc.title}</p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(moc.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
            {/* Story 3.1.39: Edit button overlay (AC: 3) - outside Link to avoid nesting */}
            {moc.slug ? (
              <Link
                to="/mocs/$slug/edit"
                params={{ slug: moc.slug }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-background/80 dark:bg-surface/80 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary hover:text-primary-foreground z-10"
                aria-label={`Edit ${moc.title}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
