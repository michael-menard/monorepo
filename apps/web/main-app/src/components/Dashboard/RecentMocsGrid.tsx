/**
 * Recent MOCs Grid Component
 * Story 2.6: Displays recent MOCs with thumbnails
 */

import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@repo/app-component-library'
import { Blocks, Clock } from 'lucide-react'
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
          <Link
            key={moc.id}
            to="/gallery/$mocId"
            params={{ mocId: moc.id }}
            className="flex-shrink-0"
          >
            <Card className="w-40 md:w-auto hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-3">
                {/* Thumbnail */}
                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                  {moc.thumbnail ? (
                    <img
                      src={moc.thumbnail}
                      alt={moc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                <p className="text-xs text-muted-foreground">{formatRelativeDate(moc.createdAt)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
