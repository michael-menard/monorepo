/**
 * Job Board — Kanban-style swim lanes
 *
 * Columns: Waiting | Active | Failed | Completed
 * Waiting column supports drag-and-drop reordering.
 */

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Badge, Button, cn } from '@repo/app-component-library'
import {
  useGetScrapeJobsQuery,
  useCancelScrapeJobMutation,
  useRetryScrapeJobMutation,
} from '@repo/api-client/rtk/scraper-api'
import type { ScrapeJob } from '@repo/api-client/schemas/scraper'

// ─────────────────────────────────────────────────────────────────────────
// Job Card
// ─────────────────────────────────────────────────────────────────────────

function getJobLabel(job: ScrapeJob): string {
  const data = job.data as Record<string, unknown>
  return (
    (data.itemNumber as string) || (data.catalogUrl as string) || (data.url as string) || job.type
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function JobCard({ job, isDraggable }: { job: ScrapeJob; isDraggable?: boolean }) {
  const [cancelJob, { isLoading: isCancelling }] = useCancelScrapeJobMutation()
  const [retryJob, { isLoading: isRetrying }] = useRetryScrapeJobMutation()

  return (
    <div className="bg-card border border-border rounded-md p-2 space-y-1 text-xs">
      <div className="flex items-center gap-1.5">
        {isDraggable && (
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab shrink-0" />
        )}
        <span className="font-medium truncate flex-1">{getJobLabel(job)}</span>
        <span className="text-muted-foreground shrink-0">{formatTime(job.createdAt)}</span>
      </div>

      {job.failedReason && <p className="text-red-500 truncate">{job.failedReason}</p>}

      <div className="flex justify-end gap-1">
        {job.status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
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
            className="h-6 px-1.5"
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
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sortable Job Card (for waiting lane)
// ─────────────────────────────────────────────────────────────────────────

function SortableJobCard({ job }: { job: ScrapeJob }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard job={job} isDraggable />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Swim Lane
// ─────────────────────────────────────────────────────────────────────────

const LANE_COLORS: Record<string, string> = {
  waiting: 'border-t-yellow-500',
  active: 'border-t-blue-500',
  failed: 'border-t-red-500',
  completed: 'border-t-green-500',
}

function SwimLane({
  title,
  status,
  jobs,
  sortable,
}: {
  title: string
  status: string
  jobs: ScrapeJob[]
  sortable?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border border-t-2 bg-muted/30 min-h-[200px]',
        LANE_COLORS[status],
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="outline" className="text-xs">
          {jobs.length}
        </Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[400px]">
        {sortable ? (
          <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
            {jobs.map(job => (
              <SortableJobCard key={job.id} job={job} />
            ))}
          </SortableContext>
        ) : (
          jobs.map(job => <JobCard key={job.id} job={job} />)
        )}
        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No jobs
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Job Board
// ─────────────────────────────────────────────────────────────────────────

export function JobBoard({ scraperType }: { scraperType: string }) {
  const { data } = useGetScrapeJobsQuery({ type: scraperType as any }, { pollingInterval: 5000 })

  const allJobs = data?.jobs ?? []

  // Group by status
  const [waitingJobs, setWaitingJobs] = useState<string[]>([])

  const waiting = allJobs
    .filter(j => j.status === 'waiting' || j.status === 'delayed')
    .sort((a, b) => {
      // Respect drag order if set, otherwise by created time
      const ai = waitingJobs.indexOf(a.id)
      const bi = waitingJobs.indexOf(b.id)
      if (ai >= 0 && bi >= 0) return ai - bi
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const active = allJobs.filter(j => j.status === 'active')
  const failed = allJobs.filter(j => j.status === 'failed')
  const completed = allJobs.filter(j => j.status === 'completed').slice(0, 20)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ids = waiting.map(j => j.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))

    if (oldIndex >= 0 && newIndex >= 0) {
      setWaitingJobs(arrayMove(ids, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-3">
        <SwimLane title="Waiting" status="waiting" jobs={waiting} sortable />
        <SwimLane title="Active" status="active" jobs={active} />
        <SwimLane title="Failed" status="failed" jobs={failed} />
        <SwimLane title="Completed" status="completed" jobs={completed} />
      </div>
    </DndContext>
  )
}
