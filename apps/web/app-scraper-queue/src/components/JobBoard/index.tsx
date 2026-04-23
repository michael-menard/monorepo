/**
 * Job Board — Kanban-style swim lanes
 *
 * Columns: Waiting | Active | Failed | Completed
 * Waiting column supports drag-and-drop reordering.
 * Failed jobs can be dragged to the Waiting lane to retry (cards part to make room).
 * Click cards to select, then bulk delete/retry from the action bar.
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
import {
  GripVertical,
  RefreshCw,
  Trash2,
  Loader2,
  Pause,
  Play,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
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
  onDelete,
  onRetry,
  isSelected,
  onToggleSelect,
}: {
  job: ScrapeJob
  isDraggable?: boolean
  activatorRef?: (node: HTMLElement | null) => void
  dragListeners?: Record<string, unknown>
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const isActive = job.status === 'active'
  const elapsed = useElapsedTime(job.processedAt, isActive)
  const progressMsg = getProgressMessage(job.progress)

  const card = (
    <div
      className={cn(
        'rounded-md space-y-1 text-xs cursor-pointer',
        isActive ? 'bg-transparent' : 'bg-card border p-2',
        isSelected ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border',
      )}
      onClick={() => onToggleSelect?.(job.id)}
    >
      <div className="flex items-center gap-1.5">
        {isDraggable && (
          <span
            ref={activatorRef}
            className="flex shrink-0"
            {...dragListeners}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
          </span>
        )}
        {onToggleSelect && (
          <span className="shrink-0">
            {isSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
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
        {job.status === 'failed' && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onRetry(job.id)
            }}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onDelete(job.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )

  return isActive ? <ActiveCardWrapper>{card}</ActiveCardWrapper> : card
}

// ─────────────────────────────────────────────────────────────────────────
// Sortable Job Card (for waiting + failed lanes)
// ─────────────────────────────────────────────────────────────────────────

function SortableJobCard({
  job,
  sortableId,
  onDelete,
  onRetry,
  isSelected,
  onToggleSelect,
}: {
  job: ScrapeJob
  sortableId: string
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const { listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sortableId,
      data: { job },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} role="listitem">
      <JobCard
        job={job}
        isDraggable
        activatorRef={setActivatorNodeRef}
        dragListeners={listeners}
        onDelete={onDelete}
        onRetry={onRetry}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
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
  onDelete,
  onRetry,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: {
  title: string
  status: string
  jobs: ScrapeJob[]
  sortableIds?: string[]
  isDropTarget?: boolean
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll?: (jobIds: string[]) => void
}) {
  const [clearJobs, { isLoading: isClearing }] = useClearJobsByStatusMutation()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const visibleJobs = jobs.slice(0, visibleCount)
  const visibleSortableIds = sortableIds?.slice(0, visibleCount)
  const hasMore = visibleCount < jobs.length

  const laneJobIds = jobs.map(j => j.id)
  const selectedInLane = laneJobIds.filter(id => selectedIds.has(id))
  const allSelected = jobs.length > 0 && selectedInLane.length === jobs.length

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
        <span className="text-sm font-medium flex items-center gap-1.5">
          {jobs.length > 0 && onSelectAll && (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onSelectAll(allSelected ? [] : laneJobIds)}
            >
              {allSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
            </button>
          )}
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
                    onDelete={onDelete}
                    onRetry={onRetry}
                    isSelected={selectedIds.has(job.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </div>
            </SortableContext>
          </DroppableLane>
        ) : (
          visibleJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={onDelete}
              onRetry={onRetry}
              isSelected={selectedIds.has(job.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function findContainer(
  id: string,
  waitingIds: string[],
  failedIds: string[],
): 'waiting' | 'failed' | null {
  if (waitingIds.includes(id)) return 'waiting'
  if (failedIds.includes(id)) return 'failed'
  if (id === 'lane:waiting') return 'waiting'
  if (id === 'lane:failed') return 'failed'
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// Bulk Action Bar
// ─────────────────────────────────────────────────────────────────────────

function BulkActionBar({
  selectedCount,
  hasFailedSelected,
  onBulkDelete,
  onBulkRetry,
  onClearSelection,
  isDeleting,
}: {
  selectedCount: number
  hasFailedSelected: boolean
  onBulkDelete: () => void
  onBulkRetry: () => void
  onClearSelection: () => void
  isDeleting: boolean
}) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-sm shrink-0">
      <Badge variant="secondary" className="text-xs">
        {selectedCount} selected
      </Badge>
      <div className="flex-1" />
      {hasFailedSelected && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onBulkRetry}
          disabled={isDeleting}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry selected
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        onClick={onBulkDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3 mr-1" />
        )}
        Delete selected
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-1.5" onClick={onClearSelection}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
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
  const [retryJobMutation] = useRetryScrapeJobMutation()
  const [cancelJobMutation] = useCancelScrapeJobMutation()

  const queue = scraperType ? healthData?.queues.find(q => q.name === scraperType) : undefined
  const isPaused = queue?.isPaused ?? false

  // Track locally hidden jobs so they don't flicker back during polling
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set())

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const hideJob = useCallback((id: string) => {
    setHiddenJobIds(prev => new Set(prev).add(id))
    setSelectedIds(prev => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const hideJobs = useCallback((ids: string[]) => {
    setHiddenJobIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next.size === prev.size ? prev : next
    })
  }, [])

  // Clear hidden IDs when server no longer returns them
  useEffect(() => {
    if (!data?.jobs || hiddenJobIds.size === 0) return
    const serverIds = new Set(data.jobs.map(j => j.id))
    setHiddenJobIds(prev => {
      const next = new Set<string>()
      for (const id of prev) {
        if (serverIds.has(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [data?.jobs, hiddenJobIds.size])

  // Clean selection when jobs disappear
  useEffect(() => {
    if (!data?.jobs || selectedIds.size === 0) return
    const currentIds = new Set(data.jobs.map(j => j.id))
    setSelectedIds(prev => {
      const next = new Set<string>()
      for (const id of prev) {
        if (currentIds.has(id) && !hiddenJobIds.has(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [data?.jobs, hiddenJobIds])

  const handleDelete = useCallback(
    (id: string) => {
      hideJob(id)
      cancelJobMutation(id)
    },
    [hideJob, cancelJobMutation],
  )

  const handleRetry = useCallback(
    (id: string) => {
      hideJob(id)
      retryJobMutation(id)
    },
    [hideJob, retryJobMutation],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((jobIds: string[]) => {
    if (jobIds.length === 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        for (const id of jobIds) next.add(id)
        return next
      })
    }
  }, [])

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds]
    setIsBulkDeleting(true)
    hideJobs(ids)
    await Promise.allSettled(
      ids.map(id =>
        cancelJobMutation(id)
          .unwrap()
          .catch(() => {}),
      ),
    )
    setIsBulkDeleting(false)
  }, [selectedIds, hideJobs, cancelJobMutation])

  const handleBulkRetry = useCallback(async () => {
    const ids = [...selectedIds]
    hideJobs(ids)
    await Promise.allSettled(
      ids.map(id =>
        retryJobMutation(id)
          .unwrap()
          .catch(() => {}),
      ),
    )
  }, [selectedIds, hideJobs, retryJobMutation])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const allJobs = (data?.jobs ?? []).filter(j => !hiddenJobIds.has(j.id))

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

  const hasFailedSelected = failed.some(j => selectedIds.has(j.id))

  // Unique sortable IDs
  const waitingSortableIds = waiting.map(jobKey)
  const failedSortableIds = failed.map(j => `failed:${jobKey(j)}`)

  const sortableIdToJob = new Map<string, ScrapeJob>()
  for (const j of waiting) sortableIdToJob.set(jobKey(j), j)
  for (const j of failed) sortableIdToJob.set(`failed:${jobKey(j)}`, j)

  // Drag state
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [overContainer, setOverContainer] = useState<string | null>(null)
  const activeJob = activeJobId ? (sortableIdToJob.get(activeJobId) ?? null) : null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const collisionDetection: CollisionDetection = useCallback(args => {
    const pointerCollisions = pointerWithin(args)
    const laneHit = pointerCollisions.find(c => String(c.id).startsWith('lane:'))
    const centerCollisions = closestCenter(args)
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
    const from = findContainer(String(dragActive.id), waitingSortableIds, failedSortableIds)
    const to = findContainer(String(over.id), waitingSortableIds, failedSortableIds)
    setOverContainer(from === 'failed' && to === 'waiting' ? 'waiting' : null)
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

    if (from === 'failed' && to === 'waiting') {
      const job = sortableIdToJob.get(activeId)
      if (job) handleRetry(job.id)
      return
    }

    if (from === 'waiting' && to === 'waiting' && activeId !== overId) {
      const oldIndex = waitingSortableIds.indexOf(activeId)
      const newIndex = waitingSortableIds.indexOf(overId)
      if (oldIndex >= 0 && newIndex >= 0) {
        setWaitingOrder(arrayMove(waitingSortableIds, oldIndex, newIndex))
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

      <BulkActionBar
        selectedCount={selectedIds.size}
        hasFailedSelected={hasFailedSelected}
        onBulkDelete={handleBulkDelete}
        onBulkRetry={handleBulkRetry}
        onClearSelection={clearSelection}
        isDeleting={isBulkDeleting}
      />

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
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
          />
          <SwimLane
            title="Active"
            status="active"
            jobs={active}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
          <SwimLane
            title="Failed"
            status="failed"
            jobs={failed}
            sortableIds={failedSortableIds}
            onDelete={handleDelete}
            onRetry={handleRetry}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
          />
          <SwimLane
            title="Completed"
            status="completed"
            jobs={completed}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
          />
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
