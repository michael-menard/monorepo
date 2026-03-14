import React, { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AppDataTable, Badge, MultiSelect, Checkbox, AppInput } from '@repo/app-component-library'
import { useGetPlansQuery, type Plan } from '../store/roadmapApi'

interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

const STATUS_OPTIONS: MultiSelectOption[] = [
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

const PRIORITY_OPTIONS: MultiSelectOption[] = [
  { label: 'P1', value: 'P1' },
  { label: 'P2', value: 'P2' },
  { label: 'P3', value: 'P3' },
  { label: 'P4', value: 'P4' },
  { label: 'P5', value: 'P5' },
]

const TYPE_OPTIONS: MultiSelectOption[] = [
  { label: 'Feature', value: 'feature' },
  { label: 'Refactor', value: 'refactor' },
  { label: 'Migration', value: 'migration' },
  { label: 'Infra', value: 'infra' },
  { label: 'Tooling', value: 'tooling' },
  { label: 'Workflow', value: 'workflow' },
  { label: 'Audit', value: 'audit' },
  { label: 'Spike', value: 'spike' },
]

interface AppDataTableColumn<T> {
  key: string
  header: string | ((column: AppDataTableColumn<T>) => React.ReactNode)
  render?: (item: T) => React.ReactNode
  className?: string
  responsive?: {
    hideAt?: 'sm' | 'md' | 'lg' | 'xl'
    priority?: number
  }
  sortable?: boolean
}

const columns: AppDataTableColumn<Plan>[] = [
  {
    key: 'planSlug',
    header: 'Slug',
    render: plan => <span className="font-mono text-sm">{plan.planSlug}</span>,
  },
  {
    key: 'title',
    header: 'Title',
  },
  {
    key: 'status',
    header: 'Status',
    render: plan => <Badge variant="outline">{plan.status}</Badge>,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: plan =>
      plan.priority ? (
        <Badge variant={plan.priority === 'P1' ? 'destructive' : 'secondary'}>
          {plan.priority}
        </Badge>
      ) : null,
  },
  {
    key: 'planType',
    header: 'Type',
  },
  {
    key: 'estimatedStories',
    header: 'Stories',
    responsive: { hideAt: 'md' },
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: plan => new Date(plan.createdAt).toLocaleDateString(),
    responsive: { hideAt: 'lg' },
  },
]

export function RoadmapPage() {
  const navigate = useNavigate({ from: '/' })

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [excludeCompleted, setExcludeCompleted] = useState(true)
  const [search, setSearch] = useState('')

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 10,
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
      planType: selectedTypes.length > 0 ? selectedTypes : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      excludeCompleted,
      search: search.trim() || undefined,
    }),
    [selectedStatuses, selectedPriorities, selectedTypes, selectedTags, excludeCompleted, search],
  )

  const { data, error } = useGetPlansQuery(queryParams)

  const handleRowClick = (plan: Plan) => {
    navigate({ to: '/plan/$slug', params: { slug: plan.planSlug } })
  }

  const errorMessage = error ? ('error' in error ? error.error : 'Failed to fetch plans') : null

  if (errorMessage) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          Error: {errorMessage}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Roadmap</h1>
        <p className="text-muted-foreground mt-2">Browse and manage project plans</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <AppInput
            placeholder="Search plans..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <MultiSelect
            options={STATUS_OPTIONS}
            selectedValues={selectedStatuses}
            onSelectionChange={setSelectedStatuses}
            placeholder="Status"
          />
        </div>
        <div className="w-40">
          <MultiSelect
            options={PRIORITY_OPTIONS}
            selectedValues={selectedPriorities}
            onSelectionChange={setSelectedPriorities}
            placeholder="Priority"
          />
        </div>
        <div className="w-40">
          <MultiSelect
            options={TYPE_OPTIONS}
            selectedValues={selectedTypes}
            onSelectionChange={setSelectedTypes}
            placeholder="Type"
          />
        </div>
        <div className="w-48">
          <MultiSelect
            options={[]}
            selectedValues={selectedTags}
            onSelectionChange={setSelectedTags}
            placeholder="Tags"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="exclude-completed"
            checked={excludeCompleted}
            onCheckedChange={checked => setExcludeCompleted(checked === true)}
          />
          <label
            htmlFor="exclude-completed"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Hide completed
          </label>
        </div>
      </div>

      <AppDataTable
        data={data?.data || []}
        columns={columns}
        onRowClick={handleRowClick}
        emptyMessage="No plans found"
        pagination={{
          enabled: true,
          pageSize: 10,
          showPageSizeSelector: true,
          showPageInfo: true,
          showNavigationButtons: true,
        }}
      />
    </div>
  )
}
