/**
 * Job Board — Kanban-style swim lanes
 *
 * Columns: Waiting | Active | Failed | Completed
 * Waiting column supports drag-and-drop reordering.
 */

import { useState, useEffect } from 'react'
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
import { GripVertical, RefreshCw, Trash2, Loader2, Pause, Play } from 'lucide-react'
import { Badge, Button, cn } from '@repo/app-component-library'
import {
  useGetScrapeJobsQuery,
  useGetQueueHealthQuery,
  useCancelScrapeJobMutation,
  useClearJobsByStatusMutation,
  useRetryScrapeJobMutation,
  usePauseQueueMutation,
  useResumeQueueMutation,
} from '@repo/api-client/rtk/scraper-api'
import type { ScrapeJob } from '@repo/api-client/schemas/scraper'

// ─────────────────────────────────────────────────────────────────────────
// Job Card
// ─────────────────────────────────────────────────────────────────────────

const TYPE_SHORT: Record<string, string> = {
  'bricklink-minifig': 'BL',
  'bricklink-catalog': 'BL Cat',
  'bricklink-prices': 'BL $',
  'lego-set': 'LEGO',
  'rebrickable-set': 'RB Set',
  'rebrickable-mocs': 'RB MOCs',
  'rebrickable-moc-single': 'RB MOC',
}

function getJobLabel(job: ScrapeJob): string {
  const data = job.data as Record<string, unknown>
  const detail =
    (data.mocNumber as string) ||
    (data.itemNumber as string) ||
    (data.catalogUrl as string) ||
    (data.url as string) ||
    ''
  const prefix = TYPE_SHORT[job.type] || job.type
  return detail ? `${prefix} · ${detail}` : prefix
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

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const remainS = s % 60
  if (m < 60) return `${m}m ${remainS}s`
  const h = Math.floor(m / 60)
  const remainM = m % 60
  return `${h}h ${remainM}m`
}

function useElapsedTime(startIso: string | null | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active || !startIso) return
    const start = new Date(startIso).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso, active])
  return elapsed
}

function getProgressMessage(progress: unknown): string | null {
  if (!progress) return null
  if (typeof progress === 'string') return progress
  if (typeof progress === 'object' && progress !== null) {
    const p = progress as Record<string, unknown>
    if (p.message) return String(p.message)
    if (p.stage) return String(p.stage)
    if (typeof p.percent === 'number') return `${Math.round(p.percent)}%`
  }
  if (typeof progress === 'number') return `${Math.round(progress)}%`
  return null
}

function ActiveCardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes gradient-shift {
          0% { border-color: #3b82f6; box-shadow: 0 0 6px #3b82f640; }
          33% { border-color: #06b6d4; box-shadow: 0 0 6px #06b6d440; }
          66% { border-color: #8b5cf6; box-shadow: 0 0 6px #8b5cf640; }
          100% { border-color: #3b82f6; box-shadow: 0 0 6px #3b82f640; }
        }
        .active-card-border {
          border: 1.5px solid #3b82f6;
          animation: gradient-shift 3s ease-in-out infinite;
        }
      `}</style>
      <div className="active-card-border rounded-md p-2 bg-card">{children}</div>
    </>
  )
}

function JobCard({ job, isDraggable }: { job: ScrapeJob; isDraggable?: boolean }) {
  const [cancelJob, { isLoading: isCancelling }] = useCancelScrapeJobMutation()
  const [retryJob, { isLoading: isRetrying }] = useRetryScrapeJobMutation()
  const isActive = job.status === 'active'
  const elapsed = useElapsedTime(job.processedAt, isActive)
  const progressMsg = getProgressMessage(job.progress)

  const card = (
    <div
      className={cn(
        'rounded-md space-y-1 text-xs',
        isActive ? 'bg-transparent' : 'bg-card border border-border p-2',
      )}
    >
      <div className="flex items-center gap-1.5">
        {isDraggable && (
          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab shrink-0" />
        )}
        {isActive && <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />}
        <span className="font-medium truncate flex-1">{getJobLabel(job)}</span>
        <span className="text-muted-foreground shrink-0">
          {isActive ? formatElapsed(elapsed) : formatTime(job.createdAt)}
        </span>
      </div>

      {isActive && progressMsg && <p className="text-blue-600 truncate">{progressMsg}</p>}

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
      </div>
    </div>
  )

  return isActive ? <ActiveCardWrapper>{card}</ActiveCardWrapper> : card
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
  const [clearJobs, { isLoading: isClearing }] = useClearJobsByStatusMutation()

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border border-t-2 bg-muted/30 min-h-[200px]',
        LANE_COLORS[status],
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-1.5">
          {jobs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-muted-foreground hover:text-destructive"
              onClick={() => clearJobs(status)}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
          <Badge variant="outline" className="text-xs">
            {jobs.length}
          </Badge>
        </div>
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

export function JobBoard({ scraperType }: { scraperType?: string } = {}) {
  const queryParams = scraperType ? { type: scraperType as any } : undefined
  const { data } = useGetScrapeJobsQuery(queryParams, { pollingInterval: 5000 })
  const { data: healthData } = useGetQueueHealthQuery(undefined, { pollingInterval: 10000 })
  const [pauseQueue, { isLoading: isPausing }] = usePauseQueueMutation()
  const [resumeQueue, { isLoading: isResuming }] = useResumeQueueMutation()

  const queue = scraperType ? healthData?.queues.find(q => q.name === scraperType) : undefined
  const isPaused = queue?.isPaused ?? false

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
    <div className="space-y-2">
      {/* Per-queue pause control (only when viewing a specific queue) */}
      {scraperType && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isPaused && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-3 py-1.5 text-xs">
                Queue paused — jobs will not be processed
              </div>
            )}
          </div>
          <Button
            variant={isPaused ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs ml-2"
            onClick={() => (isPaused ? resumeQueue(scraperType) : pauseQueue(scraperType))}
            disabled={isPausing || isResuming}
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            )}
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-3">
          <SwimLane title="Waiting" status="waiting" jobs={waiting} sortable />
          <SwimLane title="Active" status="active" jobs={active} />
          <SwimLane title="Failed" status="failed" jobs={failed} />
          <SwimLane title="Completed" status="completed" jobs={completed} />
        </div>
      </DndContext>
    </div>
  )
}
