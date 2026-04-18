/**
 * HealthPage
 *
 * Displays the notifications server health status.
 * Polls GET /health on a configurable interval.
 *
 * Story: NOTI-0130
 */

import { z } from 'zod'
import { useHealthMonitor } from '../hooks/useHealthMonitor'

// ============================================================================
// Schemas
// ============================================================================

const HealthPagePropsSchema = z.object({
  className: z.string().optional(),
})

export type HealthPageProps = z.infer<typeof HealthPagePropsSchema>

// ============================================================================
// Helpers
// ============================================================================

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

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

export function HealthPage({ className }: HealthPageProps) {
  const { data, isLoading, isStale, error, lastFetchedAt, refetch } = useHealthMonitor()

  const isHealthy = data?.status === 'healthy'

  return (
    <div className={className} aria-label="Notifications server health dashboard">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live status of the notifications server
          </p>
        </div>

        {/* Polling status indicator */}
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          aria-label="Data refresh status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isStale && (
            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
              Stale data —
            </span>
          )}
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

      {/* Error state */}
      {error && !data && (
        <div
          className="rounded-md bg-destructive/10 border border-destructive/30 p-4 mb-6"
          role="alert"
        >
          <p className="text-sm text-destructive font-medium">Unable to reach health endpoint</p>
          <p className="text-xs text-destructive/80 mt-1">{error.message}</p>
          <button className="mt-2 text-xs underline text-destructive" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading health data">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-48 rounded-lg bg-muted" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Status + Uptime */}
          <section
            className="rounded-lg border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            aria-label="Server status"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  isHealthy
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                }`}
                aria-label={`Server status: ${data.status}`}
              >
                {isHealthy ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Uptime:{' '}
              <span className="font-medium text-foreground">{formatUptime(data.uptime)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Database:{' '}
              <span
                className={`font-medium ${data.db === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
              >
                {data.db}
              </span>
            </div>
          </section>

          {/* Redis */}
          <section className="rounded-lg border bg-card p-5" aria-label="Redis status">
            <h2 className="text-base font-semibold text-foreground mb-3">Redis</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Connection: </span>
                <span
                  className={`font-medium ${data.redis.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                  aria-label={`Redis ${data.redis.connected ? 'connected' : 'disconnected'}`}
                >
                  {data.redis.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Latency: </span>
                <span
                  className="font-medium text-foreground"
                  aria-label={`Redis latency ${data.redis.latencyMs} milliseconds`}
                >
                  {data.redis.latencyMs} ms
                </span>
              </div>
            </div>
          </section>

          {/* Channels */}
          <section className="rounded-lg border bg-card p-5" aria-label="Active channels">
            <h2 className="text-base font-semibold text-foreground mb-3">
              Active Channels
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.channels.length})
              </span>
            </h2>

            {data.channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active channels</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Channel metrics">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-6 font-medium">Channel</th>
                      <th className="pb-2 pr-6 font-medium text-right">Subscribers</th>
                      <th className="pb-2 font-medium text-right">Events (buffered)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels.map(ch => (
                      <tr key={ch.name} className="border-b last:border-0">
                        <td className="py-2 pr-6 font-mono text-foreground">{ch.name}</td>
                        <td className="py-2 pr-6 text-right tabular-nums">{ch.subscribers}</td>
                        <td className="py-2 text-right tabular-nums">{ch.eventCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default HealthPage
