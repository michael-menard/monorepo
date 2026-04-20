import { useState } from 'react'
import { Trash2, RefreshCw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Badge, Button, cn } from '@repo/app-component-library'
import {
  useGetScrapeJobsQuery,
  useCancelScrapeJobMutation,
  useRetryScrapeJobMutation,
} from '@repo/api-client/rtk/scraper-api'
import type { ScrapeJob } from '@repo/api-client/schemas/scraper'

const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  active: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  delayed: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
}

const TYPE_LABELS: Record<string, string> = {
  'bricklink-minifig': 'Minifig',
  'bricklink-catalog': 'Catalog',
  'bricklink-prices': 'Prices',
  'lego-set': 'LEGO Set',
  'rebrickable-set': 'RB Set',
  'rebrickable-mocs': 'MOC Pipeline',
}

function getJobLabel(job: ScrapeJob): string {
  const data = job.data as Record<string, unknown>
  return (
    (data.itemNumber as string) || (data.catalogUrl as string) || (data.url as string) || job.type
  )
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

function JobRow({ job }: { job: ScrapeJob }) {
  const [expanded, setExpanded] = useState(false)
  const [cancelJob, { isLoading: isCancelling }] = useCancelScrapeJobMutation()
  const [retryJob, { isLoading: isRetrying }] = useRetryScrapeJobMutation()

  const hasChildren = job.children && job.children.length > 0

  return (
    <>
      <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
        {/* Expand button for catalogs */}
        <div className="w-5 shrink-0">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Type badge */}
        <Badge variant="outline" className="text-xs shrink-0">
          {TYPE_LABELS[job.type] ?? job.type}
        </Badge>

        {/* Status badge */}
        <Badge className={cn('text-xs shrink-0', STATUS_COLORS[job.status] ?? '')}>
          {job.status}
        </Badge>

        {/* Job label */}
        <span className="text-sm truncate flex-1 min-w-0">{getJobLabel(job)}</span>

        {/* Time */}
        <span className="text-xs text-muted-foreground shrink-0">{formatTime(job.createdAt)}</span>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          {job.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => retryJob(job.id)}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
          {(job.status === 'waiting' || job.status === 'delayed') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelJob(job.id)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Failed reason */}
      {job.status === 'failed' && job.failedReason && (
        <div className="ml-8 px-3 py-1 text-xs text-red-500 truncate">{job.failedReason}</div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-6 border-l border-border pl-2">
          {job.children!.map(child => (
            <JobRow key={child.id} job={child} />
          ))}
        </div>
      )}
    </>
  )
}

export function JobList() {
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const { data, isLoading } = useGetScrapeJobsQuery(filter ? { status: filter } : undefined, {
    pollingInterval: 5000,
  })

  const jobs = data?.jobs ?? []

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {['all', 'active', 'waiting', 'completed', 'failed'].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s === 'all' ? undefined : s)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
              (s === 'all' && !filter) || s === filter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-input hover:bg-accent',
            )}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Job list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          No jobs {filter ? `with status "${filter}"` : ''}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map(job => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
