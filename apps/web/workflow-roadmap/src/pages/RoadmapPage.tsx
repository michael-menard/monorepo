import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import {
  AppBadge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@repo/app-component-library'
import { useGetPlansQuery, useReorderPlansMutation, type Plan } from '../store/roadmapApi'
import {
  setStatus,
  setPriority,
  setType,
  setExcludeCompleted,
  setSearch,
  setSort,
  setPageSize,
} from '../store/roadmapFiltersSlice'
import type { RootState } from '../store'

const ALL = '_all'

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: ALL },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Stories Created', value: 'stories-created' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Implemented', value: 'implemented' },
  { label: 'Superseded', value: 'superseded' },
  { label: 'Archived', value: 'archived' },
  { label: 'Blocked', value: 'blocked' },
]

const PRIORITY_OPTIONS = [
  { label: 'All Priorities', value: ALL },
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
  { label: 'P4', value: 'P4' },
  { label: 'P5', value: 'P5' },
]

const TYPE_OPTIONS = [
  { label: 'All Types', value: ALL },
  { label: 'Feature', value: 'feature' },
  { label: 'Refactor', value: 'refactor' },
  { label: 'Migration', value: 'migration' },
  { label: 'Infra', value: 'infra' },
  { label: 'Tooling', value: 'tooling' },
  { label: 'Workflow', value: 'workflow' },
  { label: 'Audit', value: 'audit' },
  { label: 'Spike', value: 'spike' },
]

const fromSelect = (v: string) => (v === ALL ? '' : v)

const STATUS_COLORS: Record<string, string> = {
  draft: '!bg-slate-700/40 !border-slate-600/40 !text-slate-300/70',
  active: '!bg-blue-500/20 !border-blue-500/30 !text-blue-300/70',
  accepted: '!bg-cyan-500/20 !border-cyan-500/30 !text-cyan-300/70',
  'stories-created': '!bg-teal-500/20 !border-teal-500/30 !text-teal-300/70',
  'in-progress': '!bg-violet-500/20 !border-violet-500/30 !text-violet-300/70',
  implemented: '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300/70',
  superseded: '!bg-orange-500/20 !border-orange-500/30 !text-orange-300/70',
  archived: '!bg-slate-600/20 !border-slate-500/30 !text-slate-400/70',
  blocked: '!bg-red-500/20 !border-red-500/30 !text-red-300/70',
}

const PRIORITY_COLORS: Record<string, string> = {
  P1: '!bg-red-500/40 !border-red-500/30 !text-white/40',
  P2: '!bg-orange-500/40 !border-orange-500/30 !text-white/40',
  P3: '!bg-amber-400/40 !border-amber-400/30 !text-white/40',
  P4: '!bg-teal-500/40 !border-teal-500/30 !text-white/40',
  P5: '!bg-blue-500/40 !border-blue-500/30 !text-white/40',
}

const TAG_COLORS = [
  'bg-cyan-500/20 text-cyan-300/70 border-cyan-500/30',
  'bg-violet-500/20 text-violet-300/70 border-violet-500/30',
  'bg-emerald-500/20 text-emerald-300/70 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300/70 border-amber-500/30',
  'bg-pink-500/20 text-pink-300/70 border-pink-500/30',
  'bg-sky-500/20 text-sky-300/70 border-sky-500/30',
  'bg-orange-500/20 text-orange-300/70 border-orange-500/30',
  'bg-teal-500/20 text-teal-300/70 border-teal-500/30',
]

function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_COLORS[hash % TAG_COLORS.length]
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const ms = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function StoryGauge({ plan }: { plan: Plan }) {
  const total = plan.totalStories
  if (total === 0) return <span className="text-xs text-slate-500 font-mono">{'\u2014'}</span>

  const completedPct = Math.round((plan.completedStories / total) * 100)
  const activePct = Math.round((plan.activeStories / total) * 100)
  const blockedPct = Math.round((plan.blockedStories / total) * 100)
  const backlogPct = 100 - completedPct - activePct - blockedPct
  const backlogCount = total - plan.completedStories - plan.activeStories - plan.blockedStories

  const label = `${plan.completedStories} of ${total} stories complete`

  const bar = (
    <div
      role="progressbar"
      aria-valuenow={completedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="flex h-2 rounded-full overflow-hidden bg-slate-700 w-full min-w-[80px]"
    >
      {completedPct > 0 && <div className="bg-emerald-500" style={{ width: `${completedPct}%` }} />}
      {activePct > 0 && <div className="bg-blue-400" style={{ width: `${activePct}%` }} />}
      {blockedPct > 0 && <div className="bg-red-500" style={{ width: `${blockedPct}%` }} />}
      {backlogPct > 0 && <div className="bg-slate-600" style={{ width: `${backlogPct}%` }} />}
    </div>
  )

  return (
    <Tooltip>
      <TooltipTrigger className="w-full">{bar}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-slate-800 border border-slate-600 text-slate-100 p-3 max-w-xs font-mono text-xs space-y-2"
      >
        <div className="flex gap-3 flex-wrap">
          <span className="text-emerald-400">{plan.completedStories} done</span>
          {plan.activeStories > 0 && (
            <span className="text-blue-400">{plan.activeStories} active</span>
          )}
          {plan.blockedStories > 0 && (
            <span className="text-red-400">{plan.blockedStories} blocked</span>
          )}
          {backlogCount > 0 && <span className="text-slate-400">{backlogCount} backlog</span>}
          <span className="text-slate-500">/ {total}</span>
        </div>

        {plan.nextStory && (
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-0.5">
              Next up
            </div>
            <div className="text-cyan-400">{plan.nextStory.storyId}</div>
            <div className="text-slate-300 truncate">{plan.nextStory.title}</div>
          </div>
        )}

        {plan.blockedStoryList?.length > 0 && (
          <div>
            <div className="text-slate-500 uppercase text-[10px] tracking-wider mb-0.5">
              Blocked
            </div>
            {plan.blockedStoryList.map(s => (
              <div key={s.storyId} className="flex gap-1.5">
                <span className="text-red-400">{s.storyId}</span>
                <span className="text-slate-300 truncate">{s.title}</span>
              </div>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ */
/*  TanStack column definitions                                       */
/* ------------------------------------------------------------------ */

const col = createColumnHelper<Plan>()

const tableColumns = [
  col.display({
    id: 'drag',
    size: 48,
    header: () => null,
    cell: () => null, // overridden in SortableRow
  }),
  col.accessor('title', {
    header: 'Title',
    // no explicit size — fills remaining space via colgroup
    cell: info => {
      const plan = info.row.original
      return (
        <Link
          to="/plan/$slug"
          params={{ slug: plan.planSlug }}
          className="flex items-center gap-1.5 no-underline"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-slate-100/70 hover:text-cyan-400 transition-colors">
            {plan.title}
          </span>
          {plan.churnDepth > 0 && (
            <span
              className="text-xs text-amber-400 font-mono"
              aria-label={`Supersedes ${plan.churnDepth} prior plan${plan.churnDepth > 1 ? 's' : ''}${plan.supersedesPlanSlug ? ` (replaces ${plan.supersedesPlanSlug})` : ''}`}
            >
              {'\u21BA'}
              {plan.churnDepth}
            </span>
          )}
          {plan.hasRegression && (
            <span className="text-xs text-orange-500 font-mono" aria-label="Status has regressed">
              {'\u26A0'}
            </span>
          )}
        </Link>
      )
    },
    enableSorting: true,
  }),
  col.display({
    id: 'tags',
    size: 200,
    header: 'Tags',
    cell: info => {
      const plan = info.row.original
      if (!plan.tags || plan.tags.length === 0) return null
      return (
        <ul className="flex flex-wrap gap-1" aria-label="Tags">
          {plan.tags.map(tag => (
            <li
              key={tag}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tagColor(tag)}`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )
    },
    meta: { hideAt: 'xl' },
  }),
  col.accessor('status', {
    header: 'Status',
    size: 140,
    cell: info => {
      const plan = info.row.original
      return (
        <AppBadge
          variant="outline"
          className={STATUS_COLORS[plan.status ?? ''] ?? '!border-slate-600/50 !text-slate-400/70'}
        >
          {plan.status}
        </AppBadge>
      )
    },
    enableSorting: true,
  }),
  col.accessor('priority', {
    header: 'Priority',
    size: 100,
    cell: info => {
      const plan = info.row.original
      if (!plan.priority) return null
      return (
        <AppBadge
          variant="outline"
          className={
            PRIORITY_COLORS[plan.priority] ?? '!bg-blue-500/40 !border-blue-500/30 !text-white/40'
          }
        >
          {plan.priority}
        </AppBadge>
      )
    },
    enableSorting: true,
  }),
  col.accessor('totalStories', {
    header: 'Stories',
    size: 160,
    cell: info => <StoryGauge plan={info.row.original} />,
    enableSorting: true,
  }),
  col.accessor('lastStoryActivityAt', {
    header: 'Last Activity',
    size: 120,
    cell: info => {
      const val = info.getValue()
      return (
        <time className="text-xs text-slate-400 font-mono" dateTime={val ?? undefined}>
          {relativeTime(val)}
        </time>
      )
    },
    enableSorting: true,
    meta: { hideAt: 'lg' },
  }),
]

/* ------------------------------------------------------------------ */
/*  Responsive helpers                                                 */
/* ------------------------------------------------------------------ */

const HIDE_CLASS: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

function responsiveClass(meta: Record<string, unknown> | undefined): string {
  if (!meta || !meta.hideAt) return ''
  return HIDE_CLASS[meta.hideAt as string] ?? ''
}

/* ------------------------------------------------------------------ */
/*  Sortable row (DnD)                                                 */
/* ------------------------------------------------------------------ */

function SortableRow({
  row,
  onClick,
}: {
  row: ReturnType<ReturnType<typeof useReactTable<Plan>>['getRowModel']>['rows'][number]
  onClick: (plan: Plan) => void
}) {
  const plan = row.original
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plan.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : ('auto' as const),
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(plan)}
      className={`cursor-pointer hover:bg-muted/50 ${isDragging ? 'bg-muted' : ''}`}
    >
      {row.getVisibleCells().map(cell => {
        const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
        if (cell.column.id === 'drag') {
          return (
            <TableCell key={cell.id} className="py-3">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                onClick={e => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </TableCell>
          )
        }
        return (
          <TableCell key={cell.id} className={`py-3 ${responsiveClass(meta)}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

/* ------------------------------------------------------------------ */
/*  Sort indicator                                                     */
/* ------------------------------------------------------------------ */

function sortAriaValue(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (sorted === 'asc') return 'ascending'
  if (sorted === 'desc') return 'descending'
  return 'none'
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function RoadmapPage() {
  const navigate = useNavigate({ from: '/' })
  const dispatch = useDispatch()

  const { status, priority, type, excludeCompleted, search, sortKey, sortDirection, pageSize } =
    useSelector((state: RootState) => state.roadmapFilters)

  const [reorderPlans] = useReorderPlansMutation()

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      status: status ? [status] : undefined,
      priority: priority ? [priority] : undefined,
      planType: type ? [type] : undefined,
      excludeCompleted,
      search: search.trim() || undefined,
    }),
    [status, priority, type, excludeCompleted, search],
  )

  const { data, error } = useGetPlansQuery(queryParams)

  const plans = useMemo(() => data?.data ?? [], [data?.data])

  // Local ordered copy for DnD reordering
  const [orderedData, setOrderedData] = useState<Plan[]>(plans)
  useEffect(() => {
    setOrderedData(plans)
  }, [plans])

  // --- Sorting state synced with Redux ---
  const [sorting, setSorting] = useState<SortingState>(
    sortKey ? [{ id: sortKey, desc: sortDirection === 'desc' }] : [],
  )

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (next.length > 0) {
          dispatch(setSort({ key: next[0].id, direction: next[0].desc ? 'desc' : 'asc' }))
        }
        return next
      })
    },
    [dispatch],
  )

  // --- Pagination state synced with Redux ---
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
      setPagination(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        if (next.pageSize !== prev.pageSize) {
          dispatch(setPageSize(next.pageSize))
        }
        return next
      })
    },
    [dispatch],
  )

  // --- TanStack table ---
  const table = useReactTable({
    data: orderedData,
    columns: tableColumns,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: row => row.id,
  })

  // --- DnD ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = orderedData.findIndex(p => p.id === active.id)
      const newIndex = orderedData.findIndex(p => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(orderedData, oldIndex, newIndex)
      setOrderedData(reordered)
      reorderPlans({
        priority: priority || '',
        items: reordered.map((p, i) => ({ id: p.id, priorityOrder: i })),
      })
    },
    [orderedData, reorderPlans, priority],
  )

  const handleRowClick = (plan: Plan) => {
    navigate({ to: '/plan/$slug', params: { slug: plan.planSlug } })
  }

  // --- Error ---
  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plans') : null

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm"
        >
          ERROR: {errorMessage}
        </div>
      </div>
    )
  }

  const totalPages = table.getPageCount()

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Roadmap
        </h1>
        <p className="text-slate-400 mt-1 font-mono text-sm">Browse and manage project plans</p>
      </header>

      <section
        aria-label="Filters"
        className="mb-6 bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-3"
      >
        <Input
          aria-label="Search plans"
          placeholder="Search plans..."
          value={search}
          onChange={e => dispatch(setSearch(e.target.value))}
          className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
        />

        <div className="flex items-center gap-3">
          <Select value={status || ALL} onValueChange={v => dispatch(setStatus(fromSelect(v)))}>
            <SelectTrigger
              aria-label="Filter by status"
              className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
              {STATUS_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="focus:bg-slate-700 focus:text-slate-100"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priority || ALL} onValueChange={v => dispatch(setPriority(fromSelect(v)))}>
            <SelectTrigger
              aria-label="Filter by priority"
              className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
            >
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
              {PRIORITY_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="focus:bg-slate-700 focus:text-slate-100"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type || ALL} onValueChange={v => dispatch(setType(fromSelect(v)))}>
            <SelectTrigger
              aria-label="Filter by type"
              className="bg-slate-800/40 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
            >
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
              {TYPE_OPTIONS.map(opt => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="focus:bg-slate-700 focus:text-slate-100"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Checkbox
              id="exclude-completed"
              checked={excludeCompleted}
              onCheckedChange={checked => dispatch(setExcludeCompleted(checked === true))}
            />
            <Label
              htmlFor="exclude-completed"
              className="text-sm text-slate-400 cursor-pointer select-none"
            >
              Hide completed
            </Label>
          </div>
        </div>
      </section>

      <p className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-mono">
        {priority
          ? `Drag rows to reorder within priority ${priority}.`
          : 'Drag rows to set priority order. Filter by a priority group to reorder within it.'}
      </p>

      {/* Page size + info bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={value => {
              const size = Number(value)
              handlePaginationChange(prev => ({ ...prev, pageSize: size, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map(size => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, orderedData.length)} of{' '}
          {orderedData.length} entries
        </div>
      </div>

      {/* Table */}
      <section
        aria-label="Plans table"
        className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl overflow-hidden"
      >
        {orderedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No plans found</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table className="table-fixed">
              <colgroup>
                {table.getAllColumns().map(column => (
                  <col
                    key={column.id}
                    style={column.id === 'title' ? undefined : { width: column.getSize() }}
                  />
                ))}
              </colgroup>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                    {hg.headers.map(header => {
                      const meta = header.column.columnDef.meta as
                        | Record<string, unknown>
                        | undefined
                      const canSort = header.column.getCanSort()
                      const sorted = header.column.getIsSorted()
                      return (
                        <TableHead
                          key={header.id}
                          sort={canSort ? sortAriaValue(sorted) : undefined}
                          className={`${responsiveClass(meta)} ${canSort ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <div className="flex items-center gap-1">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' && <span className="text-xs">{'\u2191'}</span>}
                            {sorted === 'desc' && <span className="text-xs">{'\u2193'}</span>}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={table.getRowModel().rows.map(r => r.original.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map(row => (
                    <SortableRow key={row.id} row={row} onClick={handleRowClick} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </section>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const current = pagination.pageIndex
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i
              } else if (current <= 2) {
                pageNum = i
              } else if (current >= totalPages - 3) {
                pageNum = totalPages - 5 + i
              } else {
                pageNum = current - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={pagination.pageIndex === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => table.setPageIndex(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum + 1}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
