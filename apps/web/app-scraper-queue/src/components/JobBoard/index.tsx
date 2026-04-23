/**
 * Job Board — Kanban-style swim lanes
 *
 * Columns: Waiting | Active | Failed | Completed
 * Waiting column supports drag-and-drop reordering.
 * Failed jobs can be dragged to the Waiting lane to retry (cards part to make room).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
  pointerWithin,
  rectIntersection,
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

function JobCard({
  job,
  isDraggable,
  activatorRef,
  dragListeners,
}: {
  job: ScrapeJob
  isDraggable?: boolean
  activatorRef?: (node: HTMLElement | null) => void
  dragListeners?: Record<string, unknown>
}) {
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
          <span ref={activatorRef} className="flex shrink-0" {...dragListeners}>
            <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          </span>
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
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
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
// Sortable Job Card (for waiting + failed lanes)
// ─────────────────────────────────────────────────────────────────────────

function SortableJobCard({ job, sortableId }: { job: ScrapeJob; sortableId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: { job },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <JobCard job={job} isDraggable activatorRef={setActivatorNodeRef} dragListeners={listeners} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Droppable Lane Wrapper (makes empty lanes a valid drop target)
// ─────────────────────────────────────────────────────────────────────────

function DroppableLane({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="min-h-[40px]">
      {children}
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

const PAGE_SIZE = 20

function SwimLane({
  title,
  status,
  jobs,
  sortableIds,
  isDropTarget,
}: {
  title: string
  status: string
  jobs: ScrapeJob[]
  sortableIds?: string[]
  isDropTarget?: boolean
}) {
  const [clearJobs, { isLoading: isClearing }] = useClearJobsByStatusMutation()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const visibleJobs = jobs.slice(0, visibleCount)
  const visibleSortableIds = sortableIds?.slice(0, visibleCount)
  const hasMore = visibleCount < jobs.length

  useEffect(() => {
    if (jobs.length <= PAGE_SIZE) setVisibleCount(PAGE_SIZE)
  }, [jobs.length])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, jobs.length))
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, jobs.length])

  const isSortable = !!sortableIds

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border border-t-2 bg-muted/30 min-h-0 transition-colors',
        LANE_COLORS[status],
        isDropTarget && 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium">
          {title}
          {isDropTarget && (
            <span className="ml-1.5 text-xs text-blue-500 font-normal">Drop to retry</span>
          )}
        </span>
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
      <div ref={scrollRef} className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
        {isSortable ? (
          <DroppableLane id={`lane:${status}`}>
            <SortableContext items={visibleSortableIds!} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {visibleJobs.map((job, i) => (
                  <SortableJobCard
                    key={visibleSortableIds![i]}
                    job={job}
                    sortableId={visibleSortableIds![i]}
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableLane>
        ) : (
          visibleJobs.map(job => <JobCard key={job.id} job={job} />)
        )}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
        {jobs.length === 0 && !isSortable && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No jobs
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers: find which container a sortable ID belongs to
// ─────────────────────────────────────────────────────────────────────────

function findContainer(
  id: string,
  waitingIds: string[],
  failedIds: string[],
): 'waiting' | 'failed' | null {
  if (waitingIds.includes(id)) return 'waiting'
  if (failedIds.includes(id)) return 'failed'
  // Check lane droppable IDs
  if (id === 'lane:waiting') return 'waiting'
  if (id === 'lane:failed') return 'failed'
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Job Board
// ─────────────────────────────────────────────────────────────────────────

export function JobBoard({ scraperType }: { scraperType?: string } = {}) {
  const queryParams = scraperType ? { type: scraperType as any } : undefined
  const { data } = useGetScrapeJobsQuery(queryParams, { pollingInterval: 3000 })
  const { data: healthData } = useGetQueueHealthQuery(undefined, { pollingInterval: 10000 })
  const [pauseQueue, { isLoading: isPausing }] = usePauseQueueMutation()
  const [resumeQueue, { isLoading: isResuming }] = useResumeQueueMutation()
  const [retryJob] = useRetryScrapeJobMutation()

  const queue = scraperType ? healthData?.queues.find(q => q.name === scraperType) : undefined
  const isPaused = queue?.isPaused ?? false

  const allJobs = data?.jobs ?? []

  // Group by status
  const [waitingOrder, setWaitingOrder] = useState<string[]>([])

  const jobKey = (j: ScrapeJob) => `${j.type}:${j.id}`

  const waiting = allJobs
    .filter(j => j.status === 'waiting' || j.status === 'delayed')
    .sort((a, b) => {
      const ai = waitingOrder.indexOf(jobKey(a))
      const bi = waitingOrder.indexOf(jobKey(b))
      if (ai >= 0 && bi >= 0) return ai - bi
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const active = allJobs.filter(j => j.status === 'active')
  const failed = allJobs.filter(j => j.status === 'failed')
  const completed = allJobs.filter(j => j.status === 'completed')

  // Unique sortable IDs: type:id to avoid collisions across queues
  // Failed lane adds "failed:" prefix for container detection
  const waitingSortableIds = waiting.map(jobKey)
  const failedSortableIds = failed.map(j => `failed:${jobKey(j)}`)

  // Reverse lookup: sortable ID → job
  const sortableIdToJob = new Map<string, ScrapeJob>()
  for (const j of waiting) sortableIdToJob.set(jobKey(j), j)
  for (const j of failed) sortableIdToJob.set(`failed:${jobKey(j)}`, j)

  // Drag state
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [overContainer, setOverContainer] = useState<string | null>(null)
  const activeJob = activeJobId ? (sortableIdToJob.get(activeJobId) ?? null) : null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Collision detection: use closestCenter for within-container,
  // but also check lane droppables for cross-container moves
  const collisionDetection: CollisionDetection = useCallback(args => {
    // First check if pointer is within a lane droppable
    const pointerCollisions = pointerWithin(args)
    const laneHit = pointerCollisions.find(c => String(c.id).startsWith('lane:'))

    // Then get closest sortable items
    const centerCollisions = closestCenter(args)

    // If we have a lane hit, prefer sortable items within that lane,
    // but fall back to the lane itself (for empty lanes)
    if (laneHit) {
      if (centerCollisions.length > 0) return centerCollisions
      return [laneHit]
    }

    return centerCollisions
  }, [])

  function handleDragStart(event: DragStartEvent) {
    setActiveJobId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active: dragActive, over } = event
    if (!over) {
      setOverContainer(null)
      return
    }

    const activeId = String(dragActive.id)
    const overId = String(over.id)

    const from = findContainer(activeId, waitingSortableIds, failedSortableIds)
    const to = findContainer(overId, waitingSortableIds, failedSortableIds)

    // Show drop highlight when failed card is over waiting lane
    if (from === 'failed' && to === 'waiting') {
      setOverContainer('waiting')
    } else {
      setOverContainer(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragActive, over } = event
    setActiveJobId(null)
    setOverContainer(null)

    if (!over) return

    const activeId = String(dragActive.id)
    const overId = String(over.id)

    const from = findContainer(activeId, waitingSortableIds, failedSortableIds)
    const to = findContainer(overId, waitingSortableIds, failedSortableIds)

    // Cross-lane: failed → waiting = retry
    if (from === 'failed' && to === 'waiting') {
      const job = sortableIdToJob.get(activeId)
      if (job) retryJob(job.id)
      return
    }

    // Same-lane reorder within waiting
    if (from === 'waiting' && to === 'waiting' && activeId !== overId) {
      const ids = waitingSortableIds
      const oldIndex = ids.indexOf(activeId)
      const newIndex = ids.indexOf(overId)

      if (oldIndex >= 0 && newIndex >= 0) {
        setWaitingOrder(arrayMove(ids, oldIndex, newIndex))
      }
    }
  }

  function handleDragCancel() {
    setActiveJobId(null)
    setOverContainer(null)
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {scraperType && (
        <div className="flex items-center justify-between shrink-0">
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

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
          <SwimLane
            title="Waiting"
            status="waiting"
            jobs={waiting}
            sortableIds={waitingSortableIds}
            isDropTarget={overContainer === 'waiting'}
          />
          <SwimLane title="Active" status="active" jobs={active} />
          <SwimLane title="Failed" status="failed" jobs={failed} sortableIds={failedSortableIds} />
          <SwimLane title="Completed" status="completed" jobs={completed} />
        </div>
        <DragOverlay>
          {activeJob ? (
            <div className="opacity-90 rotate-2 scale-105">
              <JobCard job={activeJob} isDraggable />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
