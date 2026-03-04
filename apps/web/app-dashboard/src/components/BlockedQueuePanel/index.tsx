/**
 * BlockedQueuePanel Component
 *
 * Displays blocked stories with blocked_by reason and warning border.
 *
 * AC-3: blocked stories with blocked_by text; null blocked_by shown as 'Unknown'
 * AC-7: loading skeleton, error state with retry
 * AC-8: ARIA labels, table caption, aria-live region
 *
 * Story: APIP-2020
 */

import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { AlertTriangle } from 'lucide-react'
import type { BlockedStory } from '../../hooks/usePipelineMonitor'

// ============================================================================
// Zod Schemas
// ============================================================================

const BlockedQueuePanelPropsSchema = z.object({
  blockedQueue: z.array(
    z.object({
      story_id: z.string(),
      title: z.string(),
      state: z.string(),
      blocked_by: z.string().nullable(),
    }),
  ),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onRetry: z.function(),
})

export type BlockedQueuePanelProps = {
  blockedQueue: BlockedStory[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

// ============================================================================
// Component
// ============================================================================

/**
 * BlockedQueuePanel
 *
 * Renders blocked stories. Shows warning border when there are blocked items.
 * null blocked_by is shown as 'Unknown' (AC-3).
 */
export function BlockedQueuePanel({
  blockedQueue,
  isLoading,
  error,
  onRetry,
}: BlockedQueuePanelProps) {
  // Loading skeleton (AC-7)
  if (isLoading) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Blocked queue loading"
        aria-busy="true"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 flex-1 bg-muted animate-pulse rounded" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state (AC-7)
  if (error) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Blocked queue error"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Blocked Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div
            className="flex flex-col items-center gap-3 py-8 text-destructive"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-sm">{error}</p>
            <button
              onClick={onRetry}
              className="rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
              aria-label="Retry loading blocked queue"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state — no blocked stories (good!)
  if (blockedQueue.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Blocked queue">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Blocked Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-emerald-600 dark:text-emerald-400 text-sm">
            No stories are currently blocked
          </div>
        </CardContent>
      </Card>
    )
  }

  // Data state — warning border when blocked stories exist (AC-3, AC-8)
  return (
    <Card
      className="bg-card border-amber-400/50 dark:border-amber-500/40 dark:backdrop-blur-sm"
      aria-label={`Blocked queue: ${blockedQueue.length} blocked ${blockedQueue.length === 1 ? 'story' : 'stories'}`}
    >
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Blocked Queue
          <span className="ml-auto text-xs font-normal rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5">
            {blockedQueue.length} blocked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {/* aria-live region for updates (AC-8) */}
        <div aria-live="polite" aria-atomic="false">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-labelledby="blocked-queue-caption">
              <caption id="blocked-queue-caption" className="sr-only">
                Stories blocked by dependencies or other issues
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Story
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Title
                  </th>
                  <th scope="col" className="py-2 text-left font-medium">
                    Blocked By
                  </th>
                </tr>
              </thead>
              <tbody>
                {blockedQueue.map(story => (
                  <tr
                    key={story.story_id}
                    className="border-b border-border/50 hover:bg-amber-500/5 transition-colors"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {story.story_id}
                    </td>
                    <td className="py-2 pr-4 text-card-foreground max-w-xs truncate">
                      {story.title}
                    </td>
                    <td className="py-2">
                      {/* null blocked_by shown as 'Unknown' (AC-3) */}
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        {story.blocked_by ?? 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Validate props schema usage
export const _propsSchema = BlockedQueuePanelPropsSchema
