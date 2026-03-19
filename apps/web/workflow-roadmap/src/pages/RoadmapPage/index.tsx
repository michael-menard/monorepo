import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import {
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
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
} from '@dnd-kit/sortable'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/app-component-library'
import { useGetPlansQuery, useReorderPlansMutation, type Plan } from '../../store/roadmapApi'
import { setSort, setPageSize } from '../../store/roadmapFiltersSlice'
import type { RootState } from '../../store'
import { tableColumns } from './columns'
import { responsiveClass, sortAriaValue } from './utils'
import { FilterBar } from './FilterBar'
import { SortableRow } from './SortableRow'
import { PaginationControls } from './PaginationControls'

export { StoryGauge } from './StoryGauge'

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
            <Table>
              <colgroup>
                {table.getAllColumns().map(column => {
                  const meta = column.columnDef.meta as Record<string, unknown> | undefined
                  const w = (meta?.width as string) || undefined
                  return <col key={column.id} className={w} />
                })}
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

      <PaginationControls table={table} />
    </div>
  )
}
