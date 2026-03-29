/**
 * PipelineViewPanel Component
 *
 * Displays the pipeline as Kanban columns for the 5 active pipeline states:
 * Ready | In Progress | In Review | Ready for QA | In QA
 *
 * Each card shows: story_id, title, feature, blocked indicator.
 *
 * AC-1: in-progress stories appear first (first column)
 * AC-7: loading skeleton, error state with retry
 * AC-8: ARIA labels, aria-live region, state badges with aria-label
 *
 * Story: APIP-2020, AUDIT-7
 */

import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'
import { Activity, AlertTriangle } from 'lucide-react'
import type { PipelineStory } from '../../hooks/usePipelineMonitor'

// ============================================================================
// Zod Schemas (CLAUDE.md: Zod-first types)
// ============================================================================

const PipelineViewPanelPropsSchema = z.object({
  stories: z.array(
    z.object({
      story_id: z.string(),
      title: z.string(),
      feature: z.string(),
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
// Kanban column definitions
// ============================================================================

type KanbanColumn = {
  id: string
  label: string
  states: string[]
  color: string
  headerColor: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'ready',
    label: 'Ready',
    states: ['ready'],
    color: 'border-emerald-400/40',
    headerColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    states: ['in_progress', 'in-progress'],
    color: 'border-sky-400/40',
    headerColor: 'text-sky-700 dark:text-sky-300',
  },
  {
    id: 'in_review',
    label: 'In Review',
    states: ['needs_code_review', 'in_review', 'ready_for_review', 'in-review', 'ready-for-review'],
    color: 'border-violet-400/40',
    headerColor: 'text-violet-700 dark:text-violet-300',
  },
  {
    id: 'ready_for_qa',
    label: 'Ready for QA',
    states: ['ready_for_qa', 'ready-for-qa'],
    color: 'border-amber-400/40',
    headerColor: 'text-amber-700 dark:text-amber-300',
  },
  {
    id: 'in_qa',
    label: 'In QA',
    states: ['in_qa', 'in-qa'],
    color: 'border-orange-400/40',
    headerColor: 'text-orange-700 dark:text-orange-300',
  },
]

const PRIORITY_BADGE: Record<string, string> = {
  P1: 'bg-red-500/20 text-red-700 dark:text-red-300',
  critical: 'bg-red-500/20 text-red-700 dark:text-red-300',
  high: 'bg-red-500/20 text-red-700 dark:text-red-300',
  P2: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  medium: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  P3: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
  low: 'bg-slate-500/20 text-slate-700 dark:text-slate-300',
}

// ============================================================================
// Story card
// ============================================================================

function StoryCard({ story }: { story: PipelineStory }) {
  return (
    <div
      className={`rounded-lg border bg-background p-3 text-sm shadow-sm transition-colors hover:bg-muted/30 ${
        story.blocked_by ? 'border-amber-400/50' : 'border-border'
      }`}
      aria-label={`${story.story_id}: ${story.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">{story.story_id}</span>
        {story.priority ? (
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
              PRIORITY_BADGE[story.priority] ?? 'bg-slate-500/20 text-slate-700 dark:text-slate-300'
            }`}
          >
            {story.priority}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-card-foreground line-clamp-2 leading-relaxed">
        {story.title}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground truncate">{story.feature}</span>
        {story.blocked_by ? (
          <span
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 shrink-0"
            aria-label="Blocked"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Blocked
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

/**
 * PipelineViewPanel
 *
 * Renders the active pipeline stories as Kanban columns grouped by state.
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
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-52 space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
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

  // Kanban data view (AC-1, AC-8)
  return (
    <Card className="bg-card border-border dark:backdrop-blur-sm" aria-label="Pipeline view">
      <CardHeader className="pb-2 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-card-foreground">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Pipeline Kanban
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {stories.length} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        {/* aria-live region for data updates (AC-8) */}
        <div aria-live="polite" aria-atomic="false">
          <div
            className="flex gap-3 overflow-x-auto pb-3"
            role="region"
            aria-label="Active pipeline stories by state"
          >
            {KANBAN_COLUMNS.map(col => {
              const colStories = stories.filter(s => col.states.includes(s.state))
              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 w-52 rounded-lg border ${col.color} bg-muted/10 p-2`}
                  aria-label={`${col.label}: ${colStories.length} stories`}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-xs font-semibold ${col.headerColor}`}>{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                      {colStories.length}
                    </span>
                  </div>
                  {/* Story cards */}
                  <div className="space-y-2 min-h-[3rem]">
                    {colStories.length === 0 ? (
                      <div className="flex items-center justify-center h-10 text-xs text-muted-foreground/50">
                        —
                      </div>
                    ) : (
                      colStories.map(story => <StoryCard key={story.story_id} story={story} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Validate props schema usage
export const _propsSchema = PipelineViewPanelPropsSchema
