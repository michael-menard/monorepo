/**
 * NeedsAttentionPanel Component
 *
 * Displays stories requiring human intervention before the pipeline can resume:
 * - failed_code_review: code review failed, needs developer action
 * - failed_qa: QA failed, needs developer/PM action
 * - blocked: manually blocked, needs blocker resolution
 *
 * Shows a destructive-colored border when items are present.
 *
 * Story: AUDIT-7
 */

import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { AlertCircle } from 'lucide-react'
import type { NeedsAttentionStory } from '../../hooks/usePipelineMonitor'

// ============================================================================
// Zod Schemas (CLAUDE.md: Zod-first types)
// ============================================================================

const NeedsAttentionPanelPropsSchema = z.object({
  items: z.array(
    z.object({
      story_id: z.string(),
      title: z.string(),
      feature: z.string(),
      state: z.string(),
      priority: z.string().nullable(),
      blocked_reason: z.string().nullable(),
      updated_at: z.string(),
    }),
  ),
  isLoading: z.boolean(),
  error: z.string().nullable(),
  onRetry: z.function(),
})

export type NeedsAttentionPanelProps = {
  items: NeedsAttentionStory[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

// ============================================================================
// State badge styling
// ============================================================================

const STATE_STYLES: Record<string, string> = {
  failed_qa: 'bg-red-500/20 text-red-700 dark:text-red-300',
  failed_code_review: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  blocked: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
}

const STATE_LABELS: Record<string, string> = {
  failed_qa: 'Failed QA',
  failed_code_review: 'Failed Review',
  blocked: 'Blocked',
}

function getStateStyle(state: string): string {
  return STATE_STYLES[state] ?? 'bg-gray-500/20 text-gray-700 dark:text-gray-300'
}

function getStateLabel(state: string): string {
  return STATE_LABELS[state] ?? state
}

// ============================================================================
// Component
// ============================================================================

/**
 * NeedsAttentionPanel
 *
 * Renders stories that require human action to resume the pipeline.
 */
export function NeedsAttentionPanel({
  items,
  isLoading,
  error,
  onRetry,
}: NeedsAttentionPanelProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Needs attention loading"
        aria-busy="true"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <div className="h-5 w-44 bg-muted animate-pulse rounded" />
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

  // Error state
  if (error) {
    return (
      <Card
        className="bg-card border-border dark:backdrop-blur-sm"
        aria-label="Needs attention error"
      >
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
            Needs Attention
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
              aria-label="Retry loading needs attention panel"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state — pipeline clear
  if (items.length === 0) {
    return (
      <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Needs attention">
        <CardHeader className="pb-2 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
            <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="flex items-center justify-center py-8 text-emerald-600 dark:text-emerald-400 text-sm">
            No stories require immediate attention
          </div>
        </CardContent>
      </Card>
    )
  }

  // Data state — destructive border when human action needed
  return (
    <Card
      className="bg-card border-red-400/50 dark:border-red-500/40 dark:backdrop-blur-sm"
      aria-label={`Needs attention: ${items.length} ${items.length === 1 ? 'story' : 'stories'} require action`}
    >
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          Needs Attention
          <span className="ml-auto text-xs font-normal rounded-full bg-red-500/20 text-red-700 dark:text-red-300 px-2 py-0.5">
            {items.length} {items.length === 1 ? 'story' : 'stories'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <div aria-live="polite" aria-atomic="false">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-labelledby="needs-attention-caption">
              <caption id="needs-attention-caption" className="sr-only">
                Stories requiring human intervention to resume the pipeline
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
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map(story => (
                  <tr
                    key={story.story_id}
                    className="border-b border-border/50 hover:bg-red-500/5 transition-colors"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {story.story_id}
                    </td>
                    <td className="py-2 pr-4 text-card-foreground max-w-xs truncate">
                      {story.title}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStateStyle(story.state)}`}
                        aria-label={`State: ${getStateLabel(story.state)}`}
                      >
                        {getStateLabel(story.state)}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground max-w-xs truncate">
                      {story.blocked_reason ?? '—'}
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
export const _propsSchema = NeedsAttentionPanelPropsSchema
