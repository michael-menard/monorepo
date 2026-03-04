/**
 * MonitorDashboardPage
 *
 * Composes PipelineViewPanel, CostPanel, BlockedQueuePanel via usePipelineMonitor.
 * Shows a live/polling status indicator.
 *
 * AC-5: polling status indicator showing last fetch time
 * AC-7: delegated to panel components
 * AC-8: page-level ARIA label, delegated to panels
 *
 * Story: APIP-2020
 */

import { z } from 'zod'
import { usePipelineMonitor } from '../hooks/usePipelineMonitor'
import { PipelineViewPanel } from '../components/PipelineViewPanel'
import { CostPanel } from '../components/CostPanel'
import { BlockedQueuePanel } from '../components/BlockedQueuePanel'

// ============================================================================
// Zod Schemas
// ============================================================================

const MonitorPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type MonitorPageProps = z.infer<typeof MonitorPagePropsSchema>

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

// ============================================================================
// Component
// ============================================================================

/**
 * MonitorDashboardPage
 *
 * The /monitor route page. Polls the pipeline API and renders all three panels.
 */
export function MonitorPage({ className }: MonitorPageProps) {
  const { data, isLoading, isStale, error, lastFetchedAt, refetch } = usePipelineMonitor()

  const handleRetry = () => {
    refetch()
  }

  return (
    <div className={className} aria-label="Pipeline monitor dashboard">
      {/* Page header with polling status indicator (AC-5) */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous pipeline visibility dashboard
          </p>
        </div>

        {/* Live/polling status indicator (AC-5: 'Data from Xs ago') */}
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-label="Data refresh status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isStale ? (
            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
              Stale data —
            </span>
          ) : null}
          {lastFetchedAt ? (
            <span className="text-xs">Data from {formatRelativeTime(lastFetchedAt)}</span>
          ) : isLoading ? (
            <span className="text-xs">Loading...</span>
          ) : null}
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isStale ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isStale ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-xs">{isStale ? 'Stale' : 'Live'}</span>
        </div>
      </div>

      {/* Dashboard panels */}
      <div className="space-y-6">
        {/* Pipeline View (AC-1: in-progress first) */}
        <section aria-label="Active pipeline stories">
          <PipelineViewPanel
            stories={data?.pipeline_view ?? []}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
          />
        </section>

        {/* Cost Panel and Blocked Queue side by side on larger screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Cost Summary (AC-2) */}
          <section aria-label="Token cost summary">
            <CostPanel
              costSummary={data?.cost_summary ?? []}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetry}
            />
          </section>

          {/* Blocked Queue (AC-3) */}
          <section aria-label="Blocked stories queue">
            <BlockedQueuePanel
              blockedQueue={data?.blocked_queue ?? []}
              isLoading={isLoading}
              error={error}
              onRetry={handleRetry}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export default MonitorPage
