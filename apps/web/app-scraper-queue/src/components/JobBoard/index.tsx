/**
 * Job Board — Kanban-style swim lanes
 *
 * Columns: Waiting | Active | Failed | Completed
 * Waiting column supports drag-and-drop reordering.
 * Failed jobs can be dragged to the Waiting lane to retry (cards part to make room).
 * Click cards to select, then bulk delete/retry from the action bar.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { AnimatePresence, motion } from 'framer-motion'
import {
  GripVertical,
  RefreshCw,
  Trash2,
  Loader2,
  Pause,
  Play,
  PlayCircle,
  CheckSquare,
  Square,
  X,
} from 'lucide-react'
import { AlertTriangle, Clock, Hash, Info } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppInput,
  Badge,
  Button,
  cn,
  ActivityList,
} from '@repo/app-component-library'
import type { JobStepData } from '../../hooks/useScraperEvents'
import {
  useGetScrapeJobsQuery,
  useGetQueueHealthQuery,
  useGetJobStepsQuery,
  useCancelScrapeJobMutation,
  useClearJobsByStatusMutation,
  useRetryScrapeJobMutation,
  usePromoteScrapeJobMutation,
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
  onPromote,
  isSelected,
  onToggleSelect,
  onViewDetail,
  isRetrying,
  stepData,
  defaultExpanded,
}: {
  job: ScrapeJob
  isDraggable?: boolean
  activatorRef?: (node: HTMLElement | null) => void
  dragListeners?: Record<string, unknown>
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  onPromote?: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onViewDetail?: (job: ScrapeJob) => void
  isRetrying?: boolean
  stepData?: JobStepData
  defaultExpanded?: boolean
}) {
  const isActive = job.status === 'active'
  const elapsed = useElapsedTime(job.processedAt, isActive)
  const progressMsg = getProgressMessage(job.progress)
  // Show error on card only when in failed lane (not when retrying in waiting lane)
  const showError = job.failedReason && job.status === 'failed' && !isRetrying
  // Show warning icon when card has a previous error but is not in the failed lane
  const showPreviouslyFailed = job.failedReason && !showError
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false)

  // Fetch step history from API if no WebSocket data available
  const shouldFetchSteps =
    !stepData?.plan && (isActive || job.status === 'failed' || job.status === 'completed')
  const { data: apiSteps } = useGetJobStepsQuery(job.id, {
    skip: !shouldFetchSteps,
    pollingInterval: isActive ? 5000 : undefined,
  })

  // Build effective step data: prefer WebSocket (real-time), fall back to API (persistent)
  const effectiveStepData = useMemo(() => {
    if (stepData?.plan) return stepData

    if (!apiSteps?.steps?.length) return undefined

    const planEvent = apiSteps.steps.find(e => e.eventType === 'step_plan')
    if (!planEvent?.detail) return undefined

    const planSteps = (planEvent.detail as { steps?: Array<{ id: string; label: string }> }).steps
    if (!planSteps?.length) return undefined

    const stepMap = new Map<
      string,
      {
        status: string
        detail?: Record<string, unknown>
        error?: string
        startedAt?: number
        completedAt?: number
      }
    >()
    for (const s of planSteps) {
      stepMap.set(s.id, { status: 'pending' })
    }

    // Apply progress events in sequence order
    for (const evt of apiSteps.steps) {
      if (evt.eventType === 'step_progress' && evt.stepId && evt.status) {
        const existing = stepMap.get(evt.stepId) ?? { status: 'pending' }
        stepMap.set(evt.stepId, {
          ...existing,
          status: evt.status,
          ...(evt.detail ? { detail: evt.detail } : {}),
          ...(evt.error ? { error: evt.error } : {}),
          ...(evt.status === 'running' ? { startedAt: new Date(evt.createdAt).getTime() } : {}),
          ...(evt.status === 'completed' || evt.status === 'failed' || evt.status === 'skipped'
            ? { completedAt: new Date(evt.createdAt).getTime() }
            : {}),
        })
      }
    }

    return {
      plan: { steps: planSteps },
      steps: stepMap as Map<string, any>,
      lastUpdated: Date.now(),
    }
  }, [stepData, apiSteps])

  const hasSteps = effectiveStepData?.plan && effectiveStepData.plan.steps.length > 0

  const card = (
    <div
      className={cn(
        'group rounded-md space-y-1 text-xs cursor-pointer',
        isActive ? 'bg-transparent' : 'bg-card border p-2',
        isSelected ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20' : 'border-border',
      )}
      onClick={() => onViewDetail?.(job)}
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
          <span
            className="shrink-0"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onToggleSelect(job.id)
            }}
          >
            {isSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Square className="h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </span>
        )}
        {isActive && <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />}
        {showPreviouslyFailed && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
        <span className="font-medium truncate flex-1">{getJobLabel(job)}</span>
        <span className="text-muted-foreground shrink-0">
          {isActive ? formatElapsed(elapsed) : formatTime(job.createdAt)}
        </span>
      </div>

      {isActive && progressMsg && <p className="text-blue-600 truncate">{progressMsg}</p>}

      {showError && <p className="text-red-500 truncate">{job.failedReason}</p>}

      <div
        className={cn(
          'flex justify-end gap-1',
          (job.status === 'waiting' || job.status === 'delayed') &&
            'opacity-0 group-hover:opacity-100 transition-opacity',
        )}
      >
        {(job.status === 'waiting' || job.status === 'delayed') && onPromote && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
            title="Run now — promote to front of queue"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onPromote(job.id)
            }}
          >
            <PlayCircle className="h-3 w-3" />
          </Button>
        )}
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

      {hasSteps && (
        <>
          <button
            type="button"
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              setIsExpanded(prev => !prev)
            }}
          >
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')}
            />
            {isExpanded ? 'Hide' : 'Show'} steps
          </button>
          {isExpanded && (
            <div className="pt-1 border-t border-border/50">
              <ActivityList
                variant="stepper"
                steps={effectiveStepData!.plan!.steps.map(s => {
                  const state = effectiveStepData!.steps.get(s.id)
                  const detailStr = state?.detail
                    ? Object.entries(state.detail)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')
                    : undefined
                  const elapsedStr =
                    state?.startedAt && state?.completedAt
                      ? formatElapsed(state.completedAt - state.startedAt)
                      : undefined
                  return {
                    id: s.id,
                    label: s.label,
                    status: state?.status ?? 'pending',
                    detail: detailStr,
                    error: state?.error,
                    elapsed: elapsedStr,
                  }
                })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )

  return isActive ? <ActiveCardWrapper>{card}</ActiveCardWrapper> : card
}

// ─────────────────────────────────────────────────────────────────────────
// Job Detail Modal
// ─────────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  waiting: { text: 'Waiting', color: 'bg-yellow-100 text-yellow-800' },
  delayed: { text: 'Delayed', color: 'bg-yellow-100 text-yellow-800' },
  active: { text: 'Active', color: 'bg-blue-100 text-blue-800' },
  failed: { text: 'Failed', color: 'bg-red-100 text-red-800' },
  completed: { text: 'Completed', color: 'bg-green-100 text-green-800' },
}

function JobDetailModal({
  job,
  open,
  onOpenChange,
  onRetry,
  onDelete,
}: {
  job: ScrapeJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  if (!job) return null

  const statusInfo = STATUS_LABEL[job.status] ?? {
    text: job.status,
    color: 'bg-muted text-foreground',
  }
  const data = job.data as Record<string, unknown>

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" className="max-h-[80vh] overflow-y-auto">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            {getJobLabel(job)}
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusInfo.color)}>
              {statusInfo.text}
            </span>
          </AppDialogTitle>
          <AppDialogDescription>Job ID: {job.id}</AppDialogDescription>
        </AppDialogHeader>

        <div className="space-y-4 text-sm">
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Created</span>
            </div>
            <div>{new Date(job.createdAt).toLocaleString()}</div>

            {job.processedAt && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Started</span>
                </div>
                <div>{new Date(job.processedAt).toLocaleString()}</div>
              </>
            )}

            {job.finishedAt && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Finished</span>
                </div>
                <div>{new Date(job.finishedAt).toLocaleString()}</div>
              </>
            )}

            <div className="flex items-center gap-2 text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              <span>Attempts</span>
            </div>
            <div>{job.attemptsMade}</div>
          </div>

          {/* Job data */}
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Info className="h-3.5 w-3.5" />
              <span>Job Data</span>
            </div>
            <div className="bg-muted rounded-md p-3 font-mono text-xs overflow-x-auto">
              {Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">{key}:</span>
                  <span className="break-all">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error section */}
          {job.failedReason && (
            <div>
              <div className="flex items-center gap-2 text-red-600 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  {job.status === 'failed' ? 'Error' : 'Previous Error'}
                  {job.attemptsMade > 1 && ` (attempt ${job.attemptsMade})`}
                </span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-3 text-xs text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap break-all">
                {job.failedReason}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            {job.status === 'failed' && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRetry(job.id)
                  onOpenChange(false)
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            )}
            {onDelete && job.status !== 'active' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(job.id)
                  onOpenChange(false)
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </AppDialogContent>
    </AppDialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sortable Job Card (for waiting + failed lanes)
// ─────────────────────────────────────────────────────────────────────────

function SortableJobCard({
  job,
  sortableId,
  onDelete,
  onRetry,
  onPromote,
  isSelected,
  onToggleSelect,
  onViewDetail,
  isRetrying,
  stepData,
  defaultExpanded,
}: {
  job: ScrapeJob
  sortableId: string
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  onPromote?: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onViewDetail?: (job: ScrapeJob) => void
  isRetrying?: boolean
  stepData?: JobStepData
  defaultExpanded?: boolean
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
        onPromote={onPromote}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onViewDetail={onViewDetail}
        isRetrying={isRetrying}
        stepData={stepData}
        defaultExpanded={defaultExpanded}
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

function jobMatchesFilter(job: ScrapeJob, filter: string): boolean {
  if (!filter) return true
  const lower = filter.toLowerCase()
  const label = getJobLabel(job).toLowerCase()
  if (label.includes(lower)) return true
  if (job.type.toLowerCase().includes(lower)) return true
  if (job.failedReason?.toLowerCase().includes(lower)) return true
  if (job.id.toLowerCase().includes(lower)) return true
  const data = job.data as Record<string, unknown>
  for (const val of Object.values(data)) {
    if (String(val).toLowerCase().includes(lower)) return true
  }
  return false
}

function SwimLane({
  title,
  status,
  jobs,
  sortableIds,
  isDropTarget,
  dropTargetLabel,
  onDelete,
  onRetry,
  onPromote,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onViewDetail,
  retryingJobIds,
  sortableIdToJob,
  stepsByJobId,
}: {
  title: string
  status: string
  jobs: ScrapeJob[]
  sortableIds?: string[]
  isDropTarget?: boolean
  dropTargetLabel?: string
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  onPromote?: (id: string) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll?: (jobIds: string[]) => void
  onViewDetail?: (job: ScrapeJob) => void
  retryingJobIds?: Set<string>
  sortableIdToJob?: Map<string, ScrapeJob>
  stepsByJobId?: Map<string, JobStepData>
}) {
  const [clearJobs, { isLoading: isClearing }] = useClearJobsByStatusMutation()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filter, setFilter] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const filteredJobs = useMemo(
    () => (filter ? jobs.filter(j => jobMatchesFilter(j, filter)) : jobs),
    [jobs, filter],
  )

  const filteredSortableIds = useMemo(() => {
    if (!sortableIds || !filter) return sortableIds
    const matchingJobIds = new Set(filteredJobs.map(j => j.id))
    return sortableIds.filter(sid => {
      const job = sortableIdToJob?.get(sid)
      return job && matchingJobIds.has(job.id)
    })
  }, [sortableIds, filter, filteredJobs, sortableIdToJob])

  const itemCount = filteredSortableIds?.length ?? filteredJobs.length
  const visibleJobs = filteredSortableIds ? filteredJobs : filteredJobs.slice(0, visibleCount)
  const visibleSortableIds = filteredSortableIds?.slice(0, visibleCount)
  const hasMore = visibleCount < itemCount

  const laneJobIds = filteredJobs.map(j => j.id)
  const selectedInLane = laneJobIds.filter(id => selectedIds.has(id))
  const allSelected = filteredJobs.length > 0 && selectedInLane.length === filteredJobs.length

  // Reset pagination when item count shrinks
  useEffect(() => {
    if (itemCount <= PAGE_SIZE) setVisibleCount(PAGE_SIZE)
  }, [itemCount])

  // Keep itemCount in a ref so the observer callback sees the latest value
  const itemCountRef = useRef(itemCount)
  itemCountRef.current = itemCount

  // Infinite scroll via callback ref — reconnects when the sentinel mounts/unmounts
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node) return
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            setVisibleCount(prev => Math.min(prev + PAGE_SIZE, itemCountRef.current))
          }
        },
        { root: scrollRef.current, threshold: 0 },
      )
      observerRef.current.observe(node)
    },
    [hasMore], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const isSortable = !!sortableIds

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border border-t-2 bg-muted/30 min-h-0 transition-colors',
        LANE_COLORS[status],
        isDropTarget && 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-950/20',
      )}
    >
      <div className="px-3 py-2 border-b border-border shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1.5">
            {filteredJobs.length > 0 && onSelectAll && (
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
              <span className="ml-1.5 text-xs text-blue-500 font-normal">
                {dropTargetLabel ?? 'Drop here'}
              </span>
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
              {filter ? `${filteredJobs.length}/${jobs.length}` : jobs.length}
            </Badge>
          </div>
        </div>
        <AppInput
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-7 text-xs"
          onKeyDown={e => {
            if (e.key === 'Escape') setFilter('')
          }}
        />
      </div>
      <div ref={scrollRef} className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
        {isSortable ? (
          <DroppableLane id={`lane:${status}`}>
            <SortableContext items={visibleSortableIds!} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {visibleSortableIds!.map(sortId => {
                  const job = sortableIdToJob?.get(sortId)
                  if (!job) return null
                  return (
                    <SortableJobCard
                      key={sortId}
                      job={job}
                      sortableId={sortId}
                      onDelete={onDelete}
                      onRetry={onRetry}
                      onPromote={onPromote}
                      isSelected={selectedIds.has(job.id)}
                      onToggleSelect={onToggleSelect}
                      onViewDetail={onViewDetail}
                      isRetrying={retryingJobIds?.has(job.id)}
                      stepData={stepsByJobId?.get(job.id)}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DroppableLane>
        ) : (
          <DroppableLane id={`lane:${status}`}>
            {visibleJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onDelete={onDelete}
                onRetry={onRetry}
                onPromote={onPromote}
                isSelected={selectedIds.has(job.id)}
                onToggleSelect={onToggleSelect}
                onViewDetail={onViewDetail}
                isRetrying={retryingJobIds?.has(job.id)}
                stepData={stepsByJobId?.get(job.id)}
                defaultExpanded={status === 'active'}
              />
            ))}
          </DroppableLane>
        )}
        {hasMore && <div ref={sentinelCallback} className="h-4" />}
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
): 'waiting' | 'failed' | 'active' | null {
  if (waitingIds.includes(id)) return 'waiting'
  if (failedIds.includes(id)) return 'failed'
  if (id === 'lane:waiting') return 'waiting'
  if (id === 'lane:failed') return 'failed'
  if (id === 'lane:active') return 'active'
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
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden shrink-0"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg shadow-sm">
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Job Board
// ─────────────────────────────────────────────────────────────────────────

export function JobBoard({
  scraperType,
  stepsByJobId,
}: { scraperType?: string; stepsByJobId?: Map<string, JobStepData> } = {}) {
  const queryParams = scraperType ? { type: scraperType as any } : undefined
  const { data } = useGetScrapeJobsQuery(queryParams, { pollingInterval: 3000 })
  const { data: healthData } = useGetQueueHealthQuery(undefined, { pollingInterval: 10000 })
  const [pauseQueue, { isLoading: isPausing }] = usePauseQueueMutation()
  const [resumeQueue, { isLoading: isResuming }] = useResumeQueueMutation()
  const [retryJobMutation] = useRetryScrapeJobMutation()
  const [promoteJobMutation] = usePromoteScrapeJobMutation()
  const [cancelJobMutation] = useCancelScrapeJobMutation()

  const queue = scraperType ? healthData?.queues.find(q => q.name === scraperType) : undefined
  const isPaused = queue?.isPaused ?? false

  // Track locally hidden jobs (deleted) so they don't flicker back during polling
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<string>>(new Set())

  // Track jobs retried via drag — shown in waiting lane until server confirms
  const [retryingJobIds, setRetryingJobIds] = useState<Set<string>>(new Set())

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Job detail modal state
  const [detailJob, setDetailJob] = useState<ScrapeJob | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleViewDetail = useCallback((job: ScrapeJob) => {
    setDetailJob(job)
    setDetailOpen(true)
  }, [])

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

  // Clear retrying IDs once the server shows them as waiting (no longer failed)
  useEffect(() => {
    if (!data?.jobs || retryingJobIds.size === 0) return
    setRetryingJobIds(prev => {
      const next = new Set<string>()
      for (const id of prev) {
        const job = data.jobs.find(j => j.id === id)
        // Keep overriding until server confirms the status change
        if (job && job.status === 'failed') next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [data?.jobs, retryingJobIds.size])

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
      retryJobMutation(id)
    },
    [retryJobMutation],
  )

  const handlePromote = useCallback(
    (id: string) => {
      promoteJobMutation(id)
    },
    [promoteJobMutation],
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
    setRetryingJobIds(prev => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    setSelectedIds(new Set())
    await Promise.allSettled(
      ids.map(id =>
        retryJobMutation(id)
          .unwrap()
          .catch(() => {}),
      ),
    )
  }, [selectedIds, retryJobMutation])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const allJobs = (data?.jobs ?? []).filter(j => !hiddenJobIds.has(j.id))

  // Group by status
  const [waitingOrder, setWaitingOrder] = useState<string[]>([])

  const jobKey = (j: ScrapeJob) => `${j.type}:${j.id}`

  const waiting = allJobs
    .filter(
      j =>
        j.status === 'waiting' ||
        j.status === 'delayed' ||
        (j.status === 'failed' && retryingJobIds.has(j.id)),
    )
    .sort((a, b) => {
      const ai = waitingOrder.indexOf(jobKey(a))
      const bi = waitingOrder.indexOf(jobKey(b))
      if (ai >= 0 && bi >= 0) return ai - bi
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const active = allJobs.filter(j => j.status === 'active')
  const failed = allJobs.filter(j => j.status === 'failed' && !retryingJobIds.has(j.id))
  const completed = allJobs.filter(j => j.status === 'completed')

  const hasFailedSelected = failed.some(j => selectedIds.has(j.id))

  // Sortable IDs derived from server data
  const serverWaitingIds = waiting.map(jobKey)
  const serverFailedIds = failed.map(j => `failed:${jobKey(j)}`)

  const sortableIdToJob = new Map<string, ScrapeJob>()
  for (const j of waiting) sortableIdToJob.set(jobKey(j), j)
  for (const j of failed) sortableIdToJob.set(`failed:${jobKey(j)}`, j)

  // Drag state — during cross-container drag, we manage container assignments
  // locally so dnd-kit can animate gaps correctly (canonical multi-container pattern)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [overContainer, setOverContainer] = useState<string | null>(null)
  const [containerOverride, setContainerOverride] = useState<{
    waiting: string[]
    failed: string[]
  } | null>(null)

  // Use overridden containers during drag, server data otherwise
  const waitingSortableIds = containerOverride?.waiting ?? serverWaitingIds
  const failedSortableIds = containerOverride?.failed ?? serverFailedIds

  const activeJob = activeJobId ? (sortableIdToJob.get(activeJobId) ?? null) : null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const collisionDetection: CollisionDetection = useCallback(
    args => {
      const pointerCollisions = pointerWithin(args)
      const laneHit = pointerCollisions.find(c => String(c.id).startsWith('lane:'))
      const centerCollisions = closestCenter(args)

      if (laneHit) {
        const laneId = String(laneHit.id)
        // Active lane is a drop-only target (no sortable items inside)
        if (laneId === 'lane:active') return [laneHit]

        const laneContainer = laneId === 'lane:waiting' ? 'waiting' : 'failed'
        const laneIds = laneContainer === 'waiting' ? waitingSortableIds : failedSortableIds
        const laneItems = centerCollisions.filter(c => laneIds.includes(String(c.id)))
        if (laneItems.length > 0) return laneItems
        return [laneHit]
      }

      return centerCollisions
    },
    [waitingSortableIds, failedSortableIds],
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveJobId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active: dragActive, over } = event
    if (!over) {
      setOverContainer(null)
      setContainerOverride(null)
      return
    }

    const activeId = String(dragActive.id)
    const overId = String(over.id)

    // Determine source container from server data (stable reference)
    const from = findContainer(activeId, serverWaitingIds, serverFailedIds)
    // Determine target container from current (possibly overridden) data
    const to = findContainer(overId, waitingSortableIds, failedSortableIds)

    if (from === 'failed' && to === 'waiting') {
      setOverContainer('waiting')

      // Move the item from failed → waiting in local state (canonical dnd-kit pattern).
      // This makes dnd-kit animate the gap between waiting cards.
      const currentWaiting = containerOverride?.waiting ?? [...serverWaitingIds]
      const currentFailed = containerOverride?.failed ?? [...serverFailedIds]

      // Only move if not already in waiting
      if (!currentWaiting.includes(activeId)) {
        const newFailed = currentFailed.filter(id => id !== activeId)

        // Determine insertion index from the over target
        const overIndex = currentWaiting.indexOf(overId)
        const newWaiting = [...currentWaiting]

        if (overIndex >= 0) {
          // Insert near the item we're hovering over
          const isBelowCenter =
            (dragActive.rect.current.translated?.top ?? 0) > over.rect.top + over.rect.height / 2
          newWaiting.splice(isBelowCenter ? overIndex + 1 : overIndex, 0, activeId)
        } else {
          // Over the lane droppable — append
          newWaiting.push(activeId)
        }

        setContainerOverride({ waiting: newWaiting, failed: newFailed })
      } else {
        // Already in waiting — reorder within it (same as within-container drag)
        const oldIndex = currentWaiting.indexOf(activeId)
        const overIndex = currentWaiting.indexOf(overId)
        if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
          setContainerOverride({
            waiting: arrayMove(currentWaiting, oldIndex, overIndex),
            failed: currentFailed,
          })
        }
      }
    } else if (from === 'waiting' && to === 'active') {
      setOverContainer('active')
    } else if (from === 'failed' && to === 'failed') {
      // Dragged back to failed lane — revert the override
      setOverContainer(null)
      setContainerOverride(null)
    } else {
      setOverContainer(
        from === 'failed' && to === 'waiting'
          ? 'waiting'
          : from === 'waiting' && to === 'active'
            ? 'active'
            : null,
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active: dragActive, over } = event
    const override = containerOverride
    const dragOverContainer = overContainer

    setActiveJobId(null)
    setOverContainer(null)
    setContainerOverride(null)
    if (!over) return

    const activeId = String(dragActive.id)
    const overId = String(over.id)

    // Check if waiting job was dropped on active lane → promote
    const fromServer = findContainer(activeId, serverWaitingIds, serverFailedIds)
    if (fromServer === 'waiting' && dragOverContainer === 'active') {
      const job = sortableIdToJob.get(activeId)
      if (job) {
        promoteJobMutation(job.id)
      }
      return
    }

    const inOverrideWaiting = override?.waiting.includes(activeId)

    if (fromServer === 'failed' && inOverrideWaiting) {
      const job = sortableIdToJob.get(activeId)
      if (!job) return

      const newKey = jobKey(job)

      // Fire retry mutation
      setRetryingJobIds(prev => new Set(prev).add(job.id))
      retryJobMutation(job.id)

      // Use the override's waiting order (which has the item at the correct position)
      // and replace the failed: prefixed ID with the real job key
      const finalOrder = override!.waiting.map(id => (id === activeId ? newKey : id))
      setWaitingOrder(finalOrder)
      return
    }

    // Same-lane reorder within waiting
    const from = findContainer(activeId, waitingSortableIds, failedSortableIds)
    const to = findContainer(overId, waitingSortableIds, failedSortableIds)

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
    setContainerOverride(null)
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
            dropTargetLabel="Drop to retry"
            onDelete={handleDelete}
            onPromote={handlePromote}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
            onViewDetail={handleViewDetail}
            retryingJobIds={retryingJobIds}
            sortableIdToJob={sortableIdToJob}
          />
          <SwimLane
            title="Active"
            status="active"
            jobs={active}
            isDropTarget={overContainer === 'active'}
            dropTargetLabel="Drop to run now"
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onViewDetail={handleViewDetail}
            stepsByJobId={stepsByJobId}
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
            onViewDetail={handleViewDetail}
            sortableIdToJob={sortableIdToJob}
            stepsByJobId={stepsByJobId}
          />
          <SwimLane
            title="Completed"
            status="completed"
            jobs={completed}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
            onViewDetail={handleViewDetail}
            stepsByJobId={stepsByJobId}
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

      <JobDetailModal
        job={detailJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRetry={handleRetry}
        onDelete={handleDelete}
      />
    </div>
  )
}
