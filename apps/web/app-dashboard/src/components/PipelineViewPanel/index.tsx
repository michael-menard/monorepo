/**
 * PipelineViewPanel Component
 *
 * Displays the pipeline stories table with state badges, loading skeleton,
 * error state (retry button), and empty state.
 *
 * AC-1: in-progress stories appear first (order from API)
 * AC-7: loading skeleton, error state with retry
 * AC-8: ARIA labels, table caption, aria-live region, state badges with aria-label
 *
 * Story: APIP-2020
 */

import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { Activity } from 'lucide-react'
import type { PipelineStory } from '../../hooks/usePipelineMonitor'

// ============================================================================
// Zod Schemas (CLAUDE.md: Zod-first types)
// ============================================================================

const PipelineViewPanelPropsSchema = z.object({
  stories: z.array(
    z.object({
      story_id: z.string(),
      title: z.string(),
      state: z.string(),
      priority: z.string().nullable(),
      blocked_by: z.string().nullable(),
      updated_at: z.string(),
    }),
  ),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onRetry: z.function(),
})

export type PipelineViewPanelProps = {
  stories: PipelineStory[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

// ============================================================================
// State badge colors (AC-8: color-coded state badges)
// ============================================================================

const STATE_COLORS: Record<string, string> = {
  'in-progress': 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  'ready-to-work': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'ready-for-qa': 'bg-violet-500/20 text-violet-700 dark:text-violet-300',
  uat: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  backlog: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  draft: 'bg-zinc-500/20 text-zinc-700 dark:text-zinc-300',
}

function getStateColor(state: string): string {
  return STATE_COLORS[state] ?? 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
}

// ============================================================================
// Component
// ============================================================================

/**
 * PipelineViewPanel
 *
 * Renders the active pipeline stories sorted in-progress first.
 */
export function PipelineViewPanel({ stories, isLoading, error, onRetry }: PipelineViewPanelProps) {
  // Loading skeleton (AC-7)
  if (isLoading) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Pipeline view loading"
        aria-busy="true"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
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
        aria-label="Pipeline view error"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Pipeline View
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
              aria-label="Retry loading pipeline view"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (stories.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Pipeline view">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Pipeline View
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No active stories in pipeline
          </div>
        </CardContent>
      </Card>
    )
  }

  // Data state (AC-1, AC-8)
  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Pipeline view">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Pipeline View
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {/* aria-live region for data updates (AC-8) */}
        <div aria-live="polite" aria-atomic="false">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-labelledby="pipeline-view-caption">
              <caption id="pipeline-view-caption" className="sr-only">
                Active pipeline stories sorted by state: in-progress first
              </caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Story
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    Title
                  </th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">
                    State
                  </th>
                  <th scope="col" className="py-2 text-left font-medium">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {stories.map(story => (
                  <tr
                    key={story.story_id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {story.story_id}
                    </td>
                    <td className="py-2 pr-4 text-card-foreground max-w-xs truncate">
                      {story.title}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStateColor(story.state)}`}
                        aria-label={`State: ${story.state}`}
                      >
                        {story.state}
                      </span>
                    </td>
                    <td className="py-2">
                      {story.priority ? (
                        <span className="text-xs text-muted-foreground uppercase">
                          {story.priority}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
export const _propsSchema = PipelineViewPanelPropsSchema
