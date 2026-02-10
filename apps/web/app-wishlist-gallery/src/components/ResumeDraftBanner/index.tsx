/**
 * Resume Draft Banner Component
 *
 * Banner displayed when a draft is restored from localStorage.
 * Allows user to resume editing or start fresh.
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { Clock, X } from 'lucide-react'
import { Button, cn } from '@repo/app-component-library'
import { z } from 'zod'

const ResumeDraftBannerPropsSchema = z.object({
  timestamp: z.number().nullable(),
  onResume: z.function(z.tuple([]), z.void()),
  onDiscard: z.function(z.tuple([]), z.void()),
  className: z.string().optional(),
})

export type ResumeDraftBannerProps = z.infer<typeof ResumeDraftBannerPropsSchema>

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

export function ResumeDraftBanner({
  timestamp,
  onResume,
  onDiscard,
  className,
}: ResumeDraftBannerProps) {
  const timeAgo = timestamp ? formatRelativeTime(timestamp) : 'recently'

  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50 p-4',
        className,
      )}
      role="alert"
      aria-live="polite"
      data-testid="resume-draft-banner"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">Draft found</p>
          <p className="text-sm text-blue-700 mt-0.5">
            You have an unfinished draft from {timeAgo}. Would you like to continue?
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onDiscard} data-testid="start-fresh-button">
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          Start fresh
        </Button>
        <Button variant="default" size="sm" onClick={onResume} data-testid="resume-draft-button">
          Resume draft
        </Button>
      </div>
    </div>
  )
}
