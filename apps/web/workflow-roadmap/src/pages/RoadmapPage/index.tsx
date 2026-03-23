import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  type SortingState,
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
} from '@dnd-kit/sortable'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@repo/app-component-library'
import { useGetPlansQuery, useReorderPlansMutation, type Plan } from '../../store/roadmapApi'
import { setSort, setTag } from '../../store/roadmapFiltersSlice'
import type { RootState } from '../../store'
import { createTableColumns } from './columns'
import { responsiveClass, sortAriaValue } from './utils'
import { FilterBar } from './FilterBar'
import { SortableRow } from './SortableRow'

const PAGE_SIZE = 20

export { StoryGauge } from './StoryGauge'

export function RoadmapPage() {
  const navigate = useNavigate({ from: '/' })
  const dispatch = useDispatch()

  const { status, priority, type, tag, excludeCompleted, search, sortKey, sortDirection } =
    useSelector((state: RootState) => state.roadmapFilters)

  const [reorderPlans] = useReorderPlansMutation()

  // --- Infinite scroll page tracking ---
  const [page, setPage] = useState(1)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset to page 1 and scroll to top when filters change
  useEffect(() => {
    setPage(1)
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [status, priority, type, tag, excludeCompleted, search])

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: status ? [status] : undefined,
      priority: priority ? [priority] : undefined,
      planType: type ? [type] : undefined,
      tags: tag ? [tag] : undefined,
      excludeCompleted,
      search: search.trim() || undefined,
    }),
    [page, status, priority, type, tag, excludeCompleted, search],
  )

  const { data, error, isFetching } = useGetPlansQuery(queryParams)

  const plans = useMemo(() => data?.data ?? [], [data?.data])
  const hasMore = data ? data.pagination.page < data.pagination.totalPages : false

  // Local ordered copy for DnD reordering
  const [orderedData, setOrderedData] = useState<Plan[]>(plans)
  useEffect(() => {
    setOrderedData(plans)
  }, [plans])

  // --- Infinite scroll via IntersectionObserver ---
  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollContainerRef.current
    if (!sentinel || !root || !hasMore || isFetching) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setPage(p => p + 1)
        }
      },
      { root, rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isFetching])

  // --- Sorting state synced with Redux ---
  const [sorting, setSorting] = useState<SortingState>(
    sortKey ? [{ id: sortKey, desc: sortDirection === 'desc' }] : [],
  )

  const handleTagClick = useCallback(
    (clickedTag: string) => {
      dispatch(setTag(clickedTag))
    },
    [dispatch],
  )

  const columns = useMemo(() => createTableColumns(handleTagClick), [handleTagClick])

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

  // --- TanStack table ---
  const table = useReactTable({
    data: orderedData,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
        items: reordered.map((p, i) => ({ id: p.id, sortOrder: i })),
      })
    },
    [orderedData, reorderPlans],
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

  const total = data?.pagination.total ?? 0

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Roadmap
        </h1>
        <p className="text-slate-400 mt-1 font-mono text-sm">Browse and manage project plans</p>
      </header>

      <FilterBar />

      <p className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-mono">
        Drag rows to set display order.
      </p>

      <div className="px-4 py-2 text-sm text-muted-foreground">
        Showing {orderedData.length} of {total} {total === 1 ? 'plan' : 'plans'}
      </div>

      {/* Table — scrollable container */}
      <section
        ref={scrollContainerRef}
        aria-label="Plans table"
        className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl overflow-y-auto max-h-[70vh]"
      >
        {orderedData.length === 0 && !isFetching ? (
          <div className="text-center py-8 text-muted-foreground">No plans found</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <colgroup>
                {table.getAllColumns().map(column => {
                  const meta = column.columnDef.meta as Record<string, unknown> | undefined
                  const w = (meta?.width as string) || undefined
                  return <col key={column.id} className={w} />
                })}
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-slate-900">
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

        {/* Loading indicator */}
        {isFetching ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading more plans...
          </div>
        ) : null}

        {/* Scroll sentinel — triggers next page load when visible */}
        <div ref={sentinelRef} className="h-1" />
      </section>
    </div>
  )
}
