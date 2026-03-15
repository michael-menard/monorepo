import { useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from '@tanstack/react-router'
import {
  AppDataTable,
  AppBadge,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Label,
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

const columns = [
  {
    key: 'planSlug',
    header: 'Slug',
    sortable: true,
    render: (plan: Plan) => (
      <span className="font-mono text-sm text-cyan-400">{plan.planSlug}</span>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    sortable: true,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (plan: Plan) => <AppBadge variant="outline">{plan.status}</AppBadge>,
  },
  {
    key: 'priority',
    header: 'Priority',
    sortable: true,
    render: (plan: Plan) =>
      plan.priority ? (
        <AppBadge variant={plan.priority === 'P1' ? 'destructive' : 'secondary'}>
          {plan.priority}
        </AppBadge>
      ) : null,
  },
  {
    key: 'planType',
    header: 'Type',
    sortable: true,
  },
  {
    key: 'storyCount',
    header: 'Stories',
    sortable: true,
    responsive: { hideAt: 'md' as const },
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    render: (plan: Plan) => new Date(plan.createdAt).toLocaleDateString(),
    responsive: { hideAt: 'lg' as const },
  },
]

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

  const handleRowClick = (plan: Plan) => {
    navigate({ to: '/plan/$slug', params: { slug: plan.planSlug } })
  }

  const handleReorder = useCallback(
    (items: Array<{ id: string; index: number }>) => {
      reorderPlans({
        priority: priority || '',
        items: items.map(item => ({ id: item.id, priorityOrder: item.index })),
      })
    },
    [reorderPlans, priority],
  )

  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plans') : null

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
          ERROR: {errorMessage}
        </div>
      </div>
    )
  }

  const plans = data?.data || []

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Roadmap
        </h1>
        <p className="text-slate-400 mt-1 font-mono text-sm">Browse and manage project plans</p>
      </header>

      <section className="mb-6 bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-4 flex flex-col gap-3">
        <Input
          placeholder="Search plans..."
          value={search}
          onChange={e => dispatch(setSearch(e.target.value))}
          className="bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500/50"
        />

        <div className="flex items-center gap-3">
          <Select value={status || ALL} onValueChange={v => dispatch(setStatus(fromSelect(v)))}>
            <SelectTrigger
              aria-label="Filter by status"
              className="bg-slate-800/60 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
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
              className="bg-slate-800/60 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
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
              className="bg-slate-800/60 border-slate-600/50 text-slate-100 focus:ring-cyan-500/50"
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
          ? `↕ Drag rows to reorder within priority ${priority}.`
          : '↕ Drag rows to set priority order. Filter by a priority group to reorder within it.'}
      </p>

      <section className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl overflow-hidden">
        <AppDataTable
          data={plans}
          columns={columns}
          onRowClick={handleRowClick}
          emptyMessage="No plans found"
          pagination={{
            enabled: true,
            pageSize,
            showPageSizeSelector: true,
            showPageInfo: true,
            showNavigationButtons: true,
          }}
          sortable
          defaultSort={{ key: sortKey, direction: sortDirection }}
          onSortChange={(key, direction) => dispatch(setSort({ key, direction }))}
          onPageSizeChange={size => dispatch(setPageSize(size))}
          draggable
          onReorder={handleReorder}
          getRowId={plan => plan.id}
        />
      </section>
    </main>
  )
}
